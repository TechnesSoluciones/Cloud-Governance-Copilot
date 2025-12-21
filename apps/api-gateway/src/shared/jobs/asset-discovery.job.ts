/**
 * BullMQ Asset Discovery Job
 *
 * This module implements a background job that automatically discovers cloud resources
 * from all active cloud accounts daily at 4 AM. It orchestrates the asset discovery
 * workflow using BullMQ for reliable job processing.
 *
 * Workflow:
 * 1. Job is scheduled to run daily at 4 AM via cron pattern
 * 2. Retrieves all active cloud accounts (AWS and Azure) from database
 * 3. For each account:
 *    a. Discovers assets using AssetDiscoveryService
 *    b. Normalizes and persists assets to database
 *    c. Marks stale assets as deleted
 *    d. Emits events for each discovered asset
 *    e. Logs results and any errors
 * 4. Returns summary of successful and failed account processing
 *
 * Features:
 * - Automatic retry with exponential backoff (max 3 attempts)
 * - Job result retention (last 100 completed, last 1000 failed)
 * - Rate limiting (max 10 jobs per minute)
 * - Comprehensive logging for production monitoring
 * - Graceful shutdown handling
 * - Manual trigger support (single tenant or specific account)
 * - Progress tracking for long-running discoveries
 *
 * Architecture Pattern:
 * - Queue/Worker Pattern: Decouples job scheduling from execution
 * - Retry Logic: Automatic retry with exponential backoff for transient failures
 * - Event-Driven: Services emit events for cross-module communication
 * - Fail-Safe: Errors in individual accounts don't fail the entire job
 *
 * @module Shared/Jobs/AssetDiscovery
 */

import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../../lib/prisma';
import { AssetDiscoveryService, DiscoveryResult } from '../../modules/assets/services/asset-discovery.service';
import { eventBus } from '../events/event-bus';

// ============================================================
// Types and Interfaces
// ============================================================

/**
 * Job data payload for asset discovery
 */
interface AssetDiscoveryJobData {
  /** Optional: Specific tenant ID to discover assets for */
  tenantId?: string;

  /** Optional: Specific cloud account ID to discover assets for */
  cloudAccountId?: string;
}

/**
 * Overall job execution result
 */
interface JobExecutionResult {
  /** Total number of tenants processed */
  tenantsProcessed: number;

  /** Total number of cloud accounts processed */
  accountsProcessed: number;

  /** Total number of assets discovered */
  assetsDiscovered: number;

  /** Number of errors encountered */
  errorCount: number;

  /** Total execution time in milliseconds */
  executionTimeMs: number;
}

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

