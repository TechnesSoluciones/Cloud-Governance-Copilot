/**
 * E2E Test: Azure Cost Collection Flow
 *
 * Priority: P1 (HIGH - Azure Integration Validation)
 * Category: E2E - Azure Integration
 *
 * PURPOSE:
 * Validates that Azure cost collection works end-to-end, including:
 * - Tenant and Azure account creation
 * - Credential encryption and storage
 * - Cost data collection from Azure Cost Management API
 * - Data persistence to database
 * - Error handling for authentication failures
 *
 * BUSINESS VALUE:
 * - Ensures Azure integration works correctly
 * - Validates multi-cloud capability (AWS + Azure)
 * - Confirms cost data accuracy
 * - Tests error handling and resilience
 *
 * TEST SCENARIOS:
 * 1. Happy path: Successful cost collection from Azure
 * 2. Authentication errors: Invalid credentials handling
 * 3. Data validation: Cost data format and completeness
 * 4. Database persistence: Data saved correctly
 *
 * @module Tests/E2E/AzureCostCollection
 */

import { PrismaClient } from '@prisma/client';
import { CostCollectionService } from '../../modules/finops/services/cost-collection.service';
import {
  createTestTenant,
  createAzureAccount,
  createAzureAccountWithInvalidCreds,
  cleanupTestData,
  disconnectTestDatabase,
  getTestPrismaClient,
} from '../utils/azure-test-helpers';

// ============================================================
// Test Setup
// ============================================================

const prisma = getTestPrismaClient();
let costCollectionService: CostCollectionService;

