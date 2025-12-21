/**
 * BullMQ Recommendations Generation Job
 *
 * This module implements a background job that automatically generates cost optimization
 * recommendations for all active tenants daily at 3 AM. It uses BullMQ for reliable job
 * processing and scheduling.
 *
 * Workflow:
 * 1. Job is scheduled to run daily at 3 AM via cron pattern
 * 2. Retrieves all active tenants from database
 * 3. For each tenant:
 *    a. Generates recommendations using RecommendationGeneratorService
 *    b. Logs results including count and estimated savings
 *    c. Continues on error to process remaining tenants
 * 4. Returns summary of successful and failed tenant processing
 *
 * Features:
 * - Automatic retry with exponential backoff (max 3 attempts)
 * - Job result retention (last 100 completed, last 1000 failed)
 * - Rate limiting (max 10 jobs per minute)
 * - Comprehensive logging for production monitoring
 * - Graceful shutdown handling
 * - Manual trigger support for on-demand generation
 * - Per-tenant and per-account generation support
 *
 * Architecture Pattern:
 * - Queue/Worker Pattern: Decouples job scheduling from execution
 * - Retry Logic: Automatic retry with exponential backoff for transient failures
 * - Event-Driven: Services emit events for cross-module communication
 * - Fail-Safe: Errors in individual tenants don't fail the entire job
 *
 * @module Shared/Jobs/RecommendationsGeneration
 */

import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../../lib/prisma';
import { RecommendationGeneratorService } from '../../modules/finops/services/recommendation-generator.service';
import { eventBus } from '../events/event-bus';

// ============================================================
// Types and Interfaces
// ============================================================

/**
 * Job data for recommendation generation
 * Allows targeting specific tenant or cloud account
 */
export interface RecommendationGenerationJobData {
  /** If provided, generate only for this tenant */
  tenantId?: string;

  /** If provided, generate only for this cloud account */
  cloudAccountId?: string;
}

/**
 * Result of processing a single tenant
 */
interface TenantProcessingResult {
  /** UUID of the tenant */
  tenantId: string;

  /** Human-readable tenant name */
  tenantName: string;

  /** Number of recommendations generated */
  recommendationsGenerated?: number;

  /** Total estimated monthly savings */
  totalEstimatedSavings?: number;

  /** Indicates if processing was successful */
  success: boolean;

  /** Error message if processing failed */
  error?: string;
}

/**
 * Overall job execution result
 */
interface JobExecutionResult {
  /** Total number of tenants processed */
  totalTenants: number;

  /** Number of tenants processed successfully */
  successfulTenants: number;

  /** Number of tenants that failed processing */
  failedTenants: number;

  /** Total execution time in milliseconds */
  executionTimeMs: number;

