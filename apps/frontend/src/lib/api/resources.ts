/**
 * Azure Resources API Client
 *
 * Handles all Azure resource inventory API calls
 * Provides type-safe methods for fetching and managing resources
 */

import { apiGet, ApiResponse } from './client';
import {
  Resource,
  ResourcesResponse,
  ResourceListParams,
} from '@/types/resources';

/**
 * Resources API Client
 * Provides methods for Azure resource inventory management
 */
export const resourcesApi = {
  /**
   * List Azure resources with filters and pagination
   *
   * @param params - Query parameters including filters, pagination, and sorting
   * @param token - Optional authentication token
   * @returns Promise resolving to resources response
   *
   * @example
   * ```ts
   * const response = await resourcesApi.list({
   *   resourceType: 'Microsoft.Compute/virtualMachines',
   *   location: 'eastus',
   *   page: 1,
   *   limit: 20,
   * }, token);
   * ```
   */
  list: async (
    params: ResourceListParams = {},
    token?: string
  ): Promise<ApiResponse<ResourcesResponse>> => {
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

  /**
   * Get a single Azure resource by ID
   *
   * @param id - Resource ID
   * @param token - Optional authentication token
   * @returns Promise resolving to resource detail
   *
   * @example
   * ```ts
   * const response = await resourcesApi.getById(resourceId, token);
   * ```
   */
  getById: async (
    id: string,
    token?: string
  ): Promise<ApiResponse<Resource>> => {
    return apiGet<Resource>(`/resources/${id}`, token);
  },

  /**
   * Get unique resource types
   *
   * Fetches a list of all unique resource types in the inventory
   * Useful for populating filter dropdowns dynamically
   *
   * @param token - Optional authentication token
   * @returns Promise resolving to array of resource types
   *
   * @example
   * ```ts
   * const response = await resourcesApi.getResourceTypes(token);
   * const types = response.data; // ['Microsoft.Compute/virtualMachines', ...]
   * ```
   */
  getResourceTypes: async (
    token?: string
  ): Promise<ApiResponse<string[]>> => {
    return apiGet<string[]>('/resources/types', token);
  },

  /**
   * Get unique locations
   *
   * Fetches a list of all unique Azure locations in the inventory
   * Useful for populating location filter dropdowns dynamically
   *
   * @param token - Optional authentication token
   * @returns Promise resolving to array of locations
   *
   * @example
   * ```ts
   * const response = await resourcesApi.getLocations(token);
   * const locations = response.data; // ['eastus', 'westeurope', ...]
   * ```
   */
  getLocations: async (
    token?: string
  ): Promise<ApiResponse<string[]>> => {
    return apiGet<string[]>('/resources/locations', token);
  },

  /**
   * Get unique resource groups
   *
   * Fetches a list of all unique resource groups in the inventory
   * Useful for populating resource group filter dropdowns dynamically
   *
   * @param token - Optional authentication token
   * @returns Promise resolving to array of resource groups
   *
   * @example
   * ```ts
   * const response = await resourcesApi.getResourceGroups(token);
   * const groups = response.data; // ['rg-prod', 'rg-dev', ...]
   * ```
   */
  getResourceGroups: async (
    token?: string
  ): Promise<ApiResponse<string[]>> => {
    return apiGet<string[]>('/resources/groups', token);
  },
};

/**
 * Export default for convenience
 */
export default resourcesApi;
