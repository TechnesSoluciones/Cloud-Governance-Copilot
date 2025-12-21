/**
 * BullMQ Cost Collection Job
 *
 * This module implements a background job that automatically collects cost data
 * from all active cloud accounts daily at 2 AM. It orchestrates the cost collection
 * and anomaly detection workflows using BullMQ for reliable job processing.
 *
 * Workflow:
 * 1. Job is scheduled to run daily at 2 AM via cron pattern
 * 2. Retrieves all active cloud accounts (AWS and Azure) from database
 * 3. For each account:
 *    a. Collects yesterday's cost data using CostCollectionService
 *    b. Analyzes collected costs for anomalies using AnomalyDetectionService
 *    c. Logs results and any errors
 * 4. Returns summary of successful and failed account processing
 *
 * Features:
 * - Automatic retry with exponential backoff (max 3 attempts)
 * - Job result retention (last 100 completed, last 1000 failed)
 * - Rate limiting (max 10 jobs per minute)
 * - Comprehensive logging for production monitoring
 * - Graceful shutdown handling
 * - Manual trigger support for testing
 *
 * Architecture Pattern:
 * - Queue/Worker Pattern: Decouples job scheduling from execution
 * - Retry Logic: Automatic retry with exponential backoff for transient failures
 * - Event-Driven: Services emit events for cross-module communication
 * - Fail-Safe: Errors in individual accounts don't fail the entire job
 *
 * @module Shared/Jobs/CostCollection
 */

import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../../lib/prisma';
import { CostCollectionService } from '../../modules/finops/services';
import { AnomalyDetectionService } from '../../modules/finops/services';
import { eventBus } from '../events/event-bus';

// ============================================================
// Types and Interfaces
// ============================================================

/**
 * Result of processing a single cloud account
 */
interface AccountProcessingResult {
  /** UUID of the cloud account */
  accountId: string;

  /** Human-readable account name */
  accountName: string;

  /** Number of cost records collected and saved */
  recordsCollected?: number;

  /** Number of anomalies detected */
  anomaliesDetected?: number;

  /** Indicates if processing was successful */
  success: boolean;

  /** Error message if processing failed */
  error?: string;
}

/**
 * Overall job execution result
 */
interface JobExecutionResult {
  /** Total number of accounts processed */
  totalAccounts: number;

  /** Number of accounts processed successfully */
  successfulAccounts: number;

  /** Number of accounts that failed processing */
  failedAccounts: number;

  /** Total execution time in milliseconds */
  executionTimeMs: number;

  /** Detailed results for each account */
  results: AccountProcessingResult[];
}

// ============================================================
// Redis Connection Configuration
// ============================================================

/**
 * Redis connection instance for BullMQ
 *
 * Configuration:
 * - Uses ioredis (recommended by BullMQ)
 * - Prioritizes REDIS_URL for consistent connection (supports TLS automatically)
 * - Falls back to individual env vars if REDIS_URL not available
 * - maxRetriesPerRequest: null required for BullMQ compatibility
 */
const redisUrl = process.env.REDIS_URL;

