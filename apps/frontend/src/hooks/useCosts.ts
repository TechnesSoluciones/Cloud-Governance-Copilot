/**
 * React Query Hooks for FinOps Cost Data
 * Provides type-safe data fetching with caching, automatic refetching, and error handling
 */

import { useQuery, UseQueryResult, UseQueryOptions } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  finopsApi,
  CostQueryParams,
  AnomalyQueryParams,
  CostsResponse,
  CostsByServiceResponse,
  CostTrendsResponse,
  AnomaliesResponse,
  Provider,
  DateRangeParams,
  AnomalySeverity,
} from '@/lib/api/finops';
import { ApiResponse } from '@/lib/api/client';

// Query Key Factories
// Centralized query key management for cache invalidation and optimization
export const finopsKeys = {
  all: ['finops'] as const,
  costs: () => [...finopsKeys.all, 'costs'] as const,
  costsWithParams: (params: CostQueryParams) =>
    [...finopsKeys.costs(), params] as const,
  costsByService: () => [...finopsKeys.all, 'costs-by-service'] as const,
  costsByServiceWithParams: (params: CostQueryParams) =>
    [...finopsKeys.costsByService(), params] as const,
  trends: () => [...finopsKeys.all, 'trends'] as const,
  trendsWithParams: (params: CostQueryParams) =>
    [...finopsKeys.trends(), params] as const,
  anomalies: () => [...finopsKeys.all, 'anomalies'] as const,
  anomaliesWithParams: (params: AnomalyQueryParams) =>
    [...finopsKeys.anomalies(), params] as const,
};

// Hook Options Types
export interface UseCostsOptions extends Omit<UseQueryOptions<ApiResponse<CostsResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

export interface UseCostsByServiceOptions extends Omit<UseQueryOptions<ApiResponse<CostsByServiceResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

export interface UseCostTrendsOptions extends Omit<UseQueryOptions<ApiResponse<CostTrendsResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

export interface UseAnomaliesOptions extends Omit<UseQueryOptions<ApiResponse<AnomaliesResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

/**
 * Hook: useCosts
 * Fetch cost data with optional filters
 *
 * @param params - Query parameters including date range and filters
 * @param options - React Query options
 * @returns Query result with cost data
 *
 * @example
 * const { data, isLoading, error } = useCosts({
 *   startDate: '2024-01-01',
 *   endDate: '2024-01-31',
 *   provider: 'AWS',
 * });
 */
export function useCosts(
  params: CostQueryParams,
  options?: UseCostsOptions
): UseQueryResult<ApiResponse<CostsResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: finopsKeys.costsWithParams(params),
    queryFn: () => finopsApi.getCosts(params, token),
    enabled: options?.enabled !== false && !!params.startDate && !!params.endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook: useCostsByService
 * Fetch costs grouped by service
 *
 * @param params - Query parameters including date range and filters
 * @param options - React Query options
 * @returns Query result with service-grouped cost data
 *
 * @example
 * const { data, isLoading } = useCostsByService({
 *   startDate: '2024-01-01',
 *   endDate: '2024-01-31',
 *   provider: 'AWS',
 * });
 */
export function useCostsByService(
  params: CostQueryParams,
  options?: UseCostsByServiceOptions
): UseQueryResult<ApiResponse<CostsByServiceResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: finopsKeys.costsByServiceWithParams(params),
    queryFn: () => finopsApi.getCostsByService(params, token),
    enabled: options?.enabled !== false && !!params.startDate && !!params.endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook: useCostTrends
 * Fetch cost trends over time
 *
 * @param params - Query parameters including date range and filters
 * @param options - React Query options
 * @returns Query result with trend data
 *
 * @example
 * const { data, isLoading } = useCostTrends({
 *   startDate: '2024-01-01',
 *   endDate: '2024-01-31',
 *   provider: 'ALL',
 * });
 */