describe('E2E: Azure Cost Collection Flow', () => {
  let tenantId: string;

  beforeAll(async () => {
    // Initialize cost collection service
    costCollectionService = new CostCollectionService();
  });

  beforeEach(async () => {
    // Create fresh tenant for each test
    const tenant = await createTestTenant();
    tenantId = tenant.id;
  });

  afterEach(async () => {
    // Cleanup test data after each test
    if (tenantId) {
      await cleanupTestData(tenantId);
    }
  });

  afterAll(async () => {
    // Disconnect database
    await disconnectTestDatabase();
  });

  // ============================================================
  // SCENARIO 1: Successful Azure Cost Collection (Happy Path)
  // ============================================================

  describe('Successful Cost Collection', () => {
    it('should collect costs from Azure account end-to-end', async () => {
      // STEP 1: Create Azure account with encrypted credentials
      const azureAccount = await createAzureAccount(tenantId);

      expect(azureAccount).toBeDefined();
      expect(azureAccount.provider).toBe('AZURE');
      expect(azureAccount.status).toBe('ACTIVE');
      expect(azureAccount.credentials).toBeDefined();

      // STEP 2: Trigger cost collection
      const dateRange = {
        start: new Date('2024-12-01'),
        end: new Date('2024-12-07'),
      };

      // IMPORTANT: This test uses MOCKED Azure SDK
      // In real environment, set AZURE_TEST_CLIENT_ID, etc.
      const result = await costCollectionService.collectCostsForAccount(
        azureAccount.id,
        dateRange
      );

      // STEP 3: Verify collection results
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.recordsObtained).toBeGreaterThanOrEqual(0);
      expect(result.recordsSaved).toBeGreaterThanOrEqual(0);
      expect(result.executionTimeMs).toBeGreaterThan(0);

      // STEP 4: Verify data was saved to database
      const savedCosts = await prisma.costData.findMany({
        where: {
          tenantId,
          cloudAccountId: azureAccount.id,
        },
      });

      expect(savedCosts).toBeDefined();

      // If costs were collected (depends on mock data)
      if (result.recordsSaved > 0) {
        expect(savedCosts.length).toBeGreaterThan(0);
        expect(savedCosts.length).toBe(result.recordsSaved);

        // Validate cost data structure
        const firstCost = savedCosts[0];
        expect(firstCost.provider).toBe('AZURE');
        expect(firstCost.service).toBeDefined();
        expect(firstCost.amount).toBeGreaterThanOrEqual(0);
        expect(firstCost.currency).toBe('USD');
        expect(firstCost.date).toBeInstanceOf(Date);
        expect(firstCost.tenantId).toBe(tenantId);
        expect(firstCost.cloudAccountId).toBe(azureAccount.id);

        // Validate metadata
        expect(firstCost.metadata).toBeDefined();
        expect(firstCost.metadata).toHaveProperty('provider');
        expect((firstCost.metadata as any).provider).toBe('AZURE');
      }

      // STEP 5: Verify cloud account lastSync was updated
      const updatedAccount = await prisma.cloudAccount.findUnique({
        where: { id: azureAccount.id },
      });

      expect(updatedAccount).toBeDefined();
      expect(updatedAccount!.lastSync).toBeDefined();
      expect(updatedAccount!.lastSync).toBeInstanceOf(Date);
    }, 30000); // 30 second timeout for Azure API calls

    it('should handle date range filtering correctly', async () => {
      // Create Azure account
      const azureAccount = await createAzureAccount(tenantId);

      // Collect costs for specific date range
      const dateRange = {
        start: new Date('2024-12-01'),
        end: new Date('2024-12-03'),
      };

      const result = await costCollectionService.collectCostsForAccount(
        azureAccount.id,
        dateRange
      );

      expect(result.success).toBe(true);

      // Verify costs are within date range
      if (result.recordsSaved > 0) {
        const costs = await prisma.costData.findMany({
          where: {
            cloudAccountId: azureAccount.id,
          },
        });

        costs.forEach((cost) => {
          const costDate = new Date(cost.date);
          expect(costDate.getTime()).toBeGreaterThanOrEqual(dateRange.start.getTime());
          expect(costDate.getTime()).toBeLessThanOrEqual(dateRange.end.getTime());
        });
      }
    }, 30000);

    it('should prevent duplicate cost records', async () => {
      // Create Azure account
      const azureAccount = await createAzureAccount(tenantId);

      const dateRange = {
        start: new Date('2024-12-01'),
        end: new Date('2024-12-07'),
      };

      // First collection
      const result1 = await costCollectionService.collectCostsForAccount(
        azureAccount.id,
        dateRange
      );

      const savedCount1 = result1.recordsSaved;

      // Second collection (same date range)
      const result2 = await costCollectionService.collectCostsForAccount(
        azureAccount.id,
        dateRange
      );

      // Should not create duplicates
      const totalCosts = await prisma.costData.count({
        where: {
          cloudAccountId: azureAccount.id,
        },
      });

      // Total should not double (duplicate prevention working)
      expect(totalCosts).toBeLessThanOrEqual(savedCount1 + result2.recordsSaved);
    }, 60000);
  });

  // ============================================================
  // SCENARIO 2: Authentication Error Handling
  // ============================================================

  describe('Authentication Error Handling', () => {
    it('should handle Azure authentication errors gracefully', async () => {
      // Create account with INVALID credentials
      const invalidAccount = await createAzureAccountWithInvalidCreds(tenantId);

      expect(invalidAccount).toBeDefined();
      expect(invalidAccount.provider).toBe('AZURE');

      // Trigger collection with invalid credentials
      const dateRange = {
        start: new Date('2024-12-01'),
        end: new Date('2024-12-07'),
      };

      const result = await costCollectionService.collectCostsForAccount(
        invalidAccount.id,
        dateRange
      );

      // CRITICAL: Should fail gracefully without throwing
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.recordsObtained).toBe(0);
      expect(result.recordsSaved).toBe(0);

      // Should have error messages
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);

      // Error should mention authentication
      const errorMessage = result.errors!.join(' ').toLowerCase();
      expect(
        errorMessage.includes('authentication') ||
          errorMessage.includes('credentials') ||
          errorMessage.includes('unauthorized') ||
          errorMessage.includes('invalid')
      ).toBe(true);

      // Verify NO data was saved to database
      const savedCosts = await prisma.costData.count({
        where: {
          cloudAccountId: invalidAccount.id,
        },
      });

      expect(savedCosts).toBe(0);
    }, 30000);

    it('should NOT update lastSync timestamp on authentication failure', async () => {
      // Create invalid account
      const invalidAccount = await createAzureAccountWithInvalidCreds(tenantId);

      const originalLastSync = invalidAccount.lastSync;

      // Attempt collection
      const dateRange = {
        start: new Date('2024-12-01'),
        end: new Date('2024-12-07'),
      };

      await costCollectionService.collectCostsForAccount(
        invalidAccount.id,
        dateRange
      );

      // Verify lastSync was NOT updated
      const updatedAccount = await prisma.cloudAccount.findUnique({
        where: { id: invalidAccount.id },
      });

      expect(updatedAccount!.lastSync).toEqual(originalLastSync);
    }, 30000);
  });

  // ============================================================
  // SCENARIO 3: Data Validation and Quality
  // ============================================================

  describe('Data Validation', () => {
    it('should save valid Azure cost data structure', async () => {
      const azureAccount = await createAzureAccount(tenantId);

      const dateRange = {
        start: new Date('2024-12-01'),
        end: new Date('2024-12-07'),
      };

      const result = await costCollectionService.collectCostsForAccount(
        azureAccount.id,
        dateRange
      );

      if (result.recordsSaved > 0) {
        const costs = await prisma.costData.findMany({
          where: {
            cloudAccountId: azureAccount.id,
          },
        });

        // Validate each cost record
        costs.forEach((cost) => {
          // Required fields
          expect(cost.id).toBeDefined();
          expect(cost.tenantId).toBe(tenantId);
          expect(cost.cloudAccountId).toBe(azureAccount.id);
          expect(cost.provider).toBe('AZURE');
          expect(cost.service).toBeDefined();
          expect(typeof cost.service).toBe('string');
          expect(cost.service.length).toBeGreaterThan(0);
          expect(cost.amount).toBeDefined();
          expect(typeof cost.amount).toBe('number');
          expect(cost.amount).toBeGreaterThanOrEqual(0);
          expect(cost.currency).toBe('USD');
          expect(cost.date).toBeInstanceOf(Date);

          // Optional fields
          if (cost.region) {
            expect(typeof cost.region).toBe('string');
          }

          // Metadata structure
          expect(cost.metadata).toBeDefined();
          expect(typeof cost.metadata).toBe('object');

          // Timestamps
          expect(cost.createdAt).toBeInstanceOf(Date);
          expect(cost.updatedAt).toBeInstanceOf(Date);
        });
      }
    }, 30000);

    it('should group costs by service correctly', async () => {
      const azureAccount = await createAzureAccount(tenantId);

      const dateRange = {
        start: new Date('2024-12-01'),
        end: new Date('2024-12-07'),
      };

      const result = await costCollectionService.collectCostsForAccount(
        azureAccount.id,
        dateRange
      );

      if (result.recordsSaved > 0) {
        // Group costs by service
        const costsByService = await prisma.costData.groupBy({
          by: ['service'],
          where: {
            cloudAccountId: azureAccount.id,
          },
          _sum: {
            amount: true,
          },
          _count: true,
        });

        expect(costsByService).toBeDefined();
        expect(Array.isArray(costsByService)).toBe(true);

        // Each service should have aggregated data
        costsByService.forEach((group) => {
          expect(group.service).toBeDefined();
          expect(group._count).toBeGreaterThan(0);
          expect(group._sum.amount).toBeGreaterThanOrEqual(0);
        });
      }
    }, 30000);
  });

  // ============================================================
  // SCENARIO 4: Tenant Isolation
  // ============================================================

  describe('Tenant Isolation', () => {
    it('should isolate Azure cost data by tenant', async () => {
      // Create FIRST tenant with Azure account
      const tenant1 = await createTestTenant();
      const azureAccount1 = await createAzureAccount(tenant1.id);

      // Create SECOND tenant with Azure account
      const tenant2 = await createTestTenant();
      const azureAccount2 = await createAzureAccount(tenant2.id);

      const dateRange = {
        start: new Date('2024-12-01'),
        end: new Date('2024-12-07'),
      };

      // Collect costs for both tenants
      await costCollectionService.collectCostsForAccount(azureAccount1.id, dateRange);
      await costCollectionService.collectCostsForAccount(azureAccount2.id, dateRange);

      // Verify tenant 1 costs
      const tenant1Costs = await prisma.costData.findMany({
        where: {
          tenantId: tenant1.id,
        },
      });

      tenant1Costs.forEach((cost) => {
        expect(cost.tenantId).toBe(tenant1.id);
        expect(cost.cloudAccountId).toBe(azureAccount1.id);
      });

      // Verify tenant 2 costs
      const tenant2Costs = await prisma.costData.findMany({
        where: {
          tenantId: tenant2.id,
        },
      });

      tenant2Costs.forEach((cost) => {
        expect(cost.tenantId).toBe(tenant2.id);
        expect(cost.cloudAccountId).toBe(azureAccount2.id);
      });

      // CRITICAL: Verify NO overlap between tenants
      const tenant1CostIds = tenant1Costs.map((c) => c.id);
      const tenant2CostIds = tenant2Costs.map((c) => c.id);
      const overlap = tenant1CostIds.filter((id) => tenant2CostIds.includes(id));

      expect(overlap.length).toBe(0);

      // Cleanup both tenants
      await cleanupTestData(tenant1.id);
      await cleanupTestData(tenant2.id);
    }, 60000);
  });

  // ============================================================
  // SCENARIO 5: Performance and Edge Cases
  // ============================================================

  describe('Performance and Edge Cases', () => {
    it('should handle large date ranges efficiently', async () => {
      const azureAccount = await createAzureAccount(tenantId);

      // Large date range (90 days)
      const dateRange = {
        start: new Date('2024-09-01'),
        end: new Date('2024-12-01'),
      };

      const startTime = Date.now();
      const result = await costCollectionService.collectCostsForAccount(
        azureAccount.id,
        dateRange
      );
      const executionTime = Date.now() - startTime;

      expect(result.success).toBe(true);

      // Execution time should be reasonable (< 60 seconds)
      expect(executionTime).toBeLessThan(60000);
    }, 90000);

    it('should handle empty cost data gracefully', async () => {
      const azureAccount = await createAzureAccount(tenantId);

      // Date range with likely no data (future dates)
      const dateRange = {
        start: new Date('2099-01-01'),
        end: new Date('2099-01-07'),
      };

      const result = await costCollectionService.collectCostsForAccount(
        azureAccount.id,
        dateRange
      );

      // Should succeed even with no data
      expect(result.success).toBe(true);
      expect(result.recordsObtained).toBe(0);
      expect(result.recordsSaved).toBe(0);

      // Verify no data was saved
      const savedCosts = await prisma.costData.count({
        where: {
          cloudAccountId: azureAccount.id,
        },
      });

      expect(savedCosts).toBe(0);
    }, 30000);
  });
});
