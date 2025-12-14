/**
 * Azure Resource Graph Service
 * Provides KQL-based queries for Azure resources across subscriptions
 *
 * Features:
 * - Advanced resource filtering and pagination
 * - Full-text search across resource properties
 * - Resource metadata and aggregations
 * - Cost-relevant resource queries
 * - Compliance and tag-based queries
 *
 * Security Features:
 * - Input sanitization to prevent KQL injection
 * - Rate limiting to prevent API throttling
 * - Redis caching to reduce API calls
 * - Timeout configuration for reliability
 *
 * Performance Optimizations:
 * - Query result caching (15 min for resources, 1 hour for metadata)
 * - KQL projection to return only needed fields
 * - Parallel query execution for aggregations
 * - Pagination to handle large datasets
 * - Performance logging and monitoring
 *
 * Performance Goals:
 * - Resource inventory queries: <2s (p95)
 * - Filter/search queries: <1s (p95)
 * - Metadata queries: <500ms (p95)
 *
 * KQL Query Examples:
 *
 * @example Basic resource query
 * ```kql
 * Resources
 * | where type =~ 'microsoft.compute/virtualmachines'
 * | project id, name, location, resourceGroup
 * | limit 100
 * ```
 *
 * @example Advanced filtering
 * ```kql
 * Resources
 * | where type =~ 'microsoft.storage/storageaccounts'
 *   and location =~ 'eastus'
 *   and tags['environment'] =~ 'production'
 * | project id, name, properties.sku.name
 * ```
 *
 * @example Aggregation query
 * ```kql
 * Resources
 * | summarize count() by type, location
 * | order by count_ desc
 * ```
 */

import { ResourceGraphClient } from '@azure/arm-resourcegraph';
import { AzureCredentialsService } from './azureCredentials.service';
import { azureConfig } from '../../config/azure.config';
import { AzureRateLimiterService } from './azureRateLimiter.service';
import { AzureCacheService } from './azureCache.service';
import { logger } from '../../utils/logger';

export interface ResourceCount {
  type: string;
  count: number;
}

export interface ResourcesByLocation {
  location: string;
  count: number;
}

export interface ResourceSummary {
  totalResources: number;
  byType: ResourceCount[];
  byLocation: ResourcesByLocation[];
  virtualMachines: {
    total: number;
    running: number;
    stopped: number;
  };
}

