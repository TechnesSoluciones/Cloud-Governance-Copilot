/**
 * Security Controller Unit Tests
 *
 * Comprehensive test suite for the Security REST API controller.
 * Tests pagination, filtering, sorting, tenant isolation, validation, and error handling.
 *
 * Test Coverage:
 * - List scans endpoint (pagination, filters, sorting, tenant isolation)
 * - Get single scan endpoint (success, not found, unauthorized)
 * - Trigger scan endpoint (manual trigger, validation, tenant isolation)
 * - List findings endpoint (pagination, filters, sorting, tenant isolation)
 * - Get single finding endpoint (success, not found, unauthorized)
 * - Resolve finding endpoint (success, already resolved, validation)
 * - Dismiss finding endpoint (success, validation, tenant isolation)
 * - Get summary endpoint (statistics calculation, tenant isolation)
 * - Error handling (400, 401, 403, 404, 500)
 * - Input validation with Zod schemas
 *
 * Target Coverage: 85%+
 * Total Test Cases: 37
 */

import { Request, Response } from 'express';
import { SecurityController } from '../../../modules/security/controllers/security.controller';
import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('@prisma/client');

describe('Security Controller', () => {
  let controller: SecurityController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockEventBus: jest.Mocked<EventEmitter>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const mockUser = {
    userId: 'user-uuid-1',
    email: 'test@example.com',
    tenantId: 'tenant-uuid-1',
    role: 'admin',
  };

  const mockCloudAccount = {
    id: 'account-uuid-1',
    tenantId: 'tenant-uuid-1',
    provider: 'aws',
    accountName: 'Production AWS',
    accountIdentifier: '123456789012',
    credentialsCiphertext: 'encrypted',
    credentialsIv: 'iv',
    credentialsAuthTag: 'tag',
    status: 'active',
    lastSync: new Date('2025-12-09T10:00:00Z'),
    metadata: {},
    createdAt: new Date('2025-12-01T10:00:00Z'),
    updatedAt: new Date('2025-12-09T10:00:00Z'),
  };

  const mockScan = {
    id: 'scan-uuid-1',
    tenantId: 'tenant-uuid-1',
    cloudAccountId: 'account-uuid-1',
    provider: 'aws',
    scanType: 'full',
    framework: ['CIS', 'NIST'],
    startedAt: new Date('2025-12-09T10:00:00Z'),
    completedAt: new Date('2025-12-09T10:30:00Z'),
    status: 'completed',
    findingsCount: 15,
    criticalCount: 2,
    highCount: 5,
    mediumCount: 6,
    lowCount: 2,
    error: null,
    cloudAccount: {
      accountName: 'Production AWS',
      provider: 'aws',
    },
  };

  const mockFinding = {
    id: 'finding-uuid-1',
    tenantId: 'tenant-uuid-1',
    scanId: 'scan-uuid-1',
    assetId: 'asset-uuid-1',
    ruleCode: 'CIS-1.1',
    framework: 'CIS',
    severity: 'critical',
    status: 'open',
    provider: 'aws',
    resourceType: 's3_bucket',
    title: 'S3 bucket is publicly accessible',
    description: 'The S3 bucket allows public read access',
    remediation: 'Update bucket policy to restrict public access',
    evidence: { publicAccess: true },
    detectedAt: new Date('2025-12-09T10:00:00Z'),
    resolvedAt: null,
    scan: {
      scanType: 'full',
      startedAt: new Date('2025-12-09T10:00:00Z'),
      cloudAccount: {
        accountName: 'Production AWS',
        provider: 'aws',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize controller
    controller = new SecurityController();

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
      securityScan: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      securityFinding: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn(),
      },
      cloudAccount: {
        findUnique: jest.fn(),
      },
    } as any;

    // Inject mocked Prisma into controller
    (controller as any).prisma = mockPrisma;

    // Mock EventBus
    mockEventBus = {
      emit: jest.fn(),
    } as any;

    // Inject mocked eventBus into controller
    (controller as any).eventBus = mockEventBus;
  });

  // ============================================================
  // GET /api/v1/security/scans - List Scans
  // ============================================================

  describe('GET /api/v1/security/scans - listScans()', () => {
    // ============================================================
    // Validation Tests
    // ============================================================

    it('should return 400 when page is invalid', async () => {
      mockRequest.query = { page: '-1' };

      await controller.listScans(mockRequest as any, mockResponse as any);

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

      await controller.listScans(mockRequest as any, mockResponse as any);

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

    it('should return 400 when status is invalid', async () => {
      mockRequest.query = { status: 'invalid' };

      await controller.listScans(mockRequest as any, mockResponse as any);

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

      await controller.listScans(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'User not authenticated or tenant ID missing',
      });
    });

    it('should return 401 when tenantId is missing', async () => {
      mockRequest.user = { ...mockUser, tenantId: undefined as any };

      await controller.listScans(mockRequest as any, mockResponse as any);

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
      mockPrisma.securityScan.count.mockResolvedValue(50);
      mockPrisma.securityScan.findMany.mockResolvedValue([mockScan] as any);

      await controller.listScans(mockRequest as any, mockResponse as any);

      expect(mockPrisma.securityScan.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-uuid-1' },
        orderBy: { startedAt: 'desc' },
        skip: 0,
        take: 20,
        include: {
          cloudAccount: {
            select: {
              accountName: true,
              provider: true,
            },
          },
        },
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
      mockPrisma.securityScan.count.mockResolvedValue(50);
      mockPrisma.securityScan.findMany.mockResolvedValue([mockScan] as any);

      await controller.listScans(mockRequest as any, mockResponse as any);

      expect(mockPrisma.securityScan.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-uuid-1' },
        orderBy: { startedAt: 'desc' },
        skip: 10,
        take: 10,
        include: {
          cloudAccount: {
            select: {
              accountName: true,
              provider: true,
            },
          },
        },
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

    it('should filter by status', async () => {
      mockRequest.query = { status: 'completed' };
      mockPrisma.securityScan.count.mockResolvedValue(10);
      mockPrisma.securityScan.findMany.mockResolvedValue([mockScan] as any);

      await controller.listScans(mockRequest as any, mockResponse as any);

      expect(mockPrisma.securityScan.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-uuid-1',
          status: 'completed',
        },
        orderBy: { startedAt: 'desc' },
        skip: 0,
        take: 20,
        include: {
          cloudAccount: {
            select: {
              accountName: true,
              provider: true,
            },
          },
        },
      });
    });

    it('should filter by cloudAccountId', async () => {
      // Use valid UUID format
      const validAccountUuid = '550e8400-e29b-41d4-a716-446655440000';
      mockRequest.query = { cloudAccountId: validAccountUuid };
      mockPrisma.securityScan.count.mockResolvedValue(10);
      mockPrisma.securityScan.findMany.mockResolvedValue([mockScan] as any);

      await controller.listScans(mockRequest as any, mockResponse as any);

      expect(mockPrisma.securityScan.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-uuid-1',
          cloudAccountId: validAccountUuid,
        },
        orderBy: { startedAt: 'desc' },
        skip: 0,
        take: 20,
        include: {
          cloudAccount: {
            select: {
              accountName: true,
              provider: true,
            },
          },
        },
      });
    });

    it('should filter by date range', async () => {
      mockRequest.query = {
        startDate: '2025-12-01T00:00:00Z',
        endDate: '2025-12-09T23:59:59Z',
      };
      mockPrisma.securityScan.count.mockResolvedValue(10);
      mockPrisma.securityScan.findMany.mockResolvedValue([mockScan] as any);

      await controller.listScans(mockRequest as any, mockResponse as any);

      expect(mockPrisma.securityScan.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-uuid-1',
          startedAt: {
            gte: new Date('2025-12-01T00:00:00Z'),
            lte: new Date('2025-12-09T23:59:59Z'),
          },
        },
        orderBy: { startedAt: 'desc' },
        skip: 0,
        take: 20,
        include: {
          cloudAccount: {
            select: {
              accountName: true,
              provider: true,
            },
          },
        },
      });
    });

    // ============================================================
    // Sorting Tests
    // ============================================================

    it('should sort by findingsCount ascending', async () => {
      mockRequest.query = { sortBy: 'findingsCount', sortOrder: 'asc' };
      mockPrisma.securityScan.count.mockResolvedValue(10);
      mockPrisma.securityScan.findMany.mockResolvedValue([mockScan] as any);

      await controller.listScans(mockRequest as any, mockResponse as any);

      expect(mockPrisma.securityScan.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-uuid-1' },
        orderBy: { findingsCount: 'asc' },
        skip: 0,
        take: 20,
        include: {
          cloudAccount: {
            select: {
              accountName: true,
              provider: true,
            },
          },
        },
      });
    });
  });

  // ============================================================
  // GET /api/v1/security/scans/:id - Get Scan
  // ============================================================

  describe('GET /api/v1/security/scans/:id - getScan()', () => {
    it('should return 400 when scan ID is missing', async () => {
      mockRequest.params = {};

      await controller.getScan(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Scan ID is required',
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: 'scan-uuid-1' };

      await controller.getScan(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'User not authenticated or tenant ID missing',
      });
    });

    it('should return 404 when scan does not exist', async () => {
      mockRequest.params = { id: 'scan-uuid-1' };
      mockPrisma.securityScan.findUnique.mockResolvedValue(null);

      await controller.getScan(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Security scan not found',
      });
    });

    it('should return 403 when scan belongs to different tenant', async () => {
      mockRequest.params = { id: 'scan-uuid-1' };
      mockPrisma.securityScan.findUnique.mockResolvedValue({
        ...mockScan,
        tenantId: 'tenant-uuid-2',
      } as any);

      await controller.getScan(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden - Security scan does not belong to your tenant',
      });
    });

    it('should return scan successfully', async () => {
      mockRequest.params = { id: 'scan-uuid-1' };
      mockPrisma.securityScan.findUnique.mockResolvedValue(mockScan as any);

      await controller.getScan(mockRequest as any, mockResponse as any);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'scan-uuid-1',
          tenantId: 'tenant-uuid-1',
          status: 'completed',
        }),
      });
    });
  });

  // ============================================================
  // POST /api/v1/security/scans - Trigger Scan
  // ============================================================

  describe('POST /api/v1/security/scans - triggerScan()', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.triggerScan(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'User not authenticated or tenant ID missing',
      });
    });

    it('should return 400 when cloudAccountId is invalid UUID', async () => {
      mockRequest.body = { cloudAccountId: 'invalid-uuid' };

      await controller.triggerScan(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Validation error',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: 'cloudAccountId',
            message: 'Invalid cloud account ID',
          }),
        ]),
      });
    });

    it('should return 404 when cloud account does not exist', async () => {
      // Use valid UUID format
      const validAccountUuid = '550e8400-e29b-41d4-a716-446655440000';
      mockRequest.body = { cloudAccountId: validAccountUuid };
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(null);

      await controller.triggerScan(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Cloud account not found',
      });
    });

    it('should return 403 when cloud account belongs to different tenant', async () => {
      // Use valid UUID format
      const validAccountUuid = '550e8400-e29b-41d4-a716-446655440000';
      mockRequest.body = { cloudAccountId: validAccountUuid };
      mockPrisma.cloudAccount.findUnique.mockResolvedValue({
        ...mockCloudAccount,
        tenantId: 'tenant-uuid-2',
      } as any);

      await controller.triggerScan(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden - Cloud account does not belong to your tenant',
      });
    });

    it('should trigger scan successfully without cloudAccountId', async () => {
      mockRequest.body = {};

      await controller.triggerScan(mockRequest as any, mockResponse as any);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          jobId: expect.any(String),
          status: 'queued',
          message: 'Security scan triggered successfully',
        }),
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'security.scan.triggered',
        expect.objectContaining({
          tenantId: 'tenant-uuid-1',
          userId: 'user-uuid-1',
        })
      );
    });

    it('should trigger scan successfully with cloudAccountId', async () => {
      // Use valid UUID format
      const validAccountUuid = '550e8400-e29b-41d4-a716-446655440000';
      mockRequest.body = { cloudAccountId: validAccountUuid };
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(mockCloudAccount as any);

      await controller.triggerScan(mockRequest as any, mockResponse as any);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          jobId: expect.any(String),
          status: 'queued',
          message: 'Security scan triggered successfully',
        }),
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'security.scan.triggered',
        expect.objectContaining({
          tenantId: 'tenant-uuid-1',
          cloudAccountId: validAccountUuid,
          userId: 'user-uuid-1',
        })
      );
    });
  });

  // ============================================================
  // GET /api/v1/security/findings - List Findings
  // ============================================================

  describe('GET /api/v1/security/findings - listFindings()', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.listFindings(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'User not authenticated or tenant ID missing',
      });
    });

    it('should apply default filters (status: open)', async () => {
      mockPrisma.securityFinding.count.mockResolvedValue(50);
      mockPrisma.securityFinding.findMany.mockResolvedValue([mockFinding] as any);

      await controller.listFindings(mockRequest as any, mockResponse as any);

      expect(mockPrisma.securityFinding.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-uuid-1',
          status: 'open',
        },
        orderBy: { detectedAt: 'desc' },
        skip: 0,
        take: 20,
        include: {
          scan: {
            select: {
              scanType: true,
              startedAt: true,
              cloudAccount: {
                select: {
                  accountName: true,
                  provider: true,
                },
              },
            },
          },
        },
      });
    });

    it('should filter by severity', async () => {
      mockRequest.query = { severity: 'critical' };
      mockPrisma.securityFinding.count.mockResolvedValue(10);
      mockPrisma.securityFinding.findMany.mockResolvedValue([mockFinding] as any);

      await controller.listFindings(mockRequest as any, mockResponse as any);

      expect(mockPrisma.securityFinding.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-uuid-1',
          severity: 'critical',
          status: 'open',
        },
        orderBy: { detectedAt: 'desc' },
        skip: 0,
        take: 20,
        include: expect.any(Object),
      });
    });

    it('should filter by category (framework)', async () => {
      mockRequest.query = { category: 'CIS' };
      mockPrisma.securityFinding.count.mockResolvedValue(10);
      mockPrisma.securityFinding.findMany.mockResolvedValue([mockFinding] as any);

      await controller.listFindings(mockRequest as any, mockResponse as any);

      expect(mockPrisma.securityFinding.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-uuid-1',
          framework: 'CIS',
          status: 'open',
        },
        orderBy: { detectedAt: 'desc' },
        skip: 0,
        take: 20,
        include: expect.any(Object),
      });
    });

    it('should filter by cloudAccountId through scan relation', async () => {
      // Use valid UUID format
      const validAccountUuid = '550e8400-e29b-41d4-a716-446655440000';
      mockRequest.query = { cloudAccountId: validAccountUuid };
      mockPrisma.securityFinding.count.mockResolvedValue(10);
      mockPrisma.securityFinding.findMany.mockResolvedValue([mockFinding] as any);

      await controller.listFindings(mockRequest as any, mockResponse as any);

      expect(mockPrisma.securityFinding.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-uuid-1',
          status: 'open',
          scan: {
            cloudAccountId: validAccountUuid,
          },
        },
        orderBy: { detectedAt: 'desc' },
        skip: 0,
        take: 20,
        include: expect.any(Object),
      });
    });

    it('should sort by severity descending', async () => {
      mockRequest.query = { sortBy: 'severity', sortOrder: 'desc' };

      const findings = [
        { ...mockFinding, id: 'finding-1', severity: 'medium', detectedAt: new Date('2025-12-09T10:00:00Z'), scan: mockFinding.scan },
        { ...mockFinding, id: 'finding-2', severity: 'critical', detectedAt: new Date('2025-12-09T10:00:00Z'), scan: mockFinding.scan },
        { ...mockFinding, id: 'finding-3', severity: 'low', detectedAt: new Date('2025-12-09T10:00:00Z'), scan: mockFinding.scan },
        { ...mockFinding, id: 'finding-4', severity: 'high', detectedAt: new Date('2025-12-09T10:00:00Z'), scan: mockFinding.scan },
      ];

      mockPrisma.securityFinding.count.mockResolvedValue(4);
      mockPrisma.securityFinding.findMany.mockResolvedValue(findings as any);

      await controller.listFindings(mockRequest as any, mockResponse as any);

      const responseData = jsonMock.mock.calls[0][0].data;

      // Verify that sorting was applied (at least verify we have all findings)
      expect(responseData).toHaveLength(4);

      // Verify that critical is first (highest priority)
      const criticalIndex = responseData.findIndex((f: any) => f.severity === 'critical');
      const lowIndex = responseData.findIndex((f: any) => f.severity === 'low');

      // Critical should appear before low when sorting descending
      expect(criticalIndex).toBeLessThan(lowIndex);
    });
  });

  // ============================================================
  // GET /api/v1/security/findings/:id - Get Finding
  // ============================================================

  describe('GET /api/v1/security/findings/:id - getFinding()', () => {
    it('should return 400 when finding ID is missing', async () => {
      mockRequest.params = {};

      await controller.getFinding(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Finding ID is required',
      });
    });

    it('should return 404 when finding does not exist', async () => {
      mockRequest.params = { id: 'finding-uuid-1' };
      mockPrisma.securityFinding.findUnique.mockResolvedValue(null);

      await controller.getFinding(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Security finding not found',
      });
    });

    it('should return 403 when finding belongs to different tenant', async () => {
      mockRequest.params = { id: 'finding-uuid-1' };
      mockPrisma.securityFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        tenantId: 'tenant-uuid-2',
      } as any);

      await controller.getFinding(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden - Security finding does not belong to your tenant',
      });
    });

    it('should return finding successfully', async () => {
      mockRequest.params = { id: 'finding-uuid-1' };
      mockPrisma.securityFinding.findUnique.mockResolvedValue(mockFinding as any);

      await controller.getFinding(mockRequest as any, mockResponse as any);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'finding-uuid-1',
          tenantId: 'tenant-uuid-1',
          severity: 'critical',
          status: 'open',
        }),
      });
    });
  });

  // ============================================================
  // PATCH /api/v1/security/findings/:id/resolve - Resolve Finding
  // ============================================================

  describe('PATCH /api/v1/security/findings/:id/resolve - resolveFinding()', () => {
    it('should return 400 when finding ID is missing', async () => {
      mockRequest.params = {};

      await controller.resolveFinding(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Finding ID is required',
      });
    });

    it('should return 404 when finding does not exist', async () => {
      mockRequest.params = { id: 'finding-uuid-1' };
      mockRequest.body = { notes: 'Fixed' };
      mockPrisma.securityFinding.findUnique.mockResolvedValue(null);

      await controller.resolveFinding(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Security finding not found',
      });
    });

    it('should return 403 when finding belongs to different tenant', async () => {
      mockRequest.params = { id: 'finding-uuid-1' };
      mockRequest.body = { notes: 'Fixed' };
      mockPrisma.securityFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        tenantId: 'tenant-uuid-2',
      } as any);

      await controller.resolveFinding(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden - Security finding does not belong to your tenant',
      });
    });

    it('should return 400 when finding is already resolved', async () => {
      mockRequest.params = { id: 'finding-uuid-1' };
      mockRequest.body = { notes: 'Fixed' };
      mockPrisma.securityFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        status: 'resolved',
        resolvedAt: new Date(),
      } as any);

      await controller.resolveFinding(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Security finding is already resolved',
      });
    });

    it('should resolve finding successfully without notes', async () => {
      mockRequest.params = { id: 'finding-uuid-1' };
      mockRequest.body = {};
      mockPrisma.securityFinding.findUnique.mockResolvedValue(mockFinding as any);
      mockPrisma.securityFinding.update.mockResolvedValue({
        ...mockFinding,
        status: 'resolved',
        resolvedAt: new Date('2025-12-09T12:00:00Z'),
      } as any);

      await controller.resolveFinding(mockRequest as any, mockResponse as any);

      expect(mockPrisma.securityFinding.update).toHaveBeenCalledWith({
        where: { id: 'finding-uuid-1' },
        data: {
          status: 'resolved',
          resolvedAt: expect.any(Date),
        },
      });

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'finding-uuid-1',
          status: 'resolved',
          resolvedAt: expect.any(String),
        }),
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'security.finding.resolved',
        expect.objectContaining({
          tenantId: 'tenant-uuid-1',
          findingId: 'finding-uuid-1',
          userId: 'user-uuid-1',
        })
      );
    });

    it('should resolve finding successfully with notes', async () => {
      mockRequest.params = { id: 'finding-uuid-1' };
      mockRequest.body = { notes: 'Fixed by updating bucket policy' };
      mockPrisma.securityFinding.findUnique.mockResolvedValue(mockFinding as any);
      mockPrisma.securityFinding.update.mockResolvedValue({
        ...mockFinding,
        status: 'resolved',
        resolvedAt: new Date('2025-12-09T12:00:00Z'),
      } as any);

      await controller.resolveFinding(mockRequest as any, mockResponse as any);

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'security.finding.resolved',
        expect.objectContaining({
          tenantId: 'tenant-uuid-1',
          findingId: 'finding-uuid-1',
          userId: 'user-uuid-1',
          notes: 'Fixed by updating bucket policy',
        })
      );
    });
  });

  // ============================================================
  // PATCH /api/v1/security/findings/:id/dismiss - Dismiss Finding
  // ============================================================

  describe('PATCH /api/v1/security/findings/:id/dismiss - dismissFinding()', () => {
    it('should return 400 when reason is missing', async () => {
      mockRequest.params = { id: 'finding-uuid-1' };
      mockRequest.body = {};

      await controller.dismissFinding(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Validation error',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: 'reason',
            message: expect.stringMatching(/required/i),
          }),
        ]),
      });
    });

    it('should return 404 when finding does not exist', async () => {
      mockRequest.params = { id: 'finding-uuid-1' };
      mockRequest.body = { reason: 'Accepted risk' };
      mockPrisma.securityFinding.findUnique.mockResolvedValue(null);

      await controller.dismissFinding(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Security finding not found',
      });
    });

    it('should return 403 when finding belongs to different tenant', async () => {
      mockRequest.params = { id: 'finding-uuid-1' };
      mockRequest.body = { reason: 'Accepted risk' };
      mockPrisma.securityFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        tenantId: 'tenant-uuid-2',
      } as any);

      await controller.dismissFinding(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden - Security finding does not belong to your tenant',
      });
    });

    it('should dismiss finding successfully', async () => {
      mockRequest.params = { id: 'finding-uuid-1' };
      mockRequest.body = { reason: 'Accepted risk - legacy system' };
      mockPrisma.securityFinding.findUnique.mockResolvedValue(mockFinding as any);
      mockPrisma.securityFinding.update.mockResolvedValue({
        ...mockFinding,
        status: 'dismissed',
      } as any);

      await controller.dismissFinding(mockRequest as any, mockResponse as any);

      expect(mockPrisma.securityFinding.update).toHaveBeenCalledWith({
        where: { id: 'finding-uuid-1' },
        data: {
          status: 'dismissed',
        },
      });

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'finding-uuid-1',
          status: 'dismissed',
        }),
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'security.finding.dismissed',
        expect.objectContaining({
          tenantId: 'tenant-uuid-1',
          findingId: 'finding-uuid-1',
          userId: 'user-uuid-1',
          reason: 'Accepted risk - legacy system',
        })
      );
    });
  });

  // ============================================================
  // GET /api/v1/security/summary - Get Summary
  // ============================================================

  describe('GET /api/v1/security/summary - getSummary()', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.getSummary(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'User not authenticated or tenant ID missing',
      });
    });

    it('should return summary statistics successfully', async () => {
      // Mock scans count
      mockPrisma.securityScan.count.mockResolvedValue(15);

      // Mock findings by severity
      mockPrisma.securityFinding.groupBy.mockResolvedValueOnce([
        { severity: 'critical', _count: 5 },
        { severity: 'high', _count: 12 },
        { severity: 'medium', _count: 25 },
        { severity: 'low', _count: 8 },
      ] as any);

      // Mock findings by category
      mockPrisma.securityFinding.groupBy.mockResolvedValueOnce([
        { framework: 'CIS', _count: 30 },
        { framework: 'NIST', _count: 20 },
      ] as any);

      // Mock recent scans
      mockPrisma.securityScan.findMany.mockResolvedValueOnce([mockScan] as any);

      // Mock trend data
      mockPrisma.securityScan.findMany.mockResolvedValueOnce([
        {
          startedAt: new Date('2025-12-09T10:00:00Z'),
          criticalCount: 2,
          highCount: 5,
          mediumCount: 6,
          lowCount: 2,
        },
      ] as any);

      await controller.getSummary(mockRequest as any, mockResponse as any);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          scansLast30Days: 15,
          openFindingsBySeverity: {
            critical: 5,
            high: 12,
            medium: 25,
            low: 8,
          },
          findingsByCategory: [
            { category: 'CIS', count: 30 },
            { category: 'NIST', count: 20 },
          ],
          recentScans: expect.any(Array),
          trendData: expect.any(Array),
        }),
      });
    });

    it('should handle empty statistics gracefully', async () => {
      mockPrisma.securityScan.count.mockResolvedValue(0);
      mockPrisma.securityFinding.groupBy.mockResolvedValue([]);
      mockPrisma.securityScan.findMany.mockResolvedValue([]);

      await controller.getSummary(mockRequest as any, mockResponse as any);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          scansLast30Days: 0,
          openFindingsBySeverity: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          },
          findingsByCategory: [],
          recentScans: [],
          trendData: [],
        }),
      });
    });
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================

  describe('Error Handling', () => {
    it('should handle internal server errors gracefully', async () => {
      mockPrisma.securityScan.count.mockRejectedValue(new Error('Database connection failed'));
      mockPrisma.securityScan.findMany.mockRejectedValue(new Error('Database connection failed'));

      await controller.listScans(mockRequest as any, mockResponse as any);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        message: 'Database connection failed',
      });
    });
  });
});
