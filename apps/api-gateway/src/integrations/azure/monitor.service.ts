/**
 * Azure Monitor Service
 *
 * Provides monitoring, alerting, and metrics collection using Azure Monitor.
 *
 * Features:
 * - Query metrics (CPU, Memory, Network, Disk)
 * - Fetch activity logs
 * - Get alert rules and triggered alerts
 * - Execute Log Analytics (KQL) queries
 *
 * @module integrations/azure/monitor.service
 */

import { MonitorClient } from '@azure/arm-monitor';
import { LogsQueryClient, Metric, MetricValue } from '@azure/monitor-query';
import { ClientSecretCredential } from '@azure/identity';
import type { CloudProviderCredentials } from '../cloud-provider.interface';

/**
 * Azure Monitor configuration
 */
interface AzureMonitorConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  subscriptionId: string;
}

/**
 * Metric query parameters
 */
export interface MetricQuery {
  resourceId: string;
  metricNames: string[];
  timespan: { start: Date; end: Date };
  aggregation?: 'Average' | 'Minimum' | 'Maximum' | 'Total' | 'Count';
  interval?: string; // ISO 8601 duration (e.g., 'PT1M' for 1 minute)
}

/**
 * Metric result
 */
export interface MetricResult {
  metricName: string;
  unit: string;
  aggregation: string;
  timeGrain: string;
  values: Array<{
    timestamp: Date;
    value: number;
  }>;
}

/**
 * Activity log entry
 */
export interface ActivityLogEntry {
  eventTimestamp: Date;
  level: string;
  operationName: string;
  resourceId: string;
  resourceType: string;
  status: string;
  subStatus?: string;
  caller?: string;
  description?: string;
  properties: Record<string, any>;
}

/**
 * Alert rule
 */
export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  severity: number;
  condition: string;
  actions: string[];
}

/**
 * Triggered alert
 */
export interface TriggeredAlert {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'New' | 'Acknowledged' | 'Closed';
  firedDateTime: Date;
  resolvedDateTime?: Date;
  description: string;
  affectedResources: string[];
}

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

/**
 * Azure Monitor Service
 *
 * @example
 * ```typescript
 * const monitorService = new AzureMonitorService({
 *   provider: 'azure',
 *   azureClientId: process.env.AZURE_CLIENT_ID!,
 *   azureClientSecret: process.env.AZURE_CLIENT_SECRET!,
 *   azureTenantId: process.env.AZURE_TENANT_ID!,
 *   azureSubscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
 * });
 *
 * // Get CPU metrics for a VM
 * const cpuMetrics = await monitorService.getMetrics({
 *   resourceId: '/subscriptions/.../virtualMachines/vm1',
 *   metricNames: ['Percentage CPU'],
 *   timespan: {
 *     start: new Date(Date.now() - 3600000), // 1 hour ago
 *     end: new Date(),
 *   },
 *   aggregation: 'Average',
 *   interval: 'PT5M', // 5 minute intervals
 * });
 *
 * // Get activity logs
 * const logs = await monitorService.getActivityLogs({
 *   start: new Date(Date.now() - 86400000), // 24 hours ago
 *   end: new Date(),
 * });
 *
 * // Get active alerts
 * const alerts = await monitorService.getActiveAlerts();
 * ```
 */
export class AzureMonitorService {
  private monitorClient: MonitorClient;
  private logsClient: LogsQueryClient;
  private credential: ClientSecretCredential;
  private config: AzureMonitorConfig;

  /**
   * Creates a new Azure Monitor Service instance
   *
   * @param credentials - Cloud provider credentials
   * @throws {Error} If Azure credentials are missing
   */
  constructor(credentials: CloudProviderCredentials) {
    if (
      !credentials.azureClientId ||
      !credentials.azureClientSecret ||
      !credentials.azureTenantId ||
      !credentials.azureSubscriptionId
    ) {
      throw new Error(
        'Azure credentials (tenantId, clientId, clientSecret, subscriptionId) are required'
      );
    }

    this.config = {
      clientId: credentials.azureClientId,
      clientSecret: credentials.azureClientSecret,
      tenantId: credentials.azureTenantId,
      subscriptionId: credentials.azureSubscriptionId,
    };

    // Initialize Azure credential
    this.credential = new ClientSecretCredential(
      this.config.tenantId,
      this.config.clientId,
      this.config.clientSecret
    );

    // Initialize Monitor clients
    this.monitorClient = new MonitorClient(this.credential, this.config.subscriptionId);
    this.logsClient = new LogsQueryClient(this.credential);

    console.log('[AzureMonitorService] Initialized for subscription:', this.config.subscriptionId);
  }