console.log('[AssetDiscoveryJob] Redis Connection Configuration:', {
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

  console.log('[AssetDiscoveryJob] Using individual parameters:', {
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
      console.log(`[AssetDiscoveryJob] Redis connection retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    reconnectOnError: (err) => {
      console.error('[AssetDiscoveryJob] Redis reconnection triggered by error:', err.message);
      return true;
    },
  });
}

// ============================================================
// Queue Configuration
// ============================================================

/**
 * BullMQ Queue for Asset Discovery Jobs
 *
 * Configuration:
 * - defaultJobOptions:
 *   - attempts: 3 (retry up to 3 times)
 *   - backoff: exponential (1s, 2s, 4s)
 *   - removeOnComplete: keep last 100 completed jobs
 *   - removeOnFail: keep last 1000 failed jobs
 */
export const assetDiscoveryQueue = new Queue('asset-discovery', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // Start with 1 second delay
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 1000, // Keep last 1000 failed jobs
      age: 7 * 24 * 3600, // Keep for 7 days
    },
  },
});

// ============================================================
// Job Processor
// ============================================================

/**
 * Process asset discovery job
 *
 * This function is the worker processor that executes the asset discovery logic.
 * It can operate in two modes:
 * 1. Tenant-specific: Discovers assets for a specific tenant (optional: specific account)
 * 2. All-tenants: Discovers assets for all active tenants (scheduled job)
 *
 * @param job - BullMQ job instance with data payload
 * @returns Job execution result summary
 */
export async function processAssetDiscovery(job: Job<AssetDiscoveryJobData>): Promise<JobExecutionResult> {
  const startTime = Date.now();

  try {
    const { tenantId, cloudAccountId } = job.data || {};
    const discoveryService = new AssetDiscoveryService(prisma, eventBus);

    const result: JobExecutionResult = {
      tenantsProcessed: 0,
      accountsProcessed: 0,
      assetsDiscovered: 0,
      errorCount: 0,
      executionTimeMs: 0,
    };

    if (tenantId) {
      // Single tenant discovery (manual trigger)
      console.log(`[AssetDiscoveryJob] Starting asset discovery for tenant ${tenantId}${cloudAccountId ? ` account ${cloudAccountId}` : ''}`);

      const discoveryResult = await discoveryService.discoverAssets(tenantId, cloudAccountId);

      result.tenantsProcessed = 1;
      result.accountsProcessed = discoveryResult.accountsProcessed;
      result.assetsDiscovered = discoveryResult.assetsDiscovered;
      result.errorCount = discoveryResult.errors.length;

      console.log(
        `[AssetDiscoveryJob] Completed discovery for tenant ${tenantId}: ` +
        `${discoveryResult.assetsDiscovered} assets from ${discoveryResult.accountsProcessed} accounts`
      );
    } else {
      // All active tenants discovery (scheduled job)
      console.log('[AssetDiscoveryJob] Starting asset discovery for all active tenants');

      const tenants = await prisma.tenant.findMany({
        where: { status: 'active' },
      });

      console.log(`[AssetDiscoveryJob] Found ${tenants.length} active tenants`);

      // Process tenants sequentially to avoid overwhelming cloud provider APIs
      for (const tenant of tenants) {
        try {
          console.log(`[AssetDiscoveryJob] Processing tenant ${tenant.id} (${tenant.name})`);

          const discoveryResult = await discoveryService.discoverAssets(tenant.id);

          result.tenantsProcessed += 1;
          result.accountsProcessed += discoveryResult.accountsProcessed;
          result.assetsDiscovered += discoveryResult.assetsDiscovered;
          result.errorCount += discoveryResult.errors.length;

          console.log(
            `[AssetDiscoveryJob] Tenant ${tenant.name}: ` +
            `${discoveryResult.assetsDiscovered} assets from ${discoveryResult.accountsProcessed} accounts`
          );

          // Update job progress
          const progress = Math.round(((result.tenantsProcessed) / tenants.length) * 100);
          await job.updateProgress(progress);
        } catch (error) {
          console.error(`[AssetDiscoveryJob] Error processing tenant ${tenant.id}:`, error);
          result.errorCount += 1;
        }
      }

      console.log(
        `[AssetDiscoveryJob] Completed discovery for all tenants: ` +
        `${result.assetsDiscovered} assets from ${result.accountsProcessed} accounts across ${result.tenantsProcessed} tenants`
      );
    }

    result.executionTimeMs = Date.now() - startTime;
    return result;
  } catch (error) {
    console.error('[AssetDiscoveryJob] Fatal error in asset discovery job:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================
// Worker Configuration
// ============================================================

/**
 * BullMQ Worker for processing asset discovery jobs
 *
 * Configuration:
 * - concurrency: 2 (process up to 2 jobs simultaneously)
 * - limiter: 10 jobs per minute (rate limiting)
 */
export const assetDiscoveryWorker = new Worker<AssetDiscoveryJobData, JobExecutionResult>(
  'asset-discovery',
  processAssetDiscovery,
  {
    connection,
    concurrency: 2, // Process 2 jobs at a time
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60 * 1000, // Per minute
    },
  }
);

// ============================================================
// Worker Event Handlers
// ============================================================

assetDiscoveryWorker.on('completed', (job: Job, result: JobExecutionResult) => {
  console.log(
    `[AssetDiscoveryJob] Job ${job.id} completed: ` +
    `${result.assetsDiscovered} assets, ${result.accountsProcessed} accounts, ` +
    `${result.errorCount} errors in ${result.executionTimeMs}ms`
  );
});

assetDiscoveryWorker.on('failed', (job: Job | undefined, error: Error) => {
  console.error(
    `[AssetDiscoveryJob] Job ${job?.id || 'unknown'} failed:`,
    error.message
  );
});

assetDiscoveryWorker.on('error', (error: Error) => {
  console.error('[AssetDiscoveryJob] Worker error:', error);
});

// ============================================================
// Job Scheduling Functions
// ============================================================

/**
 * Schedule daily asset discovery job
 *
 * Schedules a recurring job to discover assets from all active tenants
 * daily at 4:00 AM UTC.
 *
 * @returns Promise that resolves when the job is scheduled
 *
 * @example
 * ```typescript
 * await scheduleDailyAssetDiscovery();
 * console.log('Daily asset discovery job scheduled at 4:00 AM UTC');
 * ```
 */
export async function scheduleDailyAssetDiscovery(): Promise<void> {
  try {
    // Remove existing repeatable jobs with same name to avoid duplicates
    const repeatableJobs = await assetDiscoveryQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === 'discover-all-assets') {
        await assetDiscoveryQueue.removeRepeatableByKey(job.key);
      }
    }

    // Schedule new job
    await assetDiscoveryQueue.add(
      'discover-all-assets',
      {}, // No specific tenant/account (all tenants)
      {
        repeat: {
          pattern: '0 4 * * *', // Daily at 4:00 AM UTC
        },
      }
    );

    console.log('[AssetDiscoveryJob] Scheduled daily asset discovery at 4:00 AM UTC');
  } catch (error) {
    console.error('[AssetDiscoveryJob] Error scheduling daily asset discovery:', error);
    throw error;
  }
}

/**
 * Trigger manual asset discovery
 *
 * Manually triggers asset discovery for a specific tenant or all tenants.
 * Useful for:
 * - Testing asset discovery
 * - On-demand discovery after adding a new cloud account
 * - Re-discovery after configuration changes
 *
 * @param tenantId - Optional: Specific tenant ID to discover assets for
 * @param cloudAccountId - Optional: Specific cloud account ID to discover assets for
 * @returns Job instance for tracking
 *
 * @example
 * ```typescript
 * // Discover assets for specific tenant
 * const job = await triggerManualAssetDiscovery('tenant-123');
 * console.log('Job ID:', job.id);
 *
 * // Discover assets for specific cloud account
 * const job = await triggerManualAssetDiscovery('tenant-123', 'account-456');
 *
 * // Discover assets for all tenants
 * const job = await triggerManualAssetDiscovery();
 * ```
 */
export async function triggerManualAssetDiscovery(
  tenantId?: string,
  cloudAccountId?: string
): Promise<Job<AssetDiscoveryJobData, JobExecutionResult>> {
  try {
    const jobData: AssetDiscoveryJobData = {};

    if (tenantId) {
      jobData.tenantId = tenantId;
    }

    if (cloudAccountId) {
      jobData.cloudAccountId = cloudAccountId;
    }

    const job = await assetDiscoveryQueue.add('discover-assets-manual', jobData, {
      priority: 1, // Higher priority for manual jobs
    });

    console.log(
      `[AssetDiscoveryJob] Manual asset discovery triggered (Job ID: ${job.id})` +
      `${tenantId ? ` for tenant ${tenantId}` : ' for all tenants'}` +
      `${cloudAccountId ? ` account ${cloudAccountId}` : ''}`
    );

    return job;
  } catch (error) {
    console.error('[AssetDiscoveryJob] Error triggering manual asset discovery:', error);
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
 */
export async function shutdownAssetDiscoveryWorker(): Promise<void> {
  try {
    console.log('[AssetDiscoveryJob] Shutting down asset discovery worker...');
    await assetDiscoveryWorker.close();
    await assetDiscoveryQueue.close();
    await connection.quit();
    console.log('[AssetDiscoveryJob] Worker shutdown complete');
  } catch (error) {
    console.error('[AssetDiscoveryJob] Error during shutdown:', error);
    throw error;
  }
}

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('[AssetDiscoveryJob] Received SIGTERM signal');
  await shutdownAssetDiscoveryWorker();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[AssetDiscoveryJob] Received SIGINT signal');
  await shutdownAssetDiscoveryWorker();
  process.exit(0);
});
