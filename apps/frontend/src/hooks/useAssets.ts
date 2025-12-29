/**
 * React Query Hooks for Assets (Resource Inventory)
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
  UpdateTagsParams,
  ListAssetsResponse,
  AssetDetailResponse,
  TriggerDiscoveryResponse,
  UpdateTagsResponse,
  AssetStatsResponse,
} from '@/lib/api/assets';
import { ApiResponse } from '@/lib/api/client';

// Query Key Factories
export const assetsKeys = {
  all: ['assets'] as const,
  lists: () => [...assetsKeys.all, 'list'] as const,
  list: (params: ListAssetsParams) => [...assetsKeys.lists(), params] as const,
  details: () => [...assetsKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetsKeys.details(), id] as const,
  stats: (accountId: string) => [...assetsKeys.all, 'stats', accountId] as const,
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

export interface UseAssetStatsOptions
  extends Omit<UseQueryOptions<ApiResponse<AssetStatsResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

/**
 * Hook: useAssets
 * Fetch paginated list of assets with filters
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
    enabled: !!token && options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook: useAsset
 * Fetch a single asset by ID
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
    enabled: !!id && !!token && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook: useAssetStats
 * Fetch aggregated statistics for assets
 */
export function useAssetStats(
  accountId: string,
  options?: UseAssetStatsOptions
): UseQueryResult<ApiResponse<AssetStatsResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: assetsKeys.stats(accountId),
    queryFn: () => assetsApi.getStats(accountId, token),
    enabled: !!accountId && !!token && options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook: useTriggerDiscovery
 * Mutation to trigger manual asset discovery
 */
export function useTriggerDiscovery(): UseMutationResult<
  ApiResponse<TriggerDiscoveryResponse>,
  Error,
  TriggerDiscoveryParams
> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: TriggerDiscoveryParams) =>
      assetsApi.triggerDiscovery(params, token),
    onSuccess: () => {
      // Invalidate all assets queries to refetch with new data
      queryClient.invalidateQueries({ queryKey: assetsKeys.all });
    },
    retry: 1,
    retryDelay: 2000,
  });
}

/**
 * Hook: useUpdateTags
 * Mutation to update asset tags
 */
export function useUpdateTags(): UseMutationResult<
  ApiResponse<UpdateTagsResponse>,
  Error,
  { id: string; params: UpdateTagsParams }
> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, params }) => assetsApi.updateTags(id, params, token),
    onSuccess: (data, variables) => {
      // Update specific asset in cache
      queryClient.setQueryData(assetsKeys.detail(variables.id), data);
      // Invalidate lists to reflect tag changes
      queryClient.invalidateQueries({ queryKey: assetsKeys.lists() });
    },
    retry: 1,
    retryDelay: 2000,
  });
}

/**
 * Utility: Helper to extract data from API response
 */
export function extractAssetsData(
  response?: ApiResponse<ListAssetsResponse>
): ListAssetsResponse | null {
  return response?.success && response.data ? response.data : null;
}

export function extractAssetData(
  response?: ApiResponse<AssetDetailResponse>
): Asset | null {
  return response?.success && response.data ? response.data.data : null;
}

export function extractStatsData(
  response?: ApiResponse<AssetStatsResponse>
): AssetStatsResponse['data'] | null {
  return response?.success && response.data ? response.data.data : null;
}
