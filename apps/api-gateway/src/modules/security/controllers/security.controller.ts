/**
 * Security Controller
 *
 * REST API controller for security scanning and findings management.
 * Provides endpoints for listing scans, findings, triggering manual scans,
 * and managing finding states (resolve/dismiss).
 *
 * Endpoints:
 * - GET    /api/v1/security/scans          - List security scans with pagination
 * - GET    /api/v1/security/scans/:id      - Get single scan details
 * - POST   /api/v1/security/scans          - Trigger manual security scan
 * - GET    /api/v1/security/findings       - List security findings with filters
 * - GET    /api/v1/security/findings/:id   - Get single finding details
 * - PATCH  /api/v1/security/findings/:id/resolve - Mark finding as resolved
 * - PATCH  /api/v1/security/findings/:id/dismiss - Mark finding as dismissed
 * - GET    /api/v1/security/summary        - Get security summary statistics
 *
 * Features:
 * - Pagination: Default 20, max 100 items per page
 * - Filters: severity, category, status, provider, cloudAccountId, resourceType
 * - Sorting: severity, lastObservedAt, startedAt (asc/desc)
 * - Tenant isolation: All queries scoped to authenticated user's tenant
 * - Input validation: Zod schemas for request validation
 * - Error handling: Consistent error responses with proper HTTP status codes
 * - Event emissions: Status changes emit events for cross-module communication
 *
 * @module Security/Controllers
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { EventEmitter } from 'events';

// ============================================================
// Type Extensions
// ============================================================

/**
 * Extended Express Request type with authenticated user
 */
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
  };
}

// ============================================================
// Validation Schemas (Zod)
// ============================================================

/**
 * Schema for GET /api/v1/security/scans query parameters
 */
