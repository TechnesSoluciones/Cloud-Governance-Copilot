/**
 * Incident DTOs for Incident Management
 *
 * Provides type-safe data structures for incident management
 *
 * @module modules/incidents/dto
 */

import { AlertResponseDto, AlertSeverity } from './alert.dto';
import { ActivityLogResponseDto } from './activity-log.dto';

export type IncidentStatus = 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'closed';

/**
 * Incident representation
 */
export interface Incident {
  id: string;
  tenantId: string;
  accountId: string;
  title: string;
  description?: string;
  severity: AlertSeverity;
  status: IncidentStatus;
  affectedResources: string[];
  alertIds: string[];
  assignedTo?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  alerts?: AlertResponseDto[];
  activityLogs?: ActivityLogResponseDto[];
  comments?: IncidentComment[];
}

/**
 * Incident comment
 */
export interface IncidentComment {
  id: string;
  incidentId: string;
  userId: string;
  comment: string;
  createdAt: Date;
}

/**
 * Incident filters
 */
export interface IncidentFilters {
  status?: IncidentStatus[];
  severity?: AlertSeverity[];
  assignedTo?: string;
}

/**
 * Create incident DTO
 */
export interface CreateIncidentDto {
  tenantId: string;
  accountId: string;
  title: string;
  description?: string;
  severity: AlertSeverity;
  affectedResources?: string[];
  alertIds?: string[];
  assignedTo?: string;
}

/**
 * Update incident status DTO
 */
export interface UpdateIncidentStatusDto {
  status: IncidentStatus;
  notes?: string;
  assignedTo?: string;
}

/**
 * Add comment DTO
 */
export interface AddCommentDto {
  comment: string;
  userId: string;
}

/**
 * Incident response DTO
 */
export interface IncidentResponseDto {
  id: string;
  title: string;
  description?: string;
  severity: AlertSeverity;
  status: IncidentStatus;
  affectedResources: string[];
  alertIds: string[];
  assignedTo?: string;
  acknowledgedAt?: string; // ISO string
  resolvedAt?: string; // ISO string
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  alerts?: AlertResponseDto[];
  activityLogs?: ActivityLogResponseDto[];
  comments?: IncidentCommentResponseDto[];
  timeline?: TimelineEvent[];
}

/**
 * Incident comment response DTO
 */
export interface IncidentCommentResponseDto {
  id: string;
  userId: string;
  comment: string;
  createdAt: string; // ISO string
}

/**
 * Timeline event for incident
 */
export interface TimelineEvent {
  timestamp: string; // ISO string
  type: 'alert_fired' | 'status_change' | 'comment_added' | 'activity_logged';
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Paginated incidents response
 */
export interface PaginatedIncidentsResponse {
  incidents: IncidentResponseDto[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
