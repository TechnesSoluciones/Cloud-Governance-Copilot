/**
 * Mock Service Health Data
 *
 * Mock data for testing Azure Service Health integration without real Azure credentials
 *
 * @module modules/service-health/mocks
 */

import type {
  ServiceHealthStatus,
  ServiceIssue,
  MaintenanceEvent,
  HealthEvent,
  ResourceHealth,
} from '../../../integrations/azure/service-health.service';

/**
 * Mock Service Health Status
 */
export const mockServiceHealthStatus: ServiceHealthStatus = {
  overallStatus: 'degraded',
  lastChecked: new Date(),
  serviceStatuses: [
    {
      service: 'Microsoft.Compute',
      region: 'eastus',
      status: 'available',
      lastUpdated: new Date(),
      issues: 0,
    },
    {
      service: 'Microsoft.Sql',
      region: 'westus',
      status: 'degraded',
      lastUpdated: new Date(),
      issues: 1,
    },
    {
      service: 'Microsoft.Storage',
      region: 'centralus',
      status: 'available',
      lastUpdated: new Date(),
      issues: 0,
    },
  ],
  activeIncidents: 1,
  activeMaintenances: 2,
  affectedServices: ['Microsoft.Sql'],
  affectedRegions: ['westus'],
};

/**
 * Mock Service Issues (Incidents)
 */
export const mockServiceIssues: ServiceIssue[] = [
  {
    id: '/subscriptions/sub-123/providers/Microsoft.ResourceHealth/events/incident-001',
    eventId: 'incident-001',
    title: 'SQL Database connectivity issues in West US',
    description:
      'We are investigating connectivity issues affecting SQL Database instances in the West US region. Customers may experience intermittent connection failures and increased latency.',
    impactType: 'Incident',
    status: 'active',
    severity: 'high',
    affectedServices: ['Microsoft.Sql/servers'],
    affectedRegions: ['westus', 'westus2'],
    impactStartTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    estimatedResolutionTime: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
    lastUpdateTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    isHIR: true,
    isPlatformInitiated: true,
    metadata: {
      trackingId: 'TRK-SQL-2025-001',
      level: 'Critical',
      category: 'ServiceIssue',
      articleContent:
        'Our engineering teams are actively investigating the root cause and working on mitigation. We will provide updates every 30 minutes.',
      links: [
        {
          type: 'Status',
          url: 'https://status.azure.com/en-us/status',
        },
      ],
    },
  },
  {
    id: '/subscriptions/sub-123/providers/Microsoft.ResourceHealth/events/incident-002',
    eventId: 'incident-002',
    title: 'Performance degradation for Azure Functions in East US',
    description:
      'We are aware of performance degradation affecting Azure Functions in the East US region. Function execution times may be higher than normal.',
    impactType: 'Incident',
    status: 'active',
    severity: 'medium',
    affectedServices: ['Microsoft.Web/sites'],
    affectedRegions: ['eastus'],
    impactStartTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    lastUpdateTime: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    isHIR: false,
    isPlatformInitiated: true,
    metadata: {
      trackingId: 'TRK-FUNC-2025-002',
      level: 'Warning',
      category: 'ServiceIssue',
    },
  },
  {
    id: '/subscriptions/sub-123/providers/Microsoft.ResourceHealth/events/resolved-001',
    eventId: 'resolved-001',
    title: 'Storage Account access issues - RESOLVED',
    description:
      'Storage Account access issues in Central US have been resolved. All services are operating normally.',
    impactType: 'Incident',
    status: 'resolved',
    severity: 'high',
    affectedServices: ['Microsoft.Storage/storageAccounts'],
    affectedRegions: ['centralus'],
    impactStartTime: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    impactMitigationTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    lastUpdateTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
    isHIR: true,
    isPlatformInitiated: true,
    metadata: {
      trackingId: 'TRK-STOR-2025-003',
      level: 'Critical',
      category: 'ServiceIssue',
      articleContent: 'Root cause was identified as a network configuration issue. Mitigation has been deployed and verified.',
    },
  },
];

/**
 * Mock Planned Maintenance Events
 */
