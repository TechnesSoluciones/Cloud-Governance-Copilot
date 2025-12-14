/**
 * FinOps API Client
 * Handles all cost data and anomaly detection API calls
 */

import { apiGet, ApiResponse } from './client';

// Type Definitions
export type Provider = 'AWS' | 'AZURE' | 'ALL';
export type Currency = 'USD' | 'EUR' | 'GBP';
export type AnomalySeverity = 'low' | 'medium' | 'high';

// Core Data Interfaces
export interface CloudCostData {
  id: string;
  provider: 'AWS' | 'AZURE';
  date: string;
  amount: number;
  currency: Currency;
  service: string;
  accountId: string;
  region?: string;
  metadata?: Record<string, any>;
}

export interface CostByService {
  service: string;
  provider: string;
  totalCost: number;
  currency: Currency;
  percentage: number;
  itemCount: number;
}

export interface CostTrend {
  date: string;
  aws: number;
  azure: number;
  total: number;
  currency: Currency;
}

export interface Anomaly {
  id: string;
  date: string;
  service: string;
  provider: string;
  expectedCost: number;
  actualCost: number;
  deviation: number;
  deviationPercentage: number;
  severity: AnomalySeverity;
  description?: string;
}

// Request Parameter Interfaces
export interface DateRangeParams {
  startDate: string; // YYYY-MM-DD format
  endDate: string;   // YYYY-MM-DD format
}

export interface CostQueryParams extends DateRangeParams {
  provider?: Provider;
  service?: string;
  accountId?: string;
  limit?: number;
  offset?: number;
}

export interface AnomalyQueryParams extends DateRangeParams {
  provider?: Provider;
  service?: string;
  severity?: AnomalySeverity;
  minDeviation?: number;
}

// Response Wrappers
export interface CostsResponse {
  costs: CloudCostData[];
  total: number;
  summary: {
    totalCost: number;
    currency: Currency;
    itemCount: number;
    dateRange: DateRangeParams;
  };
}

export interface CostsByServiceResponse {
  services: CostByService[];
  total: number;
  summary: {
    totalCost: number;
    currency: Currency;
    serviceCount: number;
  };
}

export interface CostTrendsResponse {
  trends: CostTrend[];
  summary: {
    totalCost: number;
    averageDailyCost: number;
    currency: Currency;
    dateRange: DateRangeParams;
  };
}

export interface AnomaliesResponse {
  anomalies: Anomaly[];
  total: number;
  summary: {
    high: number;
    medium: number;
    low: number;
    totalDeviation: number;
    dateRange: DateRangeParams;
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
 * Validate date format (YYYY-MM-DD)
 */
function validateDateFormat(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return false;
  }
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
}

/**
 * Validate date range parameters
 */
function validateDateRange(params: DateRangeParams): void {
  if (!validateDateFormat(params.startDate)) {
    throw new Error(`Invalid startDate format: ${params.startDate}. Expected YYYY-MM-DD`);
  }
  if (!validateDateFormat(params.endDate)) {
    throw new Error(`Invalid endDate format: ${params.endDate}. Expected YYYY-MM-DD`);
  }

  const start = new Date(params.startDate);
  const end = new Date(params.endDate);

  if (start > end) {
    throw new Error('startDate must be before or equal to endDate');
  }
}

// API Client
export const finopsApi = {
  /**
   * Fetch cost data with optional filters
   * GET /api/v1/finops/costs
   */
  getCosts: async (
    params: CostQueryParams,
    token?: string
  ): Promise<ApiResponse<CostsResponse>> => {
    validateDateRange(params);

    const queryParams: Record<string, any> = {
      startDate: params.startDate,
      endDate: params.endDate,
    };

    if (params.provider && params.provider !== 'ALL') {
      queryParams.provider = params.provider;
    }
    if (params.service) {
      queryParams.service = params.service;
    }
    if (params.accountId) {
      queryParams.accountId = params.accountId;
    }
    if (params.limit) {
      queryParams.limit = params.limit;
    }
    if (params.offset) {
      queryParams.offset = params.offset;
    }

    const queryString = buildQueryString(queryParams);
    return apiGet<CostsResponse>(`/api/v1/finops/costs${queryString}`, token);
  },

  /**
   * Fetch costs grouped by service
   * GET /api/v1/finops/costs/by-service
   */
  getCostsByService: async (
    params: CostQueryParams,
    token?: string
  ): Promise<ApiResponse<CostsByServiceResponse>> => {
    validateDateRange(params);

    const queryParams: Record<string, any> = {
      startDate: params.startDate,
      endDate: params.endDate,
    };

    if (params.provider && params.provider !== 'ALL') {
      queryParams.provider = params.provider;
    }
    if (params.accountId) {
      queryParams.accountId = params.accountId;
    }

    const queryString = buildQueryString(queryParams);
    return apiGet<CostsByServiceResponse>(`/api/v1/finops/costs/by-service${queryString}`, token);
  },

  /**
   * Fetch cost trends over time
   * GET /api/v1/finops/costs/trends
   */
  getCostTrends: async (
    params: CostQueryParams,
    token?: string
  ): Promise<ApiResponse<CostTrendsResponse>> => {
    validateDateRange(params);

    const queryParams: Record<string, any> = {
      startDate: params.startDate,
      endDate: params.endDate,
    };

    if (params.provider && params.provider !== 'ALL') {
      queryParams.provider = params.provider;
    }
    if (params.service) {
      queryParams.service = params.service;
    }
    if (params.accountId) {
      queryParams.accountId = params.accountId;
    }

    const queryString = buildQueryString(queryParams);
    return apiGet<CostTrendsResponse>(`/api/v1/finops/costs/trends${queryString}`, token);
  },

  /**
   * Fetch anomaly detection results
   * GET /api/v1/finops/anomalies
   */
  getAnomalies: async (
    params: AnomalyQueryParams,
    token?: string
  ): Promise<ApiResponse<AnomaliesResponse>> => {
    validateDateRange(params);

    const queryParams: Record<string, any> = {
      startDate: params.startDate,
      endDate: params.endDate,
    };

    if (params.provider && params.provider !== 'ALL') {
      queryParams.provider = params.provider;
    }
    if (params.service) {
      queryParams.service = params.service;
    }
    if (params.severity) {
      queryParams.severity = params.severity;
    }
    if (params.minDeviation !== undefined) {
      queryParams.minDeviation = params.minDeviation;
    }

    const queryString = buildQueryString(queryParams);
    return apiGet<AnomaliesResponse>(`/api/v1/finops/anomalies${queryString}`, token);
  },

  /**
   * Get cost summary for a specific provider
   * Convenience method that fetches and summarizes cost data
   */
  getProviderSummary: async (
    provider: Provider,
    params: DateRangeParams,
    token?: string
  ): Promise<ApiResponse<CostsResponse>> => {
    return finopsApi.getCosts({ ...params, provider }, token);
  },

  /**
   * Get high-severity anomalies only
   * Convenience method for critical alerts
   */
  getHighSeverityAnomalies: async (
    params: DateRangeParams,
    token?: string
  ): Promise<ApiResponse<AnomaliesResponse>> => {
    return finopsApi.getAnomalies({ ...params, severity: 'high' }, token);
  },
};

// Export utility functions for external use
export const finopsUtils = {
  buildQueryString,
  validateDateFormat,
  validateDateRange,
};
