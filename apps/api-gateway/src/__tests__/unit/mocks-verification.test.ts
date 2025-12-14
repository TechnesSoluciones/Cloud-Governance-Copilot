/**
 * Mocks and Fixtures Verification
 *
 * This test verifies that all mocks and fixtures are working correctly.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { prismaMock } from '../../__mocks__/prisma';
import { mockCostExplorerClient, mockEC2Client } from '../../__mocks__/aws-sdk';
import { createMockQueue, createMockJob } from '../../__mocks__/bullmq';
import { createInMemoryRedis } from '../../__mocks__/redis';
import { tenantAData } from '../../__fixtures__/tenants.fixture';
import { mockCostData } from '../../__fixtures__/aws-costs.fixture';
import { mockEC2Instance } from '../../__fixtures__/ec2-instances.fixture';

describe('Mocks Verification', () => {
  describe('Prisma Mock', () => {
    test('should be defined', () => {
      expect(prismaMock).toBeDefined();
    });

    test('should have tenant methods', () => {
      expect(prismaMock.tenant).toBeDefined();
      expect(prismaMock.tenant.findUnique).toBeDefined();
      expect(prismaMock.tenant.create).toBeDefined();
    });

    test('should be able to mock responses', async () => {
      prismaMock.tenant.findUnique.mockResolvedValue(tenantAData as any);

      const result = await prismaMock.tenant.findUnique({
        where: { id: tenantAData.id },
      });

      expect(result).toEqual(tenantAData);
    });
  });

  describe('AWS SDK Mocks', () => {
    test('should have Cost Explorer client mock', () => {
      expect(mockCostExplorerClient).toBeDefined();
    });

    test('should have EC2 client mock', () => {
      expect(mockEC2Client).toBeDefined();
    });
  });

  describe('BullMQ Mocks', () => {
    test('should create mock queue', () => {
      const queue = createMockQueue('test-queue');
      expect(queue).toBeDefined();
      expect(queue.name).toBe('test-queue');
    });

    test('should create mock job', () => {
      const job = createMockJob({ id: '1', name: 'test-job' });
      expect(job).toBeDefined();
      expect(job.id).toBe('1');
      expect(job.name).toBe('test-job');
    });
  });

  describe('Redis Mock', () => {
    test('should create in-memory Redis', async () => {
      const redis = createInMemoryRedis();
      expect(redis).toBeDefined();

      // Test basic operations
      await redis.set('test-key', 'test-value');
      const value = await redis.get('test-key');
      expect(value).toBe('test-value');
    });
  });
});

describe('Fixtures Verification', () => {
  test('should have tenant fixtures', () => {
    expect(tenantAData).toBeDefined();
    expect(tenantAData.id).toBeDefined();
    expect(tenantAData.name).toBe('Tenant A Corporation');
  });

  test('should have cost data fixtures', () => {
    expect(mockCostData).toBeDefined();
    expect(mockCostData.provider).toBe('aws');
  });

  test('should have EC2 instance fixtures', () => {
    expect(mockEC2Instance).toBeDefined();
    expect(mockEC2Instance.provider).toBe('aws');
    expect(mockEC2Instance.resourceType).toBe('ec2-instance');
  });
});
