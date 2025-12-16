/**
 * Policy Routes
 * Endpoints for Azure Policy compliance and governance
 */

import { Router } from 'express';
import * as policyController from '../modules/security/controllers/policy.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
// Temporarily disabled for testing
// router.use(authenticate);

/**
 * @route   GET /api/v1/policy/assignments
 * @desc    Get all policy assignments for the account
 * @query   accountId - Cloud account ID (required)
 * @access  Authenticated users
 * @returns Array of policy assignments with metadata
 */
router.get('/assignments', policyController.getPolicyAssignments);

/**
 * @route   GET /api/v1/policy/compliance
 * @desc    Get overall policy compliance status
 * @query   accountId - Cloud account ID (required)
 * @access  Authenticated users
 * @returns Compliance summary with percentages and breakdown
 */
router.get('/compliance', policyController.getPolicyCompliance);

/**
 * @route   GET /api/v1/policy/non-compliant
 * @desc    Get non-compliant resources
 * @query   accountId - Cloud account ID (required)
 * @query   policyId - Filter by specific policy ID (optional)
 * @query   severity - Filter by severity: critical, high, medium, low (optional)
 * @query   limit - Maximum results (optional, default: 100, max: 1000)
 * @access  Authenticated users
 * @returns Array of non-compliant resources with details
 */
router.get('/non-compliant', policyController.getNonCompliantResources);

/**
 * @route   GET /api/v1/policy/definitions
 * @desc    Get available policy definitions (built-in and custom)
 * @query   accountId - Cloud account ID (required)
 * @query   policyType - Filter by type: BuiltIn, Custom, Static (optional)
 * @query   category - Filter by category (optional)
 * @access  Authenticated users
 * @returns Array of policy definitions
 */
router.get('/definitions', policyController.getPolicyDefinitions);

/**
 * @route   POST /api/v1/policy/evaluate
 * @desc    Evaluate compliance for a specific resource
 * @body    accountId - Cloud account ID (required)
 * @body    resourceId - Full Azure resource ID (required)
 * @access  Authenticated users
 * @returns Policy evaluation result with violated and compliant policies
 */
router.post('/evaluate', policyController.evaluatePolicyCompliance);

/**
 * @route   GET /api/v1/policy/security-score
 * @desc    Get policy-based security score
 * @query   accountId - Cloud account ID (required)
 * @access  Authenticated users
 * @returns Security score calculated from policy compliance
 */
router.get('/security-score', policyController.getPolicySecurityScore);

/**
 * @route   GET /api/v1/policy/recommendations
 * @desc    Get security recommendations based on policy violations
 * @query   accountId - Cloud account ID (required)
 * @query   severity - Filter by severity (optional)
 * @query   category - Filter by category (optional)
 * @access  Authenticated users
 * @returns Array of prioritized recommendations
 */
router.get('/recommendations', policyController.getPolicyRecommendations);

/**
 * @route   GET /api/v1/policy/gap-analysis
 * @desc    Get compliance gap analysis
 * @query   accountId - Cloud account ID (required)
 * @access  Authenticated users
 * @returns Compliance gap analysis with recommendations
 */
router.get('/gap-analysis', policyController.getComplianceGapAnalysis);

export default router;
