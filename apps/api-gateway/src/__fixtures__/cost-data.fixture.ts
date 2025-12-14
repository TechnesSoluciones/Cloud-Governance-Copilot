/**
 * Test Fixtures: Cost Data
 *
 * Provides reusable cost data for FinOps testing and tenant isolation verification.
 */

import { CostData } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { tenantAData, tenantBData, tenantCData } from './tenants.fixture';
import { awsAccountTenantA, awsAccountTenantB, awsAccountTenantC } from './aws-accounts.fixture';

/**
 * Helper to create a date string for cost data
 */
const createDate = (daysAgo: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Cost data for Tenant A - EC2 costs
 */
export const costDataTenantAEC2 = {
  id: '30000000-0000-4000-a000-000000000001',
  tenantId: tenantAData.id,
  cloudAccountId: awsAccountTenantA.id,
  assetId: null,
  date: createDate(1),
  amount: new Decimal('245.67'),
  currency: 'USD',
  provider: 'aws',
  service: 'EC2',
  usageType: 'Instance hours',
  operation: 'RunInstances',
  tags: {
    environment: 'production',
    team: 'platform',
  },
  metadata: {
    instanceType: 't3.large',
    region: 'us-east-1',
  },
} as const;

/**
 * Cost data for Tenant A - RDS costs
 */
export const costDataTenantARDS = {
  id: '30000000-0000-4000-a000-000000000002',
  tenantId: tenantAData.id,
  cloudAccountId: awsAccountTenantA.id,
  assetId: null,
  date: createDate(1),
  amount: new Decimal('128.45'),
  currency: 'USD',
  provider: 'aws',
  service: 'RDS',
  usageType: 'Database hours',
  operation: 'CreateDBInstance',
  tags: {
    environment: 'production',
    database: 'postgres',
  },
  metadata: {
    instanceClass: 'db.r5.large',
    region: 'us-east-1',
  },
} as const;

/**
 * Cost data for Tenant A - S3 costs
 */
export const costDataTenantAS3 = {
  id: '30000000-0000-4000-a000-000000000003',
  tenantId: tenantAData.id,
  cloudAccountId: awsAccountTenantA.id,
  assetId: null,
  date: createDate(1),
  amount: new Decimal('45.23'),
  currency: 'USD',
  provider: 'aws',
  service: 'S3',
  usageType: 'Storage GB-month',
  operation: 'StandardStorage',
  tags: {
    environment: 'production',
  },
  metadata: {
    storageClass: 'STANDARD',
    region: 'us-east-1',
  },
} as const;

/**
 * Cost data for Tenant B - EC2 costs
 */
export const costDataTenantBEC2 = {
  id: '30000000-0000-4000-b000-000000000001',
  tenantId: tenantBData.id,
  cloudAccountId: awsAccountTenantB.id,
  assetId: null,
  date: createDate(1),
  amount: new Decimal('567.89'),
  currency: 'USD',
  provider: 'aws',
  service: 'EC2',
  usageType: 'Instance hours',
  operation: 'RunInstances',
  tags: {
    environment: 'production',
    team: 'backend',
  },
  metadata: {
    instanceType: 'm5.xlarge',
    region: 'eu-west-1',
  },
} as const;

/**
 * Cost data for Tenant B - Lambda costs
 */
export const costDataTenantBLambda = {
  id: '30000000-0000-4000-b000-000000000002',
  tenantId: tenantBData.id,
  cloudAccountId: awsAccountTenantB.id,
  assetId: null,
  date: createDate(1),
  amount: new Decimal('23.45'),
  currency: 'USD',
  provider: 'aws',
  service: 'Lambda',
  usageType: 'Invocations',
  operation: 'Invoke',
  tags: {
    environment: 'production',
  },
  metadata: {
    memorySize: 1024,
    region: 'eu-west-1',
  },
} as const;

/**
 * Cost data for Tenant C - EC2 costs
 */
export const costDataTenantCEC2 = {
  id: '30000000-0000-4000-c000-000000000001',
  tenantId: tenantCData.id,
  cloudAccountId: awsAccountTenantC.id,
  assetId: null,
  date: createDate(1),
  amount: new Decimal('89.12'),
  currency: 'USD',
  provider: 'aws',
  service: 'EC2',
  usageType: 'Instance hours',
  operation: 'RunInstances',
  tags: {
    environment: 'production',
  },
  metadata: {
    instanceType: 't3.medium',
    region: 'ap-southeast-1',
  },
} as const;

/**
 * Historical cost data for Tenant A (7 days ago)
 */
export const costDataTenantAHistorical = {
  id: '30000000-0000-4000-a000-000000000099',
  tenantId: tenantAData.id,
  cloudAccountId: awsAccountTenantA.id,
  assetId: null,
  date: createDate(7),
  amount: new Decimal('198.34'),
  currency: 'USD',
  provider: 'aws',
  service: 'EC2',
  usageType: 'Instance hours',
  operation: 'RunInstances',
  tags: {},
  metadata: {},
} as const;

/**
 * All cost data fixtures for bulk operations
 */
export const allCostData = [
  costDataTenantAEC2,
  costDataTenantARDS,
  costDataTenantAS3,
  costDataTenantBEC2,
  costDataTenantBLambda,
  costDataTenantCEC2,
  costDataTenantAHistorical,
] as const;
