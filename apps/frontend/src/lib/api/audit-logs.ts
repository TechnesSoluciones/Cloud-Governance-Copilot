/**
 * Audit Logs API Client
 * Handles all audit log API calls
 */

import { apiGet, apiPost, ApiResponse } from './client';

// Type Definitions
export type AuditActionType = 'create' | 'update' | 'delete' | 'access' | 'config';
export type AuditStatus = 'success' | 'failed' | 'warning';

// Core Data Interfaces
export interface AuditLog {
  id: string;
  tenantId: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  actionType: AuditActionType;
  resourceId: string;
  resourceType: string;
  provider: 'AWS' | 'AZURE' | 'GCP';
  status: AuditStatus;
  ipAddress: string;
  location?: string;
  details?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Request Parameter Interfaces
export interface ListAuditLogsParams {
  page?: number;
  limit?: number;
  actionType?: AuditActionType;
  provider?: 'AWS' | 'AZURE' | 'GCP';
  status?: AuditStatus;
  userId?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: 'timestamp' | 'action' | 'user' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// Response Interfaces
export interface ListAuditLogsResponse {
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuditLogDetailResponse {
  data: AuditLog;
}

export interface AuditStatsResponse {
  data: {
    totalEvents: number;
    uniqueUsers: number;
    criticalActions: number;
    successRate: number;
  };
}

export const auditLogsApi = {
  list: async (
    params: ListAuditLogsParams = {},
    token?: string
  ): Promise<ApiResponse<ListAuditLogsResponse>> => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.actionType) queryParams.append('actionType', params.actionType);
    if (params.provider) queryParams.append('provider', params.provider);
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    
    const qs = queryParams.toString();
    return apiGet<ListAuditLogsResponse>('/audit-logs' + (qs ? '?' + qs : ''), token);
  },

  getStats: async (token?: string): Promise<ApiResponse<AuditStatsResponse>> => {
    return apiGet<AuditStatsResponse>('/audit-logs/stats', token);
  },
};
