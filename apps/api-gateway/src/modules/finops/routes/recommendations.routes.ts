/**
 * FinOps Recommendations Routes
 *
 * This file defines all HTTP routes for the recommendations endpoints.
 * It provides REST API access to generate, query, apply, and dismiss cost optimization recommendations.
 *
 * Route Structure:
 * - POST /api/v1/finops/recommendations/generate - Generate new recommendations
 * - GET /api/v1/finops/recommendations/summary - Get summary statistics (must be before /:id)
 * - GET /api/v1/finops/recommendations - List recommendations with filters
 * - GET /api/v1/finops/recommendations/:id - Get single recommendation
 * - POST /api/v1/finops/recommendations/:id/apply - Apply a recommendation
 * - POST /api/v1/finops/recommendations/:id/dismiss - Dismiss a recommendation
 *
 * Middleware Stack:
 * 1. Rate Limiting - Prevents API abuse
 * 2. Authentication - Verifies JWT token and extracts user context
 * 3. Authorization - Checks user permissions
 * 4. Validation - Validates request parameters and body
 * 5. Controller Method - Handles business logic
 *
 * @module FinOps/Routes/Recommendations
 */

import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { RecommendationsController } from '../controllers/recommendations.controller';
import { authenticate, authorize } from '../../../middleware/auth';
import rateLimit from 'express-rate-limit';
import { eventBus } from '../../../shared/events/event-bus';
import { z } from 'zod';
import {
  GenerateRecommendationsSchema,
  ListRecommendationsSchema,
  GetRecommendationSchema,
  ApplyRecommendationSchema,
  DismissRecommendationSchema,
  GetRecommendationsSummarySchema,
} from '../validators/recommendations.validator';

// ============================================================
// Validation Middleware
// ============================================================

/**
 * Generic validation middleware factory
 * Validates request against a Zod schema
 *
 * Supports three validation modes:
 * 1. Query parameters (GET requests)
 * 2. Path parameters (/:id routes)
 * 3. Combined params + body (POST/PUT with ID)
 */
function validateRequest(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let dataToValidate: any = {};

      // Determine validation target based on request method and data
      const hasParams = Object.keys(req.params).length > 0;
      const hasBody = Object.keys(req.body).length > 0;
      const hasQuery = Object.keys(req.query).length > 0;

      if (hasParams && hasBody) {
        // Combined params + body (apply/dismiss endpoints)
        dataToValidate = {
          params: req.params,
          body: req.body,
        };
      } else if (hasParams) {
        // Only path parameters (get by id)
        dataToValidate = req.params;
      } else if (hasQuery) {
        // Query parameters (list, summary)
        dataToValidate = req.query;
      } else if (hasBody) {
        // Only body (generate)
        dataToValidate = req.body;
      }

      const validated = await schema.parseAsync(dataToValidate);

      // Attach validated data back to request
      if (validated && typeof validated === 'object') {
        if ('params' in validated && 'body' in validated) {
          req.params = validated.params;
          req.body = validated.body;
        } else if (hasQuery) {
          req.query = validated as any;
        } else if (hasBody) {
          req.body = validated;
        } else if (hasParams) {
          req.params = validated;
        }
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          message: 'Internal validation error',
          code: 'INTERNAL_ERROR',
        },
      });
    }
  };
}

// ============================================================
// Rate Limiter Configuration
// ============================================================

/**
 * Rate limiter for recommendation read endpoints
 *
 * Configuration:
 * - 100 requests per 15 minutes per IP address
 * - Sliding window to prevent burst attacks
 */
const recommendationsReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  skip: (req) => req.method === 'OPTIONS',
});

/**
 * Rate limiter for recommendation write/generation endpoints (more restrictive)
 *
 * Configuration:
 * - 20 requests per 15 minutes per IP address
 * - More restrictive for resource-intensive operations
 */
const recommendationsWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many write requests, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  skip: (req) => req.method === 'OPTIONS',
});

// ============================================================
// Router Configuration
// ============================================================

const router = Router();

// Initialize Prisma client and controller
const prisma = new PrismaClient();
const recommendationsController = new RecommendationsController(prisma, eventBus);

// ============================================================
// Recommendation Endpoints
// ============================================================

/**
 * POST /api/v1/finops/recommendations/generate
 *
 * Generate new cost optimization recommendations
 *
 * Middleware:
 * - recommendationsWriteLimiter: Rate limiting (20 req/15min)
 * - authenticate: JWT authentication and tenant extraction
 * - authorize: Requires finops:recommendations:generate permission
 * - validateRequest: Validates request body
 *
 * Request Body:
 * ```json
 * {
 *   "cloudAccountId": "uuid" // Optional
 * }
 * ```
 *
 * @example
 * POST /api/v1/finops/recommendations/generate
 * Body: { "cloudAccountId": "123e4567-e89b-12d3-a456-426614174000" }
 */
router.post(
  '/generate',
  recommendationsWriteLimiter,
  authenticate,
  authorize('admin', 'finops_manager'),
  validateRequest(GenerateRecommendationsSchema),
  (req, res) => recommendationsController.generateRecommendations(req as any, res)
);

