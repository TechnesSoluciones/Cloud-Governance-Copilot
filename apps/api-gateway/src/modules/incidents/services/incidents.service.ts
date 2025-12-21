/**
 * Incidents Service
 *
 * Orchestrates incident management by correlating alerts and activity logs
 * from Azure Monitor into actionable incidents
 *
 * Features:
 * - Alert aggregation into incidents
 * - Activity log correlation
 * - Incident lifecycle management
 * - Caching for active incidents (5 min TTL)
 * - Timeline generation
 *
 * @module modules/incidents/services
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
// Temporarily disabled - Azure SDK dependencies missing
// import { AzureMonitorService } from '../../../integrations/azure/monitor.service';
import type { CloudProviderCredentials } from '../../../integrations/cloud-provider.interface';
import {
  Alert,
  AlertFilters,
  AlertResponseDto,
  AlertSeverity,
  CreateAlertDto,
  TimeRange,
} from '../dto/alert.dto';
import {
  ActivityLog,
  ActivityLogFilters,
  ActivityLogResponseDto,
  CreateActivityLogDto,
} from '../dto/activity-log.dto';
import {
  Incident,
  IncidentResponseDto,
  IncidentStatus,
  CreateIncidentDto,
  UpdateIncidentStatusDto,
  AddCommentDto,
  IncidentComment,
  TimelineEvent,
  IncidentFilters,
} from '../dto/incident.dto';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedData<T> {
  data: T;
  timestamp: number;
}

/**
 * Incidents Service
 */
