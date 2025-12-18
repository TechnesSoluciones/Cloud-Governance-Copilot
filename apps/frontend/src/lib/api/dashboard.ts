/**
 * Dashboard API Client
 * Handles all dashboard overview and health data API calls for Azure
 */

import { apiGet, ApiResponse } from './client';

// Type Definitions
export interface ResourceByType {
  type: string;
  count: number;
}

export interface ResourceByLocation {
  location: string;
  count: number;
}

export interface TopService {
  service: string;
  cost: number;
}

export interface RecentAlert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: Date;
}

export interface DashboardOverview {
  resources: {
    total: number;
    byType: ResourceByType[];
    byLocation: ResourceByLocation[];
  };
  costs: {
    currentMonth: number;
    previousMonth: number;
    trend: 'up' | 'down' | 'stable';
    percentageChange: number;
    topServices: TopService[];
  };
  security: {
    score: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
  };
  alerts: {
    active: number;
    recent: RecentAlert[];
  };
}

export interface VirtualMachinesStatus {
  total: number;
  running: number;
  stopped: number;
  deallocated: number;
}

export interface ResourcesByLocation {
  location: string;
  count: number;
  percentage: number;
}

export interface RecentActivityItem {
  timestamp: Date;
  resourceId: string;
  changeType: string;
  description: string;
}

export interface HealthStatus {
  virtualMachines: VirtualMachinesStatus;
  resourcesByLocation: ResourcesByLocation[];
  recentActivity: RecentActivityItem[];
}

// Response Wrappers
export interface DashboardOverviewResponse {
  data: DashboardOverview;
}

export interface HealthStatusResponse {
  data: HealthStatus;
}

// Utility Functions
/**
 * Build query string from parameters
 */
function buildQueryString(params: Record<string, any>): string {
  const filteredParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);

  return filteredParams.length > 0 ? `?${filteredParams.join('&')}` : '';
}

// API Client
export const dashboardApi = {
  /**
   * Fetch dashboard overview data
   * GET /api/v1/dashboard/overview
   */
  getOverview: async (
    accountId: string,
    token?: string
  ): Promise<ApiResponse<DashboardOverviewResponse>> => {
    if (!accountId) {
      throw new Error('Account ID is required');
    }

    const queryString = buildQueryString({ accountId });
    return apiGet<DashboardOverviewResponse>(`/dashboard/overview${queryString}`, token);
  },

  /**
   * Fetch health status data
   * GET /api/v1/dashboard/health
   */
  getHealth: async (
    accountId: string,
    token?: string
  ): Promise<ApiResponse<HealthStatusResponse>> => {
    if (!accountId) {
      throw new Error('Account ID is required');
    }

    const queryString = buildQueryString({ accountId });
    return apiGet<HealthStatusResponse>(`/dashboard/health${queryString}`, token);
  },
};

// Export utility functions for external use
export const dashboardUtils = {
  buildQueryString,
};
