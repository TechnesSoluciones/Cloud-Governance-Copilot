/**
 * Azure Advisor Enhanced Service - Unit Tests
 *
 * Tests for AdvisorEnhancedService with mocked dependencies.
 *
 * Coverage:
 * - getRecommendations success scenarios
 * - getRecommendations with filters
 * - getRecommendations error handling
 * - getRecommendationById success
 * - getRecommendationById not found
 * - suppressRecommendation success
 * - suppressRecommendation not found
 * - Cache behavior
 * - Tenant isolation
 * - Rate limiting
 *
 * @module __tests__/unit/modules/advisor
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { AdvisorEnhancedService } from '../../../../modules/advisor/services/advisor-enhanced.service';
import * as redisModule from '../../../../config/redis';

// Mock dependencies
jest.mock('../../../../config/redis');
jest.mock('../../../../integrations/azure/advisor.service');
jest.mock('../../../../utils/logger');

describe('AdvisorEnhancedService', () => {
  let service: AdvisorEnhancedService;
  let prismaMock: any;
  let config: any;

  beforeEach(() => {
    // Mock Prisma Client
    prismaMock = {
      azureAdvisorRecommendation: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
      advisorAction: {
        create: jest.fn(),
      },
    };

    // Configuration
    config = {
      tenantId: 'tenant-123',
      cloudAccountId: 'account-456',
      azureCredentials: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        tenantId: 'azure-tenant-id',
        subscriptionId: 'test-subscription-id',
      },
    };

    // Mock Redis as unavailable by default
    (redisModule.isRedisAvailable as jest.Mock).mockReturnValue(false);
    (redisModule.getRedisSafe as jest.Mock).mockReturnValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize successfully with valid config', () => {
      expect(() => {
        service = new AdvisorEnhancedService(config, prismaMock);
      }).not.toThrow();
    });

    it('should throw error if Azure credentials are missing', () => {
      const invalidConfig = {
        ...config,
        azureCredentials: {
          clientId: '',
          clientSecret: '',
          tenantId: '',
          subscriptionId: '',
        },
      };

      expect(() => {
        new AdvisorEnhancedService(invalidConfig, prismaMock);
      }).toThrow();
    });
  });

  describe('getRecommendations', () => {
    beforeEach(() => {
      service = new AdvisorEnhancedService(config, prismaMock);
    });

    it('should return paginated recommendations successfully', async () => {
      // Mock Azure Advisor Service response
      const mockRecommendations = [
        {
          id: 'rec-1',
          category: 'Cost',
          impact: 'High',
          shortDescription: 'Reduce VM costs',
          longDescription: 'Rightsize your VMs',
          metadata: {
            resourceId: '/subscriptions/.../vm1',
            resourceType: 'Microsoft.Compute/virtualMachines',
            estimatedSavings: {
              amount: 2400,
              currency: 'USD',
            },
            recommendedActions: ['Stop VM', 'Resize', 'Start VM'],
          },
          lastUpdated: new Date(),
        },
      ];

      // Mock base service method
      const baseService = (service as any).baseService;
      baseService.getRecommendations = jest.fn().mockResolvedValue(mockRecommendations);

      const result = await service.getRecommendations();

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBe(1);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should apply filters correctly', async () => {
      service = new AdvisorEnhancedService(config, prismaMock);

      const mockRecommendations = [
        {
          id: 'rec-1',
          category: 'Cost',
          impact: 'High',
          shortDescription: 'Reduce VM costs',
          metadata: {
            resourceId: '/subscriptions/.../vm1',
            resourceType: 'Microsoft.Compute/virtualMachines',
            estimatedSavings: { amount: 2400, currency: 'USD' },
            recommendedActions: [],
          },
          lastUpdated: new Date(),
        },
        {
          id: 'rec-2',
          category: 'Security',
          impact: 'Medium',
          shortDescription: 'Enable encryption',
          metadata: {
            resourceId: '/subscriptions/.../vm2',
            resourceType: 'Microsoft.Compute/virtualMachines',
            recommendedActions: [],
          },
          lastUpdated: new Date(),
        },
      ];

      const baseService = (service as any).baseService;
      baseService.getRecommendations = jest.fn().mockResolvedValue(mockRecommendations);

      const result = await service.getRecommendations({
        category: 'Cost' as any,
      });

      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should handle cache hit scenario', async () => {
      service = new AdvisorEnhancedService(config, prismaMock);

      // Mock Redis as available
      (redisModule.isRedisAvailable as jest.Mock).mockReturnValue(true);
      const mockRedis = {
        get: jest.fn().mockResolvedValue(JSON.stringify([])),
      };
      (redisModule.getRedisSafe as jest.Mock).mockReturnValue(mockRedis);

      const baseService = (service as any).baseService;
      baseService.getRecommendations = jest.fn();

      await service.getRecommendations();

      // Should not call Azure API if cache hit
      expect(baseService.getRecommendations).not.toHaveBeenCalled();
    });

    it('should handle rate limiting errors', async () => {
      service = new AdvisorEnhancedService(config, prismaMock);

      const baseService = (service as any).baseService;
      const error = new Error('429 Too Many Requests');
      baseService.getRecommendations = jest.fn().mockRejectedValue(error);

      await expect(service.getRecommendations()).rejects.toThrow();
    });

    it('should enforce tenant isolation', async () => {
      service = new AdvisorEnhancedService(config, prismaMock);

      const mockRecommendations = [
        {
          id: 'rec-1',
          category: 'Cost',
          impact: 'High',
          shortDescription: 'Test',
          metadata: {
            resourceId: '/subscriptions/.../vm1',
            recommendedActions: [],
          },
          lastUpdated: new Date(),
        },
      ];

      const baseService = (service as any).baseService;
      baseService.getRecommendations = jest.fn().mockResolvedValue(mockRecommendations);

      prismaMock.azureAdvisorRecommendation.upsert.mockResolvedValue({});

      await service.getRecommendations();

      // Verify tenant isolation in DB operations
      expect(prismaMock.azureAdvisorRecommendation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId_azureRecommendationId: expect.objectContaining({
              tenantId: config.tenantId,
            }),
          }),
        })
      );
    });
  });

  describe('getRecommendationById', () => {
    beforeEach(() => {
      service = new AdvisorEnhancedService(config, prismaMock);
    });

    it('should return recommendation from database if exists', async () => {
      const mockDbRec = {
        recommendationId: 'uuid-123',
        tenantId: config.tenantId,
        azureRecommendationId: 'rec-1',
        category: 'Cost',
        impact: 'High',
        shortDescription: 'Test recommendation',
        longDescription: 'Test description',
        resourceId: '/subscriptions/.../vm1',
        resourceType: 'Microsoft.Compute/virtualMachines',
        potentialSavingsAmount: 2400,
        potentialSavingsCurrency: 'USD',
        remediationSteps: ['Step 1', 'Step 2'],
        status: 'Active',
        lastUpdated: new Date(),
      };

      prismaMock.azureAdvisorRecommendation.findFirst.mockResolvedValue(mockDbRec);

      const result = await service.getRecommendationById('rec-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('rec-1');
      expect(result?.category).toBe('Cost');
    });

    it('should return null if recommendation not found', async () => {
      prismaMock.azureAdvisorRecommendation.findFirst.mockResolvedValue(null);

      const baseService = (service as any).baseService;
      baseService.getRecommendations = jest.fn().mockResolvedValue([]);

      const result = await service.getRecommendationById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getRecommendationSummary', () => {
    beforeEach(() => {
      service = new AdvisorEnhancedService(config, prismaMock);
    });

    it('should return summary statistics', async () => {
      const mockRecommendations = [
        {
          id: 'rec-1',
          category: 'Cost',
          impact: 'High',
          shortDescription: 'Test',
          metadata: {
            resourceId: '/subscriptions/.../vm1',
            estimatedSavings: { amount: 2400, currency: 'USD' },
            recommendedActions: [],
          },
          lastUpdated: new Date(),
        },
      ];

      const baseService = (service as any).baseService;
      baseService.getRecommendations = jest.fn().mockResolvedValue(mockRecommendations);

      const result = await service.getRecommendationSummary();

      expect(result).toBeDefined();
      expect(result.totalRecommendations).toBe(1);
      expect(result.byCategory.cost).toBe(1);
      expect(result.totalPotentialSavings).toBe(2400);
    });
  });

  describe('suppressRecommendation', () => {
    beforeEach(() => {
      service = new AdvisorEnhancedService(config, prismaMock);
    });

    it('should suppress recommendation successfully', async () => {
      const mockDbRec = {
        recommendationId: 'uuid-123',
        azureRecommendationId: 'rec-1',
      };

      prismaMock.azureAdvisorRecommendation.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.azureAdvisorRecommendation.findFirst.mockResolvedValue(mockDbRec);
      prismaMock.advisorAction.create.mockResolvedValue({});

      const result = await service.suppressRecommendation('rec-1', 30, 'user-123', 'Test notes');

      expect(result).toBe(true);
      expect(prismaMock.azureAdvisorRecommendation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: config.tenantId,
            azureRecommendationId: 'rec-1',
          }),
          data: expect.objectContaining({
            status: 'Suppressed',
          }),
        })
      );
    });

    it('should return false if recommendation not found', async () => {
      prismaMock.azureAdvisorRecommendation.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.suppressRecommendation('non-existent', 30, 'user-123');

      expect(result).toBe(false);
    });

    it('should invalidate cache after suppression', async () => {
      const mockDbRec = {
        recommendationId: 'uuid-123',
        azureRecommendationId: 'rec-1',
      };

      prismaMock.azureAdvisorRecommendation.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.azureAdvisorRecommendation.findFirst.mockResolvedValue(mockDbRec);
      prismaMock.advisorAction.create.mockResolvedValue({});

      // Mock Redis as available
      (redisModule.isRedisAvailable as jest.Mock).mockReturnValue(true);
      const mockRedis = {
        keys: jest.fn().mockResolvedValue(['advisor:tenant-123:recommendations']),
        del: jest.fn().mockResolvedValue(1),
      };
      (redisModule.getRedisSafe as jest.Mock).mockReturnValue(mockRedis);

      await service.suppressRecommendation('rec-1', 30, 'user-123');

      expect(mockRedis.keys).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      service = new AdvisorEnhancedService(config, prismaMock);
    });

    it('should handle Azure authentication errors', async () => {
      const baseService = (service as any).baseService;
      baseService.getRecommendations = jest.fn().mockRejectedValue(new Error('401 Unauthorized'));

      await expect(service.getRecommendations()).rejects.toThrow();
    });

    it('should handle database connection errors', async () => {
      prismaMock.azureAdvisorRecommendation.findFirst.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(service.getRecommendationById('rec-1')).rejects.toThrow();
    });

    it('should handle Redis connection errors gracefully', async () => {
      service = new AdvisorEnhancedService(config, prismaMock);

      // Redis is available but throws error
      (redisModule.isRedisAvailable as jest.Mock).mockReturnValue(true);
      const mockRedis = {
        get: jest.fn().mockRejectedValue(new Error('Redis connection lost')),
      };
      (redisModule.getRedisSafe as jest.Mock).mockReturnValue(mockRedis);

      const baseService = (service as any).baseService;
      baseService.getRecommendations = jest.fn().mockResolvedValue([]);

      // Should fall back to Azure API on Redis error
      const result = await service.getRecommendations();

      expect(result).toBeDefined();
      expect(baseService.getRecommendations).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      service = new AdvisorEnhancedService(config, prismaMock);
    });

    it('should use cache for repeated requests', async () => {
      const mockRecommendations = [
        {
          id: 'rec-1',
          category: 'Cost',
          impact: 'High',
          shortDescription: 'Test',
          metadata: {
            resourceId: '/subscriptions/.../vm1',
            recommendedActions: [],
          },
          lastUpdated: new Date(),
        },
      ];

      // Mock Redis as available
      (redisModule.isRedisAvailable as jest.Mock).mockReturnValue(true);
      const cachedData = JSON.stringify(mockRecommendations);
      const mockRedis = {
        get: jest.fn()
          .mockResolvedValueOnce(null) // First call: cache miss
          .mockResolvedValueOnce(cachedData), // Second call: cache hit
        setEx: jest.fn().mockResolvedValue('OK'),
      };
      (redisModule.getRedisSafe as jest.Mock).mockReturnValue(mockRedis);

      const baseService = (service as any).baseService;
      baseService.getRecommendations = jest.fn().mockResolvedValue(mockRecommendations);

      prismaMock.azureAdvisorRecommendation.upsert.mockResolvedValue({});

      // First request - should call Azure API
      await service.getRecommendations();
      expect(baseService.getRecommendations).toHaveBeenCalledTimes(1);

      // Second request - should use cache
      await service.getRecommendations();
      expect(baseService.getRecommendations).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });
});
