/**
 * Activity Log DTOs for Azure Monitor Activity Logs
 *
 * Provides type-safe data structures for activity log management
 *
 * @module modules/incidents/dto
 */

import { TimeRange } from './alert.dto';

export type ActivityLogLevel = 'Critical' | 'Error' | 'Warning' | 'Informational' | 'Verbose';
export type ActivityLogStatus = 'Succeeded' | 'Failed' | 'InProgress' | 'Canceled';

/**
 * Activity log entry representation
 */
export interface ActivityLog {
  id: string;
  tenantId: string;
  accountId: string;
  operationName: string;
  operationId?: string;
  status: ActivityLogStatus;
  caller?: string;
  resourceId?: string;
  resourceType?: string;
  eventTimestamp: Date;
  level: ActivityLogLevel;
  description?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

/**
 * Activity log filters
 */
export interface ActivityLogFilters {
  status?: ActivityLogStatus[];
  level?: ActivityLogLevel[];
  operationName?: string;
  resourceType?: string;
  timeRange: TimeRange;
}

/**
 * Create activity log DTO
 */
export interface CreateActivityLogDto {
  tenantId: string;
  accountId: string;
  operationName: string;
  operationId?: string;
  status: ActivityLogStatus;
  caller?: string;
  resourceId?: string;
  resourceType?: string;
  eventTimestamp: Date;
  level: ActivityLogLevel;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Activity log response DTO
 */
export interface ActivityLogResponseDto {
  id: string;
  operationName: string;
  operationId?: string;
  status: ActivityLogStatus;
  caller?: string;
  resourceId?: string;
  resourceType?: string;
  eventTimestamp: string; // ISO string
  level: ActivityLogLevel;
  description?: string;
  metadata: Record<string, any>;
}

/**
 * Paginated activity logs response
 */
export interface PaginatedActivityLogsResponse {
  logs: ActivityLogResponseDto[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
