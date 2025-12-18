/**
 * Azure Advisor API Client
 * Handles all Azure Advisor recommendations API calls
 *
 * Endpoints:
 * - GET /api/v1/advisor/recommendations - List all recommendations with filters
 * - GET /api/v1/advisor/recommendations/:id - Get single recommendation details
 * - GET /api/v1/advisor/summary - Get recommendations summary
 * - POST /api/v1/advisor/recommendations/:id/suppress - Suppress a recommendation
 * - POST /api/v1/advisor/recommendations/:id/dismiss - Dismiss a recommendation
 * - POST /api/v1/advisor/recommendations/:id/apply - Apply a recommendation
 * - POST /api/v1/advisor/recommendations/:id/resolve - Mark recommendation as resolved
 * - GET /api/v1/advisor/savings - Get potential savings dashboard data
 */

import { apiGet, apiPost, ApiResponse } from './client';
import {
  AdvisorRecommendationDTO,
  RecommendationSummaryDTO,
  PotentialSavingsDashboardDTO,
  PaginatedRecommendationsResponse,
  ListRecommendationsParams,
  SuppressRecommendationRequest,
  DismissRecommendationRequest,
  ApplyRecommendationRequest,
  AdvisorCategory,
  AdvisorImpact,
  AdvisorStatus,
} from '@/types/azure-advisor';

/**
 * Build query string from parameters
 */
function buildQueryString(params: Record<string, any>): string {
  const filteredParams = Object.entries(params)
    .filter(([_, value]) => {
      // Exclude undefined, null, empty string, and 'all' values
      return value !== undefined && value !== null && value !== '' && value !== 'all';
    })
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);

  return filteredParams.length > 0 ? `?${filteredParams.join('&')}` : '';
}

/**
 * Azure Advisor API Client
 */
