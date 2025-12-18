/**
 * Service Health Module Service
 *
 * Business logic for service health monitoring
 *
 * @module modules/service-health/services
 */

import { PrismaClient } from '@prisma/client';
import { AzureServiceHealthService } from '../../../integrations/azure/service-health.service';
import type { CloudProviderCredentials } from '../../../integrations/cloud-provider.interface';
import type {
  ServiceHealthStatus,
  ServiceIssue,
  MaintenanceEvent,
  HealthEvent,
  ResourceHealth,
} from '../../../integrations/azure/service-health.service';
import type {
  ServiceHealthStats,
  NotificationPreferences,
  Notification,
} from '../types';

export class ServiceHealthModuleService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get service health status for a specific account
   */
  async getServiceHealth(
    tenantId: string,
    accountId: string
  ): Promise<ServiceHealthStatus> {
    // Get account credentials
    const account = await this.getCloudAccount(tenantId, accountId);

    // Initialize service health service
    const serviceHealth = new AzureServiceHealthService(account.credentials);

    // Get current service health
    return await serviceHealth.getServiceHealth(accountId);
  }

  /**
   * Get service issues for a specific account
   */
  async getServiceIssues(
    tenantId: string,
    accountId: string,
    impactType?: 'Incident' | 'Informational' | 'ActionRequired'
  ): Promise<ServiceIssue[]> {
    // Get account credentials
    const account = await this.getCloudAccount(tenantId, accountId);

    // Initialize service health service
    const serviceHealth = new AzureServiceHealthService(account.credentials);

    // Get service issues
    return await serviceHealth.getServiceIssues(accountId, impactType);
  }

  /**
   * Get planned maintenance for a specific account
   */
  async getPlannedMaintenance(
    tenantId: string,
    accountId: string,
    days: number = 30
  ): Promise<MaintenanceEvent[]> {
    // Get account credentials
    const account = await this.getCloudAccount(tenantId, accountId);

    // Initialize service health service
    const serviceHealth = new AzureServiceHealthService(account.credentials);

    // Get planned maintenance
    return await serviceHealth.getPlannedMaintenance(accountId, days);
  }

  /**
   * Get health history for a specific account
   */
  async getHealthHistory(
    tenantId: string,
    accountId: string,
    days: number = 30
  ): Promise<HealthEvent[]> {
    // Get account credentials
    const account = await this.getCloudAccount(tenantId, accountId);

    // Initialize service health service
    const serviceHealth = new AzureServiceHealthService(account.credentials);

    // Get health history
    return await serviceHealth.getHealthHistory(accountId, days);
  }

  /**
   * Get resource health for a specific resource
   */
  async getResourceHealth(
    tenantId: string,
    accountId: string,
    resourceId: string
  ): Promise<ResourceHealth> {
    // Get account credentials
    const account = await this.getCloudAccount(tenantId, accountId);

    // Initialize service health service
    const serviceHealth = new AzureServiceHealthService(account.credentials);

    // Get resource health
    return await serviceHealth.getResourceHealth(accountId, resourceId);
  }

  /**
   * Get service health statistics from database cache
   */
  async getServiceHealthStats(
    tenantId: string,
    accountId?: string
  ): Promise<ServiceHealthStats> {
    const whereClause = accountId
      ? `tenant_id = '${tenantId}' AND account_id = '${accountId}'`
      : `tenant_id = '${tenantId}'`;

    const result = await this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE status = 'active' AND event_type = 'incident') as active_incidents,
        COUNT(*) FILTER (WHERE status = 'resolved' AND event_type = 'incident') as resolved_incidents,
        COUNT(*) FILTER (WHERE event_type = 'maintenance' AND status = 'scheduled') as planned_maintenance,
        COUNT(DISTINCT unnest(affected_services)) as affected_services,
        COUNT(DISTINCT unnest(affected_regions)) as affected_regions,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_events,
        COUNT(*) FILTER (WHERE severity = 'high') as high_priority_events
      FROM azure_service_health
      WHERE tenant_id = ${tenantId}::uuid
      ${accountId ? `AND account_id = ${accountId}` : ''}
    `;

    const stats = result[0] || {};

    return {
      totalEvents: parseInt(stats.total_events) || 0,
      activeIncidents: parseInt(stats.active_incidents) || 0,
      resolvedIncidents: parseInt(stats.resolved_incidents) || 0,
      plannedMaintenance: parseInt(stats.planned_maintenance) || 0,
      affectedServices: parseInt(stats.affected_services) || 0,
      affectedRegions: parseInt(stats.affected_regions) || 0,
      criticalEvents: parseInt(stats.critical_events) || 0,
      highPriorityEvents: parseInt(stats.high_priority_events) || 0,
    };
  }

  /**
   * Get cached service health events from database
   */
  async getCachedServiceHealthEvents(
    tenantId: string,
    accountId?: string,
    filters?: {
      eventType?: string;
      status?: string;
      severity?: string;
      limit?: number;
    }
  ): Promise<any[]> {
    const conditions = [`tenant_id = '${tenantId}'`];

    if (accountId) {
      conditions.push(`account_id = '${accountId}'`);
    }

    if (filters?.eventType) {
      conditions.push(`event_type = '${filters.eventType}'`);
    }

    if (filters?.status) {
      conditions.push(`status = '${filters.status}'`);
    }

    if (filters?.severity) {
      conditions.push(`severity = '${filters.severity}'`);
    }

    const whereClause = conditions.join(' AND ');
    const limit = filters?.limit || 50;

    const events = await this.prisma.$queryRaw<any[]>`
      SELECT *
      FROM azure_service_health
      WHERE ${whereClause}
      ORDER BY impact_start DESC
      LIMIT ${limit}
    `;

    return events;
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    tenantId: string,
    userId: string,
    filters?: {
      type?: string;
      read?: boolean;
      archived?: boolean;
      limit?: number;
    }
  ): Promise<Notification[]> {
    const conditions = [`tenant_id = '${tenantId}'`, `user_id = '${userId}'`];

    if (filters?.type) {
      conditions.push(`type = '${filters.type}'`);
    }

    if (typeof filters?.read === 'boolean') {
      conditions.push(`read = ${filters.read}`);
    }

    if (typeof filters?.archived === 'boolean') {
      conditions.push(`archived = ${filters.archived}`);
    }

    const whereClause = conditions.join(' AND ');
    const limit = filters?.limit || 50;

    const notifications = await this.prisma.$queryRaw<any[]>`
      SELECT *
      FROM notifications
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return notifications.map((n) => ({
      id: n.id,
      tenantId: n.tenant_id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      message: n.message,
      severity: n.severity,
      read: n.read,
      archived: n.archived,
      link: n.link,
      actionRequired: n.action_required,
      actionTaken: n.action_taken,
      relatedEntityType: n.related_entity_type,
      relatedEntityId: n.related_entity_id,
      createdAt: n.created_at,
      readAt: n.read_at,
    }));
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(
    tenantId: string,
    userId: string,
    notificationId: string
  ): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE notifications
      SET read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = ${notificationId}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND user_id = ${userId}::uuid
    `;
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(tenantId: string, userId: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE notifications
      SET read = true, read_at = CURRENT_TIMESTAMP
      WHERE tenant_id = ${tenantId}::uuid
        AND user_id = ${userId}::uuid
        AND read = false
    `;
  }

  /**
   * Get notification preferences for a user
   */
  async getNotificationPreferences(
    tenantId: string,
    userId: string
  ): Promise<NotificationPreferences | null> {
    const prefs = await this.prisma.$queryRaw<any[]>`
      SELECT *
      FROM notification_preferences
      WHERE tenant_id = ${tenantId}::uuid
        AND user_id = ${userId}::uuid
      LIMIT 1
    `;

    if (prefs.length === 0) {
      return null;
    }

    const p = prefs[0];
    return {
      serviceHealthEnabled: p.service_health_enabled,
      severityThreshold: p.service_health_severity_threshold,
      emailEnabled: p.email_enabled,
      emailAddress: p.email_address,
      emailFrequency: p.email_frequency,
      webhookEnabled: p.webhook_enabled,
      webhookUrl: p.webhook_url,
      notifyIncidents: p.notify_incidents,
      notifyMaintenance: p.notify_maintenance,
      notifySecurity: p.notify_security,
      quietHoursEnabled: p.quiet_hours_enabled,
      quietHoursStart: p.quiet_hours_start,
      quietHoursEnd: p.quiet_hours_end,
      quietHoursTimezone: p.quiet_hours_timezone,
    };
  }

  /**
   * Update notification preferences for a user
   */
  async updateNotificationPreferences(
    tenantId: string,
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    // Check if preferences exist
    const existing = await this.getNotificationPreferences(tenantId, userId);

    if (existing) {
      // Update existing preferences
      await this.prisma.$executeRaw`
        UPDATE notification_preferences
        SET
          service_health_enabled = COALESCE(${preferences.serviceHealthEnabled}, service_health_enabled),
          service_health_severity_threshold = COALESCE(${preferences.severityThreshold}, service_health_severity_threshold),
          email_enabled = COALESCE(${preferences.emailEnabled}, email_enabled),
          email_address = COALESCE(${preferences.emailAddress}, email_address),
          email_frequency = COALESCE(${preferences.emailFrequency}, email_frequency),
          webhook_enabled = COALESCE(${preferences.webhookEnabled}, webhook_enabled),
          webhook_url = COALESCE(${preferences.webhookUrl}, webhook_url),
          notify_incidents = COALESCE(${preferences.notifyIncidents}, notify_incidents),
          notify_maintenance = COALESCE(${preferences.notifyMaintenance}, notify_maintenance),
          notify_security = COALESCE(${preferences.notifySecurity}, notify_security),
          quiet_hours_enabled = COALESCE(${preferences.quietHoursEnabled}, quiet_hours_enabled),
          quiet_hours_start = COALESCE(${preferences.quietHoursStart}::time, quiet_hours_start),
          quiet_hours_end = COALESCE(${preferences.quietHoursEnd}::time, quiet_hours_end),
          quiet_hours_timezone = COALESCE(${preferences.quietHoursTimezone}, quiet_hours_timezone),
          updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = ${tenantId}::uuid
          AND user_id = ${userId}::uuid
      `;
    } else {
      // Insert new preferences
      await this.prisma.$executeRaw`
        INSERT INTO notification_preferences (
          tenant_id, user_id, service_health_enabled, service_health_severity_threshold,
          email_enabled, email_address, email_frequency, webhook_enabled, webhook_url,
          notify_incidents, notify_maintenance, notify_security, quiet_hours_enabled,
          quiet_hours_start, quiet_hours_end, quiet_hours_timezone
        ) VALUES (
          ${tenantId}::uuid, ${userId}::uuid, ${preferences.serviceHealthEnabled ?? true},
          ${preferences.severityThreshold || 'medium'}, ${preferences.emailEnabled ?? true},
          ${preferences.emailAddress}, ${preferences.emailFrequency || 'immediate'},
          ${preferences.webhookEnabled ?? false}, ${preferences.webhookUrl},
          ${preferences.notifyIncidents ?? true}, ${preferences.notifyMaintenance ?? true},
          ${preferences.notifySecurity ?? true}, ${preferences.quietHoursEnabled ?? false},
          ${preferences.quietHoursStart}::time, ${preferences.quietHoursEnd}::time,
          ${preferences.quietHoursTimezone || 'UTC'}
        )
      `;
    }
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Get cloud account with credentials
   */
  private async getCloudAccount(
    tenantId: string,
    accountId: string
  ): Promise<{ credentials: CloudProviderCredentials }> {
    const account = await this.prisma.cloudAccount.findFirst({
      where: {
        id: accountId,
        tenantId,
        provider: 'azure',
        status: 'active',
      },
    });

    if (!account) {
      throw new Error('Azure cloud account not found or inactive');
    }

    const credentials: CloudProviderCredentials = {
      provider: 'azure',
      azureClientId: (account as any).azureClientId || undefined,
      azureClientSecret: (account as any).azureClientSecret || undefined,
      azureTenantId: (account as any).azureTenantId || undefined,
      azureSubscriptionId: (account as any).azureSubscriptionId || undefined,
    };

    if (
      !credentials.azureClientId ||
      !credentials.azureClientSecret ||
      !credentials.azureTenantId ||
      !credentials.azureSubscriptionId
    ) {
      throw new Error('Azure credentials are incomplete for this account');
    }

    return { credentials };
  }
}
