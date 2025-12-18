/**
 * Security API Client
 * Handles all security scanning and findings API calls
 */

import { apiGet, apiPost, apiPatch, ApiResponse } from './client';

// Type Definitions
export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type FindingStatus = 'open' | 'resolved' | 'dismissed';

// Core Data Interfaces
export interface Finding {
  id: string;
  tenantId: string;
  severity: FindingSeverity;
  title: string;
  description: string;
  category: string;
  recommendation: string;
  cloudAccountId: string;
  resourceId: string;
  resourceType: string;
  region: string;
  status: FindingStatus;
  detectedAt: string;
  resolvedAt?: string;
  resolution?: string;
  dismissedAt?: string;
  dismissalReason?: string;
  cisControl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Scan {
  id: string;
  tenantId: string;
  cloudAccountId?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  findingsCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Summary {
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  openCount: number;
  resolvedCount: number;
  dismissedCount: number;
  lastScanDate?: string;
}

// Request Parameter Interfaces
export interface ListFindingsParams {
  page?: number;
  limit?: number;
  severity?: FindingSeverity;
  category?: string;
  status?: FindingStatus;
  cloudAccountId?: string;
  sortBy?: 'detectedAt' | 'severity' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface ListScansParams {
  page?: number;
  limit?: number;
  cloudAccountId?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface TriggerScanParams {
  cloudAccountId?: string;
}

export interface ResolveFindingParams {
  resolution: string;
}

export interface DismissFindingParams {
  dismissalReason: string;
}

// Response Interfaces
export interface ListFindingsResponse {
  data: Finding[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface FindingDetailResponse {
  data: Finding;
}

export interface ListScansResponse {
  data: Scan[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ScanDetailResponse {
  data: Scan;
}

export interface TriggerScanResponse {
  message: string;
  scan: Scan;
}

export interface ResolveFindingResponse {
  message: string;
  finding: Finding;
}

export interface DismissFindingResponse {
  message: string;
  finding: Finding;
}

export interface SummaryResponse {
  data: Summary;
}

/**
 * Security API Client
 * Provides methods for security scanning and findings management
 */
export const securityApi = {
  /**
   * List findings with filters and pagination
   */
  listFindings: async (
    params: ListFindingsParams = {},
    token?: string
  ): Promise<ApiResponse<ListFindingsResponse>> => {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.severity) queryParams.append('severity', params.severity);
    if (params.category) queryParams.append('category', params.category);
    if (params.status) queryParams.append('status', params.status);
    if (params.cloudAccountId) queryParams.append('cloudAccountId', params.cloudAccountId);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const queryString = queryParams.toString();
    const endpoint = `/security/findings${queryString ? `?${queryString}` : ''}`;

    return apiGet<ListFindingsResponse>(endpoint, token);
  },

  /**
   * Get a single finding by ID
   */
  getFinding: async (
    id: string,
    token?: string
  ): Promise<ApiResponse<FindingDetailResponse>> => {
    return apiGet<FindingDetailResponse>(`/security/findings/${id}`, token);
  },

  /**
   * List security scans with filters and pagination
   */
  listScans: async (
    params: ListScansParams = {},
    token?: string
  ): Promise<ApiResponse<ListScansResponse>> => {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.cloudAccountId) queryParams.append('cloudAccountId', params.cloudAccountId);
    if (params.status) queryParams.append('status', params.status);

    const queryString = queryParams.toString();
    const endpoint = `/security/scans${queryString ? `?${queryString}` : ''}`;

    return apiGet<ListScansResponse>(endpoint, token);
  },

  /**
   * Get a single scan by ID
   */
  getScan: async (id: string, token?: string): Promise<ApiResponse<ScanDetailResponse>> => {
    return apiGet<ScanDetailResponse>(`/security/scans/${id}`, token);
  },

  /**
   * Trigger a new security scan
   */
  triggerScan: async (
    params: TriggerScanParams = {},
    token?: string
  ): Promise<ApiResponse<TriggerScanResponse>> => {
    return apiPost<TriggerScanResponse>('/security/scans', params, token);
  },

  /**
   * Resolve a finding
   */
  resolveFinding: async (
    id: string,
    params: ResolveFindingParams,
    token?: string
  ): Promise<ApiResponse<ResolveFindingResponse>> => {
    return apiPatch<ResolveFindingResponse>(
      `/security/findings/${id}/resolve`,
      params,
      token
    );
  },

  /**
   * Dismiss a finding
   */
  dismissFinding: async (
    id: string,
    params: DismissFindingParams,
    token?: string
  ): Promise<ApiResponse<DismissFindingResponse>> => {
    return apiPatch<DismissFindingResponse>(
      `/security/findings/${id}/dismiss`,
      params,
      token
    );
  },

  /**
   * Get security summary statistics
   */
  getSummary: async (token?: string): Promise<ApiResponse<SummaryResponse>> => {
    return apiGet<SummaryResponse>('/security/summary', token);
  },
};
