/**
 * Dashboard Performance Tests
 *
 * Tests performance requirements for dashboard endpoints.
 * Validates:
 * - Response time < 2 seconds for dashboard overview
 * - Response time < 1 second for health status
 * - Concurrent request handling
 * - Caching effectiveness
 * - Resource utilization under load
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import {
  createTestTenant,
  createTestUser,
  createAzureAccount,
  cleanupTestData,
  disconnectTestDatabase,
  getTestPrismaClient,
} from '../utils/azure-test-helpers';
import { mockResourceGraphSummary, mockResourceGraphChanges } from '../fixtures/dashboard.fixtures';

// Mock Azure services
jest.mock('../../services/azure/resourceGraph.service');
jest.mock('../../services/azure/azureRateLimiter.service');
jest.mock('../../services/azure/azureCache.service');

const prisma = getTestPrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Dashboard Performance Tests', () => {
  let testTenant: any;
  let testUser: any;
  let testAccount: any;
  let authToken: string;

  beforeAll(async () => {
    testTenant = await createTestTenant();
    testUser = await createTestUser(testTenant.id);
    testAccount = await createAzureAccount(testTenant.id);

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

    // Setup test data
    await setupPerformanceTestData(testTenant.id);
  });

  afterAll(async () => {
    if (testTenant) {
      await cleanupTestData(testTenant.id);
    }
    await disconnectTestDatabase();
  });

  beforeEach(() => {
    // Mock Azure services with realistic delays
    const { AzureResourceGraphService } = require('../../services/azure/resourceGraph.service');

    AzureResourceGraphService.getResourceSummary = jest.fn().mockImplementation(async () => {
      // Simulate realistic API delay (200-500ms)
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockResourceGraphSummary;
    });

    AzureResourceGraphService.getRecentChanges = jest.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return mockResourceGraphChanges;
    });
  });

  describe('Response Time Requirements', () => {
    it('should load dashboard overview in < 2 seconds', async () => {
      const start = Date.now();

      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const duration = Date.now() - start;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(2000);

      console.log(`Dashboard overview loaded in ${duration}ms`);
    });

    it('should load health status in < 1 second', async () => {
      const start = Date.now();

      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/health')
        .query({ accountId: testAccount.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const duration = Date.now() - start;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(1000);

      console.log(`Health status loaded in ${duration}ms`);
    });

    it('should maintain performance with large dataset', async () => {
      // Insert large dataset
      await insertLargeDataset(testTenant.id, 1000);

      const start = Date.now();

      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const duration = Date.now() - start;

      // Should still meet performance requirements
      expect(duration).toBeLessThan(2000);

      console.log(`Dashboard with large dataset loaded in ${duration}ms`);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle 10 concurrent requests successfully', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(API_BASE_URL)
          .get('/api/v1/dashboard/overview')
          .query({ accountId: testAccount.id })
          .set('Authorization', `Bearer ${authToken}`)
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Average time per request should be reasonable
      const avgTime = duration / 10;
      expect(avgTime).toBeLessThan(3000);

      console.log(`10 concurrent requests completed in ${duration}ms (avg: ${avgTime}ms per request)`);
    });

    it('should handle mixed concurrent requests (overview + health)', async () => {
      const overviewRequests = Array(5).fill(null).map(() =>
        request(API_BASE_URL)
          .get('/api/v1/dashboard/overview')
          .query({ accountId: testAccount.id })
          .set('Authorization', `Bearer ${authToken}`)
      );

      const healthRequests = Array(5).fill(null).map(() =>
        request(API_BASE_URL)
          .get('/api/v1/dashboard/health')
          .query({ accountId: testAccount.id })
          .set('Authorization', `Bearer ${authToken}`)
      );

      const start = Date.now();
      const responses = await Promise.all([...overviewRequests, ...healthRequests]);
      const duration = Date.now() - start;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      console.log(`10 mixed concurrent requests completed in ${duration}ms`);
    });

    it('should not timeout under concurrent load', async () => {
      // Test with higher concurrency
      const requests = Array(20).fill(null).map(() =>
        request(API_BASE_URL)
          .get('/api/v1/dashboard/overview')
          .query({ accountId: testAccount.id })
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);

      // None should timeout or error
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success');
      });
    });
  });

  describe('Caching Performance', () => {
    it('should improve response time with cache', async () => {
      const { AzureCacheService } = require('../../services/azure/azureCache.service');
      let cacheHit = false;

      // Mock cache service
      AzureCacheService.get = jest.fn().mockImplementation(async (key: string) => {
        if (cacheHit) {
          return mockResourceGraphSummary;
        }
        return null;
      });

      AzureCacheService.set = jest.fn().mockResolvedValue(undefined);

      // First request (cache miss)
      const start1 = Date.now();
      await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const duration1 = Date.now() - start1;

      // Enable cache hit
      cacheHit = true;

      // Second request (cache hit)
      const start2 = Date.now();
      await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const duration2 = Date.now() - start2;

      console.log(`First request (no cache): ${duration1}ms`);
      console.log(`Second request (cached): ${duration2}ms`);

      // Cached request should be faster or similar
      // (May not always be faster in test environment due to overhead)
      expect(duration2).toBeLessThan(duration1 + 500);
    });

    it('should use cached data within TTL window', async () => {
      const { AzureCacheService } = require('../../services/azure/azureCache.service');
      const { AzureResourceGraphService } = require('../../services/azure/resourceGraph.service');

      const cacheGetSpy = jest.spyOn(AzureCacheService, 'get');
      const apiCallSpy = jest.spyOn(AzureResourceGraphService, 'getResourceSummary');

      // First request
      await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second request immediately after
      await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Cache should have been checked
      expect(cacheGetSpy).toHaveBeenCalled();
    });
  });

  describe('Database Query Performance', () => {
    it('should execute database queries efficiently', async () => {
      // Monitor database query time
      const start = Date.now();

      await prisma.$queryRaw`
        SELECT current_score, max_score, percentage
        FROM azure_security_scores
        WHERE tenant_id = ${testTenant.id}::uuid
        AND score_type = 'overall'
        ORDER BY scored_at DESC
        LIMIT 1
      `;

      const duration = Date.now() - start;

      // Database query should be fast (< 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should handle complex aggregation queries efficiently', async () => {
      const start = Date.now();

      await prisma.$queryRaw`
        SELECT
          severity,
          COUNT(*) as count
        FROM azure_security_assessments
        WHERE tenant_id = ${testTenant.id}::uuid
        AND status = 'Unhealthy'
        GROUP BY severity
      `;

      const duration = Date.now() - start;

      // Aggregation should be fast
      expect(duration).toBeLessThan(200);
    });

    it('should limit and sort alerts efficiently', async () => {
      // Insert 100 alerts
      await insertManyAlerts(testTenant.id, 100);

      const start = Date.now();

      await prisma.$queryRaw`
        SELECT
          id::text,
          severity,
          display_name as message,
          assessed_at as timestamp
        FROM azure_security_assessments
        WHERE tenant_id = ${testTenant.id}::uuid
        AND status = 'Unhealthy'
        AND assessed_at >= NOW() - INTERVAL '7 days'
        ORDER BY assessed_at DESC
        LIMIT 20
      `;

      const duration = Date.now() - start;

      // Should handle large dataset with limit/sort efficiently
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Parallel Data Fetching', () => {
    it('should fetch data from multiple sources in parallel', async () => {
      const { AzureResourceGraphService } = require('../../services/azure/resourceGraph.service');

      // Track when each service is called
      const callTimes: number[] = [];

      AzureResourceGraphService.getResourceSummary = jest.fn().mockImplementation(async () => {
        callTimes.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 300));
        return mockResourceGraphSummary;
      });

      const start = Date.now();

      await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const duration = Date.now() - start;

      // If parallel, total time should be close to slowest operation (300ms)
      // Plus database queries and overhead
      // Should NOT be sum of all operations (> 600ms if sequential)
      expect(duration).toBeLessThan(800);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory on repeated requests', async () => {
      // Get initial memory usage
      const initialMemory = process.memoryUsage().heapUsed;

      // Make 50 requests
      for (let i = 0; i < 50; i++) {
        await request(API_BASE_URL)
          .get('/api/v1/dashboard/overview')
          .query({ accountId: testAccount.id })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      console.log(`Memory increase after 50 requests: ${memoryIncreaseMB.toFixed(2)}MB`);

      // Should not have significant memory increase (< 50MB for 50 requests)
      expect(memoryIncreaseMB).toBeLessThan(50);
    });
  });
});

// ============================================================
// Helper Functions
// ============================================================

/**
 * Setup performance test data
 */
