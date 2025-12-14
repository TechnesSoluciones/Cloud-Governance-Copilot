/**
 * Azure Cost Management Service
 *
 * This service integrates with Azure Cost Management API to retrieve cost and usage data.
 * It implements the CloudProvider interface for cost management operations.
 *
 * Features:
 * - Retrieves cost data with daily granularity
 * - Supports filtering by service, region, and tags
 * - Groups costs by service (Azure Meter Category)
 * - Provides cost trends with configurable granularity
 * - Implements retry logic with exponential backoff
 * - Handles Azure throttling and rate limiting
 *
 * Azure SDK Reference: @azure/arm-costmanagement, @azure/identity
 */

import { CostManagementClient } from '@azure/arm-costmanagement';
import { ClientSecretCredential } from '@azure/identity';
import type {
  QueryResult,
  QueryDefinition,
  QueryDataset,
  QueryAggregation,
  QueryGrouping,
  QueryTimePeriod,
} from '@azure/arm-costmanagement';

import type {
  CloudProvider,
  CloudCostData,
  CostByService,
  CostTrend,
  DateRange,
  CloudProviderCredentials,
  CloudAsset,
  SecurityFinding,
  AssetFilters,
  SecuritySeverity,
  ResourceTags,
} from '../cloud-provider.interface';

// ============================================================
// Types and Interfaces
// ============================================================

/**
 * Azure Cost Management specific configuration
 */
interface AzureCostManagementConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  subscriptionId: string;
}

/**
 * Cost filters for Azure Cost Management
 */
interface CostFilters {
  service?: string;
  region?: string;
  tags?: ResourceTags;
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Azure Cost Management query row structure
 */
interface AzureCostRow {
  [key: number]: string | number; // Columns are indexed by number
}

// ============================================================
// Constants
// ============================================================

const DEFAULT_CURRENCY = 'USD';
const RETRY_MAX_RETRIES = 3;
const RETRY_INITIAL_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 10000;
const RETRY_BACKOFF_MULTIPLIER = 2;
const CREDENTIAL_VALIDATION_DAYS = 7;

// HTTP Status codes for retry logic
const HTTP_STATUS_TOO_MANY_REQUESTS = 429;
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;
const HTTP_STATUS_SERVICE_UNAVAILABLE = 503;
const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_FORBIDDEN = 403;

// ============================================================
// Azure Cost Management Service Implementation
// ============================================================

export class AzureCostManagementService implements CloudProvider {
  readonly name = 'azure' as const;
  private client: CostManagementClient;
  private credential: ClientSecretCredential;
  private config: AzureCostManagementConfig;

  // Retry configuration with exponential backoff
  private readonly retryConfig: RetryConfig = {
    maxRetries: RETRY_MAX_RETRIES,
    initialDelayMs: RETRY_INITIAL_DELAY_MS,
    maxDelayMs: RETRY_MAX_DELAY_MS,
    backoffMultiplier: RETRY_BACKOFF_MULTIPLIER,
  };

  /**
   * Creates an instance of AzureCostManagementService
   *
   * @param credentials - Cloud provider credentials containing Azure Service Principal details
   * @throws Error if Azure credentials are missing
   */
  constructor(credentials: CloudProviderCredentials) {
    // Validate required Azure credentials
    if (
      !credentials.azureClientId ||
      !credentials.azureClientSecret ||
      !credentials.azureTenantId ||
      !credentials.azureSubscriptionId
    ) {
      throw new Error(
        'Azure credentials (clientId, clientSecret, tenantId, subscriptionId) are required'
      );
    }

    this.config = {
      clientId: credentials.azureClientId,
      clientSecret: credentials.azureClientSecret,
      tenantId: credentials.azureTenantId,
      subscriptionId: credentials.azureSubscriptionId,
    };

    // Initialize Azure credential with Service Principal
    this.credential = new ClientSecretCredential(
      this.config.tenantId,
      this.config.clientId,
      this.config.clientSecret
    );

    // Initialize Cost Management client
    this.client = new CostManagementClient(this.credential);

    console.log(
      `[AzureCostManagementService] Initialized for subscription: ${this.config.subscriptionId}`
    );
  }

  // ============================================================
  // Credential Validation
  // ============================================================

