/**
 * Azure Test Helpers
 *
 * Utility functions for creating test data and managing test lifecycle
 * for Azure integration tests and E2E tests.
 *
 * Features:
 * - Create test tenants, users, and cloud accounts
 * - Support for both AWS and Azure account creation
 * - Invalid credentials for error scenario testing
 * - Cleanup utilities for test data
 * - Wait utilities for async job processing
 *
 * @module Tests/Utils/AzureTestHelpers
 */

import { PrismaClient } from '@prisma/client';
import { encryptFields } from '../../utils/encryption';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://copilot:simple_dev_pass@localhost:5432/copilot',
    },
  },
});

// ============================================================
// Types and Interfaces
// ============================================================

interface AzureCredentials {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  subscriptionId: string;
}

interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

// ============================================================
// Tenant Management
// ============================================================

/**
 * Create a test tenant for E2E testing
 *
 * @returns Created tenant object
 *
 * @example
 * ```typescript
 * const tenant = await createTestTenant();
 * console.log(tenant.id); // Use for creating related resources
 * ```
 */
export async function createTestTenant() {
  return await prisma.tenant.create({
    data: {
      id: `test-tenant-${Date.now()}`,
      name: 'E2E Test Tenant',
      slug: `e2e-test-${Date.now()}`,
      planType: 'starter',
    },
  });
}

/**
 * Create a test user for a tenant
 *
 * @param tenantId - The tenant ID to associate the user with
 * @returns Created user object
 */
export async function createTestUser(tenantId: string) {
  return await prisma.user.create({
    data: {
      id: `test-user-${Date.now()}`,
      tenantId,
      email: `test-user-${Date.now()}@example.com`,
      fullName: 'Test User',
      passwordHash: 'hashed-password-test',
      role: 'user',
    },
  });
}

// ============================================================
// Azure Cloud Account Management
// ============================================================

/**
 * Create an Azure cloud account with encrypted credentials
 *
 * @param tenantId - The tenant ID to associate the account with
 * @returns Created Azure cloud account
 *
 * @example
 * ```typescript
 * const tenant = await createTestTenant();
 * const azureAccount = await createAzureAccount(tenant.id);
 * ```
 */
export async function createAzureAccount(tenantId: string) {
  const credentials: AzureCredentials = {
    clientId: process.env.AZURE_TEST_CLIENT_ID || 'test-client-id-12345',
    clientSecret: process.env.AZURE_TEST_CLIENT_SECRET || 'test-secret-12345',
    tenantId: process.env.AZURE_TEST_TENANT_ID || 'test-tenant-id-12345',
    subscriptionId: process.env.AZURE_TEST_SUBSCRIPTION_ID || 'test-subscription-id-12345',
  };

  const encryptedCreds = encryptFields({
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    tenantId: credentials.tenantId,
    subscriptionId: credentials.subscriptionId,
  });

  // Convert to the format expected by CloudAccount schema
  const credentialsJson = JSON.stringify(encryptedCreds);
  const encryptedData = encryptFields({ credentials: credentialsJson });

  return await prisma.cloudAccount.create({
    data: {
      id: `azure-account-${Date.now()}`,
      tenantId,
      provider: 'azure',
      accountName: 'Test Azure Account',
      accountIdentifier: `azure-${Date.now()}`,
      status: 'active',
      credentialsCiphertext: encryptedData.credentials.ciphertext,
      credentialsIv: encryptedData.credentials.iv,
      credentialsAuthTag: encryptedData.credentials.authTag,
    },
  });
}

/**
 * Create an Azure cloud account with INVALID credentials for error testing
 *
 * @param tenantId - The tenant ID to associate the account with
 * @returns Created Azure cloud account with invalid credentials
 *
 * @example
 * ```typescript
 * const tenant = await createTestTenant();
 * const invalidAccount = await createAzureAccountWithInvalidCreds(tenant.id);
 * // This account will fail authentication when used
 * ```
 */
export async function createAzureAccountWithInvalidCreds(tenantId: string) {
  const invalidCredentials: AzureCredentials = {
    clientId: 'invalid-client-id-00000',
    clientSecret: 'invalid-secret-00000',
    tenantId: 'invalid-tenant-id-00000',
    subscriptionId: 'invalid-subscription-id-00000',
  };

  const encryptedCreds = encryptFields({
    clientId: invalidCredentials.clientId,
    clientSecret: invalidCredentials.clientSecret,
    tenantId: invalidCredentials.tenantId,
    subscriptionId: invalidCredentials.subscriptionId,
  });

  // Convert to the format expected by CloudAccount schema
  const credentialsJson = JSON.stringify(encryptedCreds);
  const encryptedData = encryptFields({ credentials: credentialsJson });

  return await prisma.cloudAccount.create({
    data: {
      id: `azure-invalid-${Date.now()}`,
      tenantId,
      provider: 'azure',
      accountName: 'Invalid Azure Account (Test)',
      accountIdentifier: `azure-invalid-${Date.now()}`,
      status: 'active',
      credentialsCiphertext: encryptedData.credentials.ciphertext,
      credentialsIv: encryptedData.credentials.iv,
      credentialsAuthTag: encryptedData.credentials.authTag,
    },
  });
}