  /** Detailed results for each tenant */
  results: TenantProcessingResult[];
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

console.log('[RecommendationsJob] Redis Connection Configuration:', {
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

  console.log('[RecommendationsJob] Using individual parameters:', {
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
      console.log(`[RecommendationsJob] Redis connection retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    reconnectOnError: (err) => {
      console.error('[RecommendationsJob] Redis reconnection triggered by error:', err.message);
      return true;
    },
  });
}

// ============================================================
// Database Connection
// ============================================================

/**
 * Prisma client instance for database operations
 */

// ============================================================
// BullMQ Queue Configuration
// ============================================================

/**
 * BullMQ Queue for recommendation generation jobs
 *
 * Configuration:
 * - Automatic retry: Up to 3 attempts with exponential backoff (1 min, 2 min, 4 min)
 * - Job retention: Last 100 completed jobs kept for 7 days
 * - Failed job retention: Last 1000 failed jobs kept for 30 days
 * - Rate limiting: Handled at worker level (max 10 jobs per minute)
 */
const queue = new Queue('recommendations-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 60000, // Start with 1 minute delay
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 7 * 24 * 3600, // Keep for 7 days
    },
    removeOnFail: {
      count: 1000, // Keep last 1000 failed jobs
      age: 30 * 24 * 3600, // Keep for 30 days
    },
  },
});

// ============================================================
// Service Initialization
// ============================================================

/**
 * Recommendation generation service instance
 */
const recommendationService = new RecommendationGeneratorService(prisma, eventBus);

// ============================================================
// BullMQ Worker Configuration
// ============================================================

/**
 * BullMQ Worker for processing recommendation generation jobs
 *
 * This worker:
 * 1. Retrieves all active tenants (or processes single tenant if specified)
 * 2. Processes each tenant sequentially
 * 3. Generates recommendations for all cloud accounts
 * 4. Returns aggregated results
 *
 * Configuration:
 * - Concurrency: 2 (process up to 2 jobs concurrently)
 * - Rate limiting: Max 10 jobs per minute
 * - Error handling: Errors are caught and logged, then re-thrown for BullMQ retry
 */
const worker = new Worker<RecommendationGenerationJobData>(
  'recommendations-generation',
  async (job: Job<RecommendationGenerationJobData>): Promise<JobExecutionResult> => {
    const startTime = Date.now();
    const { tenantId, cloudAccountId } = job.data;

    console.log(
      `[RecommendationsJob] Starting recommendation generation at ${new Date().toISOString()}`
    );
    console.log(`[RecommendationsJob] Job ID: ${job.id}`);
    if (tenantId) {
      console.log(`[RecommendationsJob] Target tenant: ${tenantId}`);
    }
    if (cloudAccountId) {
      console.log(`[RecommendationsJob] Target cloud account: ${cloudAccountId}`);
    }

    try {
      let tenants: Array<{ id: string; name: string }>;

      // Step 1: Determine which tenants to process
      if (tenantId) {
        // Process single tenant
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { id: true, name: true, status: true },
        });

        if (!tenant) {
          throw new Error(`Tenant not found: ${tenantId}`);
        }

        if (tenant.status !== 'active') {
          console.log(`[RecommendationsJob] Tenant ${tenant.name} is not active, skipping`);
          return {
            totalTenants: 0,
            successfulTenants: 0,
            failedTenants: 0,
            executionTimeMs: Date.now() - startTime,
            results: [],
          };
        }

        tenants = [{ id: tenant.id, name: tenant.name }];
      } else {
        // Process all active tenants
        console.log('[RecommendationsJob] Retrieving all active tenants...');
        tenants = await prisma.tenant.findMany({
          where: { status: 'active' },
          select: { id: true, name: true },
        });
      }

      console.log(`[RecommendationsJob] Found ${tenants.length} active tenant(s) to process`);

      if (tenants.length === 0) {
        console.log('[RecommendationsJob] No active tenants found, skipping job');
        return {
          totalTenants: 0,
          successfulTenants: 0,
          failedTenants: 0,
          executionTimeMs: Date.now() - startTime,
          results: [],
        };
      }

      // Step 2: Process each tenant
      const results: TenantProcessingResult[] = [];

      for (const tenant of tenants) {
        try {
          console.log(`[RecommendationsJob] Processing tenant: ${tenant.name} (${tenant.id})`);

          // Generate recommendations for the tenant
          const generationResult = await recommendationService.generateRecommendations(
            tenant.id,
            cloudAccountId
          );

          console.log(
            `[RecommendationsJob] Successfully generated ${generationResult.recommendationsGenerated} recommendations for ${tenant.name}`
          );
          console.log(
            `[RecommendationsJob] Total estimated savings: $${generationResult.totalEstimatedSavings.toFixed(2)}/month`
          );

          if (generationResult.errors && generationResult.errors.length > 0) {
            console.warn(
              `[RecommendationsJob] ${generationResult.errors.length} errors occurred during generation:`
            );
            generationResult.errors.forEach((error, index) => {
              console.warn(`[RecommendationsJob]   Error ${index + 1}: ${error}`);
            });
          }

          results.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            recommendationsGenerated: generationResult.recommendationsGenerated,
            totalEstimatedSavings: generationResult.totalEstimatedSavings,
            success: true,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(
            `[RecommendationsJob] Failed to generate recommendations for tenant ${tenant.name}:`,
            errorMessage
          );

          results.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            success: false,
            error: errorMessage,
          });
        }
      }

      // Step 3: Aggregate and return results
      const successfulTenants = results.filter((r) => r.success).length;
      const failedTenants = results.filter((r) => !r.success).length;
      const executionTimeMs = Date.now() - startTime;

      const totalRecommendations = results
        .filter((r) => r.success)
        .reduce((sum, r) => sum + (r.recommendationsGenerated || 0), 0);

      const totalSavings = results
        .filter((r) => r.success)
        .reduce((sum, r) => sum + (r.totalEstimatedSavings || 0), 0);

      console.log(`[RecommendationsJob] Job completed in ${(executionTimeMs / 1000).toFixed(2)}s`);
      console.log(
        `[RecommendationsJob] Results: ${successfulTenants} succeeded, ${failedTenants} failed`
      );
      console.log(
        `[RecommendationsJob] Total: ${totalRecommendations} recommendations, $${totalSavings.toFixed(2)}/month savings`
      );

      return {
        totalTenants: tenants.length,
        successfulTenants,
        failedTenants,
        executionTimeMs,
        results,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[RecommendationsJob] Fatal error during job execution:`, errorMessage);
      if (error instanceof Error && error.stack) {
        console.error(`[RecommendationsJob] Stack trace:`, error.stack);
      }
      throw error; // Re-throw for BullMQ retry mechanism
    }
  },
  {
    connection,
    concurrency: 2, // Process up to 2 jobs concurrently
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // Per 1 minute
    },
  }
);

// ============================================================
// Worker Event Handlers
// ============================================================

/**
 * Handle successful job completion
 */
worker.on('completed', (job: Job<RecommendationGenerationJobData>, result: JobExecutionResult) => {
  console.log(`[RecommendationsJob] Job ${job.id} completed successfully`);
  console.log(
    `[RecommendationsJob]   Processed: ${result.totalTenants} tenants (${result.successfulTenants} succeeded, ${result.failedTenants} failed)`
  );
  console.log(`[RecommendationsJob]   Duration: ${(result.executionTimeMs / 1000).toFixed(2)}s`);
});

/**
 * Handle job failure
 */
worker.on('failed', (job: Job<RecommendationGenerationJobData> | undefined, error: Error) => {
  if (job) {
    console.error(`[RecommendationsJob] Job ${job.id} failed:`, error.message);
    console.error(
      `[RecommendationsJob]   Attempt: ${job.attemptsMade}/${job.opts.attempts || 3}`
    );
  } else {
    console.error('[RecommendationsJob] Job failed (no job info available):', error.message);
  }
});

/**
 * Handle worker errors
 */
worker.on('error', (error: Error) => {
  console.error('[RecommendationsJob] Worker error:', error.message);
  if (error.stack) {
    console.error('[RecommendationsJob] Stack trace:', error.stack);
  }
});

// ============================================================
// Scheduling Functions
// ============================================================

/**
 * Schedule daily recommendation generation at 3:00 AM
 *
 * This function:
 * 1. Removes any existing scheduled job (idempotent)
 * 2. Schedules a new repeatable job using cron pattern
 * 3. Logs scheduling confirmation
 *
 * Cron Pattern: '0 3 * * *' (Daily at 3:00 AM)
 *
 * @returns Promise that resolves when scheduling is complete
 * @throws Error if scheduling fails
 */
export async function scheduleDailyRecommendationGeneration(): Promise<void> {
  try {
    console.log('[RecommendationsJob] Scheduling daily recommendation generation...');

    // Remove existing repeatable jobs (idempotent setup)
    const repeatableJobs = await queue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await queue.removeRepeatableByKey(job.key);
      console.log(`[RecommendationsJob] Removed existing scheduled job: ${job.key}`);
    }

    // Schedule new job: Daily at 3:00 AM UTC
    await queue.add(
      'daily-recommendations-generation',
      {}, // No specific tenant or account - process all
      {
        repeat: {
          pattern: '0 3 * * *', // Cron: Daily at 3:00 AM
        },
        jobId: 'daily-recommendations-generation',
      }
    );

    console.log('[RecommendationsJob] Scheduled daily recommendation generation at 3:00 AM UTC');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RecommendationsJob] Failed to schedule recommendation generation:', errorMessage);
    throw error;
  }
}

