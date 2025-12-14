/**
 * Test Helpers
 *
 * Reusable test data factories and utility functions for creating mock data
 * in a consistent and type-safe manner across all test suites.
 */

import type { CloudCostData, CloudAsset, DateRange } from '../../integrations/cloud-provider.interface';

/**
 * Creates mock CloudCostData with optional overrides
 *
 * @example
 * const cost = createMockCostData({ amount: 250.00, service: 'RDS' });
 */
export const createMockCostData = (overrides: Partial<CloudCostData> = {}): CloudCostData => ({
  date: new Date('2025-12-01T00:00:00.000Z'),
  service: 'EC2',
  amount: 100.50,
  currency: 'USD',
  region: 'us-east-1',
  usageType: 'BoxUsage:t3.medium',
  operation: 'RunInstances',
  tags: {
    Environment: 'production',
    Project: 'finops-platform',
  },
  metadata: {
    granularity: 'DAILY',
  },
  ...overrides,
});

/**
 * Creates an array of mock cost data for date ranges
 *
 * @example
 * const costs = createMockCostDataArray(7, { service: 'EC2' });
 */
export const createMockCostDataArray = (
  count: number,
  baseOverrides: Partial<CloudCostData> = {}
): CloudCostData[] => {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date('2025-12-01T00:00:00.000Z');
    date.setDate(date.getDate() + i);

    return createMockCostData({
      date,
      amount: 100 + i * 10,
      ...baseOverrides,
    });
  });
};

/**
 * Creates mock CloudAsset with optional overrides
 *
 * @example
 * const asset = createMockCloudAsset({ resourceType: 'ec2:instance', status: 'running' });
 */
export const createMockCloudAsset = (overrides: Partial<CloudAsset> = {}): CloudAsset => ({
  resourceId: 'i-1234567890abcdef0',
  resourceType: 'ec2:instance',
  name: 'web-server-01',
  region: 'us-east-1',
  zone: 'us-east-1a',
  status: 'running',
  tags: {
    Name: 'web-server-01',
    Environment: 'production',
    Project: 'finops-platform',
  },
  metadata: {
    instanceType: 't3.medium',
    vpcId: 'vpc-12345678',
    subnetId: 'subnet-12345678',
    securityGroups: ['sg-12345678'],
    publicIp: '54.123.45.67',
    privateIp: '10.0.1.100',
    monitoring: 'disabled',
    platform: 'linux',
    imageId: 'ami-12345678',
  },
  createdAt: new Date('2024-01-15T10:00:00.000Z'),
  lastModifiedAt: new Date('2024-01-15T10:00:00.000Z'),
  ...overrides,
});

/**
 * Creates an array of mock cloud assets
 *
 * @example
 * const assets = createMockCloudAssetArray(5, { status: 'running' });
 */
export const createMockCloudAssetArray = (
  count: number,
  baseOverrides: Partial<CloudAsset> = {}
): CloudAsset[] => {
  return Array.from({ length: count }, (_, i) => {
    return createMockCloudAsset({
      resourceId: `i-${i}234567890abcdef`,
      name: `web-server-${String(i + 1).padStart(2, '0')}`,
      tags: {
        Name: `web-server-${String(i + 1).padStart(2, '0')}`,
        Environment: 'production',
      },
      ...baseOverrides,
    });
  });
};

/**
 * Creates a mock date range
 *
 * @example
 * const range = createMockDateRange(7); // Last 7 days
 */
export const createMockDateRange = (daysBack: number = 30): DateRange => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  start.setDate(start.getDate() - daysBack);
  start.setHours(0, 0, 0, 0);

  return { start, end };
};

/**
 * Creates a specific date range between two dates
 *
 * @example
 * const range = createDateRange('2025-01-01', '2025-01-31');
 */
export const createDateRange = (startDate: string, endDate: string): DateRange => {
  return {
    start: new Date(startDate),
    end: new Date(endDate),
  };
};

/**
 * Creates mock Prisma CostData record
 */
export const createMockPrismaCostData = (overrides: any = {}) => ({
  id: 'cost-data-uuid-1',
  tenantId: 'tenant-uuid-1',
  cloudAccountId: 'account-uuid-1',
  assetId: null,
  date: new Date('2025-12-01T00:00:00.000Z'),
  amount: 100.50,
  currency: 'USD',
  provider: 'aws',
  service: 'EC2',
  usageType: 'BoxUsage:t3.medium',
  operation: 'RunInstances',
  tags: {},
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Creates mock Prisma CloudAccount record
 */
export const createMockPrismaCloudAccount = (overrides: any = {}) => ({
  id: 'account-uuid-1',
  tenantId: 'tenant-uuid-1',
  provider: 'aws',
  accountName: 'Production AWS Account',
  accountIdentifier: '123456789012',
  credentialsCiphertext: 'encrypted-ciphertext',
  credentialsIv: 'initialization-vector',
  credentialsAuthTag: 'auth-tag',
  status: 'active',
  lastSync: new Date('2025-12-01T00:00:00.000Z'),
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-12-01T00:00:00.000Z'),
  tenant: {
    id: 'tenant-uuid-1',
    name: 'Acme Corporation',
  },
  ...overrides,
});

/**
 * Creates mock Prisma CostAnomaly record
 */
export const createMockPrismaAnomaly = (overrides: any = {}) => ({
  id: 'anomaly-uuid-1',
  tenantId: 'tenant-uuid-1',
  date: new Date('2025-12-01T00:00:00.000Z'),
  service: 'EC2',
  provider: 'aws',
  resourceId: null,
  expectedCost: 100.00,
  actualCost: 250.00,
  deviation: 150.00,
  severity: 'medium',
  status: 'open',
  detectedAt: new Date('2025-12-02T02:00:00.000Z'),
  resolvedAt: null,
  notes: null,
  createdAt: new Date('2025-12-02T02:00:00.000Z'),
  updatedAt: new Date('2025-12-02T02:00:00.000Z'),
  ...overrides,
});

/**
 * Sleep utility for async tests
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Creates a spy that tracks calls and arguments
 */
export const createSpy = <T extends (...args: any[]) => any>() => {
  const calls: Array<Parameters<T>> = [];
  const spy = jest.fn((...args: Parameters<T>) => {
    calls.push(args);
  });

  return { spy, calls };
};
