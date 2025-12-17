/**
 * Azure Resource Graph Service
 *
 * Provides powerful querying capabilities across Azure resources using KQL (Kusto Query Language).
 * This is the recommended way to query Azure resources at scale.
 *
 * Features:
 * - Cross-subscription queries
 * - KQL-powered filtering and aggregation
 * - Near real-time data (5-10 min lag)
 * - High query limits (15 queries per 5 seconds)
 *
 * @module integrations/azure/resource-graph.service
 */

import { ResourceGraphClient } from '@azure/arm-resourcegraph';
import { ClientSecretCredential } from '@azure/identity';
import type { CloudProviderCredentials } from '../cloud-provider.interface';

// Types from @azure/arm-resourcegraph (may vary by version)
type Column = any;
type Table = any;

/**
 * Azure Resource Graph configuration
 */
interface ResourceGraphConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  subscriptions: string[]; // Can query multiple subscriptions
}

/**
 * Query result row (array of values matching column order)
 */
export type ResourceGraphRow = Array<string | number | boolean | null | object>;

/**
 * Structured query result
 */
export interface ResourceGraphResult {
  columns: Column[];
  rows: ResourceGraphRow[];
  totalRecords: number;
  count: number;
  resultTruncated: string;
  skipToken?: string;
}

/**
 * Rate limit configuration for Resource Graph API
 */
interface RateLimitConfig {
  maxQueriesPerWindow: number; // 15 queries
  windowSizeMs: number; // 5 seconds
}

const RATE_LIMIT_MAX_QUERIES = 15;
const RATE_LIMIT_WINDOW_MS = 5000; // 5 seconds
const MAX_QUERY_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

/**
 * Azure Resource Graph Service
 *
 * @example
 * ```typescript
 * const service = new AzureResourceGraphService({
 *   provider: 'azure',
 *   azureClientId: process.env.AZURE_CLIENT_ID!,
 *   azureClientSecret: process.env.AZURE_CLIENT_SECRET!,
 *   azureTenantId: process.env.AZURE_TENANT_ID!,
 *   azureSubscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
 * });
 *
 * // Query all VMs
 * const vms = await service.query(`
 *   Resources
 *   | where type == "microsoft.compute/virtualmachines"
 *   | project name, location, properties.hardwareProfile.vmSize
 * `);
 *
 * // Query with pagination
 * const result = await service.queryWithPagination(
 *   'Resources | where type =~ "microsoft.storage/storageaccounts"',
 *   1000
 * );
 * ```
 */
export class AzureResourceGraphService {
  private client: ResourceGraphClient;
  private credential: ClientSecretCredential;
  private config: ResourceGraphConfig;
  private queryTimestamps: number[] = [];
  private readonly rateLimitConfig: RateLimitConfig = {
    maxQueriesPerWindow: RATE_LIMIT_MAX_QUERIES,
    windowSizeMs: RATE_LIMIT_WINDOW_MS,
  };

