/**
 * Dependencies Routes
 *
 * API routes for resource dependency analysis and graph visualization.
 *
 * All routes require authentication and have rate limiting applied.
 *
 * @module routes/dependencies.routes
 */

import { Router } from 'express';
import { dependenciesController } from '../modules/assets/controllers/dependencies.controller';
import { asyncHandler } from '../middleware/async-handler';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// ============================================================
// Validation Schemas
// ============================================================

/**
 * Schema for resource dependencies query params
 */
const getResourceDependenciesSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Resource ID is required'),
  }),
  query: z.object({
    depth: z.coerce.number().min(1).max(3).optional().default(2),
    includeIndirect: z
      .string()
      .optional()
      .transform(val => val === 'true')
      .default('true'),
  }),
});

/**
 * Schema for resource group dependency graph query params
 */
const getResourceGroupGraphSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Resource Group ID is required'),
  }),
  query: z.object({
    groupBy: z.enum(['type', 'layer', 'location']).optional().default('type'),
    layout: z.enum(['hierarchical', 'force', 'circular']).optional().default('hierarchical'),
    includeMetrics: z
      .string()
      .optional()
      .transform(val => val === 'true')
      .default('true'),
  }),
});

/**
 * Schema for circular dependencies query params
 */
const getCircularDependenciesSchema = z.object({
  query: z.object({
    accountId: z.string().min(1, 'Account ID is required'),
    resourceGroupId: z.string().optional(),
    severity: z.enum(['warning', 'error']).optional(),
  }),
});

/**
 * Schema for impact analysis request body
 */
const impactAnalysisSchema = z.object({
  body: z.object({
    accountId: z.string().min(1, 'Account ID is required'),
    resourceId: z.string().min(1, 'Resource ID is required'),
    action: z.enum(['delete', 'modify'], {
      required_error: 'Action must be "delete" or "modify"',
    }),
    scope: z.enum(['direct', 'full']).optional().default('full'),
  }),
});

/**
 * Schema for dependency metrics query params
 */
const getDependencyMetricsSchema = z.object({
  query: z.object({
    accountId: z.string().min(1, 'Account ID is required'),
    resourceGroupId: z.string().optional(),
    includeAntiPatterns: z
      .string()
      .optional()
      .transform(val => val !== 'false')
      .default('true'),
  }),
});

// ============================================================
// Routes
// ============================================================

/**
 * GET /api/v1/dependencies/resource/:id
 *
 * Get dependencies for a specific resource
 *
 * @route GET /api/v1/dependencies/resource/:id
 * @group Dependencies - Resource dependency analysis
 * @param {string} id.path.required - Azure resource ID
 * @param {number} depth.query - Maximum depth for dependency traversal (1-3)
 * @param {boolean} includeIndirect.query - Include indirect dependencies
 * @returns {DependencyGraph} 200 - Dependency graph
 * @returns {Error} 400 - Invalid request
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 500 - Internal server error
 * @security JWT
 */
router.get(
  '/resource/:id',
  validateRequest(getResourceDependenciesSchema),
  asyncHandler(async (req, res, next) => {
    await dependenciesController.getResourceDependencies(req, res, next);
  })
);

/**
 * GET /api/v1/dependencies/resource-group/:id/graph
 *
 * Get complete dependency graph for a resource group
 *
 * @route GET /api/v1/dependencies/resource-group/:id/graph
 * @group Dependencies - Resource dependency analysis
 * @param {string} id.path.required - Resource Group ID or name
 * @param {string} groupBy.query - Group resources by (type, layer, location)
 * @param {string} layout.query - Graph layout algorithm (hierarchical, force, circular)
 * @param {boolean} includeMetrics.query - Include graph metrics
 * @returns {DependencyGraph} 200 - Complete dependency graph
 * @returns {Error} 400 - Invalid request
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 500 - Internal server error
 * @security JWT
 */
router.get(
  '/resource-group/:id/graph',
  validateRequest(getResourceGroupGraphSchema),
  asyncHandler(async (req, res, next) => {
    await dependenciesController.getResourceGroupDependencyGraph(req, res, next);
  })
);

/**
 * GET /api/v1/dependencies/circular
 *
 * Find circular dependencies in an account
 *
 * @route GET /api/v1/dependencies/circular
 * @group Dependencies - Resource dependency analysis
 * @param {string} accountId.query.required - Azure subscription ID
 * @param {string} resourceGroupId.query - Optional resource group filter
 * @param {string} severity.query - Filter by severity (warning, error)
 * @returns {CircularDependency[]} 200 - List of circular dependencies
 * @returns {Error} 400 - Invalid request
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 500 - Internal server error
 * @security JWT
 */
router.get(
  '/circular',
  validateRequest(getCircularDependenciesSchema),
  asyncHandler(async (req, res, next) => {
    await dependenciesController.getCircularDependencies(req, res, next);
  })
);

/**
 * POST /api/v1/dependencies/impact-analysis
 *
 * Perform impact analysis for deleting or modifying a resource
 *
 * @route POST /api/v1/dependencies/impact-analysis
 * @group Dependencies - Resource dependency analysis
 * @param {ImpactAnalysisRequest} request.body.required - Impact analysis request
 * @returns {ImpactAnalysis} 200 - Impact analysis result
 * @returns {Error} 400 - Invalid request
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 500 - Internal server error
 * @security JWT
 */
router.post(
  '/impact-analysis',
  validateRequest(impactAnalysisSchema),
  asyncHandler(async (req, res, next) => {
    await dependenciesController.performImpactAnalysis(req, res, next);
  })
);

/**
 * GET /api/v1/dependencies/metrics
 *
 * Get dependency metrics for an account
 *
 * @route GET /api/v1/dependencies/metrics
 * @group Dependencies - Resource dependency analysis
 * @param {string} accountId.query.required - Azure subscription ID
 * @param {string} resourceGroupId.query - Optional resource group filter
 * @param {boolean} includeAntiPatterns.query - Include anti-pattern detection
 * @returns {DependencyMetrics} 200 - Dependency metrics
 * @returns {Error} 400 - Invalid request
 * @returns {Error} 401 - Unauthorized
 * @returns {Error} 500 - Internal server error
 * @security JWT
 */
router.get(
  '/metrics',
  validateRequest(getDependencyMetricsSchema),
  asyncHandler(async (req, res, next) => {
    await dependenciesController.getDependencyMetrics(req, res, next);
  })
);

export default router;
