/**
 * FinOps Module Routes
 *
 * This file defines all HTTP routes for the FinOps module, including:
 * - Cost data retrieval and aggregation
 * - Cost trend analysis
 * - Anomaly detection and management
 * - Cost optimization recommendations
 *
 * All routes are protected by authentication middleware and support tenant isolation.
 * Rate limiting is applied to prevent abuse and ensure fair usage.
 *
 * Route Structure:
 * - /api/finops/costs - Cost data endpoints
 * - /api/finops/costs/by-service - Service-based aggregation
 * - /api/finops/costs/trends - Trend analysis
 * - /api/finops/anomalies - Anomaly management
 * - /api/finops/recommendations - Cost optimization recommendations
 *
 * Middleware Stack:
 * 1. Rate Limiting - Prevents API abuse
 * 2. Authentication - Verifies JWT token and extracts user context
 * 3. Controller Method - Handles business logic
 *
 * @module FinOps/Routes
 */

import { Router } from 'express';
import { costsController } from '../controllers/costs.controller';
import { authenticate } from '../../../middleware/auth';
import rateLimit from 'express-rate-limit';
import recommendationsRoutes from './recommendations.routes';

// ============================================================
// Rate Limiter Configuration
// ============================================================

/**
 * Rate limiter for cost data endpoints
 *
 * Configuration:
 * - 100 requests per 15 minutes per IP address
 * - Sliding window to prevent burst attacks
 * - Consistent error messages for rate limit exceeded
 *
 * This prevents abuse while allowing legitimate usage patterns.
 */
const costDataLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  // Skip rate limiting for OPTIONS requests (CORS preflight)
  skip: (req) => req.method === 'OPTIONS',
});

/**
 * Rate limiter for anomaly modification endpoints (more restrictive)
 *
 * Configuration:
 * - 20 requests per 15 minutes per IP address
 * - More restrictive for write operations
 *
 * Anomaly resolution is less frequent, so we apply stricter limits.
 */
const anomalyModificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many modification requests, please try again later.',
  },
  skip: (req) => req.method === 'OPTIONS',
});

// ============================================================
// Router Configuration
// ============================================================

const router = Router();

// ============================================================
// Cost Data Endpoints
// ============================================================

/**
 * GET /api/finops/costs
 *
 * Retrieve cost data with filters
 *
 * Middleware:
 * - costDataLimiter: Rate limiting (100 req/15min)
 * - authenticate: JWT authentication and tenant extraction
 *
 * Query Parameters:
 * - startDate (required): ISO 8601 date string
 * - endDate (required): ISO 8601 date string
 * - provider (optional): 'aws' | 'azure' | 'gcp'
 * - service (optional): Service name
 *
 * @example
 * GET /api/finops/costs?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z&provider=aws
 */
router.get(
  '/costs',
  costDataLimiter,
  authenticate,
  costsController.getCosts.bind(costsController)
);

/**
 * GET /api/finops/costs/by-service
 *
 * Retrieve cost aggregation by service
 *
 * Middleware:
 * - costDataLimiter: Rate limiting (100 req/15min)
 * - authenticate: JWT authentication and tenant extraction
 *
 * Query Parameters:
 * - startDate (required): ISO 8601 date string
 * - endDate (required): ISO 8601 date string
 * - provider (optional): 'aws' | 'azure' | 'gcp'
 *
 * @example
 * GET /api/finops/costs/by-service?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z
 */
router.get(
  '/costs/by-service',
  costDataLimiter,
  authenticate,
  costsController.getCostsByService.bind(costsController)
);

/**
 * GET /api/finops/costs/trends
 *
 * Retrieve cost trends over time
 *
 * Middleware:
 * - costDataLimiter: Rate limiting (100 req/15min)
 * - authenticate: JWT authentication and tenant extraction
 *
 * Query Parameters:
 * - startDate (required): ISO 8601 date string
 * - endDate (required): ISO 8601 date string
 * - granularity (optional): 'daily' | 'weekly' | 'monthly' (default: daily)
 *
 * @example
 * GET /api/finops/costs/trends?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z&granularity=weekly
 */
router.get(
  '/costs/trends',
  costDataLimiter,
  authenticate,
  costsController.getCostTrends.bind(costsController)
);

// ============================================================
// Anomaly Endpoints
// ============================================================

/**
 * GET /api/finops/anomalies
 *
 * Retrieve cost anomalies with filters
 *
 * Middleware:
 * - costDataLimiter: Rate limiting (100 req/15min)
 * - authenticate: JWT authentication and tenant extraction
 *
 * Query Parameters:
 * - status (optional): 'open' | 'investigating' | 'resolved' | 'dismissed'
 * - severity (optional): 'low' | 'medium' | 'high' | 'critical'
 * - startDate (optional): ISO 8601 date string
 * - endDate (optional): ISO 8601 date string
 * - provider (optional): 'aws' | 'azure' | 'gcp'
 * - service (optional): Service name
 *
 * @example
 * GET /api/finops/anomalies?status=open&severity=critical
 */
router.get(
  '/anomalies',
  costDataLimiter,
  authenticate,
  costsController.getAnomalies.bind(costsController)
);

/**
 * POST /api/finops/anomalies/:id/resolve
 *
 * Mark an anomaly as resolved
 *
 * Middleware:
 * - anomalyModificationLimiter: Rate limiting (20 req/15min)
 * - authenticate: JWT authentication and tenant extraction
 *
 * URL Parameters:
 * - id: Anomaly UUID
 *
 * Request Body:
 * ```json
 * {
 *   "resolution": "Description of resolution (min 10 chars)",
 *   "resolvedBy": "user-uuid" // Optional, defaults to authenticated user
 * }
 * ```
 *
 * @example
 * POST /api/finops/anomalies/123e4567-e89b-12d3-a456-426614174000/resolve
 * Body: { "resolution": "False positive - planned maintenance" }
 */
router.post(
  '/anomalies/:id/resolve',
  anomalyModificationLimiter,
  authenticate,
  costsController.resolveAnomaly.bind(costsController)
);

// ============================================================
// Export Router
// ============================================================

// ============================================================
// Mount Sub-Routes
// ============================================================

/**
 * Mount recommendations routes at /recommendations
 *
 * Full path: /api/v1/finops/recommendations
 */
router.use('/recommendations', recommendationsRoutes);

// ============================================================
// Export Router
// ============================================================

/**
 * Export configured FinOps router
 *
 * This router should be mounted at `/api/finops` in the main Express app.
 *
 * @example
 * ```typescript
 * import finopsRoutes from './modules/finops/routes';
 * app.use('/api/finops', finopsRoutes);
 * ```
 */
export default router;
