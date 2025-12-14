/**
 * Dashboard Test Fixtures
 *
 * Mock data for dashboard integration tests
 * Provides realistic test data for Azure dashboard overview and health endpoints
 */

import type { DashboardOverview, HealthStatus } from '../../modules/dashboard/services/dashboard.service';

/**
 * Mock Dashboard Overview Response
 * Complete dashboard data with resources, costs, security, and alerts
 */
export const mockDashboardOverview: DashboardOverview = {
  resources: {
    total: 150,
    byType: [
      { type: 'microsoft.compute/virtualmachines', count: 25 },
      { type: 'microsoft.storage/storageaccounts', count: 30 },
      { type: 'microsoft.network/virtualnetworks', count: 15 },
      { type: 'microsoft.sql/servers', count: 10 },
      { type: 'microsoft.network/networksecuritygroups', count: 20 },
      { type: 'microsoft.compute/disks', count: 25 },
      { type: 'microsoft.network/publicipaddresses', count: 15 },
      { type: 'microsoft.containerregistry/registries', count: 5 },
      { type: 'microsoft.keyvault/vaults', count: 3 },
      { type: 'microsoft.web/sites', count: 2 },
    ],
    byLocation: [
      { location: 'eastus', count: 75 },
      { location: 'westus', count: 40 },
      { location: 'centralus', count: 20 },
      { location: 'northeurope', count: 10 },
      { location: 'southeastasia', count: 5 },
    ],
  },
  costs: {
    currentMonth: 1250.50,
    previousMonth: 1100.25,
    trend: 'up' as const,
    percentageChange: 13.65,
    topServices: [
      { service: 'Virtual Machines', cost: 500.00 },
      { service: 'Storage', cost: 300.00 },
      { service: 'SQL Database', cost: 200.00 },
      { service: 'Networking', cost: 150.00 },
      { service: 'Container Registry', cost: 100.50 },
    ],
  },
  security: {
    score: 75.5,
    criticalIssues: 2,
    highIssues: 5,
    mediumIssues: 10,
  },
  alerts: {
    active: 3,
    recent: [
      {
        id: 'alert-001',
        severity: 'High',
        message: 'Unencrypted storage account detected',
        timestamp: new Date('2025-12-12T10:00:00Z'),
      },
      {
        id: 'alert-002',
        severity: 'Critical',
        message: 'VM without backup policy',
        timestamp: new Date('2025-12-12T09:30:00Z'),
      },
      {
        id: 'alert-003',
        severity: 'Medium',
        message: 'Network security group allows unrestricted inbound access',
        timestamp: new Date('2025-12-12T08:00:00Z'),
      },
    ],
  },
};

/**
 * Mock Dashboard Overview with No Data
 * Simulates a fresh account with no resources
 */
export const mockEmptyDashboardOverview: DashboardOverview = {
  resources: {
    total: 0,
    byType: [],
    byLocation: [],
  },
  costs: {
    currentMonth: 0,
    previousMonth: 0,
    trend: 'stable' as const,
    percentageChange: 0,
    topServices: [],
  },
  security: {
    score: 0,
    criticalIssues: 0,
    highIssues: 0,
    mediumIssues: 0,
  },
  alerts: {
    active: 0,
    recent: [],
  },
};

/**
 * Mock Health Status Response
 * Includes VM status, resource distribution, and recent activity
 */
export const mockHealthStatus: HealthStatus = {
  virtualMachines: {
    total: 25,
    running: 18,
    stopped: 5,
    deallocated: 2,
  },
  resourcesByLocation: [
    {
      location: 'eastus',
      count: 75,
      percentage: 50.0,
    },
    {
      location: 'westus',
      count: 40,
      percentage: 26.67,
    },
    {
      location: 'centralus',
      count: 20,
      percentage: 13.33,
    },
    {
      location: 'northeurope',
      count: 10,
      percentage: 6.67,
    },
    {
      location: 'southeastasia',
      count: 5,
      percentage: 3.33,
    },
  ],
  recentActivity: [
    {
      timestamp: new Date('2025-12-12T11:00:00Z'),
      resourceId: '/subscriptions/sub-123/resourceGroups/rg-prod/providers/Microsoft.Compute/virtualMachines/vm-web-01',
      changeType: 'Update',
      description: 'Update on vm-web-01',
    },
    {
      timestamp: new Date('2025-12-12T10:45:00Z'),
      resourceId: '/subscriptions/sub-123/resourceGroups/rg-prod/providers/Microsoft.Storage/storageAccounts/stprod001',
      changeType: 'Create',
      description: 'Create on stprod001',
    },
    {
      timestamp: new Date('2025-12-12T10:30:00Z'),
      resourceId: '/subscriptions/sub-123/resourceGroups/rg-dev/providers/Microsoft.Compute/virtualMachines/vm-test-02',
      changeType: 'Delete',
      description: 'Delete on vm-test-02',
    },
  ],
};

/**
 * Mock Health Status with No VMs
 * Simulates an account with resources but no virtual machines
 */
export const mockHealthStatusNoVMs: HealthStatus = {
  virtualMachines: {
    total: 0,
    running: 0,
    stopped: 0,
    deallocated: 0,
  },
  resourcesByLocation: [
    {
      location: 'eastus',
      count: 50,
      percentage: 100.0,
    },
  ],
  recentActivity: [],
};