export function useCostTrends(
  params: CostQueryParams,
  options?: UseCostTrendsOptions
): UseQueryResult<ApiResponse<CostTrendsResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: finopsKeys.trendsWithParams(params),
    queryFn: () => finopsApi.getCostTrends(params, token),
    enabled: options?.enabled !== false && !!params.startDate && !!params.endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook: useAnomalies
 * Fetch anomaly detection results
 *
 * @param params - Query parameters including date range and filters
 * @param options - React Query options
 * @returns Query result with anomaly data
 *
 * @example
 * const { data, isLoading } = useAnomalies({
 *   startDate: '2024-01-01',
 *   endDate: '2024-01-31',
 *   severity: 'high',
 * });
 */
export function useAnomalies(
  params: AnomalyQueryParams,
  options?: UseAnomaliesOptions
): UseQueryResult<ApiResponse<AnomaliesResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: finopsKeys.anomaliesWithParams(params),
    queryFn: () => finopsApi.getAnomalies(params, token),
    enabled: options?.enabled !== false && !!params.startDate && !!params.endDate,
    staleTime: 3 * 60 * 1000, // 3 minutes (anomalies need more frequent updates)
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook: useProviderCosts
 * Convenience hook to fetch costs for a specific provider
 *
 * @param provider - Cloud provider (AWS, AZURE, or ALL)
 * @param dateRange - Start and end dates
 * @param options - React Query options
 * @returns Query result with provider-specific cost data
 *
 * @example
 * const { data, isLoading } = useProviderCosts(
 *   'AWS',
 *   { startDate: '2024-01-01', endDate: '2024-01-31' }
 * );
 */
export function useProviderCosts(
  provider: Provider,
  dateRange: DateRangeParams,
  options?: UseCostsOptions
): UseQueryResult<ApiResponse<CostsResponse>> {
  return useCosts({ ...dateRange, provider }, options);
}

/**
 * Hook: useHighSeverityAnomalies
 * Convenience hook to fetch only high-severity anomalies
 *
 * @param dateRange - Start and end dates
 * @param options - React Query options
 * @returns Query result with high-severity anomalies
 *
 * @example
 * const { data, isLoading } = useHighSeverityAnomalies({
 *   startDate: '2024-01-01',
 *   endDate: '2024-01-31',
 * });
 */
export function useHighSeverityAnomalies(
  dateRange: DateRangeParams,
  options?: UseAnomaliesOptions
): UseQueryResult<ApiResponse<AnomaliesResponse>> {
  return useAnomalies({ ...dateRange, severity: 'high' }, options);
}

/**
 * Hook: useCombinedCostData
 * Fetch all cost-related data in parallel for dashboard views
 *
 * @param params - Query parameters including date range and filters
 * @returns Object containing all query results
 *
 * @example
 * const {
 *   costs,
 *   costsByService,
 *   trends,
 *   anomalies,
 *   isLoading,
 *   hasError
 * } = useCombinedCostData({
 *   startDate: '2024-01-01',
 *   endDate: '2024-01-31',
 *   provider: 'ALL',
 * });
 */
export function useCombinedCostData(params: CostQueryParams) {
  const costs = useCosts(params);
  const costsByService = useCostsByService(params);
  const trends = useCostTrends(params);
  const anomalies = useAnomalies(params);

  return {
    costs,
    costsByService,
    trends,
    anomalies,
    isLoading:
      costs.isLoading ||
      costsByService.isLoading ||
      trends.isLoading ||
      anomalies.isLoading,
    hasError:
      costs.isError ||
      costsByService.isError ||
      trends.isError ||
      anomalies.isError,
    isSuccess:
      costs.isSuccess &&
      costsByService.isSuccess &&
      trends.isSuccess &&
      anomalies.isSuccess,
  };
}

/**
 * Utility: Helper to extract data from API response
 * Simplifies data access in components
 */
export function extractCostData(response?: ApiResponse<CostsResponse>): CostsResponse | null {
  return response?.success && response.data ? response.data : null;
}

export function extractServiceData(
  response?: ApiResponse<CostsByServiceResponse>
): CostsByServiceResponse | null {
  return response?.success && response.data ? response.data : null;
}

export function extractTrendData(
  response?: ApiResponse<CostTrendsResponse>
): CostTrendsResponse | null {
  return response?.success && response.data ? response.data : null;
}

export function extractAnomalyData(
  response?: ApiResponse<AnomaliesResponse>
): AnomaliesResponse | null {
  return response?.success && response.data ? response.data : null;
}