/**
 * GET /api/v1/finops/recommendations/summary
 *
 * Get recommendations summary and statistics
 *
 * IMPORTANT: This route MUST be defined before /:id to avoid route collision
 *
 * Middleware:
 * - recommendationsReadLimiter: Rate limiting (100 req/15min)
 * - authenticate: JWT authentication and tenant extraction
 * - authorize: Requires finops:recommendations:read permission
 * - validateRequest: Validates query parameters
 *
 * Query Parameters:
 * - status (optional): 'open' | 'applied' | 'dismissed'
 * - provider (optional): 'AWS' | 'AZURE'
 *
 * @example
 * GET /api/v1/finops/recommendations/summary?status=open&provider=AWS
 */
router.get(
  '/summary',
  recommendationsReadLimiter,
  authenticate,
  authorize('admin', 'finops_manager', 'finops_viewer'),
  validateRequest(GetRecommendationsSummarySchema),
  (req, res) => recommendationsController.getRecommendationsSummary(req as any, res)
);

/**
 * GET /api/v1/finops/recommendations
 *
 * List recommendations with filters, pagination, and sorting
 *
 * Middleware:
 * - recommendationsReadLimiter: Rate limiting (100 req/15min)
 * - authenticate: JWT authentication and tenant extraction
 * - authorize: Requires finops:recommendations:read permission
 * - validateRequest: Validates query parameters
 *
 * Query Parameters:
 * - status (optional): Filter by status
 * - type (optional): Filter by recommendation type
 * - provider (optional): Filter by cloud provider
 * - priority (optional): Filter by priority level
 * - page (optional): Page number (default: 1)
 * - limit (optional): Results per page (default: 20, max: 100)
 * - sortBy (optional): Field to sort by (default: createdAt)
 * - sortOrder (optional): Sort direction (default: desc)
 *
 * @example
 * GET /api/v1/finops/recommendations?status=open&priority=high&page=1&limit=20
 */
router.get(
  '/',
  recommendationsReadLimiter,
  authenticate,
  authorize('admin', 'finops_manager', 'finops_viewer'),
  validateRequest(ListRecommendationsSchema),
  (req, res) => recommendationsController.listRecommendations(req as any, res)
);

/**
 * GET /api/v1/finops/recommendations/:id
 *
 * Get single recommendation by ID
 *
 * Middleware:
 * - recommendationsReadLimiter: Rate limiting (100 req/15min)
 * - authenticate: JWT authentication and tenant extraction
 * - authorize: Requires finops:recommendations:read permission
 * - validateRequest: Validates path parameters
 *
 * URL Parameters:
 * - id: Recommendation UUID
 *
 * @example
 * GET /api/v1/finops/recommendations/123e4567-e89b-12d3-a456-426614174000
 */
router.get(
  '/:id',
  recommendationsReadLimiter,
  authenticate,
  authorize('admin', 'finops_manager', 'finops_viewer'),
  validateRequest(GetRecommendationSchema),
  (req, res) => recommendationsController.getRecommendation(req as any, res)
);

/**
 * POST /api/v1/finops/recommendations/:id/apply
 *
 * Apply a recommendation (mark as implemented)
 *
 * Middleware:
 * - recommendationsWriteLimiter: Rate limiting (20 req/15min)
 * - authenticate: JWT authentication and tenant extraction
 * - authorize: Requires finops:recommendations:apply permission
 * - validateRequest: Validates path parameters and request body
 *
 * URL Parameters:
 * - id: Recommendation UUID
 *
 * Request Body:
 * ```json
 * {
 *   "notes": "Optional notes about the application (max 1000 chars)"
 * }
 * ```
 *
 * @example
 * POST /api/v1/finops/recommendations/123e4567-e89b-12d3-a456-426614174000/apply
 * Body: { "notes": "Successfully resized EC2 instance from m5.large to m5.medium" }
 */
router.post(
  '/:id/apply',
  recommendationsWriteLimiter,
  authenticate,
  authorize('admin', 'finops_manager'),
  validateRequest(ApplyRecommendationSchema),
  (req, res) => recommendationsController.applyRecommendation(req as any, res)
);

/**
 * POST /api/v1/finops/recommendations/:id/dismiss
 *
 * Dismiss a recommendation (mark as not applicable)
 *
 * Middleware:
 * - recommendationsWriteLimiter: Rate limiting (20 req/15min)
 * - authenticate: JWT authentication and tenant extraction
 * - authorize: Requires finops:recommendations:dismiss permission
 * - validateRequest: Validates path parameters and request body
 *
 * URL Parameters:
 * - id: Recommendation UUID
 *
 * Request Body:
 * ```json
 * {
 *   "reason": "Reason for dismissing (min 10 chars, required)"
 * }
 * ```
 *
 * @example
 * POST /api/v1/finops/recommendations/123e4567-e89b-12d3-a456-426614174000/dismiss
 * Body: { "reason": "This resource is required for production workload" }
 */
router.post(
  '/:id/dismiss',
  recommendationsWriteLimiter,
  authenticate,
  authorize('admin', 'finops_manager'),
  validateRequest(DismissRecommendationSchema),
  (req, res) => recommendationsController.dismissRecommendation(req as any, res)
);

// ============================================================
// Export Router
// ============================================================

/**
 * Export configured recommendations router
 *
 * This router should be mounted at `/api/v1/finops/recommendations` in the FinOps routes.
 *
 * @example
 * ```typescript
 * import recommendationsRoutes from './recommendations.routes';
 * router.use('/recommendations', recommendationsRoutes);
 * ```
 */
export default router;
