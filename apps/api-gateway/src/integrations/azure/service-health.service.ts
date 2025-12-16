/**
 * Azure Service Health Service
 *
 * Provides access to Azure Service Health information including:
 * - Service health status across regions and services
 * - Active service issues and incidents
 * - Planned maintenance events
 * - Health event history
 * - Resource-specific health status
 *
 * Features:
 * - Real-time service health monitoring
 * - Incident detection and tracking
 * - Planned maintenance notifications
 * - Historical health event tracking
 * - Resource health availability states
 *
 * @module integrations/azure/service-health.service
 */

import { ResourceHealthClient } from '@azure/arm-resourcehealth';
import { ClientSecretCredential } from '@azure/identity';
import type {
  AvailabilityStatusPropertiesRecentlyResolved,
  Event,
  AvailabilityStatus,
} from '@azure/arm-resourcehealth';
import type { CloudProviderCredentials } from '../cloud-provider.interface';

/**
 * Azure Service Health configuration
 */
interface AzureServiceHealthConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  subscriptionId: string;
}

/**
 * Service health status
 */
export interface ServiceHealthStatus {
  overallStatus: 'available' | 'degraded' | 'unavailable' | 'unknown';
  lastChecked: Date;
  serviceStatuses: ServiceStatus[];
  activeIncidents: number;
  activeMaintenances: number;
  affectedServices: string[];
  affectedRegions: string[];
}

/**
 * Service status by region
 */
export interface ServiceStatus {
  service: string;
  region: string;
  status: 'available' | 'degraded' | 'unavailable' | 'unknown';
  lastUpdated?: Date;
  issues: number;
}

/**
 * Service issue/incident
 */
export interface ServiceIssue {
  id: string;
  eventId: string;
  title: string;
  description: string;
  impactType: 'Incident' | 'Informational' | 'ActionRequired';
  status: 'active' | 'resolved';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  affectedServices: string[];
  affectedRegions: string[];
  impactStartTime?: Date;
  impactMitigationTime?: Date;
  estimatedResolutionTime?: Date;
  lastUpdateTime: Date;
  isHIR: boolean; // High Impact Region
  isPlatformInitiated: boolean;
  metadata: {
    trackingId?: string;
    level?: string;
    category?: string;
    articleContent?: string;
    links?: Array<{ type: string; url: string }>;
  };
}

/**
 * Planned maintenance event
 */
export interface MaintenanceEvent {
  id: string;
  eventId: string;
  title: string;
  description: string;
  affectedServices: string[];
  affectedRegions: string[];
  maintenanceType: string;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  impactLevel: 'none' | 'minimal' | 'moderate' | 'significant';
  requiresAction: boolean;
  notificationTime: Date;
  metadata: {
    trackingId?: string;
    category?: string;
    updates?: string[];
  };
}

/**
 * Health event (historical)
 */
export interface HealthEvent {
  id: string;
  eventId: string;
  eventType: 'incident' | 'maintenance' | 'informational' | 'security';
  title: string;
  description: string;
  affectedServices: string[];
  affectedRegions: string[];
  startTime: Date;
  endTime?: Date;
  duration?: number; // minutes
  status: 'active' | 'resolved' | 'completed';
  impactLevel: string;
  resolution?: string;
  metadata: Record<string, any>;
}

/**
 * Resource health status
 */
export interface ResourceHealth {
  resourceId: string;
  resourceType: string;
  availabilityState: 'Available' | 'Unavailable' | 'Unknown' | 'Degraded';
  reasonType: 'PlatformInitiated' | 'UserInitiated' | 'Unknown';
  summary: string;
  detailedStatus?: string;
  reasonChronicity: 'Transient' | 'Persistent' | 'Unknown';
  occurredTime?: Date;
  reportedTime: Date;
  rootCauseAttributionTime?: Date;
  resolutionETA?: Date;
  recentlyResolved?: {
    unavailableOccurredTime?: Date;
    resolvedTime?: Date;
    unavailabilitySummary?: string;
  };
  recommendedActions?: string[];
  serviceImpactingEvents?: Array<{
    eventStartTime?: Date;
    eventStatusLastModifiedTime?: Date;
    correlationId?: string;
    status?: string;
    incidentType?: string;
  }>;
}

