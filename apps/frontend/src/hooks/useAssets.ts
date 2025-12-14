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
