/**
 * BullMQ Security Scan Job
 *
 * This module implements a background job that automatically scans cloud resources
 * for security vulnerabilities and compliance issues. It orchestrates weekly security
 * scans using BullMQ for reliable job processing.
 *
 * Workflow:
 * 1. Job is scheduled to run weekly (Sundays at 4:00 AM UTC)
 * 2. Retrieves all active tenants from database
 * 3. For each tenant:
 *    a. Scans all cloud accounts using SecurityScanService
 *    b. Analyzes security posture and compliance status
 *    c. Identifies findings (critical, high, medium, low severity)
 *    d. Persists findings to database
 *    e. Emits security alerts for critical/high findings
 *    f. Logs results and any errors
 * 4. Returns summary of scans, findings, and errors
 *
 * Features:
 * - Automatic retry with exponential backoff (max 3 attempts)
 * - Job result retention (last 50 completed, last 500 failed)
 * - Rate limiting (max 3 jobs per minute - resource-intensive)
 * - Comprehensive logging for security monitoring
 * - Graceful shutdown handling
 * - Manual trigger support (single tenant or specific account)
 * - Progress tracking for long-running scans
 * - Fail-safe: Errors in individual tenants don't fail entire job
 *
 * Architecture Pattern:
 * - Queue/Worker Pattern: Decouples job scheduling from execution
 * - Retry Logic: Automatic retry with exponential backoff for transient failures
 * - Event-Driven: Services emit events for security alerts
 * - Fail-Safe: Errors in individual tenants don't fail the entire job
 * - Resource Management: Low concurrency to avoid overwhelming cloud APIs
 *
 * @module Shared/Jobs/SecurityScan
 */

