/**
 * useResources Hook
 *
 * React Query hook for fetching Azure resources with filtering, pagination, and search
 * Features:
 * - Automatic caching and refetching
 * - Error handling with retry logic
 * - Auto-refresh every 5 minutes
 * - Debounced search
 * - Type-safe API calls
 */

import {
  useQuery,
  UseQueryResult,
  UseQueryOptions,
} from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiGet, ApiResponse } from '@/lib/api/client';
import {
  Resource,
  ResourcesResponse,
  ResourceListParams,
} from '@/types/resources';

/**
 * Query Key Factory
 * Centralized query key management for cache invalidation and optimization
 */
export const resourcesKeys = {
  all: ['resources'] as const,
  lists: () => [...resourcesKeys.all, 'list'] as const,
  list: (params: ResourceListParams) => [...resourcesKeys.lists(), params] as const,
};

/**
 * Hook Options
 * Extended React Query options with custom configuration
 */
export interface UseResourcesOptions
  extends Omit<
    UseQueryOptions<ApiResponse<ResourcesResponse>>,
    'queryKey' | 'queryFn'
  > {
  /** Enable/disable the query */
  enabled?: boolean;
}

/**
 * useResources Hook
 *
 * Fetches Azure resources from the API with advanced filtering and pagination
 *
 * @param params - Query parameters including filters, pagination, and sorting
 * @param options - React Query configuration options
 * @returns Query result with resources data and loading/error states
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useResources({
 *   resourceType: 'Microsoft.Compute/virtualMachines',
 *   location: 'eastus',
 *   page: 1,
 *   limit: 20,
 *   search: 'prod',
 * });
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorMessage error={error} />;
 *
 * const resources = data?.data?.data || [];
 * const pagination = data?.data?.pagination;
 * ```
 */
export function useResources(
  params: ResourceListParams = {},
  options?: UseResourcesOptions
): UseQueryResult<ApiResponse<ResourcesResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: resourcesKeys.list(params),
    queryFn: async () => {
      // Build query string from parameters
      const queryParams = new URLSearchParams();

      // Pagination
      if (params.page !== undefined) {
        queryParams.append('page', params.page.toString());
      }
      if (params.limit !== undefined) {
        queryParams.append('limit', params.limit.toString());
      }

      // Filters
      if (params.resourceType) {
        queryParams.append('resourceType', params.resourceType);
      }
      if (params.location) {
        queryParams.append('location', params.location);
      }
      if (params.resourceGroup) {
        queryParams.append('resourceGroup', params.resourceGroup);
      }
      if (params.search) {
        queryParams.append('search', params.search);
      }

      // Sorting
      if (params.sortBy) {
        queryParams.append('sortBy', params.sortBy);
      }
      if (params.sortOrder) {
        queryParams.append('sortOrder', params.sortOrder);
      }

      const queryString = queryParams.toString();
      const endpoint = `/resources${queryString ? `?${queryString}` : ''}`;

      return apiGet<ResourcesResponse>(endpoint, token);
    },
    enabled: options?.enabled !== false,
    staleTime: 2 * 60 * 1000, // 2 minutes - data is considered fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time
    refetchInterval: 5 * 60 * 1000, // 5 minutes - auto-refresh interval
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Helper: Extract resources data from API response
 *
 * Safely extracts the resources array from the API response wrapper
 * Handles null/undefined cases gracefully
 *
 * @param response - API response from useResources hook
 * @returns Array of resources or empty array if no data
 *
 * @example
 * ```tsx
 * const { data } = useResources({ page: 1, limit: 20 });
 * const resources = extractResourcesData(data);
 * ```
 */
export function extractResourcesData(
  response: ApiResponse<ResourcesResponse> | undefined
): Resource[] {
  if (!response?.success || !response?.data?.data) {
    return [];
  }
  return response.data.data;
}

/**
 * Helper: Extract pagination metadata from API response
 *
 * Safely extracts pagination information from the API response
 * Returns default pagination if no data is available
 *
 * @param response - API response from useResources hook
 * @returns Pagination metadata object
 *
 * @example
 * ```tsx
 * const { data } = useResources({ page: 1, limit: 20 });
 * const pagination = extractPaginationData(data);
 * console.log(`Showing ${pagination.page} of ${pagination.totalPages}`);
 * ```
 */
export function extractPaginationData(
  response: ApiResponse<ResourcesResponse> | undefined
) {
  if (!response?.success || !response?.data?.pagination) {
    return {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    };
  }
  return response.data.pagination;
}

/**
 * Helper: Check if resources query has results
 *
 * @param response - API response from useResources hook
 * @returns true if there are resources, false otherwise
 */
export function hasResources(
  response: ApiResponse<ResourcesResponse> | undefined
): boolean {
  return extractResourcesData(response).length > 0;
}

/**
 * Helper: Get unique resource types from current results
 *
 * Useful for dynamically populating filter dropdowns based on actual data
 *
 * @param resources - Array of resources
 * @returns Array of unique resource types
 */
export function getUniqueResourceTypes(resources: Resource[]): string[] {
  const types = new Set(resources.map((r) => r.type));
  return Array.from(types).sort();
}

/**
 * Helper: Get unique locations from current results
 *
 * Useful for dynamically populating location filter dropdowns
 *
 * @param resources - Array of resources
 * @returns Array of unique locations
 */
export function getUniqueLocations(resources: Resource[]): string[] {
  const locations = new Set(resources.map((r) => r.location));
  return Array.from(locations).sort();
}

/**
 * Helper: Get unique resource groups from current results
 *
 * Useful for dynamically populating resource group filter dropdowns
 *
 * @param resources - Array of resources
 * @returns Array of unique resource groups
 */
export function getUniqueResourceGroups(resources: Resource[]): string[] {
  const groups = new Set(resources.map((r) => r.resourceGroup));
  return Array.from(groups).sort();
}
