/**
 * Test Fixtures: Users
 *
 * Provides reusable user data for authentication and authorization tests.
 * Includes users for different tenants with various roles to test RBAC.
 */

import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { tenantAData, tenantBData, tenantCData } from './tenants.fixture';

/**
 * Default password for all test users (hashed)
 * Plain text: TestPassword123!
 */
export const TEST_PASSWORD = 'TestPassword123!';
export const TEST_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);

/**
 * Admin user for Tenant A
 */
export const userTenantAAdmin = {
  id: '10000000-0000-4000-a000-000000000001',
  tenantId: tenantAData.id,
  email: 'admin@tenant-a.test',
  passwordHash: TEST_PASSWORD_HASH,
  fullName: 'Tenant A Admin',
  role: 'admin',
  status: 'active',
  avatarUrl: null,
  lastLogin: null,
  preferences: {},
  emailVerified: true,
  emailVerificationToken: null,
  emailVerificationExpires: null,
  mfaEnabled: false,
  mfaSecret: null,
  mfaBackupCodes: null,
} as const;

/**
 * Regular user for Tenant A
 */
export const userTenantARegular = {
  id: '10000000-0000-4000-a000-000000000002',
  tenantId: tenantAData.id,
  email: 'user@tenant-a.test',
  passwordHash: TEST_PASSWORD_HASH,
  fullName: 'Tenant A User',
  role: 'user',
  status: 'active',
  avatarUrl: null,
  lastLogin: null,
  preferences: {},
  emailVerified: true,
  emailVerificationToken: null,
  emailVerificationExpires: null,
  mfaEnabled: false,
  mfaSecret: null,
  mfaBackupCodes: null,
} as const;

/**
 * Admin user for Tenant B
 */
export const userTenantBAdmin = {
  id: '10000000-0000-4000-b000-000000000001',
  tenantId: tenantBData.id,
  email: 'admin@tenant-b.test',
  passwordHash: TEST_PASSWORD_HASH,
  fullName: 'Tenant B Admin',
  role: 'admin',
  status: 'active',
  avatarUrl: null,
  lastLogin: null,
  preferences: {},
  emailVerified: true,
  emailVerificationToken: null,
  emailVerificationExpires: null,
  mfaEnabled: false,
  mfaSecret: null,
  mfaBackupCodes: null,
} as const;

/**
 * Regular user for Tenant B
 */
export const userTenantBRegular = {
  id: '10000000-0000-4000-b000-000000000002',
  tenantId: tenantBData.id,
  email: 'user@tenant-b.test',
  passwordHash: TEST_PASSWORD_HASH,
  fullName: 'Tenant B User',
  role: 'user',
  status: 'active',
  avatarUrl: null,
  lastLogin: null,
  preferences: {},
  emailVerified: true,
  emailVerificationToken: null,
  emailVerificationExpires: null,
  mfaEnabled: false,
  mfaSecret: null,
  mfaBackupCodes: null,
} as const;

/**
 * User for Tenant C
 */
export const userTenantCRegular = {
  id: '10000000-0000-4000-c000-000000000001',
  tenantId: tenantCData.id,
  email: 'user@tenant-c.test',
  passwordHash: TEST_PASSWORD_HASH,
  fullName: 'Tenant C User',
  role: 'user',
  status: 'active',
  avatarUrl: null,
  lastLogin: null,
  preferences: {},
  emailVerified: true,
  emailVerificationToken: null,
  emailVerificationExpires: null,
  mfaEnabled: false,
  mfaSecret: null,
  mfaBackupCodes: null,
} as const;

/**
 * Unverified user for testing email verification flows
 */
export const userUnverified = {
  id: '10000000-0000-4000-a000-000000000003',
  tenantId: tenantAData.id,
  email: 'unverified@tenant-a.test',
  passwordHash: TEST_PASSWORD_HASH,
  fullName: 'Unverified User',
  role: 'user',
  status: 'active',
  avatarUrl: null,
  lastLogin: null,
  preferences: {},
  emailVerified: false,
  emailVerificationToken: 'test-verification-token-123',
  emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  mfaEnabled: false,
  mfaSecret: null,
  mfaBackupCodes: null,
} as const;

/**
 * All user fixtures for bulk operations
 */
export const allUsers = [
  userTenantAAdmin,
  userTenantARegular,
  userTenantBAdmin,
  userTenantBRegular,
  userTenantCRegular,
  userUnverified,
] as const;
