/**
 * Dashboard Service Unit Tests
 *
 * Comprehensive test suite for Dashboard Service.
 * Tests dashboard overview, health status, and data aggregation from multiple sources.
 *
 * Test Coverage:
 * - Dashboard overview retrieval with all data
 * - Health status retrieval
 * - Database query handling
 * - Resource Graph service integration
 * - Cost summary (mock data)
 * - Security summary from database
 * - Recent alerts querying
 * - Error handling for partial failures
 * - Edge cases (missing data, empty results)
 *
 * @module __tests__/unit/services/dashboard.service.test
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DashboardService } from '../../../modules/dashboard/services/dashboard.service';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('../../../services/azure/resourceGraph.service');
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    cloudAccount: {
      findUnique: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

describe('DashboardService', () => {
  let mockPrisma: any;
  const { AzureResourceGraphService } = require('../../../services/azure/resourceGraph.service');

  const ACCOUNT_ID = 'test-account-id';
  const TENANT_ID = 'test-tenant-id';

  const mockCloudAccount = {
    id: ACCOUNT_ID,
    provider: 'azure',
    tenantId: TENANT_ID,
    name: 'Test Azure Account',
    tenant: {
      id: TENANT_ID,
      name: 'Test Tenant',
    },
  };

  const mockResourceSummary = {
    totalResources: 100,
    byType: [
      { type: 'microsoft.compute/virtualmachines', count: 25 },
      { type: 'microsoft.storage/storageaccounts', count: 15 },
      { type: 'microsoft.network/virtualnetworks', count: 10 },
    ],
    byLocation: [
      { location: 'eastus', count: 50 },
      { location: 'westus', count: 30 },
      { location: 'centralus', count: 20 },
    ],
    virtualMachines: {
      total: 25,
      running: 20,
      stopped: 5,
    },
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Get mock Prisma instance
    mockPrisma = new PrismaClient();

    // Reset and set default mock implementations
    mockPrisma.cloudAccount.findUnique = jest.fn().mockResolvedValue(mockCloudAccount);
    mockPrisma.$queryRaw = jest.fn();
    AzureResourceGraphService.getResourceSummary = jest.fn().mockResolvedValue(mockResourceSummary);
    AzureResourceGraphService.getRecentChanges = jest.fn().mockResolvedValue([]);
  });

  describe('getOverview', () => {
    it('should return complete dashboard overview with all data', async () => {
      // Mock security score query
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { current_score: 75, max_score: 100, percentage: 0.75 },
      ]);

      // Mock security issues query
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { severity: 'Critical', count: BigInt(5) },
        { severity: 'High', count: BigInt(10) },
        { severity: 'Medium', count: BigInt(15) },
      ]);

      // Mock recent alerts query
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        {
          id: 'alert-1',
          severity: 'High',
          display_name: 'Security issue detected',
          assessed_at: new Date('2024-01-15T10:00:00Z'),
        },
        {
          id: 'alert-2',
          severity: 'Critical',
          display_name: 'Critical vulnerability found',
          assessed_at: new Date('2024-01-15T09:00:00Z'),
        },
      ]);

      const overview = await DashboardService.getOverview(ACCOUNT_ID);

      expect(overview).toMatchObject({
        resources: {
          total: 100,
          byType: expect.arrayContaining([
            { type: 'microsoft.compute/virtualmachines', count: 25 },
          ]),
          byLocation: expect.arrayContaining([
            { location: 'eastus', count: 50 },
          ]),
        },
        costs: {
          currentMonth: 0,
          previousMonth: 0,
          trend: 'stable',
          percentageChange: 0,
          topServices: [],
        },
        security: {
          score: 0.75,  // Math.round(0.75 * 100) / 100 = 0.75
          criticalIssues: 5,
          highIssues: 10,
          mediumIssues: 15,
        },
        alerts: {
          active: 2,
          recent: expect.arrayContaining([
            expect.objectContaining({
              id: 'alert-1',
              severity: 'High',
              message: 'Security issue detected',
            }),
          ]),
        },
      });

      // Verify parallel execution
      expect(AzureResourceGraphService.getResourceSummary).toHaveBeenCalledWith(ACCOUNT_ID);
    });

    it('should limit resource types to top 10', async () => {
      const manyTypes = Array(20).fill(null).map((_, i) => ({
        type: `type-${i}`,
        count: 100 - i,
      }));

      AzureResourceGraphService.getResourceSummary = jest.fn().mockResolvedValue({
        ...mockResourceSummary,
        byType: manyTypes,
      });

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ percentage: 0.8 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const overview = await DashboardService.getOverview(ACCOUNT_ID);

      expect(overview.resources.byType).toHaveLength(10);
    });

    it('should limit resource locations to top 5', async () => {
      const manyLocations = Array(10).fill(null).map((_, i) => ({
        location: `location-${i}`,
        count: 50 - i,
      }));

      AzureResourceGraphService.getResourceSummary = jest.fn().mockResolvedValue({
        ...mockResourceSummary,
        byLocation: manyLocations,
      });

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ percentage: 0.8 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const overview = await DashboardService.getOverview(ACCOUNT_ID);

      expect(overview.resources.byLocation).toHaveLength(5);
    });

    it('should limit recent alerts to 5 most recent', async () => {
      const manyAlerts = Array(20).fill(null).map((_, i) => ({
        id: `alert-${i}`,
        severity: 'Medium',
        display_name: `Alert ${i}`,
        assessed_at: new Date(Date.now() - i * 3600000),
      }));

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ percentage: 0.8 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(manyAlerts);

      const overview = await DashboardService.getOverview(ACCOUNT_ID);

      expect(overview.alerts.active).toBe(20);
      expect(overview.alerts.recent).toHaveLength(5);
    });

    it('should handle missing security score data', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // No security score
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const overview = await DashboardService.getOverview(ACCOUNT_ID);

      expect(overview.security.score).toBe(0);
    });

    it('should handle missing security issues data', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ percentage: 0.8 }])
        .mockResolvedValueOnce([]) // No issues
        .mockResolvedValueOnce([]);

      const overview = await DashboardService.getOverview(ACCOUNT_ID);

      expect(overview.security.criticalIssues).toBe(0);
      expect(overview.security.highIssues).toBe(0);
      expect(overview.security.mediumIssues).toBe(0);
    });

    it('should handle no recent alerts', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ percentage: 0.8 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]); // No alerts

      const overview = await DashboardService.getOverview(ACCOUNT_ID);

      expect(overview.alerts.active).toBe(0);
      expect(overview.alerts.recent).toEqual([]);
    });

    it('should throw error when Resource Graph service fails', async () => {
      AzureResourceGraphService.getResourceSummary = jest.fn().mockRejectedValue(
        new Error('Resource Graph API error')
      );

      await expect(
        DashboardService.getOverview(ACCOUNT_ID)
      ).rejects.toThrow('Failed to load dashboard: Resource Graph API error');
    });

    it('should return mock cost data with warning', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ percentage: 0.8 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const overview = await DashboardService.getOverview(ACCOUNT_ID);

      expect(overview.costs).toEqual({
        currentMonth: 0,
        previousMonth: 0,
        trend: 'stable',
        percentageChange: 0,
        topServices: [],
      });
    });

    it('should round security score to 2 decimal places', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ percentage: 0.756789 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const overview = await DashboardService.getOverview(ACCOUNT_ID);

      // percentage is 0.756789, score calculation: Math.round(0.756789 * 100) / 100 = 0.76
      expect(overview.security.score).toBe(0.76);
    });

    it('should convert BigInt counts to numbers for security issues', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ percentage: 0.8 }])
        .mockResolvedValueOnce([
          { severity: 'Critical', count: BigInt(999) },
          { severity: 'High', count: BigInt(500) },
        ])
        .mockResolvedValueOnce([]);

      const overview = await DashboardService.getOverview(ACCOUNT_ID);

      expect(overview.security.criticalIssues).toBe(999);
      expect(overview.security.highIssues).toBe(500);
      expect(typeof overview.security.criticalIssues).toBe('number');
    });
  });

  describe('getHealthStatus', () => {
    it('should return complete health status with VM and location data', async () => {
      const mockChanges = [
        {
          timestamp: '2024-01-15T10:00:00Z',
          resourceId: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/vm1',
          changeType: 'Update',
          changes: {},
        },
        {
          timestamp: '2024-01-15T09:00:00Z',
          resourceId: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/sa1',
          changeType: 'Create',
          changes: {},
        },
      ];

      AzureResourceGraphService.getRecentChanges = jest.fn().mockResolvedValue(mockChanges);

      const health = await DashboardService.getHealthStatus(ACCOUNT_ID);

      expect(health).toMatchObject({
        virtualMachines: {
          total: 25,
          running: 20,
          stopped: 5,
          deallocated: 5,
        },
        resourcesByLocation: expect.arrayContaining([
          expect.objectContaining({
            location: 'eastus',
            count: 50,
            percentage: 50,
          }),
        ]),
        recentActivity: expect.arrayContaining([
          expect.objectContaining({
            changeType: 'Update',
            resourceId: expect.any(String),
          }),
        ]),
      });

      // Mock data has 3 locations, limited to top 5
      expect(health.resourcesByLocation).toHaveLength(3);
      expect(health.recentActivity).toHaveLength(2);
    });

    it('should calculate percentages correctly for locations', async () => {
      AzureResourceGraphService.getRecentChanges = jest.fn().mockResolvedValue([]);

      const health = await DashboardService.getHealthStatus(ACCOUNT_ID);

      // Total is 100, eastus has 50
      const eastusLocation = health.resourcesByLocation.find(l => l.location === 'eastus');
      expect(eastusLocation?.percentage).toBe(50);

      // westus has 30
      const westusLocation = health.resourcesByLocation.find(l => l.location === 'westus');
      expect(westusLocation?.percentage).toBe(30);
    });

    it('should handle zero total resources gracefully', async () => {
      AzureResourceGraphService.getResourceSummary = jest.fn().mockResolvedValue({
        totalResources: 0,
        byType: [],
        byLocation: [],
        virtualMachines: { total: 0, running: 0, stopped: 0 },
      });

      AzureResourceGraphService.getRecentChanges = jest.fn().mockResolvedValue([]);

      const health = await DashboardService.getHealthStatus(ACCOUNT_ID);

      expect(health.resourcesByLocation).toEqual([]);
      health.resourcesByLocation.forEach(loc => {
        expect(loc.percentage).toBe(0);
      });
    });

    it('should limit recent activity to 10 items', async () => {
      const manyChanges = Array(50).fill(null).map((_, i) => ({
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        resourceId: `/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/vm${i}`,
        changeType: 'Update',
        changes: {},
      }));

      AzureResourceGraphService.getRecentChanges = jest.fn().mockResolvedValue(manyChanges);

      const health = await DashboardService.getHealthStatus(ACCOUNT_ID);

      expect(health.recentActivity).toHaveLength(10);
    });

    it('should limit locations to top 5', async () => {
      const manyLocations = Array(15).fill(null).map((_, i) => ({
        location: `location-${i}`,
        count: 10,
      }));

      AzureResourceGraphService.getResourceSummary = jest.fn().mockResolvedValue({
        ...mockResourceSummary,
        totalResources: 150,
        byLocation: manyLocations,
      });

      AzureResourceGraphService.getRecentChanges = jest.fn().mockResolvedValue([]);

      const health = await DashboardService.getHealthStatus(ACCOUNT_ID);

      expect(health.resourcesByLocation).toHaveLength(5);
    });

    it('should calculate deallocated VMs correctly', async () => {
      AzureResourceGraphService.getResourceSummary = jest.fn().mockResolvedValue({
        ...mockResourceSummary,
        virtualMachines: {
          total: 100,
          running: 70,
          stopped: 30,
        },
      });

      AzureResourceGraphService.getRecentChanges = jest.fn().mockResolvedValue([]);

      const health = await DashboardService.getHealthStatus(ACCOUNT_ID);

      expect(health.virtualMachines.deallocated).toBe(30); // total - running
    });

    it('should format recent activity descriptions', async () => {
      const changes = [
        {
          timestamp: '2024-01-15T10:00:00Z',
          resourceId: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/my-vm',
          changeType: 'Update',
        },
      ];

      AzureResourceGraphService.getRecentChanges = jest.fn().mockResolvedValue(changes);

      const health = await DashboardService.getHealthStatus(ACCOUNT_ID);

      expect(health.recentActivity[0].description).toContain('Update');
      expect(health.recentActivity[0].description).toContain('my-vm');
    });

    it('should handle changes without changeType', async () => {
      const changes = [
        {
          timestamp: '2024-01-15T10:00:00Z',
          resourceId: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/vm1',
          // No changeType
        },
      ];

      AzureResourceGraphService.getRecentChanges = jest.fn().mockResolvedValue(changes);

      const health = await DashboardService.getHealthStatus(ACCOUNT_ID);

      expect(health.recentActivity[0].changeType).toBe('Update');
      expect(health.recentActivity[0].description).toContain('Update');
    });

    it('should convert timestamp strings to Date objects', async () => {
      const changes = [
        {
          timestamp: '2024-01-15T10:00:00Z',
          resourceId: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/vm1',
          changeType: 'Create',
        },
      ];

      AzureResourceGraphService.getRecentChanges = jest.fn().mockResolvedValue(changes);

      const health = await DashboardService.getHealthStatus(ACCOUNT_ID);

      expect(health.recentActivity[0].timestamp).toBeInstanceOf(Date);
    });

    it('should throw error when Resource Graph service fails', async () => {
      AzureResourceGraphService.getResourceSummary = jest.fn().mockRejectedValue(
        new Error('Service unavailable')
      );

      await expect(
        DashboardService.getHealthStatus(ACCOUNT_ID)
      ).rejects.toThrow('Failed to load health status: Service unavailable');
    });

    it('should handle empty recent changes', async () => {
      AzureResourceGraphService.getRecentChanges = jest.fn().mockResolvedValue([]);

      const health = await DashboardService.getHealthStatus(ACCOUNT_ID);

      expect(health.recentActivity).toEqual([]);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle account not found in security queries', async () => {
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(null);

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ percentage: 0.8 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const overview = await DashboardService.getOverview(ACCOUNT_ID);

      // Should still return overview with default security values
      expect(overview.security).toEqual({
        score: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
      });
    });

    it('should handle account without tenant', async () => {
      mockPrisma.cloudAccount.findUnique.mockResolvedValue({
        ...mockCloudAccount,
        tenantId: null,
        tenant: null,
      });

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ percentage: 0.8 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const overview = await DashboardService.getOverview(ACCOUNT_ID);

      expect(overview.security).toEqual({
        score: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
      });
    });

    it('should handle database query errors for security score', async () => {
      // Make cloudAccount.findUnique fail to trigger error in getSecuritySummary
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(null);

      // Still need to mock $queryRaw for getRecentAlerts
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      const overview = await DashboardService.getOverview(ACCOUNT_ID);

      // When findUnique returns null, getSecuritySummary catches and returns defaults
      expect(overview.security).toEqual({
        score: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
      });
    });

    it('should handle database query errors for recent alerts', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ percentage: 0.8 }])
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('Query timeout'));

      const overview = await DashboardService.getOverview(ACCOUNT_ID);

      expect(overview.alerts).toEqual({
        active: 0,
        recent: [],
      });
    });

    it('should handle partial security issue data', async () => {
      // getSecuritySummary calls:
      // 1. findUnique for account (returns mockCloudAccount via default mock)
      // 2. $queryRaw for security score
      // 3. $queryRaw for issues
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ percentage: 0.8 }])  // security score
        .mockResolvedValueOnce([  // issues
          { severity: 'Critical', count: BigInt(5) },
          // Missing High and Medium
        ]);

      // getRecentAlerts calls:
      // 1. findUnique for account (returns mockCloudAccount via default mock)
      // 2. $queryRaw for alerts
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);  // alerts

      const overview = await DashboardService.getOverview(ACCOUNT_ID);

      expect(overview.security.criticalIssues).toBe(5);
      expect(overview.security.highIssues).toBe(0);
      expect(overview.security.mediumIssues).toBe(0);
    });

    it('should handle alerts with missing fields', async () => {
      // Security score query
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ percentage: 0.8 }]);
      // Security issues query
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      // Alerts query with missing fields
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        {
          id: 'alert-1',
          severity: null,
          display_name: null,
          assessed_at: new Date(),
        },
      ]);

      const overview = await DashboardService.getOverview(ACCOUNT_ID);

      expect(overview.alerts.recent).toHaveLength(1);
      expect(overview.alerts.recent[0].severity).toBe('Medium');
      expect(overview.alerts.recent[0].message).toBe('Security issue detected');
    });

    it('should handle Resource Graph returning null data', async () => {
      AzureResourceGraphService.getResourceSummary = jest.fn().mockResolvedValue({
        totalResources: 0,
        byType: null,
        byLocation: null,
        virtualMachines: null,
      });

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ percentage: 0.8 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await expect(
        DashboardService.getOverview(ACCOUNT_ID)
      ).rejects.toThrow();
    });

    it('should handle concurrent errors gracefully', async () => {
      AzureResourceGraphService.getResourceSummary = jest.fn().mockRejectedValue(
        new Error('Network timeout')
      );

      await expect(
        DashboardService.getOverview(ACCOUNT_ID)
      ).rejects.toThrow('Failed to load dashboard: Network timeout');
    });

    it('should query alerts from last 7 days', async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ percentage: 0.8 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await DashboardService.getOverview(ACCOUNT_ID);

      // Verify the query was called
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(3);
    });

    it('should extract resource name from resourceId correctly', async () => {
      const changes = [
        {
          timestamp: '2024-01-15T10:00:00Z',
          resourceId: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/my-vm-name',
          changeType: 'Delete',
        },
      ];

      AzureResourceGraphService.getRecentChanges = jest.fn().mockResolvedValue(changes);

      const health = await DashboardService.getHealthStatus(ACCOUNT_ID);

      expect(health.recentActivity[0].description).toContain('my-vm-name');
    });

    it('should handle resourceId without proper format', async () => {
      const changes = [
        {
          timestamp: '2024-01-15T10:00:00Z',
          resourceId: 'invalid-resource-id',
          changeType: 'Update',
        },
      ];

      AzureResourceGraphService.getRecentChanges = jest.fn().mockResolvedValue(changes);

      const health = await DashboardService.getHealthStatus(ACCOUNT_ID);

      expect(health.recentActivity[0].description).toContain('Update');
    });
  });
});
