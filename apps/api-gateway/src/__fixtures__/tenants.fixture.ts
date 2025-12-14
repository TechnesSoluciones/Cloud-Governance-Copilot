/**
 * Test Fixtures: Tenants
 *
 * Provides reusable tenant data for security isolation tests.
 * These fixtures are designed to simulate multi-tenant scenarios
 * to verify proper tenant isolation across the system.
 */

import { Tenant } from '@prisma/client';

/**
 * Tenant A - First tenant for isolation testing
 */
export const tenantAData = {
  id: '00000000-0000-4000-a000-000000000001',
  name: 'Tenant A Corporation',
  slug: 'tenant-a',
  planType: 'enterprise',
  status: 'active',
  settings: {},
  maxUsers: 50,
  maxCloudAccounts: 10,
} as const;

/**
 * Tenant B - Second tenant for isolation testing
 * Used to verify that Tenant A cannot access Tenant B's data
 */
export const tenantBData = {
  id: '00000000-0000-4000-b000-000000000002',
  name: 'Tenant B Industries',
  slug: 'tenant-b',
  planType: 'professional',
  status: 'active',
  settings: {},
  maxUsers: 20,
  maxCloudAccounts: 5,
} as const;

/**
 * Tenant C - Third tenant for additional isolation scenarios
 */
export const tenantCData = {
  id: '00000000-0000-4000-c000-000000000003',
  name: 'Tenant C Enterprises',
  slug: 'tenant-c',
  planType: 'startup',
  status: 'active',
  settings: {},
  maxUsers: 5,
  maxCloudAccounts: 3,
} as const;

/**
 * Inactive tenant for testing edge cases
 */
export const inactiveTenantData = {
  id: '00000000-0000-4000-d000-000000000004',
  name: 'Inactive Tenant',
  slug: 'inactive-tenant',
  planType: 'startup',
  status: 'inactive',
  settings: {},
  maxUsers: 5,
  maxCloudAccounts: 3,
} as const;

/**
 * All tenant fixtures for bulk operations
 */
export const allTenants = [
  tenantAData,
  tenantBData,
  tenantCData,
  inactiveTenantData,
] as const;
