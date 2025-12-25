/**
 * React Query Hooks for Azure Advisor
 * Provides type-safe data fetching with caching, automatic refetching, and error handling
 *
 * Features:
 * - Automatic caching with stale-while-revalidate strategy
 * - Optimistic updates for mutations
 * - Smart cache invalidation
 * - Auto-refresh for active recommendations
 * - Retry logic with exponential backoff
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
import { azureAdvisorApi } from '@/lib/api/azure-advisor';
import { ApiResponse } from '@/lib/api/client';
import {
  AdvisorRecommendationDTO,
  RecommendationSummaryDTO,
  PotentialSavingsDashboardDTO,
  PaginatedRecommendationsResponse,
  ListRecommendationsParams,
  SuppressRecommendationRequest,
  DismissRecommendationRequest,
  ApplyRecommendationRequest,
  AdvisorCategory,
  AdvisorImpact,
  AdvisorStatus,
} from '@/types/azure-advisor';

/**
 * Query Key Factory
 * Centralized query key management for efficient cache invalidation
 */
export const azureAdvisorKeys = {
  all: ['azure-advisor'] as const,
  recommendations: () => [...azureAdvisorKeys.all, 'recommendations'] as const,
  recommendationsList: (params: ListRecommendationsParams) =>
    [...azureAdvisorKeys.recommendations(), 'list', params] as const,
  recommendation: (id: string) =>
    [...azureAdvisorKeys.recommendations(), 'detail', id] as const,
  summary: (filters?: {
    category?: AdvisorCategory | 'all';
    impact?: AdvisorImpact | 'all';
    status?: AdvisorStatus | 'all';
  }) => [...azureAdvisorKeys.all, 'summary', filters] as const,
  savings: () => [...azureAdvisorKeys.all, 'savings'] as const,
};

/**
 * Custom Hook Options
 */
export interface UseAzureAdvisorQueryOptions<T>
  extends Omit<UseQueryOptions<ApiResponse<T>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

/**
 * Hook: useRecommendations
 * Fetch paginated list of Azure Advisor recommendations with filters
 *
 * Features:
 * - Automatic pagination
 * - Multi-filter support (category, impact, status, search)
 * - Sorting
 * - Auto-refresh every 30 minutes for active recommendations
 *
 * @param params - Query parameters for filtering and pagination
 * @param options - React Query options
 * @returns Query result with recommendations data
 *
 * @example
 * const { data, isLoading, error } = useRecommendations({
 *   category: 'Cost',
 *   impact: 'High',
 *   status: 'Active',
 *   page: 1,
 *   pageSize: 50,
 * });
 */
export function useRecommendations(
  params: ListRecommendationsParams = {},
  options?: UseAzureAdvisorQueryOptions<PaginatedRecommendationsResponse>
): UseQueryResult<ApiResponse<PaginatedRecommendationsResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: azureAdvisorKeys.recommendationsList(params),
    queryFn: () => azureAdvisorApi.listRecommendations(params, token),
    enabled: !!token && options?.enabled !== false,
    staleTime: 1000 * 60 * 5, // 5 minutes - recommendations change frequently
    gcTime: 1000 * 60 * 10, // 10 minutes cache time
    refetchInterval: params.status === 'Active' ? 1000 * 60 * 30 : false, // Auto-refresh active every 30 min
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook: useRecommendationById
 * Fetch a single Azure Advisor recommendation by ID
 *
 * @param id - Recommendation ID
 * @param options - React Query options
 * @returns Query result with recommendation details
 *
 * @example
 * const { data, isLoading } = useRecommendationById('rec-123');
 */
export function useRecommendationById(
  id: string,
  options?: UseAzureAdvisorQueryOptions<AdvisorRecommendationDTO>
): UseQueryResult<ApiResponse<AdvisorRecommendationDTO>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: azureAdvisorKeys.recommendation(id),
    queryFn: () => azureAdvisorApi.getRecommendationById(id, token),
    enabled: !!id && !!token && options?.enabled !== false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook: useRecommendationsSummary
 * Fetch aggregated statistics for Azure Advisor recommendations
 *
 * @param filters - Optional filters (category, impact, status)
 * @param options - React Query options
 * @returns Query result with summary data
 *
 * @example
 * const { data, isLoading } = useRecommendationsSummary({
 *   status: 'Active',
 * });
 */
export function useRecommendationsSummary(
  filters?: {
    category?: AdvisorCategory | 'all';
    impact?: AdvisorImpact | 'all';
    status?: AdvisorStatus | 'all';
  },
  options?: UseAzureAdvisorQueryOptions<RecommendationSummaryDTO>
): UseQueryResult<ApiResponse<RecommendationSummaryDTO>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: azureAdvisorKeys.summary(filters),
    queryFn: () => azureAdvisorApi.getSummary(filters, token),
    enabled: !!token && options?.enabled !== false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook: usePotentialSavings
 * Fetch potential savings dashboard data with trends and breakdowns
 *
 * @param options - React Query options
 * @returns Query result with savings dashboard data
 *
 * @example
 * const { data, isLoading } = usePotentialSavings();
 */
