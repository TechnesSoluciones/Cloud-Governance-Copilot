/**
 * Log Analytics Routes
 *
 * Defines REST API routes for KQL query execution and management.
 * All routes require authentication and enforce tenant isolation.
 *
 * Routes:
 * - POST   /api/v1/log-analytics/query           - Execute custom KQL query
 * - GET    /api/v1/log-analytics/prebuilt        - List pre-built queries
 * - GET    /api/v1/log-analytics/prebuilt/:name  - Execute pre-built query
 * - GET    /api/v1/log-analytics/history         - Get saved query history
 * - POST   /api/v1/log-analytics/save            - Save query for reuse
 * - DELETE /api/v1/log-analytics/queries/:id     - Delete saved query
 *
 * Rate Limits:
 * - Query execution (POST):      20 requests per 15 minutes (expensive operations)
 * - Pre-built queries (GET):     30 requests per 15 minutes
 * - Read operations (GET):       50 requests per 15 minutes
 * - Write operations (POST):     10 requests per 15 minutes
 *
 * @module log-analytics/routes
 */

import { Router } from 'express';
import { logAnalyticsController } from '../controllers/log-analytics.controller';
import { authenticate } from '../../../middleware/auth';
import rateLimit from 'express-rate-limit';

// ============================================================
// Rate Limiter Configuration
// ============================================================

/**
 * Query execution rate limiter (expensive operations)
 * - 20 requests per 15 minutes per IP
 */
const queryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many query execution requests. Please try again in 15 minutes.',
      retryAfter: '15 minutes',
    },
  },
});

/**
 * Pre-built query rate limiter
 * - 30 requests per 15 minutes per IP
 */
const preBuiltQueryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many pre-built query requests. Please try again in 15 minutes.',
      retryAfter: '15 minutes',
    },
  },
});

/**
 * Read rate limiter for GET endpoints
 * - 50 requests per 15 minutes per IP
 */
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many read requests. Please try again in 15 minutes.',
      retryAfter: '15 minutes',
    },
  },
});

/**
 * Write rate limiter for POST/DELETE endpoints
 * - 10 requests per 15 minutes per IP
 */
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many write requests. Please try again in 15 minutes.',
      retryAfter: '15 minutes',
    },
  },
});

// ============================================================
// Router Setup
// ============================================================

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// ============================================================
// Route Definitions
// ============================================================

/**
 * POST /api/v1/log-analytics/query
 *
 * Executes a custom KQL query against Log Analytics workspace.
 *
 * @authentication Required (JWT)
 * @ratelimit 20 requests per 15 minutes
 *
 * @body {object} - Query execution request
 * @returns {QueryResultResponse} Query results
 */
router.post('/query', queryLimiter, logAnalyticsController.executeQuery);

/**
 * GET /api/v1/log-analytics/prebuilt
 *
 * Lists all available pre-built queries.
 *
 * @authentication Required (JWT)
 * @ratelimit 50 requests per 15 minutes
 *
 * @returns {PreBuiltQueryInfo[]} List of pre-built queries
 */
router.get('/prebuilt', readLimiter, logAnalyticsController.listPreBuiltQueries);

/**
 * GET /api/v1/log-analytics/prebuilt/:queryName
 *
 * Executes a pre-built KQL query.
 *
 * @authentication Required (JWT)
 * @ratelimit 30 requests per 15 minutes
 *
 * @param {string} queryName - Pre-built query name
 * @query {string} accountId - Cloud account ID
 * @query {string} workspaceId - Log Analytics workspace ID
 * @returns {QueryResultResponse} Query results
 */
router.get('/prebuilt/:queryName', preBuiltQueryLimiter, logAnalyticsController.getPreBuiltQuery);

/**
 * GET /api/v1/log-analytics/history
 *
 * Gets saved query history for an account.
 *
 * @authentication Required (JWT)
 * @ratelimit 50 requests per 15 minutes
 *
 * @query {string} accountId - Cloud account ID
 * @returns {SavedQueryResponse[]} Saved queries
 */
router.get('/history', readLimiter, logAnalyticsController.getQueryHistory);

/**
 * POST /api/v1/log-analytics/save
 *
 * Saves a query for future reuse.
 *
 * @authentication Required (JWT)
 * @ratelimit 10 requests per 15 minutes
 *
 * @body {object} - Save query request
 * @returns {SavedQueryResponse} Saved query
 */
router.post('/save', writeLimiter, logAnalyticsController.saveQuery);

/**
 * DELETE /api/v1/log-analytics/queries/:id
 *
 * Deletes a saved query.
 *
 * @authentication Required (JWT)
 * @ratelimit 10 requests per 15 minutes
 *
 * @param {string} id - Saved query ID
 * @returns {object} Success message
 */
router.delete('/queries/:id', writeLimiter, logAnalyticsController.deleteQuery);

// ============================================================
// Export
// ============================================================

export default router;
