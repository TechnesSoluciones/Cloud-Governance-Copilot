/**
 * FinOps Recommendations Controller
 *
 * This controller handles all HTTP endpoints for cost optimization recommendations.
 * It provides REST API access to generate, query, apply, and dismiss recommendations.
 *
 * Endpoints:
 * - POST /api/v1/finops/recommendations/generate - Generate new recommendations
 * - GET /api/v1/finops/recommendations - List recommendations with filters
 * - GET /api/v1/finops/recommendations/summary - Get recommendations summary/statistics
 * - GET /api/v1/finops/recommendations/:id - Get single recommendation details
 * - POST /api/v1/finops/recommendations/:id/apply - Apply a recommendation
 * - POST /api/v1/finops/recommendations/:id/dismiss - Dismiss a recommendation
 *
 * Architecture:
 * - Input Validation: Uses Zod schemas for request validation
 * - Authorization: Tenant isolation enforced via JWT authentication
 * - Error Handling: Consistent error responses with proper HTTP status codes
 * - Event Emissions: Emits events for state changes (applied/dismissed)
 * - Pagination: Built-in pagination with configurable limits
 *
 * @module FinOps/Controllers
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { EventEmitter } from 'events';
import { z } from 'zod';
import { RecommendationGeneratorService } from '../services/recommendation-generator.service';
import { logger } from '../../../utils/logger';

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
 * Schema for POST /api/v1/finops/recommendations/generate
 */
const generateRecommendationsSchema = z.object({
  cloudAccountId: z.string().uuid('Invalid cloud account ID format').optional(),
});

/**
 * Schema for GET /api/v1/finops/recommendations query parameters
 */
const listRecommendationsSchema = z.object({
  status: z.enum(['open', 'applied', 'dismissed']).optional(),
  type: z.enum(['idle_resource', 'rightsize', 'reserved_instance', 'unused_resource', 'delete_snapshot']).optional(),
  provider: z.enum(['AWS', 'AZURE']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'estimatedSavings', 'priority', 'provider']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Schema for GET /api/v1/finops/recommendations/summary query parameters
 */
const summarySchema = z.object({
  status: z.enum(['open', 'applied', 'dismissed']).optional(),
  provider: z.enum(['AWS', 'AZURE']).optional(),
});

/**
 * Schema for GET /api/v1/finops/recommendations/:id
 */
const getRecommendationSchema = z.object({
  id: z.string().uuid('Invalid recommendation ID format'),
});

/**
 * Schema for POST /api/v1/finops/recommendations/:id/apply
 */
const applyRecommendationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid recommendation ID format'),
  }),
  body: z.object({
    notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
  }),
});

/**
 * Schema for POST /api/v1/finops/recommendations/:id/dismiss
 */
const dismissRecommendationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid recommendation ID format'),
  }),
  body: z.object({
    reason: z.string()
      .min(10, 'Dismiss reason must be at least 10 characters')
      .max(500, 'Dismiss reason must be 500 characters or less'),
  }),
});

// ============================================================
// Helper Types
// ============================================================

/**
 * Interface for summary statistics by type
 */
interface SummaryByType {
  [key: string]: {
    count: number;
    savings: number;
  };
}

/**
 * Interface for summary statistics by priority
 */
interface SummaryByPriority {
  high: number;
  medium: number;
  low: number;
  [key: string]: number; // Allow dynamic string indexing
}

/**
 * Interface for summary statistics by provider
 */
interface SummaryByProvider {
  AWS: number;
  AZURE: number;
  [key: string]: number; // Allow dynamic string indexing
}

/**
 * Interface for recommendations summary response
 */
interface RecommendationsSummary {
  totalRecommendations: number;
  totalEstimatedSavings: number;
  byType: SummaryByType;
  byPriority: SummaryByPriority;
  byProvider: SummaryByProvider;
}

// ============================================================
// Recommendations Controller Class
// ============================================================

/**
 * Controller for handling FinOps recommendation endpoints
 *
 * @example
 * ```typescript
 * const prisma = new PrismaClient();
 * const eventBus = new EventEmitter();
 * const controller = new RecommendationsController(prisma, eventBus);
 * router.post('/recommendations/generate', controller.generateRecommendations.bind(controller));
 * ```
 */
export class RecommendationsController {
  private recommendationService: RecommendationGeneratorService;

  constructor(
    private prisma: PrismaClient,
    private eventBus: EventEmitter
  ) {
    this.recommendationService = new RecommendationGeneratorService(prisma, eventBus);
  }

