/**
 * Azure Advisor Routes
 *
 * Defines all HTTP routes for Azure Advisor recommendations API.
 *
 * Routes:
 * - GET /api/v1/advisor/recommendations - List all recommendations
 * - GET /api/v1/advisor/recommendations/:id - Get single recommendation
 * - POST /api/v1/advisor/recommendations/:id/suppress - Suppress recommendation
 * - GET /api/v1/advisor/summary - Get recommendations summary
 *
 * Middleware:
 * - Auth: JWT authentication required for all endpoints
 * - Rate Limiting: 10 req/min per tenant
 * - Usage Tracking: Tracks API usage for billing
 *
 * @module modules/advisor/routes
 */

import { Router } from 'express';
import { prisma } from '../../../lib/prisma';
import { AdvisorController } from '../controllers/advisor.controller';
import { authenticate } from '../../../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();
const advisorController = new AdvisorController(prisma);

// ============================================================
// Rate Limiting Configuration
// ============================================================

/**
 * Rate limiter for Advisor API
 * Limits: 10 requests per minute per tenant
 */
const advisorRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests to Advisor API. Please try again in a minute.',
      statusCode: 429,
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use tenantId for rate limiting (requires auth middleware first)
  keyGenerator: (req: any) => {
    return req.user?.tenantId || req.ip || 'anonymous';
  },
});

/**
 * Stricter rate limiter for suppress operations
 * Limits: 5 requests per minute per tenant
 */
const suppressRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many suppress requests. Please try again in a minute.',
      statusCode: 429,
    },
  },
  keyGenerator: (req: any) => {
    return req.user?.tenantId || req.ip || 'anonymous';
  },
});

// ============================================================
// Routes
// ============================================================

/**
 * GET /api/v1/advisor/recommendations
 *
 * Lists Azure Advisor recommendations with filtering and pagination.
 *
 * Query Parameters:
 * - category: Cost | Security | Reliability | Performance | OperationalExcellence
 * - impact: High, Medium, Low (can be array)
 * - status: Active | Suppressed | Dismissed | Resolved
 * - resourceType: String
 * - resourceGroup: String
 * - region: String
 * - minSavings: Number
 * - page: Number (default: 1)
 * - limit: Number (default: 20, max: 100)
 * - sortBy: impact | savings | lastUpdated
 * - sortOrder: asc | desc
 *
 * @auth Required
 * @rate-limit 10 req/min per tenant
 */
router.get(
  '/recommendations',
  authenticate,
  advisorRateLimiter,
  (req, res) => advisorController.getRecommendations(req as any, res)
);

/**
 * GET /api/v1/advisor/recommendations/:id
 *
 * Gets a single Azure Advisor recommendation by ID.
 *
 * @auth Required
 * @rate-limit 10 req/min per tenant
 */
router.get(
  '/recommendations/:id',
  authenticate,
  advisorRateLimiter,
  (req, res) => advisorController.getRecommendationById(req as any, res)
);

/**
 * POST /api/v1/advisor/recommendations/:id/suppress
 *
 * Suppresses a recommendation for a specified duration.
 *
 * Request Body:
 * - durationDays: 7 | 30 | 90 | 180 | 365 (required)
 * - reason: String (optional, max 500 chars)
 * - notes: String (optional, max 1000 chars)
 *
 * @auth Required
 * @rate-limit 5 req/min per tenant (stricter)
 */
router.post(
  '/recommendations/:id/suppress',
  authenticate,
  suppressRateLimiter,
  (req, res) => advisorController.suppressRecommendation(req as any, res)
);

/**
 * GET /api/v1/advisor/summary
 *
 * Gets summary statistics for Azure Advisor recommendations.
 *
 * Query Parameters:
 * - cloudAccountId: UUID (optional)
 *
 * @auth Required
 * @rate-limit 10 req/min per tenant
 */
router.get(
  '/summary',
  authenticate,
  advisorRateLimiter,
  (req, res) => advisorController.getSummary(req as any, res)
);

export default router;
