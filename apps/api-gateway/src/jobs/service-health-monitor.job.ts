/**
 * Service Health Monitor Background Job
 *
 * Periodically monitors Azure Service Health for all active tenants.
 * Detects new incidents, planned maintenance, and service issues.
 *
 * Features:
 * - Automatic monitoring every hour (configurable)
 * - Processes all active Azure cloud accounts
 * - Detects new service health events
 * - Creates notifications for critical events
 * - Comprehensive logging and error handling
 * - Graceful degradation on errors
 * - Metrics tracking
 *
 * Environment Variables:
 * - SERVICE_HEALTH_CHECK_INTERVAL: Check interval in minutes (default: 60)
 * - SERVICE_HEALTH_ENABLED: Enable/disable job (default: true)
 * - SERVICE_HEALTH_NOTIFICATION_THRESHOLD: Severity threshold for notifications (default: high)
 *   Values: critical, high, medium, low, all
 *
 * @module jobs/service-health-monitor
 */

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AzureServiceHealthService } from '../integrations/azure/service-health.service';
import type { ServiceIssue, MaintenanceEvent } from '../integrations/azure/service-health.service';
import type { CloudProviderCredentials } from '../integrations/cloud-provider.interface';
import cloudAccountService from '../services/cloudAccount.service';
import type { AzureCredentials } from '../services/cloudAccount.service';

// ============================================================
// Configuration
// ============================================================

const CHECK_INTERVAL = parseInt(process.env.SERVICE_HEALTH_CHECK_INTERVAL || '60', 10);
const HEALTH_CHECK_ENABLED = process.env.SERVICE_HEALTH_ENABLED !== 'false';
const NOTIFICATION_THRESHOLD = (process.env.SERVICE_HEALTH_NOTIFICATION_THRESHOLD ||
  'high') as NotificationThreshold;

type NotificationThreshold = 'critical' | 'high' | 'medium' | 'low' | 'all';

// Convert minutes to cron expression
// Examples: 60 min = 0 * * * *, 30 min = */30 * * * *
const CRON_EXPRESSION =
  CHECK_INTERVAL >= 60 ? `0 */${Math.floor(CHECK_INTERVAL / 60)} * * *` : `*/${CHECK_INTERVAL} * * * *`;

// ============================================================
// Job State
// ============================================================

interface JobStats {
  lastRunAt: Date | null;
  lastRunDuration: number | null;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalEventsProcessed: number;
  totalNotificationsCreated: number;
  lastError: string | null;
}

const jobStats: JobStats = {
  lastRunAt: null,
  lastRunDuration: null,
  totalRuns: 0,
  successfulRuns: 0,
  failedRuns: 0,
  totalEventsProcessed: 0,
  totalNotificationsCreated: 0,
  lastError: null,
};

let isRunning = false;

// ============================================================
// Service Health Monitoring Job
// ============================================================

/**
 * Main service health monitoring job function
 *
 * Checks service health for all active Azure accounts and creates notifications.
 */
