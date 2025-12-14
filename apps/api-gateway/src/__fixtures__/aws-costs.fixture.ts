/**
 * AWS Cost Data Fixtures
 *
 * Mock data for testing AWS cost collection and analysis.
 */

import { CostData } from '@prisma/client';
import { faker } from '@faker-js/faker';

/**
 * Mock AWS cost data entry
 */
export const mockCostData: any = {
  id: 'cost-123',
  tenantId: 'tenant-123',
  cloudAccountId: 'account-123',
  provider: 'aws',
  service: 'EC2',
  region: 'us-east-1',
  cost: 125.50,
  currency: 'USD',
  usageType: 'BoxUsage:t3.medium',
  usageAmount: 720,
  usageUnit: 'Hrs',
  date: new Date('2024-01-01'),
  metadata: {
    instanceType: 't3.medium',
    instanceId: 'i-1234567890abcdef0',
  },
  createdAt: new Date('2024-01-02T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
};

/**
 * Multiple cost data entries for different services
 */
export const mockCostDataMultiple: Partial<CostData>[] = [
  mockCostData,
  {
    id: 'cost-456',
    tenantId: 'tenant-123',
    cloudAccountId: 'account-123',
    provider: 'aws',
    service: 'S3',
    region: 'us-east-1',
    cost: 50.25,
    currency: 'USD',
    usageType: 'StandardStorage',
    usageAmount: 1024,
    usageUnit: 'GB',
    date: new Date('2024-01-01'),
    metadata: {
      bucketName: 'my-test-bucket',
    },
    createdAt: new Date('2024-01-02T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
  },
  {
    id: 'cost-789',
    tenantId: 'tenant-123',
    cloudAccountId: 'account-123',
    provider: 'aws',
    service: 'RDS',
    region: 'us-west-2',
    cost: 200.00,
    currency: 'USD',
    usageType: 'InstanceUsage:db.t3.medium',
    usageAmount: 720,
    usageUnit: 'Hrs',
    date: new Date('2024-01-01'),
    metadata: {
      dbInstanceClass: 'db.t3.medium',
      engine: 'postgres',
    },
    createdAt: new Date('2024-01-02T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
  },
];

/**
 * Generate random cost data for testing
 */
export function generateMockCostData(count: number = 10): Partial<CostData>[] {
  const services = ['EC2', 'S3', 'RDS', 'Lambda', 'CloudFront', 'DynamoDB'];
  const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];

  return Array.from({ length: count }, (_, i) => ({
    id: `cost-${faker.string.uuid()}`,
    tenantId: 'tenant-123',
    cloudAccountId: 'account-123',
    provider: 'aws',
    service: faker.helpers.arrayElement(services),
    region: faker.helpers.arrayElement(regions),
    cost: parseFloat(faker.finance.amount({ min: 10, max: 1000, dec: 2 })),
    currency: 'USD',
    usageType: faker.helpers.arrayElement(['Standard', 'Premium', 'Reserved']),
    usageAmount: parseFloat(faker.finance.amount({ min: 1, max: 1000, dec: 2 })),
    usageUnit: faker.helpers.arrayElement(['Hrs', 'GB', 'Requests']),
    date: faker.date.recent({ days: 30 }),
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

/**
 * AWS Cost Explorer API response mock
 */
export const mockCostExplorerResponse = {
  ResultsByTime: [
    {
      TimePeriod: {
        Start: '2024-01-01',
        End: '2024-01-02',
      },
      Total: {
        UnblendedCost: {
          Amount: '125.50',
          Unit: 'USD',
        },
      },
      Groups: [
        {
          Keys: ['EC2'],
          Metrics: {
            UnblendedCost: {
              Amount: '125.50',
              Unit: 'USD',
            },
          },
        },
      ],
    },
    {
      TimePeriod: {
        Start: '2024-01-02',
        End: '2024-01-03',
      },
      Total: {
        UnblendedCost: {
          Amount: '135.75',
          Unit: 'USD',
        },
      },
      Groups: [
        {
          Keys: ['EC2'],
          Metrics: {
            UnblendedCost: {
              Amount: '135.75',
              Unit: 'USD',
            },
          },
        },
      ],
    },
  ],
};
