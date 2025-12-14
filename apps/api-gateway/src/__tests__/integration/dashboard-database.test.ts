/**
 * Dashboard Database Integration Tests
 *
 * Tests the database layer of the dashboard service.
 * Validates:
 * - Security data retrieval from database
 * - Alerts retrieval and filtering
 * - Data integrity and relationships
 * - Handling of missing or incomplete data
 * - Database query performance
 */

import { PrismaClient } from '@prisma/client';
import { DashboardService } from '../../modules/dashboard/services/dashboard.service';
import {
  createTestTenant,
  createAzureAccount,
  cleanupTestData,
  disconnectTestDatabase,
  getTestPrismaClient,
} from '../utils/azure-test-helpers';

// Mock Azure services to isolate database testing
jest.mock('../../services/azure/resourceGraph.service');
jest.mock('../../services/azure/azureRateLimiter.service');
jest.mock('../../services/azure/azureCache.service');

const prisma = getTestPrismaClient();

describe('Dashboard Database Integration Tests', () => {
  let testTenant: any;
  let testAccount: any;

  beforeAll(async () => {
    testTenant = await createTestTenant();
    testAccount = await createAzureAccount(testTenant.id);
  });

  afterAll(async () => {
    if (testTenant) {
      await cleanupTestData(testTenant.id);
    }
    await disconnectTestDatabase();
  });

  beforeEach(() => {
    // Mock Azure Resource Graph Service with minimal data
    const { AzureResourceGraphService } = require('../../services/azure/resourceGraph.service');
    AzureResourceGraphService.getResourceSummary = jest.fn().mockResolvedValue({
      totalResources: 10,
      byType: [{ type: 'microsoft.compute/virtualmachines', count: 10 }],
      byLocation: [{ location: 'eastus', count: 10 }],
      virtualMachines: { total: 10, running: 8, stopped: 2 },
    });
    AzureResourceGraphService.getRecentChanges = jest.fn().mockResolvedValue([]);
  });

  describe('Security Data Retrieval', () => {
    it('should fetch security score from database', async () => {
      // Insert test security score
      await prisma.$executeRaw`
        INSERT INTO azure_security_scores (
          id, tenant_id, subscription_id, score_type,
          current_score, max_score, percentage, scored_at
        )
        VALUES (
          gen_random_uuid(),
          ${testTenant.id}::uuid,
          'test-subscription-123',
          'overall',
          85.5,
          100,
          0.855,
          NOW()
        )
      `;

      const overview = await DashboardService.getOverview(testAccount.id);

      // Verify security score
      expect(overview.security.score).toBe(85.5);
    });

    it('should count security issues by severity', async () => {
      // Insert test security assessments
      await insertSecurityAssessments(testTenant.id, {
        Critical: 3,
        High: 7,
        Medium: 12,
        Low: 5,
      });

      const overview = await DashboardService.getOverview(testAccount.id);

      // Verify issue counts
      expect(overview.security.criticalIssues).toBe(3);
      expect(overview.security.highIssues).toBe(7);
      expect(overview.security.mediumIssues).toBe(12);
      // Note: Low issues are not included in dashboard
    });

    it('should only count unhealthy assessments', async () => {
      // Insert mix of healthy and unhealthy assessments
      await prisma.$executeRaw`
        INSERT INTO azure_security_assessments (
          id, tenant_id, subscription_id, resource_id, assessment_name,
          display_name, severity, status, assessed_at
        )
        VALUES
        (gen_random_uuid(), ${testTenant.id}::uuid, 'sub-123', 'res-1', 'assess-1', 'Issue 1', 'Critical', 'Unhealthy', NOW()),
        (gen_random_uuid(), ${testTenant.id}::uuid, 'sub-123', 'res-2', 'assess-2', 'Issue 2', 'Critical', 'Healthy', NOW()),
        (gen_random_uuid(), ${testTenant.id}::uuid, 'sub-123', 'res-3', 'assess-3', 'Issue 3', 'Critical', 'Unhealthy', NOW())
      `;

      const overview = await DashboardService.getOverview(testAccount.id);

      // Should only count Unhealthy (2 out of 3)
      expect(overview.security.criticalIssues).toBe(2);
    });

    it('should return zero score when no data exists', async () => {
      // Don't insert any security data
      const overview = await DashboardService.getOverview(testAccount.id);

      expect(overview.security.score).toBe(0);
      expect(overview.security.criticalIssues).toBe(0);
      expect(overview.security.highIssues).toBe(0);
      expect(overview.security.mediumIssues).toBe(0);
    });

    it('should use most recent security score', async () => {
      // Insert multiple scores with different timestamps
      await prisma.$executeRaw`
        INSERT INTO azure_security_scores (
          id, tenant_id, subscription_id, score_type,
          current_score, max_score, percentage, scored_at
        )
        VALUES
        (gen_random_uuid(), ${testTenant.id}::uuid, 'sub-123', 'overall', 70, 100, 0.70, NOW() - INTERVAL '2 days'),
        (gen_random_uuid(), ${testTenant.id}::uuid, 'sub-123', 'overall', 80, 100, 0.80, NOW() - INTERVAL '1 day'),
        (gen_random_uuid(), ${testTenant.id}::uuid, 'sub-123', 'overall', 90, 100, 0.90, NOW())
      `;

      const overview = await DashboardService.getOverview(testAccount.id);

      // Should use the most recent (90)
      expect(overview.security.score).toBe(90);
    });
  });

  describe('Alerts Retrieval', () => {
    it('should fetch recent alerts from last 7 days', async () => {
      // Insert alerts at different times
      const now = new Date();
      const sixDaysAgo = new Date(now);
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
      const eightDaysAgo = new Date(now);
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      await prisma.$executeRaw`
        INSERT INTO azure_security_assessments (
          id, tenant_id, subscription_id, resource_id, assessment_name,
          display_name, severity, status, assessed_at
        )
        VALUES
        (gen_random_uuid(), ${testTenant.id}::uuid, 'sub-123', 'res-1', 'assess-1', 'Recent alert', 'High', 'Unhealthy', ${now}),
        (gen_random_uuid(), ${testTenant.id}::uuid, 'sub-123', 'res-2', 'assess-2', 'Week old alert', 'High', 'Unhealthy', ${sixDaysAgo}),
        (gen_random_uuid(), ${testTenant.id}::uuid, 'sub-123', 'res-3', 'assess-3', 'Old alert', 'High', 'Unhealthy', ${eightDaysAgo})
      `;

      const overview = await DashboardService.getOverview(testAccount.id);

      // Should have 2 alerts (within 7 days), not the 8-day-old one
      expect(overview.alerts.active).toBe(2);
      expect(overview.alerts.recent.length).toBe(2);
    });

    it('should limit alerts to top 5 most recent', async () => {
      // Insert 10 alerts
      for (let i = 0; i < 10; i++) {
        const timestamp = new Date();
        timestamp.setHours(timestamp.getHours() - i);

        await prisma.$executeRaw`
          INSERT INTO azure_security_assessments (
            id, tenant_id, subscription_id, resource_id, assessment_name,
            display_name, severity, status, assessed_at
          )
          VALUES (
            gen_random_uuid(),
            ${testTenant.id}::uuid,
            'sub-123',
            'res-${i}',
            'assess-${i}',
            'Alert ${i}',
            'High',
            'Unhealthy',
            ${timestamp}
          )
        `;
      }

      const overview = await DashboardService.getOverview(testAccount.id);

      // Should have 10 active but only 5 in recent list
      expect(overview.alerts.active).toBe(10);
      expect(overview.alerts.recent.length).toBe(5);
    });

    it('should sort alerts by timestamp descending', async () => {
      // Insert alerts at different times
      const timestamps = [3, 1, 4, 2, 5]; // Random order

      for (const hours of timestamps) {
        const timestamp = new Date();
        timestamp.setHours(timestamp.getHours() - hours);

        await prisma.$executeRaw`
          INSERT INTO azure_security_assessments (
            id, tenant_id, subscription_id, resource_id, assessment_name,
            display_name, severity, status, assessed_at
          )
          VALUES (
            gen_random_uuid(),
            ${testTenant.id}::uuid,
            'sub-123',
            'res-${hours}',
            'assess-${hours}',
            'Alert ${hours}',
            'High',
            'Unhealthy',
            ${timestamp}
          )
        `;
      }

      const overview = await DashboardService.getOverview(testAccount.id);

      // Verify sorted by timestamp (most recent first)
      const alerts = overview.alerts.recent;
      for (let i = 0; i < alerts.length - 1; i++) {
        const current = new Date(alerts[i].timestamp).getTime();
        const next = new Date(alerts[i + 1].timestamp).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('should include alert metadata (id, severity, message, timestamp)', async () => {
      await prisma.$executeRaw`
        INSERT INTO azure_security_assessments (
          id, tenant_id, subscription_id, resource_id, assessment_name,
          display_name, severity, status, assessed_at
        )
        VALUES (
          gen_random_uuid(),
          ${testTenant.id}::uuid,
          'sub-123',
          'res-1',
          'assess-1',
          'Unencrypted storage detected',
          'Critical',
          'Unhealthy',
          NOW()
        )
      `;

      const overview = await DashboardService.getOverview(testAccount.id);

      const alert = overview.alerts.recent[0];
      expect(alert).toHaveProperty('id');
      expect(alert).toHaveProperty('severity', 'Critical');
      expect(alert).toHaveProperty('message', 'Unencrypted storage detected');
      expect(alert).toHaveProperty('timestamp');
      expect(alert.timestamp).toBeInstanceOf(Date);
    });

    it('should return empty array when no alerts exist', async () => {
      // Don't insert any alerts
      const overview = await DashboardService.getOverview(testAccount.id);

      expect(overview.alerts.active).toBe(0);
      expect(overview.alerts.recent).toEqual([]);
    });
  });

  describe('Data Integrity and Relationships', () => {
    it('should handle account without tenant', async () => {
      // Create account with invalid tenant reference
      const invalidAccount = {
        id: 'invalid-account-123',
        tenantId: null,
      };

      await expect(
        DashboardService.getOverview(invalidAccount.id)
      ).rejects.toThrow();
    });

    it('should handle missing tenant data gracefully', async () => {
      // Create a new tenant but don't add any security data
      const emptyTenant = await createTestTenant();
      const emptyAccount = await createAzureAccount(emptyTenant.id);

      const overview = await DashboardService.getOverview(emptyAccount.id);

      // Should return default values
      expect(overview.security.score).toBe(0);
      expect(overview.security.criticalIssues).toBe(0);
      expect(overview.alerts.active).toBe(0);

      // Cleanup
      await cleanupTestData(emptyTenant.id);
    });

    it('should isolate data by tenant', async () => {
      // Create two tenants
      const tenant1 = await createTestTenant();
      const tenant2 = await createTestTenant();
      const account1 = await createAzureAccount(tenant1.id);
      const account2 = await createAzureAccount(tenant2.id);

      // Add security data to tenant1 only
      await prisma.$executeRaw`
        INSERT INTO azure_security_scores (
          id, tenant_id, subscription_id, score_type,
          current_score, max_score, percentage, scored_at
        )
        VALUES (
          gen_random_uuid(),
          ${tenant1.id}::uuid,
          'sub-123',
          'overall',
          75,
          100,
          0.75,
          NOW()
        )
      `;

      const overview1 = await DashboardService.getOverview(account1.id);
      const overview2 = await DashboardService.getOverview(account2.id);

      // Tenant1 should have score, tenant2 should not
      expect(overview1.security.score).toBe(75);
      expect(overview2.security.score).toBe(0);

      // Cleanup
      await cleanupTestData(tenant1.id);
      await cleanupTestData(tenant2.id);
    });
  });

  describe('Database Query Performance', () => {
    it('should fetch security data efficiently', async () => {
      // Insert test data
      await insertSecurityAssessments(testTenant.id, {
        Critical: 10,
        High: 20,
        Medium: 30,
      });

      await prisma.$executeRaw`
        INSERT INTO azure_security_scores (
          id, tenant_id, subscription_id, score_type,
          current_score, max_score, percentage, scored_at
        )
        VALUES (
          gen_random_uuid(),
          ${testTenant.id}::uuid,
          'sub-123',
          'overall',
          80,
          100,
          0.80,
          NOW()
        )
      `;

      // Measure query time
      const start = Date.now();
      await DashboardService.getOverview(testAccount.id);
      const duration = Date.now() - start;

      // Database queries should complete quickly (< 500ms)
      expect(duration).toBeLessThan(500);
    });

    it('should handle large dataset of alerts efficiently', async () => {
      // Insert 100 alerts
      for (let i = 0; i < 100; i++) {
        const timestamp = new Date();
        timestamp.setHours(timestamp.getHours() - (i % 24));

        await prisma.$executeRaw`
          INSERT INTO azure_security_assessments (
            id, tenant_id, subscription_id, resource_id, assessment_name,
            display_name, severity, status, assessed_at
          )
          VALUES (
            gen_random_uuid(),
            ${testTenant.id}::uuid,
            'sub-123',
            'res-${i}',
            'assess-${i}',
            'Alert ${i}',
            ${i % 3 === 0 ? 'Critical' : i % 3 === 1 ? 'High' : 'Medium'},
            'Unhealthy',
            ${timestamp}
          )
        `;
      }

      // Query should still be fast
      const start = Date.now();
      const overview = await DashboardService.getOverview(testAccount.id);
      const duration = Date.now() - start;

      // Should handle large dataset efficiently
      expect(duration).toBeLessThan(1000);
      expect(overview.alerts.recent.length).toBe(5); // Properly limited
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Temporarily disconnect to simulate error
      await prisma.$disconnect();

      // Should handle error without crashing
      await expect(
        DashboardService.getOverview(testAccount.id)
      ).rejects.toThrow();

      // Reconnect for cleanup
      await prisma.$connect();
    });

    it('should handle invalid tenant ID format', async () => {
      const invalidAccount = {
        id: 'test-account',
        tenantId: 'invalid-uuid-format',
      };

      await expect(
        DashboardService.getOverview(invalidAccount.id)
      ).rejects.toThrow();
    });
  });
});

// ============================================================
// Helper Functions
// ============================================================

/**
 * Insert security assessments with specified severity counts
 */
async function insertSecurityAssessments(
  tenantId: string,
  severityCounts: { [key: string]: number }
) {
  for (const [severity, count] of Object.entries(severityCounts)) {
    for (let i = 0; i < count; i++) {
      await prisma.$executeRaw`
        INSERT INTO azure_security_assessments (
          id, tenant_id, subscription_id, resource_id, assessment_name,
          display_name, severity, status, assessed_at
        )
        VALUES (
          gen_random_uuid(),
          ${tenantId}::uuid,
          'test-subscription-123',
          '/subscriptions/test/resourceGroups/rg-${i}/providers/Microsoft.Compute/virtualMachines/vm-${i}',
          'test-assessment-${severity}-${i}',
          'Security issue ${severity} ${i}',
          ${severity},
          'Unhealthy',
          NOW()
        )
      `;
    }
  }
}