  /**
   * Validates Azure credentials by making a test API call
   *
   * @returns True if credentials are valid, false otherwise
   */
  async validateCredentials(): Promise<boolean> {
    try {
      // Make a minimal Cost Management API call to validate credentials
      // Query last 7 days with minimal data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - CREDENTIAL_VALIDATION_DAYS);

      const scope = `/subscriptions/${this.config.subscriptionId}`;

      const queryDefinition: QueryDefinition = {
        type: 'Usage',
        timeframe: 'Custom',
        timePeriod: {
          from: startDate,
          to: endDate,
        },
        dataset: {
          granularity: 'Daily',
          aggregation: {
            totalCost: {
              name: 'Cost',
              function: 'Sum',
            },
          },
        },
      };

      await this.client.query.usage(scope, queryDefinition);

      console.log('[AzureCostManagementService] Credentials validated successfully');
      return true;
    } catch (error: any) {
      console.error('[AzureCostManagementService] Credential validation failed:', error.message);

      // Check for specific error codes
      if (error.statusCode === HTTP_STATUS_UNAUTHORIZED) {
        console.error('[AzureCostManagementService] Unauthorized - Invalid Azure credentials');
      } else if (error.statusCode === HTTP_STATUS_FORBIDDEN) {
        console.error(
          '[AzureCostManagementService] Access denied - check Service Principal permissions for Cost Management'
        );
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error('[AzureCostManagementService] Network error - check connectivity to Azure');
      }

      return false;
    }
  }

  // ============================================================
  // Cost Management Methods
  // ============================================================

  /**
   * Retrieves cost data for a specified date range with optional filters
   *
   * @param dateRange - Start and end dates for the cost query
   * @param filters - Optional filters for service, region, and tags
   * @returns Array of normalized cloud cost data
   *
   * @example
   * const costs = await service.getCosts(
   *   { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
   *   { service: 'Virtual Machines', region: 'eastus' }
   * );
   */
  async getCosts(dateRange: DateRange, filters?: CostFilters): Promise<CloudCostData[]> {
    return this.retryWithBackoff(async () => {
      console.log('[AzureCostManagementService] Fetching costs for date range:', {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        filters,
      });

      const scope = `/subscriptions/${this.config.subscriptionId}`;

      // Build query dataset with grouping by service and resource group
      const dataset: QueryDataset = {
        granularity: 'Daily',
        aggregation: {
          totalCost: {
            name: 'Cost',
            function: 'Sum',
          },
        },
        grouping: [
          {
            type: 'Dimension',
            name: 'MeterCategory', // Service name in Azure
          },
          {
            type: 'Dimension',
            name: 'ResourceGroup',
          },
        ],
      };

      // Apply filters if provided
      if (filters) {
        dataset.filter = this.buildCostFilter(filters);
      }

      const queryDefinition: QueryDefinition = {
        type: 'Usage',
        timeframe: 'Custom',
        timePeriod: {
          from: dateRange.start,
          to: dateRange.end,
        },
        dataset,
      };

      const response = await this.client.query.usage(scope, queryDefinition);

      // Transform Azure response to normalized format
      const costData = this.transformAzureCostData(response, filters);

      console.log(`[AzureCostManagementService] Retrieved ${costData.length} cost data points`);
      return costData;
    });
  }