/**
 * Mock Azure Resource Graph Response - Resource Summary
 */
export const mockResourceGraphSummary = {
  totalResources: 150,
  byType: [
    { type: 'microsoft.compute/virtualmachines', count: 25 },
    { type: 'microsoft.storage/storageaccounts', count: 30 },
    { type: 'microsoft.network/virtualnetworks', count: 15 },
    { type: 'microsoft.sql/servers', count: 10 },
    { type: 'microsoft.network/networksecuritygroups', count: 20 },
    { type: 'microsoft.compute/disks', count: 25 },
    { type: 'microsoft.network/publicipaddresses', count: 15 },
    { type: 'microsoft.containerregistry/registries', count: 5 },
    { type: 'microsoft.keyvault/vaults', count: 3 },
    { type: 'microsoft.web/sites', count: 2 },
  ],
  byLocation: [
    { location: 'eastus', count: 75 },
    { location: 'westus', count: 40 },
    { location: 'centralus', count: 20 },
    { location: 'northeurope', count: 10 },
    { location: 'southeastasia', count: 5 },
  ],
  virtualMachines: {
    total: 25,
    running: 18,
    stopped: 5,
  },
};

/**
 * Mock Azure Resource Graph Response - Recent Changes
 */
export const mockResourceGraphChanges = [
  {
    timestamp: '2025-12-12T11:00:00Z',
    resourceId: '/subscriptions/sub-123/resourceGroups/rg-prod/providers/Microsoft.Compute/virtualMachines/vm-web-01',
    changeType: 'Update',
  },
  {
    timestamp: '2025-12-12T10:45:00Z',
    resourceId: '/subscriptions/sub-123/resourceGroups/rg-prod/providers/Microsoft.Storage/storageAccounts/stprod001',
    changeType: 'Create',
  },
  {
    timestamp: '2025-12-12T10:30:00Z',
    resourceId: '/subscriptions/sub-123/resourceGroups/rg-dev/providers/Microsoft.Compute/virtualMachines/vm-test-02',
    changeType: 'Delete',
  },
];

/**
 * Mock Database Security Scores
 */
export const mockSecurityScores = [
  {
    current_score: 75.5,
    max_score: 100,
    percentage: 0.755,
  },
];

/**
 * Mock Database Security Assessments (Issues)
 */
export const mockSecurityAssessments = [
  {
    severity: 'Critical',
    count: BigInt(2),
  },
  {
    severity: 'High',
    count: BigInt(5),
  },
  {
    severity: 'Medium',
    count: BigInt(10),
  },
];

/**
 * Mock Database Recent Alerts
 */
export const mockRecentAlerts = [
  {
    id: 'alert-001',
    severity: 'High',
    message: 'Unencrypted storage account detected',
    timestamp: new Date('2025-12-12T10:00:00Z'),
  },
  {
    id: 'alert-002',
    severity: 'Critical',
    message: 'VM without backup policy',
    timestamp: new Date('2025-12-12T09:30:00Z'),
  },
  {
    id: 'alert-003',
    severity: 'Medium',
    message: 'Network security group allows unrestricted inbound access',
    timestamp: new Date('2025-12-12T08:00:00Z'),
  },
];

/**
 * Mock Tenant with Cloud Account
 */
export const mockTenant = {
  id: 'test-tenant-001',
  name: 'Test Tenant',
  slug: 'test-tenant',
  planType: 'enterprise',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-12-01T00:00:00Z'),
};

/**
 * Mock Cloud Account (Azure)
 */
export const mockCloudAccount = {
  id: 'test-account-001',
  tenantId: 'test-tenant-001',
  provider: 'azure',
  accountName: 'Azure Production Account',
  accountIdentifier: 'azure-subscription-123',
  status: 'active',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-12-01T00:00:00Z'),
  tenant: mockTenant,
};

/**
 * Mock Test User
 */
export const mockUser = {
  id: 'test-user-001',
  tenantId: 'test-tenant-001',
  email: 'test@example.com',
  fullName: 'Test User',
  role: 'admin',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-12-01T00:00:00Z'),
};

/**
 * Generate Mock JWT Token
 */
export const mockJWTToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItMDAxIiwidGVuYW50SWQiOiJ0ZXN0LXRlbmFudC0wMDEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MDIzNjgwMDAsImV4cCI6MTcwMjQ1NDQwMH0.test-signature';

/**
 * Helper: Create custom dashboard overview
 */
export function createMockDashboardOverview(overrides: Partial<DashboardOverview> = {}): DashboardOverview {
  return {
    ...mockDashboardOverview,
    ...overrides,
  };
}

/**
 * Helper: Create custom health status
 */
export function createMockHealthStatus(overrides: Partial<HealthStatus> = {}): HealthStatus {
  return {
    ...mockHealthStatus,
    ...overrides,
  };
}

/**
 * Helper: Create custom cloud account
 */
export function createMockCloudAccount(overrides: any = {}) {
  return {
    ...mockCloudAccount,
    ...overrides,
  };
}

/**
 * Helper: Create custom tenant
 */
export function createMockTenant(overrides: any = {}) {
  return {
    ...mockTenant,
    ...overrides,
  };
}
