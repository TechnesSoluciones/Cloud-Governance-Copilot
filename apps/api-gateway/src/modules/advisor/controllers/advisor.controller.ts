/**
 * Azure Advisor Controller
 *
 * This controller handles all HTTP endpoints for Azure Advisor recommendations.
 * It provides REST API access to fetch, filter, suppress, and manage recommendations.
 *
 * Endpoints:
 * - GET /api/v1/advisor/recommendations - List recommendations with filters
 * - GET /api/v1/advisor/recommendations/:id - Get single recommendation details
 * - POST /api/v1/advisor/recommendations/:id/suppress - Suppress a recommendation
 * - GET /api/v1/advisor/summary - Get recommendations summary/statistics
 *
 * Architecture:
 * - Input Validation: Uses Zod schemas for request validation
 * - Authorization: Tenant isolation enforced via JWT authentication
 * - Error Handling: Consistent error responses with proper HTTP status codes
 * - Caching: Redis caching with 24h TTL
 * - Rate Limiting: 10 req/min per tenant
 *
 * @module modules/advisor/controllers
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';
import { AdvisorEnhancedService } from '../services/advisor-enhanced.service';
import { logger } from '../../../utils/logger';
import type {
  RecommendationCategory,
  RecommendationImpact,
  RecommendationStatus,
} from '../dto';

// ============================================================
// Type Extensions
// ============================================================

/**
 * Extended Express Request type with authenticated user
 */
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
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
 * Schema for GET /api/v1/advisor/recommendations query parameters
 */
const listRecommendationsSchema = z.object({
  category: z
    .enum(['Cost', 'Security', 'Reliability', 'Performance', 'OperationalExcellence'])
    .optional(),
  impact: z.array(z.enum(['High', 'Medium', 'Low'])).optional(),
  status: z.enum(['Active', 'Suppressed', 'Dismissed', 'Resolved']).optional(),
  resourceType: z.string().optional(),
  resourceGroup: z.string().optional(),
  region: z.string().optional(),
  minSavings: z.coerce.number().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['impact', 'savings', 'lastUpdated']).default('lastUpdated'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Schema for GET /api/v1/advisor/recommendations/:id
 */
const getRecommendationSchema = z.object({
  id: z.string().min(1, 'Recommendation ID is required'),
});

/**
 * Schema for POST /api/v1/advisor/recommendations/:id/suppress
 */
const suppressRecommendationSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Recommendation ID is required'),
  }),
  body: z.object({
    durationDays: z
      .number()
      .int()
      .min(1)
      .max(365)
      .refine((val) => [7, 30, 90, 180, 365].includes(val), {
        message: 'Duration must be one of: 7, 30, 90, 180, or 365 days',
      }),
    reason: z.string().max(500, 'Reason must be 500 characters or less').optional(),
    notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
  }),
});

/**
 * Schema for GET /api/v1/advisor/summary query parameters
 */
const summarySchema = z.object({
  cloudAccountId: z.string().uuid('Invalid cloud account ID format').optional(),
});

// ============================================================
// Advisor Controller Class
// ============================================================

/**
 * Controller for handling Azure Advisor endpoints
 *
 * @example
 * ```typescript
 * const prisma = new PrismaClient();
 * const controller = new AdvisorController(prisma);
 * router.get('/recommendations', controller.getRecommendations.bind(controller));
 * ```
 */
export class AdvisorController {
  constructor(private prisma: PrismaClient) {}

