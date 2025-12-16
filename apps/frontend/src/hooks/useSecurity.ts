/**
 * React Query Hooks for Security
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
  securityApi,
  Finding,
  Scan,
  Summary,
  ListFindingsParams,
  ListScansParams,
  TriggerScanParams,
  ResolveFindingParams,
  DismissFindingParams,
  ListFindingsResponse,
  FindingDetailResponse,
  ListScansResponse,
  ScanDetailResponse,
  TriggerScanResponse,
  ResolveFindingResponse,
  DismissFindingResponse,
  SummaryResponse,
} from '@/lib/api/security';
import { ApiResponse } from '@/lib/api/client';

// Query Key Factories
// Centralized query key management for cache invalidation and optimization
export const securityKeys = {
  all: ['security'] as const,
  findings: () => [...securityKeys.all, 'findings'] as const,
  findingsList: (params: ListFindingsParams) => [...securityKeys.findings(), 'list', params] as const,
  findingsDetails: () => [...securityKeys.findings(), 'detail'] as const,
  findingDetail: (id: string) => [...securityKeys.findingsDetails(), id] as const,
  scans: () => [...securityKeys.all, 'scans'] as const,
  scansList: (params: ListScansParams) => [...securityKeys.scans(), 'list', params] as const,
  scansDetails: () => [...securityKeys.scans(), 'detail'] as const,
  scanDetail: (id: string) => [...securityKeys.scansDetails(), id] as const,
  summary: () => [...securityKeys.all, 'summary'] as const,
};

// Hook Options Types
export interface UseFindingsOptions
  extends Omit<UseQueryOptions<ApiResponse<ListFindingsResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

export interface UseFindingOptions
  extends Omit<UseQueryOptions<ApiResponse<FindingDetailResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

export interface UseScansOptions
  extends Omit<UseQueryOptions<ApiResponse<ListScansResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

export interface UseScanOptions
  extends Omit<UseQueryOptions<ApiResponse<ScanDetailResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

export interface UseSummaryOptions
  extends Omit<UseQueryOptions<ApiResponse<SummaryResponse>>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

/**
 * Hook: useFindings
 * Fetch paginated list of security findings with filters
 *
 * @param params - Query parameters including filters, pagination, and sorting
 * @param options - React Query options
 * @returns Query result with findings data
 *
 * @example
 * const { data, isLoading, error } = useFindings({
 *   severity: 'CRITICAL',
 *   status: 'open',
 *   page: 1,
 *   limit: 20,
 * });
 */
export function useFindings(
  params: ListFindingsParams = {},
  options?: UseFindingsOptions
): UseQueryResult<ApiResponse<ListFindingsResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: securityKeys.findingsList(params),
    queryFn: () => securityApi.listFindings(params, token),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds (findings change during scans)
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

/**
 * Hook: useFinding
 * Fetch a single finding by ID
 *
 * @param id - Finding ID
 * @param options - React Query options
 * @returns Query result with finding details
 *
 * @example
 * const { data, isLoading } = useFinding(findingId);
 */
export function useFinding(
  id: string,
  options?: UseFindingOptions
): UseQueryResult<ApiResponse<FindingDetailResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: securityKeys.findingDetail(id),
    queryFn: () => securityApi.getFinding(id, token),
    enabled: !!id && options?.enabled !== false,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    ...options,
  });
}

/**
 * Hook: useScans
 * Fetch paginated list of security scans with filters
 *
 * @param params - Query parameters including filters and pagination
 * @param options - React Query options
 * @returns Query result with scans data
 *
 * @example
 * const { data, isLoading } = useScans({
 *   status: 'completed',
 *   page: 1,
 *   limit: 10,
 * });
 */
export function useScans(
  params: ListScansParams = {},
  options?: UseScansOptions
): UseQueryResult<ApiResponse<ListScansResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: securityKeys.scansList(params),
    queryFn: () => securityApi.listScans(params, token),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    ...options,
  });
}

