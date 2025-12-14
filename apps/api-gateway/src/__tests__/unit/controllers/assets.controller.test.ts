/**
 * Assets Controller Unit Tests
 *
 * Comprehensive test suite for the Assets REST API controller.
 * Tests pagination, filtering, sorting, tenant isolation, validation, and error handling.
 *
 * Test Coverage:
 * - List assets endpoint (pagination, filters, sorting, tenant isolation)
 * - Get single asset endpoint (success, not found, unauthorized)
 * - Discover assets endpoint (manual trigger, validation, rate limiting)
 * - Error handling (400, 401, 403, 404, 500)
 * - Input validation with Zod schemas
 *
 * Target Coverage: 85%+
 */

import { Request, Response } from 'express';
import { AssetsController } from '../../../modules/assets/controllers/assets.controller';
import { PrismaClient } from '@prisma/client';
import { AssetDiscoveryService } from '../../../modules/assets/services/asset-discovery.service';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../../modules/assets/services/asset-discovery.service');

describe('Assets Controller', () => {
  let controller: AssetsController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockAssetDiscoveryService: jest.Mocked<AssetDiscoveryService>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const mockUser = {
    userId: 'user-uuid-1',
    email: 'test@example.com',
    tenantId: 'tenant-uuid-1',
    role: 'admin',
  };

  const mockAsset = {
    id: 'asset-uuid-1',
    tenantId: 'tenant-uuid-1',
    cloudAccountId: 'account-uuid-1',
    provider: 'aws',
    resourceType: 'ec2_instance',
    resourceId: 'i-1234567890abcdef0',
    arn: 'arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0',
    resourceUri: null,
    name: 'web-server-01',
    region: 'us-east-1',
    zone: 'us-east-1a',
    status: 'active',
    tags: { Environment: 'production', Team: 'backend' },
    metadata: { InstanceType: 't3.medium', VpcId: 'vpc-123' },
    firstSeenAt: new Date('2025-12-01T10:00:00Z'),
    lastSeenAt: new Date('2025-12-09T10:00:00Z'),
    deletedAt: null,
    createdAt: new Date('2025-12-01T10:00:00Z'),
    updatedAt: new Date('2025-12-09T10:00:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize controller
    controller = new AssetsController();

    // Setup mock response
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };

    // Setup mock request
    mockRequest = {
      user: mockUser,
      query: {},
      body: {},
      params: {},
    };

    // Mock Prisma client
    mockPrisma = {
      asset: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
    } as any;

    // Inject mocked Prisma into controller
    (controller as any).prisma = mockPrisma;

    // Mock AssetDiscoveryService
    mockAssetDiscoveryService = {
      discoverAssets: jest.fn(),
    } as any;

    // Inject mocked service into controller
    (controller as any).assetDiscoveryService = mockAssetDiscoveryService;
  });

  // ============================================================
  // GET /api/v1/assets - List Assets
  // ============================================================

  describe('GET /api/v1/assets - list()', () => {
    // ============================================================
    // Validation Tests
    // ============================================================

    it('should return 400 when page is invalid', async () => {
      mockRequest.query = { page: '-1' };

      await controller.list(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Validation error',
        details: [
          {
            path: 'page',
            message: 'Page must be greater than or equal to 1',
          },
        ],
      });
    });

    it('should return 400 when limit exceeds maximum', async () => {
      mockRequest.query = { limit: '150' };

      await controller.list(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Validation error',
        details: [
          {
            path: 'limit',
            message: 'Limit must be less than or equal to 100',
          },
        ],
      });
    });

    it('should return 400 when provider is invalid', async () => {
      mockRequest.query = { provider: 'gcp' };

      await controller.list(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Validation error',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: 'provider',
            message: expect.stringContaining('Invalid enum value'),
          }),
        ]),
      });
    });

    it('should return 400 when status is invalid', async () => {
      mockRequest.query = { status: 'invalid' };

      await controller.list(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Validation error',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: 'status',
            message: expect.stringContaining('Invalid enum value'),
          }),
        ]),
      });
    });

    // ============================================================
    // Authentication & Authorization Tests
    // ============================================================

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.list(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'User not authenticated or tenant ID missing',
      });
    });

    it('should return 401 when tenantId is missing', async () => {
      mockRequest.user = { ...mockUser, tenantId: undefined as any };

      await controller.list(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'User not authenticated or tenant ID missing',
      });
    });

    // ============================================================
    // Pagination Tests
    // ============================================================

    it('should apply default pagination (page 1, limit 20)', async () => {
      mockPrisma.asset.count.mockResolvedValue(50);
      mockPrisma.asset.findMany.mockResolvedValue([mockAsset]);

      await controller.list(mockRequest as any, mockResponse as any);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-uuid-1', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
        meta: {
          page: 1,
          limit: 20,
          total: 50,
          totalPages: 3,
        },
      });
    });

    it('should apply custom pagination (page 2, limit 10)', async () => {
      mockRequest.query = { page: '2', limit: '10' };
      mockPrisma.asset.count.mockResolvedValue(50);
      mockPrisma.asset.findMany.mockResolvedValue([mockAsset]);

      await controller.list(mockRequest as any, mockResponse as any);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-uuid-1', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      });

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
        meta: {
          page: 2,
          limit: 10,
          total: 50,
          totalPages: 5,
        },
      });
    });

    // ============================================================
    // Filtering Tests
    // ============================================================

    it('should filter by provider', async () => {
      mockRequest.query = { provider: 'AWS' };
      mockPrisma.asset.count.mockResolvedValue(10);
      mockPrisma.asset.findMany.mockResolvedValue([mockAsset]);

      await controller.list(mockRequest as any, mockResponse as any);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-uuid-1',
          deletedAt: null,
          provider: 'aws',
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by resourceType', async () => {
      mockRequest.query = { resourceType: 'ec2_instance' };
      mockPrisma.asset.count.mockResolvedValue(10);
      mockPrisma.asset.findMany.mockResolvedValue([mockAsset]);

      await controller.list(mockRequest as any, mockResponse as any);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-uuid-1',
          deletedAt: null,
          resourceType: 'ec2_instance',
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by region', async () => {
      mockRequest.query = { region: 'us-east-1' };
      mockPrisma.asset.count.mockResolvedValue(10);
      mockPrisma.asset.findMany.mockResolvedValue([mockAsset]);

      await controller.list(mockRequest as any, mockResponse as any);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-uuid-1',
          deletedAt: null,
          region: 'us-east-1',
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by status', async () => {
      mockRequest.query = { status: 'active' };
      mockPrisma.asset.count.mockResolvedValue(10);
      mockPrisma.asset.findMany.mockResolvedValue([mockAsset]);

      await controller.list(mockRequest as any, mockResponse as any);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-uuid-1',
          deletedAt: null,
          status: 'active',
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by tags using JSON path', async () => {
      mockRequest.query = { tags: 'Environment:production' };
      mockPrisma.asset.count.mockResolvedValue(10);
      mockPrisma.asset.findMany.mockResolvedValue([mockAsset]);

      await controller.list(mockRequest as any, mockResponse as any);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-uuid-1',
          deletedAt: null,
          tags: {
            path: ['Environment'],
            equals: 'production',
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should apply multiple filters simultaneously', async () => {
      mockRequest.query = {
        provider: 'AWS',
        resourceType: 'ec2_instance',
        region: 'us-east-1',
        status: 'active',
      };
      mockPrisma.asset.count.mockResolvedValue(5);
      mockPrisma.asset.findMany.mockResolvedValue([mockAsset]);

      await controller.list(mockRequest as any, mockResponse as any);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-uuid-1',
          deletedAt: null,
          provider: 'aws',
          resourceType: 'ec2_instance',
          region: 'us-east-1',
          status: 'active',
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    // ============================================================
    // Sorting Tests
    // ============================================================

    it('should sort by createdAt desc (default)', async () => {
      mockPrisma.asset.count.mockResolvedValue(10);
      mockPrisma.asset.findMany.mockResolvedValue([mockAsset]);

      await controller.list(mockRequest as any, mockResponse as any);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should sort by createdAt asc', async () => {
      mockRequest.query = { sortBy: 'createdAt', sortOrder: 'asc' };
      mockPrisma.asset.count.mockResolvedValue(10);
      mockPrisma.asset.findMany.mockResolvedValue([mockAsset]);

      await controller.list(mockRequest as any, mockResponse as any);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        })
      );
    });

    it('should sort by resourceType', async () => {
      mockRequest.query = { sortBy: 'resourceType', sortOrder: 'asc' };
      mockPrisma.asset.count.mockResolvedValue(10);
      mockPrisma.asset.findMany.mockResolvedValue([mockAsset]);

      await controller.list(mockRequest as any, mockResponse as any);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { resourceType: 'asc' },
        })
      );
    });

    // ============================================================
    // Tenant Isolation Tests
    // ============================================================

    it('should enforce tenant isolation', async () => {
      mockPrisma.asset.count.mockResolvedValue(10);
      mockPrisma.asset.findMany.mockResolvedValue([mockAsset]);

      await controller.list(mockRequest as any, mockResponse as any);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-uuid-1',
          }),
        })
      );
    });

    // ============================================================
    // Response Format Tests
    // ============================================================

    it('should return properly formatted response', async () => {
      mockPrisma.asset.count.mockResolvedValue(1);
      mockPrisma.asset.findMany.mockResolvedValue([mockAsset]);

      await controller.list(mockRequest as any, mockResponse as any);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            id: 'asset-uuid-1',
            tenantId: 'tenant-uuid-1',
            cloudAccountId: 'account-uuid-1',
            provider: 'aws',
            resourceType: 'ec2_instance',
            resourceId: 'i-1234567890abcdef0',
            name: 'web-server-01',
            region: 'us-east-1',
            zone: 'us-east-1a',
            status: 'active',
            tags: { Environment: 'production', Team: 'backend' },
            metadata: { InstanceType: 't3.medium', VpcId: 'vpc-123' },
            lastSeenAt: '2025-12-09T10:00:00.000Z',
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it('should return empty array when no assets found', async () => {
      mockPrisma.asset.count.mockResolvedValue(0);
      mockPrisma.asset.findMany.mockResolvedValue([]);

      await controller.list(mockRequest as any, mockResponse as any);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [],
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      });
    });

    // ============================================================
    // Error Handling Tests
    // ============================================================

    it('should handle database errors', async () => {
      mockPrisma.asset.count.mockRejectedValue(new Error('Database connection failed'));

      await controller.list(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        message: 'Database connection failed',
      });
    });
  });

  // ============================================================
  // GET /api/v1/assets/:id - Get Single Asset
  // ============================================================

  describe('GET /api/v1/assets/:id - get()', () => {
    // ============================================================
    // Success Cases
    // ============================================================

    it('should return asset when found', async () => {
      mockRequest.params = { id: 'asset-uuid-1' };
      mockPrisma.asset.findUnique.mockResolvedValue(mockAsset);

      await controller.get(mockRequest as any, mockResponse as any);

      expect(mockPrisma.asset.findUnique).toHaveBeenCalledWith({
        where: { id: 'asset-uuid-1' },
      });

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'asset-uuid-1',
          tenantId: 'tenant-uuid-1',
          cloudAccountId: 'account-uuid-1',
          provider: 'aws',
          resourceType: 'ec2_instance',
          resourceId: 'i-1234567890abcdef0',
          name: 'web-server-01',
          region: 'us-east-1',
          zone: 'us-east-1a',
          status: 'active',
          tags: { Environment: 'production', Team: 'backend' },
          metadata: { InstanceType: 't3.medium', VpcId: 'vpc-123' },
          lastSeenAt: '2025-12-09T10:00:00.000Z',
        },
      });
    });

    // ============================================================
    // Authentication & Authorization Tests
    // ============================================================

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: 'asset-uuid-1' };

      await controller.get(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'User not authenticated or tenant ID missing',
      });
    });

    it('should return 403 when asset belongs to different tenant', async () => {
      mockRequest.params = { id: 'asset-uuid-1' };
      const otherTenantAsset = { ...mockAsset, tenantId: 'other-tenant-uuid' };
      mockPrisma.asset.findUnique.mockResolvedValue(otherTenantAsset);

      await controller.get(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden - Asset does not belong to your tenant',
      });
    });

    // ============================================================
    // Not Found Tests
    // ============================================================

    it('should return 404 when asset not found', async () => {
      mockRequest.params = { id: 'non-existent-uuid' };
      mockPrisma.asset.findUnique.mockResolvedValue(null);

      await controller.get(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Asset not found',
      });
    });

    it('should return 400 when id is missing', async () => {
      mockRequest.params = {};

      await controller.get(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Asset ID is required',
      });
    });

    // ============================================================
    // Error Handling Tests
    // ============================================================

    it('should handle database errors', async () => {
      mockRequest.params = { id: 'asset-uuid-1' };
      mockPrisma.asset.findUnique.mockRejectedValue(new Error('Database error'));

      await controller.get(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        message: 'Database error',
      });
    });
  });

  // ============================================================
  // POST /api/v1/assets/discover - Manual Discovery
  // ============================================================

  describe('POST /api/v1/assets/discover - discover()', () => {
    // ============================================================
    // Success Cases
    // ============================================================

    it('should trigger discovery for all accounts when cloudAccountId not provided', async () => {
      const discoveryResult = {
        assetsDiscovered: 25,
        accountsProcessed: 2,
        errors: [],
      };

      mockAssetDiscoveryService.discoverAssets.mockResolvedValue(discoveryResult);

      await controller.discover(mockRequest as any, mockResponse as any);

      expect(mockAssetDiscoveryService.discoverAssets).toHaveBeenCalledWith('tenant-uuid-1', undefined);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          assetsDiscovered: 25,
          accountsProcessed: 2,
          errors: [],
        },
      });
    });

    it('should trigger discovery for specific account when cloudAccountId provided', async () => {
      // Use a valid UUID format
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      mockRequest.body = { cloudAccountId: validUuid };
      const discoveryResult = {
        assetsDiscovered: 10,
        accountsProcessed: 1,
        errors: [],
      };

      mockAssetDiscoveryService.discoverAssets.mockResolvedValue(discoveryResult);

      await controller.discover(mockRequest as any, mockResponse as any);

      expect(mockAssetDiscoveryService.discoverAssets).toHaveBeenCalledWith(
        'tenant-uuid-1',
        validUuid
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          assetsDiscovered: 10,
          accountsProcessed: 1,
          errors: [],
        },
      });
    });

    it('should return discovery result with errors', async () => {
      const discoveryResult = {
        assetsDiscovered: 10,
        accountsProcessed: 2,
        errors: [
          {
            accountId: 'account-uuid-2',
            provider: 'azure',
            error: 'Invalid credentials',
          },
        ],
      };

      mockAssetDiscoveryService.discoverAssets.mockResolvedValue(discoveryResult);

      await controller.discover(mockRequest as any, mockResponse as any);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: discoveryResult,
      });
    });

    // ============================================================
    // Authentication Tests
    // ============================================================

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.discover(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'User not authenticated or tenant ID missing',
      });
    });

    // ============================================================
    // Validation Tests
    // ============================================================

    it('should return 400 when cloudAccountId is invalid UUID', async () => {
      mockRequest.body = { cloudAccountId: 'invalid-uuid' };

      await controller.discover(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Validation error',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: 'cloudAccountId',
            message: expect.stringContaining('Invalid uuid'),
          }),
        ]),
      });
    });

    // ============================================================
    // Error Handling Tests
    // ============================================================

    it('should handle service errors', async () => {
      mockAssetDiscoveryService.discoverAssets.mockRejectedValue(
        new Error('Discovery service failed')
      );

      await controller.discover(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        message: 'Discovery service failed',
      });
    });
  });
});