export const mockMaintenanceEvents: MaintenanceEvent[] = [
  {
    id: '/subscriptions/sub-123/providers/Microsoft.ResourceHealth/events/maintenance-001',
    eventId: 'maintenance-001',
    title: 'Planned maintenance for Azure Storage in East US',
    description:
      'We will be performing planned maintenance on Azure Storage infrastructure in the East US region. During this maintenance window, you may experience brief periods of reduced performance or availability for storage operations.',
    affectedServices: ['Microsoft.Storage/storageAccounts'],
    affectedRegions: ['eastus', 'eastus2'],
    maintenanceType: 'PlannedMaintenance',
    startTime: new Date('2025-12-20T02:00:00Z'),
    endTime: new Date('2025-12-20T06:00:00Z'),
    status: 'scheduled',
    impactLevel: 'moderate',
    requiresAction: true,
    notificationTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    metadata: {
      trackingId: 'MAINT-STOR-2025-001',
      category: 'PlannedMaintenance',
      updates: [
        'Maintenance scheduled for December 20, 2025, 2:00 AM - 6:00 AM UTC',
        'We recommend reviewing your storage redundancy configuration',
        'No action required from customers unless using single-region storage',
      ],
    },
  },
  {
    id: '/subscriptions/sub-123/providers/Microsoft.ResourceHealth/events/maintenance-002',
    eventId: 'maintenance-002',
    title: 'SQL Database platform update in West Europe',
    description:
      'We will be applying platform updates to SQL Database infrastructure in West Europe. These updates will improve security and performance. No customer action is required.',
    affectedServices: ['Microsoft.Sql/servers'],
    affectedRegions: ['westeurope'],
    maintenanceType: 'PlannedMaintenance',
    startTime: new Date('2025-12-22T01:00:00Z'),
    endTime: new Date('2025-12-22T05:00:00Z'),
    status: 'scheduled',
    impactLevel: 'minimal',
    requiresAction: false,
    notificationTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    metadata: {
      trackingId: 'MAINT-SQL-2025-002',
      category: 'PlannedMaintenance',
      updates: [
        'Automated failover will be performed for databases with geo-replication',
        'Brief connection interruptions may occur during failover',
        'Applications should implement retry logic',
      ],
    },
  },
  {
    id: '/subscriptions/sub-123/providers/Microsoft.ResourceHealth/events/maintenance-003',
    eventId: 'maintenance-003',
    title: 'Azure Kubernetes Service node pool upgrade',
    description:
      'Scheduled upgrade for AKS node pools to apply latest security patches. Pods will be gracefully drained and rescheduled.',
    affectedServices: ['Microsoft.ContainerService/managedClusters'],
    affectedRegions: ['northeurope', 'westeurope'],
    maintenanceType: 'PlannedMaintenance',
    startTime: new Date('2025-12-18T00:00:00Z'),
    endTime: new Date('2025-12-18T04:00:00Z'),
    status: 'scheduled',
    impactLevel: 'minimal',
    requiresAction: false,
    notificationTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    metadata: {
      trackingId: 'MAINT-AKS-2025-003',
      category: 'PlannedMaintenance',
    },
  },
];

/**
 * Mock Health History Events
 */
export const mockHealthEvents: HealthEvent[] = [
  {
    id: '/subscriptions/sub-123/providers/Microsoft.ResourceHealth/events/history-001',
    eventId: 'history-001',
    eventType: 'incident',
    title: 'Virtual Machine deployment failures in South Central US',
    description: 'VM deployment failures due to capacity constraints.',
    affectedServices: ['Microsoft.Compute/virtualMachines'],
    affectedRegions: ['southcentralus'],
    startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    endTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    duration: 1440, // 24 hours in minutes
    status: 'resolved',
    impactLevel: 'High',
    resolution: 'Additional capacity was provisioned to resolve the issue.',
    metadata: {
      trackingId: 'HIST-VM-001',
      eventType: 'ServiceIssue',
      impactType: 'Incident',
    },
  },
  {
    id: '/subscriptions/sub-123/providers/Microsoft.ResourceHealth/events/history-002',
    eventId: 'history-002',
    eventType: 'maintenance',
    title: 'Completed: Network infrastructure upgrade',
    description: 'Network infrastructure upgrade in North Europe completed successfully.',
    affectedServices: ['Microsoft.Network'],
    affectedRegions: ['northeurope'],
    startTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    endTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
    duration: 240, // 4 hours in minutes
    status: 'completed',
    impactLevel: 'Minimal',
    metadata: {
      trackingId: 'HIST-NET-002',
      eventType: 'PlannedMaintenance',
    },
  },
  {
    id: '/subscriptions/sub-123/providers/Microsoft.ResourceHealth/events/history-003',
    eventId: 'history-003',
    eventType: 'security',
    title: 'Security advisory: Update recommended for Container Registry',
    description:
      'Security update available for Azure Container Registry. Customers are advised to update to the latest version.',
    affectedServices: ['Microsoft.ContainerRegistry/registries'],
    affectedRegions: ['global'],
    startTime: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    status: 'active',
    impactLevel: 'Medium',
    metadata: {
      trackingId: 'SEC-ACR-003',
      eventType: 'SecurityAdvisory',
    },
  },
];

