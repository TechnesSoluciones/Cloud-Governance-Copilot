/**
 * Assets API Client
 * Handles all asset discovery and inventory API calls
 */

import { apiGet, apiPost, ApiResponse } from './client';
import { Provider } from './finops';

// Type Definitions
export type AssetProvider = 'AWS' | 'AZURE';
export type AssetStatus = 'active' | 'terminated';

// Core Data Interfaces
export interface Asset {
  id: string;
  tenantId: string;
  cloudAccountId: string;
  provider: AssetProvider;
  resourceType: string;
  resourceId: string;
  name: string;
  region: string;
  status: AssetStatus;
  tags: Record<string, string>;
  metadata: Record<string, any>;
  monthlyCost?: number;
  discoveredAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

// Request Parameter Interfaces
export interface ListAssetsParams {
  page?: number;
  limit?: number;
  provider?: AssetProvider;
  resourceType?: string;
  region?: string;
  status?: AssetStatus;
  search?: string;
  sortBy?: 'createdAt' | 'resourceType' | 'name' | 'monthlyCost' | 'lastSeenAt';
  sortOrder?: 'asc' | 'desc';
}

export interface TriggerDiscoveryParams {
  cloudAccountId?: string;
}

// Response Interfaces
export interface ListAssetsResponse {
  data: Asset[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AssetDetailResponse {
  data: Asset;
}

export interface TriggerDiscoveryResponse {
  message: string;
  discoveredCount: number;
  updatedCount: number;
  errors: string[];
}

/**
 * Assets API Client
 * Provides methods for asset discovery and inventory management
 */
export const assetsApi = {
  /**
   * List assets with filters and pagination
   */
  list: async (
    params: ListAssetsParams = {},
    token?: string
  ): Promise<ApiResponse<ListAssetsResponse>> => {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.provider) queryParams.append('provider', params.provider);
    if (params.resourceType) queryParams.append('resourceType', params.resourceType);
    if (params.region) queryParams.append('region', params.region);
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const queryString = queryParams.toString();
    const endpoint = `/api/v1/assets${queryString ? `?${queryString}` : ''}`;

    return apiGet<ListAssetsResponse>(endpoint, token);
  },

  /**
   * Get a single asset by ID
   */
  getById: async (id: string, token?: string): Promise<ApiResponse<AssetDetailResponse>> => {
    return apiGet<AssetDetailResponse>(`/api/v1/assets/${id}`, token);
  },

  /**
   * Trigger manual asset discovery
   */
  triggerDiscovery: async (
    params: TriggerDiscoveryParams = {},
    token?: string
  ): Promise<ApiResponse<TriggerDiscoveryResponse>> => {
    return apiPost<TriggerDiscoveryResponse>('/api/v1/assets/discover', params, token);
  },
};