console.log('[CostCollectionJob] Redis Connection Configuration:', {
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

  console.log('[CostCollectionJob] Using individual parameters:', {
    host: redisHost,
    port: redisPort,
    db: redisDb,
  });

  connection = new IORedis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    db: redisDb,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    // Connection retry strategy
    retryStrategy: (times) => {
      const delay = Math.min(times * 1000, 5000);
      console.log(`[CostCollectionJob] Redis connection retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    // Reconnection configuration
    reconnectOnError: (err) => {
      console.error('[CostCollectionJob] Redis reconnection triggered by error:', err.message);
      return true; // Always attempt reconnection
    },
  });
}

// ============================================================
// Queue Configuration
// ============================================================

/**
 * BullMQ Queue for cost collection jobs
 *
 * Configuration:
 * - Automatic retry: 3 attempts with exponential backoff
 * - Result retention: Last 100 completed jobs for monitoring
 * - Failure retention: Last 1000 failed jobs for debugging
 * - Job expiration: Completed jobs auto-removed after 7 days
 */
export const costCollectionQueue = new Queue('cost-collection', {
  connection,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times on failure
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay, doubles each retry
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 7 * 24 * 3600, // Remove jobs older than 7 days
    },
    removeOnFail: {
      count: 1000, // Keep last 1000 failed jobs for debugging
    },
  },
});

// ============================================================
// Worker Configuration
// ============================================================

/**
 * Cost collection service instance
 * Uses global Prisma singleton for optimized connection pooling
 */
const costCollectionService = new CostCollectionService(prisma, eventBus);

/**
 * Anomaly detection service instance
 */
const anomalyDetectionService = new AnomalyDetectionService(prisma, eventBus);

/**
 * BullMQ Worker for processing cost collection jobs
 *
 * This worker:
 * 1. Retrieves all active cloud accounts (AWS and Azure)
 * 2. Processes each account sequentially
 * 3. Collects yesterday's cost data
 * 4. Analyzes costs for anomalies
 * 5. Returns aggregated results
 *
 * Configuration:
 * - Concurrency: 1 (process one job at a time to avoid database contention)
 * - Rate limiting: Max 10 jobs per minute
 * - Error handling: Errors are caught and logged, then re-thrown for BullMQ retry
 */
const worker = new Worker(
  'cost-collection',
  async (job: Job): Promise<JobExecutionResult> => {
    const startTime = Date.now();
    console.log(`[CostCollectionJob] Starting daily cost collection at ${new Date().toISOString()}`);
    console.log(`[CostCollectionJob] Job ID: ${job.id}`);

    try {
      // Step 1: Retrieve all active cloud accounts (AWS and Azure)
      console.log('[CostCollectionJob] Retrieving active cloud accounts (AWS + Azure)...');
      const accounts = await prisma.cloudAccount.findMany({
        where: {
          status: 'active',
          provider: {
            in: ['aws', 'azure'],
          },
        },
        include: {
          tenant: true,
        },
      });

      // Count by provider for logging
      const awsCount = accounts.filter(a => a.provider === 'aws').length;
      const azureCount = accounts.filter(a => a.provider === 'azure').length;
      console.log(`[CostCollectionJob] Found ${accounts.length} active accounts: ${awsCount} AWS, ${azureCount} Azure`);

      if (accounts.length === 0) {
        console.log('[CostCollectionJob] No active cloud accounts found, skipping job');
        return {
          totalAccounts: 0,
          successfulAccounts: 0,
          failedAccounts: 0,
          executionTimeMs: Date.now() - startTime,
          results: [],
        };
      }

      // Step 2: Define date range (yesterday, full day)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date(yesterday);
      today.setHours(23, 59, 59, 999);

      const dateRange = { start: yesterday, end: today };

      console.log(
        `[CostCollectionJob] Processing costs for date: ${yesterday.toISOString().split('T')[0]}`
      );

      // Step 3: Process each account
      const results: AccountProcessingResult[] = [];

      for (const account of accounts) {
        try {
          const providerLabel = account.provider.toUpperCase();
          console.log(
            `[CostCollectionJob] Processing ${providerLabel} account: ${account.accountName} (${account.id}) - Tenant: ${account.tenant.name}`
          );

          // Step 3a: Collect costs for the account
          console.log(`[CostCollectionJob] (${providerLabel}) Collecting costs for account ${account.accountName}...`);
          const collectionResult = await costCollectionService.collectCostsForAccount(
            account.id,
            dateRange
          );

          // Check if collection was successful
          if (!collectionResult.success) {
            throw new Error(
              collectionResult.errors?.join(', ') || 'Cost collection failed with unknown error'
            );
          }

          console.log(
            `[CostCollectionJob] (${providerLabel}) Successfully collected ${collectionResult.recordsSaved} cost records for ${account.accountName}`
          );

          // Step 3b: Analyze costs for anomalies
          console.log(`[CostCollectionJob] (${providerLabel}) Analyzing costs for anomalies in account ${account.accountName}...`);
          const analysisResult = await anomalyDetectionService.analyzeRecentCosts(
            account.tenantId,
            account.id,
            yesterday
          );

          console.log(
            `[CostCollectionJob] (${providerLabel}) Detected ${analysisResult.anomaliesDetected} anomalies for ${account.accountName}`
          );

          // Step 3c: Record successful result
          results.push({
            accountId: account.id,
            accountName: account.accountName,
            recordsCollected: collectionResult.recordsSaved,
            anomaliesDetected: analysisResult.anomaliesDetected,
            success: true,
          });

          console.log(
            `[CostCollectionJob] (${providerLabel}) Account ${account.accountName} processed successfully: ${collectionResult.recordsSaved} records, ${analysisResult.anomaliesDetected} anomalies`
          );
        } catch (error: any) {
          const providerLabel = account.provider.toUpperCase();
          // Log error but continue processing other accounts
          console.error(
            `[CostCollectionJob] (${providerLabel}) Error processing account ${account.accountName} (${account.id}):`,
            error.message
          );
          console.error(`[CostCollectionJob] (${providerLabel}) Stack trace:`, error.stack);

          // Record failed result
          results.push({
            accountId: account.id,
            accountName: account.accountName,
            success: false,
            error: error.message,
          });
        }
      }

      // Step 4: Calculate final statistics
      const duration = Date.now() - startTime;
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      console.log(`[CostCollectionJob] ========================================`);
      console.log(`[CostCollectionJob] Job completed in ${duration}ms`);
      console.log(`[CostCollectionJob] Total accounts: ${accounts.length}`);
      console.log(`[CostCollectionJob] Successful: ${successCount}`);
      console.log(`[CostCollectionJob] Failed: ${failureCount}`);
      console.log(`[CostCollectionJob] ========================================`);

      // Return aggregated result
      return {
        totalAccounts: accounts.length,
        successfulAccounts: successCount,
        failedAccounts: failureCount,
        executionTimeMs: duration,
        results,
      };
    } catch (error: any) {
      // Catch-all error handler for unexpected failures
      console.error('[CostCollectionJob] Critical job failure:', error.message);
      console.error('[CostCollectionJob] Stack trace:', error.stack);

      // Re-throw error to trigger BullMQ retry mechanism
      throw error;
    }
  },
  {
    connection,
    concurrency: 1, // Process one job at a time
    limiter: {
      max: 10, // Maximum 10 jobs
      duration: 60000, // Per minute (rate limiting)
    },
  }
);

// ============================================================
// Worker Event Handlers
// ============================================================

/**
 * Event handler: Job completed successfully
 */
worker.on('completed', (job: Job, result: JobExecutionResult) => {
  console.log(`[CostCollectionJob] Job ${job.id} completed successfully`);
  console.log(
    `[CostCollectionJob] Summary: ${result.successfulAccounts}/${result.totalAccounts} accounts processed successfully`
  );
});

/**
 * Event handler: Job failed after all retry attempts
 */
worker.on('failed', (job: Job | undefined, err: Error) => {
  if (job) {
    console.error(`[CostCollectionJob] Job ${job.id} failed after ${job.attemptsMade} attempts`);
    console.error(`[CostCollectionJob] Error:`, err.message);
  } else {
    console.error(`[CostCollectionJob] Job failed (no job context):`, err.message);
  }
});

/**
 * Event handler: Worker error (connection issues, etc.)
 */
worker.on('error', (err: Error) => {
  console.error('[CostCollectionJob] Worker error:', err.message);
  console.error('[CostCollectionJob] This may indicate Redis connection issues');
});

/**
 * Event handler: Worker is ready and processing jobs
 */
worker.on('ready', () => {
  console.log('[CostCollectionJob] Worker is ready and listening for jobs');
});

/**
 * Event handler: Worker is draining (shutting down gracefully)
 */
worker.on('drained', () => {
  console.log('[CostCollectionJob] Worker has processed all pending jobs');
});

// ============================================================
// Job Scheduling Functions
// ============================================================

/**
 * Schedules daily cost collection job at 2 AM
 *
 * This function:
 * 1. Removes any existing repeatable jobs to prevent duplicates
 * 2. Adds a new repeatable job with cron pattern '0 2 * * *' (2 AM daily)
 * 3. Uses America/New_York timezone for consistent scheduling
 *
 * The job will run every day at 2 AM to collect the previous day's costs.
 *
 * @example
 * ```typescript
 * await scheduleDailyCostCollection();
 * console.log('Daily cost collection scheduled at 2 AM');
 * ```
 */
export async function scheduleDailyCostCollection(): Promise<void> {
  console.log('[CostCollectionJob] Configuring daily cost collection schedule...');

  // Step 1: Remove existing repeatable jobs to prevent duplicates
  const repeatableJobs = await costCollectionQueue.getRepeatableJobs();
  console.log(`[CostCollectionJob] Found ${repeatableJobs.length} existing repeatable job(s)`);

  for (const job of repeatableJobs) {
    await costCollectionQueue.removeRepeatableByKey(job.key);
    console.log(`[CostCollectionJob] Removed existing repeatable job: ${job.key}`);
  }

  // Step 2: Add new repeatable job with cron pattern
  await costCollectionQueue.add(
    'daily-cost-collection',
    {}, // No specific job data needed
    {
      repeat: {
        pattern: '0 2 * * *', // Cron: Every day at 2:00 AM
        tz: 'America/New_York', // Timezone for consistent scheduling
      },
    }
  );

  console.log('[CostCollectionJob] Daily cost collection scheduled successfully');
  console.log('[CostCollectionJob] Schedule: 2:00 AM daily (America/New_York timezone)');
  console.log('[CostCollectionJob] Next execution will process previous day\'s costs');
}

/**
 * Triggers a manual cost collection job for testing or on-demand execution
 *
 * This function immediately queues a cost collection job without waiting for
 * the scheduled time. Useful for:
 * - Testing the job implementation
 * - Manual re-processing of costs
 * - Recovering from failed scheduled runs
 *
 * @returns The created job instance
 *
 * @example
 * ```typescript
 * const job = await triggerManualCostCollection();
 * console.log(`Manual job triggered with ID: ${job.id}`);
 *
 * // Wait for job to complete
 * const result = await job.waitUntilFinished(queueEvents);
 * console.log(`Job finished with result:`, result);
 * ```
 */
export async function triggerManualCostCollection(): Promise<Job> {
  console.log('[CostCollectionJob] Triggering manual cost collection...');

  const job = await costCollectionQueue.add('manual-cost-collection', {}, {
    // Override default job options for manual runs if needed
    priority: 1, // Higher priority than scheduled jobs
  });

  console.log(`[CostCollectionJob] Manual collection triggered successfully`);
  console.log(`[CostCollectionJob] Job ID: ${job.id}`);
  console.log(`[CostCollectionJob] Job will be processed by the worker shortly`);

  return job;
}

// ============================================================
// Graceful Shutdown
// ============================================================

/**
 * Gracefully shuts down the cost collection job system
 *
 * This function ensures clean shutdown by:
 * 1. Closing the worker (waits for current job to complete)
 * 2. Closing the queue (prevents new jobs from being added)
 * 3. Closing Redis connection
 * 4. Disconnecting Prisma client
 *
 * This prevents:
 * - Job corruption from interrupted processing
 * - Memory leaks from unclosed connections
 * - Database connection exhaustion
 *
 * @example
 * ```typescript
 * process.on('SIGTERM', async () => {
 *   await shutdownCostCollectionJob();
 *   process.exit(0);
 * });
 * ```
 */
export async function shutdownCostCollectionJob(): Promise<void> {
  console.log('[CostCollectionJob] Initiating graceful shutdown...');

  try {
    // Step 1: Close worker (waits for current job to finish)
    console.log('[CostCollectionJob] Closing worker...');
    await worker.close();
    console.log('[CostCollectionJob] Worker closed successfully');

    // Step 2: Close queue
    console.log('[CostCollectionJob] Closing queue...');
    await costCollectionQueue.close();
    console.log('[CostCollectionJob] Queue closed successfully');

    // Step 3: Close Redis connection
    console.log('[CostCollectionJob] Closing Redis connection...');
    await connection.quit();
    console.log('[CostCollectionJob] Redis connection closed successfully');

    // Step 4: Disconnect Prisma client
    console.log('[CostCollectionJob] Disconnecting Prisma client...');
    await prisma.$disconnect();
    console.log('[CostCollectionJob] Prisma client disconnected successfully');

    console.log('[CostCollectionJob] Graceful shutdown completed successfully');
  } catch (error: any) {
    console.error('[CostCollectionJob] Error during shutdown:', error.message);
    console.error('[CostCollectionJob] Forcing shutdown...');

    // Force close connections even if errors occurred
    try {
      await connection.quit();
    } catch (e) {
      console.error('[CostCollectionJob] Failed to close Redis connection:', e);
    }

    try {
      await prisma.$disconnect();
    } catch (e) {
      console.error('[CostCollectionJob] Failed to disconnect Prisma:', e);
    }
  }
}

// ============================================================
// Process Signal Handlers
// ============================================================

/**
 * Handle SIGTERM signal (graceful shutdown request)
 *
 * This is typically sent by:
 * - Docker when stopping a container
 * - Kubernetes when terminating a pod
 * - systemd when stopping a service
 */
process.on('SIGTERM', async () => {
  console.log('[CostCollectionJob] Received SIGTERM signal');
  await shutdownCostCollectionJob();
  process.exit(0);
});

/**
 * Handle SIGINT signal (Ctrl+C in terminal)
 *
 * This allows developers to gracefully stop the worker during development.
 */
process.on('SIGINT', async () => {
  console.log('[CostCollectionJob] Received SIGINT signal (Ctrl+C)');
  await shutdownCostCollectionJob();
  process.exit(0);
});

// ============================================================
// Module Exports
// ============================================================

/**
 * Export queue for monitoring and management
 */
export { costCollectionQueue as queue };

/**
 * Export worker for testing and lifecycle management
 */
export { worker };

/**
 * Export connection for advanced use cases
 */
export { connection };
