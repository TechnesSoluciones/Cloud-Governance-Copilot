/**
 * AWS Cost Explorer Service
 *
 * This service integrates with AWS Cost Explorer API to retrieve cost and usage data.
 * It implements the CloudProvider interface for cost management operations.
 *
 * Features:
 * - Retrieves cost data with daily granularity
 * - Supports filtering by service, region, and tags
 * - Groups costs by service
 * - Provides cost trends with configurable granularity
 * - Implements retry logic with exponential backoff
 * - Handles AWS throttling and rate limiting
 *
 * AWS SDK Reference: @aws-sdk/client-cost-explorer
 */

import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostAndUsageCommandInput,
  GetCostAndUsageCommandOutput,
  ResultByTime,
  Group,
} from '@aws-sdk/client-cost-explorer';

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
 * AWS Cost Explorer specific configuration
 */
interface AWSCostExplorerConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

/**
 * Cost filters for AWS Cost Explorer
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

// ============================================================
// AWS Cost Explorer Service Implementation
// ============================================================

export class AWSCostExplorerService implements CloudProvider {
  readonly name = 'aws' as const;
  private client: CostExplorerClient;
  private config: AWSCostExplorerConfig;

  // Retry configuration with exponential backoff
  private readonly retryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  };

  /**
   * Creates an instance of AWSCostExplorerService
   *
   * @param credentials - Cloud provider credentials containing AWS access keys
   * @throws Error if AWS credentials are missing
   */
  constructor(credentials: CloudProviderCredentials) {
    // Validate required AWS credentials
    if (!credentials.awsAccessKeyId || !credentials.awsSecretAccessKey) {
      throw new Error('AWS credentials (accessKeyId, secretAccessKey) are required');
    }

    this.config = {
      accessKeyId: credentials.awsAccessKeyId,
      secretAccessKey: credentials.awsSecretAccessKey,
      region: credentials.awsRegion || process.env.AWS_REGION || 'us-east-1',
    };

    // Initialize Cost Explorer client
    this.client = new CostExplorerClient({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });

    console.log(`[AWSCostExplorerService] Initialized for region: ${this.config.region}`);
  }

  // ============================================================
  // Credential Validation
  // ============================================================

  /**
   * Validates AWS credentials by making a test API call
   *
   * @returns True if credentials are valid, false otherwise
   */
  async validateCredentials(): Promise<boolean> {
    try {
      // Make a minimal Cost Explorer API call to validate credentials
      // Query last 7 days with minimal data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const input: GetCostAndUsageCommandInput = {
        TimePeriod: {
          Start: this.formatDate(startDate),
          End: this.formatDate(endDate),
        },
        Granularity: 'DAILY',
        Metrics: ['UnblendedCost'],
      };

      const command = new GetCostAndUsageCommand(input);
      await this.client.send(command);

      console.log('[AWSCostExplorerService] Credentials validated successfully');
      return true;
    } catch (error: any) {
      console.error('[AWSCostExplorerService] Credential validation failed:', error.message);

      // Check for specific error codes
      if (error.name === 'UnrecognizedClientException' || error.name === 'InvalidClientTokenId') {
        console.error('[AWSCostExplorerService] Invalid AWS credentials');
      } else if (error.name === 'AccessDeniedException') {
        console.error('[AWSCostExplorerService] Access denied - check IAM permissions for Cost Explorer');
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
   *   { service: 'Amazon EC2', region: 'us-east-1' }
   * );
   */
  async getCosts(dateRange: DateRange, filters?: CostFilters): Promise<CloudCostData[]> {
    return this.retryWithBackoff(async () => {
      console.log('[AWSCostExplorerService] Fetching costs for date range:', {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        filters,
      });

      // Build Cost Explorer API request
      const input: GetCostAndUsageCommandInput = {
        TimePeriod: {
          Start: this.formatDate(dateRange.start),
          End: this.formatDate(dateRange.end),
        },
        Granularity: 'DAILY',
        Metrics: ['UnblendedCost'],
        GroupBy: [
          {
            Type: 'DIMENSION',
            Key: 'SERVICE',
          },
        ],
      };

      // Apply filters if provided
      if (filters) {
        input.Filter = this.buildCostFilter(filters);
      }

      const command = new GetCostAndUsageCommand(input);
      const response = await this.client.send(command);

      // Transform AWS response to normalized format
      const costData = this.transformAWSCostData(response, filters);

      console.log(`[AWSCostExplorerService] Retrieved ${costData.length} cost data points`);
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
      console.log('[AWSCostExplorerService] Fetching costs by service');

      const input: GetCostAndUsageCommandInput = {
        TimePeriod: {
          Start: this.formatDate(dateRange.start),
          End: this.formatDate(dateRange.end),
        },
        Granularity: 'MONTHLY',
        Metrics: ['UnblendedCost'],
        GroupBy: [
          {
            Type: 'DIMENSION',
            Key: 'SERVICE',
          },
        ],
      };

      const command = new GetCostAndUsageCommand(input);
      const response = await this.client.send(command);

      // Aggregate costs by service
      const serviceMap = new Map<string, number>();
      let totalCost = 0;

      response.ResultsByTime?.forEach((result: ResultByTime) => {
        result.Groups?.forEach((group: Group) => {
          const serviceName = group.Keys?.[0] || 'Unknown';
          const cost = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');

          const currentCost = serviceMap.get(serviceName) || 0;
          serviceMap.set(serviceName, currentCost + cost);
          totalCost += cost;
        });
      });

      // Calculate percentages and create result array
      const costsByService: CostByService[] = Array.from(serviceMap.entries())
        .map(([service, cost]) => ({
          service,
          totalCost: cost,
          currency: 'USD', // AWS Cost Explorer returns USD by default
          percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0,
        }))
        .sort((a, b) => b.totalCost - a.totalCost); // Sort by cost descending

      console.log(`[AWSCostExplorerService] Retrieved ${costsByService.length} services with total cost: $${totalCost.toFixed(2)}`);
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
      console.log('[AWSCostExplorerService] Fetching cost trends with granularity:', granularity);

      // Map granularity to AWS Cost Explorer format
      const awsGranularity = this.mapGranularity(granularity);

      const input: GetCostAndUsageCommandInput = {
        TimePeriod: {
          Start: this.formatDate(dateRange.start),
          End: this.formatDate(dateRange.end),
        },
        Granularity: awsGranularity,
        Metrics: ['UnblendedCost'],
      };

      const command = new GetCostAndUsageCommand(input);
      const response = await this.client.send(command);

      // Transform to cost trends
      const trends: CostTrend[] = (response.ResultsByTime || []).map((result: ResultByTime) => {
        const cost = parseFloat(result.Total?.UnblendedCost?.Amount || '0');
        const date = new Date(result.TimePeriod?.Start || '');

        return {
          date,
          totalCost: cost,
          currency: 'USD',
        };
      });

      console.log(`[AWSCostExplorerService] Retrieved ${trends.length} cost trend data points`);
      return trends;
    });
  }

  // ============================================================
  // Asset Discovery Methods (Not Implemented - Stubs)
  // ============================================================

  /**
   * Asset discovery is not implemented in Cost Explorer service
   * Use AWS EC2/RDS/S3 specific services for asset discovery
   *
   * @throws Error indicating method is not implemented
   */
  async discoverAssets(filters?: AssetFilters): Promise<CloudAsset[]> {
    throw new Error(
      'Asset discovery not implemented in Cost Explorer service. ' +
      'Use AWS EC2, RDS, or S3 services for asset discovery.'
    );
  }

  /**
   * Asset details retrieval is not implemented in Cost Explorer service
   *
   * @throws Error indicating method is not implemented
   */
  async getAssetDetails(resourceId: string): Promise<CloudAsset | null> {
    throw new Error(
      'Asset details not implemented in Cost Explorer service. ' +
      'Use AWS EC2, RDS, or S3 services for asset details.'
    );
  }

  // ============================================================
  // Security Scanning Methods (Not Implemented - Stubs)
  // ============================================================

  /**
   * Security scanning is not implemented in Cost Explorer service
   * Use AWS Security Hub or Config for security scanning
   *
   * @throws Error indicating method is not implemented
   */
  async scanForMisconfigurations(filters?: {
    resourceType?: string;
    region?: string;
    severity?: SecuritySeverity[];
  }): Promise<SecurityFinding[]> {
    throw new Error(
      'Security scanning not implemented in Cost Explorer service. ' +
      'Use AWS Security Hub or Config services for security scanning.'
    );
  }

  /**
   * Security findings retrieval is not implemented in Cost Explorer service
   *
   * @throws Error indicating method is not implemented
   */
  async getSecurityFindings(resourceId: string): Promise<SecurityFinding[]> {
    throw new Error(
      'Security findings not implemented in Cost Explorer service. ' +
      'Use AWS Security Hub or Config services for security findings.'
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
   *
   * @param operation - Async operation to retry
   * @param retryCount - Current retry attempt (internal use)
   * @returns Result of the operation
   * @throws Error if max retries exceeded
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      const isRetryable = this.isRetryableError(error);
      const shouldRetry = retryCount < this.retryConfig.maxRetries && isRetryable;

      if (shouldRetry) {
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, retryCount),
          this.retryConfig.maxDelayMs
        );

        console.warn(
          `[AWSCostExplorerService] Retrying operation (attempt ${retryCount + 1}/${this.retryConfig.maxRetries}) after ${delay}ms. Error: ${error.message}`
        );

        // Wait before retrying
        await this.sleep(delay);

        // Retry the operation
        return this.retryWithBackoff(operation, retryCount + 1);
      }

      // Max retries exceeded or non-retryable error
      console.error('[AWSCostExplorerService] Operation failed:', error.message);
      throw error;
    }
  }

  /**
   * Determines if an error is retryable
   *
   * @param error - Error to check
   * @returns True if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Throttling errors
    if (error.name === 'ThrottlingException' || error.$metadata?.httpStatusCode === 429) {
      return true;
    }

    // Rate limiting
    if (error.name === 'TooManyRequestsException') {
      return true;
    }

    // Transient network errors
    if (error.name === 'NetworkingError' || error.code === 'ECONNRESET') {
      return true;
    }

    // Service unavailable
    if (error.$metadata?.httpStatusCode === 503) {
      return true;
    }

    return false;
  }

  /**
   * Transforms AWS Cost Explorer response to normalized CloudCostData format
   *
   * @param response - AWS Cost Explorer API response
   * @param filters - Applied filters (for metadata)
   * @returns Array of normalized cost data
   */
  private transformAWSCostData(
    response: GetCostAndUsageCommandOutput,
    filters?: CostFilters
  ): CloudCostData[] {
    const costData: CloudCostData[] = [];

    response.ResultsByTime?.forEach((result: ResultByTime) => {
      const date = new Date(result.TimePeriod?.Start || '');

      result.Groups?.forEach((group: Group) => {
        const serviceName = group.Keys?.[0] || 'Unknown';
        const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
        const currency = group.Metrics?.UnblendedCost?.Unit || 'USD';

        // Only include entries with non-zero costs
        if (amount > 0) {
          const costEntry: CloudCostData = {
            date,
            service: serviceName,
            amount,
            currency,
            region: filters?.region,
            tags: filters?.tags,
            metadata: {
              awsAccountId: response.DimensionValueAttributes?.[0]?.Attributes?.accountId,
              granularity: 'DAILY',
            },
          };

          costData.push(costEntry);
        }
      });
    });

    return costData;
  }

  /**
   * Builds AWS Cost Explorer filter from provided filters
   *
   * @param filters - Cost filters (service, region, tags)
   * @returns AWS Cost Explorer filter expression
   */
  private buildCostFilter(filters: CostFilters): any {
    const filterExpressions: any[] = [];

    // Filter by service
    if (filters.service) {
      filterExpressions.push({
        Dimensions: {
          Key: 'SERVICE',
          Values: [filters.service],
        },
      });
    }

    // Filter by region
    if (filters.region) {
      filterExpressions.push({
        Dimensions: {
          Key: 'REGION',
          Values: [filters.region],
        },
      });
    }

    // Filter by tags
    if (filters.tags && Object.keys(filters.tags).length > 0) {
      Object.entries(filters.tags).forEach(([key, value]) => {
        filterExpressions.push({
          Tags: {
            Key: key,
            Values: [value],
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
        And: filterExpressions,
      };
    }
  }

  /**
   * Maps granularity parameter to AWS Cost Explorer granularity
   *
   * @param granularity - User-specified granularity
   * @returns AWS Cost Explorer granularity value
   */
  private mapGranularity(granularity: 'daily' | 'weekly' | 'monthly'): 'DAILY' | 'MONTHLY' {
    // Note: AWS Cost Explorer doesn't support WEEKLY directly
    // We use DAILY for weekly and aggregate client-side if needed
    switch (granularity) {
      case 'daily':
      case 'weekly':
        return 'DAILY';
      case 'monthly':
        return 'MONTHLY';
      default:
        return 'DAILY';
    }
  }

  /**
   * Formats a Date object to AWS Cost Explorer date format (YYYY-MM-DD)
   *
   * @param date - Date to format
   * @returns Formatted date string
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