/**
 * Mock Resource Health Status
 */
export const mockResourceHealth: ResourceHealth = {
  resourceId:
    '/subscriptions/sub-123/resourceGroups/rg-prod/providers/Microsoft.Compute/virtualMachines/vm-web-01',
  resourceType: 'Microsoft.Compute/virtualMachines',
  availabilityState: 'Available',
  reasonType: 'PlatformInitiated',
  summary: 'This virtual machine is running normally',
  detailedStatus: 'Available',
  reasonChronicity: 'Transient',
  occurredTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  reportedTime: new Date(),
  recentlyResolved: {
    unavailableOccurredTime: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
    resolvedTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    unavailabilitySummary: 'Platform maintenance completed successfully',
  },
  recommendedActions: [
    'No action required - resource is healthy',
    'Continue to monitor resource performance',
  ],
  serviceImpactingEvents: [],
};

/**
 * Mock Resource Health - Unavailable
 */
export const mockResourceHealthUnavailable: ResourceHealth = {
  resourceId:
    '/subscriptions/sub-123/resourceGroups/rg-prod/providers/Microsoft.Sql/servers/sql-prod-01',
  resourceType: 'Microsoft.Sql/servers',
  availabilityState: 'Unavailable',
  reasonType: 'PlatformInitiated',
  summary: 'This SQL Server is currently unavailable due to a platform issue',
  detailedStatus: 'Platform issue detected - engineering team notified',
  reasonChronicity: 'Persistent',
  occurredTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  reportedTime: new Date(),
  resolutionETA: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
  recommendedActions: [
    'Wait for platform issue to be resolved',
    'Monitor status page for updates',
    'If issue persists beyond ETA, contact support',
  ],
  serviceImpactingEvents: [
    {
      eventStartTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      eventStatusLastModifiedTime: new Date(Date.now() - 30 * 60 * 1000),
      correlationId: 'corr-123-456-789',
      status: 'Active',
      incidentType: 'Unplanned',
    },
  ],
};

/**
 * Mock Service Health Events for Database Cache
 */
export const mockServiceHealthEventsCache = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    tenant_id: '550e8400-e29b-41d4-a716-446655440000',
    account_id: 'azure-account-001',
    event_type: 'incident',
    event_id: 'incident-001',
    title: 'SQL Database connectivity issues in West US',
    description: 'We are investigating connectivity issues affecting SQL Database instances.',
    impact_type: 'Incident',
    status: 'active',
    severity: 'high',
    affected_services: ['Microsoft.Sql/servers'],
    affected_regions: ['westus', 'westus2'],
    impact_start: new Date(Date.now() - 2 * 60 * 60 * 1000),
    last_update_time: new Date(Date.now() - 30 * 60 * 1000),
    tracking_id: 'TRK-SQL-2025-001',
    is_platform_initiated: true,
    is_hir: true,
    metadata: {
      level: 'Critical',
      category: 'ServiceIssue',
    },
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    tenant_id: '550e8400-e29b-41d4-a716-446655440000',
    account_id: 'azure-account-001',
    event_type: 'maintenance',
    event_id: 'maintenance-001',
    title: 'Planned maintenance for Azure Storage in East US',
    description: 'We will be performing planned maintenance on Azure Storage infrastructure.',
    impact_type: 'ActionRequired',
    status: 'scheduled',
    severity: 'medium',
    affected_services: ['Microsoft.Storage/storageAccounts'],
    affected_regions: ['eastus', 'eastus2'],
    impact_start: new Date('2025-12-20T02:00:00Z'),
    impact_end: new Date('2025-12-20T06:00:00Z'),
    requires_action: true,
    metadata: {
      category: 'PlannedMaintenance',
    },
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
];

/**
 * Helper function to get random mock service issue
 */
export function getRandomServiceIssue(): ServiceIssue {
  return mockServiceIssues[Math.floor(Math.random() * mockServiceIssues.length)];
}

/**
 * Helper function to get random mock maintenance event
 */
export function getRandomMaintenanceEvent(): MaintenanceEvent {
  return mockMaintenanceEvents[Math.floor(Math.random() * mockMaintenanceEvents.length)];
}

/**
 * Helper function to create custom mock service issue
 */
export function createMockServiceIssue(
  overrides?: Partial<ServiceIssue>
): ServiceIssue {
  return {
    ...mockServiceIssues[0],
    ...overrides,
  };
}

/**
 * Helper function to create custom mock maintenance event
 */
export function createMockMaintenanceEvent(
  overrides?: Partial<MaintenanceEvent>
): MaintenanceEvent {
  return {
    ...mockMaintenanceEvents[0],
    ...overrides,
  };
}
