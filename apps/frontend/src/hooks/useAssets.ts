/**
 * React Query Hooks for Asset Discovery
 * Provides type-safe data fetching with caching, automatic refetching, and error handling
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
  UseQueryOptions,
} from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  assetsApi,
  Asset,
  ListAssetsParams,
  TriggerDiscoveryParams,
  ListAssetsResponse,
  AssetDetailResponse,
  TriggerDiscoveryResponse,
} from '@/lib/api/assets';
import { ApiResponse } from '@/lib/api/client';

// Query Key Factories
// Centralized query key management for cache invalidation and optimization
export const assetsKeys = {
  all: ['assets'] as const,
  lists: () => [...assetsKeys.all, 'list'] as const,
  list: (params: ListAssetsParams) => [...assetsKeys.lists(), params] as const,
  details: () => [...assetsKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetsKeys.details(), id] as const,
};

// Hook Options Types
export interface UseAssetsOptions
  extends Omit<UseQueryOptions<ApiResponse<ListAssetsResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

export interface UseAssetOptions
  extends Omit<UseQueryOptions<ApiResponse<AssetDetailResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

/**
 * Hook: useAssets
 * Fetch paginated list of assets with filters
 *
 * @param params - Query parameters including filters, pagination, and sorting
 * @param options - React Query options
 * @returns Query result with assets data
 *
 * @example
 * const { data, isLoading, error } = useAssets({
 *   status: 'active',
 *   provider: 'AWS',
 *   page: 1,
 *   limit: 20,
 * });
 */
export function useAssets(
  params: ListAssetsParams = {},
  options?: UseAssetsOptions
): UseQueryResult<ApiResponse<ListAssetsResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: assetsKeys.list(params),
    queryFn: () => assetsApi.list(params, token),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds (assets change frequently during discovery)
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook: useAsset
 * Fetch a single asset by ID
 *
 * @param id - Asset ID
 * @param options - React Query options
 * @returns Query result with asset details
 *
 * @example
 * const { data, isLoading } = useAsset(assetId);
 */
export function useAsset(
  id: string,
  options?: UseAssetOptions
): UseQueryResult<ApiResponse<AssetDetailResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: assetsKeys.detail(id),
    queryFn: () => assetsApi.getById(id, token),
    enabled: !!id && options?.enabled !== false,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    ...options,
  });
}

/**
 * Hook: useAssetDiscovery
 * Trigger manual asset discovery
 *
 * @returns Mutation result with trigger function
 *
 * @example
 * const { mutate: triggerDiscovery, isPending } = useAssetDiscovery();
 *
 * const handleDiscover = async () => {
 *   await triggerDiscovery({});
 * };
 */
export function useAssetDiscovery() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useMutation({
    mutationFn: (params: TriggerDiscoveryParams = {}) =>
      assetsApi.triggerDiscovery(params, token),
    onSuccess: () => {
      // Invalidate all asset queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: assetsKeys.all });
    },
    retry: 1,
  });
}

/**
 * Helper: Extract assets data from API response
 * Handles the ApiResponse wrapper and provides type-safe access
 */
export function extractAssetsData(
  response: ApiResponse<ListAssetsResponse> | undefined
): ListAssetsResponse | null {
  if (!response?.success || !response?.data) {
    return null;
  }
  return response.data;
}

/**
 * Helper: Extract asset detail from API response
 * Handles the ApiResponse wrapper and provides type-safe access
 */
export function extractAssetData(
  response: ApiResponse<AssetDetailResponse> | undefined
): Asset | null {
  if (!response?.success || !response?.data) {
    return null;
  }
  return response.data.data;
}

/**
 * Hook: useOrphanedAssets
 * Fetch assets with missing or incomplete tags
 *
 * @param accountId - Cloud account ID
 * @param options - React Query options
 * @returns Query result with orphaned assets
 *
 * @example
 * const { data, isLoading } = useOrphanedAssets(accountId);
 */
export function useOrphanedAssets(
  accountId: string,
  options?: UseQueryOptions<ApiResponse<import('@/lib/api/assets').OrphanedAssetsResponse>>
) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: [...assetsKeys.all, 'orphaned', accountId] as const,
    queryFn: () => import('@/lib/api/assets').then(m => m.assetsApi.getOrphaned(accountId, token)),
    enabled: !!accountId && options?.enabled !== false,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    ...options,
  });
}

