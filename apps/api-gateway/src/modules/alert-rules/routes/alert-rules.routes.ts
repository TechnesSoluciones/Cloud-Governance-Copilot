/**
 * Alert Rules Routes
 *
 * Defines REST API routes for alert rule management across cloud providers.
 * All routes require authentication and enforce tenant isolation.
 *
 * Routes:
 * - GET    /api/v1/alert-rules             - List alert rules
 * - POST   /api/v1/alert-rules             - Create alert rule
 * - PUT    /api/v1/alert-rules/:id         - Update alert rule
 * - DELETE /api/v1/alert-rules/:id         - Delete alert rule
 * - GET    /api/v1/alert-rules/templates   - List alert rule templates
 *
 * Rate Limits:
 * - Read operations (GET):       50 requests per 15 minutes
 * - Write operations (POST):     10 requests per 15 minutes
 * - Update operations (PUT):     10 requests per 15 minutes
 * - Delete operations (DELETE):  10 requests per 15 minutes
 *
 * @module alert-rules/routes
 */

import { Router } from 'express';
import { alertRulesController } from '../controllers/alert-rules.controller';
import { authenticate } from '../../../middleware/auth';
import rateLimit from 'express-rate-limit';

// ============================================================
// Rate Limiter Configuration
// ============================================================

/**
 * Read rate limiter for GET endpoints
 * - 50 requests per 15 minutes per IP
 */
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
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
 * Write rate limiter for POST/PUT/DELETE endpoints
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
 * GET /api/v1/alert-rules/templates
 *
 * Lists all available alert rule templates.
 * Must be defined before /:id to avoid route collision.
 *
 * @authentication Required (JWT)
 * @ratelimit 50 requests per 15 minutes
 *
 * @query {string} [provider=azure] - Cloud provider
 * @returns {AlertRuleTemplateResponse[]} Alert rule templates
 */
router.get('/templates', readLimiter, alertRulesController.getAlertRuleTemplates);

/**
 * GET /api/v1/alert-rules
 *
 * Lists all alert rules for a cloud account.
 *
 * @authentication Required (JWT)
 * @ratelimit 50 requests per 15 minutes
 *
 * @query {string} accountId - Cloud account ID (required)
 * @returns {AlertRuleResponse[]} Alert rules
 */
router.get('/', readLimiter, alertRulesController.getAlertRules);

/**
 * POST /api/v1/alert-rules
 *
 * Creates a new alert rule.
 *
 * @authentication Required (JWT)
 * @ratelimit 10 requests per 15 minutes
 *
 * @body {CreateAlertRuleBody} Alert rule configuration
 * @returns {AlertRuleResponse} Created alert rule
 */
router.post('/', writeLimiter, alertRulesController.createAlertRule);

/**
 * PUT /api/v1/alert-rules/:id
 *
 * Updates an existing alert rule.
 *
 * @authentication Required (JWT)
 * @ratelimit 10 requests per 15 minutes
 *
 * @param {string} id - Alert rule ID
 * @query {string} accountId - Cloud account ID (required)
 * @body {UpdateAlertRuleBody} Alert rule updates
 * @returns {AlertRuleResponse} Updated alert rule
 */
router.put('/:id', writeLimiter, alertRulesController.updateAlertRule);

/**
 * DELETE /api/v1/alert-rules/:id
 *
 * Deletes an alert rule.
 *
 * @authentication Required (JWT)
 * @ratelimit 10 requests per 15 minutes
 *
 * @param {string} id - Alert rule ID
 * @query {string} accountId - Cloud account ID (required)
 * @returns {object} Success message
 */
router.delete('/:id', writeLimiter, alertRulesController.deleteAlertRule);

// ============================================================
// Export
// ============================================================

export default router;