  /**
   * Retrieves cost breakdown grouped by service
   *
   * @param dateRange - Start and end dates for the cost query
   * @returns Array of costs grouped by service with totals and percentages
   *
   * @example
   * const costsByService = await service.getCostsByService({
   *   start: new Date('2024-01-01'),
   *   end: new Date('2024-01-31')
   * });
   */
  async getCostsByService(dateRange: DateRange): Promise<CostByService[]> {
    return this.retryWithBackoff(async () => {
      console.log('[AzureCostManagementService] Fetching costs by service');

      const scope = `/subscriptions/${this.config.subscriptionId}`;

      const queryDefinition: QueryDefinition = {
        type: 'Usage',
        timeframe: 'Custom',
        timePeriod: {
          from: dateRange.start,
          to: dateRange.end,
        },
        dataset: {
          granularity: 'None', // No time granularity, aggregate all
          aggregation: {
            totalCost: {
              name: 'Cost',
              function: 'Sum',
            },
          },
          grouping: [
            {
              type: 'Dimension',
              name: 'MeterCategory', // Service name
            },
          ],
        },
      };

      const response = await this.client.query.usage(scope, queryDefinition);

      // Aggregate costs by service
      const serviceMap = new Map<string, number>();
      let totalCost = 0;

      // Azure returns data in columns and rows format
      if (response.rows && response.columns) {
        const costColumnIndex = this.findColumnIndex(response.columns, 'Cost');
        const serviceColumnIndex = this.findColumnIndex(response.columns, 'MeterCategory');

        if (costColumnIndex !== -1 && serviceColumnIndex !== -1) {
          response.rows.forEach((row: AzureCostRow) => {
            const serviceName = String(row[serviceColumnIndex] || 'Unknown');
            const cost = parseFloat(String(row[costColumnIndex] || '0'));

            const currentCost = serviceMap.get(serviceName) || 0;
            serviceMap.set(serviceName, currentCost + cost);
            totalCost += cost;
          });
        }
      }

      // Calculate percentages and create result array
      const costsByService: CostByService[] = Array.from(serviceMap.entries())
        .map(([service, cost]) => ({
          service,
          totalCost: cost,
          currency: DEFAULT_CURRENCY,
          percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0,
        }))
        .sort((a, b) => b.totalCost - a.totalCost); // Sort by cost descending

      console.log(
        `[AzureCostManagementService] Retrieved ${costsByService.length} services with total cost: $${totalCost.toFixed(2)}`
      );
      return costsByService;
    });
  }

  /**
   * Retrieves cost trends over time with configurable granularity
   *
   * @param dateRange - Start and end dates for the cost query
   * @param granularity - Time granularity: 'daily', 'weekly', or 'monthly'
   * @returns Array of cost trends over time
   *
   * @example
   * const trends = await service.getCostTrends(
   *   { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
   *   'monthly'
   * );
   */
  async getCostTrends(
    dateRange: DateRange,
    granularity: 'daily' | 'weekly' | 'monthly'
  ): Promise<CostTrend[]> {
    return this.retryWithBackoff(async () => {
      console.log('[AzureCostManagementService] Fetching cost trends with granularity:', granularity);

      const scope = `/subscriptions/${this.config.subscriptionId}`;

      // Map granularity to Azure Cost Management format
      const azureGranularity = this.mapGranularity(granularity);

      const queryDefinition: QueryDefinition = {
        type: 'Usage',
        timeframe: 'Custom',
        timePeriod: {
          from: dateRange.start,
          to: dateRange.end,
        },
        dataset: {
          granularity: azureGranularity,
          aggregation: {
            totalCost: {
              name: 'Cost',
              function: 'Sum',
            },
          },
        },
      };

      const response = await this.client.query.usage(scope, queryDefinition);

      // Transform to cost trends
      const trends: CostTrend[] = [];

      if (response.rows && response.columns) {
        const costColumnIndex = this.findColumnIndex(response.columns, 'Cost');
        const dateColumnIndex = this.findColumnIndex(response.columns, 'UsageDate');

        if (costColumnIndex !== -1 && dateColumnIndex !== -1) {
          response.rows.forEach((row: AzureCostRow) => {
            const cost = parseFloat(String(row[costColumnIndex] || '0'));
            const dateValue = row[dateColumnIndex];
            const date = typeof dateValue === 'number' ? new Date(dateValue) : new Date(String(dateValue));

            trends.push({
              date,
              totalCost: cost,
              currency: DEFAULT_CURRENCY,
            });
          });
        }
      }

      console.log(`[AzureCostManagementService] Retrieved ${trends.length} cost trend data points`);
      return trends;
    });
  }

  // ============================================================
  // Asset Discovery Methods (Not Implemented - Stubs)
  // ============================================================

  /**
   * Asset discovery is not implemented in Cost Management service
   * Use Azure Resource Graph or specific resource services for asset discovery
   *
   * @throws Error indicating method is not implemented
   */
  async discoverAssets(filters?: AssetFilters): Promise<CloudAsset[]> {
    throw new Error(
      'Asset discovery not implemented in Cost Management service. ' +
        'Use Azure Resource Graph or specific resource services for asset discovery.'
    );
  }