// ============================================================
// AWS Cloud Account Management
// ============================================================

/**
 * Create an AWS cloud account with encrypted credentials
 *
 * @param tenantId - The tenant ID to associate the account with
 * @returns Created AWS cloud account
 *
 * @example
 * ```typescript
 * const tenant = await createTestTenant();
 * const awsAccount = await createAWSAccount(tenant.id);
 * ```
 */
export async function createAWSAccount(tenantId: string) {
  const credentials: AWSCredentials = {
    accessKeyId: process.env.AWS_TEST_ACCESS_KEY || 'AKIATEST12345',
    secretAccessKey: process.env.AWS_TEST_SECRET_KEY || 'test-secret-key-12345',
    region: 'us-east-1',
  };

  const encryptedCreds = encryptFields({
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    region: credentials.region,
  });

  // Convert to the format expected by CloudAccount schema
  const credentialsJson = JSON.stringify(encryptedCreds);
  const encryptedData = encryptFields({ credentials: credentialsJson });

  return await prisma.cloudAccount.create({
    data: {
      id: `aws-account-${Date.now()}`,
      tenantId,
      provider: 'aws',
      accountName: 'Test AWS Account',
      accountIdentifier: `aws-${Date.now()}`,
      status: 'active',
      credentialsCiphertext: encryptedData.credentials.ciphertext,
      credentialsIv: encryptedData.credentials.iv,
      credentialsAuthTag: encryptedData.credentials.authTag,
    },
  });
}

/**
 * Create an AWS cloud account with INVALID credentials for error testing
 *
 * @param tenantId - The tenant ID to associate the account with
 * @returns Created AWS cloud account with invalid credentials
 */
export async function createAWSAccountWithInvalidCreds(tenantId: string) {
  const invalidCredentials: AWSCredentials = {
    accessKeyId: 'AKIAINVALID00000',
    secretAccessKey: 'invalid-secret-key-00000',
    region: 'us-east-1',
  };

  const encryptedCreds = encryptFields({
    accessKeyId: invalidCredentials.accessKeyId,
    secretAccessKey: invalidCredentials.secretAccessKey,
    region: invalidCredentials.region,
  });

  // Convert to the format expected by CloudAccount schema
  const credentialsJson = JSON.stringify(encryptedCreds);
  const encryptedData = encryptFields({ credentials: credentialsJson });

  return await prisma.cloudAccount.create({
    data: {
      id: `aws-invalid-${Date.now()}`,
      tenantId,
      provider: 'aws',
      accountName: 'Invalid AWS Account (Test)',
      accountIdentifier: `aws-invalid-${Date.now()}`,
      status: 'active',
      credentialsCiphertext: encryptedData.credentials.ciphertext,
      credentialsIv: encryptedData.credentials.iv,
      credentialsAuthTag: encryptedData.credentials.authTag,
    },
  });
}

// ============================================================
// Async Processing Utilities
// ============================================================

/**
 * Wait for BullMQ job processing to complete
 *
 * IMPORTANT: This is a simplified implementation for testing.
 * In production, you should monitor actual job completion via BullMQ events.
 *
 * @param maxWaitMs - Maximum time to wait in milliseconds (default: 30000)
 * @returns Promise that resolves after waiting
 *
 * @example
 * ```typescript
 * await scheduleDailyCostCollection();
 * await waitForJobCompletion(5000); // Wait 5 seconds
 * const costs = await prisma.costData.findMany();
 * ```
 */
export async function waitForJobCompletion(maxWaitMs: number = 30000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, maxWaitMs));
}

/**
 * Poll the database until a condition is met or timeout
 *
 * @param checkFn - Function that returns true when condition is met
 * @param intervalMs - Polling interval in milliseconds (default: 1000)
 * @param maxWaitMs - Maximum time to wait in milliseconds (default: 30000)
 * @returns Promise that resolves when condition is met or rejects on timeout
 *
 * @example
 * ```typescript
 * await waitForCondition(
 *   async () => {
 *     const costs = await prisma.costData.findMany({ where: { cloudAccountId } });
 *     return costs.length > 0;
 *   },
 *   1000, // Check every second
 *   10000 // Max wait 10 seconds
 * );
 * ```
 */
