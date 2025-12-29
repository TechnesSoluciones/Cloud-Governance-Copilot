/**
 * React Query Hooks for Audit Logs
 */

import {
  useQuery,
  UseQueryResult,
  UseQueryOptions,
} from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  auditLogsApi,
  AuditLog,
  ListAuditLogsParams,
  ListAuditLogsResponse,
  AuditStatsResponse,
} from '@/lib/api/audit-logs';
import { ApiResponse } from '@/lib/api/client';

export const auditLogsKeys = {
  all: ['audit-logs'] as const,
  lists: () => [...auditLogsKeys.all, 'list'] as const,
  list: (params: ListAuditLogsParams) => [...auditLogsKeys.lists(), params] as const,
  stats: () => [...auditLogsKeys.all, 'stats'] as const,
};

export interface UseAuditLogsOptions
  extends Omit<UseQueryOptions<ApiResponse<ListAuditLogsResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

export interface UseAuditStatsOptions
  extends Omit<UseQueryOptions<ApiResponse<AuditStatsResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

export function useAuditLogs(
  params: ListAuditLogsParams = {},
  options?: UseAuditLogsOptions
): UseQueryResult<ApiResponse<ListAuditLogsResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: auditLogsKeys.list(params),
    queryFn: () => auditLogsApi.list(params, token),
    enabled: !!token && options?.enabled !== false,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    ...options,
  });
}

export function useAuditStats(
  options?: UseAuditStatsOptions
): UseQueryResult<ApiResponse<AuditStatsResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: auditLogsKeys.stats(),
    queryFn: () => auditLogsApi.getStats(token),
    enabled: !!token && options?.enabled !== false,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    ...options,
  });
}

export function extractAuditLogsData(
  response?: ApiResponse<ListAuditLogsResponse>
): ListAuditLogsResponse | null {
  return response?.success && response.data ? response.data : null;
}

export function extractStatsData(
  response?: ApiResponse<AuditStatsResponse>
): AuditStatsResponse['data'] | null {
  return response?.success && response.data ? response.data.data : null;
}
