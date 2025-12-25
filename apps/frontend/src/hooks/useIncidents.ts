/**
 * React Query Hooks for Incidents
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
  incidentsApi,
  Incident,
  IncidentDetails,
  Alert,
  ActivityLog,
  Comment,
  ListIncidentsParams,
  ListAlertsParams,
  ActivityLogsParams,
  UpdateIncidentStatusRequest,
  AddCommentRequest,
  ListIncidentsResponse,
  IncidentDetailResponse,
  ListAlertsResponse,
  AlertDetailResponse,
  ActivityLogsResponse,
  UpdateIncidentStatusResponse,
  AddCommentResponse,
} from '@/lib/api/incidents';
import { ApiResponse } from '@/lib/api/client';

// Query Key Factories
export const incidentsKeys = {
  all: ['incidents'] as const,
  lists: () => [...incidentsKeys.all, 'list'] as const,
  list: (params: ListIncidentsParams) => [...incidentsKeys.lists(), params] as const,
  details: () => [...incidentsKeys.all, 'detail'] as const,
  detail: (id: string) => [...incidentsKeys.details(), id] as const,
  alerts: () => [...incidentsKeys.all, 'alerts'] as const,
  alertsList: (params: ListAlertsParams) => [...incidentsKeys.alerts(), 'list', params] as const,
  alertDetail: (id: string) => [...incidentsKeys.alerts(), 'detail', id] as const,
  activityLogs: () => [...incidentsKeys.all, 'activityLogs'] as const,
  activityLogsList: (params: ActivityLogsParams) => [...incidentsKeys.activityLogs(), params] as const,
};

// Hook Options Types
export interface UseIncidentsOptions
  extends Omit<UseQueryOptions<ApiResponse<ListIncidentsResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

export interface UseIncidentOptions
  extends Omit<UseQueryOptions<ApiResponse<IncidentDetailResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

export interface UseAlertsOptions
  extends Omit<UseQueryOptions<ApiResponse<ListAlertsResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

export interface UseAlertOptions
  extends Omit<UseQueryOptions<ApiResponse<AlertDetailResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

export interface UseActivityLogsOptions
  extends Omit<UseQueryOptions<ApiResponse<ActivityLogsResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

/**
 * Hook: useIncidents
 * Fetch paginated list of incidents with filters and auto-refresh
 *
 * @param params - Query parameters including filters, pagination, and sorting
 * @param options - React Query options
 * @returns Query result with incidents data
 *
 * @example
 * const { data, isLoading, error } = useIncidents({
 *   accountId: 'account-123',
 *   severity: 'critical',
 *   status: 'new',
 *   page: 1,
 *   limit: 20,
 * });
 */
export function useIncidents(
  params: ListIncidentsParams = {},
  options?: UseIncidentsOptions
): UseQueryResult<ApiResponse<ListIncidentsResponse>> {
  const { data: session, status } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: incidentsKeys.list(params),
    queryFn: () => {
      if (!token) {
        throw new Error('No authentication token available');
      }
      return incidentsApi.listIncidents(params, token);
    },
    enabled: status === 'authenticated' && !!token && options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds (incidents change frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Auto-refresh every 60 seconds
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error && error.message.includes('authentication')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook: useIncidentById
 * Fetch a single incident by ID with auto-refresh
 *
 * @param id - Incident ID
 * @param options - React Query options
 * @returns Query result with incident details
 *
 * @example
 * const { data, isLoading } = useIncidentById('incident-123');
 */
export function useIncidentById(
  id: string,
  options?: UseIncidentOptions
): UseQueryResult<ApiResponse<IncidentDetailResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: incidentsKeys.detail(id),
    queryFn: () => incidentsApi.getIncident(id, token),
    enabled: !!id && !!token && options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 60 * 1000, // Auto-refresh every 60 seconds
    retry: 2,
    ...options,
  });
}

/**
 * Hook: useAlerts
 * Fetch paginated list of alerts with filters
 *
 * @param params - Query parameters including filters and pagination
 * @param options - React Query options
 * @returns Query result with alerts data
 *
 * @example
 * const { data, isLoading } = useAlerts({
 *   accountId: 'account-123',
 *   severity: 'critical',
 *   status: 'active',
 * });
 */
export function useAlerts(
  params: ListAlertsParams = {},
  options?: UseAlertsOptions
): UseQueryResult<ApiResponse<ListAlertsResponse>> {
  const { data: session, status } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: incidentsKeys.alertsList(params),
    queryFn: () => {
      if (!token) {
        throw new Error('No authentication token available');
      }
      return incidentsApi.listAlerts(params, token);
    },
    enabled: status === 'authenticated' && !!token && options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Auto-refresh every 60 seconds
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error && error.message.includes('authentication')) {
        return false;
      }
      return failureCount < 2;
    },
    ...options,
  });
}

/**
 * Hook: useAlertById
 * Fetch a single alert by ID
 *
 * @param id - Alert ID
 * @param options - React Query options
 * @returns Query result with alert details
 *
 * @example
 * const { data, isLoading } = useAlertById('alert-123');
 */
