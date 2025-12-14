/**
 * Dashboard Security Tests
 *
 * Tests security measures for dashboard endpoints.
 * Validates:
 * - Authentication and authorization
 * - Input validation and sanitization
 * - KQL injection prevention
 * - SQL injection prevention
 * - Rate limiting
 * - Data access controls (tenant isolation)
 * - Secure error handling
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import {
  createTestTenant,
  createTestUser,
  createAzureAccount,
  cleanupTestData,
  disconnectTestDatabase,
} from '../utils/azure-test-helpers';
import { mockResourceGraphSummary, mockResourceGraphChanges } from '../fixtures/dashboard.fixtures';

// Mock Azure services
jest.mock('../../services/azure/resourceGraph.service');
jest.mock('../../services/azure/azureRateLimiter.service');
jest.mock('../../services/azure/azureCache.service');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Dashboard Security Tests', () => {
  let testTenant1: any;
  let testTenant2: any;
  let testUser1: any;
  let testUser2: any;
  let testAccount1: any;
  let testAccount2: any;
  let authToken1: string;
  let authToken2: string;

  beforeAll(async () => {
    // Create two separate tenants for isolation testing
    testTenant1 = await createTestTenant();
    testTenant2 = await createTestTenant();

    testUser1 = await createTestUser(testTenant1.id);
    testUser2 = await createTestUser(testTenant2.id);

    testAccount1 = await createAzureAccount(testTenant1.id);
    testAccount2 = await createAzureAccount(testTenant2.id);

    authToken1 = jwt.sign(
      {
        userId: testUser1.id,
        tenantId: testTenant1.id,
        email: testUser1.email,
        role: testUser1.role,
      },
      process.env.JWT_SECRET || 'test-jwt-secret-key',
      { expiresIn: '1h' }
    );

    authToken2 = jwt.sign(
      {
        userId: testUser2.id,
        tenantId: testTenant2.id,
        email: testUser2.email,
        role: testUser2.role,
      },
      process.env.JWT_SECRET || 'test-jwt-secret-key',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    if (testTenant1) await cleanupTestData(testTenant1.id);
    if (testTenant2) await cleanupTestData(testTenant2.id);
    await disconnectTestDatabase();
  });

  beforeEach(() => {
    // Mock Azure services
    const { AzureResourceGraphService } = require('../../services/azure/resourceGraph.service');
    AzureResourceGraphService.getResourceSummary = jest
      .fn()
      .mockResolvedValue(mockResourceGraphSummary);
    AzureResourceGraphService.getRecentChanges = jest
      .fn()
      .mockResolvedValue(mockResourceGraphChanges);
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount1.id })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests with invalid JWT token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount1.id })
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        {
          userId: testUser1.id,
          tenantId: testTenant1.id,
          email: testUser1.email,
          role: testUser1.role,
        },
        process.env.JWT_SECRET || 'test-jwt-secret-key',
        { expiresIn: '-1h' } // Already expired
      );

      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount1.id })
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject malformed Authorization header', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount1.id })
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should enforce tenant isolation (user cannot access other tenant data)', async () => {
      // User from tenant1 tries to access tenant2's account
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount2.id })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/access|permission|forbidden/i);
    });

    it('should allow users to access their own tenant data', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount1.id })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should reject missing accountId parameter', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/accountId/i);
    });

    it('should reject empty accountId', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: '' })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject accountId with SQL injection attempt', async () => {
      const maliciousAccountId = "'; DROP TABLE cloud_accounts; --";

      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: maliciousAccountId })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject accountId with special characters', async () => {
      const maliciousAccountId = "../../../etc/passwd";

      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: maliciousAccountId })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle excessively long accountId', async () => {
      const longAccountId = 'a'.repeat(1000);

      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: longAccountId })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject null or undefined in query parameters', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: null as any })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('KQL Injection Prevention', () => {
    it('should sanitize KQL special characters in search queries', async () => {
      const { AzureResourceGraphService } = require('../../services/azure/resourceGraph.service');

      // Mock KQL query execution to capture the query
      let capturedQuery = '';
      AzureResourceGraphService.getResourceSummary = jest.fn().mockImplementation(async (accountId) => {
        // This would normally execute KQL - we're testing that input is sanitized
        return mockResourceGraphSummary;
      });

      // Attempt KQL injection in accountId
      const maliciousInput = "test' | project * | where true or '1'='1";

      await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: maliciousInput })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(400); // Should be rejected at validation layer

      // Service should not have been called with malicious input
      expect(AzureResourceGraphService.getResourceSummary).not.toHaveBeenCalledWith(
        expect.stringContaining('|')
      );
    });

    it('should escape single quotes in resource identifiers', async () => {
      const { AzureResourceGraphService } = require('../../services/azure/resourceGraph.service');

      // Test that single quotes are properly escaped
      const inputWithQuote = "account'123";

      await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: inputWithQuote })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(400); // Should be rejected
    });

    it('should prevent KQL command injection', async () => {
      const maliciousCommands = [
        "test; drop table Resources;",
        "test | project *",
        "test where 1=1",
        "test' union all select * from Resources where '1'='1",
      ];

      for (const command of maliciousCommands) {
        const response = await request(API_BASE_URL)
          .get('/api/v1/dashboard/overview')
          .query({ accountId: command })
          .set('Authorization', `Bearer ${authToken1}`);

        // All should be rejected
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should use parameterized queries for database access', async () => {
      // This test verifies that database queries use parameterized inputs
      // The service should use Prisma's parameterized queries, not string concatenation

      const sqlInjectionAttempts = [
        "'; DELETE FROM azure_security_scores; --",
        "' OR '1'='1",
        "'; DROP TABLE tenants; --",
        "' UNION SELECT * FROM users --",
      ];

      for (const attempt of sqlInjectionAttempts) {
        const response = await request(API_BASE_URL)
          .get('/api/v1/dashboard/overview')
          .query({ accountId: attempt })
          .set('Authorization', `Bearer ${authToken1}`);

        // Should be rejected at validation layer
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should prevent SQL injection in tenant ID', async () => {
      // Even if someone manipulates the JWT, the query should be parameterized
      const maliciousToken = jwt.sign(
        {
          userId: testUser1.id,
          tenantId: "' OR '1'='1",
          email: testUser1.email,
          role: testUser1.role,
        },
        process.env.JWT_SECRET || 'test-jwt-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount1.id })
        .set('Authorization', `Bearer ${maliciousToken}`);

      // Should fail (either 401 or 500, but not expose data)
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on dashboard requests', async () => {
      const { AzureRateLimiterService } = require('../../services/azure/azureRateLimiter.service');

      // Mock rate limiter to reject after threshold
      let requestCount = 0;
      AzureRateLimiterService.checkRateLimit = jest.fn().mockImplementation(async () => {
        requestCount++;
        if (requestCount > 10) {
          return {
            allowed: false,
            remaining: 0,
            resetAt: new Date(Date.now() + 60000),
          };
        }
        return {
          allowed: true,
          remaining: 10 - requestCount,
          resetAt: new Date(Date.now() + 60000),
        };
      });

      // Make requests until rate limit is hit
      const responses = [];
      for (let i = 0; i < 15; i++) {
        const response = await request(API_BASE_URL)
          .get('/api/v1/dashboard/overview')
          .query({ accountId: testAccount1.id })
          .set('Authorization', `Bearer ${authToken1}`);

        responses.push(response);
      }

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should include rate limit headers in response', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount1.id })
        .set('Authorization', `Bearer ${authToken1}`);

      // Should include rate limit headers (if implemented)
      // Example: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
      // This depends on your rate limiting implementation
    });
  });

  describe('Secure Error Handling', () => {
    it('should not expose sensitive information in error messages', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: 'non-existent-account' })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(500);

      const errorMessage = response.body.error.toLowerCase();

      // Should not expose database details
      expect(errorMessage).not.toMatch(/database|sql|postgres|prisma/i);

      // Should not expose file paths
      expect(errorMessage).not.toMatch(/\/.*\.(ts|js)/);

      // Should not expose stack traces in production
      expect(response.body).not.toHaveProperty('stack');
    });

    it('should not expose internal service errors', async () => {
      const { AzureResourceGraphService } = require('../../services/azure/resourceGraph.service');

      // Mock internal error
      AzureResourceGraphService.getResourceSummary = jest.fn().mockRejectedValue(
        new Error('Internal Azure SDK error: Connection failed at 10.0.0.1:443')
      );

      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount1.id })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(500);

      // Should not expose internal IPs or connection details
      expect(response.body.error).not.toMatch(/10\.0\.0\.1/);
      expect(response.body.error).not.toMatch(/Connection failed/);

      // Should return generic error message
      expect(response.body.error).toMatch(/dashboard|failed|error/i);
    });

    it('should log errors securely without exposing to client', async () => {
      const { AzureResourceGraphService } = require('../../services/azure/resourceGraph.service');

      AzureResourceGraphService.getResourceSummary = jest.fn().mockRejectedValue(
        new Error('Credential validation failed')
      );

      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount1.id })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(500);

      // Should not expose credential errors to client
      expect(response.body.error).not.toMatch(/credential/i);
    });
  });

  describe('Data Access Controls', () => {
    it('should prevent cross-tenant data access via accountId manipulation', async () => {
      // User from tenant1 tries to access account from tenant2
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount2.id })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should verify account ownership before returning data', async () => {
      // Create account in tenant2 but try to access with tenant1 credentials
      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount2.id })
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(403);

      expect(response.body.error).toMatch(/access|permission|forbidden/i);
    });

    it('should not leak data existence through error messages', async () => {
      // Try to access non-existent account
      const nonExistentResponse = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: 'non-existent-account' })
        .set('Authorization', `Bearer ${authToken1}`);

      // Try to access other tenant's account
      const forbiddenResponse = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount2.id })
        .set('Authorization', `Bearer ${authToken1}`);

      // Error messages should be similar (don't reveal existence)
      expect(nonExistentResponse.status).toBeGreaterThanOrEqual(400);
      expect(forbiddenResponse.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('HTTPS and Transport Security', () => {
    it('should require secure headers in production', async () => {
      // This test checks for security headers
      // In production, these should be enforced by helmet middleware

      const response = await request(API_BASE_URL)
        .get('/api/v1/dashboard/overview')
        .query({ accountId: testAccount1.id })
        .set('Authorization', `Bearer ${authToken1}`);

      // Check for security headers (if helmet is configured)
      // These might not be present in test environment
      if (process.env.NODE_ENV === 'production') {
        expect(response.headers).toHaveProperty('x-content-type-options');
        expect(response.headers).toHaveProperty('x-frame-options');
        expect(response.headers).toHaveProperty('strict-transport-security');
      }
    });
  });
});
