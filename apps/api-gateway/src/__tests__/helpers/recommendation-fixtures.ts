/**
 * Test Fixtures for Recommendations Engine
 *
 * This file provides factory functions to generate mock data for testing
 * the FinOps Recommendations Engine.
 *
 * Includes:
 * - Mock recommendations
 * - Mock cost data
 * - Mock cloud accounts
 * - Mock API responses
 * - Mock authenticated users
 */

import { Decimal } from '@prisma/client/runtime/library';

// ============================================================
// Utility Functions for ID Generation
// ============================================================

/**
 * Generate a valid UUID v4 format string
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a simple ID string for testing
 */
function generateId(prefix: string = 'id'): string {
  // For recommendation IDs, tenantIDs, etc., return valid UUID
  if (!prefix || prefix === 'rec' || prefix === 'tenant' || prefix === 'acc' || prefix === 'user' || prefix === 'asset') {
    return generateUUID();
  }

  // For other prefixes, use simple format
  const chars = 'abcdef0123456789';
  let result = prefix ? prefix + '-' : '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a random number
 */
function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random float
 */
function randomFloat(min: number, max: number, decimals: number = 2): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round((Math.random() * (max - min) + min) * multiplier) / multiplier;
}

/**
 * Pick a random item from an array
 */
function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// ============================================================
// Type Definitions
// ============================================================