  /**
   * Creates a new Azure Resource Graph Service instance
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
      subscriptions: [credentials.azureSubscriptionId],
    };

    // Initialize Azure credential
    this.credential = new ClientSecretCredential(
      this.config.tenantId,
      this.config.clientId,
      this.config.clientSecret
    );

    // Initialize Resource Graph Client
    this.client = new ResourceGraphClient(this.credential);

    console.log('[AzureResourceGraphService] Initialized for subscriptions:', this.config.subscriptions);
  }

  /**
   * Executes a KQL query against Azure Resource Graph
   *
   * @param query - KQL query string
   * @param subscriptions - Optional subscription IDs (defaults to configured subscriptions)
   * @returns Query result with columns and rows
   *
   * @example
   * ```typescript
   * // Query all VMs with their sizes
   * const result = await service.query(`
   *   Resources
   *   | where type == "microsoft.compute/virtualmachines"
   *   | project name, location, vmSize = properties.hardwareProfile.vmSize
   *   | order by name asc
   * `);
   *
   * console.log('Columns:', result.columns.map(c => c.name));
   * result.rows.forEach(row => {
   *   console.log(row); // [name, location, vmSize]
   * });
   * ```
   */
  async query(
    query: string,
    subscriptions?: string[]
  ): Promise<ResourceGraphResult> {
    await this.enforceRateLimit();

    const queryRequest: QueryRequest = {
      query,
      subscriptions: subscriptions || this.config.subscriptions,
    };

    try {
      const response = await this.executeWithRetry(() =>
        this.client.resources(queryRequest)
      );

      return this.parseQueryResponse(response);
    } catch (error) {
      console.error('[AzureResourceGraphService] Query failed:', error);
      throw new Error(
        `Resource Graph query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Executes a query with automatic pagination
   *
   * Resource Graph limits results to 1000 rows by default.
   * This method handles pagination automatically using skipToken.
   *
   * @param query - KQL query string
   * @param maxRecords - Maximum total records to fetch (default: 10000)
   * @param subscriptions - Optional subscription IDs
   * @returns Complete query result across all pages
   *
   * @example
   * ```typescript
   * // Fetch all storage accounts (handles pagination automatically)
   * const result = await service.queryWithPagination(`
   *   Resources
   *   | where type =~ "microsoft.storage/storageaccounts"
   *   | project id, name, location
   * `);
   * ```
   */
  async queryWithPagination(
    query: string,
    maxRecords: number = 10000,
    subscriptions?: string[]
  ): Promise<ResourceGraphResult> {
    let allRows: ResourceGraphRow[] = [];
    let columns: Column[] = [];
    let skipToken: string | undefined;
    let totalFetched = 0;

    do {
      await this.enforceRateLimit();

      const queryRequest: QueryRequest = {
        query,
        subscriptions: subscriptions || this.config.subscriptions,
        options: {
          skipToken,
          top: Math.min(1000, maxRecords - totalFetched), // Max 1000 per request
        },
      };

      try {
        const response = await this.executeWithRetry(() =>
          this.client.resources(queryRequest)
        );

        const result = this.parseQueryResponse(response);

        // Store columns from first page
        if (allRows.length === 0) {
          columns = result.columns;
        }

        allRows = allRows.concat(result.rows);
        totalFetched += result.count;
        skipToken = result.skipToken;

        console.log(
          `[AzureResourceGraphService] Fetched ${totalFetched} records (skipToken: ${skipToken ? 'yes' : 'no'})`
        );

        // Stop if we've reached max records
        if (totalFetched >= maxRecords) {
          break;
        }
      } catch (error) {
        console.error('[AzureResourceGraphService] Pagination query failed:', error);
        throw error;
      }
    } while (skipToken);

    return {
      columns,
      rows: allRows,
      totalRecords: allRows.length,
      count: allRows.length,
      resultTruncated: skipToken ? 'true' : 'false',
      skipToken,
    };
  }

  /**
   * Pre-built query: Get all Virtual Machines
   *
   * @param subscriptions - Optional subscription IDs
   * @returns VM details including size, location, and power state
   */
  async getAllVirtualMachines(subscriptions?: string[]): Promise<ResourceGraphResult> {
    const query = `
      Resources
      | where type == "microsoft.compute/virtualmachines"
      | extend powerState = properties.extended.instanceView.powerState.code
      | project
          id,
          name,
          type,
          location,
          resourceGroup,
          subscriptionId,
          vmSize = properties.hardwareProfile.vmSize,
          osType = properties.storageProfile.osDisk.osType,
          powerState,
          tags
      | order by name asc
    `;

    return this.query(query, subscriptions);
  }

  /**
   * Pre-built query: Get resource count by type
   *
   * @param subscriptions - Optional subscription IDs
   * @returns Resource counts grouped by type
   */
  async getResourceCountByType(subscriptions?: string[]): Promise<ResourceGraphResult> {
    const query = `
      Resources
      | summarize count() by type
      | order by count_ desc
    `;

    return this.query(query, subscriptions);
  }

  /**
   * Pre-built query: Get resource count by location
   *
   * @param subscriptions - Optional subscription IDs
   * @returns Resource counts grouped by location (region)
   */
  async getResourceCountByLocation(subscriptions?: string[]): Promise<ResourceGraphResult> {
    const query = `
      Resources
      | summarize count() by location
      | order by count_ desc
    `;

    return this.query(query, subscriptions);
  }

  /**
   * Pre-built query: Get resources by tag
   *
   * @param tagKey - Tag key to filter by
   * @param tagValue - Tag value to filter by
   * @param subscriptions - Optional subscription IDs
   * @returns Resources matching the tag filter
   */
  async getResourcesByTag(
    tagKey: string,
    tagValue: string,
    subscriptions?: string[]
  ): Promise<ResourceGraphResult> {
    const query = `
      Resources
      | where tags["${tagKey}"] == "${tagValue}"
      | project id, name, type, location, resourceGroup, tags
      | order by name asc
    `;

    return this.query(query, subscriptions);
  }

  /**
   * Pre-built query: Get orphaned resources (no tags, stopped/deallocated)
   *
   * Useful for cost optimization - find resources that might be unused.
   *
   * @param subscriptions - Optional subscription IDs
   * @returns Potentially orphaned resources
   */
  async getOrphanedResources(subscriptions?: string[]): Promise<ResourceGraphResult> {
    const query = `
      Resources
      | where type == "microsoft.compute/virtualmachines"
      | extend powerState = properties.extended.instanceView.powerState.code
      | where powerState =~ "PowerState/deallocated" or powerState =~ "PowerState/stopped"
      | where isnull(tags) or array_length(bag_keys(tags)) == 0
      | project id, name, location, resourceGroup, powerState, tags
      | order by name asc
    `;

    return this.query(query, subscriptions);
  }

  /**
   * Pre-built query: Get all Network Security Groups with rules
   *
   * @param subscriptions - Optional subscription IDs
   * @returns NSG details with security rules
   */
  async getNetworkSecurityGroups(subscriptions?: string[]): Promise<ResourceGraphResult> {
    const query = `
      Resources
      | where type == "microsoft.network/networksecuritygroups"
      | extend securityRules = properties.securityRules
      | project id, name, location, resourceGroup, securityRules, tags
      | order by name asc
    `;

    return this.query(query, subscriptions);
  }

  /**
   * Pre-built query: Get public IP addresses
   *
   * @param subscriptions - Optional subscription IDs
   * @returns Public IP addresses with allocation details
   */
  async getPublicIpAddresses(subscriptions?: string[]): Promise<ResourceGraphResult> {
    const query = `
      Resources
      | where type == "microsoft.network/publicipaddresses"
      | extend ipAddress = properties.ipAddress
      | extend allocationMethod = properties.publicIPAllocationMethod
      | project id, name, location, resourceGroup, ipAddress, allocationMethod, tags
      | order by name asc
    `;

    return this.query(query, subscriptions);
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Parses Azure Resource Graph API response
   *
   * @private
   */
  private parseQueryResponse(response: QueryResponse): ResourceGraphResult {
    const table: Table = response.data as Table;

    return {
      columns: table.columns,
      rows: table.rows as ResourceGraphRow[],
      totalRecords: response.totalRecords || 0,
      count: response.count || 0,
      resultTruncated: response.resultTruncated || 'false',
      skipToken: response.skipToken,
    };
  }

  /**
   * Enforces rate limiting (15 queries per 5 seconds)
   *
   * @private
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();

    // Remove timestamps outside the current window
    this.queryTimestamps = this.queryTimestamps.filter(
      (timestamp) => now - timestamp < this.rateLimitConfig.windowSizeMs
    );

    // If we've hit the limit, wait until the oldest query expires
    if (this.queryTimestamps.length >= this.rateLimitConfig.maxQueriesPerWindow) {
      const oldestQuery = this.queryTimestamps[0];
      const waitTime = this.rateLimitConfig.windowSizeMs - (now - oldestQuery) + 100; // +100ms buffer

      console.warn(
        `[AzureResourceGraphService] Rate limit reached (${this.queryTimestamps.length}/${this.rateLimitConfig.maxQueriesPerWindow}), waiting ${waitTime}ms`
      );

      await this.sleep(waitTime);

      // Recursively check rate limit after waiting
      return this.enforceRateLimit();
    }

    // Add current query timestamp
    this.queryTimestamps.push(now);
  }

  /**
   * Executes operation with retry logic and exponential backoff
   *
   * @private
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryCount: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      const isRetryable = this.isRetryableError(error);
      const shouldRetry = retryCount < MAX_QUERY_RETRIES && isRetryable;

      if (shouldRetry) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);

        console.warn(
          `[AzureResourceGraphService] Retry ${retryCount + 1}/${MAX_QUERY_RETRIES} after ${delay}ms. Error: ${error.message}`
        );

        await this.sleep(delay);
        return this.executeWithRetry(operation, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Determines if an error is retryable
   *
   * @private
   */
  private isRetryableError(error: any): boolean {
    const statusCode = error.statusCode || error.$metadata?.httpStatusCode;

    // Throttling
    if (statusCode === 429) return true;

    // Server errors
    if (statusCode === 500 || statusCode === 503) return true;

    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;

    // Auth errors - DO NOT RETRY
    if (statusCode === 401 || statusCode === 403) return false;

    return false;
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
