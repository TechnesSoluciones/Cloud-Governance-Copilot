/**
 * Phase 3: Incident Management - Shared TypeScript Types
 *
 * This file contains all TypeScript interfaces and types used across
 * backend services and frontend components for incident management.
 *
 * Generated: 2025-12-15
 * Phase: 3 - Incident Management
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFORMATIONAL = 'informational',
}

export enum IncidentStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum AlertState {
  FIRED = 'fired',
  RESOLVED = 'resolved',
}

export enum ServiceHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  OUTAGE = 'outage',
}

export enum AlertRuleAggregation {
  AVERAGE = 'Average',
  TOTAL = 'Total',
  MINIMUM = 'Minimum',
  MAXIMUM = 'Maximum',
  COUNT = 'Count',
}

export enum AlertRuleOperator {
  GREATER_THAN = 'GreaterThan',
  LESS_THAN = 'LessThan',
  EQUALS = 'Equals',
  NOT_EQUALS = 'NotEquals',
  GREATER_THAN_OR_EQUAL = 'GreaterThanOrEqual',
  LESS_THAN_OR_EQUAL = 'LessThanOrEqual',
}

// ============================================================================
// ALERT DTOs
// ============================================================================

export interface AlertDto {
  id: string;
  alertName: string;
  severity: AlertSeverity;
  state: AlertState;
  affectedResource: string;
  affectedResourceType: string;
  description: string;
  firedTime: Date;
  resolvedTime?: Date;
  monitorCondition: string;
  signalType: string;
  metadata: Record<string, any>;
  tenantId: string;
  subscriptionId: string;
}

export interface AlertFiltersDto {
  severity?: AlertSeverity[];
  state?: AlertState[];
  startTime?: Date;
  endTime?: Date;
  resourceType?: string;
  searchQuery?: string;
  page?: number;
  limit?: number;
}

export interface AlertsResponseDto {
  alerts: AlertDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// ACTIVITY LOG DTOs
// ============================================================================

export interface ActivityLogDto {
  id: string;
  eventTimestamp: Date;
  operationName: string;
  status: string;
  subStatus?: string;
  caller: string;
  resourceId: string;
  resourceGroupName: string;
  resourceProviderName: string;
  category: string;
  level: 'Critical' | 'Error' | 'Warning' | 'Informational' | 'Verbose';
  properties: Record<string, any>;
  tenantId: string;
  subscriptionId: string;
}

export interface ActivityLogFiltersDto {
  startTime?: Date;
  endTime?: Date;
  operationName?: string;
  status?: string;
  resourceGroupName?: string;
  category?: string;
  level?: string[];
  page?: number;
  limit?: number;
}

export interface ActivityLogsResponseDto {
  logs: ActivityLogDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// INCIDENT DTOs (Aggregated from Alerts + Logs)
// ============================================================================

export interface IncidentDto {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: IncidentStatus;
  affectedResources: AffectedResourceDto[];
  alertIds: string[];
  activityLogIds: string[];
  createdAt: Date;
  updatedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  metadata: {
    sourceAlert?: string;
    impactedServices?: string[];
    estimatedImpact?: string;
    [key: string]: any;
  };
  tenantId: string;
  subscriptionId: string;
}

export interface AffectedResourceDto {
  resourceId: string;
  resourceType: string;
  resourceName: string;
  resourceGroupName: string;
  location: string;
  status: string;
}

export interface IncidentTimelineDto {
  incidentId: string;
  timeline: TimelineEventDto[];
}

export interface TimelineEventDto {
  id: string;
  timestamp: Date;
  eventType: 'created' | 'acknowledged' | 'resolved' | 'comment' | 'status_change' | 'alert_fired' | 'activity_logged';
  actor: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface UpdateIncidentStatusDto {
  status: IncidentStatus;
  comment?: string;
}

export interface CreateIncidentCommentDto {
  comment: string;
}

export interface IncidentFiltersDto {
  severity?: AlertSeverity[];
  status?: IncidentStatus[];
  startTime?: Date;
  endTime?: Date;
  searchQuery?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'severity' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface IncidentsResponseDto {
  incidents: IncidentDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// LOG ANALYTICS DTOs
// ============================================================================

export interface LogQueryDto {
  workspaceId: string;
  query: string;
  timespan: {
    start: Date;
    end: Date;
  };
  maxRows?: number;
}

export interface LogQueryResultDto {
  queryId: string;
  tables: LogTableDto[];
  executionTime: number; // milliseconds
  rowCount: number;
  cached: boolean;
}

export interface LogTableDto {
  name: string;
  columns: LogColumnDto[];
  rows: any[][];
}

export interface LogColumnDto {
  name: string;
  type: string;
}

export interface KQLTemplateDto {
  id: string;
  name: string;
  description: string;
  category: 'errors' | 'performance' | 'security' | 'operations' | 'custom';
  query: string;
  parameters?: KQLParameterDto[];
}

export interface KQLParameterDto {
  name: string;
  type: 'string' | 'number' | 'datetime' | 'timespan';
  description: string;
  defaultValue?: any;
  required: boolean;
}

export interface ExecuteKQLQueryDto {
  workspaceId: string;
  query: string;
  timespan: {
    start: string; // ISO 8601
    end: string;   // ISO 8601
  };
  maxRows?: number;
}

// ============================================================================
// ALERT RULES DTOs
// ============================================================================

export interface AlertRuleDto {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  severity: AlertSeverity;
  targetResourceId: string;
  targetResourceType: string;
  metric: string;
  aggregation: AlertRuleAggregation;
  operator: AlertRuleOperator;
  threshold: number;
  windowSize: string; // ISO 8601 duration (PT5M, PT1H, etc.)
  evaluationFrequency: string; // ISO 8601 duration
  actionGroups: string[]; // Array of action group IDs
  autoMitigate: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastEvaluationTime?: Date;
  lastFiredTime?: Date;
  tenantId: string;
  subscriptionId: string;
}

export interface CreateAlertRuleDto {
  name: string;
  description?: string;
  enabled?: boolean;
  severity: AlertSeverity;
  targetResourceId: string;
  metric: string;
  aggregation: AlertRuleAggregation;
  operator: AlertRuleOperator;
  threshold: number;
  windowSize: string;
  evaluationFrequency: string;
  actionGroups?: string[];
  autoMitigate?: boolean;
}

export interface UpdateAlertRuleDto {
  name?: string;
  description?: string;
  enabled?: boolean;
  severity?: AlertSeverity;
  threshold?: number;
  actionGroups?: string[];
  autoMitigate?: boolean;
}

export interface AlertRuleTemplateDto {
  id: string;
  name: string;
  description: string;
  category: 'compute' | 'storage' | 'network' | 'cost' | 'security' | 'custom';
  metric: string;
  aggregation: AlertRuleAggregation;
  operator: AlertRuleOperator;
  threshold: number;
  windowSize: string;
  evaluationFrequency: string;
  severity: AlertSeverity;
  tags: string[];
}

export interface AlertRulesResponseDto {
  rules: AlertRuleDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// SERVICE HEALTH DTOs
// ============================================================================

export interface ServiceHealthDto {
  status: ServiceHealthStatus;
  subscriptionId: string;
  activeIncidents: ServiceHealthIncidentDto[];
  plannedMaintenance: PlannedMaintenanceDto[];
  healthAdvisories: HealthAdvisoryDto[];
  lastChecked: Date;
}

export interface ServiceHealthIncidentDto {
  id: string;
  title: string;
  summary: string;
  impactedServices: ImpactedServiceDto[];
  status: 'Active' | 'Resolved';
  level: 'Critical' | 'Error' | 'Warning' | 'Information';
  startTime: Date;
  endTime?: Date;
  impactedRegions: string[];
  updates: IncidentUpdateDto[];
}

export interface ImpactedServiceDto {
  serviceName: string;
  impactedRegions: string[];
}

export interface IncidentUpdateDto {
  timestamp: Date;
  updateText: string;
  author: string;
}

export interface PlannedMaintenanceDto {
  id: string;
  title: string;
  summary: string;
  impactedServices: ImpactedServiceDto[];
  startTime: Date;
  endTime: Date;
  impactedRegions: string[];
  maintenanceType: 'Planned' | 'Unplanned';
}

export interface HealthAdvisoryDto {
  id: string;
  title: string;
  summary: string;
  publishedTime: Date;
  impactedServices: string[];
  category: 'Security' | 'Reliability' | 'Performance' | 'Other';
}

// ============================================================================
// METRICS DTOs
// ============================================================================

export interface MetricDto {
  resourceId: string;
  metricName: string;
  unit: string;
  timeseries: MetricTimeseriesDto[];
}

export interface MetricTimeseriesDto {
  timestamps: Date[];
  values: (number | null)[];
  aggregation: 'Average' | 'Total' | 'Minimum' | 'Maximum' | 'Count';
}

export interface MetricFiltersDto {
  resourceId: string;
  metricNames: string[];
  aggregation: string[];
  startTime: Date;
  endTime: Date;
  interval: string; // ISO 8601 duration
}

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface PaginationDto {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface ErrorResponseDto {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: Date;
  };
}

export interface SuccessResponseDto<T> {
  data: T;
  timestamp: Date;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type SortOrder = 'asc' | 'desc';

export type DateRangeDto = {
  start: Date;
  end: Date;
};

export type TimeRangePreset = '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';

// ============================================================================
// VALIDATION SCHEMAS (used with Zod)
// ============================================================================

export interface AlertFiltersValidation {
  severity?: string[];
  state?: string[];
  startTime?: string; // ISO 8601
  endTime?: string;   // ISO 8601
  resourceType?: string;
  searchQuery?: string;
  page?: number;
  limit?: number;
}

export interface IncidentFiltersValidation {
  severity?: string[];
  status?: string[];
  startTime?: string; // ISO 8601
  endTime?: string;   // ISO 8601
  searchQuery?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// EXPORT ALL
// ============================================================================

// Types are already exported at their definitions
// No need to re-export them here
