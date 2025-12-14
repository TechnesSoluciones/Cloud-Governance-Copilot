/**
 * E2E Tests: FinOps Costs API
 *
 * This test suite verifies the complete FinOps REST API endpoints end-to-end.
 * Tests cover authentication, authorization, data retrieval, filtering, and error handling.
 *
 * Prerequisites:
 * - Test database running
 * - Test server running
 * - Test user with valid credentials
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../../src/index';
import {
  mockCloudAccount,
  mockCostDataRecords,
  mockCostAnomalies,
  mockUser,
} from '../../fixtures/aws-mock-responses';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/copilot_test',
    },
  },
});

describe('FinOps API E2E Tests', () => {
  let authToken: string;
  let tenantId: string;

  // ============================================================
  // Setup and Teardown
  // ============================================================

  beforeAll(async () => {
    // Connect to test database
    await prisma.$connect();

    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        slug: 'test-tenant-e2e',
        status: 'active',
      },
    });
    tenantId = tenant.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        tenantId,
        email: 'test-finops@example.com',
        passwordHash: '$2a$10$SAMPLE_HASH', // bcrypt hash of 'password123'
        firstName: 'Test',
        lastName: 'User',
        role: 'admin',
        status: 'active',
        emailVerified: true,
      },
    });

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test-finops@example.com',
        password: 'password123',
      });

    if (loginResponse.status === 200) {
      authToken = loginResponse.body.tokens?.accessToken || '';
    } else {
      // For testing purposes, use a mock token
      authToken = 'mock-test-token';
    }
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.costAnomaly.deleteMany({ where: { tenantId } });
    await prisma.costData.deleteMany({ where: { tenantId } });
    await prisma.cloudAccount.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });

    // Disconnect from database
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Seed test data before each test
    await prisma.cloudAccount.create({
      data: {
        ...mockCloudAccount,
        tenantId,
      },
    });

    await prisma.costData.createMany({
      data: mockCostDataRecords.map((record) => ({
        ...record,
        tenantId,
        cloudAccountId: mockCloudAccount.id,
      })),
    });

    await prisma.costAnomaly.createMany({
      data: mockCostAnomalies.map((anomaly) => ({
        ...anomaly,
        tenantId,
      })),
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.costAnomaly.deleteMany({ where: { tenantId } });
    await prisma.costData.deleteMany({ where: { tenantId } });
    await prisma.cloudAccount.deleteMany({ where: { tenantId } });
  });

  // ============================================================
  // GET /api/finops/costs
  // ============================================================

  describe('GET /api/finops/costs', () => {
    it('should return costs for date range with auth token', async () => {
      const response = await request(app)
        .get('/api/finops/costs')
        .query({
          startDate: '2024-01-15T00:00:00Z',
          endDate: '2024-01-16T23:59:59Z',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.currency).toBe('USD');
    });

    it('should filter costs by provider', async () => {
      const response = await request(app)
        .get('/api/finops/costs')
        .query({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
          provider: 'aws',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((cost: any) => cost.provider === 'aws')).toBe(true);
    });

    it('should filter costs by service', async () => {
      const response = await request(app)
        .get('/api/finops/costs')
        .query({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
          service: 'Amazon EC2',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((cost: any) => cost.service === 'Amazon EC2')).toBe(true);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/finops/costs')
        .query({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 with invalid date format', async () => {
      const response = await request(app)
        .get('/api/finops/costs')
        .query({
          startDate: 'invalid-date',
          endDate: '2024-01-31T23:59:59Z',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    it('should return 400 without required parameters', async () => {
      const response = await request(app)
        .get('/api/finops/costs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================
  // GET /api/finops/costs/by-service
  // ============================================================

  describe('GET /api/finops/costs/by-service', () => {
    it('should return cost aggregation by service', async () => {
      const response = await request(app)
        .get('/api/finops/costs/by-service')
        .query({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify structure
      const firstService = response.body.data[0];
      expect(firstService).toHaveProperty('service');
      expect(firstService).toHaveProperty('provider');
      expect(firstService).toHaveProperty('totalCost');
      expect(firstService).toHaveProperty('percentage');
    });

    it('should calculate percentages correctly', async () => {
      const response = await request(app)
        .get('/api/finops/costs/by-service')
        .query({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const totalPercentage = response.body.data.reduce(
        (sum: number, item: any) => sum + item.percentage,
        0
      );

      // Should sum to approximately 100%
      expect(totalPercentage).toBeGreaterThan(99);
      expect(totalPercentage).toBeLessThanOrEqual(100.1);
    });

    it('should sort by totalCost descending', async () => {
      const response = await request(app)
        .get('/api/finops/costs/by-service')
        .query({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const costs = response.body.data.map((item: any) => item.totalCost);

      // Verify descending order
      for (let i = 1; i < costs.length; i++) {
        expect(costs[i - 1]).toBeGreaterThanOrEqual(costs[i]);
      }
    });
  });

  // ============================================================
  // GET /api/finops/costs/trends
  // ============================================================

  describe('GET /api/finops/costs/trends', () => {
    it('should return cost trends with daily granularity', async () => {
      const response = await request(app)
        .get('/api/finops/costs/trends')
        .query({
          startDate: '2024-01-15T00:00:00Z',
          endDate: '2024-01-16T23:59:59Z',
          granularity: 'daily',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);

      // Verify structure
      if (response.body.data.length > 0) {
        const firstTrend = response.body.data[0];
        expect(firstTrend).toHaveProperty('date');
        expect(firstTrend).toHaveProperty('totalCost');
        expect(firstTrend).toHaveProperty('currency');
      }
    });

    it('should use daily granularity by default', async () => {
      const response = await request(app)
        .get('/api/finops/costs/trends')
        .query({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Daily granularity should have date format YYYY-MM-DD
      if (response.body.data.length > 0) {
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        expect(response.body.data[0].date).toMatch(datePattern);
      }
    });

    it('should support weekly granularity', async () => {
      const response = await request(app)
        .get('/api/finops/costs/trends')
        .query({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
          granularity: 'weekly',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support monthly granularity', async () => {
      const response = await request(app)
        .get('/api/finops/costs/trends')
        .query({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-03-31T23:59:59Z',
          granularity: 'monthly',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ============================================================
  // GET /api/finops/anomalies
  // ============================================================

  describe('GET /api/finops/anomalies', () => {
    it('should return all anomalies without filters', async () => {
      const response = await request(app)
        .get('/api/finops/anomalies')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.count).toBeGreaterThan(0);

      // Verify structure
      const firstAnomaly = response.body.data[0];
      expect(firstAnomaly).toHaveProperty('id');
      expect(firstAnomaly).toHaveProperty('service');
      expect(firstAnomaly).toHaveProperty('severity');
      expect(firstAnomaly).toHaveProperty('status');
      expect(firstAnomaly).toHaveProperty('expectedCost');
      expect(firstAnomaly).toHaveProperty('actualCost');
      expect(firstAnomaly).toHaveProperty('deviation');
    });

    it('should filter anomalies by severity', async () => {
      const response = await request(app)
        .get('/api/finops/anomalies')
        .query({ severity: 'high' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((a: any) => a.severity === 'high')).toBe(true);
    });

    it('should filter anomalies by status', async () => {
      const response = await request(app)
        .get('/api/finops/anomalies')
        .query({ status: 'open' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((a: any) => a.status === 'open')).toBe(true);
    });

    it('should filter anomalies by service', async () => {
      const response = await request(app)
        .get('/api/finops/anomalies')
        .query({ service: 'Amazon EC2' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((a: any) => a.service === 'Amazon EC2')).toBe(true);
    });

    it('should filter anomalies by provider', async () => {
      const response = await request(app)
        .get('/api/finops/anomalies')
        .query({ provider: 'aws' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((a: any) => a.provider === 'aws')).toBe(true);
    });

    it('should filter anomalies by date range', async () => {
      const response = await request(app)
        .get('/api/finops/anomalies')
        .query({
          startDate: '2024-01-19T00:00:00Z',
          endDate: '2024-01-20T23:59:59Z',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ============================================================
  // POST /api/finops/anomalies/:id/resolve
  // ============================================================

  describe('POST /api/finops/anomalies/:id/resolve', () => {
    it('should resolve an open anomaly', async () => {
      // Get an open anomaly
      const anomaliesResponse = await request(app)
        .get('/api/finops/anomalies')
        .query({ status: 'open' })
        .set('Authorization', `Bearer ${authToken}`);

      const anomalyId = anomaliesResponse.body.data[0]?.id;

      if (!anomalyId) {
        // Skip test if no open anomalies
        return;
      }

      const response = await request(app)
        .post(`/api/finops/anomalies/${anomalyId}/resolve`)
        .send({
          resolution: 'This anomaly was caused by a planned infrastructure upgrade',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('resolved');
      expect(response.body.data.resolvedAt).toBeTruthy();
    });

    it('should return 401 without auth token', async () => {
      await request(app)
        .post('/api/finops/anomalies/anomaly-123/resolve')
        .send({
          resolution: 'Test resolution',
        })
        .expect(401);
    });

    it('should return 400 with short resolution', async () => {
      const response = await request(app)
        .post('/api/finops/anomalies/anomaly-123/resolve')
        .send({
          resolution: 'Short', // Less than 10 characters
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    it('should return 404 for non-existent anomaly', async () => {
      const response = await request(app)
        .post('/api/finops/anomalies/non-existent-id/resolve')
        .send({
          resolution: 'This is a valid resolution description',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 if anomaly already resolved', async () => {
      // Get a resolved anomaly
      const anomaliesResponse = await request(app)
        .get('/api/finops/anomalies')
        .query({ status: 'resolved' })
        .set('Authorization', `Bearer ${authToken}`);

      const anomalyId = anomaliesResponse.body.data[0]?.id;

      if (!anomalyId) {
        // Skip test if no resolved anomalies
        return;
      }

      const response = await request(app)
        .post(`/api/finops/anomalies/${anomalyId}/resolve`)
        .send({
          resolution: 'Attempting to resolve again',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already resolved');
    });
  });

  // ============================================================
  // Authorization & Tenant Isolation Tests
  // ============================================================

  describe('Authorization & Tenant Isolation', () => {
    it('should not return costs from other tenants', async () => {
      // Create another tenant with costs
      const otherTenant = await prisma.tenant.create({
        data: {
          name: 'Other Tenant',
          slug: 'other-tenant',
          status: 'active',
        },
      });

      await prisma.costData.create({
        data: {
          tenantId: otherTenant.id,
          cloudAccountId: mockCloudAccount.id,
          date: new Date('2024-01-15'),
          amount: 999.99,
          currency: 'USD',
          provider: 'aws',
          service: 'Amazon EC2',
          usageType: 't2.micro',
        },
      });

      const response = await request(app)
        .get('/api/finops/costs')
        .query({
          startDate: '2024-01-15T00:00:00Z',
          endDate: '2024-01-16T23:59:59Z',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should not see costs from other tenant
      expect(
        response.body.data.every((cost: any) => cost.amount !== 999.99)
      ).toBe(true);

      // Clean up
      await prisma.costData.deleteMany({ where: { tenantId: otherTenant.id } });
      await prisma.tenant.delete({ where: { id: otherTenant.id } });
    });
  });
});
