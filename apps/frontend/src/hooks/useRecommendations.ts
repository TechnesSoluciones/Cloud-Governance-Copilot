/**
 * React Query Hooks for Cost Optimization Recommendations
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
  recommendationsApi,
  Recommendation,
  ListRecommendationsParams,
  GenerateRecommendationsParams,
  ApplyRecommendationParams,
  DismissRecommendationParams,
  SummaryQueryParams,
  ListRecommendationsResponse,
  GenerateRecommendationsResponse,
  RecommendationsSummary,
  RecommendationType,
  RecommendationStatus,
  RecommendationPriority,
} from '@/lib/api/recommendations';
import { ApiResponse } from '@/lib/api/client';
import { Provider } from '@/lib/api/finops';

// Query Key Factories
// Centralized query key management for cache invalidation and optimization
export const recommendationsKeys = {
  all: ['recommendations'] as const,
  lists: () => [...recommendationsKeys.all, 'list'] as const,
  list: (params: ListRecommendationsParams) =>
    [...recommendationsKeys.lists(), params] as const,
  summaries: () => [...recommendationsKeys.all, 'summary'] as const,
  summary: (params: SummaryQueryParams) =>
    [...recommendationsKeys.summaries(), params] as const,
  details: () => [...recommendationsKeys.all, 'detail'] as const,
  detail: (id: string) => [...recommendationsKeys.details(), id] as const,
};

// Hook Options Types
export interface UseRecommendationsOptions
  extends Omit<UseQueryOptions<ApiResponse<ListRecommendationsResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

export interface UseRecommendationOptions
  extends Omit<UseQueryOptions<ApiResponse<Recommendation>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

export interface UseRecommendationsSummaryOptions
  extends Omit<UseQueryOptions<ApiResponse<RecommendationsSummary>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

/**
 * Hook: useRecommendations
 * Fetch paginated list of recommendations with filters
 *
 * @param params - Query parameters including filters, pagination, and sorting
 * @param options - React Query options
 * @returns Query result with recommendations data
 *
 * @example
 * const { data, isLoading, error } = useRecommendations({
 *   status: 'open',
 *   priority: 'high',
 *   page: 1,
 *   limit: 20,
 * });
 */
export function useRecommendations(
  params: ListRecommendationsParams = {},
  options?: UseRecommendationsOptions
): UseQueryResult<ApiResponse<ListRecommendationsResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: recommendationsKeys.list(params),
    queryFn: () => recommendationsApi.list(params, token),
    enabled: options?.enabled !== false,
    staleTime: 3 * 60 * 1000, // 3 minutes (recommendations change frequently)
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook: useRecommendation
 * Fetch a single recommendation by ID
 *
 * @param id - Recommendation ID
 * @param options - React Query options
 * @returns Query result with recommendation data
 *
 * @example
 * const { data, isLoading } = useRecommendation('rec-123');
 */
export function useRecommendation(
  id: string,
  options?: UseRecommendationOptions
): UseQueryResult<ApiResponse<Recommendation>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: recommendationsKeys.detail(id),
    queryFn: () => recommendationsApi.getById(id, token),
    enabled: options?.enabled !== false && !!id,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook: useRecommendationsSummary
 * Fetch aggregated statistics for recommendations
 *
 * @param params - Query parameters for filtering summary
 * @param options - React Query options
 * @returns Query result with summary data
 *
 * @example
 * const { data, isLoading } = useRecommendationsSummary({
 *   status: 'open',
 *   provider: 'AWS',
 * });
 */
export function useRecommendationsSummary(
  params: SummaryQueryParams = {},
  options?: UseRecommendationsSummaryOptions
): UseQueryResult<ApiResponse<RecommendationsSummary>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: recommendationsKeys.summary(params),
    queryFn: () => recommendationsApi.getSummary(params, token),
    enabled: options?.enabled !== false,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook: useGenerateRecommendations
 * Mutation to trigger recommendation generation
 *
 * @returns Mutation result with generate function
 *
 * @example
 * const { mutate: generate, isPending } = useGenerateRecommendations();
 *
 * generate(
 *   { cloudAccountId: 'account-123' },
 *   {
 *     onSuccess: (data) => {
 *       console.log(`Generated ${data.data?.recommendationsGenerated} recommendations`);
 *     },
 *   }
 * );
 */
export function useGenerateRecommendations(): UseMutationResult<
  ApiResponse<GenerateRecommendationsResponse>,
  Error,
  GenerateRecommendationsParams
> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: GenerateRecommendationsParams) =>
      recommendationsApi.generate(params, token),
    onSuccess: () => {
      // Invalidate all recommendations queries to refetch with new data
      queryClient.invalidateQueries({ queryKey: recommendationsKeys.all });
    },
    retry: 1,
    retryDelay: 2000,
  });
}

/**
 * Hook: useApplyRecommendation
 * Mutation to apply a recommendation
 *
 * @returns Mutation result with apply function
 *
 * @example
 * const { mutate: apply, isPending } = useApplyRecommendation();
 *
 * apply(
 *   { id: 'rec-123', notes: 'Applied via automation' },
 *   {
 *     onSuccess: () => {
 *       toast.success('Recommendation applied successfully');
 *     },
 *   }
 * );
 */
