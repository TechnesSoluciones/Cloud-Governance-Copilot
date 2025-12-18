/**
 * Azure Log Analytics Service
 *
 * Provides advanced log querying capabilities using Kusto Query Language (KQL).
 * Integrates with Azure Monitor Logs (Log Analytics workspaces) to execute
 * custom and pre-built queries for operational insights.
 *
 * Features:
 * - Execute custom KQL queries
 * - Pre-built query templates for common scenarios
 * - Query history tracking and management
 * - Saved queries for reusability
 * - Timespan support (24h, 7d, 30d, custom)
 * - Result pagination and limits
 *
 * @module integrations/azure/log-analytics.service
 */

import { LogsQueryClient, QueryTimeInterval, LogsQueryResult } from '@azure/monitor-query';
import { ClientSecretCredential } from '@azure/identity';
import { PrismaClient } from '@prisma/client';
import type { CloudProviderCredentials } from '../cloud-provider.interface';

/**
 * Azure Log Analytics configuration
 */
interface AzureLogAnalyticsConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  subscriptionId: string;
  workspaceId?: string; // Default workspace ID (optional)
}

/**
 * Timespan options for queries
 */
export type TimespanOption = '24h' | '7d' | '30d' | 'custom';

/**
 * Timespan configuration
 */
export interface Timespan {
  type: TimespanOption;
  start?: Date;
  end?: Date;
}

/**
 * Query result structure
 */
export interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number; // milliseconds
  status: 'success' | 'partial' | 'failed';
  error?: string;
}

/**
 * Saved query structure
 */
export interface SavedQuery {
  id: string;
  tenantId: string;
  accountId: string;
  name: string;
  query: string;
  description?: string;
  createdBy?: string;
  lastExecuted?: Date;
  executionCount: number;
  createdAt: Date;
}

/**
 * Pre-built query names
 */
export type PreBuiltQueryName =
  | 'failed_operations'
  | 'high_cpu_alerts'
  | 'network_errors'
  | 'security_events'
  | 'resource_changes';

/**
 * Query execution options
 */
interface QueryOptions {
  timeout?: number; // seconds (default: 30)
  maxRows?: number; // max rows to return (default: 1000)
}

const DEFAULT_TIMEOUT_SECONDS = 30;
const DEFAULT_MAX_ROWS = 1000;
const MAX_QUERY_LENGTH = 50000; // KQL query max length

/**
 * Pre-built KQL queries for common scenarios
 */
const PRE_BUILT_QUERIES: Record<PreBuiltQueryName, string> = {
  failed_operations: `
AzureActivity
| where TimeGenerated > ago(24h)
| where ActivityStatusValue == "Failure"
| project TimeGenerated, OperationNameValue, ResourceGroup, Caller, ActivityStatusValue, ResourceProviderValue
| order by TimeGenerated desc
| limit 100
  `.trim(),

  high_cpu_alerts: `
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| where CounterValue > 80
| summarize avg(CounterValue) by Computer, bin(TimeGenerated, 5m)
| order by TimeGenerated desc
| limit 100
  `.trim(),

  network_errors: `
AzureDiagnostics
| where Category == "NetworkSecurityGroupEvent"
| where Type == "Block"
| where TimeGenerated > ago(24h)
| project TimeGenerated, Resource, SourceIP = columnifexists('sourceIP_s', ''), DestinationIP = columnifexists('destinationIP_s', ''), DestinationPort = columnifexists('destinationPort_d', 0)
| order by TimeGenerated desc
| limit 100
  `.trim(),

  security_events: `
SecurityEvent
| where TimeGenerated > ago(24h)
| where EventID in (4624, 4625, 4672)
| project TimeGenerated, Computer, Account, EventID, Activity
| order by TimeGenerated desc
| limit 100
  `.trim(),

  resource_changes: `
AzureActivity
| where TimeGenerated > ago(7d)
| where OperationNameValue contains "write" or OperationNameValue contains "delete"
| project TimeGenerated, OperationNameValue, ResourceGroup, Resource, Caller, ActivityStatusValue
| order by TimeGenerated desc
| limit 100
  `.trim(),
};

