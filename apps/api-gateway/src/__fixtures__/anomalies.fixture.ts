/**
 * Test Fixtures: Cost Anomalies
 *
 * Provides reusable anomaly data for testing anomaly detection and tenant isolation.
 */

import { CostAnomaly } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { tenantAData, tenantBData, tenantCData } from './tenants.fixture';

/**
 * Helper to create a date string
 */
const createDate = (daysAgo: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Critical anomaly for Tenant A
 */
export const anomalyTenantACritical = {
  id: '40000000-0000-4000-a000-000000000001',
  tenantId: tenantAData.id,
  detectedAt: new Date(),
  date: createDate(1),
  severity: 'critical',
  status: 'open',
  provider: 'aws',
  service: 'EC2',
  resourceId: 'i-1234567890abcdef0',
  expectedCost: new Decimal('100.00'),
  actualCost: new Decimal('850.00'),
  deviation: new Decimal('750.00'),
  rootCause: {
    analysis: 'Unexpected spike in EC2 instance hours',
    confidence: 0.95,
    suggestedAction: 'Review instance auto-scaling configuration',
  },
  resolvedAt: null,
  resolvedBy: null,
} as const;

/**
 * High severity anomaly for Tenant A
 */
export const anomalyTenantAHigh = {
  id: '40000000-0000-4000-a000-000000000002',
  tenantId: tenantAData.id,
  detectedAt: new Date(),
  date: createDate(2),
  severity: 'high',
  status: 'open',
  provider: 'aws',
  service: 'RDS',
  resourceId: 'db-instance-prod-01',
  expectedCost: new Decimal('150.00'),
  actualCost: new Decimal('450.00'),
  deviation: new Decimal('200.00'),
  rootCause: {
    analysis: 'Database instance upgraded to larger size',
    confidence: 0.88,
    suggestedAction: 'Verify if upgrade was intentional',
  },
  resolvedAt: null,
  resolvedBy: null,
} as const;

/**
 * Medium severity anomaly for Tenant A (resolved)
 */
export const anomalyTenantAResolved = {
  id: '40000000-0000-4000-a000-000000000003',
  tenantId: tenantAData.id,
  detectedAt: createDate(5),
  date: createDate(5),
  severity: 'medium',
  status: 'resolved',
  provider: 'aws',
  service: 'S3',
  resourceId: 'bucket-production-data',
  expectedCost: new Decimal('50.00'),
  actualCost: new Decimal('120.00'),
  deviation: new Decimal('140.00'),
  rootCause: {
    analysis: 'Large data upload to S3 bucket',
    confidence: 0.92,
    suggestedAction: 'Implement lifecycle policies for old data',
  },
  resolvedAt: createDate(3),
  resolvedBy: '10000000-0000-4000-a000-000000000001', // Tenant A Admin
} as const;

/**
 * Critical anomaly for Tenant B
 */
export const anomalyTenantBCritical = {
  id: '40000000-0000-4000-b000-000000000001',
  tenantId: tenantBData.id,
  detectedAt: new Date(),
  date: createDate(1),
  severity: 'critical',
  status: 'open',
  provider: 'aws',
  service: 'EC2',
  resourceId: 'i-0987654321fedcba0',
  expectedCost: new Decimal('200.00'),
  actualCost: new Decimal('1200.00'),
  deviation: new Decimal('500.00'),
  rootCause: {
    analysis: 'Multiple large EC2 instances running continuously',
    confidence: 0.97,
    suggestedAction: 'Stop unused instances immediately',
  },
  resolvedAt: null,
  resolvedBy: null,
} as const;

/**
 * High severity anomaly for Tenant B
 */
export const anomalyTenantBHigh = {
  id: '40000000-0000-4000-b000-000000000002',
  tenantId: tenantBData.id,
  detectedAt: new Date(),
  date: createDate(1),
  severity: 'high',
  status: 'investigating',
  provider: 'aws',
  service: 'Lambda',
  resourceId: null,
  expectedCost: new Decimal('20.00'),
  actualCost: new Decimal('120.00'),
  deviation: new Decimal('500.00'),
  rootCause: {
    analysis: 'Increase in Lambda invocations',
    confidence: 0.85,
    suggestedAction: 'Review Lambda function triggers',
  },
  resolvedAt: null,
  resolvedBy: null,
} as const;

/**
 * Low severity anomaly for Tenant C
 */
export const anomalyTenantCLow = {
  id: '40000000-0000-4000-c000-000000000001',
  tenantId: tenantCData.id,
  detectedAt: new Date(),
  date: createDate(1),
  severity: 'low',
  status: 'open',
  provider: 'aws',
  service: 'EC2',
  resourceId: 'i-tenant-c-instance-01',
  expectedCost: new Decimal('80.00'),
  actualCost: new Decimal('95.00'),
  deviation: new Decimal('18.75'),
  rootCause: null,
  resolvedAt: null,
  resolvedBy: null,
} as const;

/**
 * All anomaly fixtures for bulk operations
 */
export const allAnomalies = [
  anomalyTenantACritical,
  anomalyTenantAHigh,
  anomalyTenantAResolved,
  anomalyTenantBCritical,
  anomalyTenantBHigh,
  anomalyTenantCLow,
] as const;
