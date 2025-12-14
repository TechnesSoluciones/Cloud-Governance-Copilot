/**
 * Asset Discovery Job Unit Tests
 *
 * Purpose: Test the BullMQ job that orchestrates daily asset discovery
 * across all cloud accounts with proper error handling and retry logic.
 *
 * Test Coverage:
 * - Single tenant asset discovery
 * - All tenants asset discovery
 * - Specific cloud account filtering
 * - Error handling and retry logic
 * - Progress tracking
 * - Job result summaries
 *
 * @module Tests/Unit/Jobs/AssetDiscovery
 */

import { Job } from 'bullmq';
import { processAssetDiscovery } from '../../../shared/jobs/asset-discovery.job';
import { prismaMock } from '../../../__mocks__/prisma';
import { AssetDiscoveryService } from '../../../modules/assets/services/asset-discovery.service';
import type { Tenant } from '@prisma/client';

// Mock PrismaClient to use our prismaMock
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => prismaMock),
}));

// Mock the AssetDiscoveryService
jest.mock('../../../modules/assets/services/asset-discovery.service');

// Mock event bus
jest.mock('../../../shared/events/event-bus', () => ({
  eventBus: {
    emit: jest.fn(),
    on: jest.fn(),
  },
}));

// Mock tenants for testing
const mockTenants: Tenant[] = [
  {
    id: 'tenant-1',
    name: 'Tenant One',
    slug: 'tenant-one',
    planType: 'enterprise',
    status: 'active',
    settings: {},
    maxUsers: 10,
    maxCloudAccounts: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'tenant-2',
    name: 'Tenant Two',
    slug: 'tenant-two',
    planType: 'professional',
    status: 'active',
    settings: {},
    maxUsers: 5,
    maxCloudAccounts: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'tenant-3',
    name: 'Tenant Three',
    slug: 'tenant-three',
    planType: 'starter',
    status: 'active',
    settings: {},
    maxUsers: 3,
    maxCloudAccounts: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('Asset Discovery Job', () => {
  let mockJob: Partial<Job>;
  let mockDiscoveryService: jest.Mocked<AssetDiscoveryService>;

  beforeEach(() => {
    // Create mock job
    mockJob = {
      id: 'job-123',
      data: {},
      updateProgress: jest.fn(),
    };

    // Reset mocks
    jest.clearAllMocks();

    // Mock Prisma $disconnect
    prismaMock.$disconnect = jest.fn().mockResolvedValue(undefined);

    // Get mocked discovery service instance
    mockDiscoveryService = {
      discoverAssets: jest.fn(),
    } as any;

    (AssetDiscoveryService as jest.MockedClass<typeof AssetDiscoveryService>).mockImplementation(
      () => mockDiscoveryService
    );
  });

  // ============================================================
  // Test Suite 1: Single Tenant Discovery
  // ============================================================

  describe('Single Tenant Asset Discovery', () => {
    it('should discover assets for a specific tenant', async () => {
      // Arrange
      mockJob.data = { tenantId: 'tenant-123' };

      mockDiscoveryService.discoverAssets.mockResolvedValue({
        assetsDiscovered: 25,
        accountsProcessed: 2,
        errors: [],
      });

      // Act
      const result = await processAssetDiscovery(mockJob as Job);

      // Assert
      expect(mockDiscoveryService.discoverAssets).toHaveBeenCalledWith('tenant-123', undefined);
      expect(result).toEqual({
        tenantsProcessed: 1,
        accountsProcessed: 2,
        assetsDiscovered: 25,
        errorCount: 0,
        executionTimeMs: expect.any(Number),
      });
    });

    it('should discover assets for a specific cloud account within a tenant', async () => {
      // Arrange
      mockJob.data = {
        tenantId: 'tenant-123',
        cloudAccountId: 'account-456',
      };

      mockDiscoveryService.discoverAssets.mockResolvedValue({
        assetsDiscovered: 10,
        accountsProcessed: 1,
        errors: [],
      });

      // Act
      const result = await processAssetDiscovery(mockJob as Job);

      // Assert
      expect(mockDiscoveryService.discoverAssets).toHaveBeenCalledWith('tenant-123', 'account-456');
      expect(result.accountsProcessed).toBe(1);
      expect(result.assetsDiscovered).toBe(10);
    });

    it('should count errors from discovery service', async () => {
      // Arrange
      mockJob.data = { tenantId: 'tenant-123' };

      mockDiscoveryService.discoverAssets.mockResolvedValue({
        assetsDiscovered: 5,
        accountsProcessed: 3,
        errors: [
          { accountId: 'acc-1', provider: 'aws', error: 'Rate limit' },
          { accountId: 'acc-2', provider: 'azure', error: 'Auth failed' },
        ],
      });

      // Act
      const result = await processAssetDiscovery(mockJob as Job);

      // Assert
      expect(result.errorCount).toBe(2);
      expect(result.assetsDiscovered).toBe(5);
    });
  });

  // ============================================================
  // Test Suite 2: All Tenants Discovery
  // ============================================================

  describe('All Tenants Asset Discovery', () => {
    it('should discover assets for all active tenants', async () => {
      // Arrange
      mockJob.data = {}; // No tenantId means all tenants

      prismaMock.tenant.findMany.mockResolvedValue(mockTenants);

      mockDiscoveryService.discoverAssets
        .mockResolvedValueOnce({
          assetsDiscovered: 20,
          accountsProcessed: 2,
          errors: [],
        })
        .mockResolvedValueOnce({
          assetsDiscovered: 15,
          accountsProcessed: 1,
          errors: [],
        })
        .mockResolvedValueOnce({
          assetsDiscovered: 5,
          accountsProcessed: 1,
          errors: [],
        });

      // Act
      const result = await processAssetDiscovery(mockJob as Job);

      // Assert
      expect(prismaMock.tenant.findMany).toHaveBeenCalledWith({
        where: { status: 'active' },
      });
      expect(mockDiscoveryService.discoverAssets).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        tenantsProcessed: 3,
        accountsProcessed: 4, // 2 + 1 + 1
        assetsDiscovered: 40, // 20 + 15 + 5
        errorCount: 0,
        executionTimeMs: expect.any(Number),
      });
    });

    it('should update job progress during processing', async () => {
      // Arrange
      mockJob.data = {};
      prismaMock.tenant.findMany.mockResolvedValue(mockTenants);

      mockDiscoveryService.discoverAssets.mockResolvedValue({
        assetsDiscovered: 10,
        accountsProcessed: 1,
        errors: [],
      });

      // Act
      await processAssetDiscovery(mockJob as Job);

      // Assert
      expect(mockJob.updateProgress).toHaveBeenCalledTimes(3);
      expect(mockJob.updateProgress).toHaveBeenNthCalledWith(1, 33); // 1/3 = 33%
      expect(mockJob.updateProgress).toHaveBeenNthCalledWith(2, 67); // 2/3 = 67%
      expect(mockJob.updateProgress).toHaveBeenNthCalledWith(3, 100); // 3/3 = 100%
    });

    it('should handle errors in individual tenants and continue processing', async () => {
      // Arrange
      mockJob.data = {};
      prismaMock.tenant.findMany.mockResolvedValue(mockTenants);

      mockDiscoveryService.discoverAssets
        .mockResolvedValueOnce({
          assetsDiscovered: 10,
          accountsProcessed: 1,
          errors: [],
        })
        .mockRejectedValueOnce(new Error('Discovery failed for tenant 2'))
        .mockResolvedValueOnce({
          assetsDiscovered: 5,
          accountsProcessed: 1,
          errors: [],
        });

      // Act
      const result = await processAssetDiscovery(mockJob as Job);

      // Assert
      expect(result.tenantsProcessed).toBe(2); // Only successful tenants
      expect(result.assetsDiscovered).toBe(15); // 10 + 5
      expect(result.errorCount).toBe(1); // 1 tenant failed
    });

    it('should aggregate errors from all tenants', async () => {
      // Arrange
      mockJob.data = {};
      prismaMock.tenant.findMany.mockResolvedValue(mockTenants.slice(0, 2));

      mockDiscoveryService.discoverAssets
        .mockResolvedValueOnce({
          assetsDiscovered: 10,
          accountsProcessed: 2,
          errors: [
            { accountId: 'acc-1', provider: 'aws', error: 'Rate limit' },
          ],
        })
        .mockResolvedValueOnce({
          assetsDiscovered: 5,
          accountsProcessed: 1,
          errors: [
            { accountId: 'acc-2', provider: 'azure', error: 'Auth failed' },
            { accountId: 'acc-3', provider: 'aws', error: 'Timeout' },
          ],
        });

      // Act
      const result = await processAssetDiscovery(mockJob as Job);

      // Assert
      expect(result.errorCount).toBe(3); // 1 + 2 errors
      expect(result.tenantsProcessed).toBe(2);
    });

    it('should return zero counts when no active tenants found', async () => {
      // Arrange
      mockJob.data = {};
      prismaMock.tenant.findMany.mockResolvedValue([]);

      // Act
      const result = await processAssetDiscovery(mockJob as Job);

      // Assert
      expect(result).toEqual({
        tenantsProcessed: 0,
        accountsProcessed: 0,
        assetsDiscovered: 0,
        errorCount: 0,
        executionTimeMs: expect.any(Number),
      });
      expect(mockDiscoveryService.discoverAssets).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Test Suite 3: Error Handling
  // ============================================================

  describe('Error Handling', () => {
    it('should throw error when discovery service throws fatal error', async () => {
      // Arrange
      mockJob.data = { tenantId: 'tenant-123' };

      mockDiscoveryService.discoverAssets.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(processAssetDiscovery(mockJob as Job)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should include execution time in result', async () => {
      // Arrange
      mockJob.data = { tenantId: 'tenant-123' };

      mockDiscoveryService.discoverAssets.mockImplementation(async () => {
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          assetsDiscovered: 10,
          accountsProcessed: 1,
          errors: [],
        };
      });

      // Act
      const result = await processAssetDiscovery(mockJob as Job);

      // Assert
      expect(result.executionTimeMs).toBeGreaterThan(0);
      expect(result.executionTimeMs).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });

  // ============================================================
  // Test Suite 4: Job Data Validation
  // ============================================================

  describe('Job Data Validation', () => {
    it('should handle missing job data gracefully', async () => {
      // Arrange
      mockJob.data = undefined as any;
      prismaMock.tenant.findMany.mockResolvedValue([]);

      // Act
      const result = await processAssetDiscovery(mockJob as Job);

      // Assert
      expect(result.tenantsProcessed).toBe(0);
      expect(prismaMock.tenant.findMany).toHaveBeenCalled();
    });

    it('should handle empty job data object', async () => {
      // Arrange
      mockJob.data = {};
      prismaMock.tenant.findMany.mockResolvedValue([]);

      // Act
      const result = await processAssetDiscovery(mockJob as Job);

      // Assert
      expect(result.tenantsProcessed).toBe(0);
    });

    it('should ignore cloudAccountId when tenantId is not provided', async () => {
      // Arrange
      mockJob.data = { cloudAccountId: 'account-123' }; // cloudAccountId without tenantId
      prismaMock.tenant.findMany.mockResolvedValue([]);

      // Act
      const result = await processAssetDiscovery(mockJob as Job);

      // Assert
      // Should process as "all tenants" mode, not single tenant
      expect(prismaMock.tenant.findMany).toHaveBeenCalled();
      expect(result.tenantsProcessed).toBe(0);
    });
  });

  // ============================================================
  // Test Suite 5: Performance Metrics
  // ============================================================

  describe('Performance Metrics', () => {
    it('should track correct asset counts across multiple tenants', async () => {
      // Arrange
      mockJob.data = {};
      prismaMock.tenant.findMany.mockResolvedValue(mockTenants);

      mockDiscoveryService.discoverAssets
        .mockResolvedValueOnce({
          assetsDiscovered: 100,
          accountsProcessed: 3,
          errors: [],
        })
        .mockResolvedValueOnce({
          assetsDiscovered: 50,
          accountsProcessed: 2,
          errors: [],
        })
        .mockResolvedValueOnce({
          assetsDiscovered: 25,
          accountsProcessed: 1,
          errors: [],
        });

      // Act
      const result = await processAssetDiscovery(mockJob as Job);

      // Assert
      expect(result.assetsDiscovered).toBe(175); // 100 + 50 + 25
      expect(result.accountsProcessed).toBe(6); // 3 + 2 + 1
      expect(result.tenantsProcessed).toBe(3);
    });

    it('should handle large numbers of assets efficiently', async () => {
      // Arrange
      mockJob.data = { tenantId: 'tenant-large' };

      mockDiscoveryService.discoverAssets.mockResolvedValue({
        assetsDiscovered: 10000,
        accountsProcessed: 20,
        errors: [],
      });

      // Act
      const startTime = Date.now();
      const result = await processAssetDiscovery(mockJob as Job);
      const duration = Date.now() - startTime;

      // Assert
      expect(result.assetsDiscovered).toBe(10000);
      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
    });
  });
});
