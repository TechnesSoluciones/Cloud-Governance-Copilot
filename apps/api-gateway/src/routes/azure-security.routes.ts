/**
 * Azure Security Routes
 * API endpoints for Azure Security Center (Microsoft Defender for Cloud)
 *
 * All endpoints require authentication via JWT token
 *
 * Base path: /api/v1/security/azure
 */

import { Router } from 'express';
import * as azureSecurityController from '../modules/security/controllers/azure-security.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/security/azure/score
 * @desc    Get security score for an Azure subscription
 * @query   accountId - Cloud account ID (required)
 * @query   includeBreakdown - Include control-level breakdown (optional, default: false)
 * @access  Authenticated users
 *
 * @example
 * GET /api/v1/security/azure/score?accountId=abc123&includeBreakdown=true
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "displayName": "Overall Security Score",
 *     "score": {
 *       "current": 45,
 *       "max": 60,
 *       "percentage": 75
 *     },
 *     "weight": 100,
 *     "breakdown": [
 *       {
 *         "displayName": "Network Security",
 *         "score": { "current": 10, "max": 15, "percentage": 67 },
 *         "weight": 25
 *       }
 *     ]
 *   },
 *   "meta": {
 *     "accountId": "abc123",
 *     "timestamp": "2025-12-15T10:00:00.000Z"
 *   }
 * }
 */
router.get('/score', azureSecurityController.getSecurityScore);

/**
 * @route   GET /api/v1/security/azure/assessments
 * @desc    Get security assessments with filtering and pagination
 * @query   accountId - Cloud account ID (required)
 * @query   severity - Filter by severity (optional, comma-separated: critical,high,medium,low,informational)
 * @query   status - Filter by status (optional: Healthy, Unhealthy, NotApplicable)
 * @query   resourceType - Filter by resource type (optional)
 * @query   limit - Items per page (optional, default: 50, max: 500)
 * @query   offset - Pagination offset (optional, default: 0)
 * @query   sortBy - Sort field (optional: severity, displayName, status)
 * @query   sortOrder - Sort order (optional: asc, desc, default: desc)
 * @access  Authenticated users
 *
 * @example
 * GET /api/v1/security/azure/assessments?accountId=abc123&severity=high,critical&status=Unhealthy&limit=20
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "assessment-id",
 *       "name": "assessment-name",
 *       "displayName": "VM should have disk encryption enabled",
 *       "description": "...",
 *       "severity": "high",
 *       "status": "Unhealthy",
 *       "resourceId": "/subscriptions/.../providers/Microsoft.Compute/virtualMachines/vm1",
 *       "resourceType": "Microsoft.Compute/virtualMachines",
 *       "remediation": "Enable Azure Disk Encryption...",
 *       "category": "Compute",
 *       "compliance": ["CIS", "PCI-DSS"],
 *       "metadata": {
 *         "assessmentType": "BuiltIn",
 *         "implementationEffort": "Low",
 *         "userImpact": "Low",
 *         "threats": ["DataBreach"]
 *       }
 *     }
 *   ],
 *   "pagination": {
 *     "total": 125,
 *     "limit": 20,
 *     "offset": 0,
 *     "hasMore": true
 *   },
 *   "filters": {
 *     "severity": ["high", "critical"],
 *     "status": "Unhealthy"
 *   },
 *   "meta": {
 *     "accountId": "abc123",
 *     "timestamp": "2025-12-15T10:00:00.000Z"
 *   }
 * }
 */
router.get('/assessments', azureSecurityController.getSecurityAssessments);

/**
 * @route   GET /api/v1/security/azure/compliance
 * @desc    Get compliance status for regulatory standards
 * @query   accountId - Cloud account ID (required)
 * @access  Authenticated users
 *
 * @example
 * GET /api/v1/security/azure/compliance?accountId=abc123
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "standardName": "Azure CIS 1.4.0",
 *       "passedControls": 85,
 *       "failedControls": 12,
 *       "skippedControls": 3,
 *       "totalControls": 100,
 *       "compliancePercentage": 85
 *     },
 *     {
 *       "standardName": "PCI DSS 3.2.1",
 *       "passedControls": 120,
 *       "failedControls": 15,
 *       "skippedControls": 5,
 *       "totalControls": 140,
 *       "compliancePercentage": 86
 *     }
 *   ],
 *   "summary": {
 *     "totalStandards": 2,
 *     "averageCompliance": 86,
 *     "criticalFailures": 27
 *   },
 *   "meta": {
 *     "accountId": "abc123",
 *     "timestamp": "2025-12-15T10:00:00.000Z"
 *   }
 * }
 */
router.get('/compliance', azureSecurityController.getComplianceResults);

/**
 * @route   GET /api/v1/security/azure/recommendations
 * @desc    Get prioritized security recommendations
 * @query   accountId - Cloud account ID (required)
 * @query   severity - Filter by severity (optional, comma-separated: critical,high,medium,low,informational)
 * @query   category - Filter by category (optional)
 * @query   limit - Items per page (optional, default: 50, max: 200)
 * @query   offset - Pagination offset (optional, default: 0)
 * @query   sortBy - Sort field (optional: priority, severity, affectedResources, default: priority)
 * @query   sortOrder - Sort order (optional: asc, desc, default: desc)
 * @access  Authenticated users
 *
 * @example
 * GET /api/v1/security/azure/recommendations?accountId=abc123&severity=high,critical&limit=10
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "recommendation-id",
 *       "title": "Enable Azure Disk Encryption on virtual machines",
 *       "description": "Virtual machines without encryption are at risk...",
 *       "severity": "high",
 *       "category": "Compute",
 *       "impact": "Security high severity issue",
 *       "remediation": "1. Navigate to VM settings\n2. Enable encryption...",
 *       "affectedResources": 3,
 *       "estimatedEffort": "Low",
 *       "securityImpact": "High",
 *       "complianceStandards": ["CIS", "PCI-DSS", "ISO 27001"],
 *       "priority": 85
 *     }
 *   ],
 *   "summary": {
 *     "total": 45,
 *     "bySeverity": {
 *       "critical": 5,
 *       "high": 12,
 *       "medium": 20,
 *       "low": 8,
 *       "informational": 0
 *     },
 *     "byCategory": {
 *       "Compute": 15,
 *       "Network": 12,
 *       "Data": 10,
 *       "Identity": 8
 *     }
 *   },
 *   "pagination": {
 *     "limit": 10,
 *     "offset": 0,
 *     "hasMore": true
 *   },
 *   "meta": {
 *     "accountId": "abc123",
 *     "timestamp": "2025-12-15T10:00:00.000Z"
 *   }
 * }
 */
router.get('/recommendations', azureSecurityController.getRecommendations);

export default router;
