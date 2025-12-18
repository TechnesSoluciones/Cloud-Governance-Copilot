/**
 * Recommendations API Client
 * Handles all cost optimization recommendations API calls
 */

import { apiGet, apiPost, ApiResponse } from './client';
import { Provider, Currency } from './finops';

// Type Definitions
export type RecommendationType =
  | 'idle_resource'
  | 'rightsize'
  | 'reserved_instance'
  | 'unused_resource'
  | 'delete_snapshot';

export type RecommendationStatus = 'open' | 'applied' | 'dismissed';
export type RecommendationPriority = 'high' | 'medium' | 'low';
export type SavingsPeriod = 'monthly' | 'yearly';

// Core Data Interfaces
export interface Recommendation {
  id: string;
  tenantId: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  provider: Provider;
  service: string;
  resourceId: string;
  title: string;
  description: string;
  estimatedSavings: number;
  savingsPeriod: SavingsPeriod;
  status: RecommendationStatus;
  actionable: boolean;
  actionScript?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  appliedAt?: string;
}

// Request Parameter Interfaces
export interface ListRecommendationsParams {
  status?: RecommendationStatus;
  type?: RecommendationType;
  provider?: Provider;
  priority?: RecommendationPriority;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'estimatedSavings' | 'priority' | 'provider';
  sortOrder?: 'asc' | 'desc';
}

export interface GenerateRecommendationsParams {
  cloudAccountId?: string;
}

export interface ApplyRecommendationParams {
  notes?: string;
}

export interface DismissRecommendationParams {
  reason: string;
}

export interface SummaryQueryParams {
  status?: RecommendationStatus;
  provider?: Provider;
}