  /**
   * POST /api/v1/finops/recommendations/generate
   *
   * Generates cost optimization recommendations for a tenant's cloud accounts.
   * Can optionally target a specific cloud account.
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
   *     "recommendationsGenerated": 15,
   *     "totalEstimatedSavings": 2500.50,
   *     "errors": []
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async generateRecommendations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Step 1: Validate request body
      const body = generateRecommendationsSchema.parse(req.body);

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
      const userId = req.user.id || req.user.userId;

      logger.info('[RecommendationsController] generateRecommendations - Starting generation', {
        tenantId,
        userId,
        cloudAccountId: body.cloudAccountId,
      });

      // Step 3: Generate recommendations using the service
      const result = await this.recommendationService.generateRecommendations(
        tenantId,
        body.cloudAccountId
      );

      logger.info('[RecommendationsController] generateRecommendations - Generation complete', {
        tenantId,
        recommendationsGenerated: result.recommendationsGenerated,
        totalSavings: result.totalEstimatedSavings,
        executionTime: result.executionTimeMs,
      });

      // Step 4: Return success response
      res.json({
        success: true,
        data: {
          recommendationsGenerated: result.recommendationsGenerated,
          totalEstimatedSavings: result.totalEstimatedSavings,
          errors: result.errors || [],
        },
      });
    } catch (error) {
      this.handleError(error, res, 'generateRecommendations');
    }
  }

  /**
   * GET /api/v1/finops/recommendations
   *
   * Lists cost optimization recommendations with filtering, sorting, and pagination.
   *
   * Query Parameters:
   * - status: 'open' | 'applied' | 'dismissed' (optional)
   * - type: recommendation type (optional)
   * - provider: 'AWS' | 'AZURE' (optional)
   * - priority: 'high' | 'medium' | 'low' (optional)
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 20, max: 100)
   * - sortBy: Sort field (default: 'createdAt')
   * - sortOrder: 'asc' | 'desc' (default: 'desc')
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "recommendations": [...],
   *     "total": 42,
   *     "page": 1,
   *     "limit": 20,
   *     "totalPages": 3
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async listRecommendations(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      logger.info('[RecommendationsController] listRecommendations - Querying recommendations', {
        tenantId,
        filters: { status: query.status, type: query.type, provider: query.provider, priority: query.priority },
        pagination: { page: query.page, limit: query.limit },
      });

      // Step 3: Build Prisma where clause with filters
      const where: any = { tenantId };

      if (query.status) where.status = query.status;
      if (query.type) where.type = query.type;
      if (query.provider) where.provider = query.provider;
      if (query.priority) where.priority = query.priority;

      // Step 4: Build sort order
      const orderBy: any = {};
      if (query.sortBy === 'priority') {
        // Special handling for priority to sort high > medium > low
        orderBy.priority = query.sortOrder === 'asc' ? 'asc' : 'desc';
      } else if (query.sortBy === 'estimatedSavings') {
        orderBy.estimatedSavings = query.sortOrder;
      } else if (query.sortBy === 'provider') {
        orderBy.provider = query.sortOrder;
      } else {
        orderBy.createdAt = query.sortOrder;
      }

      // Step 5: Calculate pagination
      const skip = (query.page - 1) * query.limit;
      const take = query.limit;

      // Step 6: Query recommendations with pagination
      const [recommendations, total] = await Promise.all([
        this.prisma.costRecommendation.findMany({
          where,
          orderBy,
          skip,
          take,
        }),
        this.prisma.costRecommendation.count({ where }),
      ]);

      logger.info('[RecommendationsController] listRecommendations - Retrieved recommendations', {
        tenantId,
        count: recommendations.length,
        total,
      });

      // Step 7: Calculate total pages
      const totalPages = Math.ceil(total / query.limit);

      // Step 8: Format response
      res.json({
        success: true,
        data: {
          recommendations: recommendations.map((rec) => ({
            id: rec.id,
            type: rec.type,
            priority: rec.priority,
            provider: rec.provider,
            service: rec.service,
            resourceId: rec.resourceId,
            title: rec.title,
            description: rec.description,
            estimatedSavings: Number(rec.estimatedSavings),
            savingsPeriod: rec.savingsPeriod,
            status: rec.status,
            actionable: rec.actionable,
            actionScript: rec.actionScript,
            metadata: rec.metadata,
            appliedAt: rec.appliedAt?.toISOString(),
            createdAt: rec.createdAt.toISOString(),
            updatedAt: rec.updatedAt.toISOString(),
          })),
          total,
          page: query.page,
          limit: query.limit,
          totalPages,
        },
      });
    } catch (error) {
      this.handleError(error, res, 'listRecommendations');
    }
  }

  /**
   * GET /api/v1/finops/recommendations/summary
   *
   * Retrieves aggregated statistics for cost optimization recommendations.
   *
   * Query Parameters:
   * - status: 'open' | 'applied' | 'dismissed' (optional)
   * - provider: 'AWS' | 'AZURE' (optional)
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "totalRecommendations": 42,
   *     "totalEstimatedSavings": 5240.50,
   *     "byType": {
   *       "idle_resource": { "count": 12, "savings": 2400.00 },
   *       "rightsize": { "count": 8, "savings": 1200.50 }
   *     },
   *     "byPriority": { "high": 5, "medium": 18, "low": 19 },
   *     "byProvider": { "AWS": 30, "AZURE": 12 }
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async getRecommendationsSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Step 1: Validate query parameters
      const query = summarySchema.parse(req.query);

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

      logger.info('[RecommendationsController] getRecommendationsSummary - Generating summary', {
        tenantId,
        filters: { status: query.status, provider: query.provider },
      });

      // Step 3: Build Prisma where clause with filters
      const where: any = { tenantId };

      if (query.status) where.status = query.status;
      if (query.provider) where.provider = query.provider;

      // Step 4: Query all recommendations for aggregation
      const recommendations = await this.prisma.costRecommendation.findMany({
        where,
        select: {
          type: true,
          priority: true,
          provider: true,
          estimatedSavings: true,
        },
      });

      logger.info('[RecommendationsController] getRecommendationsSummary - Processing aggregations', {
        tenantId,
        count: recommendations.length,
      });

      // Step 5: Calculate aggregations
      const summary: RecommendationsSummary = {
        totalRecommendations: recommendations.length,
        totalEstimatedSavings: 0,
        byType: {},
        byPriority: { high: 0, medium: 0, low: 0 },
        byProvider: { AWS: 0, AZURE: 0 },
      };

      for (const rec of recommendations) {
        // Total savings
        const savings = Number(rec.estimatedSavings);
        summary.totalEstimatedSavings += savings;

        // By type
        if (!summary.byType[rec.type]) {
          summary.byType[rec.type] = { count: 0, savings: 0 };
        }
        summary.byType[rec.type].count++;
        summary.byType[rec.type].savings += savings;

        // By priority
        summary.byPriority[rec.priority]++;

        // By provider
        summary.byProvider[rec.provider]++;
      }

      // Round total savings
      summary.totalEstimatedSavings = Math.round(summary.totalEstimatedSavings * 100) / 100;

      // Round savings by type
      for (const type in summary.byType) {
        summary.byType[type].savings = Math.round(summary.byType[type].savings * 100) / 100;
      }

      logger.info('[RecommendationsController] getRecommendationsSummary - Summary generated', {
        tenantId,
        totalRecommendations: summary.totalRecommendations,
        totalSavings: summary.totalEstimatedSavings,
      });

      // Step 6: Return summary
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      this.handleError(error, res, 'getRecommendationsSummary');
    }
  }

  /**
   * GET /api/v1/finops/recommendations/:id
   *
   * Retrieves a single recommendation by ID.
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "uuid",
   *     "type": "idle_resource",
   *     "priority": "high",
   *     "provider": "AWS",
   *     "estimatedSavings": 150.00,
   *     ...
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async getRecommendation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Step 1: Validate ID parameter
      const params = getRecommendationSchema.parse({ id: req.params.id });

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
      const recommendationId = params.id;

      logger.info('[RecommendationsController] getRecommendation - Fetching recommendation', {
        tenantId,
        recommendationId,
      });

      // Step 3: Query recommendation
      const recommendation = await this.prisma.costRecommendation.findUnique({
        where: { id: recommendationId },
      });

      // Step 4: Check if recommendation exists
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

      // Step 5: Verify tenant ownership
      if (recommendation.tenantId !== tenantId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this recommendation',
            statusCode: 403,
          },
        });
        return;
      }

      logger.info('[RecommendationsController] getRecommendation - Recommendation retrieved', {
        tenantId,
        recommendationId,
        type: recommendation.type,
      });

      // Step 6: Format and return response
      res.json({
        success: true,
        data: {
          id: recommendation.id,
          type: recommendation.type,
          priority: recommendation.priority,
          provider: recommendation.provider,
          service: recommendation.service,
          resourceId: recommendation.resourceId,
          title: recommendation.title,
          description: recommendation.description,
          estimatedSavings: Number(recommendation.estimatedSavings),
          savingsPeriod: recommendation.savingsPeriod,
          status: recommendation.status,
          actionable: recommendation.actionable,
          actionScript: recommendation.actionScript,
          metadata: recommendation.metadata,
          appliedAt: recommendation.appliedAt?.toISOString(),
          createdAt: recommendation.createdAt.toISOString(),
          updatedAt: recommendation.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      this.handleError(error, res, 'getRecommendation');
    }
  }

  /**
   * POST /api/v1/finops/recommendations/:id/apply
   *
   * Marks a recommendation as applied.
   * Updates the status and records application metadata.
   *
   * Request Body:
   * ```json
   * {
   *   "notes": "Applied via AWS Console" // Optional
   * }
   * ```
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "uuid",
   *     "status": "applied",
   *     "appliedAt": "2024-01-15T10:30:00Z"
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async applyRecommendation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Step 1: Validate request
      const validated = applyRecommendationSchema.parse({
        params: req.params,
        body: req.body,
      });

      // Step 2: Extract tenantId and userId from authenticated user
      if (!req.user?.tenantId || !req.user?.id) {
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
      const recommendationId = validated.params.id;
      const notes = validated.body.notes;

      logger.info('[RecommendationsController] applyRecommendation - Applying recommendation', {
        tenantId,
        userId,
        recommendationId,
      });

      // Step 3: Fetch existing recommendation
      const existing = await this.prisma.costRecommendation.findUnique({
        where: { id: recommendationId },
      });

      // Step 4: Check if recommendation exists
      if (!existing) {
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

      // Step 5: Verify tenant ownership
      if (existing.tenantId !== tenantId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to modify this recommendation',
            statusCode: 403,
          },
        });
        return;
      }

      // Step 6: Check if already applied
      if (existing.status === 'applied') {
        res.status(400).json({
          success: false,
          error: {
            code: 'ALREADY_APPLIED',
            message: 'Recommendation has already been applied',
            statusCode: 400,
          },
        });
        return;
      }

      // Step 7: Update recommendation status to 'applied'
      const updatedRecommendation = await this.prisma.costRecommendation.update({
        where: { id: recommendationId },
        data: {
          status: 'applied',
          appliedAt: new Date(),
          metadata: {
            ...(existing.metadata as any || {}),
            appliedBy: userId,
            appliedNotes: notes,
            appliedTimestamp: new Date().toISOString(),
          },
        },
      });

      logger.info('[RecommendationsController] applyRecommendation - Recommendation applied successfully', {
        tenantId,
        userId,
        recommendationId,
        estimatedSavings: existing.estimatedSavings,
      });

      // Step 8: Emit event for downstream processing
      this.eventBus.emit('recommendation.applied', {
        tenantId,
        recommendationId,
        userId,
        estimatedSavings: Number(existing.estimatedSavings),
        type: existing.type,
        provider: existing.provider,
        service: existing.service,
      });

      // Step 9: Return success response
      res.json({
        success: true,
        data: {
          id: updatedRecommendation.id,
          type: updatedRecommendation.type,
          priority: updatedRecommendation.priority,
          provider: updatedRecommendation.provider,
          service: updatedRecommendation.service,
          resourceId: updatedRecommendation.resourceId,
          title: updatedRecommendation.title,
          description: updatedRecommendation.description,
          estimatedSavings: Number(updatedRecommendation.estimatedSavings),
          savingsPeriod: updatedRecommendation.savingsPeriod,
          status: updatedRecommendation.status,
          actionable: updatedRecommendation.actionable,
          actionScript: updatedRecommendation.actionScript,
          metadata: updatedRecommendation.metadata,
          appliedAt: updatedRecommendation.appliedAt?.toISOString(),
          createdAt: updatedRecommendation.createdAt.toISOString(),
          updatedAt: updatedRecommendation.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      this.handleError(error, res, 'applyRecommendation');
    }
  }

  /**
   * POST /api/v1/finops/recommendations/:id/dismiss
   *
   * Dismisses a recommendation with a reason.
   * Updates the status and records dismissal metadata.
   *
   * Request Body:
   * ```json
   * {
   *   "reason": "Not applicable to our use case - planned capacity for upcoming launch"
   * }
   * ```
   *
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "uuid",
   *     "status": "dismissed",
   *     "metadata": {...}
   *   }
   * }
   * ```
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async dismissRecommendation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Step 1: Validate request
      const validated = dismissRecommendationSchema.parse({
        params: req.params,
        body: req.body,
      });

      // Step 2: Extract tenantId and userId from authenticated user
      if (!req.user?.tenantId || !req.user?.id) {
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
      const recommendationId = validated.params.id;
      const reason = validated.body.reason;

      logger.info('[RecommendationsController] dismissRecommendation - Dismissing recommendation', {
        tenantId,
        userId,
        recommendationId,
      });

      // Step 3: Fetch existing recommendation
      const existing = await this.prisma.costRecommendation.findUnique({
        where: { id: recommendationId },
      });

      // Step 4: Check if recommendation exists
      if (!existing) {
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

      // Step 5: Verify tenant ownership
      if (existing.tenantId !== tenantId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to modify this recommendation',
            statusCode: 403,
          },
        });
        return;
      }

      // Step 6: Check if already dismissed
      if (existing.status === 'dismissed') {
        res.status(400).json({
          success: false,
          error: {
            code: 'ALREADY_DISMISSED',
            message: 'Recommendation has already been dismissed',
            statusCode: 400,
          },
        });
        return;
      }

      // Step 7: Update recommendation status to 'dismissed'
      const updatedRecommendation = await this.prisma.costRecommendation.update({
        where: { id: recommendationId },
        data: {
          status: 'dismissed',
          metadata: {
            ...(existing.metadata as any || {}),
            dismissedBy: userId,
            dismissReason: reason,
            dismissedAt: new Date().toISOString(),
          },
        },
      });

      logger.info('[RecommendationsController] dismissRecommendation - Recommendation dismissed successfully', {
        tenantId,
        userId,
        recommendationId,
      });

      // Step 8: Emit event for downstream processing
      this.eventBus.emit('recommendation.dismissed', {
        tenantId,
        recommendationId,
        userId,
        reason,
        type: existing.type,
        provider: existing.provider,
        service: existing.service,
      });

      // Step 9: Return success response
      res.json({
        success: true,
        data: {
          id: updatedRecommendation.id,
          type: updatedRecommendation.type,
          priority: updatedRecommendation.priority,
          provider: updatedRecommendation.provider,
          service: updatedRecommendation.service,
          resourceId: updatedRecommendation.resourceId,
          title: updatedRecommendation.title,
          description: updatedRecommendation.description,
          estimatedSavings: Number(updatedRecommendation.estimatedSavings),
          savingsPeriod: updatedRecommendation.savingsPeriod,
          status: updatedRecommendation.status,
          actionable: updatedRecommendation.actionable,
          actionScript: updatedRecommendation.actionScript,
          metadata: updatedRecommendation.metadata,
          appliedAt: updatedRecommendation.appliedAt?.toISOString(),
          createdAt: updatedRecommendation.createdAt.toISOString(),
          updatedAt: updatedRecommendation.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      this.handleError(error, res, 'dismissRecommendation');
    }
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Centralized error handling for consistent error responses
   *
   * @param error - Error object
   * @param res - Express response object
   * @param method - Method name for logging
   * @private
   */
  private handleError(error: any, res: Response, method: string): void {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      logger.error(`[RecommendationsController] ${method} - Validation error`, {
        errors: error.errors,
      });

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation error',
          statusCode: 400,
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        },
      });
      return;
    }

    // Handle Prisma errors
    if (error.code === 'P2025') {
      logger.error(`[RecommendationsController] ${method} - Record not found`, { error });

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

    // Log internal server errors
    logger.error(`[RecommendationsController] ${method} - Internal error`, {
      error: error.message,
      stack: error.stack,
    });

    // Return generic error response
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        statusCode: 500,
        ...(process.env.NODE_ENV === 'development' && { details: error.message }),
      },
    });
  }
}

// ============================================================
// Export Controller Factory
// ============================================================

/**
 * Factory function to create a RecommendationsController instance
 * Used for dependency injection in routes
 *
 * @param prisma - PrismaClient instance
 * @param eventBus - EventEmitter instance
 * @returns RecommendationsController instance
 */
export function createRecommendationsController(
  prisma: PrismaClient,
  eventBus: EventEmitter
): RecommendationsController {
  return new RecommendationsController(prisma, eventBus);
}
