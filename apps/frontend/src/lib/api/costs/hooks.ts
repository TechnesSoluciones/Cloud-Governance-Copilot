/**
 * Cost API Hooks
 * React Query hooks for fetching cost data
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  getCostMetrics,
  getCostData,
  getCostsByService,
  getCostAnomalies,
  dismissAnomaly,
} from './client';
import type { CostQueryParams } from './types';

/**
 * Hook to fetch cost metrics
 */
export function useCostMetrics(params: CostQueryParams) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;

  return useQuery({
    queryKey: ['costs', 'metrics', params],
    queryFn: () => getCostMetrics(params, token),
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch cost data over time
 */
export function useCostData(params: CostQueryParams) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;

  return useQuery({
    queryKey: ['costs', 'data', params],
    queryFn: () => getCostData(params, token),
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch costs by service
 */
export function useCostsByService(params: CostQueryParams) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;

  return useQuery({
    queryKey: ['costs', 'by-service', params],
    queryFn: () => getCostsByService(params, token),
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch cost anomalies
 */
export function useCostAnomalies(params: CostQueryParams) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;

  return useQuery({
    queryKey: ['costs', 'anomalies', params],
    queryFn: () => getCostAnomalies(params, token),
    enabled: !!token,
    staleTime: 2 * 60 * 1000, // 2 minutes (more frequent for anomalies)
  });
}

/**
 * Hook to dismiss an anomaly
 */
export function useDismissAnomaly() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (anomalyId: string) => dismissAnomaly(anomalyId, token),
    onSuccess: () => {
      // Invalidate anomalies queries to refetch
      queryClient.invalidateQueries({ queryKey: ['costs', 'anomalies'] });
    },
  });
}