  /**
   * Asset details retrieval is not implemented in Cost Management service
   *
   * @throws Error indicating method is not implemented
   */
  async getAssetDetails(resourceId: string): Promise<CloudAsset | null> {
    throw new Error(
      'Asset details not implemented in Cost Management service. ' +
        'Use Azure Resource Graph or specific resource services for asset details.'
    );
  }

  // ============================================================
  // Security Scanning Methods (Not Implemented - Stubs)
  // ============================================================

  /**
   * Security scanning is not implemented in Cost Management service
   * Use Azure Security Center or Azure Policy for security scanning
   *
   * @throws Error indicating method is not implemented
   */
  async scanForMisconfigurations(filters?: {
    resourceType?: string;
    region?: string;
    severity?: SecuritySeverity[];
  }): Promise<SecurityFinding[]> {
    throw new Error(
      'Security scanning not implemented in Cost Management service. ' +
        'Use Azure Security Center or Azure Policy for security scanning.'
    );
  }

  /**
   * Security findings retrieval is not implemented in Cost Management service
   *
   * @throws Error indicating method is not implemented
   */
  async getSecurityFindings(resourceId: string): Promise<SecurityFinding[]> {
    throw new Error(
      'Security findings not implemented in Cost Management service. ' +
        'Use Azure Security Center or Azure Policy for security findings.'
    );
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Implements retry logic with exponential backoff
   *
   * Handles:
   * - Throttling errors (429)
   * - Transient network errors
   * - Rate limiting
   * - Internal server errors (500, 503)
   *
   * @param operation - Async operation to retry
   * @param retryCount - Current retry attempt (internal use)
   * @returns Result of the operation
   * @throws Error if max retries exceeded or non-retryable error
   */
  private async retryWithBackoff<T>(operation: () => Promise<T>, retryCount = 0): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      const isRetryable = this.isRetryableError(error);
      const shouldRetry = retryCount < this.retryConfig.maxRetries && isRetryable;

      if (shouldRetry) {
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.initialDelayMs *
            Math.pow(this.retryConfig.backoffMultiplier, retryCount),
          this.retryConfig.maxDelayMs
        );

        console.warn(
          `[AzureCostManagementService] Retrying operation (attempt ${retryCount + 1}/${this.retryConfig.maxRetries}) after ${delay}ms. Error: ${error.message}`
        );

        // Wait before retrying
        await this.sleep(delay);

        // Retry the operation
        return this.retryWithBackoff(operation, retryCount + 1);
      }

