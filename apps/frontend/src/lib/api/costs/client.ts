/**
 * Cost API Client
 * API functions for fetching cost data
 */

import { apiGet } from '../client';
import type {
  CostDataPoint,
  CostSummary,
  ServiceCost,
  CostAnomaly,
  CostMetrics,
  CostQueryParams,
} from './types';
import type { ApiResponse } from '../client';

/**
 * Fetch cost metrics summary
 */
export async function getCostMetrics(
  params: CostQueryParams,
  token?: string
): Promise<ApiResponse<CostMetrics>> {
  const queryParams = new URLSearchParams();

  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.provider && params.provider !== 'all') {
    queryParams.append('provider', params.provider);
  }

  const endpoint = `/api/costs/metrics?${queryParams.toString()}`;
  return apiGet<CostMetrics>(endpoint, token);
}

/**
 * Fetch cost data over time
 */
export async function getCostData(
  params: CostQueryParams,
  token?: string
): Promise<ApiResponse<CostDataPoint[]>> {
  const queryParams = new URLSearchParams();

  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.provider && params.provider !== 'all') {
    queryParams.append('provider', params.provider);
  }
  if (params.granularity) queryParams.append('granularity', params.granularity);

  const endpoint = `/api/costs/data?${queryParams.toString()}`;
  return apiGet<CostDataPoint[]>(endpoint, token);
}

/**
 * Fetch costs by service
 */
export async function getCostsByService(
  params: CostQueryParams,
  token?: string
): Promise<ApiResponse<ServiceCost[]>> {
  const queryParams = new URLSearchParams();

  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.provider && params.provider !== 'all') {
    queryParams.append('provider', params.provider);
  }

  const endpoint = `/api/costs/by-service?${queryParams.toString()}`;
  return apiGet<ServiceCost[]>(endpoint, token);
}

/**
 * Fetch cost anomalies
 */
export async function getCostAnomalies(
  params: CostQueryParams,
  token?: string
): Promise<ApiResponse<CostAnomaly[]>> {
  const queryParams = new URLSearchParams();

  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.provider && params.provider !== 'all') {
    queryParams.append('provider', params.provider);
  }

  const endpoint = `/api/costs/anomalies?${queryParams.toString()}`;
  return apiGet<CostAnomaly[]>(endpoint, token);
}

/**
 * Dismiss an anomaly
 */
export async function dismissAnomaly(
  anomalyId: string,
  token?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiGet<{ success: boolean }>(`/api/costs/anomalies/${anomalyId}/dismiss`, token);
}