const listScansSchema = z.object({
  // Pagination
  page: z.coerce
    .number()
    .min(1, 'Page must be greater than or equal to 1')
    .default(1),
  limit: z.coerce
    .number()
    .min(1, 'Limit must be greater than or equal to 1')
    .max(100, 'Limit must be less than or equal to 100')
    .default(20),

  // Filters
  status: z.enum(['running', 'completed', 'failed']).optional(),
  cloudAccountId: z.string().uuid('Invalid cloud account ID').optional(),
  startDate: z.string().datetime('Invalid start date').optional(),
  endDate: z.string().datetime('Invalid end date').optional(),

  // Sorting
  sortBy: z.enum(['startedAt', 'findingsCount']).default('startedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Schema for GET /api/v1/security/findings query parameters
 */
const listFindingsSchema = z.object({
  // Pagination
  page: z.coerce
    .number()
    .min(1, 'Page must be greater than or equal to 1')
    .default(1),
  limit: z.coerce
    .number()
    .min(1, 'Limit must be greater than or equal to 1')
    .max(100, 'Limit must be less than or equal to 100')
    .default(20),

  // Filters
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  category: z.string().optional(),
  status: z.enum(['open', 'resolved', 'dismissed']).default('open'),
  cloudAccountId: z.string().uuid('Invalid cloud account ID').optional(),
  resourceType: z.string().optional(),
  scanId: z.string().uuid('Invalid scan ID').optional(),

  // Sorting
  sortBy: z.enum(['severity', 'detectedAt']).default('severity'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Schema for POST /api/v1/security/scans request body
 */
const triggerScanSchema = z.object({
  cloudAccountId: z.string().uuid('Invalid cloud account ID').optional(),
});

/**
 * Schema for PATCH /api/v1/security/findings/:id/resolve request body
 */
const resolveFindingSchema = z.object({
  notes: z.string().optional(),
});

/**
 * Schema for PATCH /api/v1/security/findings/:id/dismiss request body
 */
const dismissFindingSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

// ============================================================
// Helper Types
// ============================================================

/**
 * Security scan response format
 */
interface SecurityScanResponse {
  id: string;
  tenantId: string;
  cloudAccountId: string;
  provider: string;
  scanType: string;
  framework: string[];
  startedAt: string;
  completedAt: string | null;
  status: string;
  findingsCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  error: string | null;
  cloudAccount?: {
    accountName: string;
    provider: string;
  };
}

/**
 * Security finding response format
 */
interface SecurityFindingResponse {
  id: string;
  tenantId: string;
  scanId: string;
  assetId: string | null;
  ruleCode: string;
  framework: string;
  severity: string;
  status: string;
  provider: string;
  resourceType: string;
  title: string;
  description: string;
  remediation: string;
  evidence: any;
  detectedAt: string;
  resolvedAt: string | null;
  cloudAccount?: {
    accountName: string;
    provider: string;
  };
  scan?: {
    scanType: string;
    startedAt: string;
  };
}

/**
 * Paginated list response
 */
interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Security summary statistics
 */
interface SecuritySummary {
  scansLast30Days: number;
  openFindingsBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  findingsByCategory: {
    category: string;
    count: number;
  }[];
  recentScans: SecurityScanResponse[];
  trendData: {
    date: string;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  }[];
}

// ============================================================
// Security Controller Class
// ============================================================

/**
 * Controller for handling security scanning and findings endpoints
 *
 * @example
 * ```typescript
 * const controller = new SecurityController();
 * router.get('/scans', controller.listScans.bind(controller));
 * ```
 */
export class SecurityController {
  private readonly prisma: PrismaClient;
  private readonly eventBus: EventEmitter;

  constructor() {
    this.prisma = new PrismaClient();
    this.eventBus = new EventEmitter();
  }

  /**
   * GET /api/v1/security/scans
   *
   * Lists security scans with pagination, filtering, and sorting.
   * All results are scoped to the authenticated user's tenant.
   *
   * Query Parameters:
   * - page (optional): Page number (default: 1)
   * - limit (optional): Items per page (default: 20, max: 100)
   * - status (optional): Filter by status ('running' | 'completed' | 'failed')
   * - cloudAccountId (optional): Filter by cloud account UUID
   * - startDate (optional): Filter by start date (ISO 8601)
   * - endDate (optional): Filter by end date (ISO 8601)
   * - sortBy (optional): Sort field ('startedAt' | 'findingsCount')
   * - sortOrder (optional): Sort order ('asc' | 'desc')
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": "uuid",
   *       "tenantId": "uuid",
   *       "cloudAccountId": "uuid",
   *       "provider": "aws",
   *       "scanType": "full",
   *       "framework": ["CIS", "NIST"],
   *       "startedAt": "2025-12-09T10:00:00.000Z",
   *       "completedAt": "2025-12-09T10:30:00.000Z",
   *       "status": "completed",
   *       "findingsCount": 15,
   *       "criticalCount": 2,
   *       "highCount": 5,
   *       "mediumCount": 6,
   *       "lowCount": 2,
   *       "error": null,
   *       "cloudAccount": {
   *         "accountName": "Production AWS",
   *         "provider": "aws"
   *       }
   *     }
   *   ],
   *   "meta": {
   *     "page": 1,
   *     "limit": 20,
   *     "total": 50,
   *     "totalPages": 3
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  listScans = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Step 1: Validate query parameters
      const params = listScansSchema.parse(req.query);

      // Step 2: Extract tenantId from authenticated user
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or tenant ID missing',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      console.log(
        `[SecurityController] listScans - Tenant: ${tenantId}, Page: ${params.page}, Limit: ${params.limit}`
      );

      // Step 3: Build Prisma where clause with filters
      const where: any = {
        tenantId,
      };

      // Apply filters
      if (params.status) {
        where.status = params.status;
      }

      if (params.cloudAccountId) {
        where.cloudAccountId = params.cloudAccountId;
      }

      // Date range filter
      if (params.startDate || params.endDate) {
        where.startedAt = {};
        if (params.startDate) {
          where.startedAt.gte = new Date(params.startDate);
        }
        if (params.endDate) {
          where.startedAt.lte = new Date(params.endDate);
        }
      }

      // Step 4: Calculate pagination
      const skip = (params.page - 1) * params.limit;
      const take = params.limit;

      // Step 5: Build orderBy clause
      const orderBy: any = {
        [params.sortBy]: params.sortOrder,
      };

      // Step 6: Execute queries (count and data)
      const [total, scans] = await Promise.all([
        this.prisma.securityScan.count({ where }),
        this.prisma.securityScan.findMany({
          where,
          orderBy,
          skip,
          take,
          include: {
            cloudAccount: {
              select: {
                accountName: true,
                provider: true,
              },
            },
          },
        }),
      ]);

      console.log(`[SecurityController] listScans - Retrieved ${scans.length} scans, Total: ${total}`);

      // Step 7: Transform scans to response format
      const data: SecurityScanResponse[] = scans.map((scan) => ({
        id: scan.id,
        tenantId: scan.tenantId,
        cloudAccountId: scan.cloudAccountId,
        provider: scan.provider,
        scanType: scan.scanType,
        framework: scan.framework,
        startedAt: scan.startedAt.toISOString(),
        completedAt: scan.completedAt ? scan.completedAt.toISOString() : null,
        status: scan.status,
        findingsCount: scan.findingsCount,
        criticalCount: scan.criticalCount,
        highCount: scan.highCount,
        mediumCount: scan.mediumCount,
        lowCount: scan.lowCount,
        error: scan.error,
        cloudAccount: scan.cloudAccount,
      }));

      // Step 8: Calculate pagination metadata
      const totalPages = Math.ceil(total / params.limit);

      // Step 9: Return paginated response
      res.json({
        success: true,
        data,
        meta: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      this.handleError(error, res, 'listScans');
    }
  };

  /**
   * GET /api/v1/security/scans/:id
   *
   * Retrieves a single security scan by ID.
   * Enforces tenant isolation - users can only access scans belonging to their tenant.
   *
   * URL Parameters:
   * - id: Scan UUID
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "uuid",
   *     "tenantId": "uuid",
   *     "cloudAccountId": "uuid",
   *     "provider": "aws",
   *     "scanType": "full",
   *     "framework": ["CIS"],
   *     "startedAt": "2025-12-09T10:00:00.000Z",
   *     "completedAt": "2025-12-09T10:30:00.000Z",
   *     "status": "completed",
   *     "findingsCount": 15,
   *     "criticalCount": 2,
   *     "highCount": 5,
   *     "mediumCount": 6,
   *     "lowCount": 2,
   *     "error": null,
   *     "cloudAccount": {
   *       "accountName": "Production AWS",
   *       "provider": "aws"
   *     }
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  getScan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Step 1: Extract scan ID from URL params
      const scanId = req.params.id;

      if (!scanId) {
        res.status(400).json({
          success: false,
          error: 'Scan ID is required',
        });
        return;
      }

      // Step 2: Extract tenantId from authenticated user
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or tenant ID missing',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      console.log(`[SecurityController] getScan - Scan: ${scanId}, Tenant: ${tenantId}`);

      // Step 3: Fetch scan from database
      const scan = await this.prisma.securityScan.findUnique({
        where: { id: scanId },
        include: {
          cloudAccount: {
            select: {
              accountName: true,
              provider: true,
            },
          },
        },
      });

      // Step 4: Check if scan exists
      if (!scan) {
        res.status(404).json({
          success: false,
          error: 'Security scan not found',
        });
        return;
      }

      // Step 5: Enforce tenant isolation
      if (scan.tenantId !== tenantId) {
        console.warn(
          `[SecurityController] getScan - Tenant isolation violation: User ${req.user.userId} attempted to access scan ${scanId} from tenant ${scan.tenantId}`
        );
        res.status(403).json({
          success: false,
          error: 'Forbidden - Security scan does not belong to your tenant',
        });
        return;
      }

      // Step 6: Transform and return scan
      const data: SecurityScanResponse = {
        id: scan.id,
        tenantId: scan.tenantId,
        cloudAccountId: scan.cloudAccountId,
        provider: scan.provider,
        scanType: scan.scanType,
        framework: scan.framework,
        startedAt: scan.startedAt.toISOString(),
        completedAt: scan.completedAt ? scan.completedAt.toISOString() : null,
        status: scan.status,
        findingsCount: scan.findingsCount,
        criticalCount: scan.criticalCount,
        highCount: scan.highCount,
        mediumCount: scan.mediumCount,
        lowCount: scan.lowCount,
        error: scan.error,
        cloudAccount: scan.cloudAccount,
      };

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      this.handleError(error, res, 'getScan');
    }
  };

  /**
   * POST /api/v1/security/scans
   *
   * Triggers manual security scan for the authenticated user's tenant.
   * Optionally scopes scan to a specific cloud account.
   *
   * Request Body:
   * ```json
   * {
   *   "cloudAccountId": "uuid" // Optional
   * }
   * ```
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "jobId": "job-uuid",
   *     "status": "queued",
   *     "message": "Security scan triggered successfully"
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  triggerScan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Step 1: Validate request body
      const body = triggerScanSchema.parse(req.body);

      // Step 2: Extract tenantId from authenticated user
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or tenant ID missing',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      const cloudAccountId = body.cloudAccountId;

      console.log(
        `[SecurityController] triggerScan - Tenant: ${tenantId}, CloudAccount: ${cloudAccountId || 'all'}`
      );

      // Step 3: Validate cloud account belongs to tenant (if specified)
      if (cloudAccountId) {
        const cloudAccount = await this.prisma.cloudAccount.findUnique({
          where: { id: cloudAccountId },
        });

        if (!cloudAccount) {
          res.status(404).json({
            success: false,
            error: 'Cloud account not found',
          });
          return;
        }

        if (cloudAccount.tenantId !== tenantId) {
          res.status(403).json({
            success: false,
            error: 'Forbidden - Cloud account does not belong to your tenant',
          });
          return;
        }
      }

      // Step 4: Trigger security scan job (placeholder - will be implemented with BullMQ)
      // Note: This will be replaced with actual job queue implementation
      const jobId = `scan-${Date.now()}`;

      console.log(
        `[SecurityController] triggerScan - Security scan job queued (Job ID: ${jobId})`
      );

      // Step 5: Emit event for audit logging
      this.eventBus.emit('security.scan.triggered', {
        tenantId,
        cloudAccountId,
        userId: req.user.userId,
        jobId,
        triggeredAt: new Date().toISOString(),
      });

      // Step 6: Return success response
      res.json({
        success: true,
        data: {
          jobId,
          status: 'queued',
          message: 'Security scan triggered successfully',
        },
      });
    } catch (error) {
      this.handleError(error, res, 'triggerScan');
    }
  };

  /**
   * GET /api/v1/security/findings
   *
   * Lists security findings with pagination, filtering, and sorting.
   * All results are scoped to the authenticated user's tenant.
   *
   * Query Parameters:
   * - page (optional): Page number (default: 1)
   * - limit (optional): Items per page (default: 20, max: 100)
   * - severity (optional): Filter by severity ('critical' | 'high' | 'medium' | 'low')
   * - category (optional): Filter by category/framework
   * - status (optional): Filter by status ('open' | 'resolved' | 'dismissed')
   * - cloudAccountId (optional): Filter by cloud account UUID
   * - resourceType (optional): Filter by resource type
   * - scanId (optional): Filter by scan UUID
   * - sortBy (optional): Sort field ('severity' | 'detectedAt')
   * - sortOrder (optional): Sort order ('asc' | 'desc')
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": [...],
   *   "meta": {
   *     "page": 1,
   *     "limit": 20,
   *     "total": 50,
   *     "totalPages": 3
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  listFindings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Step 1: Validate query parameters
      const params = listFindingsSchema.parse(req.query);

      // Step 2: Extract tenantId from authenticated user
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or tenant ID missing',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      console.log(
        `[SecurityController] listFindings - Tenant: ${tenantId}, Page: ${params.page}, Limit: ${params.limit}`
      );

      // Step 3: Build Prisma where clause with filters
      const where: any = {
        tenantId,
      };

      // Apply filters
      if (params.severity) {
        where.severity = params.severity;
      }

      if (params.category) {
        where.framework = params.category;
      }

      if (params.status) {
        where.status = params.status;
      }

      if (params.resourceType) {
        where.resourceType = params.resourceType;
      }

      if (params.scanId) {
        where.scanId = params.scanId;
      }

      // Filter by cloudAccountId through scan relation
      if (params.cloudAccountId) {
        where.scan = {
          cloudAccountId: params.cloudAccountId,
        };
      }

      // Step 4: Calculate pagination
      const skip = (params.page - 1) * params.limit;
      const take = params.limit;

      // Step 5: Build orderBy clause
      // For severity ordering, we need custom logic
      let orderBy: any;
      if (params.sortBy === 'severity') {
        // Prisma doesn't support custom order for enum, so we'll sort in memory
        // For now, use detectedAt and handle severity sorting post-query
        orderBy = { detectedAt: params.sortOrder };
      } else {
        orderBy = {
          [params.sortBy]: params.sortOrder,
        };
      }

      // Step 6: Execute queries (count and data)
      const [total, findings] = await Promise.all([
        this.prisma.securityFinding.count({ where }),
        this.prisma.securityFinding.findMany({
          where,
          orderBy,
          skip,
          take,
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
        }),
      ]);

      console.log(`[SecurityController] listFindings - Retrieved ${findings.length} findings, Total: ${total}`);

      // Step 7: Sort by severity if requested
      let sortedFindings = findings;
      if (params.sortBy === 'severity') {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        sortedFindings = findings.sort((a, b) => {
          const orderA = severityOrder[a.severity as keyof typeof severityOrder] || 99;
          const orderB = severityOrder[b.severity as keyof typeof severityOrder] || 99;
          return params.sortOrder === 'asc' ? orderA - orderB : orderB - orderA;
        });
      }

      // Step 8: Transform findings to response format
      const data: SecurityFindingResponse[] = sortedFindings.map((finding) => ({
        id: finding.id,
        tenantId: finding.tenantId,
        scanId: finding.scanId,
        assetId: finding.assetId,
        ruleCode: finding.ruleCode,
        framework: finding.framework,
        severity: finding.severity,
        status: finding.status,
        provider: finding.provider,
        resourceType: finding.resourceType,
        title: finding.title,
        description: finding.description,
        remediation: finding.remediation,
        evidence: finding.evidence,
        detectedAt: finding.detectedAt.toISOString(),
        resolvedAt: finding.resolvedAt ? finding.resolvedAt.toISOString() : null,
        cloudAccount: finding.scan.cloudAccount,
        scan: {
          scanType: finding.scan.scanType,
          startedAt: finding.scan.startedAt.toISOString(),
        },
      }));

      // Step 9: Calculate pagination metadata
      const totalPages = Math.ceil(total / params.limit);

      // Step 10: Return paginated response
      res.json({
        success: true,
        data,
        meta: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      this.handleError(error, res, 'listFindings');
    }
  };

  /**
   * GET /api/v1/security/findings/:id
   *
   * Retrieves a single security finding by ID.
   * Enforces tenant isolation - users can only access findings belonging to their tenant.
   *
   * URL Parameters:
   * - id: Finding UUID
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "uuid",
   *     "tenantId": "uuid",
   *     "scanId": "uuid",
   *     "assetId": "uuid",
   *     "ruleCode": "CIS-1.1",
   *     "framework": "CIS",
   *     "severity": "high",
   *     "status": "open",
   *     "provider": "aws",
   *     "resourceType": "s3_bucket",
   *     "title": "S3 bucket is publicly accessible",
   *     "description": "...",
   *     "remediation": "...",
   *     "evidence": {...},
   *     "detectedAt": "2025-12-09T10:00:00.000Z",
   *     "resolvedAt": null
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  getFinding = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Step 1: Extract finding ID from URL params
      const findingId = req.params.id;

      if (!findingId) {
        res.status(400).json({
          success: false,
          error: 'Finding ID is required',
        });
        return;
      }

      // Step 2: Extract tenantId from authenticated user
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or tenant ID missing',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      console.log(`[SecurityController] getFinding - Finding: ${findingId}, Tenant: ${tenantId}`);

      // Step 3: Fetch finding from database
      const finding = await this.prisma.securityFinding.findUnique({
        where: { id: findingId },
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

      // Step 4: Check if finding exists
      if (!finding) {
        res.status(404).json({
          success: false,
          error: 'Security finding not found',
        });
        return;
      }

      // Step 5: Enforce tenant isolation
      if (finding.tenantId !== tenantId) {
        console.warn(
          `[SecurityController] getFinding - Tenant isolation violation: User ${req.user.userId} attempted to access finding ${findingId} from tenant ${finding.tenantId}`
        );
        res.status(403).json({
          success: false,
          error: 'Forbidden - Security finding does not belong to your tenant',
        });
        return;
      }

      // Step 6: Transform and return finding
      const data: SecurityFindingResponse = {
        id: finding.id,
        tenantId: finding.tenantId,
        scanId: finding.scanId,
        assetId: finding.assetId,
        ruleCode: finding.ruleCode,
        framework: finding.framework,
        severity: finding.severity,
        status: finding.status,
        provider: finding.provider,
        resourceType: finding.resourceType,
        title: finding.title,
        description: finding.description,
        remediation: finding.remediation,
        evidence: finding.evidence,
        detectedAt: finding.detectedAt.toISOString(),
        resolvedAt: finding.resolvedAt ? finding.resolvedAt.toISOString() : null,
        cloudAccount: finding.scan.cloudAccount,
        scan: {
          scanType: finding.scan.scanType,
          startedAt: finding.scan.startedAt.toISOString(),
        },
      };

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      this.handleError(error, res, 'getFinding');
    }
  };

  /**
   * PATCH /api/v1/security/findings/:id/resolve
   *
   * Marks a security finding as resolved.
   * Updates status to 'resolved', sets resolvedAt timestamp, and stores optional notes.
   *
   * Request Body:
   * ```json
   * {
   *   "notes": "Fixed by updating bucket policy" // Optional
   * }
   * ```
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "uuid",
   *     "status": "resolved",
   *     "resolvedAt": "2025-12-09T10:00:00.000Z"
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  resolveFinding = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Step 1: Validate request body
      const body = resolveFindingSchema.parse(req.body);

      // Step 2: Extract finding ID from URL params
      const findingId = req.params.id;

      if (!findingId) {
        res.status(400).json({
          success: false,
          error: 'Finding ID is required',
        });
        return;
      }

      // Step 3: Extract tenantId from authenticated user
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or tenant ID missing',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      console.log(`[SecurityController] resolveFinding - Finding: ${findingId}, Tenant: ${tenantId}`);

      // Step 4: Fetch finding from database
      const finding = await this.prisma.securityFinding.findUnique({
        where: { id: findingId },
      });

      // Step 5: Check if finding exists
      if (!finding) {
        res.status(404).json({
          success: false,
          error: 'Security finding not found',
        });
        return;
      }

      // Step 6: Enforce tenant isolation
      if (finding.tenantId !== tenantId) {
        console.warn(
          `[SecurityController] resolveFinding - Tenant isolation violation: User ${req.user.userId} attempted to resolve finding ${findingId} from tenant ${finding.tenantId}`
        );
        res.status(403).json({
          success: false,
          error: 'Forbidden - Security finding does not belong to your tenant',
        });
        return;
      }

      // Step 7: Check if finding is already resolved
      if (finding.status === 'resolved') {
        res.status(400).json({
          success: false,
          error: 'Security finding is already resolved',
        });
        return;
      }

      // Step 8: Update finding status
      const updatedFinding = await this.prisma.securityFinding.update({
        where: { id: findingId },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
        },
      });

      // Step 9: Emit event for audit logging
      this.eventBus.emit('security.finding.resolved', {
        tenantId,
        findingId,
        userId: req.user.userId,
        notes: body.notes,
        resolvedAt: updatedFinding.resolvedAt?.toISOString(),
      });

      console.log(`[SecurityController] resolveFinding - Finding ${findingId} resolved successfully`);

      // Step 10: Return success response
      res.json({
        success: true,
        data: {
          id: updatedFinding.id,
          status: updatedFinding.status,
          resolvedAt: updatedFinding.resolvedAt ? updatedFinding.resolvedAt.toISOString() : null,
        },
      });
    } catch (error) {
      this.handleError(error, res, 'resolveFinding');
    }
  };

  /**
   * PATCH /api/v1/security/findings/:id/dismiss
   *
   * Marks a security finding as dismissed.
   * Updates status to 'dismissed' and stores reason.
   *
   * Request Body:
   * ```json
   * {
   *   "reason": "Accepted risk - legacy system" // Required
   * }
   * ```
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "uuid",
   *     "status": "dismissed"
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  dismissFinding = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Step 1: Validate request body
      const body = dismissFindingSchema.parse(req.body);

      // Step 2: Extract finding ID from URL params
      const findingId = req.params.id;

      if (!findingId) {
        res.status(400).json({
          success: false,
          error: 'Finding ID is required',
        });
        return;
      }

      // Step 3: Extract tenantId from authenticated user
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or tenant ID missing',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      console.log(`[SecurityController] dismissFinding - Finding: ${findingId}, Tenant: ${tenantId}`);

      // Step 4: Fetch finding from database
      const finding = await this.prisma.securityFinding.findUnique({
        where: { id: findingId },
      });

      // Step 5: Check if finding exists
      if (!finding) {
        res.status(404).json({
          success: false,
          error: 'Security finding not found',
        });
        return;
      }

      // Step 6: Enforce tenant isolation
      if (finding.tenantId !== tenantId) {
        console.warn(
          `[SecurityController] dismissFinding - Tenant isolation violation: User ${req.user.userId} attempted to dismiss finding ${findingId} from tenant ${finding.tenantId}`
        );
        res.status(403).json({
          success: false,
          error: 'Forbidden - Security finding does not belong to your tenant',
        });
        return;
      }

      // Step 7: Update finding status
      const updatedFinding = await this.prisma.securityFinding.update({
        where: { id: findingId },
        data: {
          status: 'dismissed',
        },
      });

      // Step 8: Emit event for audit logging
      this.eventBus.emit('security.finding.dismissed', {
        tenantId,
        findingId,
        userId: req.user.userId,
        reason: body.reason,
        dismissedAt: new Date().toISOString(),
      });

      console.log(`[SecurityController] dismissFinding - Finding ${findingId} dismissed successfully`);

      // Step 9: Return success response
      res.json({
        success: true,
        data: {
          id: updatedFinding.id,
          status: updatedFinding.status,
        },
      });
    } catch (error) {
      this.handleError(error, res, 'dismissFinding');
    }
  };

  /**
   * GET /api/v1/security/summary
   *
   * Retrieves security summary statistics for the authenticated user's tenant.
   * Includes scans count, findings by severity, recent scans, and trend data.
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "scansLast30Days": 15,
   *     "openFindingsBySeverity": {
   *       "critical": 5,
   *       "high": 12,
   *       "medium": 25,
   *       "low": 8
   *     },
   *     "findingsByCategory": [
   *       { "category": "CIS", "count": 30 },
   *       { "category": "NIST", "count": 20 }
   *     ],
   *     "recentScans": [...],
   *     "trendData": [...]
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  getSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Step 1: Extract tenantId from authenticated user
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated or tenant ID missing',
        });
        return;
      }

      const tenantId = req.user.tenantId;
      console.log(`[SecurityController] getSummary - Tenant: ${tenantId}`);

      // Step 2: Calculate date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Step 3: Execute parallel queries for summary data
      const [
        scansLast30Days,
        openFindingsBySeverity,
        findingsByCategory,
        recentScans,
      ] = await Promise.all([
        // Count scans in last 30 days
        this.prisma.securityScan.count({
          where: {
            tenantId,
            startedAt: { gte: thirtyDaysAgo },
          },
        }),

        // Count open findings by severity
        this.prisma.securityFinding.groupBy({
          by: ['severity'],
          where: {
            tenantId,
            status: 'open',
          },
          _count: true,
        }),

        // Count findings by category (framework)
        this.prisma.securityFinding.groupBy({
          by: ['framework'],
          where: {
            tenantId,
            status: 'open',
          },
          _count: true,
        }),

        // Get recent scans (last 5)
        this.prisma.securityScan.findMany({
          where: { tenantId },
          orderBy: { startedAt: 'desc' },
          take: 5,
          include: {
            cloudAccount: {
              select: {
                accountName: true,
                provider: true,
              },
            },
          },
        }),
      ]);

      // Step 4: Transform open findings by severity
      const severityCounts = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      openFindingsBySeverity.forEach((item) => {
        const severity = item.severity as keyof typeof severityCounts;
        if (severity in severityCounts) {
          severityCounts[severity] = item._count;
        }
      });

      // Step 5: Transform findings by category
      const categoryData = findingsByCategory.map((item) => ({
        category: item.framework,
        count: item._count,
      }));

      // Step 6: Transform recent scans
      const recentScansData: SecurityScanResponse[] = recentScans.map((scan) => ({
        id: scan.id,
        tenantId: scan.tenantId,
        cloudAccountId: scan.cloudAccountId,
        provider: scan.provider,
        scanType: scan.scanType,
        framework: scan.framework,
        startedAt: scan.startedAt.toISOString(),
        completedAt: scan.completedAt ? scan.completedAt.toISOString() : null,
        status: scan.status,
        findingsCount: scan.findingsCount,
        criticalCount: scan.criticalCount,
        highCount: scan.highCount,
        mediumCount: scan.mediumCount,
        lowCount: scan.lowCount,
        error: scan.error,
        cloudAccount: scan.cloudAccount,
      }));

      // Step 7: Get trend data (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const trendScans = await this.prisma.securityScan.findMany({
        where: {
          tenantId,
          startedAt: { gte: sevenDaysAgo },
          status: 'completed',
        },
        orderBy: { startedAt: 'asc' },
        select: {
          startedAt: true,
          criticalCount: true,
          highCount: true,
          mediumCount: true,
          lowCount: true,
        },
      });

      const trendData = trendScans.map((scan) => ({
        date: scan.startedAt.toISOString().split('T')[0],
        criticalCount: scan.criticalCount,
        highCount: scan.highCount,
        mediumCount: scan.mediumCount,
        lowCount: scan.lowCount,
      }));

      // Step 8: Build summary response
      const summary: SecuritySummary = {
        scansLast30Days,
        openFindingsBySeverity: severityCounts,
        findingsByCategory: categoryData,
        recentScans: recentScansData,
        trendData,
      };

      console.log(
        `[SecurityController] getSummary - Scans: ${scansLast30Days}, Open findings: ${Object.values(severityCounts).reduce((a, b) => a + b, 0)}`
      );

      // Step 9: Return summary response
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      this.handleError(error, res, 'getSummary');
    }
  };

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Centralized error handling for consistent error responses
   *
   * Handles different error types:
   * - Zod validation errors (400)
   * - Generic errors (500)
   *
   * @param error - Error object
   * @param res - Express response object
   * @param method - Method name for logging
   * @private
   */
  private handleError(error: any, res: Response, method: string): void {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      console.error(`[SecurityController] ${method} - Validation error:`, error.errors);
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    // Log internal server errors
    console.error(`[SecurityController] ${method} - Internal error:`, error);

    // Return generic error response
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred',
    });
  }
}

// ============================================================
// Export Controller Instance
// ============================================================

/**
 * Singleton instance of SecurityController
 * Used for binding to Express routes
 */
export const securityController = new SecurityController();