  /**
   * Gets metrics for a specific Azure resource
   *
   * @param query - Metric query parameters
   * @returns Array of metric results
   *
   * @example
   * ```typescript
   * // Get CPU and memory metrics for a VM
   * const metrics = await monitorService.getMetrics({
   *   resourceId: '/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Compute/virtualMachines/vm1',
   *   metricNames: ['Percentage CPU', 'Available Memory Bytes'],
   *   timespan: {
   *     start: new Date(Date.now() - 3600000),
   *     end: new Date(),
   *   },
   *   aggregation: 'Average',
   *   interval: 'PT5M',
   * });
   * ```
   */
  async getMetrics(query: MetricQuery): Promise<MetricResult[]> {
    try {
      const timespan = `${query.timespan.start.toISOString()}/${query.timespan.end.toISOString()}`;

      const response = await this.monitorClient.metrics.list(query.resourceId, {
        timespan,
        metricnames: query.metricNames.join(','),
        aggregation: query.aggregation || 'Average',
        interval: query.interval,
      });

      const results: MetricResult[] = [];

      if (response.value) {
        for (const metric of response.value) {
          if (metric.timeseries && metric.timeseries.length > 0) {
            const timeseries = metric.timeseries[0];

            const values =
              timeseries.data?.map((dataPoint: MetricValue) => ({
                timestamp: dataPoint.timeStamp,
                value: this.extractMetricValue(dataPoint, query.aggregation || 'Average'),
              })) || [];

            results.push({
              metricName: metric.name?.value || 'Unknown',
              unit: metric.unit || 'Count',
              aggregation: query.aggregation || 'Average',
              timeGrain: query.interval || 'PT1M',
              values,
            });
          }
        }
      }

      console.log(`[AzureMonitorService] Retrieved ${results.length} metric series`);
      return results;
    } catch (error) {
      console.error('[AzureMonitorService] Failed to get metrics:', error);
      throw new Error(
        `Failed to get Azure metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets activity logs for the subscription
   *
   * Activity logs track control plane operations (create, delete, update resources).
   *
   * @param timespan - Time range for logs
   * @param filters - Optional filters
   * @returns Array of activity log entries
   *
   * @example
   * ```typescript
   * // Get all activity logs from last 24 hours
   * const logs = await monitorService.getActivityLogs({
   *   start: new Date(Date.now() - 86400000),
   *   end: new Date(),
   * });
   *
   * // Get only failed operations
   * const failedLogs = await monitorService.getActivityLogs(
   *   { start: new Date(Date.now() - 86400000), end: new Date() },
   *   { status: 'Failed' }
   * );
   * ```
   */
  async getActivityLogs(
    timespan: { start: Date; end: Date },
    filters?: { status?: string; resourceType?: string }
  ): Promise<ActivityLogEntry[]> {
    try {
      const filterParts: string[] = [];

      // Time filter (required)
      filterParts.push(
        `eventTimestamp ge '${timespan.start.toISOString()}' and eventTimestamp le '${timespan.end.toISOString()}'`
      );

      // Status filter
      if (filters?.status) {
        filterParts.push(`status eq '${filters.status}'`);
      }

      // Resource type filter
      if (filters?.resourceType) {
        filterParts.push(`resourceType eq '${filters.resourceType}'`);
      }

      const filter = filterParts.join(' and ');

      const logsIterator = this.monitorClient.activityLogs.list({ filter });
      const logs: ActivityLogEntry[] = [];

      for await (const log of logsIterator) {
        logs.push({
          eventTimestamp: log.eventTimestamp || new Date(),
          level: log.level?.toString() || 'Informational',
          operationName: log.operationName?.value || 'Unknown',
          resourceId: log.resourceId || '',
          resourceType: log.resourceType?.value || 'Unknown',
          status: log.status?.value || 'Unknown',
          subStatus: log.subStatus?.value,
          caller: log.caller,
          description: log.description,
          properties: log.properties || {},
        });
      }

      console.log(`[AzureMonitorService] Retrieved ${logs.length} activity log entries`);
      return logs;
    } catch (error) {
      console.error('[AzureMonitorService] Failed to get activity logs:', error);
      throw new Error(
        `Failed to get Azure activity logs: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets alert rules defined in the subscription
   *
   * @returns Array of alert rules
   *
   * @example
   * ```typescript
   * const rules = await monitorService.getAlertRules();
   * rules.forEach(rule => {
   *   console.log(`${rule.name}: ${rule.enabled ? 'Enabled' : 'Disabled'}`);
   * });
   * ```
   */
  async getAlertRules(): Promise<AlertRule[]> {
    try {
      const rulesIterator = this.monitorClient.activityLogAlerts.listBySubscriptionId();
      const rules: AlertRule[] = [];

      for await (const rule of rulesIterator) {
        rules.push({
          id: rule.id || '',
          name: rule.name || 'Unknown',
          description: rule.description,
          enabled: rule.enabled || false,
          severity: 2, // Activity log alerts don't have severity
          condition: JSON.stringify(rule.condition),
          actions: rule.actions?.actionGroups?.map((ag) => ag.actionGroupId || '') || [],
        });
      }

      console.log(`[AzureMonitorService] Retrieved ${rules.length} alert rules`);
      return rules;
    } catch (error) {
      console.error('[AzureMonitorService] Failed to get alert rules:', error);
      throw new Error(
        `Failed to get Azure alert rules: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets active (fired) alerts
   *
   * @returns Array of triggered alerts
   *
   * @example
   * ```typescript
   * const alerts = await monitorService.getActiveAlerts();
   * console.log(`${alerts.length} active alerts`);
   *
   * alerts.forEach(alert => {
   *   console.log(`${alert.name} - ${alert.severity} - ${alert.description}`);
   * });
   * ```
   */
  async getActiveAlerts(): Promise<TriggeredAlert[]> {
    try {
      const alertsIterator = this.monitorClient.alerts.getAll();
      const alerts: TriggeredAlert[] = [];

      for await (const alert of alertsIterator) {
        // Only include active (not resolved) alerts
        if (alert.properties?.essentials?.monitorCondition === 'Fired') {
          alerts.push({
            id: alert.id || '',
            name: alert.name || 'Unknown',
            severity: this.normalizeSeverity(alert.properties?.essentials?.severity),
            status: this.normalizeAlertStatus(alert.properties?.essentials?.alertState),
            firedDateTime: alert.properties?.essentials?.startDateTime || new Date(),
            resolvedDateTime: alert.properties?.essentials?.lastModifiedDateTime,
            description: alert.properties?.essentials?.description || '',
            affectedResources: alert.properties?.context?.affectedResources || [],
          });
        }
      }

      console.log(`[AzureMonitorService] Retrieved ${alerts.length} active alerts`);
      return alerts;
    } catch (error) {
      console.error('[AzureMonitorService] Failed to get active alerts:', error);
      throw new Error(
        `Failed to get Azure active alerts: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Executes a KQL query against Log Analytics workspace
   *
   * Requires Log Analytics workspace ID.
   *
   * @param workspaceId - Log Analytics workspace ID
   * @param query - KQL query string
   * @param timespan - Time range for query
   * @returns Query result rows
   *
   * @example
   * ```typescript
   * const workspaceId = 'your-workspace-id';
   *
   * // Query failed operations
   * const results = await monitorService.queryLogAnalytics(
   *   workspaceId,
   *   `AzureActivity
   *    | where ActivityStatusValue == "Failed"
   *    | where TimeGenerated > ago(24h)
   *    | summarize count() by ResourceProviderValue`,
   *   { start: new Date(Date.now() - 86400000), end: new Date() }
   * );
   * ```
   */
  async queryLogAnalytics(
    workspaceId: string,
    query: string,
    timespan: { start: Date; end: Date }
  ): Promise<any[]> {
    try {
      const result = await this.logsClient.queryWorkspace(workspaceId, query, {
        duration: {
          start: timespan.start,
          end: timespan.end,
        },
      });

      if (result.status === 'Success' && result.tables.length > 0) {
        const table = result.tables[0];
        const rows: any[] = [];

        for (const row of table.rows) {
          const rowObject: any = {};
          table.columns.forEach((column, index) => {
            rowObject[column.name || `column${index}`] = row[index];
          });
          rows.push(rowObject);
        }

        console.log(`[AzureMonitorService] Log Analytics query returned ${rows.length} rows`);
        return rows;
      }

      return [];
    } catch (error) {
      console.error('[AzureMonitorService] Log Analytics query failed:', error);
      throw new Error(
        `Log Analytics query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Extracts metric value based on aggregation type
   *
   * @private
   */
  private extractMetricValue(dataPoint: MetricValue, aggregation: string): number {
    switch (aggregation) {
      case 'Average':
        return dataPoint.average || 0;
      case 'Minimum':
        return dataPoint.minimum || 0;
      case 'Maximum':
        return dataPoint.maximum || 0;
      case 'Total':
        return dataPoint.total || 0;
      case 'Count':
        return dataPoint.count || 0;
      default:
        return dataPoint.average || 0;
    }
  }

  /**
   * Normalizes alert severity
   *
   * @private
   */
  private normalizeSeverity(severity?: string): 'critical' | 'high' | 'medium' | 'low' {
    if (!severity) return 'low';

    const normalized = severity.toLowerCase();
    switch (normalized) {
      case 'sev0':
      case 'critical':
        return 'critical';
      case 'sev1':
      case 'error':
        return 'high';
      case 'sev2':
      case 'warning':
        return 'medium';
      case 'sev3':
      case 'informational':
      case 'verbose':
        return 'low';
      default:
        return 'low';
    }
  }

  /**
   * Normalizes alert status
   *
   * @private
   */
  private normalizeAlertStatus(status?: string): 'New' | 'Acknowledged' | 'Closed' {
    if (!status) return 'New';

    const normalized = status.toLowerCase();
    switch (normalized) {
      case 'new':
        return 'New';
      case 'acknowledged':
        return 'Acknowledged';
      case 'closed':
        return 'Closed';
      default:
        return 'New';
    }
  }

  /**
   * Sleep utility
   *
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