export interface MockRecommendation {
  id: string;
  tenantId: string;
  type: 'idle_resource' | 'rightsize' | 'unused_resource' | 'delete_snapshot' | 'reserved_instance';
  priority: 'high' | 'medium' | 'low';
  provider: 'AWS' | 'AZURE';
  service: string;
  resourceId: string | null;
  title: string;
  description: string;
  estimatedSavings: Decimal;
  savingsPeriod: 'monthly' | 'yearly';
  status: 'open' | 'applied' | 'dismissed';
  actionable: boolean;
  actionScript: string | null;
  metadata: Record<string, any>;
  appliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockCostData {
  id: string;
  tenantId: string;
  cloudAccountId: string;
  provider: string;
  service: string;
  usageType: string | null;
  assetId: string | null;
  date: Date;
  amount: Decimal;
  currency: string;
  metadata: Record<string, any>;
}

export interface MockCloudAccount {
  id: string;
  tenantId: string;
  provider: 'aws' | 'azure' | 'gcp';
  accountName: string;
  accountId: string;
  status: 'active' | 'inactive' | 'error';
  credentials: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockUser {
  id: string;
  userId: string;
  email: string;
  tenantId: string;
  role: string;
}

// ============================================================
// Factory Functions
// ============================================================

/**
 * Create a mock recommendation with optional overrides
 */
export function createMockRecommendation(overrides: Partial<MockRecommendation> = {}): MockRecommendation {
  const type = overrides.type || pickRandom<'idle_resource' | 'rightsize' | 'unused_resource' | 'delete_snapshot' | 'reserved_instance'>([
    'idle_resource',
    'rightsize',
    'unused_resource',
    'delete_snapshot',
    'reserved_instance',
  ]);

  const provider = overrides.provider || pickRandom<'AWS' | 'AZURE'>(['AWS', 'AZURE']);
  const estimatedSavings = overrides.estimatedSavings || new Decimal(randomFloat(10, 5000, 2));

  return {
    id: generateId('rec'),
    tenantId: generateId('tenant'),
    type,
    priority: calculatePriorityFromSavings(Number(estimatedSavings)),
    provider,
    service: getServiceForProvider(provider, type),
    resourceId: getResourceIdForType(provider, type),
    title: getTitleForType(type, provider),
    description: 'Test recommendation description for cost optimization',
    estimatedSavings,
    savingsPeriod: 'monthly',
    status: 'open',
    actionable: Math.random() > 0.5,
    actionScript: Math.random() > 0.5 ? 'echo "action script"' : null,
    metadata: {},
    appliedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create multiple mock recommendations
 */
export function createMockRecommendations(count: number, overrides: Partial<MockRecommendation> = {}): MockRecommendation[] {
  return Array.from({ length: count }, () => createMockRecommendation(overrides));
}

/**
 * Create a mock cost data entry
 */
export function createMockCostData(overrides: Partial<MockCostData> = {}): MockCostData {
  const provider = overrides.provider || pickRandom(['AWS', 'AZURE']);
  const service = overrides.service || pickRandom(['EC2', 'EBS', 'S3', 'Virtual Machines', 'Managed Disk']);
  const daysAgo = randomNumber(0, 30);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  return {
    id: generateId('cost'),
    tenantId: generateId('tenant'),
    cloudAccountId: generateId('acc'),
    provider,
    service,
    usageType: getUsageTypeForService(service),
    assetId: getAssetIdForService(service),
    date,
    amount: new Decimal(randomFloat(0.01, 100, 2)),
    currency: 'USD',
    metadata: {},
    ...overrides,
  };
}

/**
 * Create multiple mock cost data entries
 */
export function createMockCostDataSet(count: number, overrides: Partial<MockCostData> = {}): MockCostData[] {
  return Array.from({ length: count }, () => createMockCostData(overrides));
}

/**
 * Create cost data for an idle EC2 instance (low cost pattern)
 */
export function createIdleEC2CostData(resourceId: string, tenantId: string, cloudAccountId: string, days: number = 28): MockCostData[] {
  const costData: MockCostData[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    costData.push(createMockCostData({
      tenantId,
      cloudAccountId,
      provider: 'AWS',
      service: 'EC2',
      usageType: 'BoxUsage:t3.medium:Instance',
      assetId: resourceId,
      date,
      amount: new Decimal(randomFloat(0.001, 0.003, 3)), // Very low cost (<<5% of expected)
      metadata: {
        instanceType: 't3.medium',
        instanceId: resourceId,
      },
    }));
  }

  return costData;
}

/**
 * Create cost data for a high-usage EC2 instance (rightsizing candidate)
 */
export function createRightsizingEC2CostData(resourceId: string, tenantId: string, cloudAccountId: string, days: number = 28): MockCostData[] {
  const costData: MockCostData[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    costData.push(createMockCostData({
      tenantId,
      cloudAccountId,
      provider: 'AWS',
      service: 'EC2',
      usageType: 'BoxUsage:m5.2xlarge:Instance',
      assetId: resourceId,
      date,
      amount: new Decimal(randomFloat(8.0, 9.5, 2)), // Consistent high cost
      metadata: {
        instanceType: 'm5.2xlarge',
        instanceId: resourceId,
      },
    }));
  }

  return costData;
}

/**
 * Create cost data for reserved instance opportunity (consistent 24/7 usage)
 */
export function createReservedInstanceCostData(resourceId: string, tenantId: string, cloudAccountId: string, days: number = 30): MockCostData[] {
  const costData: MockCostData[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    costData.push(createMockCostData({
      tenantId,
      cloudAccountId,
      provider: 'AWS',
      service: 'EC2',
      usageType: 'BoxUsage:m5.large:Instance',
      assetId: resourceId,
      date,
      amount: new Decimal(randomFloat(2.2, 2.4, 2)), // Very consistent cost
      metadata: {
        instanceType: 'm5.large',
        instanceId: resourceId,
      },
    }));
  }

  return costData;
}

/**
 * Create a mock cloud account
 */
export function createMockCloudAccount(overrides: Partial<MockCloudAccount> = {}): MockCloudAccount {
  const provider = overrides.provider || pickRandom<'aws' | 'azure' | 'gcp'>(['aws', 'azure', 'gcp']);
  const companies = ['Acme', 'TechCorp', 'CloudSys', 'DataInc', 'OptimusPrime'];
  const accountId = provider === 'aws' ? String(randomNumber(100000000000, 999999999999)) : generateId('acc');

  return {
    id: generateId('acc'),
    tenantId: generateId('tenant'),
    provider,
    accountName: `${provider.toUpperCase()} ${pickRandom(companies)} Account`,
    accountId,
    status: 'active',
    credentials: {},
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock authenticated user
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  const userId = generateId('user');
  return {
    id: userId,
    userId,
    email: `user-${Math.random().toString(36).substring(7)}@example.com`,
    tenantId: generateId('tenant'),
    role: 'admin',
    ...overrides,
  };
}

/**
 * Create a mock generation result
 */
export function createMockGenerationResult(overrides: any = {}) {
  return {
    success: true,
    recommendationsGenerated: randomNumber(0, 50),
    breakdown: {
      idle_resource: randomNumber(0, 10),
      rightsize: randomNumber(0, 10),
      unused_resource: randomNumber(0, 10),
      delete_snapshot: randomNumber(0, 10),
      reserved_instance: randomNumber(0, 10),
    },
    totalEstimatedSavings: randomFloat(100, 10000, 2),
    executionTimeMs: randomNumber(500, 5000),
    ...overrides,
  };
}

/**
 * Create a mock JWT token for authentication
 */
export function createMockAuthToken(user: MockUser): string {
  // In real tests, this would use jsonwebtoken
  // For now, return a mock token string
  return `mock-jwt-token-${user.id}`;
}

// ============================================================
// Helper Functions
// ============================================================

function calculatePriorityFromSavings(savings: number): 'high' | 'medium' | 'low' {
  if (savings >= 500) return 'high';
  if (savings >= 100) return 'medium';
  return 'low';
}

function getServiceForProvider(provider: string, type: string): string {
  if (provider === 'AWS') {
    switch (type) {
      case 'idle_resource':
      case 'rightsize':
      case 'reserved_instance':
        return 'EC2';
      case 'unused_resource':
        return 'EBS';
      case 'delete_snapshot':
        return 'EBS Snapshot';
      default:
        return 'EC2';
    }
  } else {
    switch (type) {
      case 'idle_resource':
      case 'rightsize':
        return 'Virtual Machines';
      case 'unused_resource':
        return 'Managed Disk';
      case 'delete_snapshot':
        return 'Snapshot';
      default:
        return 'Virtual Machines';
    }
  }
}

function getResourceIdForType(provider: string, type: string): string {
  const randomAlphanumeric = (length: number) => {
    const chars = 'abcdef0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  if (provider === 'AWS') {
    switch (type) {
      case 'idle_resource':
      case 'rightsize':
      case 'reserved_instance':
        return `i-${randomAlphanumeric(17)}`;
      case 'unused_resource':
        return `vol-${randomAlphanumeric(17)}`;
      case 'delete_snapshot':
        return `snap-${randomAlphanumeric(17)}`;
      default:
        return `i-${randomAlphanumeric(17)}`;
    }
  } else {
    return `/subscriptions/${generateId()}/resourceGroups/${randomAlphanumeric(10)}/providers/Microsoft.Compute/${randomAlphanumeric(15)}`;
  }
}

function getTitleForType(type: string, provider: string): string {
  const prefix = provider === 'AWS' ? 'AWS' : 'Azure';

  switch (type) {
    case 'idle_resource':
      return `Idle ${prefix} Resource Detected`;
    case 'rightsize':
      return `${prefix} Rightsizing Opportunity`;
    case 'unused_resource':
      return `Unused ${prefix} Resource`;
    case 'delete_snapshot':
      return `Old ${prefix} Snapshot`;
    case 'reserved_instance':
      return `${prefix} Reserved Instance Opportunity`;
    default:
      return `${prefix} Cost Optimization`;
  }
}

function getUsageTypeForService(service: string): string | null {
  switch (service) {
    case 'EC2':
      return pickRandom(['BoxUsage:t3.medium', 'BoxUsage:m5.large', 'BoxUsage:t3.small']);
    case 'EBS':
      return pickRandom(['EBS:VolumeUsage.gp3', 'EBS:VolumeUsage.gp2']);
    case 'Virtual Machines':
      return 'Standard_D2s_v3';
    default:
      return null;
  }
}

function getAssetIdForService(service: string): string | null {
  const randomAlphanumeric = (length: number) => {
    const chars = 'abcdef0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  switch (service) {
    case 'EC2':
      return `i-${randomAlphanumeric(17)}`;
    case 'EBS':
      return `vol-${randomAlphanumeric(17)}`;
    case 'Virtual Machines':
      return `/subscriptions/${generateId()}/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/vm-${randomAlphanumeric(8)}`;
    default:
      return generateId('asset');
  }
}

// ============================================================
// Preset Test Scenarios
// ============================================================

/**
 * Create a complete test scenario with cloud account, cost data, and expected recommendations
 */
export interface TestScenario {
  account: MockCloudAccount;
  costData: MockCostData[];
  expectedRecommendations: number;
  expectedTypes: string[];
}

/**
 * Scenario: AWS account with idle EC2 instances
 */
export function createIdleEC2Scenario(tenantId: string): TestScenario {
  const account = createMockCloudAccount({
    tenantId,
    provider: 'aws',
  });

  const resourceId = `i-${Math.random().toString(36).substring(2, 19)}`;
  const costData = createIdleEC2CostData(resourceId, tenantId, account.id, 28);

  return {
    account,
    costData,
    expectedRecommendations: 1,
    expectedTypes: ['idle_resource'],
  };
}

/**
 * Scenario: AWS account with rightsizing opportunity
 */
export function createRightsizingScenario(tenantId: string): TestScenario {
  const account = createMockCloudAccount({
    tenantId,
    provider: 'aws',
  });

  const resourceId = `i-${Math.random().toString(36).substring(2, 19)}`;
  const costData = createRightsizingEC2CostData(resourceId, tenantId, account.id, 28);

  return {
    account,
    costData,
    expectedRecommendations: 1,
    expectedTypes: ['rightsize'],
  };
}

/**
 * Scenario: No recommendations (healthy account)
 */
export function createHealthyAccountScenario(tenantId: string): TestScenario {
  const account = createMockCloudAccount({
    tenantId,
    provider: 'aws',
  });

  return {
    account,
    costData: [],
    expectedRecommendations: 0,
    expectedTypes: [],
  };
}
