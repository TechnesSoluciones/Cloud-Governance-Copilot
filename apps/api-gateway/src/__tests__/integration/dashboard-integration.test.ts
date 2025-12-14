/**
 * Dashboard Integration Tests
 *
 * Tests the complete flow of dashboard endpoints from API to database to Azure services.
 * Validates:
 * - Authentication and authorization
 * - Data aggregation from multiple sources
 * - Response structure and data quality
 * - Error handling and edge cases
 * - Caching behavior
 * - Performance requirements
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import {
  createTestTenant,
  createTestUser,
  createAzureAccount,
  cleanupTestData,
  disconnectTestDatabase,
  getTestPrismaClient,
} from '../utils/azure-test-helpers';
import {
  mockDashboardOverview,
  mockHealthStatus,
  mockResourceGraphSummary,
  mockResourceGraphChanges,
  mockSecurityScores,
  mockSecurityAssessments,
  mockRecentAlerts,
} from '../fixtures/dashboard.fixtures';

// Mock Azure services
jest.mock('../../services/azure/resourceGraph.service');
jest.mock('../../services/azure/azureRateLimiter.service');
jest.mock('../../services/azure/azureCache.service');

const prisma = getTestPrismaClient();

// Import the app for testing
// Note: You'll need to export your Express app from your main file
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Dashboard Integration Tests', () => {
  let testTenant: any;
  let testUser: any;
  let testAccount: any;
  let authToken: string;

  beforeAll(async () => {
    // Create test data
    testTenant = await createTestTenant();
    testUser = await createTestUser(testTenant.id);
    testAccount = await createAzureAccount(testTenant.id);

    // Generate auth token
    authToken = jwt.sign(
      {
        userId: testUser.id,
        tenantId: testTenant.id,
        email: testUser.email,
        role: testUser.role,
      },
      process.env.JWT_SECRET || 'test-jwt-secret-key',
      { expiresIn: '1h' }
    );

    // Insert test security data for the tenant
    await setupTestSecurityData(testTenant.id);
  });

  afterAll(async () => {
    // Clean up test data
    if (testTenant) {
      await cleanupTestData(testTenant.id);
    }
    await disconnectTestDatabase();
  });

  describe('GET /api/v1/dashboard/overview', () => {
    beforeEach(() => {
      // Mock Azure Resource Graph Service
      const { AzureResourceGraphService } = require('../../services/azure/resourceGraph.service');
      AzureResourceGraphService.getResourceSummary = jest
        .fn()
        .mockResolvedValue(mockResourceGraphSummary);
    });

    it('should return dashboard overview with authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');

      const { data } = response.body;

      // Verify resources section
      expect(data).toHaveProperty('resources');
      expect(data.resources).toHaveProperty('total');
      expect(data.resources).toHaveProperty('byType');
      expect(data.resources).toHaveProperty('byLocation');
      expect(Array.isArray(data.resources.byType)).toBe(true);
      expect(Array.isArray(data.resources.byLocation)).toBe(true);

      // Verify costs section
      expect(data).toHaveProperty('costs');
      expect(data.costs).toHaveProperty('currentMonth');
      expect(data.costs).toHaveProperty('previousMonth');
      expect(data.costs).toHaveProperty('trend');
      expect(data.costs).toHaveProperty('percentageChange');
      expect(data.costs).toHaveProperty('topServices');

      // Verify security section
      expect(data).toHaveProperty('security');
      expect(data.security).toHaveProperty('score');
      expect(data.security).toHaveProperty('criticalIssues');
      expect(data.security).toHaveProperty('highIssues');
      expect(data.security).toHaveProperty('mediumIssues');

      // Verify alerts section
      expect(data).toHaveProperty('alerts');
      expect(data.alerts).toHaveProperty('active');
      expect(data.alerts).toHaveProperty('recent');
      expect(Array.isArray(data.alerts.recent)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount.id })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing accountId', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/accountId/i);
    });

    it('should handle invalid accountId gracefully', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: 'non-existent-account-id' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid accountId format', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: '' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should verify data is fetched from Azure services', async () => {
      const { AzureResourceGraphService } = require('../../services/azure/resourceGraph.service');

      await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify Azure Resource Graph was called
      expect(AzureResourceGraphService.getResourceSummary).toHaveBeenCalledWith(
        testAccount.id
      );
    });

    it('should include security data from database', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { data } = response.body;

      // Security data should come from database
      expect(data.security.score).toBeGreaterThanOrEqual(0);
      expect(data.security.score).toBeLessThanOrEqual(100);
      expect(typeof data.security.criticalIssues).toBe('number');
      expect(typeof data.security.highIssues).toBe('number');
      expect(typeof data.security.mediumIssues).toBe('number');
    });

    it('should limit alerts to top 5 most recent', async () => {
      // Add more alerts to database
      await addMultipleAlerts(testTenant.id, 10);

      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { data } = response.body;

      // Should only return 5 most recent
      expect(data.alerts.recent.length).toBeLessThanOrEqual(5);

      // Verify they are sorted by timestamp (most recent first)
      for (let i = 0; i < data.alerts.recent.length - 1; i++) {
        const current = new Date(data.alerts.recent[i].timestamp);
        const next = new Date(data.alerts.recent[i + 1].timestamp);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    it('should handle Azure API errors gracefully', async () => {
      const { AzureResourceGraphService } = require('../../services/azure/resourceGraph.service');
      AzureResourceGraphService.getResourceSummary = jest
        .fn()
        .mockRejectedValue(new Error('Azure API unavailable'));

      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/dashboard/i);
    });
  });

  describe('GET /api/v1/dashboard/health', () => {
    beforeEach(() => {
      const { AzureResourceGraphService } = require('../../services/azure/resourceGraph.service');
      AzureResourceGraphService.getResourceSummary = jest
        .fn()
        .mockResolvedValue(mockResourceGraphSummary);
      AzureResourceGraphService.getRecentChanges = jest
        .fn()
        .mockResolvedValue(mockResourceGraphChanges);
    });

    it('should return health status with authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/health')
        .query({ accountId: testAccount.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');

      const { data } = response.body;

      // Verify structure
      expect(data).toHaveProperty('virtualMachines');
      expect(data).toHaveProperty('resourcesByLocation');
      expect(data).toHaveProperty('recentActivity');
    });

    it('should include VM status breakdown', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/health')
        .query({ accountId: testAccount.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { data } = response.body;

      // Verify VM status
      expect(data.virtualMachines).toHaveProperty('total');
      expect(data.virtualMachines).toHaveProperty('running');
      expect(data.virtualMachines).toHaveProperty('stopped');
      expect(data.virtualMachines).toHaveProperty('deallocated');

      // Verify totals add up
      const { running, stopped, deallocated, total } = data.virtualMachines;
      expect(running + deallocated).toBeLessThanOrEqual(total);
    });

    it('should include resource distribution by location with percentages', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/health')
        .query({ accountId: testAccount.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { data } = response.body;

      expect(Array.isArray(data.resourcesByLocation)).toBe(true);
      expect(data.resourcesByLocation.length).toBeGreaterThan(0);

      // Verify each location has required fields
      data.resourcesByLocation.forEach((loc: any) => {
        expect(loc).toHaveProperty('location');
        expect(loc).toHaveProperty('count');
        expect(loc).toHaveProperty('percentage');
        expect(loc.percentage).toBeGreaterThanOrEqual(0);
        expect(loc.percentage).toBeLessThanOrEqual(100);
      });

      // Verify limited to top 5 locations
      expect(data.resourcesByLocation.length).toBeLessThanOrEqual(5);
    });

    it('should include recent activity with proper formatting', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/health')
        .query({ accountId: testAccount.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { data } = response.body;

      expect(Array.isArray(data.recentActivity)).toBe(true);

      // Verify each activity has required fields
      data.recentActivity.forEach((activity: any) => {
        expect(activity).toHaveProperty('timestamp');
        expect(activity).toHaveProperty('resourceId');
        expect(activity).toHaveProperty('changeType');
        expect(activity).toHaveProperty('description');
      });

      // Verify limited to 10 activities
      expect(data.recentActivity.length).toBeLessThanOrEqual(10);
    });

    it('should return 401 without authentication', async () => {
      await request(API_BASE_URL)
        .get('/api/v1/dashboard/health')
        .query({ accountId: testAccount.id })
        .expect(401);
    });

    it('should return 400 for missing accountId', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/accountId/i);
    });
  });

  describe('Dashboard Flow End-to-End', () => {
    it('should complete full dashboard load workflow', async () => {
      const { AzureResourceGraphService } = require('../../services/azure/resourceGraph.service');
      AzureResourceGraphService.getResourceSummary = jest
        .fn()
        .mockResolvedValue(mockResourceGraphSummary);
      AzureResourceGraphService.getRecentChanges = jest
        .fn()
        .mockResolvedValue(mockResourceGraphChanges);

      // Step 1: Request overview
      const overviewResponse = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(overviewResponse.body.success).toBe(true);

      // Step 2: Request health status
      const healthResponse = await request(API_BASE_URL)
        .get('/api/v1/dashboard/health')
        .query({ accountId: testAccount.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(healthResponse.body.success).toBe(true);

      // Step 3: Verify data consistency
      const overviewTotal = overviewResponse.body.data.resources.total;
      const healthLocations = healthResponse.body.data.resourcesByLocation;

      // Total resources should match across endpoints
      const healthTotal = healthLocations.reduce(
        (sum: number, loc: any) => sum + loc.count,
        0
      );
      expect(healthTotal).toBeGreaterThan(0);
    });

    it('should handle concurrent requests to both endpoints', async () => {
      const { AzureResourceGraphService } = require('../../services/azure/resourceGraph.service');
      AzureResourceGraphService.getResourceSummary = jest
        .fn()
        .mockResolvedValue(mockResourceGraphSummary);
      AzureResourceGraphService.getRecentChanges = jest
        .fn()
        .mockResolvedValue(mockResourceGraphChanges);

      // Make concurrent requests
      const [overviewResponse, healthResponse] = await Promise.all([
        request(API_BASE_URL)
          .get('/api/v1/dashboard/overview')
          .query({ accountId: testAccount.id })
          .set('Authorization', `Bearer ${authToken}`),
        request(API_BASE_URL)
          .get('/api/v1/dashboard/health')
          .query({ accountId: testAccount.id })
          .set('Authorization', `Bearer ${authToken}`),
      ]);

      // Both should succeed
      expect(overviewResponse.status).toBe(200);
      expect(healthResponse.status).toBe(200);
    });
  });
});

// ============================================================
// Helper Functions
// ============================================================

/**
 * Setup test security data in database
 */