/**
 * Hook: useScan
 * Fetch a single scan by ID
 *
 * @param id - Scan ID
 * @param options - React Query options
 * @returns Query result with scan details
 *
 * @example
 * const { data, isLoading } = useScan(scanId);
 */
export function useScan(
  id: string,
  options?: UseScanOptions
): UseQueryResult<ApiResponse<ScanDetailResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: securityKeys.scanDetail(id),
    queryFn: () => securityApi.getScan(id, token),
    enabled: !!id && options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    ...options,
  });
}

/**
 * Hook: useSummary
 * Fetch security summary statistics
 *
 * @param options - React Query options
 * @returns Query result with summary data
 *
 * @example
 * const { data, isLoading } = useSummary();
 */
export function useSummary(
  options?: UseSummaryOptions
): UseQueryResult<ApiResponse<SummaryResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: securityKeys.summary(),
    queryFn: () => securityApi.getSummary(token),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    ...options,
  });
}

/**
 * Hook: useTriggerScan
 * Trigger a new security scan
 *
 * @returns Mutation result with trigger function
 *
 * @example
 * const { triggerScan, isPending } = useTriggerScan();
 *
 * const handleScan = async () => {
 *   await triggerScan({ cloudAccountId: 'account-123' });
 * };
 */
export function useTriggerScan() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useMutation({
    mutationFn: (params: TriggerScanParams = {}) => securityApi.triggerScan(params, token),
    onSuccess: () => {
      // Invalidate scans and summary to refetch updated data
      queryClient.invalidateQueries({ queryKey: securityKeys.scans() });
      queryClient.invalidateQueries({ queryKey: securityKeys.summary() });
    },
    retry: 1,
  });
}

/**
 * Hook: useResolveFinding
 * Resolve a security finding
 *
 * @returns Mutation result with resolve function
 *
 * @example
 * const { resolveFinding, isPending } = useResolveFinding();
 *
 * const handleResolve = async () => {
 *   await resolveFinding({
 *     id: 'finding-123',
 *     resolution: 'Applied security patch',
 *   });
 * };
 */
export function useResolveFinding() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      securityApi.resolveFinding(id, { resolution }, token),
    onSuccess: (data, variables) => {
      // Invalidate findings list and specific finding to refetch updated data
      queryClient.invalidateQueries({ queryKey: securityKeys.findings() });
      queryClient.invalidateQueries({ queryKey: securityKeys.findingDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: securityKeys.summary() });
    },
    retry: 1,
  });
}

/**
 * Hook: useDismissFinding
 * Dismiss a security finding
 *
 * @returns Mutation result with dismiss function
 *
 * @example
 * const { dismissFinding, isPending } = useDismissFinding();
 *
 * const handleDismiss = async () => {
 *   await dismissFinding({
 *     id: 'finding-123',
 *     dismissalReason: 'False positive - resource is decommissioned',
 *   });
 * };
 */
export function useDismissFinding() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useMutation({
    mutationFn: ({ id, dismissalReason }: { id: string; dismissalReason: string }) =>
      securityApi.dismissFinding(id, { dismissalReason }, token),
    onSuccess: (data, variables) => {
      // Invalidate findings list and specific finding to refetch updated data
      queryClient.invalidateQueries({ queryKey: securityKeys.findings() });
      queryClient.invalidateQueries({ queryKey: securityKeys.findingDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: securityKeys.summary() });
    },
    retry: 1,
  });
}

/**
 * Helper: Extract findings data from API response
 * Handles the ApiResponse wrapper and provides type-safe access
 */
export function extractFindingsData(
  response: ApiResponse<ListFindingsResponse> | undefined
): ListFindingsResponse | null {
  if (!response?.success || !response?.data) {
    return null;
  }
  return response.data;
}

/**
 * Helper: Extract finding detail from API response
 * Handles the ApiResponse wrapper and provides type-safe access
 */