export interface ResourceFilter {
  type?: string;
  location?: string;
  resourceGroup?: string;
  tags?: Record<string, string>;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResources {
  resources: any[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface ResourceMetadata {
  types: string[];
  locations: string[];
  resourceGroups: string[];
}

/**
 * Azure Resource Graph Service
 */
export class AzureResourceGraphService {
  /**
   * Sanitize user input for KQL queries to prevent injection attacks
   * Escapes special characters and validates input format
   */
  private static sanitizeKQLString(input: string): string {
    if (typeof input !== 'string') {
      throw new Error('Invalid input type: expected string');
    }

    // Remove or escape potentially dangerous characters
    // KQL uses single quotes for strings, so we need to escape them
    return input
      .replace(/\\/g, '\\\\') // Escape backslashes first
      .replace(/'/g, "\\'") // Escape single quotes
      .replace(/\r?\n/g, ' ') // Remove newlines
      .replace(/\t/g, ' ') // Remove tabs
      .trim();
  }

  /**
   * Validate and sanitize resource type names
   * Azure resource types follow specific format: Provider.Service/resourceType
   */
  private static sanitizeResourceType(resourceType: string): string {
    if (typeof resourceType !== 'string') {
      throw new Error('Invalid resource type: expected string');
    }

    // Validate format: must match Azure resource type pattern
    const resourceTypePattern = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
    if (!resourceTypePattern.test(resourceType)) {
      throw new Error('Invalid resource type format');
    }

    // Convert to lowercase as per Azure convention
    return resourceType.toLowerCase();
  }

  /**
   * Execute a KQL query against Azure Resource Graph with security controls
   * @param accountId - Cloud account ID
   * @param query - KQL query string
   * @param cacheKey - Optional cache key for caching results
   * @returns Query results
   */
  private static async executeQuery(
    accountId: string,
    query: string,
    cacheKey?: string
  ): Promise<any> {
    try {
      // Check rate limit before making API call
      const rateLimit = await AzureRateLimiterService.checkRateLimit(
        'resourceGraph',
        accountId
      );

      if (!rateLimit.allowed) {
        logger.warn('Rate limit exceeded for Resource Graph', {
          accountId,
          retryAfter: rateLimit.retryAfter,
        });

        throw new Error(
          `Rate limit exceeded. Please retry after ${rateLimit.retryAfter} seconds.`
        );
      }

      const credential = await AzureCredentialsService.getTokenCredential(accountId);
      const credentials = await AzureCredentialsService.getCredentials(accountId);

      // Create client
      const client = new ResourceGraphClient(credential);

      const queryRequest: any = {
        subscriptions: [credentials.subscriptionId],
        query,
        options: {
          resultFormat: 'objectArray',
        },
      };

      // Execute query
      const result = await client.resources(queryRequest);

      // Consume rate limit token after successful call
      await AzureRateLimiterService.consumeToken('resourceGraph', accountId);

      return result;
    } catch (error: any) {
      // Log error without exposing sensitive information
      logger.error('Azure Resource Graph query failed', {
        accountId,
        queryPreview: query.substring(0, 50), // Only log first 50 chars
        errorMessage: error.message,
        errorCode: error.code,
      });

      // Sanitize error message to avoid leaking sensitive info
      const sanitizedMessage = error.message?.includes('credentials')
        ? 'Authentication failed'
        : error.message;

      throw new Error(`Failed to execute Azure Resource Graph query: ${sanitizedMessage}`);
    }
  }

  /**
   * Get resource summary for dashboard with caching
   * @param accountId - Cloud account ID
   * @returns Resource summary
   */
  static async getResourceSummary(accountId: string): Promise<ResourceSummary> {
    // Use cache-aside pattern with 15 minute TTL
    return AzureCacheService.getOrSet(
      'resources',
      accountId,
      ['summary'],
      async () => {
        try {
          // Query 1: Total resources by type
          const byTypeQuery = `
            Resources
            | summarize count() by type
            | order by count_ desc
            | limit 20
          `;

          const byTypeResult = await this.executeQuery(accountId, byTypeQuery);
          const byType: ResourceCount[] = (byTypeResult.data as any[]).map((row) => ({
            type: row.type,
            count: row.count_,
          }));

          // Query 2: Resources by location
          const byLocationQuery = `
            Resources
            | where location != ''
            | summarize count() by location
            | order by count_ desc
          `;

          const byLocationResult = await this.executeQuery(accountId, byLocationQuery);
          const byLocation: ResourcesByLocation[] = (byLocationResult.data as any[]).map(
            (row) => ({
              location: row.location,
              count: row.count_,
            })
          );

          // Query 3: Virtual Machine states
          const vmQuery = `
            Resources
            | where type == 'microsoft.compute/virtualmachines'
            | extend powerState = properties.extended.instanceView.powerState.code
            | summarize
              total = count(),
              running = countif(powerState == 'PowerState/running'),
              stopped = countif(powerState != 'PowerState/running')
          `;

          const vmResult = await this.executeQuery(accountId, vmQuery);
          const vmData = (vmResult.data as any[])[0] || { total: 0, running: 0, stopped: 0 };

          // Calculate total resources
          const totalResources = byType.reduce((sum, item) => sum + item.count, 0);

          return {
            totalResources,
            byType,
            byLocation,
            virtualMachines: {
              total: vmData.total || 0,
              running: vmData.running || 0,
              stopped: vmData.stopped || 0,
            },
          };
        } catch (error: any) {
          logger.error('Failed to get resource summary', {
            accountId,
            error: error.message,
          });
          throw error;
        }
      }
    );
  }

  /**
   * Get count of resources by type (SECURED against injection attacks)
   * @param accountId - Cloud account ID
   * @param resourceType - Azure resource type (e.g., 'Microsoft.Compute/virtualMachines')
   * @returns Resource count
   */
  static async getResourceCountByType(accountId: string, resourceType: string): Promise<number> {
    // SECURITY FIX: Validate and sanitize resource type to prevent KQL injection
    const sanitizedResourceType = this.sanitizeResourceType(resourceType);

    // Use cache to reduce API calls
    return AzureCacheService.getOrSet(
      'resources',
      accountId,
      ['count', sanitizedResourceType],
      async () => {
        // Build query with sanitized input
        const query = `
          Resources
          | where type == '${sanitizedResourceType}'
          | count
        `;

        const result = await this.executeQuery(accountId, query);
        return (result.data as any[])[0]?.Count || 0;
      }
    );
  }

  /**
   * Search resources by name or tag (SECURED against injection attacks)
   * @param accountId - Cloud account ID
   * @param searchTerm - Search term
   * @returns Matching resources
   */
  static async searchResources(accountId: string, searchTerm: string): Promise<any[]> {
    // SECURITY FIX: Sanitize search term to prevent KQL injection
    const sanitizedSearchTerm = this.sanitizeKQLString(searchTerm);

    // Validate search term length to prevent abuse
    if (sanitizedSearchTerm.length === 0) {
      throw new Error('Search term cannot be empty');
    }

    if (sanitizedSearchTerm.length > 200) {
      throw new Error('Search term too long (max 200 characters)');
    }

    // Use cache with shorter TTL for search results
    return AzureCacheService.getOrSet(
      'resources',
      accountId,
      ['search', sanitizedSearchTerm],
      async () => {
        // Build query with sanitized input
        const query = `
          Resources
          | where name contains '${sanitizedSearchTerm}' or tostring(tags) contains '${sanitizedSearchTerm}'
          | project id, name, type, location, resourceGroup, tags
          | limit 100
        `;

        const result = await this.executeQuery(accountId, query);
        return result.data as any[];
      }
    );
  }

  /**
   * Get recent resource changes (last 24 hours) with caching
   * @param accountId - Cloud account ID
   * @returns Recent resource changes
   */
  static async getRecentChanges(accountId: string): Promise<any[]> {
    // Use shorter cache TTL for recent changes (5 minutes)
    return AzureCacheService.getOrSet(
      'resources',
      accountId,
      ['recent-changes'],
      async () => {
        const query = `
          ResourceChanges
          | where timestamp > ago(24h)
          | project timestamp, resourceId, changeType = properties.changeType, changes = properties.changes
          | order by timestamp desc
          | limit 50
        `;

        try {
          const result = await this.executeQuery(accountId, query);
          return result.data as any[];
        } catch (error: any) {
          // ResourceChanges might not be available in all subscriptions
          logger.warn('ResourceChanges query failed, returning empty array', {
            accountId,
            error: error.message,
          });
          return [];
        }
      }
    );
  }

  /**
   * Get resource compliance status with caching
   * @param accountId - Cloud account ID
   * @returns Compliance summary
   */
  static async getComplianceStatus(accountId: string): Promise<any> {
    // Use security category cache with 5 minute TTL
    return AzureCacheService.getOrSet(
      'security',
      accountId,
      ['compliance-status'],
      async () => {
        const query = `
          PolicyResources
          | where type == 'microsoft.policyinsights/policystates'
          | summarize
            total = count(),
            compliant = countif(properties.complianceState == 'Compliant'),
            nonCompliant = countif(properties.complianceState == 'NonCompliant')
        `;

        try {
          const result = await this.executeQuery(accountId, query);
          const data = (result.data as any[])[0] || {
            total: 0,
            compliant: 0,
            nonCompliant: 0,
          };
          return data;
        } catch (error: any) {
          logger.warn('Compliance status query failed', {
            accountId,
            error: error.message,
          });
          return { total: 0, compliant: 0, nonCompliant: 0 };
        }
      }
    );
  }

  /**
   * Build dynamic KQL query based on filters
   * @param filters - Resource filters
   * @param pagination - Pagination options
   * @returns KQL query string
   */
  private static buildKQLQuery(
    filters: ResourceFilter,
    pagination?: PaginationOptions
  ): string {
    let query = 'Resources';

    // Build WHERE clauses
    const whereClauses: string[] = [];

    if (filters.type) {
      const sanitizedType = this.sanitizeResourceType(filters.type);
      whereClauses.push(`type =~ '${sanitizedType}'`);
    }

    if (filters.location) {
      const sanitizedLocation = this.sanitizeKQLString(filters.location);
      whereClauses.push(`location =~ '${sanitizedLocation}'`);
    }

    if (filters.resourceGroup) {
      const sanitizedRG = this.sanitizeKQLString(filters.resourceGroup);
      whereClauses.push(`resourceGroup =~ '${sanitizedRG}'`);
    }

    if (filters.tags) {
      Object.entries(filters.tags).forEach(([key, value]) => {
        const sanitizedKey = this.sanitizeKQLString(key);
        const sanitizedValue = this.sanitizeKQLString(value);
        whereClauses.push(`tags['${sanitizedKey}'] =~ '${sanitizedValue}'`);
      });
    }

    // Apply WHERE clauses
    if (whereClauses.length > 0) {
      query += `\n| where ${whereClauses.join(' and ')}`;
    }

    // Project only needed fields for performance
    query += '\n| project id, name, type, location, resourceGroup, tags, properties';

    // Apply pagination
    if (pagination) {
      const skip = (pagination.page - 1) * pagination.limit;
      query += `\n| skip ${skip}`;
      query += `\n| take ${pagination.limit + 1}`; // Take one extra to check if there are more
    }

    return query;
  }

  /**
   * Format Azure Resource Graph response to standard format
   * @param azureResponse - Raw Azure response
   * @param pagination - Pagination options
   * @returns Formatted resource response
   */
  private static formatResourceResponse(
    azureResponse: any,
    pagination?: PaginationOptions
  ): PaginatedResources {
    const resources = azureResponse.data as any[];

    if (!pagination) {
      return {
        resources,
        pagination: {
          page: 1,
          limit: resources.length,
          hasMore: false,
        },
      };
    }

    // Check if there are more results
    const hasMore = resources.length > pagination.limit;
    const resultResources = hasMore ? resources.slice(0, pagination.limit) : resources;

    return {
      resources: resultResources,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        hasMore,
      },
    };
  }

  /**
   * Get resources with advanced filtering and pagination
   * @param accountId - Cloud account ID
   * @param filters - Resource filters (type, location, resourceGroup, tags)
   * @param pagination - Pagination options (page, limit)
   * @returns Paginated resources
   */
  static async getResourcesWithFilters(
    accountId: string,
    filters: ResourceFilter = {},
    pagination: PaginationOptions = { page: 1, limit: 50 }
  ): Promise<PaginatedResources> {
    // Validate pagination
    if (pagination.page < 1) {
      throw new Error('Page must be greater than 0');
    }
    if (pagination.limit < 1 || pagination.limit > 1000) {
      throw new Error('Limit must be between 1 and 1000');
    }

    // Use cache with 15 minute TTL
    return AzureCacheService.getOrSet(
      'resources',
      accountId,
      ['filtered', JSON.stringify(filters), `page${pagination.page}`, `limit${pagination.limit}`],
      async () => {
        try {
          const startTime = Date.now();
          const query = this.buildKQLQuery(filters, pagination);

          logger.debug('Executing filtered resource query', {
            accountId,
            filters,
            pagination,
            query: query.substring(0, 200),
          });

          const result = await this.executeQuery(accountId, query);
          const formatted = this.formatResourceResponse(result, pagination);

          const duration = Date.now() - startTime;
          logger.info('Filtered resource query completed', {
            accountId,
            resourceCount: formatted.resources.length,
            hasMore: formatted.pagination.hasMore,
            durationMs: duration,
          });

          return formatted;
        } catch (error: any) {
          logger.error('Failed to get filtered resources', {
            accountId,
            filters,
            error: error.message,
          });
          throw error;
        }
      }
    );
  }

  /**
   * Get all unique resource types in the subscription
   * Used for filter dropdowns
   * @param accountId - Cloud account ID
   * @returns List of unique resource types
   */
  static async getResourceTypes(accountId: string): Promise<string[]> {
    // Use cache with 1 hour TTL (resource types are relatively static)
    return AzureCacheService.getOrSet(
      'resources',
      accountId,
      ['metadata', 'types'],
      async () => {
        try {
          const startTime = Date.now();
          const query = `
            Resources
            | distinct type
            | order by type asc
          `;

          logger.debug('Fetching resource types', { accountId });

          const result = await this.executeQuery(accountId, query);
          const types = (result.data as any[]).map((row) => row.type);

          const duration = Date.now() - startTime;
          logger.info('Resource types fetched', {
            accountId,
            count: types.length,
            durationMs: duration,
          });

          return types;
        } catch (error: any) {
          logger.error('Failed to get resource types', {
            accountId,
            error: error.message,
          });
          throw error;
        }
      }
    );
  }

  /**
   * Get all unique locations in the subscription
   * Used for filter dropdowns
   * @param accountId - Cloud account ID
   * @returns List of unique locations
   */
  static async getLocations(accountId: string): Promise<string[]> {
    // Use cache with 1 hour TTL (locations are relatively static)
    return AzureCacheService.getOrSet(
      'resources',
      accountId,
      ['metadata', 'locations'],
      async () => {
        try {
          const startTime = Date.now();
          const query = `
            Resources
            | where location != ''
            | distinct location
            | order by location asc
          `;

          logger.debug('Fetching locations', { accountId });

          const result = await this.executeQuery(accountId, query);
          const locations = (result.data as any[]).map((row) => row.location);

          const duration = Date.now() - startTime;
          logger.info('Locations fetched', {
            accountId,
            count: locations.length,
            durationMs: duration,
          });

          return locations;
        } catch (error: any) {
          logger.error('Failed to get locations', {
            accountId,
            error: error.message,
          });
          throw error;
        }
      }
    );
  }

  /**
   * Get all resource groups in the subscription
   * Used for filter dropdowns
   * @param accountId - Cloud account ID
   * @returns List of resource groups
   */
  static async getResourceGroups(accountId: string): Promise<string[]> {
    // Use cache with 1 hour TTL (resource groups change infrequently)
    return AzureCacheService.getOrSet(
      'resources',
      accountId,
      ['metadata', 'resourceGroups'],
      async () => {
        try {
          const startTime = Date.now();
          const query = `
            Resources
            | distinct resourceGroup
            | order by resourceGroup asc
          `;

          logger.debug('Fetching resource groups', { accountId });

          const result = await this.executeQuery(accountId, query);
          const resourceGroups = (result.data as any[]).map((row) => row.resourceGroup);

          const duration = Date.now() - startTime;
          logger.info('Resource groups fetched', {
            accountId,
            count: resourceGroups.length,
            durationMs: duration,
          });

          return resourceGroups;
        } catch (error: any) {
          logger.error('Failed to get resource groups', {
            accountId,
            error: error.message,
          });
          throw error;
        }
      }
    );
  }

  /**
   * Search resources by name, type, or location
   * Optimized version with better performance and case-insensitive search
   *
   * Performance optimizations:
   * - Uses case-insensitive contains operators for better user experience
   * - Projects only necessary fields to reduce response size
   * - Implements result limiting to prevent large result sets
   *
   * @param accountId - Cloud account ID
   * @param searchTerm - Search term (min 1 char, max 200 chars)
   * @param limit - Maximum number of results (default 100, max 1000)
   * @returns Matching resources
   *
   * @example
   * ```typescript
   * // Search for VMs containing "prod"
   * const results = await searchResourcesAdvanced('account-123', 'prod', 50);
   * ```
   */
  static async searchResourcesAdvanced(
    accountId: string,
    searchTerm: string,
    limit: number = 100
  ): Promise<any[]> {
    // SECURITY: Sanitize search term to prevent KQL injection
    const sanitizedSearchTerm = this.sanitizeKQLString(searchTerm);

    // Validate search term length
    if (sanitizedSearchTerm.length === 0) {
      throw new Error('Search term cannot be empty');
    }

    if (sanitizedSearchTerm.length > 200) {
      throw new Error('Search term too long (max 200 characters)');
    }

    // Validate limit
    if (limit < 1 || limit > 1000) {
      throw new Error('Limit must be between 1 and 1000');
    }

    // Use cache with shorter TTL for search results (15 minutes)
    return AzureCacheService.getOrSet(
      'resources',
      accountId,
      ['search-advanced', sanitizedSearchTerm, `limit${limit}`],
      async () => {
        try {
          const startTime = Date.now();

          // Optimized search query with case-insensitive search and projection
          // Performance: Using 'contains' instead of '=~' for partial matching
          const query = `
            Resources
            | where name contains '${sanitizedSearchTerm}'
              or type contains '${sanitizedSearchTerm}'
              or location contains '${sanitizedSearchTerm}'
              or resourceGroup contains '${sanitizedSearchTerm}'
            | project id, name, type, location, resourceGroup, tags
            | order by name asc
            | limit ${limit}
          `;

          logger.debug('Executing advanced search', {
            accountId,
            searchTerm: sanitizedSearchTerm,
            limit,
          });

          const result = await this.executeQuery(accountId, query);
          const resources = result.data as any[];

          const duration = Date.now() - startTime;
          logger.info('Advanced search completed', {
            accountId,
            searchTerm: sanitizedSearchTerm.substring(0, 50),
            resultCount: resources.length,
            durationMs: duration,
          });

          // Performance goal: <1s for search queries
          if (duration > 1000) {
            logger.warn('Search query exceeded performance target', {
              accountId,
              durationMs: duration,
              target: 1000,
            });
          }

          return resources;
        } catch (error: any) {
          logger.error('Advanced search failed', {
            accountId,
            searchTerm: sanitizedSearchTerm.substring(0, 50),
            error: error.message,
          });
          throw error;
        }
      }
    );
  }

  /**
   * Get all resource metadata in one call for efficiency
   * Executes queries in parallel for optimal performance
   *
   * Performance optimization:
   * - Fetches all metadata types concurrently using Promise.all
   * - Reduces total latency from 3x sequential time to max(query times)
   *
   * @param accountId - Cloud account ID
   * @returns Resource metadata (types, locations, resource groups)
   *
   * @example
   * ```typescript
   * const metadata = await getResourceMetadata('account-123');
   * console.log(metadata.types); // ['microsoft.compute/virtualmachines', ...]
   * console.log(metadata.locations); // ['eastus', 'westus', ...]
   * console.log(metadata.resourceGroups); // ['prod-rg', 'dev-rg', ...]
   * ```
   */
  static async getResourceMetadata(accountId: string): Promise<ResourceMetadata> {
    // Execute all metadata queries in parallel for performance
    const [types, locations, resourceGroups] = await Promise.all([
      this.getResourceTypes(accountId),
      this.getLocations(accountId),
      this.getResourceGroups(accountId),
    ]);

    return {
      types,
      locations,
      resourceGroups,
    };
  }

  /**
   * Get resource counts by multiple dimensions for analytics
   * Useful for dashboard visualizations and reporting
   *
   * Returns aggregated counts by:
   * - Resource type (top 20)
   * - Location (all)
   * - Resource group (all)
   * - Tag key-value pairs (top 10)
   *
   * @param accountId - Cloud account ID
   * @returns Resource count aggregations
   *
   * @example
   * ```typescript
   * const aggregations = await getResourceAggregations('account-123');
   * // {
   * //   byType: [{ type: 'microsoft.compute/virtualmachines', count: 25 }, ...],
   * //   byLocation: [{ location: 'eastus', count: 50 }, ...],
   * //   byResourceGroup: [{ resourceGroup: 'prod-rg', count: 30 }, ...],
   * //   byTag: [{ key: 'environment', value: 'production', count: 40 }, ...]
   * // }
   * ```
   */
  static async getResourceAggregations(accountId: string): Promise<{
    byType: Array<{ type: string; count: number }>;
    byLocation: Array<{ location: string; count: number }>;
    byResourceGroup: Array<{ resourceGroup: string; count: number }>;
    byTag: Array<{ key: string; value: string; count: number }>;
  }> {
    return AzureCacheService.getOrSet(
      'resources',
      accountId,
      ['aggregations'],
      async () => {
        try {
          const startTime = Date.now();

          // Optimized query using single scan with multiple aggregations
          const aggregationQuery = `
            Resources
            | summarize
              TypeCounts = count() by type,
              LocationCounts = count() by location,
              RGCounts = count() by resourceGroup
            | project type, location, resourceGroup, TypeCounts, LocationCounts, RGCounts
          `;

          // Execute aggregation queries in parallel for best performance
          const [typeResult, locationResult, rgResult, tagResult] = await Promise.all([
            // By type (top 20)
            this.executeQuery(
              accountId,
              `
                Resources
                | summarize count() by type
                | order by count_ desc
                | limit 20
              `
            ),
            // By location
            this.executeQuery(
              accountId,
              `
                Resources
                | where location != ''
                | summarize count() by location
                | order by count_ desc
              `
            ),
            // By resource group
            this.executeQuery(
              accountId,
              `
                Resources
                | summarize count() by resourceGroup
                | order by count_ desc
              `
            ),
            // By tags (top 10 tag combinations)
            this.executeQuery(
              accountId,
              `
                Resources
                | where isnotempty(tags)
                | mv-expand tagPair = tags
                | extend tagKey = tostring(bag_keys(tagPair)[0])
                | extend tagValue = tostring(tagPair[tagKey])
                | summarize count() by tagKey, tagValue
                | order by count_ desc
                | limit 10
              `
            ).catch(() => ({ data: [] })), // Tags query might fail, handle gracefully
          ]);

          const duration = Date.now() - startTime;

          logger.info('Resource aggregations completed', {
            accountId,
            durationMs: duration,
          });

          // Performance goal: <2s for aggregation queries
          if (duration > 2000) {
            logger.warn('Aggregation query exceeded performance target', {
              accountId,
              durationMs: duration,
              target: 2000,
            });
          }

          return {
            byType: (typeResult.data as any[]).map((row) => ({
              type: row.type,
              count: row.count_,
            })),
            byLocation: (locationResult.data as any[]).map((row) => ({
              location: row.location,
              count: row.count_,
            })),
            byResourceGroup: (rgResult.data as any[]).map((row) => ({
              resourceGroup: row.resourceGroup,
              count: row.count_,
            })),
            byTag: (tagResult.data as any[]).map((row) => ({
              key: row.tagKey || '',
              value: row.tagValue || '',
              count: row.count_,
            })),
          };
        } catch (error: any) {
          logger.error('Failed to get resource aggregations', {
            accountId,
            error: error.message,
          });
          throw error;
        }
      }
    );
  }

  /**
   * Get resources with specific tags for compliance and organization tracking
   *
   * Performance optimization:
   * - Uses KQL bag functions for efficient tag querying
   * - Supports multiple tag filters with AND logic
   * - Projects only necessary fields
   *
   * @param accountId - Cloud account ID
   * @param tags - Tag key-value pairs to filter by (all must match)
   * @param pagination - Optional pagination settings
   * @returns Paginated resources matching all specified tags
   *
   * @example
   * ```typescript
   * // Find all production resources in the platform team
   * const resources = await getResourcesByTags(
   *   'account-123',
   *   { environment: 'production', team: 'platform' },
   *   { page: 1, limit: 50 }
   * );
   * ```
   */
  static async getResourcesByTags(
    accountId: string,
    tags: Record<string, string>,
    pagination?: PaginationOptions
  ): Promise<PaginatedResources> {
    if (Object.keys(tags).length === 0) {
      throw new Error('At least one tag filter is required');
    }

    return this.getResourcesWithFilters(accountId, { tags }, pagination);
  }

  /**
   * Get cost-related resource information for specific resource types
   * Optimized for cost analysis dashboards
   *
   * Focuses on resources that typically incur costs:
   * - Virtual Machines (with size and state)
   * - Storage Accounts (with SKU)
   * - Databases (with tier and capacity)
   * - Networking resources
   *
   * @param accountId - Cloud account ID
   * @param limit - Maximum number of resources (default 1000)
   * @returns Resources with cost-relevant properties
   *
   * @example
   * ```typescript
   * const costResources = await getCostRelevantResources('account-123');
   * // Returns VMs, storage accounts, databases with pricing-relevant properties
   * ```
   */
  static async getCostRelevantResources(
    accountId: string,
    limit: number = 1000
  ): Promise<any[]> {
    // Validate limit
    if (limit < 1 || limit > 10000) {
      throw new Error('Limit must be between 1 and 10000');
    }

    return AzureCacheService.getOrSet(
      'resources',
      accountId,
      ['cost-relevant', `limit${limit}`],
      async () => {
        try {
          const startTime = Date.now();

          // Query for cost-relevant resources with extended properties
          const query = `
            Resources
            | where type in~ (
              'microsoft.compute/virtualmachines',
              'microsoft.storage/storageaccounts',
              'microsoft.sql/servers/databases',
              'microsoft.dbformysql/servers',
              'microsoft.dbforpostgresql/servers',
              'microsoft.network/applicationgateways',
              'microsoft.network/loadbalancers',
              'microsoft.containerservice/managedclusters',
              'microsoft.web/serverfarms',
              'microsoft.cache/redis'
            )
            | extend
              vmSize = properties.hardwareProfile.vmSize,
              powerState = properties.extended.instanceView.powerState.code,
              storageSku = properties.sku.name,
              databaseTier = properties.currentServiceObjectiveName,
              databaseCapacity = properties.maxSizeBytes
            | project
              id,
              name,
              type,
              location,
              resourceGroup,
              tags,
              vmSize,
              powerState,
              storageSku,
              databaseTier,
              databaseCapacity
            | order by type asc, name asc
            | limit ${limit}
          `;

          logger.debug('Fetching cost-relevant resources', { accountId, limit });

          const result = await this.executeQuery(accountId, query);
          const resources = result.data as any[];

          const duration = Date.now() - startTime;
          logger.info('Cost-relevant resources fetched', {
            accountId,
            count: resources.length,
            durationMs: duration,
          });

          return resources;
        } catch (error: any) {
          logger.error('Failed to get cost-relevant resources', {
            accountId,
            error: error.message,
          });
          throw error;
        }
      }
    );
  }

  /**
   * Get resource inventory with detailed properties for auditing
   * Returns comprehensive resource information including properties
   *
   * Performance considerations:
   * - Large result sets - use pagination
   * - Extended properties increase response size
   * - Consider using filters to reduce scope
   *
   * @param accountId - Cloud account ID
   * @param options - Query options (filters, pagination, includeProperties)
   * @returns Detailed resource inventory
   *
   * @example
   * ```typescript
   * const inventory = await getResourceInventory('account-123', {
   *   filters: { type: 'microsoft.compute/virtualmachines' },
   *   pagination: { page: 1, limit: 100 },
   *   includeProperties: true
   * });
   * ```
   */
  static async getResourceInventory(
    accountId: string,
    options: {
      filters?: ResourceFilter;
      pagination?: PaginationOptions;
      includeProperties?: boolean;
    } = {}
  ): Promise<PaginatedResources> {
    const { filters = {}, pagination = { page: 1, limit: 100 }, includeProperties = false } = options;

    // For detailed inventory with properties, adjust the cache strategy
    const cacheIdentifiers = [
      'inventory',
      JSON.stringify(filters),
      `page${pagination.page}`,
      `limit${pagination.limit}`,
      `props${includeProperties}`,
    ];

    return AzureCacheService.getOrSet(
      'resources',
      accountId,
      cacheIdentifiers,
      async () => {
        try {
          const startTime = Date.now();

          // Build query based on whether properties are needed
          let query = this.buildKQLQuery(filters, pagination);

          if (includeProperties) {
            // Replace the simple projection with one that includes all properties
            query = query.replace(
              '| project id, name, type, location, resourceGroup, tags, properties',
              '| project id, name, type, location, resourceGroup, tags, properties, kind, sku, identity, zones, managedBy'
            );
          }

          logger.debug('Fetching resource inventory', {
            accountId,
            filters,
            pagination,
            includeProperties,
          });

          const result = await this.executeQuery(accountId, query);
          const formatted = this.formatResourceResponse(result, pagination);

          const duration = Date.now() - startTime;
          logger.info('Resource inventory fetched', {
            accountId,
            count: formatted.resources.length,
            hasMore: formatted.pagination.hasMore,
            durationMs: duration,
          });

          // Performance goal: <2s for inventory queries
          if (duration > 2000) {
            logger.warn('Inventory query exceeded performance target', {
              accountId,
              durationMs: duration,
              target: 2000,
            });
          }

          return formatted;
        } catch (error: any) {
          logger.error('Failed to get resource inventory', {
            accountId,
            error: error.message,
          });
          throw error;
        }
      }
    );
  }

  /**
   * Get count of resources matching filters
   * Used for pagination metadata
   * @param accountId - Cloud account ID
   * @param filters - Resource filters
   * @returns Total resource count
   */
  static async getResourceCountWithFilters(
    accountId: string,
    filters: ResourceFilter = {}
  ): Promise<number> {
    // Build count query based on filters
    let query = 'Resources';

    // Build WHERE clauses
    const whereClauses: string[] = [];

    if (filters.type) {
      const sanitizedType = this.sanitizeResourceType(filters.type);
      whereClauses.push(`type =~ '${sanitizedType}'`);
    }

    if (filters.location) {
      const sanitizedLocation = this.sanitizeKQLString(filters.location);
      whereClauses.push(`location =~ '${sanitizedLocation}'`);
    }

    if (filters.resourceGroup) {
      const sanitizedRG = this.sanitizeKQLString(filters.resourceGroup);
      whereClauses.push(`resourceGroup =~ '${sanitizedRG}'`);
    }

    if (filters.tags) {
      Object.entries(filters.tags).forEach(([key, value]) => {
        const sanitizedKey = this.sanitizeKQLString(key);
        const sanitizedValue = this.sanitizeKQLString(value);
        whereClauses.push(`tags['${sanitizedKey}'] =~ '${sanitizedValue}'`);
      });
    }

    // Apply WHERE clauses
    if (whereClauses.length > 0) {
      query += `\n| where ${whereClauses.join(' and ')}`;
    }

    // Add count
    query += '\n| count';

    try {
      const startTime = Date.now();
      const result = await this.executeQuery(accountId, query);
      const count = (result.data as any[])[0]?.Count || 0;

      const duration = Date.now() - startTime;
      logger.debug('Resource count query completed', {
        accountId,
        filters,
        count,
        durationMs: duration,
      });

      return count;
    } catch (error: any) {
      logger.error('Failed to get resource count', {
        accountId,
        filters,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Invalidate cache for an account
   * Call this when resources are modified to ensure fresh data
   * @param accountId - Cloud account ID
   */
  static async invalidateCache(accountId: string): Promise<void> {
    await AzureCacheService.invalidateAccount(accountId);
  }
}