export function useApplyRecommendation(): UseMutationResult<
  ApiResponse<Recommendation>,
  Error,
  { id: string; params?: ApplyRecommendationParams }
> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, params = {} }) =>
      recommendationsApi.apply(id, params, token),
    onSuccess: (data, variables) => {
      // Update specific recommendation in cache
      queryClient.setQueryData(
        recommendationsKeys.detail(variables.id),
        data
      );
      // Invalidate lists and summary to reflect status change
      queryClient.invalidateQueries({ queryKey: recommendationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: recommendationsKeys.summaries() });
    },
    retry: 1,
    retryDelay: 2000,
  });
}

/**
 * Hook: useDismissRecommendation
 * Mutation to dismiss a recommendation
 *
 * @returns Mutation result with dismiss function
 *
 * @example
 * const { mutate: dismiss, isPending } = useDismissRecommendation();
 *
 * dismiss(
 *   { id: 'rec-123', params: { reason: 'Not applicable for our use case' } },
 *   {
 *     onSuccess: () => {
 *       toast.success('Recommendation dismissed');
 *     },
 *   }
 * );
 */
export function useDismissRecommendation(): UseMutationResult<
  ApiResponse<Recommendation>,
  Error,
  { id: string; params: DismissRecommendationParams }
> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, params }) =>
      recommendationsApi.dismiss(id, params, token),
    onSuccess: (data, variables) => {
      // Update specific recommendation in cache
      queryClient.setQueryData(
        recommendationsKeys.detail(variables.id),
        data
      );
      // Invalidate lists and summary to reflect status change
      queryClient.invalidateQueries({ queryKey: recommendationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: recommendationsKeys.summaries() });
    },
    retry: 1,
    retryDelay: 2000,
  });
}

/**
 * Hook: useOpenRecommendations
 * Convenience hook to fetch only open recommendations
 *
 * @param params - Query parameters (status is automatically set to 'open')
 * @param options - React Query options
 * @returns Query result with open recommendations
 *
 * @example
 * const { data, isLoading } = useOpenRecommendations({
 *   priority: 'high',
 *   provider: 'AWS',
 * });
 */
export function useOpenRecommendations(
  params: Omit<ListRecommendationsParams, 'status'> = {},
  options?: UseRecommendationsOptions
): UseQueryResult<ApiResponse<ListRecommendationsResponse>> {
  return useRecommendations({ ...params, status: 'open' }, options);
}

/**
 * Hook: useHighPriorityRecommendations
 * Convenience hook to fetch only high priority recommendations
 *
 * @param params - Query parameters (priority is automatically set to 'high')
 * @param options - React Query options
 * @returns Query result with high priority recommendations
 *
 * @example
 * const { data, isLoading } = useHighPriorityRecommendations({
 *   status: 'open',
 * });
 */
export function useHighPriorityRecommendations(
  params: Omit<ListRecommendationsParams, 'priority'> = {},
  options?: UseRecommendationsOptions
): UseQueryResult<ApiResponse<ListRecommendationsResponse>> {
  return useRecommendations({ ...params, priority: 'high' }, options);
}

/**
 * Hook: useOpenHighPriorityRecommendations
 * Convenience hook to fetch open high priority recommendations
 *
 * @param params - Query parameters
 * @param options - React Query options
 * @returns Query result with open high priority recommendations
 *
 * @example
 * const { data, isLoading } = useOpenHighPriorityRecommendations({
 *   provider: 'AWS',
 * });
 */
export function useOpenHighPriorityRecommendations(
  params: Omit<ListRecommendationsParams, 'status' | 'priority'> = {},
  options?: UseRecommendationsOptions
): UseQueryResult<ApiResponse<ListRecommendationsResponse>> {
  return useRecommendations(
    { ...params, status: 'open', priority: 'high' },
    options
  );
}

/**
 * Hook: useFilteredRecommendations
 * Fetch recommendations with multiple filters
 *
 * @param filters - Object with filter options
 * @param options - React Query options
 * @returns Query result with filtered recommendations
 *
 * @example
 * const { data, isLoading } = useFilteredRecommendations({
 *   status: 'open',
 *   type: 'idle_resource',
 *   provider: 'AWS',
 *   priority: 'high',
 * });
 */
export function useFilteredRecommendations(
  filters: {
    status?: RecommendationStatus;
    type?: RecommendationType;
    provider?: Provider;
    priority?: RecommendationPriority;
    page?: number;
    limit?: number;
  } = {},
  options?: UseRecommendationsOptions
): UseQueryResult<ApiResponse<ListRecommendationsResponse>> {
  return useRecommendations(filters, options);
}

/**
 * Utility: Helper to extract data from API response
 * Simplifies data access in components
 */
export function extractRecommendationsData(
  response?: ApiResponse<ListRecommendationsResponse>
): ListRecommendationsResponse | null {
  return response?.success && response.data ? response.data : null;
}

export function extractRecommendationData(
  response?: ApiResponse<Recommendation>
): Recommendation | null {
  return response?.success && response.data ? response.data : null;
}

export function extractSummaryData(
  response?: ApiResponse<RecommendationsSummary>
): RecommendationsSummary | null {
  return response?.success && response.data ? response.data : null;
}