export function usePotentialSavings(
  options?: UseAzureAdvisorQueryOptions<PotentialSavingsDashboardDTO>
): UseQueryResult<ApiResponse<PotentialSavingsDashboardDTO>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: azureAdvisorKeys.savings(),
    queryFn: () => azureAdvisorApi.getSavingsDashboard(token),
    enabled: !!token && options?.enabled !== false,
    staleTime: 1000 * 60 * 10, // 10 minutes - savings data changes slowly
    gcTime: 1000 * 60 * 30, // 30 minutes cache time
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook: useSuppressRecommendation
 * Mutation to suppress a recommendation temporarily
 *
 * Features:
 * - Optimistic update
 * - Automatic cache invalidation
 * - Toast notification support
 *
 * @returns Mutation result with suppress function
 *
 * @example
 * const { mutate: suppress, isPending } = useSuppressRecommendation();
 *
 * suppress(
 *   { id: 'rec-123', request: { duration: 30, reason: 'Will address later' } },
 *   {
 *     onSuccess: () => {
 *       toast.success('Recommendation suppressed for 30 days');
 *     },
 *   }
 * );
 */
export function useSuppressRecommendation(): UseMutationResult<
  ApiResponse<AdvisorRecommendationDTO>,
  Error,
  { id: string; request: SuppressRecommendationRequest }
> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }) =>
      azureAdvisorApi.suppressRecommendation(id, request, token),
    onSuccess: (data, variables) => {
      // Update specific recommendation in cache
      queryClient.setQueryData(
        azureAdvisorKeys.recommendation(variables.id),
        data
      );
      // Invalidate lists and summary to reflect status change
      queryClient.invalidateQueries({ queryKey: azureAdvisorKeys.recommendations() });
      queryClient.invalidateQueries({ queryKey: azureAdvisorKeys.summary() });
      queryClient.invalidateQueries({ queryKey: azureAdvisorKeys.savings() });
    },
    retry: 1,
    retryDelay: 2000,
  });
}

/**
 * Hook: useDismissRecommendation
 * Mutation to dismiss a recommendation permanently
 *
 * @returns Mutation result with dismiss function
 *
 * @example
 * const { mutate: dismiss, isPending } = useDismissRecommendation();
 *
 * dismiss(
 *   { id: 'rec-123', request: { reason: 'Not applicable', permanent: true } },
 *   {
 *     onSuccess: () => {
 *       toast.success('Recommendation dismissed');
 *     },
 *   }
 * );
 */
export function useDismissRecommendation(): UseMutationResult<
  ApiResponse<AdvisorRecommendationDTO>,
  Error,
  { id: string; request: DismissRecommendationRequest }
> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }) =>
      azureAdvisorApi.dismissRecommendation(id, request, token),
    onSuccess: (data, variables) => {
      // Update specific recommendation in cache
      queryClient.setQueryData(
        azureAdvisorKeys.recommendation(variables.id),
        data
      );
      // Invalidate lists and summary to reflect status change
      queryClient.invalidateQueries({ queryKey: azureAdvisorKeys.recommendations() });
      queryClient.invalidateQueries({ queryKey: azureAdvisorKeys.summary() });
      queryClient.invalidateQueries({ queryKey: azureAdvisorKeys.savings() });
    },
    retry: 1,
    retryDelay: 2000,
  });
}

/**
 * Hook: useApplyRecommendation
 * Mutation to apply a recommendation (execute remediation)
 *
 * @returns Mutation result with apply function
 *
 * @example
 * const { mutate: apply, isPending } = useApplyRecommendation();
 *
 * apply(
 *   { id: 'rec-123', request: { notes: 'Applied via automation' } },
 *   {
 *     onSuccess: () => {
 *       toast.success('Recommendation applied successfully');
 *     },
 *   }
 * );
 */
export function useApplyRecommendation(): UseMutationResult<
  ApiResponse<AdvisorRecommendationDTO>,
  Error,
  { id: string; request?: ApplyRecommendationRequest }
> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request = {} }) =>
      azureAdvisorApi.applyRecommendation(id, request, token),
    onSuccess: (data, variables) => {
      // Update specific recommendation in cache
      queryClient.setQueryData(
        azureAdvisorKeys.recommendation(variables.id),
        data
      );
      // Invalidate lists and summary to reflect status change
      queryClient.invalidateQueries({ queryKey: azureAdvisorKeys.recommendations() });
      queryClient.invalidateQueries({ queryKey: azureAdvisorKeys.summary() });
      queryClient.invalidateQueries({ queryKey: azureAdvisorKeys.savings() });
    },
    retry: 1,
    retryDelay: 2000,
  });
}