async function runServiceHealthCheck(): Promise<void> {
  // Prevent concurrent runs
  if (isRunning) {
    console.log('[ServiceHealthMonitor] Previous check still running, skipping this run');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  console.log('[ServiceHealthMonitor] Starting scheduled service health check');

  try {
    // Get all active tenants with Azure cloud accounts
    const tenants = await prisma.tenant.findMany({
      where: {
        status: 'active',
      },
      include: {
        cloudAccounts: {
          where: {
            provider: 'azure',
            status: 'active',
          },
        },
      },
    });

    console.log(`[ServiceHealthMonitor] Found ${tenants.length} active tenants`);

    let totalEventsProcessed = 0;
    let totalNotificationsCreated = 0;
    let totalAccountsProcessed = 0;
    const errors: string[] = [];

    // Process each tenant
    for (const tenant of tenants) {
      try {
        if (tenant.cloudAccounts.length === 0) {
          continue; // Skip tenants without Azure accounts
        }

        console.log(
          `[ServiceHealthMonitor] Processing tenant: ${tenant.name} (${tenant.id}) - ${tenant.cloudAccounts.length} Azure accounts`
        );

        // Process each Azure account
        for (const account of tenant.cloudAccounts) {
          try {
            // Decrypt credentials using CloudAccountService
            let azureCredentials: AzureCredentials;
            try {
              const decryptedCreds = await cloudAccountService.getCredentials(
                account.id,
                tenant.id
              );
              azureCredentials = decryptedCreds as AzureCredentials;
            } catch (error) {
              console.warn(
                `[ServiceHealthMonitor] Skipping account ${account.accountName}: Failed to decrypt credentials - ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`
              );
              continue;
            }

            // Validate Azure credentials
            if (
              !azureCredentials.clientId ||
              !azureCredentials.clientSecret ||
              !azureCredentials.tenantId ||
              !azureCredentials.subscriptionId
            ) {
              console.warn(
                `[ServiceHealthMonitor] Skipping account ${account.accountName}: Incomplete Azure credentials`
              );
              continue;
            }

            // Build CloudProviderCredentials from decrypted data
            const credentials: CloudProviderCredentials = {
              provider: 'azure',
              azureClientId: azureCredentials.clientId,
              azureClientSecret: azureCredentials.clientSecret,
              azureTenantId: azureCredentials.tenantId,
              azureSubscriptionId: azureCredentials.subscriptionId,
            };

            // Initialize service health service
            const serviceHealth = new AzureServiceHealthService(credentials);

            // Get active service issues
            const issues = await serviceHealth.getServiceIssues(account.id);
            const activeIssues = issues.filter((issue) => issue.status === 'active');

            // Get planned maintenance (next 7 days)
            const maintenance = await serviceHealth.getPlannedMaintenance(account.id, 7);
            const upcomingMaintenance = maintenance.filter((m) => m.status === 'scheduled');

            console.log(
              `[ServiceHealthMonitor] Account ${account.accountName}: ${activeIssues.length} active issues, ${upcomingMaintenance.length} upcoming maintenance`
            );

            // Process active issues
            for (const issue of activeIssues) {
              const processed = await processServiceIssue(prisma, tenant.id, account.id, issue);
              if (processed.isNew || processed.isUpdated) {
                totalEventsProcessed++;
              }
              if (processed.notificationCreated) {
                totalNotificationsCreated++;
              }
            }

            // Process planned maintenance
            for (const maint of upcomingMaintenance) {
              const processed = await processMaintenanceEvent(
                prisma,
                tenant.id,
                account.id,
                maint
              );
              if (processed.isNew || processed.isUpdated) {
                totalEventsProcessed++;
              }
              if (processed.notificationCreated) {
                totalNotificationsCreated++;
              }
            }

            totalAccountsProcessed++;
          } catch (error) {
            const errorMsg = `Account ${account.accountName}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`;
            errors.push(errorMsg);
            console.error(`[ServiceHealthMonitor] ${errorMsg}`, error);
            // Continue with other accounts
          }
        }
      } catch (error) {
        const errorMsg = `Failed to process tenant ${tenant.name}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        errors.push(errorMsg);
        console.error(`[ServiceHealthMonitor] ${errorMsg}`, error);
        // Continue with other tenants
      }
    }

    // Update job statistics
    const duration = Date.now() - startTime;
    jobStats.lastRunAt = new Date();
    jobStats.lastRunDuration = duration;
    jobStats.totalRuns++;
    jobStats.totalEventsProcessed += totalEventsProcessed;
    jobStats.totalNotificationsCreated += totalNotificationsCreated;

    if (errors.length === 0) {
      jobStats.successfulRuns++;
      jobStats.lastError = null;
    } else {
      jobStats.failedRuns++;
      jobStats.lastError = errors.join('; ');
    }

    console.log(
      `[ServiceHealthMonitor] Completed in ${duration}ms: ${totalEventsProcessed} events, ${totalNotificationsCreated} notifications from ${totalAccountsProcessed} accounts${
        errors.length > 0 ? ` (${errors.length} errors)` : ''
      }`
    );

    // Cleanup
    await prisma.$disconnect();
  } catch (error) {
    console.error('[ServiceHealthMonitor] Fatal error during health check:', error);

    jobStats.failedRuns++;
    jobStats.lastError = error instanceof Error ? error.message : 'Unknown error';

    throw error;
  } finally {
    isRunning = false;
  }
}

// ============================================================
// Event Processing Functions
// ============================================================

/**
 * Process a service issue
 *
 * @returns Processing result with notification status
 */
async function processServiceIssue(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
  issue: ServiceIssue
): Promise<{ isNew: boolean; isUpdated: boolean; notificationCreated: boolean }> {
  try {
    // Check if this event already exists
    const existing = await prisma.$queryRaw<any[]>`
      SELECT * FROM azure_service_health
      WHERE event_id = ${issue.eventId}
      LIMIT 1
    `;

    const isNew = existing.length === 0;
    let isUpdated = false;
    let notificationCreated = false;

    if (isNew) {
      // Insert new event
      await prisma.$executeRaw`
        INSERT INTO azure_service_health (
          tenant_id, account_id, event_type, event_id, title, description,
          impact_type, status, severity, affected_services, affected_regions,
          impact_start, impact_end, last_update_time, tracking_id,
          is_platform_initiated, is_hir, metadata
        ) VALUES (
          ${tenantId}::uuid, ${accountId}, 'incident', ${issue.eventId},
          ${issue.title}, ${issue.description}, ${issue.impactType},
          ${issue.status}, ${issue.severity}, ${issue.affectedServices}::text[],
          ${issue.affectedRegions}::text[], ${issue.impactStartTime},
          ${issue.impactMitigationTime}, ${issue.lastUpdateTime},
          ${issue.metadata.trackingId}, ${issue.isPlatformInitiated},
          ${issue.isHIR}, ${JSON.stringify(issue.metadata)}::jsonb
        )
      `;

      console.log(`[ServiceHealthMonitor] New service issue detected: ${issue.title}`);

      // Create notification if severity meets threshold
      if (shouldNotify(issue.severity)) {
        notificationCreated = await createNotification(
          prisma,
          tenantId,
          'service_health',
          issue.title,
          issue.description,
          issue.severity,
          `/service-health?eventId=${issue.eventId}`
        );
      }
    } else {
      // Check if status changed
      const existingEvent = existing[0];
      if (existingEvent.status !== issue.status) {
        await prisma.$executeRaw`
          UPDATE azure_service_health
          SET status = ${issue.status},
              last_update_time = ${issue.lastUpdateTime},
              impact_end = ${issue.impactMitigationTime},
              metadata = ${JSON.stringify(issue.metadata)}::jsonb,
              updated_at = CURRENT_TIMESTAMP
          WHERE event_id = ${issue.eventId}
        `;

        isUpdated = true;
        console.log(
          `[ServiceHealthMonitor] Service issue updated: ${issue.title} - Status: ${issue.status}`
        );

        // Create notification for resolution
        if (issue.status === 'resolved') {
          notificationCreated = await createNotification(
            prisma,
            tenantId,
            'service_health',
            `Resolved: ${issue.title}`,
            `Service issue has been resolved. ${issue.description}`,
            'info',
            `/service-health?eventId=${issue.eventId}`
          );
        }
      }
    }

    return { isNew, isUpdated, notificationCreated };
  } catch (error) {
    console.error(
      `[ServiceHealthMonitor] Error processing service issue ${issue.eventId}:`,
      error
    );
    return { isNew: false, isUpdated: false, notificationCreated: false };
  }
}

/**
 * Process a maintenance event
 *
 * @returns Processing result with notification status
 */
async function processMaintenanceEvent(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
  maint: MaintenanceEvent
): Promise<{ isNew: boolean; isUpdated: boolean; notificationCreated: boolean }> {
  try {
    // Check if this event already exists
    const existing = await prisma.$queryRaw<any[]>`
      SELECT * FROM azure_service_health
      WHERE event_id = ${maint.eventId}
      LIMIT 1
    `;

    const isNew = existing.length === 0;
    let isUpdated = false;
    let notificationCreated = false;

    if (isNew) {
      // Insert new event
      await prisma.$executeRaw`
        INSERT INTO azure_service_health (
          tenant_id, account_id, event_type, event_id, title, description,
          impact_type, status, severity, affected_services, affected_regions,
          impact_start, impact_end, last_update_time, requires_action,
          metadata, notification_time
        ) VALUES (
          ${tenantId}::uuid, ${accountId}, 'maintenance', ${maint.eventId},
          ${maint.title}, ${maint.description}, 'ActionRequired',
          ${maint.status}, 'medium', ${maint.affectedServices}::text[],
          ${maint.affectedRegions}::text[], ${maint.startTime}, ${maint.endTime},
          ${new Date()}, ${maint.requiresAction}, ${JSON.stringify(maint.metadata)}::jsonb,
          ${maint.notificationTime}
        )
      `;

      console.log(`[ServiceHealthMonitor] New planned maintenance detected: ${maint.title}`);

      // Calculate days until maintenance
      const daysUntil = Math.ceil(
        (maint.startTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // Create notification if maintenance is within 7 days
      if (daysUntil <= 7) {
        const message = `Planned maintenance scheduled for ${maint.startTime.toLocaleString()}. ${maint.description}`;
        notificationCreated = await createNotification(
          prisma,
          tenantId,
          'service_health',
          maint.title,
          message,
          maint.requiresAction ? 'warning' : 'info',
          `/service-health?eventId=${maint.eventId}`
        );
      }
    } else {
      // Check if status changed
      const existingEvent = existing[0];
      if (existingEvent.status !== maint.status) {
        await prisma.$executeRaw`
          UPDATE azure_service_health
          SET status = ${maint.status},
              metadata = ${JSON.stringify(maint.metadata)}::jsonb,
              updated_at = CURRENT_TIMESTAMP
          WHERE event_id = ${maint.eventId}
        `;

        isUpdated = true;
        console.log(
          `[ServiceHealthMonitor] Maintenance event updated: ${maint.title} - Status: ${maint.status}`
        );
      }
    }

    return { isNew, isUpdated, notificationCreated };
  } catch (error) {
    console.error(
      `[ServiceHealthMonitor] Error processing maintenance event ${maint.eventId}:`,
      error
    );
    return { isNew: false, isUpdated: false, notificationCreated: false };
  }
}

/**
 * Create a notification for users
 */
async function createNotification(
  prisma: PrismaClient,
  tenantId: string,
  type: string,
  title: string,
  message: string,
  severity: string,
  link?: string
): Promise<boolean> {
  try {
    // Get tenant admin users
    const users = await prisma.$queryRaw<any[]>`
      SELECT user_id FROM user_tenants
      WHERE tenant_id = ${tenantId}::uuid
      AND role IN ('owner', 'admin')
    `;

    if (users.length === 0) {
      console.warn(`[ServiceHealthMonitor] No admin users found for tenant ${tenantId}`);
      return false;
    }

    // Create notification for each admin user
    for (const user of users) {
      await prisma.$executeRaw`
        INSERT INTO notifications (
          tenant_id, user_id, type, title, message, severity, link,
          action_required, delivery_method
        ) VALUES (
          ${tenantId}::uuid, ${user.user_id}::uuid, ${type}, ${title},
          ${message}, ${severity}, ${link || null},
          ${severity === 'critical' || severity === 'warning'},
          ARRAY['in_app', 'email']::varchar[]
        )
      `;
    }

    console.log(
      `[ServiceHealthMonitor] Created ${users.length} notifications for: ${title}`
    );
    return true;
  } catch (error) {
    console.error('[ServiceHealthMonitor] Error creating notification:', error);
    return false;
  }
}

/**
 * Check if notification should be created based on severity threshold
 */
function shouldNotify(severity: string): boolean {
  const severityOrder = ['critical', 'high', 'medium', 'low', 'informational'];
  const thresholdIndex = severityOrder.indexOf(NOTIFICATION_THRESHOLD);
  const severityIndex = severityOrder.indexOf(severity);

  // If threshold is 'all', always notify
  if (NOTIFICATION_THRESHOLD === 'all') {
    return true;
  }

  // Notify if severity is equal to or higher than threshold
  return severityIndex <= thresholdIndex;
}

// ============================================================
// Job Scheduler
// ============================================================

let scheduledJob: cron.ScheduledTask | null = null;

/**
 * Start the service health monitoring job scheduler
 */
export function startServiceHealthMonitor(): void {
  if (!HEALTH_CHECK_ENABLED) {
    console.log('[ServiceHealthMonitor] Service health monitoring job is disabled');
    return;
  }

  if (scheduledJob) {
    console.log('[ServiceHealthMonitor] Job already scheduled');
    return;
  }

  console.log(
    `[ServiceHealthMonitor] Scheduling service health check every ${CHECK_INTERVAL} minutes (cron: ${CRON_EXPRESSION})`
  );
  console.log(
    `[ServiceHealthMonitor] Notification threshold: ${NOTIFICATION_THRESHOLD}`
  );

  scheduledJob = cron.schedule(
    CRON_EXPRESSION,
    async () => {
      await runServiceHealthCheck();
    },
    {
      scheduled: true,
      timezone: 'UTC',
    }
  );

  console.log('[ServiceHealthMonitor] Service health monitoring job started successfully');

  // Run immediately on startup (optional - comment out if not desired)
  setTimeout(() => {
    console.log('[ServiceHealthMonitor] Running initial health check on startup');
    runServiceHealthCheck().catch((error) => {
      console.error('[ServiceHealthMonitor] Error in initial health check:', error);
    });
  }, 10000); // Wait 10 seconds after startup
}

/**
 * Stop the service health monitoring job scheduler
 */
export function stopServiceHealthMonitor(): void {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    console.log('[ServiceHealthMonitor] Service health monitoring job stopped');
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
 * Manually trigger service health check
 *
 * @returns Promise that resolves when check is complete
 */
export async function triggerServiceHealthCheck(): Promise<void> {
  console.log('[ServiceHealthMonitor] Manual trigger requested');
  await runServiceHealthCheck();
}

// ============================================================
// Graceful Shutdown
// ============================================================

/**
 * Handle graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('[ServiceHealthMonitor] SIGTERM received, stopping job...');
  stopServiceHealthMonitor();
});

process.on('SIGINT', () => {
  console.log('[ServiceHealthMonitor] SIGINT received, stopping job...');
  stopServiceHealthMonitor();
});