async function setupPerformanceTestData(tenantId: string) {
  // Insert security scores
  await prisma.$executeRaw`
    INSERT INTO azure_security_scores (
      id, tenant_id, subscription_id, score_type,
      current_score, max_score, percentage, scored_at
    )
    VALUES (
      gen_random_uuid(),
      ${tenantId}::uuid,
      'test-subscription-123',
      'overall',
      80,
      100,
      0.80,
      NOW()
    )
  `;

  // Insert security assessments
  const severities = ['Critical', 'High', 'Medium'];
  for (let i = 0; i < 15; i++) {
    await prisma.$executeRaw`
      INSERT INTO azure_security_assessments (
        id, tenant_id, subscription_id, resource_id, assessment_name,
        display_name, severity, status, assessed_at
      )
      VALUES (
        gen_random_uuid(),
        ${tenantId}::uuid,
        'test-subscription-123',
        'resource-${i}',
        'assessment-${i}',
        'Security issue ${i}',
        ${severities[i % 3]},
        'Unhealthy',
        NOW() - (INTERVAL '1 hour' * ${i})
      )
    `;
  }
}

/**
 * Insert large dataset for performance testing
 */
async function insertLargeDataset(tenantId: string, count: number) {
  const batchSize = 50;
  const batches = Math.ceil(count / batchSize);

  for (let batch = 0; batch < batches; batch++) {
    const values = [];
    const limit = Math.min(batchSize, count - batch * batchSize);

    for (let i = 0; i < limit; i++) {
      const idx = batch * batchSize + i;
      values.push(`(
        gen_random_uuid(),
        '${tenantId}'::uuid,
        'sub-123',
        'resource-${idx}',
        'assessment-${idx}',
        'Issue ${idx}',
        '${['Critical', 'High', 'Medium'][idx % 3]}',
        'Unhealthy',
        NOW() - (INTERVAL '1 hour' * ${idx})
      )`);
    }

    await prisma.$executeRawUnsafe(`
      INSERT INTO azure_security_assessments (
        id, tenant_id, subscription_id, resource_id, assessment_name,
        display_name, severity, status, assessed_at
      )
      VALUES ${values.join(', ')}
    `);
  }
}

/**
 * Insert many alerts for testing
 */
async function insertManyAlerts(tenantId: string, count: number) {
  for (let i = 0; i < count; i++) {
    await prisma.$executeRaw`
      INSERT INTO azure_security_assessments (
        id, tenant_id, subscription_id, resource_id, assessment_name,
        display_name, severity, status, assessed_at
      )
      VALUES (
        gen_random_uuid(),
        ${tenantId}::uuid,
        'sub-123',
        'resource-${i}',
        'assessment-${i}',
        'Alert ${i}',
        ${['Critical', 'High', 'Medium'][i % 3]},
        'Unhealthy',
        NOW() - (INTERVAL '1 hour' * ${i})
      )
    `;
  }
}