/**
 * Hook: useResolveRecommendation
 * Mutation to mark a recommendation as resolved manually
 *
 * @returns Mutation result with resolve function
 *
 * @example
 * const { mutate: resolve, isPending } = useResolveRecommendation();
 *
 * resolve(
 *   { id: 'rec-123', notes: 'Manually resolved' },
 *   {
 *     onSuccess: () => {
 *       toast.success('Recommendation marked as resolved');
 *     },
 *   }
 * );
 */
export function useResolveRecommendation(): UseMutationResult<
  ApiResponse<AdvisorRecommendationDTO>,
  Error,
  { id: string; notes?: string }
> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }) =>
      azureAdvisorApi.resolveRecommendation(id, notes, token),
    onSuccess: (data, variables) => {
      // Update specific recommendation in cache
      queryClient.setQueryData(
        azureAdvisorKeys.recommendation(variables.id),
        data
      );
      // Invalidate lists and summary to reflect status change
      queryClient.invalidateQueries({ queryKey: azureAdvisorKeys.recommendations() });
      queryClient.invalidateQueries({ queryKey: azureAdvisorKeys.summary() });
      queryClient.invalidateQueries({ queryKey: azureAdvisorKeys.savings() });
    },
    retry: 1,
    retryDelay: 2000,
  });
}

/**
 * Convenience Hooks
 */

/**
 * Hook: useActiveRecommendations
 * Fetch only active recommendations
 */
export function useActiveRecommendations(
  params: Omit<ListRecommendationsParams, 'status'> = {},
  options?: UseAzureAdvisorQueryOptions<PaginatedRecommendationsResponse>
): UseQueryResult<ApiResponse<PaginatedRecommendationsResponse>> {
  return useRecommendations({ ...params, status: 'Active' }, options);
}

/**
 * Hook: useHighImpactRecommendations
 * Fetch only high impact recommendations
 */
export function useHighImpactRecommendations(
  params: Omit<ListRecommendationsParams, 'impact'> = {},
  options?: UseAzureAdvisorQueryOptions<PaginatedRecommendationsResponse>
): UseQueryResult<ApiResponse<PaginatedRecommendationsResponse>> {
  return useRecommendations({ ...params, impact: 'High' }, options);
}

/**
 * Hook: useCostRecommendations
 * Fetch only cost optimization recommendations
 */
export function useCostRecommendations(
  params: Omit<ListRecommendationsParams, 'category'> = {},
  options?: UseAzureAdvisorQueryOptions<PaginatedRecommendationsResponse>
): UseQueryResult<ApiResponse<PaginatedRecommendationsResponse>> {
  return useRecommendations({ ...params, category: 'Cost' }, options);
}

/**
 * Hook: useSecurityRecommendations
 * Fetch only security recommendations
 */
export function useSecurityRecommendations(
  params: Omit<ListRecommendationsParams, 'category'> = {},
  options?: UseAzureAdvisorQueryOptions<PaginatedRecommendationsResponse>
): UseQueryResult<ApiResponse<PaginatedRecommendationsResponse>> {
  return useRecommendations({ ...params, category: 'Security' }, options);
}

/**
 * Hook: useActiveHighImpact
 * Fetch active high impact recommendations
 */
export function useActiveHighImpact(
  params: Omit<ListRecommendationsParams, 'status' | 'impact'> = {},
  options?: UseAzureAdvisorQueryOptions<PaginatedRecommendationsResponse>
): UseQueryResult<ApiResponse<PaginatedRecommendationsResponse>> {
  return useRecommendations(
    { ...params, status: 'Active', impact: 'High' },
    options
  );
}

/**
 * Utility: Extract data from API response
 * Simplifies data access in components
 */
export function extractRecommendationsData(
  response?: ApiResponse<PaginatedRecommendationsResponse>
): PaginatedRecommendationsResponse | null {
  return response?.success && response.data ? response.data : null;
}

export function extractRecommendationData(
  response?: ApiResponse<AdvisorRecommendationDTO>
): AdvisorRecommendationDTO | null {
  return response?.success && response.data ? response.data : null;
}

export function extractSummaryData(
  response?: ApiResponse<RecommendationSummaryDTO>
): RecommendationSummaryDTO | null {
  return response?.success && response.data ? response.data : null;
}

export function extractSavingsData(
  response?: ApiResponse<PotentialSavingsDashboardDTO>
): PotentialSavingsDashboardDTO | null {
  return response?.success && response.data ? response.data : null;
}
