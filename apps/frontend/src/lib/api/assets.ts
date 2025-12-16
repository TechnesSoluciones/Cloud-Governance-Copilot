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

export interface OrphanedAsset extends Asset {
  orphanReason: 'no_owner' | 'stopped_no_tags' | 'incomplete_tags';
}

export interface OrphanedAssetsResponse {
  data: OrphanedAsset[];
  meta: {
    total: number;
  };
}

export interface CostAllocationGroup {
  name: string;
  resourceCount: number;
  totalCost: number;
  topResources: Asset[];
}

export interface CostAllocationResponse {
  data: {
    groupBy: 'department' | 'project' | 'environment';
    groups: CostAllocationGroup[];
  };
}

export interface UpdateTagsParams {
  tags: Record<string, string>;
}

export interface UpdateTagsResponse {
  data: Asset;
}

export interface BulkTagParams {
  resourceIds: string[];
  tags: Record<string, string>;
  operation: 'add' | 'replace' | 'remove';
}

export interface BulkTagResponse {
  data: {
    updatedCount: number;
    failedCount: number;
    errors: string[];
  };
}

export interface AssetStatsResponse {
  data: {
    totalAssets: number;
    orphanedAssets: number;
    monthlyCost: number;
    lastScanTime: string;
    assetsByType: Record<string, number>;
    assetsByRegion: Record<string, number>;
  };
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

  /**
   * Get orphaned assets (no owner tag or incomplete tags)
   */
  getOrphaned: async (
    accountId: string,
    token?: string
  ): Promise<ApiResponse<OrphanedAssetsResponse>> => {
    return apiGet<OrphanedAssetsResponse>(
      `/api/v1/assets/orphaned?accountId=${accountId}`,
      token
    );
  },

  /**
   * Get assets by type
   */
  getByType: async (
    accountId: string,
    type: string,
    token?: string
  ): Promise<ApiResponse<ListAssetsResponse>> => {
    return apiGet<ListAssetsResponse>(
      `/api/v1/assets/by-type/${type}?accountId=${accountId}`,
      token
    );
  },

  /**
   * Get cost allocation breakdown
   */
  getCostAllocation: async (
    accountId: string,
    groupBy: 'department' | 'project' | 'environment' = 'project',
    token?: string
  ): Promise<ApiResponse<CostAllocationResponse>> => {
    return apiGet<CostAllocationResponse>(
      `/api/v1/assets/cost-allocation?accountId=${accountId}&groupBy=${groupBy}`,
      token
    );
  },

  /**
   * Get asset statistics
   */
  getStats: async (accountId: string, token?: string): Promise<ApiResponse<AssetStatsResponse>> => {
    return apiGet<AssetStatsResponse>(`/api/v1/assets/stats?accountId=${accountId}`, token);
  },

  /**
   * Update resource tags
   */
  updateTags: async (
    id: string,
    params: UpdateTagsParams,
    token?: string
  ): Promise<ApiResponse<UpdateTagsResponse>> => {
    return apiPost<UpdateTagsResponse>(`/api/v1/assets/${id}/tags`, params, token);
  },

  /**
   * Bulk update tags for multiple resources
   */
  bulkUpdateTags: async (
    params: BulkTagParams,
    token?: string
  ): Promise<ApiResponse<BulkTagResponse>> => {
    return apiPost<BulkTagResponse>('/api/v1/assets/bulk-tag', params, token);
  },
};