/**
 * Azure Service Health Service
 *
 * @example
 * ```typescript
 * const serviceHealth = new AzureServiceHealthService({
 *   provider: 'azure',
 *   azureClientId: process.env.AZURE_CLIENT_ID!,
 *   azureClientSecret: process.env.AZURE_CLIENT_SECRET!,
 *   azureTenantId: process.env.AZURE_TENANT_ID!,
 *   azureSubscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
 * });
 *
 * // Get current service health status
 * const status = await serviceHealth.getServiceHealth('account-id');
 *
 * // Get active service issues
 * const issues = await serviceHealth.getServiceIssues('account-id');
 *
 * // Get planned maintenance
 * const maintenance = await serviceHealth.getPlannedMaintenance('account-id');
 * ```
 */
export class AzureServiceHealthService {
  private client: ResourceHealthClient;
  private credential: ClientSecretCredential;
  private config: AzureServiceHealthConfig;

  /**
   * Creates a new Azure Service Health Service instance
   *
   * @param credentials - Cloud provider credentials
   * @throws {Error} If Azure credentials are missing
   */
  constructor(credentials: CloudProviderCredentials) {
    if (
      !credentials.azureClientId ||
      !credentials.azureClientSecret ||
      !credentials.azureTenantId ||
      !credentials.azureSubscriptionId
    ) {
      throw new Error(
        'Azure credentials (tenantId, clientId, clientSecret, subscriptionId) are required'
      );
    }

    this.config = {
      clientId: credentials.azureClientId,
      clientSecret: credentials.azureClientSecret,
      tenantId: credentials.azureTenantId,
      subscriptionId: credentials.azureSubscriptionId,
    };

    // Initialize Azure credential
    this.credential = new ClientSecretCredential(
      this.config.tenantId,
      this.config.clientId,
      this.config.clientSecret
    );

    // Initialize Resource Health client
    this.client = new ResourceHealthClient(this.credential, this.config.subscriptionId);

    console.log(
      '[AzureServiceHealthService] Initialized for subscription:',
      this.config.subscriptionId
    );
  }

