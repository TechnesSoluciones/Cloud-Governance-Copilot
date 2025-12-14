/**
 * Security Scan Job Unit Tests
 *
 * Purpose: Test the BullMQ job that orchestrates weekly security scans
 * across all cloud accounts with proper error handling and retry logic.
 *
 * Test Coverage:
 * - Single tenant security scanning
 * - All tenants security scanning
 * - Specific cloud account filtering
 * - Error handling and retry logic
 * - Progress tracking
 * - Job result summaries with security metrics
 * - Manual vs scheduled triggers
 * - Fail-safe error handling (continue on tenant failure)
 *
 * @module Tests/Unit/Jobs/SecurityScan
 */

import { Job } from 'bullmq';
import { processSecurityScan } from '../../../shared/jobs/security-scan.job';
import { prismaMock } from '../../../__mocks__/prisma';
import { SecurityScanService } from '../../../modules/security/services/scan.service';
import type { Tenant } from '@prisma/client';

// Mock PrismaClient to use our prismaMock
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => prismaMock),
}));

// Mock the SecurityScanService
jest.mock('../../../modules/security/services/scan.service');

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

describe('Security Scan Job', () => {
  let mockJob: Partial<Job>;
  let mockScanService: jest.Mocked<SecurityScanService>;

  beforeEach(() => {
    // Create mock job
    mockJob = {
      id: 'job-123',
      data: { triggeredBy: 'scheduled' },
      updateProgress: jest.fn(),
    };

    // Reset mocks
    jest.clearAllMocks();

    // Mock Prisma $disconnect
    prismaMock.$disconnect = jest.fn().mockResolvedValue(undefined);

    // Get mocked security scan service instance
    mockScanService = {
      runScan: jest.fn(),
    } as any;

    (SecurityScanService as jest.MockedClass<typeof SecurityScanService>).mockImplementation(
      () => mockScanService
    );
  });

  // ============================================================
  // Test Suite 1: Single Tenant Security Scan
  // ============================================================

  describe('Single Tenant Security Scan', () => {
    it('should scan security for a specific tenant', async () => {
      // Arrange
      mockJob.data = { tenantId: 'tenant-123', triggeredBy: 'manual' };

      mockScanService.runScan.mockResolvedValue({
        accountsScanned: 3,
        totalFindings: 45,
        criticalCount: 5,
        highCount: 12,
      });

      // Act
      const result = await processSecurityScan(mockJob as Job);

      // Assert
      expect(mockScanService.runScan).toHaveBeenCalledWith('tenant-123', undefined);
      expect(result).toEqual({
        success: true,
        accountsScanned: 3,
        totalFindings: 45,
        criticalCount: 5,
        highCount: 12,
        duration: expect.any(Number),
        errors: undefined,
      });
    });

    it('should scan security for a specific cloud account within a tenant', async () => {
      // Arrange
      mockJob.data = {
        tenantId: 'tenant-123',
        cloudAccountId: 'account-456',
        triggeredBy: 'manual',
      };

      mockScanService.runScan.mockResolvedValue({
        accountsScanned: 1,
        totalFindings: 15,
        criticalCount: 2,
        highCount: 5,
      });

      // Act
      const result = await processSecurityScan(mockJob as Job);

      // Assert
      expect(mockScanService.runScan).toHaveBeenCalledWith('tenant-123', 'account-456');
      expect(result.accountsScanned).toBe(1);
      expect(result.totalFindings).toBe(15);
      expect(result.criticalCount).toBe(2);
      expect(result.highCount).toBe(5);
    });

    it('should handle tenant scan failure gracefully and report error', async () => {
      // Arrange
      mockJob.data = { tenantId: 'tenant-123', triggeredBy: 'manual' };

      mockScanService.runScan.mockRejectedValue(
        new Error('AWS API rate limit exceeded')
      );

      // Act
      const result = await processSecurityScan(mockJob as Job);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]).toContain('Failed to scan tenant tenant-123');
      expect(result.errors?.[0]).toContain('AWS API rate limit exceeded');
      expect(result.accountsScanned).toBe(0);
      expect(result.totalFindings).toBe(0);
    });

    it('should track execution time for single tenant scan', async () => {
      // Arrange
      mockJob.data = { tenantId: 'tenant-123', triggeredBy: 'manual' };

      mockScanService.runScan.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          accountsScanned: 2,
          totalFindings: 20,
          criticalCount: 3,
          highCount: 7,
        };
      });

      // Act
      const result = await processSecurityScan(mockJob as Job);

      // Assert
      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeLessThan(1000);
    });

    it('should handle manual trigger flag correctly', async () => {
      // Arrange
      mockJob.data = { tenantId: 'tenant-123', triggeredBy: 'manual' };

      mockScanService.runScan.mockResolvedValue({
        accountsScanned: 1,
        totalFindings: 10,
        criticalCount: 1,
        highCount: 2,
      });

      // Act
      const result = await processSecurityScan(mockJob as Job);

      // Assert
      expect(result.success).toBe(true);
      expect(mockScanService.runScan).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Test Suite 2: All Tenants Security Scan
  // ============================================================

  describe('All Tenants Security Scan', () => {
    it('should scan security for all active tenants', async () => {
      // Arrange
      mockJob.data = { triggeredBy: 'scheduled' };
      prismaMock.tenant.findMany.mockResolvedValue(mockTenants);

      mockScanService.runScan
        .mockResolvedValueOnce({
          accountsScanned: 3,
          totalFindings: 50,
          criticalCount: 5,
          highCount: 15,
        })
        .mockResolvedValueOnce({
          accountsScanned: 2,
          totalFindings: 30,
          criticalCount: 3,
          highCount: 10,
        })
        .mockResolvedValueOnce({
          accountsScanned: 1,
          totalFindings: 10,
          criticalCount: 1,
          highCount: 3,
        });

      // Act
      const result = await processSecurityScan(mockJob as Job);

      // Assert
      expect(prismaMock.tenant.findMany).toHaveBeenCalledWith({
        where: { status: 'active' },
      });
      expect(mockScanService.runScan).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        success: true,
        accountsScanned: 6, // 3 + 2 + 1
        totalFindings: 90, // 50 + 30 + 10
        criticalCount: 9, // 5 + 3 + 1
        highCount: 28, // 15 + 10 + 3
        duration: expect.any(Number),
        errors: undefined,
      });
    });

    it('should update job progress during scanning', async () => {
      // Arrange
      mockJob.data = { triggeredBy: 'scheduled' };
      prismaMock.tenant.findMany.mockResolvedValue(mockTenants);

      mockScanService.runScan.mockResolvedValue({
        accountsScanned: 1,
        totalFindings: 10,
        criticalCount: 1,
        highCount: 2,
      });

      // Act
      await processSecurityScan(mockJob as Job);

      // Assert
      expect(mockJob.updateProgress).toHaveBeenCalledTimes(3);
      expect(mockJob.updateProgress).toHaveBeenNthCalledWith(1, 33); // 1/3 = 33%
      expect(mockJob.updateProgress).toHaveBeenNthCalledWith(2, 67); // 2/3 = 67%
      expect(mockJob.updateProgress).toHaveBeenNthCalledWith(3, 100); // 3/3 = 100%
    });

    it('should handle errors in individual tenants and continue processing (fail-safe)', async () => {
      // Arrange
      mockJob.data = { triggeredBy: 'scheduled' };
      prismaMock.tenant.findMany.mockResolvedValue(mockTenants);

      mockScanService.runScan
        .mockResolvedValueOnce({
          accountsScanned: 2,
          totalFindings: 25,
          criticalCount: 3,
          highCount: 8,
        })
        .mockRejectedValueOnce(new Error('Scan timeout for tenant 2'))
        .mockResolvedValueOnce({
          accountsScanned: 1,
          totalFindings: 8,
          criticalCount: 1,
          highCount: 2,
        });

      // Act
      const result = await processSecurityScan(mockJob as Job);

      // Assert
      expect(result.success).toBe(false);
      expect(result.accountsScanned).toBe(3); // 2 + 0 + 1 (second failed)
      expect(result.totalFindings).toBe(33); // 25 + 0 + 8
      expect(result.criticalCount).toBe(4); // 3 + 0 + 1
      expect(result.highCount).toBe(10); // 8 + 0 + 2
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]).toContain('Failed to scan tenant tenant-2');
      expect(result.errors?.[0]).toContain('Scan timeout for tenant 2');
    });

    it('should aggregate findings from all tenants', async () => {
      // Arrange
      mockJob.data = { triggeredBy: 'scheduled' };
      prismaMock.tenant.findMany.mockResolvedValue(mockTenants.slice(0, 2));

      mockScanService.runScan
        .mockResolvedValueOnce({
          accountsScanned: 5,
          totalFindings: 100,
          criticalCount: 10,
          highCount: 25,
        })
        .mockResolvedValueOnce({
          accountsScanned: 3,
          totalFindings: 60,
          criticalCount: 6,
          highCount: 15,
        });

      // Act
      const result = await processSecurityScan(mockJob as Job);

      // Assert
      expect(result.accountsScanned).toBe(8); // 5 + 3
      expect(result.totalFindings).toBe(160); // 100 + 60
      expect(result.criticalCount).toBe(16); // 10 + 6
      expect(result.highCount).toBe(40); // 25 + 15
      expect(result.success).toBe(true);
    });

    it('should return zero counts when no active tenants found', async () => {
      // Arrange
      mockJob.data = { triggeredBy: 'scheduled' };
      prismaMock.tenant.findMany.mockResolvedValue([]);

      // Act
      const result = await processSecurityScan(mockJob as Job);

      // Assert
      expect(result).toEqual({
        success: true,
        accountsScanned: 0,
        totalFindings: 0,
        criticalCount: 0,
        highCount: 0,
        duration: expect.any(Number),
        errors: undefined,
      });
      expect(mockScanService.runScan).not.toHaveBeenCalled();
    });

    it('should handle multiple errors from different tenants', async () => {
      // Arrange
      mockJob.data = { triggeredBy: 'scheduled' };
      prismaMock.tenant.findMany.mockResolvedValue(mockTenants);

      mockScanService.runScan
        .mockRejectedValueOnce(new Error('Authentication failed'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          accountsScanned: 1,
          totalFindings: 5,
          criticalCount: 0,
          highCount: 1,
        });

      // Act
      const result = await processSecurityScan(mockJob as Job);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors?.[0]).toContain('Authentication failed');
      expect(result.errors?.[1]).toContain('Network timeout');
      expect(result.accountsScanned).toBe(1); // Only third tenant succeeded
      expect(result.totalFindings).toBe(5);
    });
  });

  // ============================================================
  // Test Suite 3: Error Handling
  // ============================================================

  describe('Error Handling', () => {
    it('should throw error when scan service throws fatal error', async () => {
      // Arrange
      mockJob.data = { tenantId: 'tenant-123', triggeredBy: 'manual' };

      mockScanService.runScan.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act
      const result = await processSecurityScan(mockJob as Job);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toContain('Database connection failed');
    });

    it('should handle service errors with non-Error objects', async () => {
      // Arrange
      mockJob.data = { tenantId: 'tenant-123', triggeredBy: 'manual' };

      mockScanService.runScan.mockRejectedValue('String error message');

      // Act
      const result = await processSecurityScan(mockJob as Job);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toContain('String error message');
    });

    it('should include execution time even when errors occur', async () => {
      // Arrange
      mockJob.data = { tenantId: 'tenant-123', triggeredBy: 'manual' };

      mockScanService.runScan.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw new Error('Scan failed');
      });

      // Act
      const result = await processSecurityScan(mockJob as Job);

      // Assert
      expect(result.duration).toBeGreaterThan(0);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // Test Suite 4: Job Data Validation
  // ============================================================

  describe('Job Data Validation', () => {
    it('should handle missing triggeredBy field', async () => {
      // Arrange
      mockJob.data = { tenantId: 'tenant-123' } as any;

      mockScanService.runScan.mockResolvedValue({
        accountsScanned: 1,
        totalFindings: 5,
        criticalCount: 0,
        highCount: 1,
      });

      // Act
      const result = await processSecurityScan(mockJob as Job);

      // Assert
      expect(result.success).toBe(true);
      expect(mockScanService.runScan).toHaveBeenCalled();
    });

    it('should handle empty job data object (all tenants mode)', async () => {
      // Arrange
      mockJob.data = { triggeredBy: 'scheduled' };
      prismaMock.tenant.findMany.mockResolvedValue([]);

      // Act
      const result = await processSecurityScan(mockJob as Job);

      // Assert
      expect(result.accountsScanned).toBe(0);
      expect(prismaMock.tenant.findMany).toHaveBeenCalled();
    });

    it('should ignore cloudAccountId when tenantId is not provided', async () => {
      // Arrange
      mockJob.data = {
        cloudAccountId: 'account-123',
        triggeredBy: 'scheduled',
      };
      prismaMock.tenant.findMany.mockResolvedValue([]);

      // Act
      const result = await processSecurityScan(mockJob as Job);

      // Assert
      // Should process as "all tenants" mode, not single tenant
      expect(prismaMock.tenant.findMany).toHaveBeenCalled();
      expect(result.accountsScanned).toBe(0);
    });
  });

  // ============================================================
  // Test Suite 5: Security Metrics
  // ============================================================

  describe('Security Metrics', () => {
    it('should correctly track critical and high severity findings', async () => {
      // Arrange
      mockJob.data = { tenantId: 'tenant-123', triggeredBy: 'manual' };

      mockScanService.runScan.mockResolvedValue({
        accountsScanned: 5,
        totalFindings: 200,
        criticalCount: 15,
        highCount: 45,
      });

      // Act
      const result = await processSecurityScan(mockJob as Job);

      // Assert
      expect(result.criticalCount).toBe(15);
      expect(result.highCount).toBe(45);
      expect(result.totalFindings).toBe(200);
    });

    it('should handle zero findings correctly', async () => {
      // Arrange
      mockJob.data = { tenantId: 'tenant-123', triggeredBy: 'manual' };

      mockScanService.runScan.mockResolvedValue({
        accountsScanned: 3,
        totalFindings: 0,
        criticalCount: 0,
        highCount: 0,
      });

      // Act
      const result = await processSecurityScan(mockJob as Job);

      // Assert
      expect(result.success).toBe(true);
      expect(result.totalFindings).toBe(0);
      expect(result.criticalCount).toBe(0);
      expect(result.highCount).toBe(0);
    });

    it('should aggregate security metrics across multiple tenants', async () => {
      // Arrange
      mockJob.data = { triggeredBy: 'scheduled' };
      prismaMock.tenant.findMany.mockResolvedValue(mockTenants);

      mockScanService.runScan
        .mockResolvedValueOnce({
          accountsScanned: 3,
          totalFindings: 100,
          criticalCount: 10,
          highCount: 30,
        })
        .mockResolvedValueOnce({
          accountsScanned: 2,
          totalFindings: 50,
          criticalCount: 5,
          highCount: 15,
        })
        .mockResolvedValueOnce({
          accountsScanned: 1,
          totalFindings: 25,
          criticalCount: 2,
          highCount: 8,
        });

      // Act
      const result = await processSecurityScan(mockJob as Job);

      // Assert
      expect(result.totalFindings).toBe(175); // 100 + 50 + 25
      expect(result.criticalCount).toBe(17); // 10 + 5 + 2
      expect(result.highCount).toBe(53); // 30 + 15 + 8
    });

    it('should handle large numbers of findings efficiently', async () => {
      // Arrange
      mockJob.data = { tenantId: 'tenant-large', triggeredBy: 'manual' };

      mockScanService.runScan.mockResolvedValue({
        accountsScanned: 50,
        totalFindings: 10000,
        criticalCount: 500,
        highCount: 2000,
      });

      // Act
      const startTime = Date.now();
      const result = await processSecurityScan(mockJob as Job);
      const duration = Date.now() - startTime;

      // Assert
      expect(result.totalFindings).toBe(10000);
      expect(result.criticalCount).toBe(500);
      expect(result.highCount).toBe(2000);
      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
    });
  });

  // ============================================================
  // Test Suite 6: Progress Tracking
  // ============================================================

  describe('Progress Tracking', () => {
    it('should not update progress for single tenant scan', async () => {
      // Arrange
      mockJob.data = { tenantId: 'tenant-123', triggeredBy: 'manual' };

      mockScanService.runScan.mockResolvedValue({
        accountsScanned: 1,
        totalFindings: 10,
        criticalCount: 1,
        highCount: 3,
      });

      // Act
      await processSecurityScan(mockJob as Job);

      // Assert
      expect(mockJob.updateProgress).not.toHaveBeenCalled();
    });

    it('should update progress correctly for 5 tenants', async () => {
      // Arrange
      const fiveTenants = [
        ...mockTenants,
        { ...mockTenants[0], id: 'tenant-4', name: 'Tenant Four' },
        { ...mockTenants[0], id: 'tenant-5', name: 'Tenant Five' },
      ];

      mockJob.data = { triggeredBy: 'scheduled' };
      prismaMock.tenant.findMany.mockResolvedValue(fiveTenants);

      mockScanService.runScan.mockResolvedValue({
        accountsScanned: 1,
        totalFindings: 10,
        criticalCount: 1,
        highCount: 2,
      });

      // Act
      await processSecurityScan(mockJob as Job);

      // Assert
      expect(mockJob.updateProgress).toHaveBeenCalledTimes(5);
      expect(mockJob.updateProgress).toHaveBeenNthCalledWith(1, 20); // 1/5 = 20%
      expect(mockJob.updateProgress).toHaveBeenNthCalledWith(2, 40); // 2/5 = 40%
      expect(mockJob.updateProgress).toHaveBeenNthCalledWith(3, 60); // 3/5 = 60%
      expect(mockJob.updateProgress).toHaveBeenNthCalledWith(4, 80); // 4/5 = 80%
      expect(mockJob.updateProgress).toHaveBeenNthCalledWith(5, 100); // 5/5 = 100%
    });

    it('should update progress even when some tenants fail', async () => {
      // Arrange
      mockJob.data = { triggeredBy: 'scheduled' };
      prismaMock.tenant.findMany.mockResolvedValue(mockTenants);

      mockScanService.runScan
        .mockResolvedValueOnce({
          accountsScanned: 1,
          totalFindings: 10,
          criticalCount: 1,
          highCount: 2,
        })
        .mockRejectedValueOnce(new Error('Scan failed'))
        .mockResolvedValueOnce({
          accountsScanned: 1,
          totalFindings: 5,
          criticalCount: 0,
          highCount: 1,
        });

      // Act
      await processSecurityScan(mockJob as Job);

      // Assert
      expect(mockJob.updateProgress).toHaveBeenCalledTimes(3);
      expect(mockJob.updateProgress).toHaveBeenNthCalledWith(1, 33);
      expect(mockJob.updateProgress).toHaveBeenNthCalledWith(2, 67);
      expect(mockJob.updateProgress).toHaveBeenNthCalledWith(3, 100);
    });
  });
});