// Response Wrappers
export interface ListRecommendationsResponse {
  recommendations: Recommendation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GenerateRecommendationsResponse {
  recommendationsGenerated: number;
  totalEstimatedSavings: number;
  errors: string[];
}

export interface RecommendationsSummary {
  totalRecommendations: number;
  totalEstimatedSavings: number;
  byType: {
    [key in RecommendationType]?: {
      count: number;
      savings: number;
    };
  };
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
  byProvider: {
    AWS: number;
    AZURE: number;
  };
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

/**
 * Get human-readable label for recommendation type
 */
export function getRecommendationTypeLabel(type: RecommendationType): string {
  const labels: Record<RecommendationType, string> = {
    idle_resource: 'Idle Resource',
    rightsize: 'Rightsize Instance',
    reserved_instance: 'Reserved Instance',
    unused_resource: 'Unused Resource',
    delete_snapshot: 'Delete Old Snapshot',
  };
  return labels[type];
}

/**
 * Get human-readable label for priority
 */
export function getPriorityLabel(priority: RecommendationPriority): string {
  const labels: Record<RecommendationPriority, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  return labels[priority];
}

/**
 * Get color class for priority badge
 */
export function getPriorityColor(priority: RecommendationPriority): string {
  const colors: Record<RecommendationPriority, string> = {
    high: 'bg-error/10 text-error',
    medium: 'bg-warning/10 text-warning',
    low: 'bg-info/10 text-info',
  };
  return colors[priority];
}

/**
 * Get color class for status badge
 */
export function getStatusColor(status: RecommendationStatus): string {
  const colors: Record<RecommendationStatus, string> = {
    open: 'bg-cloud-blue/10 text-cloud-blue',
    applied: 'bg-success/10 text-success',
    dismissed: 'bg-gray-500/10 text-gray-600',
  };
  return colors[status];
}

/**
 * Format savings amount with currency
 */
export function formatSavings(amount: number, currency: Currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate total estimated savings from recommendations list
 */
export function calculateTotalSavings(recommendations: Recommendation[]): number {
  return recommendations.reduce((sum, rec) => sum + rec.estimatedSavings, 0);
}

/**
 * Group recommendations by type
 */
export function groupByType(recommendations: Recommendation[]): Record<RecommendationType, Recommendation[]> {
  return recommendations.reduce((groups, rec) => {
    if (!groups[rec.type]) {
      groups[rec.type] = [];
    }
    groups[rec.type].push(rec);
    return groups;
  }, {} as Record<RecommendationType, Recommendation[]>);
}

/**
 * Group recommendations by priority
 */
export function groupByPriority(recommendations: Recommendation[]): Record<RecommendationPriority, Recommendation[]> {
  return recommendations.reduce((groups, rec) => {
    if (!groups[rec.priority]) {
      groups[rec.priority] = [];
    }
    groups[rec.priority].push(rec);
    return groups;
  }, {} as Record<RecommendationPriority, Recommendation[]>);
}

// API Client
export const recommendationsApi = {
  /**
   * Generate recommendations for tenant
   * POST /api/v1/finops/recommendations/generate
   */
  generate: async (
    params: GenerateRecommendationsParams = {},
    token?: string
  ): Promise<ApiResponse<GenerateRecommendationsResponse>> => {
    return apiPost<GenerateRecommendationsResponse>(
      '/finops/recommendations/generate',
      params,
      token
    );
  },

  /**
   * List recommendations with filters and pagination
   * GET /api/v1/finops/recommendations
   */
  list: async (
    params: ListRecommendationsParams = {},
    token?: string
  ): Promise<ApiResponse<ListRecommendationsResponse>> => {
    const queryParams: Record<string, any> = {};

    if (params.status) queryParams.status = params.status;
    if (params.type) queryParams.type = params.type;
    if (params.provider && params.provider !== 'ALL') queryParams.provider = params.provider;
    if (params.priority) queryParams.priority = params.priority;
    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;
    if (params.sortBy) queryParams.sortBy = params.sortBy;
    if (params.sortOrder) queryParams.sortOrder = params.sortOrder;

    const queryString = buildQueryString(queryParams);
    return apiGet<ListRecommendationsResponse>(
      `/finops/recommendations${queryString}`,
      token
    );
  },

  /**
   * Get recommendations summary with aggregated statistics
   * GET /api/v1/finops/recommendations/summary
   */
  getSummary: async (
    params: SummaryQueryParams = {},
    token?: string
  ): Promise<ApiResponse<RecommendationsSummary>> => {
    const queryParams: Record<string, any> = {};

    if (params.status) queryParams.status = params.status;
    if (params.provider && params.provider !== 'ALL') queryParams.provider = params.provider;

    const queryString = buildQueryString(queryParams);
    return apiGet<RecommendationsSummary>(
      `/finops/recommendations/summary${queryString}`,
      token
    );
  },

  /**
   * Get a single recommendation by ID
   * GET /api/v1/finops/recommendations/:id
   */
  getById: async (
    id: string,
    token?: string
  ): Promise<ApiResponse<Recommendation>> => {
    return apiGet<Recommendation>(
      `/finops/recommendations/${id}`,
      token
    );
  },

  /**
   * Apply a recommendation
   * POST /api/v1/finops/recommendations/:id/apply
   */
  apply: async (
    id: string,
    params: ApplyRecommendationParams = {},
    token?: string
  ): Promise<ApiResponse<Recommendation>> => {
    return apiPost<Recommendation>(
      `/finops/recommendations/${id}/apply`,
      params,
      token
    );
  },

  /**
   * Dismiss a recommendation
   * POST /api/v1/finops/recommendations/:id/dismiss
   */
  dismiss: async (
    id: string,
    params: DismissRecommendationParams,
    token?: string
  ): Promise<ApiResponse<Recommendation>> => {
    return apiPost<Recommendation>(
      `/finops/recommendations/${id}/dismiss`,
      params,
      token
    );
  },

  /**
   * Convenience: Get only open recommendations
   */
  getOpen: async (
    params: Omit<ListRecommendationsParams, 'status'> = {},
    token?: string
  ): Promise<ApiResponse<ListRecommendationsResponse>> => {
    return recommendationsApi.list({ ...params, status: 'open' }, token);
  },

  /**
   * Convenience: Get only high priority recommendations
   */
  getHighPriority: async (
    params: Omit<ListRecommendationsParams, 'priority'> = {},
    token?: string
  ): Promise<ApiResponse<ListRecommendationsResponse>> => {
    return recommendationsApi.list({ ...params, priority: 'high' }, token);
  },

  /**
   * Convenience: Get open high priority recommendations
   */
  getOpenHighPriority: async (
    params: Omit<ListRecommendationsParams, 'status' | 'priority'> = {},
    token?: string
  ): Promise<ApiResponse<ListRecommendationsResponse>> => {
    return recommendationsApi.list(
      { ...params, status: 'open', priority: 'high' },
      token
    );
  },
};

// Export utility functions
export const recommendationsUtils = {
  buildQueryString,
  getRecommendationTypeLabel,
  getPriorityLabel,
  getPriorityColor,
  getStatusColor,
  formatSavings,
  calculateTotalSavings,
  groupByType,
  groupByPriority,
};