export class IncidentsService {
  private prisma: PrismaClient;
  private cache: Map<string, CachedData<any>>;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.cache = new Map();
  }

  // ============================================================
  // Alert Management
  // ============================================================

  /**
   * Gets alerts from Azure Monitor with optional filtering
   *
   * @param accountId - Azure account ID
   * @param credentials - Azure credentials
   * @param filters - Alert filters
   * @returns Array of alerts
   */
  async getAlerts(
    accountId: string,
    credentials: CloudProviderCredentials,
    filters?: AlertFilters
  ): Promise<AlertResponseDto[]> {
    const cacheKey = `alerts:${accountId}:${JSON.stringify(filters)}`;
    const cached = this.getFromCache<AlertResponseDto[]>(cacheKey);

    if (cached) {
      console.log(`[IncidentsService] Returning cached alerts for account ${accountId}`);
      return cached;
    }

    // Temporarily disabled - Azure SDK dependencies missing
    // const monitorService = new AzureMonitorService(credentials);
    //
    // const azureAlerts = await monitorService.getAlerts({
    //   severity: filters?.severity,
    //   status: filters?.status?.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
    //   resourceType: filters?.resourceType,
    //   timeRange: filters?.timeRange,
    // });
    //
    // const alerts: AlertResponseDto[] = azureAlerts.map((alert) => ({
    //   id: alert.id,
    //   alertId: alert.id,
    //   alertName: alert.name,
    //   severity: alert.severity,
    //   status: this.normalizeAlertStatus(alert.status),
    //   resourceId: alert.affectedResources[0],
    //   resourceType: this.extractResourceType(alert.affectedResources[0]),
    //   description: alert.description,
    //   firedAt: alert.firedDateTime.toISOString(),
    //   resolvedAt: alert.resolvedDateTime?.toISOString(),
    //   metadata: {},
    // }));

    // Temporary: Return empty array until Azure SDK is available
    const alerts: AlertResponseDto[] = [];
    console.log(`[IncidentsService] Azure Monitor temporarily unavailable - returning empty alerts for account ${accountId}`);

    this.setCache(cacheKey, alerts);
    return alerts;
  }

  /**
   * Stores alerts in database
   */
  async storeAlerts(tenantId: string, accountId: string, alerts: CreateAlertDto[]): Promise<void> {
    for (const alert of alerts) {
      await this.prisma.$executeRaw`
        INSERT INTO azure_alerts (
          tenant_id, account_id, alert_id, alert_name, severity, status,
          resource_id, resource_type, description, fired_at, resolved_at, metadata
        ) VALUES (
          ${tenantId}::uuid, ${accountId}, ${alert.alertId}, ${alert.alertName},
          ${alert.severity}, ${alert.status}, ${alert.resourceId}, ${alert.resourceType},
          ${alert.description}, ${alert.firedAt}, ${alert.resolvedAt}, ${JSON.stringify(alert.metadata || {})}::jsonb
        )
        ON CONFLICT (alert_id) DO UPDATE SET
          status = EXCLUDED.status,
          resolved_at = EXCLUDED.resolved_at,
          metadata = EXCLUDED.metadata
      `;
    }

    console.log(`[IncidentsService] Stored ${alerts.length} alerts for tenant ${tenantId}`);
  }

  // ============================================================
  // Activity Log Management
  // ============================================================

  /**
   * Gets activity logs from Azure Monitor
   *
   * @param accountId - Azure account ID
   * @param credentials - Azure credentials
   * @param filters - Activity log filters
   * @returns Array of activity logs
   */
  async getActivityLogs(
    accountId: string,
    credentials: CloudProviderCredentials,
    filters: ActivityLogFilters
  ): Promise<ActivityLogResponseDto[]> {
    const cacheKey = `activity-logs:${accountId}:${JSON.stringify(filters)}`;
    const cached = this.getFromCache<ActivityLogResponseDto[]>(cacheKey);

    if (cached) {
      console.log(`[IncidentsService] Returning cached activity logs for account ${accountId}`);
      return cached;
    }

    // Temporarily disabled - Azure SDK dependencies missing
    // const monitorService = new AzureMonitorService(credentials);
    //
    // const azureLogs = await monitorService.getActivityLogsAdvanced(filters.timeRange, {
    //   status: filters.status,
    //   operationName: filters.operationName,
    //   resourceType: filters.resourceType,
    //   level: filters.level,
    // });
    //
    // const logs: ActivityLogResponseDto[] = azureLogs.map((log) => ({
    //   id: log.resourceId || `${log.operationName}-${log.eventTimestamp.getTime()}`,
    //   operationName: log.operationName,
    //   operationId: log.resourceId,
    //   status: log.status as any,
    //   caller: log.caller,
    //   resourceId: log.resourceId,
    //   resourceType: log.resourceType,
    //   eventTimestamp: log.eventTimestamp.toISOString(),
    //   level: log.level as any,
    //   description: log.description,
    //   metadata: log.properties,
    // }));

    // Temporary: Return empty array until Azure SDK is available
    const logs: ActivityLogResponseDto[] = [];
    console.log(`[IncidentsService] Azure Monitor temporarily unavailable - returning empty activity logs for account ${accountId}`);

    this.setCache(cacheKey, logs);
    return logs;
  }

  /**
   * Stores activity logs in database
   */
  async storeActivityLogs(
    tenantId: string,
    accountId: string,
    logs: CreateActivityLogDto[]
  ): Promise<void> {
    for (const log of logs) {
      await this.prisma.$executeRaw`
        INSERT INTO azure_activity_logs (
          tenant_id, account_id, operation_name, operation_id, status, caller,
          resource_id, resource_type, event_timestamp, level, description, metadata
        ) VALUES (
          ${tenantId}::uuid, ${accountId}, ${log.operationName}, ${log.operationId},
          ${log.status}, ${log.caller}, ${log.resourceId}, ${log.resourceType},
          ${log.eventTimestamp}, ${log.level}, ${log.description},
          ${JSON.stringify(log.metadata || {})}::jsonb
        )
        ON CONFLICT DO NOTHING
      `;
    }

    console.log(`[IncidentsService] Stored ${logs.length} activity logs for tenant ${tenantId}`);
  }

  // ============================================================
  // Incident Management
  // ============================================================

  /**
   * Gets incidents with optional filtering
   *
   * @param tenantId - Tenant ID
   * @param accountId - Azure account ID
   * @param filters - Incident filters
   * @returns Array of incidents
   */
  async getIncidents(
    tenantId: string,
    accountId: string,
    filters?: IncidentFilters
  ): Promise<IncidentResponseDto[]> {
    const whereClause: any = {
      tenant_id: tenantId,
      account_id: accountId,
    };

    if (filters?.status && filters.status.length > 0) {
      whereClause.status = { in: filters.status };
    }

    if (filters?.severity && filters.severity.length > 0) {
      whereClause.severity = { in: filters.severity };
    }

    if (filters?.assignedTo) {
      whereClause.assigned_to = filters.assignedTo;
    }

    const incidents = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM incidents
      WHERE tenant_id = ${tenantId}::uuid
        AND account_id = ${accountId}
        ${filters?.status && filters.status.length > 0 ? this.prisma.$queryRaw`AND status = ANY(${filters.status})` : this.prisma.$queryRaw``}
        ${filters?.severity && filters.severity.length > 0 ? this.prisma.$queryRaw`AND severity = ANY(${filters.severity})` : this.prisma.$queryRaw``}
        ${filters?.assignedTo ? this.prisma.$queryRaw`AND assigned_to = ${filters.assignedTo}` : this.prisma.$queryRaw``}
      ORDER BY created_at DESC
    `;

    return incidents.map((inc) => this.mapIncidentToDto(inc));
  }

  /**
   * Gets incident by ID with full details
   *
   * @param tenantId - Tenant ID
   * @param incidentId - Incident ID
   * @returns Incident with alerts, logs, and comments
   */
  async getIncidentById(tenantId: string, incidentId: string): Promise<IncidentResponseDto> {
    const incident = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM incidents
      WHERE tenant_id = ${tenantId}::uuid AND incident_id = ${incidentId}::uuid
      LIMIT 1
    `;

    if (!incident || incident.length === 0) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    const inc = incident[0];

    // Fetch related alerts
    const alertIds = inc.alert_ids || [];
    const alerts = alertIds.length > 0
      ? await this.prisma.$queryRaw<any[]>`
          SELECT * FROM azure_alerts
          WHERE alert_id = ANY(${alertIds})
        `
      : [];

    // Fetch related activity logs based on affected resources
    const affectedResources = inc.affected_resources || [];
    const activityLogs = affectedResources.length > 0
      ? await this.prisma.$queryRaw<any[]>`
          SELECT * FROM azure_activity_logs
          WHERE resource_id = ANY(${affectedResources})
            AND event_timestamp >= ${inc.created_at}
          ORDER BY event_timestamp DESC
          LIMIT 50
        `
      : [];

    // Fetch comments
    const comments = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM incident_comments
      WHERE incident_id = ${incidentId}::uuid
      ORDER BY created_at ASC
    `;

    return {
      ...this.mapIncidentToDto(inc),
      alerts: alerts.map(this.mapAlertToDto),
      activityLogs: activityLogs.map(this.mapActivityLogToDto),
      comments: comments.map(this.mapCommentToDto),
      timeline: this.generateTimeline(inc, alerts, activityLogs, comments),
    };
  }

  /**
   * Creates a new incident
   *
   * @param dto - Create incident DTO
   * @returns Created incident
   */
  async createIncident(dto: CreateIncidentDto): Promise<IncidentResponseDto> {
    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO incidents (
        tenant_id, account_id, title, description, severity, status,
        affected_resources, alert_ids, assigned_to
      ) VALUES (
        ${dto.tenantId}::uuid, ${dto.accountId}, ${dto.title}, ${dto.description},
        ${dto.severity}, 'new', ${dto.affectedResources || []}, ${dto.alertIds || []},
        ${dto.assignedTo}
      )
      RETURNING *
    `;

    console.log(`[IncidentsService] Created incident ${result[0].incident_id}`);
    return this.mapIncidentToDto(result[0]);
  }

  /**
   * Updates incident status
   *
   * @param tenantId - Tenant ID
   * @param incidentId - Incident ID
   * @param dto - Update status DTO
   * @returns Updated incident
   */
  async updateIncidentStatus(
    tenantId: string,
    incidentId: string,
    dto: UpdateIncidentStatusDto
  ): Promise<IncidentResponseDto> {
    const updates: string[] = [`status = '${dto.status}'`];

    if (dto.status === 'acknowledged') {
      updates.push(`acknowledged_at = NOW()`);
    }

    if (dto.status === 'resolved' || dto.status === 'closed') {
      updates.push(`resolved_at = NOW()`);
    }

    if (dto.assignedTo) {
      updates.push(`assigned_to = '${dto.assignedTo}'`);
    }

    updates.push(`updated_at = NOW()`);

    const result = await this.prisma.$queryRaw<any[]>`
      UPDATE incidents
      SET ${this.prisma.$queryRawUnsafe(updates.join(', '))}
      WHERE tenant_id = ${tenantId}::uuid AND incident_id = ${incidentId}::uuid
      RETURNING *
    `;

    if (!result || result.length === 0) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    // Add status change as a comment if notes provided
    if (dto.notes) {
      await this.addComment(incidentId, {
        comment: `Status changed to ${dto.status}: ${dto.notes}`,
        userId: 'system',
      });
    }

    this.invalidateCache(`incident:${incidentId}`);
    console.log(`[IncidentsService] Updated incident ${incidentId} status to ${dto.status}`);

    return this.mapIncidentToDto(result[0]);
  }

  /**
   * Adds a comment to an incident
   *
   * @param incidentId - Incident ID
   * @param dto - Add comment DTO
   * @returns Created comment
   */
  async addComment(incidentId: string, dto: AddCommentDto): Promise<IncidentComment> {
    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO incident_comments (incident_id, user_id, comment)
      VALUES (${incidentId}::uuid, ${dto.userId}, ${dto.comment})
      RETURNING *
    `;

    this.invalidateCache(`incident:${incidentId}`);
    console.log(`[IncidentsService] Added comment to incident ${incidentId}`);

    return {
      id: result[0].id,
      incidentId: result[0].incident_id,
      userId: result[0].user_id,
      comment: result[0].comment,
      createdAt: result[0].created_at,
    };
  }

  /**
   * Aggregates alerts into incidents
   *
   * Groups related alerts by resource and severity
   *
   * @param tenantId - Tenant ID
   * @param accountId - Azure account ID
   * @param alerts - Alerts to aggregate
   * @returns Created incidents
   */
  async aggregateAlertsIntoIncidents(
    tenantId: string,
    accountId: string,
    alerts: AlertResponseDto[]
  ): Promise<IncidentResponseDto[]> {
    // Group alerts by resource and severity
    const groups = new Map<string, AlertResponseDto[]>();

    for (const alert of alerts) {
      if (alert.status !== 'active') continue; // Only aggregate active alerts

      const key = `${alert.resourceId || 'unknown'}:${alert.severity}`;
      const existing = groups.get(key) || [];
      existing.push(alert);
      groups.set(key, existing);
    }

    const incidents: IncidentResponseDto[] = [];

    // Create incidents for each group
    for (const [key, groupAlerts] of Array.from(groups.entries())) {
      if (groupAlerts.length === 0) continue;

      const [resourceId, severity] = key.split(':');
      const affectedResources = Array.from(new Set(groupAlerts.map((a) => a.resourceId).filter(Boolean)));
      const alertIds = groupAlerts.map((a) => a.alertId);

      const title = `${severity.toUpperCase()} Alert Group: ${groupAlerts[0].alertName}`;
      const description = `Aggregated ${groupAlerts.length} alerts affecting ${affectedResources.length} resource(s)`;

      const incident = await this.createIncident({
        tenantId,
        accountId,
        title,
        description,
        severity: severity as AlertSeverity,
        affectedResources: affectedResources as string[],
        alertIds,
      });

      incidents.push(incident);
    }

    console.log(`[IncidentsService] Aggregated ${alerts.length} alerts into ${incidents.length} incidents`);
    return incidents;
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  private mapIncidentToDto(inc: any): IncidentResponseDto {
    return {
      id: inc.incident_id,
      title: inc.title,
      description: inc.description,
      severity: inc.severity,
      status: inc.status,
      affectedResources: inc.affected_resources || [],
      alertIds: inc.alert_ids || [],
      assignedTo: inc.assigned_to,
      acknowledgedAt: inc.acknowledged_at?.toISOString(),
      resolvedAt: inc.resolved_at?.toISOString(),
      createdAt: inc.created_at.toISOString(),
      updatedAt: inc.updated_at.toISOString(),
    };
  }

  private mapAlertToDto(alert: any): AlertResponseDto {
    return {
      id: alert.id,
      alertId: alert.alert_id,
      alertName: alert.alert_name,
      severity: alert.severity,
      status: alert.status,
      resourceId: alert.resource_id,
      resourceType: alert.resource_type,
      description: alert.description,
      firedAt: alert.fired_at.toISOString(),
      resolvedAt: alert.resolved_at?.toISOString(),
      metadata: alert.metadata || {},
    };
  }

  private mapActivityLogToDto(log: any): ActivityLogResponseDto {
    return {
      id: log.id,
      operationName: log.operation_name,
      operationId: log.operation_id,
      status: log.status,
      caller: log.caller,
      resourceId: log.resource_id,
      resourceType: log.resource_type,
      eventTimestamp: log.event_timestamp.toISOString(),
      level: log.level,
      description: log.description,
      metadata: log.metadata || {},
    };
  }

  private mapCommentToDto(comment: any): any {
    return {
      id: comment.id,
      userId: comment.user_id,
      comment: comment.comment,
      createdAt: comment.created_at.toISOString(),
    };
  }

  private generateTimeline(
    incident: any,
    alerts: any[],
    activityLogs: any[],
    comments: any[]
  ): TimelineEvent[] {
    const timeline: TimelineEvent[] = [];

    // Add incident creation
    timeline.push({
      timestamp: incident.created_at.toISOString(),
      type: 'status_change',
      description: 'Incident created',
      metadata: { status: 'new' },
    });

    // Add alerts
    for (const alert of alerts) {
      timeline.push({
        timestamp: alert.fired_at.toISOString(),
        type: 'alert_fired',
        description: `Alert fired: ${alert.alert_name}`,
        metadata: { severity: alert.severity, alertId: alert.alert_id },
      });
    }

    // Add activity logs
    for (const log of activityLogs) {
      timeline.push({
        timestamp: log.event_timestamp.toISOString(),
        type: 'activity_logged',
        description: `${log.operation_name} - ${log.status}`,
        metadata: { level: log.level, caller: log.caller },
      });
    }

    // Add comments
    for (const comment of comments) {
      timeline.push({
        timestamp: comment.created_at.toISOString(),
        type: 'comment_added',
        description: comment.comment,
        metadata: { userId: comment.user_id },
      });
    }

    // Sort by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return timeline;
  }

  private normalizeAlertStatus(status: string): 'active' | 'resolved' | 'suppressed' {
    const normalized = status.toLowerCase();
    if (normalized === 'new' || normalized === 'acknowledged') return 'active';
    if (normalized === 'closed') return 'resolved';
    return 'suppressed';
  }

  private extractResourceType(resourceId?: string): string | undefined {
    if (!resourceId) return undefined;
    const match = resourceId.match(/providers\/([^/]+\/[^/]+)/i);
    return match ? match[1] : undefined;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private invalidateCache(pattern: string): void {
    for (const key of Array.from(this.cache.keys())) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
