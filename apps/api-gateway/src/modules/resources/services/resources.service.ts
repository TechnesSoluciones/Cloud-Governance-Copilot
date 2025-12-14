/**
 * Resources Service
 * Provides resource inventory functionality with filtering and pagination
 *
 * Features:
 * - Advanced filtering (type, location, resource group, tags)
 * - Pagination support
 * - Redis caching with 15-minute TTL
 * - Rate limiting protection
 * - Security-hardened KQL query building
 */

import {
  AzureResourceGraphService,
  ResourceFilter,
  PaginationOptions,
  PaginatedResources,
  ResourceMetadata,
} from '../../../services/azure/resourceGraph.service';
import { logger } from '../../../services/logger.service';
import { metricsService } from '../../../services/metrics.service';

export interface ResourceInventoryFilters {
  resourceType?: string;
  location?: string;
  resourceGroup?: string;
  tags?: Record<string, string>;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface ResourceItem {
  id: string;
  name: string;
  type: string;
  location: string;
  resourceGroup: string;
  tags: Record<string, string>;
  properties?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Resources Service
 * High-level service for resource inventory management
 */
export class ResourcesService {
  /**
   * Validate pagination parameters
   * @param pagination - Pagination params to validate
   * @throws Error if validation fails
   */
  private static validatePaginationParams(pagination: PaginationParams): void {
    if (pagination.page < 1) {
      throw new Error('Page must be greater than or equal to 1');
    }

    if (pagination.limit < 1) {
      throw new Error('Limit must be greater than or equal to 1');
    }

    if (pagination.limit > 100) {
      throw new Error('Limit cannot exceed 100');
    }
  }

  /**
   * Validate filter parameters
   * @param filters - Filters to validate
   * @throws Error if validation fails
   */
  private static validateFilters(filters: ResourceInventoryFilters): void {
    // Validate resource type format if provided
    if (filters.resourceType) {
      const resourceTypePattern = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
      if (!resourceTypePattern.test(filters.resourceType)) {
        throw new Error(
          'Invalid resource type format. Expected format: Provider.Service/resourceType (e.g., Microsoft.Compute/virtualMachines)'
        );
      }
    }

    // Validate location format if provided
    if (filters.location) {
      if (filters.location.length > 50) {
        throw new Error('Location name is too long (max 50 characters)');
      }
      // Azure locations are alphanumeric with no special characters except spaces and hyphens
      const locationPattern = /^[a-zA-Z0-9\s-]+$/;
      if (!locationPattern.test(filters.location)) {
        throw new Error('Invalid location format. Only alphanumeric characters, spaces, and hyphens are allowed');
      }
    }

    // Validate resource group format if provided
    if (filters.resourceGroup) {
      if (filters.resourceGroup.length > 90) {
        throw new Error('Resource group name is too long (max 90 characters)');
      }
      // Azure resource groups: alphanumeric, underscores, hyphens, periods, and parentheses
      const resourceGroupPattern = /^[a-zA-Z0-9._()-]+$/;
      if (!resourceGroupPattern.test(filters.resourceGroup)) {
        throw new Error(
          'Invalid resource group format. Only alphanumeric characters, underscores, hyphens, periods, and parentheses are allowed'
        );
      }
    }

    // Validate tags if provided
    if (filters.tags) {
      const tagEntries = Object.entries(filters.tags);

      if (tagEntries.length > 10) {
        throw new Error('Too many tag filters (max 10)');
      }

      tagEntries.forEach(([key, value]) => {
        if (key.length > 512) {
          throw new Error(`Tag key too long: "${key}" (max 512 characters)`);
        }
        if (value.length > 256) {
          throw new Error(`Tag value too long for key "${key}" (max 256 characters)`);
        }
      });
    }
  }

  /**
   * Convert service filters to Resource Graph filters
   * @param filters - Service-level filters
   * @returns Resource Graph filters
   */
  private static convertFilters(filters: ResourceInventoryFilters): ResourceFilter {
    return {
      type: filters.resourceType,
      location: filters.location,
      resourceGroup: filters.resourceGroup,
      tags: filters.tags,
    };
  }

  /**
   * Format resources to standard ResourceItem format
   * @param resources - Raw resources from Resource Graph
   * @returns Formatted resource items
   */
  private static formatResources(resources: any[]): ResourceItem[] {
    return resources.map((resource) => ({
      id: resource.id || '',
      name: resource.name || '',
      type: resource.type || '',
      location: resource.location || '',
      resourceGroup: resource.resourceGroup || '',
      tags: resource.tags || {},
      properties: resource.properties,
    }));
  }

  /**
   * Calculate total count estimate based on pagination
   * Note: Azure Resource Graph doesn't provide total count directly,
   * so we estimate based on whether there are more results
   *
   * @param currentPage - Current page number
   * @param limit - Items per page
   * @param hasMore - Whether there are more results
   * @param currentCount - Count of items in current page
   * @returns Estimated total count
   */
  private static estimateTotalCount(
    currentPage: number,
    limit: number,
    hasMore: boolean,
    currentCount: number
  ): number {
    if (!hasMore) {
      // No more results, we can calculate exact count
      return (currentPage - 1) * limit + currentCount;
    }

    // Has more results, return a minimum estimate
    // Azure Resource Graph max is 1000, but we return conservative estimate
    return currentPage * limit + 1;
  }

  /**
   * Get resource inventory with filtering and pagination
   *
   * @param accountId - Cloud account ID (required)
   * @param filters - Resource filters (optional)
   * @param pagination - Pagination parameters (default: page 1, limit 50)
   * @returns Paginated resource inventory
   */
  static async getResourceInventory(
    accountId: string,
    filters: ResourceInventoryFilters = {},
    pagination: PaginationParams = { page: 1, limit: 50 }
  ): Promise<PaginatedResponse<ResourceItem>> {
    try {
      // Validate account ID
      if (!accountId || typeof accountId !== 'string') {
        throw new Error('Invalid accountId: must be a non-empty string');
      }

      // Validate pagination
      this.validatePaginationParams(pagination);

      // Validate filters
      this.validateFilters(filters);

      logger.info('Fetching resource inventory', {
        cloudAccountId: accountId,
        operation: 'getResourceInventory',
        filters,
        pagination,
      });

      const startTime = Date.now();

      // Convert filters and call Resource Graph Service
      const resourceGraphFilters = this.convertFilters(filters);
      const paginationOptions: PaginationOptions = {
        page: pagination.page,
        limit: pagination.limit,
      };

      const result: PaginatedResources = await AzureResourceGraphService.getResourcesWithFilters(
        accountId,
        resourceGraphFilters,
        paginationOptions
      );

      // Format resources
      const formattedResources = this.formatResources(result.resources);

      // Estimate total count
      const total = this.estimateTotalCount(
        pagination.page,
        pagination.limit,
        result.pagination.hasMore,
        formattedResources.length
      );

      // Calculate total pages
      const totalPages = Math.ceil(total / pagination.limit);

      const duration = Date.now() - startTime;

      // Record business metric
      metricsService.incrementBusinessMetric('resources_synced', {
        operation: 'getResourceInventory',
      });

      // Log slow queries
      if (duration > 2000) {
        logger.warn('Slow resource inventory query detected', {
          cloudAccountId: accountId,
          operation: 'getResourceInventory',
          duration,
          threshold: 2000,
          resourceCount: formattedResources.length,
        });
      } else {
        logger.info('Resource inventory fetched successfully', {
          cloudAccountId: accountId,
          operation: 'getResourceInventory',
          resourceCount: formattedResources.length,
          page: pagination.page,
          hasMore: result.pagination.hasMore,
          duration,
        });
      }

      return {
        data: formattedResources,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
          hasMore: result.pagination.hasMore,
        },
      };
    } catch (error: any) {
      logger.error('Failed to get resource inventory', {
        cloudAccountId: accountId,
        operation: 'getResourceInventory',
        filters,
        pagination,
        error: error instanceof Error ? error : new Error(String(error)),
      });

      // Re-throw with more context
      throw new Error(`Failed to retrieve resource inventory: ${error.message}`);
    }
  }

  /**
   * Get resource metadata for filter dropdowns
   * Returns all available types, locations, and resource groups
   *
   * @param accountId - Cloud account ID
   * @returns Resource metadata
   */
  static async getResourceMetadata(accountId: string): Promise<ResourceMetadata> {
    try {
      // Validate account ID
      if (!accountId || typeof accountId !== 'string') {
        throw new Error('Invalid accountId: must be a non-empty string');
      }

      logger.info('Fetching resource metadata', { accountId });

      const startTime = Date.now();

      const metadata = await AzureResourceGraphService.getResourceMetadata(accountId);

      const duration = Date.now() - startTime;

      logger.info('Resource metadata fetched successfully', {
        accountId,
        typesCount: metadata.types.length,
        locationsCount: metadata.locations.length,
        resourceGroupsCount: metadata.resourceGroups.length,
        durationMs: duration,
      });

      return metadata;
    } catch (error: any) {
      logger.error('Failed to get resource metadata', {
        accountId,
        error: error.message,
        stack: error.stack,
      });

      throw new Error(`Failed to retrieve resource metadata: ${error.message}`);
    }
  }

  /**
   * Search resources by name, type, or location
   *
   * @param accountId - Cloud account ID
   * @param searchTerm - Search term (1-200 characters)
   * @param limit - Maximum results (default 50, max 100)
   * @returns Matching resources
   */
  static async searchResources(
    accountId: string,
    searchTerm: string,
    limit: number = 50
  ): Promise<ResourceItem[]> {
    try {
      // Validate account ID
      if (!accountId || typeof accountId !== 'string') {
        throw new Error('Invalid accountId: must be a non-empty string');
      }

      // Validate search term
      if (!searchTerm || typeof searchTerm !== 'string') {
        throw new Error('Invalid searchTerm: must be a non-empty string');
      }

      if (searchTerm.trim().length === 0) {
        throw new Error('Search term cannot be empty');
      }

      if (searchTerm.length > 200) {
        throw new Error('Search term too long (max 200 characters)');
      }

      // Validate limit
      if (limit < 1 || limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }

      logger.info('Searching resources', {
        cloudAccountId: accountId,
        operation: 'searchResources',
        searchTerm: searchTerm.substring(0, 50),
        limit,
      });

      const startTime = Date.now();

      const results = await AzureResourceGraphService.searchResourcesAdvanced(
        accountId,
        searchTerm,
        limit
      );

      const formattedResults = this.formatResources(results);

      const duration = Date.now() - startTime;

      // Record business metric
      metricsService.incrementBusinessMetric('resource_searches', {
        operation: 'searchResources',
      });

      logger.info('Resource search completed', {
        cloudAccountId: accountId,
        operation: 'searchResources',
        searchTerm: searchTerm.substring(0, 50),
        resultCount: formattedResults.length,
        duration,
      });

      return formattedResults;
    } catch (error: any) {
      logger.error('Failed to search resources', {
        cloudAccountId: accountId,
        operation: 'searchResources',
        searchTerm: searchTerm?.substring(0, 50),
        error: error instanceof Error ? error : new Error(String(error)),
      });

      throw new Error(`Failed to search resources: ${error.message}`);
    }
  }

  /**
   * Get resource count by type
   * Useful for dashboard widgets and statistics
   *
   * @param accountId - Cloud account ID
   * @param resourceType - Azure resource type
   * @returns Resource count
   */
  static async getResourceCountByType(accountId: string, resourceType: string): Promise<number> {
    try {
      // Validate account ID
      if (!accountId || typeof accountId !== 'string') {
        throw new Error('Invalid accountId: must be a non-empty string');
      }

      // Validate resource type
      const resourceTypePattern = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
      if (!resourceTypePattern.test(resourceType)) {
        throw new Error(
          'Invalid resource type format. Expected format: Provider.Service/resourceType'
        );
      }

      logger.info('Getting resource count by type', {
        accountId,
        resourceType,
      });

      const count = await AzureResourceGraphService.getResourceCountByType(accountId, resourceType);

      logger.info('Resource count retrieved', {
        accountId,
        resourceType,
        count,
      });

      return count;
    } catch (error: any) {
      logger.error('Failed to get resource count by type', {
        accountId,
        resourceType,
        error: error.message,
        stack: error.stack,
      });

      throw new Error(`Failed to get resource count: ${error.message}`);
    }
  }

  /**
   * Invalidate resource cache for an account
   * Call this when resources are modified
   *
   * @param accountId - Cloud account ID
   */
  static async invalidateCache(accountId: string): Promise<void> {
    try {
      if (!accountId || typeof accountId !== 'string') {
        throw new Error('Invalid accountId: must be a non-empty string');
      }

      logger.info('Invalidating resource cache', { accountId });

      await AzureResourceGraphService.invalidateCache(accountId);

      logger.info('Resource cache invalidated successfully', { accountId });
    } catch (error: any) {
      logger.error('Failed to invalidate resource cache', {
        accountId,
        error: error.message,
      });

      throw new Error(`Failed to invalidate cache: ${error.message}`);
    }
  }
}
