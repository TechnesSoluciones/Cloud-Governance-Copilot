/**
 * React Query Hook for Dashboard Data
 * Provides type-safe data fetching with caching, automatic refetching, and error handling
 */

import { useQuery, UseQueryResult, UseQueryOptions } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  dashboardApi,
  DashboardOverview,
  HealthStatus,
  DashboardOverviewResponse,
  HealthStatusResponse,
} from '@/lib/api/dashboard';
import { ApiResponse } from '@/lib/api/client';
import { useState, useEffect } from 'react';

// Query Key Factories
export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: (accountId: string) => [...dashboardKeys.all, 'overview', accountId] as const,
  health: (accountId: string) => [...dashboardKeys.all, 'health', accountId] as const,
};

// Hook Options Types
export interface UseDashboardOverviewOptions
  extends Omit<UseQueryOptions<ApiResponse<DashboardOverviewResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

export interface UseDashboardHealthOptions
  extends Omit<UseQueryOptions<ApiResponse<HealthStatusResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

/**
 * Hook: useDashboardOverview
 * Fetch dashboard overview data with auto-refresh
 *
 * @param accountId - Cloud account ID
 * @param options - React Query options
 * @returns Query result with overview data
 *
 * @example
 * const { data, isLoading, error } = useDashboardOverview('account-123');
 */
export function useDashboardOverview(
  accountId: string,
  options?: UseDashboardOverviewOptions
): UseQueryResult<ApiResponse<DashboardOverviewResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: dashboardKeys.overview(accountId),
    queryFn: () => dashboardApi.getOverview(accountId, token),
    enabled: !!accountId && !!token && options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook: useDashboardHealth
 * Fetch dashboard health status with auto-refresh
 *
 * @param accountId - Cloud account ID
 * @param options - React Query options
 * @returns Query result with health data
 *
 * @example
 * const { data, isLoading, error } = useDashboardHealth('account-123');
 */
export function useDashboardHealth(
  accountId: string,
  options?: UseDashboardHealthOptions
): UseQueryResult<ApiResponse<HealthStatusResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: dashboardKeys.health(accountId),
    queryFn: () => dashboardApi.getHealth(accountId, token),
    enabled: !!accountId && !!token && options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook: useDashboard
 * Combined hook that fetches both overview and health data
 * Provides a unified interface with loading and error states
 *
 * @param accountId - Cloud account ID
 * @returns Object containing overview, health, loading states, and errors
 *
 * @example
 * const {
 *   overview,
 *   health,
 *   isLoading,
 *   error,
 *   refetch
 * } = useDashboard('account-123');
 */
export function useDashboard(accountId: string) {
  const overviewQuery = useDashboardOverview(accountId);
  const healthQuery = useDashboardHealth(accountId);

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update overview when query succeeds
  useEffect(() => {
    if (overviewQuery.data?.success && overviewQuery.data?.data) {
      setOverview(overviewQuery.data.data.data);
    }
  }, [overviewQuery.data]);

  // Update health when query succeeds
  useEffect(() => {
    if (healthQuery.data?.success && healthQuery.data?.data) {
      setHealth(healthQuery.data.data.data);
    }
  }, [healthQuery.data]);

  // Update loading state
  useEffect(() => {
    setIsLoading(overviewQuery.isLoading || healthQuery.isLoading);
  }, [overviewQuery.isLoading, healthQuery.isLoading]);

  // Update error state
  useEffect(() => {
    if (overviewQuery.error) {
      setError(overviewQuery.error instanceof Error ? overviewQuery.error.message : 'Failed to fetch overview data');
    } else if (healthQuery.error) {
      setError(healthQuery.error instanceof Error ? healthQuery.error.message : 'Failed to fetch health data');
    } else if (!overviewQuery.data?.success) {
      setError(overviewQuery.data?.error?.message || 'Failed to fetch overview data');
    } else if (!healthQuery.data?.success) {
      setError(healthQuery.data?.error?.message || 'Failed to fetch health data');
    } else {
      setError(null);
    }
  }, [overviewQuery.error, healthQuery.error, overviewQuery.data, healthQuery.data]);

  const refetch = () => {
    overviewQuery.refetch();
    healthQuery.refetch();
  };

  return {
    overview,
    health,
    isLoading,
    error,
    refetch,
    isRefetching: overviewQuery.isRefetching || healthQuery.isRefetching,
    lastUpdated: overviewQuery.dataUpdatedAt > healthQuery.dataUpdatedAt
      ? overviewQuery.dataUpdatedAt
      : healthQuery.dataUpdatedAt,
  };
}

/**
 * Helper: Extract overview data from API response
 */
export function extractOverviewData(
  response?: ApiResponse<DashboardOverviewResponse>
): DashboardOverview | null {
  if (!response?.success || !response?.data) {
    return null;
  }
  return response.data.data;
}

/**
 * Helper: Extract health data from API response
 */
export function extractHealthData(
  response?: ApiResponse<HealthStatusResponse>
): HealthStatus | null {
  if (!response?.success || !response?.data) {
    return null;
  }
  return response.data.data;
}