import { Queue, Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';
import { SecurityScanService } from '../../modules/security/services/scan.service';

// ============================================================
// Types and Interfaces
// ============================================================

/**
 * Job data payload for security scanning
 */
interface SecurityScanJobData {
  /** Optional: Specific tenant ID to scan */
  tenantId?: string;

  /** Optional: Specific cloud account ID to scan */
  cloudAccountId?: string;

  /** How the scan was triggered */
  triggeredBy: 'scheduled' | 'manual';
}

/**
 * Overall job execution result
 */
interface SecurityScanJobResult {
  /** Whether the scan completed successfully (no errors) */
  success: boolean;

  /** Number of cloud accounts scanned */
  accountsScanned: number;

  /** Total number of security findings discovered */
  totalFindings: number;

  /** Number of critical severity findings */
  criticalCount: number;

  /** Number of high severity findings */
  highCount: number;

  /** Total execution time in milliseconds */
  duration: number;

  /** Optional: List of error messages encountered */
  errors?: string[];
}

/**
 * Result from scanning a single tenant
 */
interface TenantScanResult {
  accountsScanned: number;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
}

// ============================================================
// Configuration Constants
// ============================================================

/** Queue name for security scan jobs */
const QUEUE_NAME = 'security-scan';

/** Cron schedule: Every Sunday at 4:00 AM UTC (weekly) */
const SCHEDULE = '0 4 * * 0';

// ============================================================
// Redis Connection Configuration
// ============================================================

/**
 * Redis connection instance for BullMQ
 *
 * Configuration:
 * - Uses ioredis (recommended by BullMQ)
 * - Prioritizes REDIS_URL for automatic TLS support
 * - Falls back to individual parameters if URL not available
 * - maxRetriesPerRequest: null required for BullMQ compatibility
 */
const redisUrl = process.env.REDIS_URL;

console.log('[SecurityScanJob] Redis Connection Configuration:', {
  usingUrl: !!redisUrl,
  url: redisUrl ? redisUrl.replace(/:[^:@]+@/, ':****@') : 'N/A',
});

let connection: IORedis;

if (redisUrl) {
  // Use URL format - automatically handles TLS (rediss://) and authentication
  connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
} else {
  // Fallback: construct from individual parameters
  const redisHost = process.env.BULLMQ_REDIS_HOST || process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.BULLMQ_REDIS_PORT || process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.BULLMQ_REDIS_PASSWORD || process.env.REDIS_PASSWORD;
  const redisDb = parseInt(process.env.BULLMQ_REDIS_DB || '1', 10);

  const useTLS = redisHost.includes('upstash.io') ||
                 process.env.REDIS_TLS === 'true';

  console.log('[SecurityScanJob] Using individual parameters:', {
    host: redisHost,
    port: redisPort,
    db: redisDb,
    tls: useTLS,
    passwordConfigured: !!redisPassword,
  });

  connection = new IORedis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    db: redisDb,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: useTLS ? {
      rejectUnauthorized: true,
    } : undefined,
    retryStrategy: (times) => {
      const delay = Math.min(times * 1000, 5000);
      console.log(`[SecurityScanJob] Redis connection retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    reconnectOnError: (err) => {
      console.error('[SecurityScanJob] Redis reconnection triggered by error:', err.message);
      return true;
    },
  });
}

// ============================================================
// Queue Configuration
// ============================================================

/**
 * BullMQ Queue for Security Scan Jobs
 *
 * Configuration:
 * - defaultJobOptions:
 *   - attempts: 3 (retry up to 3 times)
 *   - backoff: exponential (5s, 10s, 20s)
 *   - removeOnComplete: keep last 50 completed jobs for 7 days
 *   - removeOnFail: keep last 500 failed jobs for 30 days
 */
export const securityScanQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 seconds delay
    },
    removeOnComplete: {
      count: 50, // Keep last 50 completed jobs
      age: 7 * 24 * 60 * 60, // Keep for 7 days
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
      age: 30 * 24 * 60 * 60, // Keep for 30 days
    },
  },
});

// ============================================================
// Job Processor
// ============================================================

/**
 * Process security scan job
 *
 * This function is the worker processor that executes the security scan logic.
 * It can operate in two modes:
 * 1. Tenant-specific: Scans a specific tenant (optional: specific account)
 * 2. All-tenants: Scans all active tenants (scheduled job)
 *
 * @param job - BullMQ job instance with data payload
 * @returns Job execution result summary
 */
export async function processSecurityScan(
  job: Job<SecurityScanJobData>
): Promise<SecurityScanJobResult> {
  const startTime = Date.now();
  const prisma = new PrismaClient();

  try {
    const { tenantId, cloudAccountId, triggeredBy } = job.data || {};

    console.log('[SecurityScanJob] Security scan job started:', {
      jobId: job.id,
      tenantId,
      cloudAccountId,
      triggeredBy,
    });

    const scanService = new SecurityScanService();

    // Result accumulators
    let totalAccountsScanned = 0;
    let totalFindings = 0;
    let totalCritical = 0;
    let totalHigh = 0;
    const errors: string[] = [];

    if (tenantId) {
      // Single tenant scan (manual trigger)
      console.log(`[SecurityScanJob] Starting security scan for tenant ${tenantId}${cloudAccountId ? ` account ${cloudAccountId}` : ''}`);

      try {
        const result = await scanService.runScan(tenantId, cloudAccountId);

        totalAccountsScanned = result.accountsScanned;
        totalFindings = result.totalFindings;
        totalCritical = result.criticalCount;
        totalHigh = result.highCount;

        console.log(
          `[SecurityScanJob] Completed scan for tenant ${tenantId}: ` +
          `${result.totalFindings} findings (${result.criticalCount} critical, ${result.highCount} high) ` +
          `from ${result.accountsScanned} accounts`
        );
      } catch (error) {
        const errorMsg = `Failed to scan tenant ${tenantId}: ${error instanceof Error ? error.message : String(error)}`;
        console.error('[SecurityScanJob]', errorMsg, error);
        errors.push(errorMsg);
      }
    } else {
      // All active tenants scan (scheduled job)
      console.log('[SecurityScanJob] Starting security scan for all active tenants');

      const tenants = await prisma.tenant.findMany({
        where: { status: 'active' },
      });

      console.log(`[SecurityScanJob] Found ${tenants.length} active tenants`);

      // Process tenants sequentially to avoid overwhelming cloud provider APIs
      for (let i = 0; i < tenants.length; i++) {
        const tenant = tenants[i];

        try {
          console.log(`[SecurityScanJob] Scanning tenant ${tenant.id} (${tenant.name})...`);

          const result = await scanService.runScan(tenant.id);

          totalAccountsScanned += result.accountsScanned;
          totalFindings += result.totalFindings;
          totalCritical += result.criticalCount;
          totalHigh += result.highCount;

          console.log(
            `[SecurityScanJob] Tenant ${tenant.name} scan completed: ` +
            `${result.totalFindings} findings (${result.criticalCount} critical, ${result.highCount} high) ` +
            `from ${result.accountsScanned} accounts`
          );
        } catch (error) {
          const errorMsg = `Failed to scan tenant ${tenant.id}: ${error instanceof Error ? error.message : String(error)}`;
          console.error('[SecurityScanJob]', errorMsg, error);
          errors.push(errorMsg);
          // Continue with next tenant (fail-safe)
        }

        // Update job progress (even if tenant scan failed)
        const progress = Math.round(((i + 1) / tenants.length) * 100);
        await job.updateProgress(progress);
      }

      console.log(
        `[SecurityScanJob] Completed security scan for all tenants: ` +
        `${totalFindings} total findings (${totalCritical} critical, ${totalHigh} high) ` +
        `from ${totalAccountsScanned} accounts across ${tenants.length} tenants`
      );
    }

    const duration = Date.now() - startTime;

    console.log('[SecurityScanJob] Security scan job completed:', {
      jobId: job.id,
      duration: `${(duration / 1000).toFixed(2)}s`,
      accountsScanned: totalAccountsScanned,
      totalFindings,
      criticalCount: totalCritical,
      highCount: totalHigh,
      errors: errors.length,
    });

    return {
      success: errors.length === 0,
      accountsScanned: totalAccountsScanned,
      totalFindings,
      criticalCount: totalCritical,
      highCount: totalHigh,
      duration,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('[SecurityScanJob] Fatal error in security scan job:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================
// Worker Configuration
// ============================================================

/**
 * BullMQ Worker for processing security scan jobs
 *
 * Configuration:
 * - concurrency: 1 (security scans are resource-intensive)
 * - limiter: 3 jobs per minute (rate limiting)
 */
export const securityScanWorker = new Worker<SecurityScanJobData, SecurityScanJobResult>(
  QUEUE_NAME,
  processSecurityScan,
  {
    connection,
    concurrency: 1, // Only 1 security scan at a time (resource-intensive)
    limiter: {
      max: 3, // Max 3 jobs
      duration: 60 * 1000, // Per minute
    },
  }
);

// ============================================================
// Worker Event Handlers
// ============================================================

securityScanWorker.on('completed', (job: Job, result: SecurityScanJobResult) => {
  console.log(
    `[SecurityScanJob] Job ${job.id} completed successfully: ` +
    `${result.totalFindings} findings (${result.criticalCount} critical, ${result.highCount} high), ` +
    `${result.accountsScanned} accounts, ${result.errors?.length || 0} errors in ${result.duration}ms`
  );
});

securityScanWorker.on('failed', (job: Job | undefined, error: Error) => {
  console.error(
    `[SecurityScanJob] Job ${job?.id || 'unknown'} failed:`,
    error.message,
    { stack: error.stack }
  );
});

securityScanWorker.on('error', (error: Error) => {
  console.error('[SecurityScanJob] Worker error:', error);
});

// ============================================================
// Job Scheduling Functions
// ============================================================

/**
 * Setup weekly security scan schedule
 *
 * Schedules a recurring job to scan all active tenants for security issues
 * weekly (every Sunday at 4:00 AM UTC).
 *
 * @returns Promise that resolves when the schedule is configured
 *
 * @example
 * ```typescript
 * await setupSecurityScanSchedule();
 * console.log('Weekly security scan scheduled for Sundays at 4:00 AM UTC');
 * ```
 */
export async function setupSecurityScanSchedule(): Promise<void> {
  try {
    // Remove existing repeatable jobs with same name to avoid duplicates
    const repeatableJobs = await securityScanQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === 'scheduled-security-scan') {
        await securityScanQueue.removeRepeatableByKey(job.key);
      }
    }

    // Schedule new job
    await securityScanQueue.add(
      'scheduled-security-scan',
      { triggeredBy: 'scheduled' },
      {
        repeat: {
          pattern: SCHEDULE, // Weekly: Sundays at 4:00 AM UTC
        },
      }
    );

    console.log('[SecurityScanJob] Security scan schedule configured:', {
      schedule: SCHEDULE,
      description: 'Every Sunday at 4:00 AM UTC',
    });
  } catch (error) {
    console.error('[SecurityScanJob] Error setting up security scan schedule:', error);
    throw error;
  }
}

/**
 * Trigger manual security scan
 *
 * Manually triggers a security scan for a specific tenant or all tenants.
 * Useful for:
 * - On-demand security audits
 * - Testing security scanning
 * - Post-deployment security checks
 * - Incident response
 *
 * @param tenantId - Optional: Specific tenant ID to scan
 * @param cloudAccountId - Optional: Specific cloud account ID to scan
 * @returns Job instance for tracking
 *
 * @example
 * ```typescript
 * // Scan specific tenant
 * const job = await triggerSecurityScan('tenant-123');
 * console.log('Job ID:', job.id);
 *
 * // Scan specific cloud account
 * const job = await triggerSecurityScan('tenant-123', 'account-456');
 *
 * // Scan all tenants
 * const job = await triggerSecurityScan();
 * ```
 */
export async function triggerSecurityScan(
  tenantId?: string,
  cloudAccountId?: string
): Promise<Job<SecurityScanJobData, SecurityScanJobResult>> {
  try {
    const jobData: SecurityScanJobData = {
      triggeredBy: 'manual',
    };

    if (tenantId) {
      jobData.tenantId = tenantId;
    }

    if (cloudAccountId) {
      jobData.cloudAccountId = cloudAccountId;
    }

    const job = await securityScanQueue.add('manual-security-scan', jobData, {
      priority: 1, // High priority for manual triggers
    });

    console.log(
      `[SecurityScanJob] Manual security scan triggered (Job ID: ${job.id})` +
      `${tenantId ? ` for tenant ${tenantId}` : ' for all tenants'}` +
      `${cloudAccountId ? ` account ${cloudAccountId}` : ''}`
    );

    return job;
  } catch (error) {
    console.error('[SecurityScanJob] Error triggering manual security scan:', error);
    throw error;
  }
}

// ============================================================
// Graceful Shutdown
// ============================================================

/**
 * Gracefully shutdown worker and queue
 *
 * Closes the worker and queue connections to allow for clean shutdown.
 * Should be called when the application is shutting down.
 *
 * @returns Promise that resolves when shutdown is complete
 */
export async function shutdownSecurityScanWorker(): Promise<void> {
  try {
    console.log('[SecurityScanJob] Shutting down security scan worker...');
    await securityScanWorker.close();
    await securityScanQueue.close();
    await connection.quit();
    console.log('[SecurityScanJob] Security scan worker shut down successfully');
  } catch (error) {
    console.error('[SecurityScanJob] Error during shutdown:', error);
    throw error;
  }
}

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('[SecurityScanJob] Received SIGTERM signal');
  await shutdownSecurityScanWorker();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[SecurityScanJob] Received SIGINT signal');
  await shutdownSecurityScanWorker();
  process.exit(0);
});