export function extractFindingData(
  response: ApiResponse<FindingDetailResponse> | undefined
): Finding | null {
  if (!response?.success || !response?.data) {
    return null;
  }
  return response.data.data;
}

/**
 * Helper: Extract scans data from API response
 * Handles the ApiResponse wrapper and provides type-safe access
 */
export function extractScansData(
  response: ApiResponse<ListScansResponse> | undefined
): ListScansResponse | null {
  if (!response?.success || !response?.data) {
    return null;
  }
  return response.data;
}

/**
 * Helper: Extract scan detail from API response
 * Handles the ApiResponse wrapper and provides type-safe access
 */
export function extractScanData(
  response: ApiResponse<ScanDetailResponse> | undefined
): Scan | null {
  if (!response?.success || !response?.data) {
    return null;
  }
  return response.data.data;
}

/**
 * Helper: Extract summary data from API response
 * Handles the ApiResponse wrapper and provides type-safe access
 */
export function extractSummaryData(
  response: ApiResponse<SummaryResponse> | undefined
): Summary | null {
  if (!response?.success || !response?.data) {
    return null;
  }
  return response.data.data;
}

/**
 * Hook: useSecurityScore
 * Fetch security score with breakdown by categories
 *
 * @param accountId - Optional cloud account ID to filter
 * @param options - React Query options
 * @returns Query result with security score data
 *
 * @example
 * const { data, isLoading } = useSecurityScore('account-123');
 */
export function useSecurityScore(
  accountId?: string,
  options?: UseSummaryOptions
): UseQueryResult<ApiResponse<SummaryResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: [...securityKeys.summary(), 'score', accountId],
    queryFn: () => securityApi.getSummary(token),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    ...options,
  });
}

/**
 * Hook: useSecurityAssessments
 * Fetch security assessments with filters (alias for useFindings with enhanced typing)
 *
 * @param accountId - Optional cloud account ID to filter
 * @param filters - Additional filters for assessments
 * @param options - React Query options
 * @returns Query result with assessments data
 *
 * @example
 * const { data, isLoading } = useSecurityAssessments('account-123', {
 *   severity: 'HIGH',
 *   status: 'open'
 * });
 */
export function useSecurityAssessments(
  accountId?: string,
  filters?: Omit<ListFindingsParams, 'cloudAccountId'>,
  options?: UseFindingsOptions
): UseQueryResult<ApiResponse<ListFindingsResponse>> {
  return useFindings(
    {
      cloudAccountId: accountId,
      ...filters,
    },
    options
  );
}

/**
 * Hook: useComplianceResults
 * Fetch compliance results by standard
 * Note: Currently uses summary data. Backend should provide dedicated endpoint.
 *
 * @param accountId - Optional cloud account ID to filter
 * @param options - React Query options
 * @returns Query result with compliance data
 *
 * @example
 * const { data, isLoading } = useComplianceResults('account-123');
 */
export function useComplianceResults(
  accountId?: string,
  options?: UseSummaryOptions
): UseQueryResult<ApiResponse<SummaryResponse>> {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;

  return useQuery({
    queryKey: [...securityKeys.summary(), 'compliance', accountId],
    queryFn: () => securityApi.getSummary(token),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    ...options,
  });
}

/**
 * Hook: useSecurityRecommendations
 * Fetch security recommendations
 * Note: Currently uses findings with recommendations filter. Backend should provide dedicated endpoint.
 *
 * @param accountId - Optional cloud account ID to filter
 * @param options - React Query options
 * @returns Query result with recommendations data
 *
 * @example
 * const { data, isLoading } = useSecurityRecommendations('account-123');
 */
export function useSecurityRecommendations(
  accountId?: string,
  options?: UseFindingsOptions
): UseQueryResult<ApiResponse<ListFindingsResponse>> {
  return useFindings(
    {
      cloudAccountId: accountId,
      status: 'open',
      sortBy: 'severity',
      sortOrder: 'desc',
      limit: 10,
    },
    options
  );
}
