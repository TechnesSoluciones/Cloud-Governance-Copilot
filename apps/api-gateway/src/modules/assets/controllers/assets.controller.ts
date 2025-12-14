/**
 * Assets Controller
 *
 * REST API controller for cloud asset management and discovery.
 * Provides endpoints for listing, retrieving, and discovering cloud resources.
 *
 * Endpoints:
 * - GET /api/v1/assets - List assets with pagination, filtering, and sorting
 * - GET /api/v1/assets/:id - Get single asset details
 * - POST /api/v1/assets/discover - Trigger manual asset discovery
 *
 * Features:
 * - Pagination: Default 20, max 100 items per page
 * - Filters: provider, resourceType, region, tags, status
 * - Sorting: createdAt, resourceType (asc/desc)
 * - Tenant isolation: All queries scoped to authenticated user's tenant
 * - Input validation: Zod schemas for request validation
 * - Error handling: Consistent error responses with proper HTTP status codes
 *
 * @module Assets/Controllers
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AssetDiscoveryService } from '../services/asset-discovery.service';
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
 * Schema for GET /api/v1/assets query parameters
 */
const listAssetsSchema = z.object({
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
  provider: z.enum(['AWS', 'AZURE']).optional(),
  resourceType: z.string().min(1).optional(),
  region: z.string().min(1).optional(),
  status: z.enum(['active', 'terminated']).optional(),
  tags: z.string().optional(), // Format: "key:value"

  // Sorting
  sortBy: z.enum(['createdAt', 'resourceType']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Schema for POST /api/v1/assets/discover request body
 */
const discoverAssetsSchema = z.object({
  cloudAccountId: z.string().uuid('Invalid uuid').optional(),
});

// ============================================================
// Helper Types
// ============================================================

/**
 * Asset response format
 */
interface AssetResponse {
  id: string;
  tenantId: string;
  cloudAccountId: string;
  provider: string;
  resourceType: string;
  resourceId: string;
  name: string | null;
  region: string;
  zone: string | null;
  status: string;
  tags: any;
  metadata: any;
  lastSeenAt: string;
}

/**
 * Paginated list response
 */
interface PaginatedResponse {
  success: boolean;
  data: AssetResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================
// Assets Controller Class
// ============================================================

/**
 * Controller for handling asset management endpoints
 *
 * @example
 * ```typescript
 * const controller = new AssetsController();
 * router.get('/assets', controller.list.bind(controller));
 * ```
 */
export class AssetsController {
  private readonly prisma: PrismaClient;
  private readonly assetDiscoveryService: AssetDiscoveryService;

  constructor() {
    this.prisma = new PrismaClient();
    const eventBus = new EventEmitter();
    this.assetDiscoveryService = new AssetDiscoveryService(this.prisma, eventBus);
  }

  /**
   * GET /api/v1/assets
   *
   * Lists cloud assets with pagination, filtering, and sorting.
   * All results are scoped to the authenticated user's tenant.
   *
   * Query Parameters:
   * - page (optional): Page number (default: 1)
   * - limit (optional): Items per page (default: 20, max: 100)
   * - provider (optional): Filter by cloud provider ('AWS' | 'AZURE')
   * - resourceType (optional): Filter by resource type
   * - region (optional): Filter by region
   * - status (optional): Filter by status ('active' | 'terminated')
   * - tags (optional): Filter by tags (format: "key:value")
   * - sortBy (optional): Sort field ('createdAt' | 'resourceType')
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
   *       "resourceType": "ec2_instance",
   *       "resourceId": "i-1234567890abcdef0",
   *       "name": "web-server-01",
   *       "region": "us-east-1",
   *       "zone": "us-east-1a",
   *       "status": "active",
   *       "tags": {...},
   *       "metadata": {...},
   *       "lastSeenAt": "2025-12-09T10:00:00.000Z"
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
  list = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Step 1: Validate query parameters
      const params = listAssetsSchema.parse(req.query);

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
        `[AssetsController] list - Tenant: ${tenantId}, Page: ${params.page}, Limit: ${params.limit}`
      );

      // Step 3: Build Prisma where clause with filters
      const where: any = {
        tenantId,
        deletedAt: null, // Exclude soft-deleted assets
      };

      // Apply filters
      if (params.provider) {
        where.provider = params.provider.toLowerCase();
      }

      if (params.resourceType) {
        where.resourceType = params.resourceType;
      }

      if (params.region) {
        where.region = params.region;
      }

      if (params.status) {
        where.status = params.status;
      }

      // Tags filter using JSON path query
      if (params.tags) {
        const [key, value] = params.tags.split(':');
        if (key && value) {
          where.tags = {
            path: [key],
            equals: value,
          };
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
      const [total, assets] = await Promise.all([
        this.prisma.asset.count({ where }),
        this.prisma.asset.findMany({
          where,
          orderBy,
          skip,
          take,
        }),
      ]);

      console.log(`[AssetsController] list - Retrieved ${assets.length} assets, Total: ${total}`);

      // Step 7: Transform assets to response format
      const data: AssetResponse[] = assets.map((asset) => ({
        id: asset.id,
        tenantId: asset.tenantId,
        cloudAccountId: asset.cloudAccountId,
        provider: asset.provider,
        resourceType: asset.resourceType,
        resourceId: asset.resourceId,
        name: asset.name,
        region: asset.region,
        zone: asset.zone,
        status: asset.status,
        tags: asset.tags,
        metadata: asset.metadata,
        lastSeenAt: asset.lastSeenAt.toISOString(),
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
      this.handleError(error, res, 'list');
    }
  };

  /**
   * GET /api/v1/assets/:id
   *
   * Retrieves a single cloud asset by ID.
   * Enforces tenant isolation - users can only access assets belonging to their tenant.
   *
   * URL Parameters:
   * - id: Asset UUID
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
   *     "resourceType": "ec2_instance",
   *     "resourceId": "i-1234567890abcdef0",
   *     "name": "web-server-01",
   *     "region": "us-east-1",
   *     "zone": "us-east-1a",
   *     "status": "active",
   *     "tags": {...},
   *     "metadata": {...},
   *     "lastSeenAt": "2025-12-09T10:00:00.000Z"
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  get = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Step 1: Extract asset ID from URL params
      const assetId = req.params.id;

      if (!assetId) {
        res.status(400).json({
          success: false,
          error: 'Asset ID is required',
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
      console.log(`[AssetsController] get - Asset: ${assetId}, Tenant: ${tenantId}`);

      // Step 3: Fetch asset from database
      const asset = await this.prisma.asset.findUnique({
        where: { id: assetId },
      });

      // Step 4: Check if asset exists
      if (!asset) {
        res.status(404).json({
          success: false,
          error: 'Asset not found',
        });
        return;
      }

      // Step 5: Enforce tenant isolation
      if (asset.tenantId !== tenantId) {
        console.warn(
          `[AssetsController] get - Tenant isolation violation: User ${req.user.userId} attempted to access asset ${assetId} from tenant ${asset.tenantId}`
        );
        res.status(403).json({
          success: false,
          error: 'Forbidden - Asset does not belong to your tenant',
        });
        return;
      }

      // Step 6: Transform and return asset
      const data: AssetResponse = {
        id: asset.id,
        tenantId: asset.tenantId,
        cloudAccountId: asset.cloudAccountId,
        provider: asset.provider,
        resourceType: asset.resourceType,
        resourceId: asset.resourceId,
        name: asset.name,
        region: asset.region,
        zone: asset.zone,
        status: asset.status,
        tags: asset.tags,
        metadata: asset.metadata,
        lastSeenAt: asset.lastSeenAt.toISOString(),
      };

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      this.handleError(error, res, 'get');
    }
  };

  /**
   * POST /api/v1/assets/discover
   *
   * Triggers manual asset discovery for the authenticated user's tenant.
   * Optionally scopes discovery to a specific cloud account.
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
   *     "assetsDiscovered": 25,
   *     "accountsProcessed": 2,
   *     "errors": [
   *       {
   *         "accountId": "uuid",
   *         "provider": "azure",
   *         "error": "Invalid credentials"
   *       }
   *     ]
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  discover = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Step 1: Validate request body
      const body = discoverAssetsSchema.parse(req.body);

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
        `[AssetsController] discover - Tenant: ${tenantId}, CloudAccount: ${cloudAccountId || 'all'}`
      );

      // Step 3: Trigger asset discovery
      const result = await this.assetDiscoveryService.discoverAssets(tenantId, cloudAccountId);

      console.log(
        `[AssetsController] discover - Completed. Assets: ${result.assetsDiscovered}, Accounts: ${result.accountsProcessed}, Errors: ${result.errors.length}`
      );

      // Step 4: Return discovery result
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, 'discover');
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
      console.error(`[AssetsController] ${method} - Validation error:`, error.errors);
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
    console.error(`[AssetsController] ${method} - Internal error:`, error);

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
 * Singleton instance of AssetsController
 * Used for binding to Express routes
 */
export const assetsController = new AssetsController();
