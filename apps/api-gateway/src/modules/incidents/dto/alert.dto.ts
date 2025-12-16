/**
 * Alert DTOs for Azure Monitor Alerts
 *
 * Provides type-safe data structures for alert management
 *
 * @module modules/incidents/dto
 */

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus = 'active' | 'resolved' | 'suppressed';

/**
 * Alert representation
 */
export interface Alert {
  id: string;
  tenantId: string;
  accountId: string;
  alertId: string;
  alertName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  resourceId?: string;
  resourceType?: string;
  description: string;
  firedAt: Date;
  resolvedAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
}

/**
 * Alert filters
 */
export interface AlertFilters {
  severity?: AlertSeverity[];
  status?: AlertStatus[];
  resourceType?: string;
  timeRange?: TimeRange;
}

/**
 * Time range for queries
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * Create alert DTO
 */
export interface CreateAlertDto {
  tenantId: string;
  accountId: string;
  alertId: string;
  alertName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  resourceId?: string;
  resourceType?: string;
  description: string;
  firedAt: Date;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Update alert DTO
 */
export interface UpdateAlertDto {
  status?: AlertStatus;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Alert response DTO
 */
export interface AlertResponseDto {
  id: string;
  alertId: string;
  alertName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  resourceId?: string;
  resourceType?: string;
  description: string;
  firedAt: string; // ISO string
  resolvedAt?: string; // ISO string
  metadata: Record<string, any>;
}

/**
 * Paginated alert response
 */
export interface PaginatedAlertsResponse {
  alerts: AlertResponseDto[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
