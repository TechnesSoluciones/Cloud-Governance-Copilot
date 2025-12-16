/**
 * Incidents API Client
 * Provides type-safe API calls for incident management
 */

import { apiGet, apiPatch, apiPost, ApiResponse } from './client';

// Types
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'closed';
export type AlertStatus = 'active' | 'resolved' | 'suppressed';
export type EventType = 'alert_fired' | 'status_changed' | 'comment_added' | 'resource_affected' | 'resolved' | 'assigned';

export interface Alert {
  id: string;
  name: string;
  severity: IncidentSeverity;
  status: AlertStatus;
  resourceId: string;
  resourceName: string;
  resourceType: string;
  description: string;
  firedAt: string;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  location: string;
  status: string;
  provider: 'azure' | 'aws' | 'gcp';
  metadata?: Record<string, any>;
}

export interface Comment {
  id: string;
  incidentId: string;
  author: string;
  authorEmail: string;
  content: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  type: EventType;
  title: string;
  description?: string;
  timestamp: string;
  actor?: string;
  metadata?: Record<string, any>;
}

export interface ActivityLog {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details?: string;
  metadata?: Record<string, any>;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedResourcesCount: number;
  affectedResources: string[];
  alertIds: string[];
  assignedTo?: string;
  assignedToEmail?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentDetails extends Incident {
  alerts: Alert[];
  resources: Resource[];
  activityLogs: ActivityLog[];
  comments: Comment[];
  timeline: TimelineEvent[];
}

// Request/Response types
export interface ListIncidentsParams {
  accountId?: string;
  severity?: IncidentSeverity | IncidentSeverity[];
  status?: IncidentStatus | IncidentStatus[];
  dateFrom?: string;
  dateTo?: string;
  resourceType?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'severity';
  sortOrder?: 'asc' | 'desc';
}

export interface ListIncidentsResponse {
  data: Incident[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metadata: {
    activeCount: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
}

export interface IncidentDetailResponse {
  data: IncidentDetails;
}

export interface ListAlertsParams {
  accountId?: string;
  incidentId?: string;
  severity?: IncidentSeverity;
  status?: AlertStatus;
  resourceType?: string;
  page?: number;
  limit?: number;
}

export interface ListAlertsResponse {
  data: Alert[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AlertDetailResponse {
  data: Alert;
}

export interface ActivityLogsParams {
  accountId?: string;
  incidentId?: string;
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface ActivityLogsResponse {
  data: ActivityLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdateIncidentStatusRequest {
  status: IncidentStatus;
  notes?: string;
  assignedTo?: string;
}

export interface UpdateIncidentStatusResponse {
  data: Incident;
  message: string;
}

export interface AddCommentRequest {
  content: string;
}

export interface AddCommentResponse {
  data: Comment;
  message: string;
}

// API Client
class IncidentsApiClient {
  /**
   * Get list of incidents with filters
   */
  async listIncidents(
    params: ListIncidentsParams = {},
    token?: string
  ): Promise<ApiResponse<ListIncidentsResponse>> {
    const queryParams = new URLSearchParams();

    if (params.accountId) queryParams.append('accountId', params.accountId);
    if (params.severity) {
      const severities = Array.isArray(params.severity) ? params.severity : [params.severity];
      severities.forEach(s => queryParams.append('severity', s));
    }
    if (params.status) {
      const statuses = Array.isArray(params.status) ? params.status : [params.status];
      statuses.forEach(s => queryParams.append('status', s));
    }
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params.resourceType) queryParams.append('resourceType', params.resourceType);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const query = queryParams.toString();
    const endpoint = `/api/v1/incidents${query ? `?${query}` : ''}`;

    return apiGet<ListIncidentsResponse>(endpoint, token);
  }

  /**
   * Get incident by ID
   */
  async getIncident(
    id: string,
    token?: string
  ): Promise<ApiResponse<IncidentDetailResponse>> {
    return apiGet<IncidentDetailResponse>(`/api/v1/incidents/${id}`, token);
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(
    id: string,
    data: UpdateIncidentStatusRequest,
    token?: string
  ): Promise<ApiResponse<UpdateIncidentStatusResponse>> {
    return apiPatch<UpdateIncidentStatusResponse>(
      `/api/v1/incidents/${id}/status`,
      data,
      token
    );
  }

  /**
   * Add comment to incident
   */
  async addComment(
    incidentId: string,
    data: AddCommentRequest,
    token?: string
  ): Promise<ApiResponse<AddCommentResponse>> {
    return apiPost<AddCommentResponse>(
      `/api/v1/incidents/${incidentId}/comments`,
      data,
      token
    );
  }

  /**
   * Get list of alerts
   */
  async listAlerts(
    params: ListAlertsParams = {},
    token?: string
  ): Promise<ApiResponse<ListAlertsResponse>> {
    const queryParams = new URLSearchParams();

    if (params.accountId) queryParams.append('accountId', params.accountId);
    if (params.incidentId) queryParams.append('incidentId', params.incidentId);
    if (params.severity) queryParams.append('severity', params.severity);
    if (params.status) queryParams.append('status', params.status);
    if (params.resourceType) queryParams.append('resourceType', params.resourceType);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    const endpoint = `/api/v1/alerts${query ? `?${query}` : ''}`;

    return apiGet<ListAlertsResponse>(endpoint, token);
  }

  /**
   * Get alert by ID
   */
  async getAlert(
    id: string,
    token?: string
  ): Promise<ApiResponse<AlertDetailResponse>> {
    return apiGet<AlertDetailResponse>(`/api/v1/alerts/${id}`, token);
  }

  /**
   * Get activity logs
   */
  async getActivityLogs(
    params: ActivityLogsParams = {},
    token?: string
  ): Promise<ApiResponse<ActivityLogsResponse>> {
    const queryParams = new URLSearchParams();

    if (params.accountId) queryParams.append('accountId', params.accountId);
    if (params.incidentId) queryParams.append('incidentId', params.incidentId);
    if (params.timeRange) queryParams.append('timeRange', params.timeRange);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    const endpoint = `/api/v1/activity-logs${query ? `?${query}` : ''}`;

    return apiGet<ActivityLogsResponse>(endpoint, token);
  }
}

// Export singleton instance
export const incidentsApi = new IncidentsApiClient();
