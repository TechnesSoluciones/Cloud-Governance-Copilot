/**
 * Asset Discovery Background Job
 *
 * Periodically discovers cloud resources across all active cloud accounts.
 * Runs on a configurable schedule using node-cron.
 *
 * Features:
 * - Automatic discovery every 15 minutes (configurable)
 * - Processes all active cloud accounts
 * - Detects changes and generates events
 * - Comprehensive logging and error handling
 * - Graceful degradation on errors
 * - Metrics tracking
 *
 * Environment Variables:
 * - ASSET_DISCOVERY_INTERVAL: Discovery interval in minutes (default: 15)
 * - ASSET_DISCOVERY_ENABLED: Enable/disable job (default: true)
 *
 * @module jobs/asset-discovery
 */

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { EventEmitter } from 'events';
import { AssetDiscoveryService } from '../modules/assets/services/asset-discovery.service';

// ============================================================
// Configuration
// ============================================================

const DISCOVERY_INTERVAL = parseInt(process.env.ASSET_DISCOVERY_INTERVAL || '15', 10);
const DISCOVERY_ENABLED = process.env.ASSET_DISCOVERY_ENABLED !== 'false';

// Convert minutes to cron expression
// Examples: 15 min = */15 * * * *, 30 min = */30 * * * *
const CRON_EXPRESSION = `*/${DISCOVERY_INTERVAL} * * * *`;

// ============================================================
// Job State
// ============================================================

interface JobStats {
  lastRunAt: Date | null;
  lastRunDuration: number | null;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalAssetsDiscovered: number;
  lastError: string | null;
}

const jobStats: JobStats = {
  lastRunAt: null,
  lastRunDuration: null,
  totalRuns: 0,
  successfulRuns: 0,
  failedRuns: 0,
  totalAssetsDiscovered: 0,
  lastError: null,
};

let isRunning = false;

// ============================================================
// Asset Discovery Job
// ============================================================

/**
 * Main asset discovery job function
 *
 * Discovers assets for all active cloud accounts and updates the database.
 */
async function runAssetDiscovery(): Promise<void> {
  // Prevent concurrent runs
  if (isRunning) {
    console.log('[AssetDiscoveryJob] Previous discovery still running, skipping this run');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  console.log('[AssetDiscoveryJob] Starting scheduled asset discovery');

  try {
    const eventBus = new EventEmitter();
    const assetDiscoveryService = new AssetDiscoveryService(prisma, eventBus);

    // Get all active tenants
    const tenants = await prisma.tenant.findMany({
      where: {
        status: 'active',
      },
      select: {
        id: true,
        name: true,
      },
    });

    console.log(`[AssetDiscoveryJob] Found ${tenants.length} active tenants`);

    let totalAssetsDiscovered = 0;
    let totalAccountsProcessed = 0;
    const errors: string[] = [];

    // Process each tenant
    for (const tenant of tenants) {
      try {
        console.log(`[AssetDiscoveryJob] Processing tenant: ${tenant.name} (${tenant.id})`);

        // Discover assets for this tenant (all accounts)
        const result = await assetDiscoveryService.discoverAssets(tenant.id);

        totalAssetsDiscovered += result.assetsDiscovered;
        totalAccountsProcessed += result.accountsProcessed;

        // Log any per-account errors
        if (result.errors.length > 0) {
          result.errors.forEach((error) => {
            const errorMsg = `Tenant ${tenant.name}, Account ${error.accountId}: ${error.error}`;
            errors.push(errorMsg);
            console.error(`[AssetDiscoveryJob] ${errorMsg}`);
          });
        }

        console.log(
          `[AssetDiscoveryJob] Tenant ${tenant.name}: ${result.assetsDiscovered} assets from ${result.accountsProcessed} accounts`
        );
      } catch (error) {
        const errorMsg = `Failed to process tenant ${tenant.name}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        errors.push(errorMsg);
        console.error(`[AssetDiscoveryJob] ${errorMsg}`, error);
        // Continue with other tenants
      }
    }

    // Update job statistics
    const duration = Date.now() - startTime;
    jobStats.lastRunAt = new Date();
    jobStats.lastRunDuration = duration;
    jobStats.totalRuns++;
    jobStats.totalAssetsDiscovered += totalAssetsDiscovered;

    if (errors.length === 0) {
      jobStats.successfulRuns++;
      jobStats.lastError = null;
    } else {
      jobStats.failedRuns++;
      jobStats.lastError = errors.join('; ');
    }

    console.log(
      `[AssetDiscoveryJob] Completed in ${duration}ms: ${totalAssetsDiscovered} assets from ${totalAccountsProcessed} accounts${
        errors.length > 0 ? ` (${errors.length} errors)` : ''
      }`
    );

    // Refresh materialized view if exists
    try {
      await prisma.$executeRaw`SELECT refresh_assets_summary();`;
      console.log('[AssetDiscoveryJob] Refreshed assets_summary materialized view');
    } catch (error) {
      console.warn('[AssetDiscoveryJob] Could not refresh materialized view:', error);
      // Non-fatal error, continue
    }

    // Cleanup
    await prisma.$disconnect();
  } catch (error) {
    console.error('[AssetDiscoveryJob] Fatal error during discovery:', error);

    jobStats.failedRuns++;
    jobStats.lastError = error instanceof Error ? error.message : 'Unknown error';

    throw error;
  } finally {
    isRunning = false;
  }
}

// ============================================================
// Job Scheduler
// ============================================================

let scheduledJob: cron.ScheduledTask | null = null;

/**
 * Start the asset discovery job scheduler
 */
export function startAssetDiscoveryJob(): void {
  if (!DISCOVERY_ENABLED) {
    console.log('[AssetDiscoveryJob] Asset discovery job is disabled');
    return;
  }

  if (scheduledJob) {
    console.log('[AssetDiscoveryJob] Job already scheduled');
    return;
  }

  console.log(
    `[AssetDiscoveryJob] Scheduling asset discovery every ${DISCOVERY_INTERVAL} minutes (cron: ${CRON_EXPRESSION})`
  );

  scheduledJob = cron.schedule(
    CRON_EXPRESSION,
    async () => {
      await runAssetDiscovery();
    },
    {
      scheduled: true,
      timezone: 'UTC',
    }
  );

  console.log('[AssetDiscoveryJob] Asset discovery job started successfully');

  // Run immediately on startup (optional - comment out if not desired)
  setTimeout(() => {
    console.log('[AssetDiscoveryJob] Running initial discovery on startup');
    runAssetDiscovery().catch((error) => {
      console.error('[AssetDiscoveryJob] Error in initial discovery:', error);
    });
  }, 5000); // Wait 5 seconds after startup
}

/**
 * Stop the asset discovery job scheduler
 */
export function stopAssetDiscoveryJob(): void {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    console.log('[AssetDiscoveryJob] Asset discovery job stopped');
  }
}

/**
 * Get job statistics
 *
 * @returns Current job statistics
 */
export function getJobStats(): JobStats {
  return { ...jobStats };
}

/**
 * Manually trigger asset discovery
 *
 * @returns Promise that resolves when discovery is complete
 */
export async function triggerAssetDiscovery(): Promise<void> {
  console.log('[AssetDiscoveryJob] Manual trigger requested');
  await runAssetDiscovery();
}

// ============================================================
// Graceful Shutdown
// ============================================================

/**
 * Handle graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('[AssetDiscoveryJob] SIGTERM received, stopping job...');
  stopAssetDiscoveryJob();
});

process.on('SIGINT', () => {
  console.log('[AssetDiscoveryJob] SIGINT received, stopping job...');
  stopAssetDiscoveryJob();
});