  /**
   * Gets current service health status across all services and regions
   *
   * @param accountId - Account identifier (for multi-tenant tracking)
   * @returns Overall service health status
   *
   * @example
   * ```typescript
   * const status = await serviceHealth.getServiceHealth('account-123');
   * console.log(`Overall status: ${status.overallStatus}`);
   * console.log(`Active incidents: ${status.activeIncidents}`);
   * ```
   */
  async getServiceHealth(accountId: string): Promise<ServiceHealthStatus> {
    try {
      console.log(`[AzureServiceHealthService] Fetching service health for account: ${accountId}`);

      // Get all service health events
      const issues = await this.getServiceIssues(accountId);
      const maintenance = await this.getPlannedMaintenance(accountId, 7);

      // Aggregate service statuses by region
      const serviceStatusMap = new Map<string, ServiceStatus>();
      const affectedServices = new Set<string>();
      const affectedRegions = new Set<string>();

      // Process active incidents
      issues.forEach((issue) => {
        if (issue.status === 'active') {
          issue.affectedServices.forEach((service) => affectedServices.add(service));
          issue.affectedRegions.forEach((region) => affectedRegions.add(region));

          issue.affectedRegions.forEach((region) => {
            issue.affectedServices.forEach((service) => {
              const key = `${service}:${region}`;
              const existing = serviceStatusMap.get(key);

              if (!existing || this.compareStatus(issue.severity, existing.status) > 0) {
                serviceStatusMap.set(key, {
                  service,
                  region,
                  status: this.mapSeverityToStatus(issue.severity),
                  lastUpdated: issue.lastUpdateTime,
                  issues: (existing?.issues || 0) + 1,
                });
              }
            });
          });
        }
      });

      const serviceStatuses = Array.from(serviceStatusMap.values());

      // Determine overall status
      let overallStatus: 'available' | 'degraded' | 'unavailable' | 'unknown' = 'available';
      if (serviceStatuses.some((s) => s.status === 'unavailable')) {
        overallStatus = 'unavailable';
      } else if (serviceStatuses.some((s) => s.status === 'degraded')) {
        overallStatus = 'degraded';
      }

      return {
        overallStatus,
        lastChecked: new Date(),
        serviceStatuses,
        activeIncidents: issues.filter((i) => i.status === 'active' && i.impactType === 'Incident')
          .length,
        activeMaintenances: maintenance.filter((m) => m.status === 'scheduled').length,
        affectedServices: Array.from(affectedServices),
        affectedRegions: Array.from(affectedRegions),
      };
    } catch (error) {
      console.error('[AzureServiceHealthService] Failed to fetch service health:', error);
      throw new Error(
        `Failed to fetch Azure service health: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets active service issues and incidents
   *
   * @param accountId - Account identifier
   * @param impactType - Optional filter by impact type
   * @returns Array of service issues
   *
   * @example
   * ```typescript
   * // Get all active issues
   * const allIssues = await serviceHealth.getServiceIssues('account-123');
   *
   * // Get only incidents
   * const incidents = await serviceHealth.getServiceIssues('account-123', 'Incident');
   * ```
   */
  async getServiceIssues(
    accountId: string,
    impactType?: 'Incident' | 'Informational' | 'ActionRequired'
  ): Promise<ServiceIssue[]> {
    try {
      console.log(
        `[AzureServiceHealthService] Fetching service issues for account: ${accountId}`
      );

      const issues: ServiceIssue[] = [];

      // List service health events (incidents and communications)
      const eventsIterator = this.client.events.listBySubscriptionId();

      for await (const event of eventsIterator) {
        // Filter by impact type if specified
        if (impactType && event.properties?.impactType !== impactType) {
          continue;
        }

        const issue = this.normalizeServiceIssue(event);
        if (issue) {
          issues.push(issue);
        }
      }

      console.log(`[AzureServiceHealthService] Retrieved ${issues.length} service issues`);
      return issues;
    } catch (error) {
      console.error('[AzureServiceHealthService] Failed to fetch service issues:', error);
      throw new Error(
        `Failed to fetch Azure service issues: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets planned maintenance events
   *
   * @param accountId - Account identifier
   * @param days - Number of days to look ahead (default: 30)
   * @returns Array of maintenance events
   *
   * @example
   * ```typescript
   * // Get maintenance for next 7 days
   * const maintenance = await serviceHealth.getPlannedMaintenance('account-123', 7);
   * ```
   */
  async getPlannedMaintenance(accountId: string, days: number = 30): Promise<MaintenanceEvent[]> {
    try {
      console.log(
        `[AzureServiceHealthService] Fetching planned maintenance for account: ${accountId}`
      );

      const maintenance: MaintenanceEvent[] = [];
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      // List service health events filtered for planned maintenance
      const eventsIterator = this.client.events.listBySubscriptionId();

      for await (const event of eventsIterator) {
        // Filter for planned maintenance and action required events
        if (
          event.properties?.impactType === 'ActionRequired' ||
          event.properties?.eventType === 'PlannedMaintenance'
        ) {
          const startTime = event.properties?.impactStartTime
            ? new Date(event.properties.impactStartTime)
            : now;

          // Only include events within the specified time window
          if (startTime >= now && startTime <= futureDate) {
            const maintenanceEvent = this.normalizeMaintenanceEvent(event);
            if (maintenanceEvent) {
              maintenance.push(maintenanceEvent);
            }
          }
        }
      }

      // Sort by start time
      maintenance.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      console.log(
        `[AzureServiceHealthService] Retrieved ${maintenance.length} planned maintenance events`
      );
      return maintenance;
    } catch (error) {
      console.error('[AzureServiceHealthService] Failed to fetch planned maintenance:', error);
      throw new Error(
        `Failed to fetch Azure planned maintenance: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets health event history
   *
   * @param accountId - Account identifier
   * @param days - Number of days of history (default: 30)
   * @returns Array of historical health events
   *
   * @example
   * ```typescript
   * // Get last 30 days of health events
   * const history = await serviceHealth.getHealthHistory('account-123', 30);
   * ```
   */
  async getHealthHistory(accountId: string, days: number = 30): Promise<HealthEvent[]> {
    try {
      console.log(
        `[AzureServiceHealthService] Fetching health history for account: ${accountId}`
      );

      const events: HealthEvent[] = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // List service health events
      const eventsIterator = this.client.events.listBySubscriptionId();

      for await (const event of eventsIterator) {
        const startTime = event.properties?.impactStartTime
          ? new Date(event.properties.impactStartTime)
          : new Date(event.properties?.lastUpdateTime || new Date());

        // Filter events within the time range
        if (startTime >= startDate) {
          const healthEvent = this.normalizeHealthEvent(event);
          if (healthEvent) {
            events.push(healthEvent);
          }
        }
      }

      // Sort by start time descending
      events.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

      console.log(`[AzureServiceHealthService] Retrieved ${events.length} health events`);
      return events;
    } catch (error) {
      console.error('[AzureServiceHealthService] Failed to fetch health history:', error);
      throw new Error(
        `Failed to fetch Azure health history: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets health status for a specific resource
   *
   * @param accountId - Account identifier
   * @param resourceId - Full Azure resource ID
   * @returns Resource health status
   *
   * @example
   * ```typescript
   * const resourceHealth = await serviceHealth.getResourceHealth(
   *   'account-123',
   *   '/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Compute/virtualMachines/{vm}'
   * );
   * console.log(`Availability: ${resourceHealth.availabilityState}`);
   * ```
   */
  async getResourceHealth(accountId: string, resourceId: string): Promise<ResourceHealth> {
    try {
      console.log(
        `[AzureServiceHealthService] Fetching resource health for: ${resourceId.substring(0, 100)}`
      );

      // Get current availability status
      const availabilityStatus = await this.client.availabilityStatuses.getByResource(resourceId);

      return this.normalizeResourceHealth(resourceId, availabilityStatus);
    } catch (error) {
      console.error('[AzureServiceHealthService] Failed to fetch resource health:', error);
      throw new Error(
        `Failed to fetch Azure resource health: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Normalizes Azure service issue to our format
   *
   * @private
   */
  private normalizeServiceIssue(event: Event): ServiceIssue | null {
    if (!event.properties || !event.id || !event.name) {
      return null;
    }

    const props = event.properties;

    // Determine severity based on impact level and type
    let severity: 'critical' | 'high' | 'medium' | 'low' | 'informational' = 'informational';
    if (props.impactType === 'Incident') {
      severity = props.level === 'Critical' ? 'critical' : 'high';
    } else if (props.impactType === 'ActionRequired') {
      severity = 'medium';
    }

    // Extract affected services and regions
    const affectedServices: string[] = [];
    const affectedRegions: string[] = [];

    if (props.impact) {
      props.impact.forEach((impact) => {
        if (impact.impactedService) {
          affectedServices.push(impact.impactedService);
        }
        if (impact.impactedRegions) {
          impact.impactedRegions.forEach((region) => {
            if (region.impactedRegion) {
              affectedRegions.push(region.impactedRegion);
            }
          });
        }
      });
    }

    // Extract links
    const links: Array<{ type: string; url: string }> = [];
    if (props.links) {
      props.links.forEach((link) => {
        if (link.type && link.extensionName) {
          links.push({
            type: String(link.type),
            url: String(link.extensionName),
          });
        }
      });
    }

    return {
      id: event.id,
      eventId: event.name,
      title: String(props.title || 'Service Issue'),
      description: String(props.summary || ''),
      impactType: (props.impactType as 'Incident' | 'Informational' | 'ActionRequired') || 'Informational',
      status: props.status === 'Resolved' ? 'resolved' : 'active',
      severity,
      affectedServices,
      affectedRegions,
      impactStartTime: props.impactStartTime ? new Date(props.impactStartTime) : undefined,
      impactMitigationTime: props.impactMitigationTime
        ? new Date(props.impactMitigationTime)
        : undefined,
      lastUpdateTime: new Date(props.lastUpdateTime || new Date()),
      isHIR: props.isHIR || false,
      isPlatformInitiated: props.platformInitiated || false,
      metadata: {
        trackingId: props.trackingId,
        level: props.level,
        category: props.eventType,
        articleContent: props.article?.articleContent,
        links,
      },
    };
  }

  /**
   * Normalizes Azure maintenance event to our format
   *
   * @private
   */
  private normalizeMaintenanceEvent(event: Event): MaintenanceEvent | null {
    if (!event.properties || !event.id || !event.name) {
      return null;
    }

    const props = event.properties;

    // Extract affected services and regions
    const affectedServices: string[] = [];
    const affectedRegions: string[] = [];

    if (props.impact) {
      props.impact.forEach((impact) => {
        if (impact.impactedService) {
          affectedServices.push(impact.impactedService);
        }
        if (impact.impactedRegions) {
          impact.impactedRegions.forEach((region) => {
            if (region.impactedRegion) {
              affectedRegions.push(region.impactedRegion);
            }
          });
        }
      });
    }

    const startTime = props.impactStartTime ? new Date(props.impactStartTime) : new Date();
    const endTime = props.impactMitigationTime
      ? new Date(props.impactMitigationTime)
      : new Date(startTime.getTime() + 4 * 60 * 60 * 1000); // Default 4 hours

    // Determine status
    const now = new Date();
    let status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' = 'scheduled';
    if (props.status === 'Resolved') {
      status = 'completed';
    } else if (now >= startTime && now <= endTime) {
      status = 'in_progress';
    }

    return {
      id: event.id,
      eventId: event.name,
      title: String(props.title || 'Planned Maintenance'),
      description: String(props.summary || ''),
      affectedServices,
      affectedRegions,
      maintenanceType: String(props.eventType || 'PlannedMaintenance'),
      startTime,
      endTime,
      status,
      impactLevel: props.level?.toLowerCase() as 'none' | 'minimal' | 'moderate' | 'significant' || 'minimal',
      requiresAction: props.impactType === 'ActionRequired',
      notificationTime: new Date(props.lastUpdateTime || new Date()),
      metadata: {
        trackingId: props.trackingId,
        category: props.eventType,
        updates: props.faqs?.map((faq) => String(faq.answer)) || [],
      },
    };
  }

  /**
   * Normalizes Azure health event to our format
   *
   * @private
   */
  private normalizeHealthEvent(event: Event): HealthEvent | null {
    if (!event.properties || !event.id || !event.name) {
      return null;
    }

    const props = event.properties;

    // Extract affected services and regions
    const affectedServices: string[] = [];
    const affectedRegions: string[] = [];

    if (props.impact) {
      props.impact.forEach((impact) => {
        if (impact.impactedService) {
          affectedServices.push(impact.impactedService);
        }
        if (impact.impactedRegions) {
          impact.impactedRegions.forEach((region) => {
            if (region.impactedRegion) {
              affectedRegions.push(region.impactedRegion);
            }
          });
        }
      });
    }

    const startTime = props.impactStartTime ? new Date(props.impactStartTime) : new Date();
    const endTime = props.impactMitigationTime ? new Date(props.impactMitigationTime) : undefined;

    let duration: number | undefined;
    if (endTime) {
      duration = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    }

    // Determine event type
    let eventType: 'incident' | 'maintenance' | 'informational' | 'security' = 'informational';
    if (props.impactType === 'Incident') {
      eventType = 'incident';
    } else if (
      props.eventType === 'PlannedMaintenance' ||
      props.impactType === 'ActionRequired'
    ) {
      eventType = 'maintenance';
    } else if (props.eventType === 'Security') {
      eventType = 'security';
    }

    return {
      id: event.id,
      eventId: event.name,
      eventType,
      title: String(props.title || 'Health Event'),
      description: String(props.summary || ''),
      affectedServices,
      affectedRegions,
      startTime,
      endTime,
      duration,
      status: props.status === 'Resolved' ? 'resolved' : 'active',
      impactLevel: String(props.level || 'Unknown'),
      resolution: props.impactMitigationTime ? 'Resolved' : undefined,
      metadata: {
        trackingId: props.trackingId,
        eventType: props.eventType,
        impactType: props.impactType,
        platformInitiated: props.platformInitiated,
        isHIR: props.isHIR,
      },
    };
  }

  /**
   * Normalizes Azure resource health to our format
   *
   * @private
   */
  private normalizeResourceHealth(
    resourceId: string,
    status: AvailabilityStatus
  ): ResourceHealth {
    const props = status.properties;

    // Extract resource type from resource ID
    const resourceType = this.extractResourceType(resourceId);

    // Extract recommended actions
    const recommendedActions: string[] = [];
    if (props?.recommendedActions) {
      props.recommendedActions.forEach((action) => {
        if (action.action) {
          recommendedActions.push(String(action.action));
        }
      });
    }

    // Extract service impacting events
    const serviceImpactingEvents: Array<{
      eventStartTime?: Date;
      eventStatusLastModifiedTime?: Date;
      correlationId?: string;
      status?: string;
      incidentType?: string;
    }> = [];

    if (props?.serviceImpactingEvents) {
      props.serviceImpactingEvents.forEach((event) => {
        serviceImpactingEvents.push({
          eventStartTime: event.eventStartTime ? new Date(event.eventStartTime) : undefined,
          eventStatusLastModifiedTime: event.eventStatusLastModifiedTime
            ? new Date(event.eventStatusLastModifiedTime)
            : undefined,
          correlationId: event.correlationId,
          status: event.eventStatus?.value,
          incidentType: event.incidentProperties?.incidentType,
        });
      });
    }

    // Process recently resolved status
    let recentlyResolved: ResourceHealth['recentlyResolved'];
    if (props?.recentlyResolved) {
      recentlyResolved = {
        unavailableOccurredTime: props.recentlyResolved.unavailableOccurredTime
          ? new Date(props.recentlyResolved.unavailableOccurredTime)
          : undefined,
        resolvedTime: props.recentlyResolved.resolvedTime
          ? new Date(props.recentlyResolved.resolvedTime)
          : undefined,
        unavailabilitySummary: props.recentlyResolved.unavailabilitySummary,
      };
    }

    return {
      resourceId,
      resourceType,
      availabilityState: (props?.availabilityState as 'Available' | 'Unavailable' | 'Unknown' | 'Degraded') || 'Unknown',
      reasonType: (props?.reasonType as 'PlatformInitiated' | 'UserInitiated' | 'Unknown') || 'Unknown',
      summary: String(props?.summary || 'No summary available'),
      detailedStatus: props?.detailedStatus,
      reasonChronicity: (props?.reasonChronicity as 'Transient' | 'Persistent' | 'Unknown') || 'Unknown',
      occurredTime: props?.occurredTime ? new Date(props.occurredTime) : undefined,
      reportedTime: new Date(props?.reportedTime || new Date()),
      rootCauseAttributionTime: props?.rootCauseAttributionTime
        ? new Date(props.rootCauseAttributionTime)
        : undefined,
      resolutionETA: props?.resolutionETA ? new Date(props.resolutionETA) : undefined,
      recentlyResolved,
      recommendedActions,
      serviceImpactingEvents,
    };
  }

  /**
   * Maps severity to service status
   *
   * @private
   */
  private mapSeverityToStatus(
    severity: 'critical' | 'high' | 'medium' | 'low' | 'informational'
  ): 'available' | 'degraded' | 'unavailable' | 'unknown' {
    switch (severity) {
      case 'critical':
        return 'unavailable';
      case 'high':
        return 'degraded';
      case 'medium':
        return 'degraded';
      default:
        return 'available';
    }
  }

  /**
   * Compares status severity for prioritization
   *
   * @private
   */
  private compareStatus(
    severity: string,
    status: string
  ): number {
    const severityOrder = { critical: 3, high: 2, medium: 1, low: 0, informational: 0 };
    const statusOrder = { unavailable: 3, degraded: 2, available: 0, unknown: 0 };

    return (
      (severityOrder[severity as keyof typeof severityOrder] || 0) -
      (statusOrder[status as keyof typeof statusOrder] || 0)
    );
  }

  /**
   * Extracts resource type from Azure resource ID
   *
   * @private
   */
  private extractResourceType(resourceId: string): string {
    const match = resourceId.match(/\/providers\/([^\/]+\/[^\/]+)/i);
    return match ? match[1] : 'Unknown';
  }
}