/**
 * Hook: useAssetsByType
 * Fetch assets filtered by resource type
 *
 * @param accountId - Cloud account ID
 * @param type - Resource type
 * @param options - React Query options
 * @returns Query result with filtered assets
 *
 * @example
 * const { data, isLoading } = useAssetsByType(accountId, 'VirtualMachine');
 */
export function useAssetsByType(
  accountId: string,
  type: string,
  options?: UseQueryOptions<ApiResponse<ListAssetsResponse>>
) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: [...assetsKeys.all, 'byType', accountId, type] as const,
    queryFn: () => import('@/lib/api/assets').then(m => m.assetsApi.getByType(accountId, type, token)),
    enabled: !!accountId && !!type && options?.enabled !== false,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    ...options,
  });
}

/**
 * Hook: useCostAllocation
 * Fetch cost allocation breakdown by department, project, or environment
 *
 * @param accountId - Cloud account ID
 * @param groupBy - Group by field
 * @param options - React Query options
 * @returns Query result with cost allocation data
 *
 * @example
 * const { data, isLoading } = useCostAllocation(accountId, 'project');
 */
export function useCostAllocation(
  accountId: string,
  groupBy: 'department' | 'project' | 'environment' = 'project',
  options?: UseQueryOptions<ApiResponse<import('@/lib/api/assets').CostAllocationResponse>>
) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: [...assetsKeys.all, 'costAllocation', accountId, groupBy] as const,
    queryFn: () => import('@/lib/api/assets').then(m => m.assetsApi.getCostAllocation(accountId, groupBy, token)),
    enabled: !!accountId && options?.enabled !== false,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    ...options,
  });
}

/**
 * Hook: useAssetStats
 * Fetch asset inventory statistics
 *
 * @param accountId - Cloud account ID
 * @param options - React Query options
 * @returns Query result with stats
 *
 * @example
 * const { data, isLoading } = useAssetStats(accountId);
 */
export function useAssetStats(
  accountId: string,
  options?: UseQueryOptions<ApiResponse<import('@/lib/api/assets').AssetStatsResponse>>
) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: [...assetsKeys.all, 'stats', accountId] as const,
    queryFn: () => import('@/lib/api/assets').then(m => m.assetsApi.getStats(accountId, token)),
    enabled: !!accountId && options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    ...options,
  });
}

/**
 * Hook: useUpdateAssetTags
 * Update tags for a single asset
 *
 * @returns Mutation result with update function
 *
 * @example
 * const { mutate: updateTags, isPending } = useUpdateAssetTags();
 *
 * updateTags({ id: 'asset-123', tags: { Owner: 'John' } });
 */
export function useUpdateAssetTags() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useMutation({
    mutationFn: async ({ id, tags }: { id: string; tags: Record<string, string> }) => {
      const { assetsApi } = await import('@/lib/api/assets');
      return assetsApi.updateTags(id, { tags }, token);
    },
    onSuccess: (_, variables) => {
      // Invalidate specific asset and lists
      queryClient.invalidateQueries({ queryKey: assetsKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: assetsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...assetsKeys.all, 'stats'] });
    },
    retry: 1,
  });
}

/**
 * Hook: useBulkUpdateTags
 * Update tags for multiple assets
 *
 * @returns Mutation result with bulk update function
 *
 * @example
 * const { mutate: bulkUpdate, isPending } = useBulkUpdateTags();
 *
 * bulkUpdate({
 *   resourceIds: ['id1', 'id2'],
 *   tags: { Environment: 'Production' },
 *   operation: 'add'
 * });
 */
export function useBulkUpdateTags() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useMutation({
    mutationFn: async (params: import('@/lib/api/assets').BulkTagParams) => {
      const { assetsApi } = await import('@/lib/api/assets');
      return assetsApi.bulkUpdateTags(params, token);
    },
    onSuccess: () => {
      // Invalidate all asset queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: assetsKeys.all });
    },
    retry: 1,
  });
}