      // Max retries exceeded or non-retryable error
      console.error('[AzureCostManagementService] Operation failed:', error.message);
      throw error;
    }
  }

  /**
   * Determines if an error is retryable
   *
   * Retryable errors:
   * - 429 Too Many Requests (rate limiting)
   * - 500 Internal Server Error
   * - 503 Service Unavailable
   * - Network errors (ECONNRESET, ETIMEDOUT)
   *
   * Non-retryable errors:
   * - 401 Unauthorized (invalid credentials)
   * - 403 Forbidden (insufficient permissions)
   * - 400 Bad Request (invalid query)
   *
   * @param error - Error to check
   * @returns True if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Check HTTP status code
    const statusCode = error.statusCode || error.$metadata?.httpStatusCode;

    // Throttling / rate limiting
    if (statusCode === HTTP_STATUS_TOO_MANY_REQUESTS) {
      return true;
    }

    // Server errors
    if (
      statusCode === HTTP_STATUS_INTERNAL_SERVER_ERROR ||
      statusCode === HTTP_STATUS_SERVICE_UNAVAILABLE
    ) {
      return true;
    }

    // Authentication errors - DO NOT RETRY
    if (statusCode === HTTP_STATUS_UNAUTHORIZED || statusCode === HTTP_STATUS_FORBIDDEN) {
      return false;
    }

    // Transient network errors
    if (
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.name === 'NetworkingError'
    ) {
      return true;
    }

    // Azure-specific throttling errors
    if (error.code === 'TooManyRequests' || error.name === 'TooManyRequestsException') {
      return true;
    }

    return false;
  }

  /**
   * Transforms Azure Cost Management response to normalized CloudCostData format
   *
   * Azure returns data in a tabular format with columns and rows.
   * We need to map column names to indices and extract data accordingly.
   *
   * @param response - Azure Cost Management API response
   * @param filters - Applied filters (for metadata)
   * @returns Array of normalized cost data
   */
  private transformAzureCostData(response: QueryResult, filters?: CostFilters): CloudCostData[] {
    const costData: CloudCostData[] = [];

    if (!response.rows || !response.columns) {
      console.warn('[AzureCostManagementService] No data returned from Azure Cost Management API');
      return costData;
    }

    // Find column indices
    const costColumnIndex = this.findColumnIndex(response.columns, 'Cost');
    const serviceColumnIndex = this.findColumnIndex(response.columns, 'MeterCategory');
    const resourceGroupColumnIndex = this.findColumnIndex(response.columns, 'ResourceGroup');
    const dateColumnIndex = this.findColumnIndex(response.columns, 'UsageDate');
    const regionColumnIndex = this.findColumnIndex(response.columns, 'ResourceLocation');

    // Validate required columns exist
    if (costColumnIndex === -1 || serviceColumnIndex === -1 || dateColumnIndex === -1) {
      console.error('[AzureCostManagementService] Required columns not found in Azure response');
      return costData;
    }

    // Transform each row
    response.rows.forEach((row: AzureCostRow) => {
      const amount = parseFloat(String(row[costColumnIndex] || '0'));
      const serviceName = String(row[serviceColumnIndex] || 'Unknown');
      const dateValue = row[dateColumnIndex];
      const date = typeof dateValue === 'number' ? new Date(dateValue) : new Date(String(dateValue));

      // Only include entries with non-zero costs
      if (amount > 0) {
        const costEntry: CloudCostData = {
          date,
          service: serviceName,
          amount,
          currency: DEFAULT_CURRENCY,
          region: regionColumnIndex !== -1 ? String(row[regionColumnIndex]) : filters?.region,
          tags: filters?.tags,
          metadata: {
            subscriptionId: this.config.subscriptionId,
            resourceGroup:
              resourceGroupColumnIndex !== -1 ? String(row[resourceGroupColumnIndex]) : undefined,
            granularity: 'Daily',
          },
        };

        costData.push(costEntry);
      }
    });

    return costData;
  }

  /**
   * Builds Azure Cost Management filter from provided filters
   *
   * @param filters - Cost filters (service, region, tags)
   * @returns Azure Cost Management filter expression
   */
  private buildCostFilter(filters: CostFilters): any {
    const filterExpressions: any[] = [];

    // Filter by service (MeterCategory in Azure)
    if (filters.service) {
      filterExpressions.push({
        dimensions: {
          name: 'MeterCategory',
          operator: 'In',
          values: [filters.service],
        },
      });
    }

    // Filter by region (ResourceLocation in Azure)
    if (filters.region) {
      filterExpressions.push({
        dimensions: {
          name: 'ResourceLocation',
          operator: 'In',
          values: [filters.region],
        },
      });
    }

    // Filter by tags
    if (filters.tags && Object.keys(filters.tags).length > 0) {
      Object.entries(filters.tags).forEach(([key, value]) => {
        filterExpressions.push({
          tags: {
            name: key,
            operator: 'In',
            values: [value],
          },
        });
      });
    }

    // Combine filters with AND logic
    if (filterExpressions.length === 0) {
      return undefined;
    } else if (filterExpressions.length === 1) {
      return filterExpressions[0];
    } else {
      return {
        and: filterExpressions,
      };
    }
  }

  /**
   * Maps granularity parameter to Azure Cost Management granularity
   *
   * @param granularity - User-specified granularity
   * @returns Azure Cost Management granularity value
   */
  private mapGranularity(granularity: 'daily' | 'weekly' | 'monthly'): 'Daily' | 'Monthly' {
    // Note: Azure Cost Management doesn't support Weekly directly
    // We use Daily for weekly and aggregate client-side if needed
    switch (granularity) {
      case 'daily':
      case 'weekly':
        return 'Daily';
      case 'monthly':
        return 'Monthly';
      default:
        return 'Daily';
    }
  }

  /**
   * Finds the index of a column by name in Azure response columns
   *
   * @param columns - Array of column definitions from Azure response
   * @param columnName - Name of the column to find
   * @returns Column index, or -1 if not found
   */
  private findColumnIndex(
    columns: Array<{ name?: string; type?: string }>,
    columnName: string
  ): number {
    return columns.findIndex((col) => col.name === columnName);
  }

  /**
   * Sleep utility for retry delays
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