export function useAlertById(
  id: string,
  options?: UseAlertOptions
): UseQueryResult<ApiResponse<AlertDetailResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: incidentsKeys.alertDetail(id),
    queryFn: () => incidentsApi.getAlert(id, token),
    enabled: !!id && !!token && options?.enabled !== false,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    ...options,
  });
}

/**
 * Hook: useActivityLogs
 * Fetch activity logs with filters
 *
 * @param params - Query parameters including time range and filters
 * @param options - React Query options
 * @returns Query result with activity logs data
 *
 * @example
 * const { data, isLoading } = useActivityLogs({
 *   accountId: 'account-123',
 *   timeRange: '24h',
 * });
 */
export function useActivityLogs(
  params: ActivityLogsParams = {},
  options?: UseActivityLogsOptions
): UseQueryResult<ApiResponse<ActivityLogsResponse>> {
  const { data: session, status } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: incidentsKeys.activityLogsList(params),
    queryFn: () => {
      if (!token) {
        throw new Error('No authentication token available');
      }
      return incidentsApi.getActivityLogs(params, token);
    },
    enabled: status === 'authenticated' && !!token && options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Auto-refresh every 60 seconds
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error && error.message.includes('authentication')) {
        return false;
      }
      return failureCount < 2;
    },
    ...options,
  });
}

/**
 * Hook: useUpdateIncidentStatus
 * Update incident status with optimistic updates
 *
 * @returns Mutation result with update function
 *
 * @example
 * const { mutate: updateStatus, isPending } = useUpdateIncidentStatus();
 *
 * const handleAcknowledge = async () => {
 *   await updateStatus({
 *     id: 'incident-123',
 *     status: 'acknowledged',
 *     notes: 'Investigating the issue',
 *   });
 * };
 */
export function useUpdateIncidentStatus() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIncidentStatusRequest }) =>
      incidentsApi.updateIncidentStatus(id, data, token),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: incidentsKeys.detail(id) });

      // Snapshot previous value
      const previousIncident = queryClient.getQueryData(incidentsKeys.detail(id));

      // Optimistically update
      queryClient.setQueryData(
        incidentsKeys.detail(id),
        (old: ApiResponse<IncidentDetailResponse> | undefined) => {
          if (!old?.data?.data) return old;
          return {
            ...old,
            data: {
              ...old.data,
              data: {
                ...old.data.data,
                status: data.status,
                assignedTo: data.assignedTo || old.data.data.assignedTo,
              },
            },
          };
        }
      );

      return { previousIncident };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousIncident) {
        queryClient.setQueryData(incidentsKeys.detail(variables.id), context.previousIncident);
      }
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: incidentsKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: incidentsKeys.lists() });
    },
    retry: 1,
  });
}

/**
 * Hook: useAddIncidentComment
 * Add comment to incident with optimistic updates
 *
 * @returns Mutation result with add comment function
 *
 * @example
 * const { mutate: addComment, isPending } = useAddIncidentComment();
 *
 * const handleAddComment = async () => {
 *   await addComment({
 *     incidentId: 'incident-123',
 *     content: 'Root cause identified: database connection pool exhausted',
 *   });
 * };
 */
export function useAddIncidentComment() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useMutation({
    mutationFn: ({ incidentId, data }: { incidentId: string; data: AddCommentRequest }) =>
      incidentsApi.addComment(incidentId, data, token),
    onSuccess: (data, variables) => {
      // Invalidate incident detail to refetch with new comment
      queryClient.invalidateQueries({ queryKey: incidentsKeys.detail(variables.incidentId) });
    },
    retry: 1,
  });
}

/**
 * Helper: Extract incidents data from API response
 */
export function extractIncidentsData(
  response: ApiResponse<ListIncidentsResponse> | undefined
): ListIncidentsResponse | null {
  if (!response?.success || !response?.data) {
    return null;
  }
  return response.data;
}

/**
 * Helper: Extract incident detail from API response
 */
export function extractIncidentData(
  response: ApiResponse<IncidentDetailResponse> | undefined
): IncidentDetails | null {
  if (!response?.success || !response?.data) {
    return null;
  }
  return response.data.data;
}

/**
 * Helper: Extract alerts data from API response
 */
export function extractAlertsData(
  response: ApiResponse<ListAlertsResponse> | undefined
): ListAlertsResponse | null {
  if (!response?.success || !response?.data) {
    return null;
  }
  return response.data;
}

/**
 * Helper: Extract alert detail from API response
 */
export function extractAlertData(
  response: ApiResponse<AlertDetailResponse> | undefined
): Alert | null {
  if (!response?.success || !response?.data) {
    return null;
  }
  return response.data.data;
}

/**
 * Helper: Extract activity logs from API response
 */
export function extractActivityLogsData(
  response: ApiResponse<ActivityLogsResponse> | undefined
): ActivityLogsResponse | null {
  if (!response?.success || !response?.data) {
    return null;
  }
  return response.data;
}