/**
 * Azure Log Analytics Service
 *
 * @example
 * ```typescript
 * const logAnalyticsService = new AzureLogAnalyticsService({
 *   provider: 'azure',
 *   azureClientId: process.env.AZURE_CLIENT_ID!,
 *   azureClientSecret: process.env.AZURE_CLIENT_SECRET!,
 *   azureTenantId: process.env.AZURE_TENANT_ID!,
 *   azureSubscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
 * });
 *
 * // Execute custom KQL query
 * const result = await logAnalyticsService.executeKQLQuery(
 *   'account-123',
 *   'workspace-id',
 *   'AzureActivity | where TimeGenerated > ago(1h) | summarize count() by ResourceGroup',
 *   { type: '24h' }
 * );
 *
 * // Execute pre-built query
 * const failedOps = await logAnalyticsService.getPreBuiltQuery(
 *   'account-123',
 *   'workspace-id',
 *   'failed_operations'
 * );
 * ```
 */
export class AzureLogAnalyticsService {
  private logsClient: LogsQueryClient;
  private credential: ClientSecretCredential;
  private config: AzureLogAnalyticsConfig;
  private prisma: PrismaClient;

  /**
   * Creates a new Azure Log Analytics Service instance
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

    // Initialize Log Analytics client
    this.logsClient = new LogsQueryClient(this.credential);

    // Initialize Prisma client
    this.prisma = new PrismaClient();

    console.log(
      '[AzureLogAnalyticsService] Initialized for subscription:',
      this.config.subscriptionId
    );
  }

  /**
   * Executes a custom KQL query against Log Analytics workspace
   *
   * @param accountId - Cloud account ID (for tracking)
   * @param workspaceId - Log Analytics workspace ID
   * @param query - KQL query string
   * @param timespan - Time range for query
   * @param options - Optional query execution options
   * @returns Query result with columns and rows
   *
   * @example
   * ```typescript
   * const result = await service.executeKQLQuery(
   *   'account-123',
   *   'workspace-id',
   *   'AzureActivity | where TimeGenerated > ago(24h) | summarize count()',
   *   { type: '24h' }
   * );
   *
   * console.log(`Query returned ${result.rowCount} rows`);
   * result.rows.forEach(row => console.log(row));
   * ```
   */
  async executeKQLQuery(
    accountId: string,
    workspaceId: string,
    query: string,
    timespan: Timespan,
    options?: QueryOptions
  ): Promise<QueryResult> {
    const startTime = Date.now();

    try {
      // Validate query
      this.validateQuery(query);

      // Calculate timespan
      const timespanInterval = this.calculateTimespan(timespan);

      // Set options
      const timeout = (options?.timeout || DEFAULT_TIMEOUT_SECONDS) * 1000;
      const maxRows = options?.maxRows || DEFAULT_MAX_ROWS;

      console.log(
        `[AzureLogAnalyticsService] Executing KQL query on workspace ${workspaceId} (timeout: ${timeout}ms, maxRows: ${maxRows})`
      );

      // Execute query with timeout
      const result = await Promise.race([
        this.logsClient.queryWorkspace(workspaceId, query, {
          duration: timespanInterval as any,
        }),
        this.createTimeoutPromise(timeout),
      ]) as LogsQueryResult;

      // Process result
      if (result.status === 'Success' && result.tables.length > 0) {
        const table = result.tables[0];
        const columns = (table as any).columns.map((col: any) => col.name || '');
        const rows = table.rows.slice(0, maxRows);

        const executionTime = Date.now() - startTime;

        console.log(
          `[AzureLogAnalyticsService] Query successful: ${rows.length} rows, ${executionTime}ms`
        );

        return {
          columns,
          rows,
          rowCount: rows.length,
          executionTime,
          status: 'success',
        };
      } else if (result.status === 'PartialFailure') {
        console.warn('[AzureLogAnalyticsService] Query returned partial results');
        return {
          columns: [],
          rows: [],
          rowCount: 0,
          executionTime: Date.now() - startTime,
          status: 'partial',
          error: 'Query returned partial results',
        };
      }

      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime: Date.now() - startTime,
        status: 'success',
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error('[AzureLogAnalyticsService] Query failed:', errorMessage);

      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime,
        status: 'failed',
        error: errorMessage,
      };
    }
  }

  /**
   * Executes a pre-built KQL query
   *
   * Pre-built queries include:
   * - failed_operations: Failed operations in last 24h
   * - high_cpu_alerts: VMs with CPU > 80%
   * - network_errors: Network security group blocks
   * - security_events: Login events (4624, 4625, 4672)
   * - resource_changes: Resource write/delete operations
   *
   * @param accountId - Cloud account ID (for tracking)
   * @param workspaceId - Log Analytics workspace ID
   * @param queryName - Pre-built query name
   * @param params - Optional query parameters (reserved for future use)
   * @returns Query result
   *
   * @example
   * ```typescript
   * const result = await service.getPreBuiltQuery(
   *   'account-123',
   *   'workspace-id',
   *   'failed_operations'
   * );
   *
   * console.log('Failed operations:', result.rows);
   * ```
   */
  async getPreBuiltQuery(
    accountId: string,
    workspaceId: string,
    queryName: PreBuiltQueryName,
    params?: Record<string, any>
  ): Promise<QueryResult> {
    const query = PRE_BUILT_QUERIES[queryName];

    if (!query) {
      throw new Error(`Unknown pre-built query: ${queryName}`);
    }

    console.log(`[AzureLogAnalyticsService] Executing pre-built query: ${queryName}`);

    // Execute query with default timespan based on query type
    const timespan = this.getDefaultTimespanForQuery(queryName);

    return this.executeKQLQuery(accountId, workspaceId, query, timespan);
  }

  /**
   * Gets query history for an account
   *
   * Returns all saved queries for the specified account, ordered by last execution.
   *
   * @param accountId - Cloud account ID
   * @returns Array of saved queries
   *
   * @example
   * ```typescript
   * const history = await service.getQueryHistory('account-123');
   * history.forEach(q => {
   *   console.log(`${q.name}: executed ${q.executionCount} times`);
   * });
   * ```
   */
  async getQueryHistory(accountId: string): Promise<SavedQuery[]> {
    try {
      const queries = await this.prisma.logAnalyticsQuery.findMany({
        where: { accountId },
        orderBy: { lastExecuted: 'desc' },
      });

      return queries.map((q) => ({
        id: q.id,
        tenantId: q.tenantId,
        accountId: q.accountId,
        name: q.name,
        query: q.query,
        description: q.description || undefined,
        createdBy: q.createdBy || undefined,
        lastExecuted: q.lastExecuted || undefined,
        executionCount: q.executionCount,
        createdAt: q.createdAt,
      }));
    } catch (error) {
      console.error('[AzureLogAnalyticsService] Failed to get query history:', error);
      throw new Error(
        `Failed to get query history: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Saves a query for future reuse
   *
   * @param accountId - Cloud account ID
   * @param tenantId - Tenant ID
   * @param name - Query name
   * @param query - KQL query string
   * @param description - Optional description
   * @param createdBy - User ID who created the query
   * @returns Saved query
   *
   * @example
   * ```typescript
   * const saved = await service.saveQuery(
   *   'account-123',
   *   'tenant-456',
   *   'My Custom Query',
   *   'AzureActivity | summarize count() by ResourceGroup',
   *   'Count resources by resource group',
   *   'user-789'
   * );
   *
   * console.log(`Query saved with ID: ${saved.id}`);
   * ```
   */
  async saveQuery(
    accountId: string,
    tenantId: string,
    name: string,
    query: string,
    description?: string,
    createdBy?: string
  ): Promise<SavedQuery> {
    try {
      // Validate query
      this.validateQuery(query);

      // Check if query with same name exists
      const existing = await this.prisma.logAnalyticsQuery.findFirst({
        where: {
          tenantId,
          accountId,
          name,
        },
      });

      if (existing) {
        throw new Error(`Query with name "${name}" already exists for this account`);
      }

      // Save query
      const savedQuery = await this.prisma.logAnalyticsQuery.create({
        data: {
          tenantId,
          accountId,
          name,
          query,
          description,
          createdBy,
          executionCount: 0,
        },
      });

      console.log(`[AzureLogAnalyticsService] Saved query: ${name} (ID: ${savedQuery.id})`);

      return {
        id: savedQuery.id,
        tenantId: savedQuery.tenantId,
        accountId: savedQuery.accountId,
        name: savedQuery.name,
        query: savedQuery.query,
        description: savedQuery.description || undefined,
        createdBy: savedQuery.createdBy || undefined,
        lastExecuted: savedQuery.lastExecuted || undefined,
        executionCount: savedQuery.executionCount,
        createdAt: savedQuery.createdAt,
      };
    } catch (error) {
      console.error('[AzureLogAnalyticsService] Failed to save query:', error);
      throw error;
    }
  }

  /**
   * Updates execution statistics for a saved query
   *
   * @param queryId - Saved query ID
   * @private
   */
  async updateQueryExecution(queryId: string): Promise<void> {
    try {
      await this.prisma.logAnalyticsQuery.update({
        where: { id: queryId },
        data: {
          lastExecuted: new Date(),
          executionCount: {
            increment: 1,
          },
        },
      });
    } catch (error) {
      console.error('[AzureLogAnalyticsService] Failed to update query execution:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Deletes a saved query
   *
   * @param queryId - Saved query ID
   * @param tenantId - Tenant ID (for authorization)
   */
  async deleteQuery(queryId: string, tenantId: string): Promise<void> {
    try {
      await this.prisma.logAnalyticsQuery.delete({
        where: {
          id: queryId,
          tenantId,
        },
      });

      console.log(`[AzureLogAnalyticsService] Deleted query: ${queryId}`);
    } catch (error) {
      console.error('[AzureLogAnalyticsService] Failed to delete query:', error);
      throw new Error(
        `Failed to delete query: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Validates a KQL query
   *
   * @param query - KQL query string
   * @throws {Error} If query is invalid
   * @private
   */
  private validateQuery(query: string): void {
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    if (query.length > MAX_QUERY_LENGTH) {
      throw new Error(`Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters`);
    }

    // Basic KQL validation
    const trimmed = query.trim().toLowerCase();

    // Dangerous commands check
    const dangerousCommands = ['.drop', '.delete', '.create', '.alter', '.set'];
    if (dangerousCommands.some((cmd) => trimmed.includes(cmd))) {
      throw new Error('Query contains potentially dangerous commands');
    }
  }

  /**
   * Calculates timespan interval from Timespan object
   *
   * @param timespan - Timespan configuration
   * @returns QueryTimeInterval
   * @private
   */
  private calculateTimespan(timespan: Timespan): QueryTimeInterval {
    if (timespan.type === 'custom') {
      if (!timespan.start || !timespan.end) {
        throw new Error('Custom timespan requires start and end dates');
      }
      return { start: timespan.start, end: timespan.end } as any;
    }

    const end = new Date();
    let start = new Date();

    switch (timespan.type) {
      case '24h':
        start = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    return { start, end } as any;
  }

  /**
   * Gets default timespan for a pre-built query
   *
   * @param queryName - Pre-built query name
   * @returns Timespan
   * @private
   */
  private getDefaultTimespanForQuery(queryName: PreBuiltQueryName): Timespan {
    switch (queryName) {
      case 'failed_operations':
      case 'network_errors':
      case 'security_events':
        return { type: '24h' };
      case 'high_cpu_alerts':
        return { type: '24h' };
      case 'resource_changes':
        return { type: '7d' };
      default:
        return { type: '24h' };
    }
  }

  /**
   * Creates a timeout promise that rejects after specified milliseconds
   *
   * @param ms - Milliseconds to wait
   * @returns Promise that rejects on timeout
   * @private
   */
  private createTimeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Query timeout after ${ms}ms`)), ms);
    });
  }

  /**
   * Cleanup resources
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