export async function waitForCondition(
  checkFn: () => Promise<boolean>,
  intervalMs: number = 1000,
  maxWaitMs: number = 30000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const conditionMet = await checkFn();
    if (conditionMet) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Condition not met within ${maxWaitMs}ms`);
}

// ============================================================
// Cost Data Creation
// ============================================================

/**
 * Create test cost data for a cloud account
 *
 * @param tenantId - Tenant ID
 * @param cloudAccountId - Cloud account ID
 * @param provider - Cloud provider ('AWS' or 'AZURE')
 * @param count - Number of cost records to create (default: 10)
 * @returns Array of created cost data records
 */
export async function createTestCostData(
  tenantId: string,
  cloudAccountId: string,
  provider: 'AWS' | 'AZURE',
  count: number = 10
) {
  const costRecords = [];

  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    costRecords.push({
      id: `cost-${provider}-${Date.now()}-${i}`,
      tenantId,
      cloudAccountId,
      provider,
      service: provider === 'AWS' ? 'AmazonEC2' : 'Virtual Machines',
      amount: Math.random() * 1000,
      currency: 'USD',
      date,
      region: provider === 'AWS' ? 'us-east-1' : 'eastus',
      metadata: {
        provider,
        service: provider === 'AWS' ? 'AmazonEC2' : 'Virtual Machines',
        resourceType: provider === 'AWS' ? 'ec2-instance' : 'azurevm',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await prisma.costData.createMany({
    data: costRecords,
  });

  return costRecords;
}

// ============================================================
// Asset Data Creation
// ============================================================

/**
 * Create test asset data for a cloud account
 *
 * @param tenantId - Tenant ID
 * @param cloudAccountId - Cloud account ID
 * @param provider - Cloud provider ('AWS' or 'AZURE')
 * @param count - Number of asset records to create (default: 5)
 * @returns Array of created asset records
 */
export async function createTestAssets(
  tenantId: string,
  cloudAccountId: string,
  provider: 'AWS' | 'AZURE',
  count: number = 5
) {
  const assetRecords = [];

  for (let i = 0; i < count; i++) {
    assetRecords.push({
      id: `asset-${provider}-${Date.now()}-${i}`,
      tenantId,
      cloudAccountId,
      provider: provider === 'AWS' ? 'aws' : 'azure',
      resourceId: `resource-${provider}-${i}`,
      resourceType: provider === 'AWS' ? 'ec2-instance' : 'azurevm',
      name: `${provider}-VM-${i}`,
      region: provider === 'AWS' ? 'us-east-1' : 'eastus',
      status: 'running',
      tags: {
        Environment: i % 2 === 0 ? 'production' : 'development',
        Owner: 'test-team',
      },
      metadata: {
        provider,
        instanceType: provider === 'AWS' ? 't3.medium' : 'Standard_B2s',
      },
    });
  }

  await prisma.asset.createMany({
    data: assetRecords,
  });

  return assetRecords;
}

// ============================================================
// Cleanup Utilities
// ============================================================

/**
 * Clean up all test data for a specific tenant
 *
 * @param tenantId - The tenant ID to clean up
 *
 * @example
 * ```typescript
 * afterEach(async () => {
 *   await cleanupTestData(tenant.id);
 * });
 * ```
 */
export async function cleanupTestData(tenantId: string): Promise<void> {
  // Delete in reverse order of dependencies
  await prisma.costData.deleteMany({ where: { tenantId } });
  await prisma.costAnomaly.deleteMany({ where: { tenantId } });
  await prisma.asset.deleteMany({ where: { tenantId } });
  await prisma.cloudAccount.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
}

/**
 * Clean up multiple tenants
 *
 * @param tenantIds - Array of tenant IDs to clean up
 */
export async function cleanupMultipleTenants(tenantIds: string[]): Promise<void> {
  for (const tenantId of tenantIds) {
    await cleanupTestData(tenantId);
  }
}

/**
 * Clean up all test data (DANGEROUS - use only in test environments)
 *
 * @warning This will delete ALL data in the test database
 */
export async function cleanupAllTestData(): Promise<void> {
  // Only allow in test environment
  if (!process.env.DATABASE_URL?.includes('test')) {
    throw new Error('cleanupAllTestData can only be used in test environment');
  }

  await prisma.costData.deleteMany();
  await prisma.costAnomaly.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.cloudAccount.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
}

// ============================================================
// Export Prisma Client for Direct Access
// ============================================================

/**
 * Get Prisma client instance for test database
 *
 * @returns Prisma client instance
 */
export function getTestPrismaClient() {
  return prisma;
}

/**
 * Disconnect Prisma client (call in afterAll)
 */
export async function disconnectTestDatabase() {
  await prisma.$disconnect();
}

// ============================================================
// Mock Job Scheduling
// ============================================================

/**
 * Mock function to simulate scheduling daily cost collection
 * In real implementation, this would trigger BullMQ job
 *
 * @returns Promise that resolves when job is scheduled
 */
export async function scheduleDailyCostCollection(): Promise<void> {
  // Mock implementation - in real tests, this would trigger actual BullMQ job
  console.log('[TEST] Daily cost collection scheduled (mock)');
  return Promise.resolve();
}

/**
 * Mock function to simulate scheduling asset discovery
 * In real implementation, this would trigger BullMQ job
 *
 * @returns Promise that resolves when job is scheduled
 */
export async function scheduleAssetDiscovery(): Promise<void> {
  // Mock implementation - in real tests, this would trigger actual BullMQ job
  console.log('[TEST] Asset discovery scheduled (mock)');
  return Promise.resolve();
}