export const azureAdvisorApi = {
  /**
   * List recommendations with filters and pagination
   * GET /api/v1/advisor/recommendations
   *
   * @param params - Query parameters for filtering and pagination
   * @param token - Authentication token
   * @returns Paginated list of recommendations
   *
   * @example
   * const result = await azureAdvisorApi.listRecommendations({
   *   category: 'Cost',
   *   impact: 'High',
   *   status: 'Active',
   *   page: 1,
   *   pageSize: 50,
   * }, token);
   */
  listRecommendations: async (
    params: ListRecommendationsParams = {},
    token?: string
  ): Promise<ApiResponse<PaginatedRecommendationsResponse>> => {
    const queryParams: Record<string, any> = {
      category: params.category,
      impact: params.impact,
      status: params.status,
      searchQuery: params.searchQuery,
      page: params.page || 1,
      pageSize: params.pageSize || 50,
      sortBy: params.sortBy || 'lastUpdated',
      sortOrder: params.sortOrder || 'desc',
    };

    const queryString = buildQueryString(queryParams);
    return apiGet<PaginatedRecommendationsResponse>(
      `/advisor/recommendations${queryString}`,
      token
    );
  },

  /**
   * Get a single recommendation by ID
   * GET /api/v1/advisor/recommendations/:id
   *
   * @param id - Recommendation ID
   * @param token - Authentication token
   * @returns Single recommendation details
   *
   * @example
   * const result = await azureAdvisorApi.getRecommendationById('rec-123', token);
   */
  getRecommendationById: async (
    id: string,
    token?: string
  ): Promise<ApiResponse<AdvisorRecommendationDTO>> => {
    return apiGet<AdvisorRecommendationDTO>(
      `/advisor/recommendations/${id}`,
      token
    );
  },

  /**
   * Get recommendations summary with aggregated statistics
   * GET /api/v1/advisor/summary
   *
   * @param filters - Optional filters (category, impact, status)
   * @param token - Authentication token
   * @returns Summary with counts and totals by category, impact, status
   *
   * @example
   * const result = await azureAdvisorApi.getSummary({ status: 'Active' }, token);
   */
  getSummary: async (
    filters?: {
      category?: AdvisorCategory | 'all';
      impact?: AdvisorImpact | 'all';
      status?: AdvisorStatus | 'all';
    },
    token?: string
  ): Promise<ApiResponse<RecommendationSummaryDTO>> => {
    const queryParams: Record<string, any> = {
      category: filters?.category,
      impact: filters?.impact,
      status: filters?.status,
    };

    const queryString = buildQueryString(queryParams);
    return apiGet<RecommendationSummaryDTO>(
      `/advisor/summary${queryString}`,
      token
    );
  },

  /**
   * Get potential savings dashboard data
   * GET /api/v1/advisor/savings
   *
   * @param token - Authentication token
   * @returns Dashboard data with savings breakdown, trends, and top opportunities
   *
   * @example
   * const result = await azureAdvisorApi.getSavingsDashboard(token);
   */
  getSavingsDashboard: async (
    token?: string
  ): Promise<ApiResponse<PotentialSavingsDashboardDTO>> => {
    return apiGet<PotentialSavingsDashboardDTO>(
      '/advisor/savings',
      token
    );
  },

  /**
   * Suppress a recommendation temporarily
   * POST /api/v1/advisor/recommendations/:id/suppress
   *
   * @param id - Recommendation ID
   * @param request - Suppression duration and reason
   * @param token - Authentication token
   * @returns Updated recommendation
   *
   * @example
   * const result = await azureAdvisorApi.suppressRecommendation(
   *   'rec-123',
   *   { duration: 30, reason: 'Will address next quarter' },
   *   token
   * );
   */
  suppressRecommendation: async (
    id: string,
    request: SuppressRecommendationRequest,
    token?: string
  ): Promise<ApiResponse<AdvisorRecommendationDTO>> => {
    return apiPost<AdvisorRecommendationDTO>(
      `/advisor/recommendations/${id}/suppress`,
      request,
      token
    );
  },

  /**
   * Dismiss a recommendation permanently
   * POST /api/v1/advisor/recommendations/:id/dismiss
   *
   * @param id - Recommendation ID
   * @param request - Dismissal reason
   * @param token - Authentication token
   * @returns Updated recommendation
   *
   * @example
   * const result = await azureAdvisorApi.dismissRecommendation(
   *   'rec-123',
   *   { reason: 'Not applicable to our architecture', permanent: true },
   *   token
   * );
   */
  dismissRecommendation: async (
    id: string,
    request: DismissRecommendationRequest,
    token?: string
  ): Promise<ApiResponse<AdvisorRecommendationDTO>> => {
    return apiPost<AdvisorRecommendationDTO>(
      `/advisor/recommendations/${id}/dismiss`,
      request,
      token
    );
  },

  /**
   * Apply a recommendation (execute remediation)
   * POST /api/v1/advisor/recommendations/:id/apply
   *
   * @param id - Recommendation ID
   * @param request - Application parameters (notes, scheduling)
   * @param token - Authentication token
   * @returns Updated recommendation
   *
   * @example
   * const result = await azureAdvisorApi.applyRecommendation(
   *   'rec-123',
   *   { notes: 'Applied via automation', applyAutomatically: true },
   *   token
   * );
   */
  applyRecommendation: async (
    id: string,
    request: ApplyRecommendationRequest = {},
    token?: string
  ): Promise<ApiResponse<AdvisorRecommendationDTO>> => {
    return apiPost<AdvisorRecommendationDTO>(
      `/advisor/recommendations/${id}/apply`,
      request,
      token
    );
  },

  /**
   * Mark recommendation as resolved manually
   * POST /api/v1/advisor/recommendations/:id/resolve
   *
   * @param id - Recommendation ID
   * @param notes - Optional resolution notes
   * @param token - Authentication token
   * @returns Updated recommendation
   *
   * @example
   * const result = await azureAdvisorApi.resolveRecommendation(
   *   'rec-123',
   *   'Manually resolved by updating resource configuration',
   *   token
   * );
   */
  resolveRecommendation: async (
    id: string,
    notes?: string,
    token?: string
  ): Promise<ApiResponse<AdvisorRecommendationDTO>> => {
    return apiPost<AdvisorRecommendationDTO>(
      `/advisor/recommendations/${id}/resolve`,
      { notes },
      token
    );
  },

  /**
   * Convenience: Get only active recommendations
   *
   * @param params - Query parameters (status is set to 'Active')
   * @param token - Authentication token
   * @returns Active recommendations
   */
  getActiveRecommendations: async (
    params: Omit<ListRecommendationsParams, 'status'> = {},
    token?: string
  ): Promise<ApiResponse<PaginatedRecommendationsResponse>> => {
    return azureAdvisorApi.listRecommendations(
      { ...params, status: 'Active' },
      token
    );
  },

  /**
   * Convenience: Get high impact recommendations
   *
   * @param params - Query parameters (impact is set to 'High')
   * @param token - Authentication token
   * @returns High impact recommendations
   */
  getHighImpactRecommendations: async (
    params: Omit<ListRecommendationsParams, 'impact'> = {},
    token?: string
  ): Promise<ApiResponse<PaginatedRecommendationsResponse>> => {
    return azureAdvisorApi.listRecommendations(
      { ...params, impact: 'High' },
      token
    );
  },

  /**
   * Convenience: Get cost recommendations
   *
   * @param params - Query parameters (category is set to 'Cost')
   * @param token - Authentication token
   * @returns Cost optimization recommendations
   */
  getCostRecommendations: async (
    params: Omit<ListRecommendationsParams, 'category'> = {},
    token?: string
  ): Promise<ApiResponse<PaginatedRecommendationsResponse>> => {
    return azureAdvisorApi.listRecommendations(
      { ...params, category: 'Cost' },
      token
    );
  },

  /**
   * Convenience: Get security recommendations
   *
   * @param params - Query parameters (category is set to 'Security')
   * @param token - Authentication token
   * @returns Security recommendations
   */
  getSecurityRecommendations: async (
    params: Omit<ListRecommendationsParams, 'category'> = {},
    token?: string
  ): Promise<ApiResponse<PaginatedRecommendationsResponse>> => {
    return azureAdvisorApi.listRecommendations(
      { ...params, category: 'Security' },
      token
    );
  },

  /**
   * Convenience: Get active high impact recommendations
   *
   * @param params - Query parameters
   * @param token - Authentication token
   * @returns Active high impact recommendations
   */
  getActiveHighImpact: async (
    params: Omit<ListRecommendationsParams, 'status' | 'impact'> = {},
    token?: string
  ): Promise<ApiResponse<PaginatedRecommendationsResponse>> => {
    return azureAdvisorApi.listRecommendations(
      { ...params, status: 'Active', impact: 'High' },
      token
    );
  },
};

/**
 * Export type-safe API methods
 */
export const {
  listRecommendations,
  getRecommendationById,
  getSummary,
  getSavingsDashboard,
  suppressRecommendation,
  dismissRecommendation,
  applyRecommendation,
  resolveRecommendation,
  getActiveRecommendations,
  getHighImpactRecommendations,
  getCostRecommendations,
  getSecurityRecommendations,
  getActiveHighImpact,
} = azureAdvisorApi;