  /**
   * GET /api/v1/advisor/recommendations
   *
   * Lists Azure Advisor recommendations with filtering, sorting, and pagination.
   *
   * Query Parameters:
   * - category: 'Cost' | 'Security' | 'Reliability' | 'Performance' | 'OperationalExcellence' (optional)
   * - impact: Array of 'High' | 'Medium' | 'Low' (optional)
   * - status: 'Active' | 'Suppressed' | 'Dismissed' | 'Resolved' (optional)
   * - resourceType: String (optional)
   * - resourceGroup: String (optional)
   * - region: String (optional)
   * - minSavings: Number (optional)
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 20, max: 100)
   * - sortBy: 'impact' | 'savings' | 'lastUpdated' (default: 'lastUpdated')
   * - sortOrder: 'asc' | 'desc' (default: 'desc')
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "recommendations": [...],
   *     "pagination": {
   *       "page": 1,
   *       "limit": 20,
   *       "total": 42,
   *       "totalPages": 3
   *     },
   *     "summary": {
   *       "totalSavings": 15000,
   *       "byCategory": {...},
   *       "byImpact": {...}
   *     }
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async getRecommendations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Step 1: Validate query parameters
      const query = listRecommendationsSchema.parse(req.query);

      // Step 2: Extract tenantId from authenticated user
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated or tenant ID missing',
            statusCode: 401,
          },
        });
        return;
      }

      const tenantId = req.user.tenantId;

      logger.info('[AdvisorController] getRecommendations - Fetching recommendations', {
        tenantId,
        filters: query,
      });

      // Step 3: Get cloud account credentials
      const cloudAccount = await this.getActiveAzureAccount(tenantId);
      if (!cloudAccount) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NO_AZURE_ACCOUNT',
            message: 'No active Azure account found for this tenant',
            statusCode: 404,
          },
        });
        return;
      }

      // Step 4: Initialize service and fetch recommendations
      const advisorService = await this.createAdvisorService(tenantId, cloudAccount);
      const result = await advisorService.getRecommendations({
        category: query.category as RecommendationCategory | undefined,
        impact: query.impact as RecommendationImpact[] | undefined,
        status: query.status as RecommendationStatus | undefined,
        resourceType: query.resourceType,
        resourceGroup: query.resourceGroup,
        region: query.region,
        minSavings: query.minSavings,
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });

      logger.info('[AdvisorController] getRecommendations - Successfully fetched', {
        tenantId,
        count: result.data.length,
        total: result.pagination.total,
      });

      // Step 5: Return success response
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(error, res, 'getRecommendations');
    }
  }

  /**
   * GET /api/v1/advisor/recommendations/:id
   *
   * Gets a single Azure Advisor recommendation by ID.
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "...",
   *     "category": "Cost",
   *     "impact": "High",
   *     "shortDescription": "...",
   *     "longDescription": "...",
   *     "resourceId": "...",
   *     "potentialSavings": {...},
   *     "remediationSteps": [...],
   *     "status": "Active",
   *     "lastUpdated": "2025-12-16T..."
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async getRecommendationById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Step 1: Validate params
      const params = getRecommendationSchema.parse(req.params);

      // Step 2: Extract tenantId
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated or tenant ID missing',
            statusCode: 401,
          },
        });
        return;
      }

      const tenantId = req.user.tenantId;

      logger.info('[AdvisorController] getRecommendationById - Fetching recommendation', {
        tenantId,
        recommendationId: params.id,
      });

      // Step 3: Get cloud account credentials
      const cloudAccount = await this.getActiveAzureAccount(tenantId);
      if (!cloudAccount) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NO_AZURE_ACCOUNT',
            message: 'No active Azure account found for this tenant',
            statusCode: 404,
          },
        });
        return;
      }

      // Step 4: Initialize service and fetch recommendation
      const advisorService = await this.createAdvisorService(tenantId, cloudAccount);
      const recommendation = await advisorService.getRecommendationById(params.id);

      if (!recommendation) {
        res.status(404).json({
          success: false,
          error: {
            code: 'RECOMMENDATION_NOT_FOUND',
            message: 'Recommendation not found',
            statusCode: 404,
          },
        });
        return;
      }

      logger.info('[AdvisorController] getRecommendationById - Successfully fetched', {
        tenantId,
        recommendationId: params.id,
      });

      // Step 5: Return success response
      res.json({
        success: true,
        data: recommendation,
      });
    } catch (error) {
      this.handleError(error, res, 'getRecommendationById');
    }
  }

  /**
   * POST /api/v1/advisor/recommendations/:id/suppress
   *
   * Suppresses a recommendation for a specified duration.
   *
   * Request Body:
   * ```json
   * {
   *   "durationDays": 30,
   *   "reason": "Already aware of this issue",
   *   "notes": "Will address in Q2"
   * }
   * ```
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "recommendationId": "...",
   *     "suppressedUntil": "2025-01-15T...",
   *     "message": "Recommendation suppressed successfully"
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async suppressRecommendation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Step 1: Validate params and body
      const validated = suppressRecommendationSchema.parse({
        params: req.params,
        body: req.body,
      });

      // Step 2: Extract tenantId and userId
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated or tenant ID missing',
            statusCode: 401,
          },
        });
        return;
      }

      const tenantId = req.user.tenantId;
      const userId = req.user.id || req.user.userId;

      logger.info('[AdvisorController] suppressRecommendation - Suppressing recommendation', {
        tenantId,
        userId,
        recommendationId: validated.params.id,
        durationDays: validated.body.durationDays,
      });

      // Step 3: Get cloud account credentials
      const cloudAccount = await this.getActiveAzureAccount(tenantId);
      if (!cloudAccount) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NO_AZURE_ACCOUNT',
            message: 'No active Azure account found for this tenant',
            statusCode: 404,
          },
        });
        return;
      }

      // Step 4: Initialize service and suppress recommendation
      const advisorService = await this.createAdvisorService(tenantId, cloudAccount);

      const notes = [validated.body.reason, validated.body.notes].filter(Boolean).join(' - ');

      const success = await advisorService.suppressRecommendation(
        validated.params.id,
        validated.body.durationDays,
        userId,
        notes
      );

      if (!success) {
        res.status(404).json({
          success: false,
          error: {
            code: 'RECOMMENDATION_NOT_FOUND',
            message: 'Recommendation not found or already suppressed',
            statusCode: 404,
          },
        });
        return;
      }

      const suppressedUntil = new Date();
      suppressedUntil.setDate(suppressedUntil.getDate() + validated.body.durationDays);

      logger.info('[AdvisorController] suppressRecommendation - Successfully suppressed', {
        tenantId,
        recommendationId: validated.params.id,
        suppressedUntil,
      });

      // Step 5: Return success response
      res.json({
        success: true,
        data: {
          recommendationId: validated.params.id,
          suppressedUntil,
          message: `Recommendation suppressed for ${validated.body.durationDays} days`,
        },
      });
    } catch (error) {
      this.handleError(error, res, 'suppressRecommendation');
    }
  }

  /**
   * GET /api/v1/advisor/summary
   *
   * Gets summary statistics for Azure Advisor recommendations.
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "totalRecommendations": 42,
   *     "byCategory": {
   *       "cost": 15,
   *       "security": 10,
   *       "reliability": 8,
   *       "performance": 5,
   *       "operationalExcellence": 4
   *     },
   *     "byImpact": {
   *       "high": 12,
   *       "medium": 20,
   *       "low": 10
   *     },
   *     "byStatus": {
   *       "active": 35,
   *       "suppressed": 5,
   *       "dismissed": 2,
   *       "resolved": 0
   *     },
   *     "totalPotentialSavings": 15000,
   *     "currency": "USD",
   *     "lastUpdated": "2025-12-16T..."
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Step 1: Validate query parameters
      const query = summarySchema.parse(req.query);

      // Step 2: Extract tenantId
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated or tenant ID missing',
            statusCode: 401,
          },
        });
        return;
      }

      const tenantId = req.user.tenantId;

      logger.info('[AdvisorController] getSummary - Fetching summary', {
        tenantId,
        cloudAccountId: query.cloudAccountId,
      });

      // Step 3: Get cloud account credentials
      const cloudAccount = await this.getActiveAzureAccount(tenantId, query.cloudAccountId);
      if (!cloudAccount) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NO_AZURE_ACCOUNT',
            message: 'No active Azure account found for this tenant',
            statusCode: 404,
          },
        });
        return;
      }

      // Step 4: Initialize service and fetch summary
      const advisorService = await this.createAdvisorService(tenantId, cloudAccount);
      const summary = await advisorService.getRecommendationSummary();

      logger.info('[AdvisorController] getSummary - Successfully fetched', {
        tenantId,
        totalRecommendations: summary.totalRecommendations,
        totalSavings: summary.totalPotentialSavings,
      });

      // Step 5: Return success response
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      this.handleError(error, res, 'getSummary');
    }
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Gets an active Azure cloud account for the tenant
   *
   * @private
   */
  private async getActiveAzureAccount(
    tenantId: string,
    cloudAccountId?: string
  ): Promise<any | null> {
    try {
      const where: any = {
        tenantId,
        provider: 'azure',
        status: 'active',
      };

      if (cloudAccountId) {
        where.id = cloudAccountId;
      }

      const account = await this.prisma.cloudAccount.findFirst({
        where,
        orderBy: {
          createdAt: 'desc',
        },
      });

      return account;
    } catch (error) {
      logger.error('[AdvisorController] Failed to get Azure account', {
        tenantId,
        cloudAccountId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Creates an AdvisorEnhancedService instance with decrypted credentials
   *
   * @private
   */
  private async createAdvisorService(
    tenantId: string,
    cloudAccount: any
  ): Promise<AdvisorEnhancedService> {
    // Note: In production, credentials should be decrypted from the database
    // For now, we'll use environment variables
    const azureCredentials = {
      clientId: process.env.AZURE_CLIENT_ID || '',
      clientSecret: process.env.AZURE_CLIENT_SECRET || '',
      tenantId: process.env.AZURE_TENANT_ID || '',
      subscriptionId: cloudAccount.accountIdentifier || process.env.AZURE_SUBSCRIPTION_ID || '',
    };

    return new AdvisorEnhancedService(
      {
        tenantId,
        cloudAccountId: cloudAccount.id,
        azureCredentials,
      },
      this.prisma
    );
  }

  /**
   * Handles errors consistently
   *
   * @private
   */
  private handleError(error: any, res: Response, operation: string): void {
    logger.error(`[AdvisorController] ${operation} - Error`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Zod validation errors
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
          details: error.errors,
          statusCode: 400,
        },
      });
      return;
    }

    // Azure throttling errors
    if (error.message?.includes('429') || error.message?.includes('throttl')) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Azure API rate limit exceeded. Please try again later.',
          statusCode: 429,
        },
      });
      return;
    }

    // Azure authentication errors
    if (error.message?.includes('401') || error.message?.includes('authentication')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AZURE_AUTH_ERROR',
          message: 'Failed to authenticate with Azure. Please check your credentials.',
          statusCode: 401,
        },
      });
      return;
    }

    // Generic server error
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An internal server error occurred',
        statusCode: 500,
      },
    });
  }
}