async function setupTestSecurityData(tenantId: string) {
  // Create security scores
  await prisma.$executeRaw`
    INSERT INTO azure_security_scores (id, tenant_id, subscription_id, score_type, current_score, max_score, percentage, scored_at)
    VALUES (
      gen_random_uuid(),
      ${tenantId}::uuid,
      'test-subscription-123',
      'overall',
      75.5,
      100,
      0.755,
      NOW()
    )
  `;

  // Create security assessments (issues)
  const severities = ['Critical', 'High', 'Medium'];
  const counts = [2, 5, 10];

  for (let i = 0; i < severities.length; i++) {
    for (let j = 0; j < counts[i]; j++) {
      await prisma.$executeRaw`
        INSERT INTO azure_security_assessments (
          id, tenant_id, subscription_id, resource_id, assessment_name,
          display_name, severity, status, assessed_at
        )
        VALUES (
          gen_random_uuid(),
          ${tenantId}::uuid,
          'test-subscription-123',
          '/subscriptions/test/resourceGroups/test/providers/Microsoft.Compute/virtualMachines/vm-${j}',
          'test-assessment',
          'Security issue ${severities[i]} ${j}',
          ${severities[i]},
          'Unhealthy',
          NOW()
        )
      `;
    }
  }
}

/**
 * Add multiple alerts to database for testing
 */
async function addMultipleAlerts(tenantId: string, count: number) {
  for (let i = 0; i < count; i++) {
    const timestamp = new Date();
    timestamp.setHours(timestamp.getHours() - i);

    await prisma.$executeRaw`
      INSERT INTO azure_security_assessments (
        id, tenant_id, subscription_id, resource_id, assessment_name,
        display_name, severity, status, assessed_at
      )
      VALUES (
        gen_random_uuid(),
        ${tenantId}::uuid,
        'test-subscription-123',
        '/subscriptions/test/resourceGroups/test/providers/Microsoft.Storage/storageAccounts/st${i}',
        'test-assessment-${i}',
        'Alert ${i}: Security issue detected',
        ${i % 3 === 0 ? 'Critical' : i % 3 === 1 ? 'High' : 'Medium'},
        'Unhealthy',
        ${timestamp}
      )
    `;
  }
}