/**
 * Manually trigger recommendation generation
 *
 * This function allows on-demand generation of recommendations outside the scheduled time.
 * Useful for:
 * - Testing
 * - After adding new cloud accounts
 * - After cost data collection
 * - Manual refresh requested by users
 *
 * @param tenantId - Optional: Generate only for this tenant
 * @param cloudAccountId - Optional: Generate only for this cloud account
 * @returns Promise that resolves to the created job
 * @throws Error if job creation fails
 */
export async function triggerManualRecommendationGeneration(
  tenantId?: string,
  cloudAccountId?: string
): Promise<Job<RecommendationGenerationJobData>> {
  try {
    console.log('[RecommendationsJob] Triggering manual recommendation generation...');
    if (tenantId) {
      console.log(`[RecommendationsJob]   Tenant: ${tenantId}`);
    }
    if (cloudAccountId) {
      console.log(`[RecommendationsJob]   Cloud Account: ${cloudAccountId}`);
    }

    const job = await queue.add(
      'manual-recommendations-generation',
      { tenantId, cloudAccountId },
      {
        priority: 1, // Higher priority for manual triggers
        removeOnComplete: {
          count: 50, // Keep fewer manual jobs
        },
      }
    );

    console.log(`[RecommendationsJob] Manual job created: ${job.id}`);
    return job;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RecommendationsJob] Failed to trigger manual generation:', errorMessage);
    throw error;
  }
}

/**
 * Gracefully shutdown the recommendation generation job
 *
 * This function:
 * 1. Closes the worker (waits for active jobs to complete)
 * 2. Closes the queue connection
 * 3. Closes the Redis connection
 * 4. Closes the Prisma client
 *
 * Should be called during application shutdown (SIGTERM/SIGINT)
 *
 * @returns Promise that resolves when shutdown is complete
 */
export async function shutdownRecommendationGenerationJob(): Promise<void> {
  try {
    console.log('[RecommendationsJob] Shutting down recommendation generation job...');

    // Close worker (waits for active jobs)
    await worker.close();
    console.log('[RecommendationsJob] Worker closed');

    // Close queue
    await queue.close();
    console.log('[RecommendationsJob] Queue closed');

    // Close Redis connection
    await connection.quit();
    console.log('[RecommendationsJob] Redis connection closed');

    // Close Prisma client
    await prisma.$disconnect();
    console.log('[RecommendationsJob] Prisma client disconnected');

    console.log('[RecommendationsJob] Shutdown complete');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RecommendationsJob] Error during shutdown:', errorMessage);
    throw error;
  }
}

// ============================================================
// Exports
// ============================================================

export { queue, worker, connection };
