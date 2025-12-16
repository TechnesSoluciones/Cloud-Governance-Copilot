/**
 * Service Health Module Types
 *
 * Type definitions for service health monitoring and notifications
 *
 * @module modules/service-health/types
 */

// Re-export Azure Service Health types
export type {
  ServiceHealthStatus,
  ServiceStatus,
  ServiceIssue,
  MaintenanceEvent,
  HealthEvent,
  ResourceHealth,
} from '../../../integrations/azure/service-health.service';

/**
 * Service health query parameters
 */
export interface ServiceHealthQueryParams {
  accountId?: string;
  impactType?: 'Incident' | 'Informational' | 'ActionRequired';
  severity?: string;
  status?: string;
  region?: string;
  service?: string;
}

/**
 * Health history query parameters
 */
export interface HealthHistoryQueryParams {
  accountId?: string;
  days?: number;
  eventType?: string;
  status?: string;
}

/**
 * Maintenance query parameters
 */
export interface MaintenanceQueryParams {
  accountId?: string;
  days?: number;
  status?: string;
}

/**
 * Service health statistics
 */
export interface ServiceHealthStats {
  totalEvents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  plannedMaintenance: number;
  affectedServices: number;
  affectedRegions: number;
  criticalEvents: number;
  highPriorityEvents: number;
  averageResolutionTime?: number; // in hours
}

/**
 * Service health response
 */
export interface ServiceHealthResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  serviceHealthEnabled: boolean;
  severityThreshold: 'critical' | 'high' | 'medium' | 'low' | 'all';
  emailEnabled: boolean;
  emailAddress?: string;
  emailFrequency: 'immediate' | 'daily_digest' | 'weekly_digest';
  webhookEnabled: boolean;
  webhookUrl?: string;
  notifyIncidents: boolean;
  notifyMaintenance: boolean;
  notifySecurity: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTimezone: string;
}

/**
 * Notification
 */
export interface Notification {
  id: string;
  tenantId: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  archived: boolean;
  link?: string;
  actionRequired: boolean;
  actionTaken: boolean;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt: Date;
  readAt?: Date;
}

/**
 * Service health subscription
 */
export interface ServiceHealthSubscription {
  id: string;
  tenantId: string;
  userId: string;
  accountId?: string;
  serviceName?: string;
  region?: string;
  eventTypes: string[];
  minSeverity: string;
  active: boolean;
  createdAt: Date;
}
