/**
 * Security Routes
 *
 * Defines REST API routes for security scanning and findings management.
 * All routes require authentication and enforce tenant isolation.
 *
 * Routes:
 * - GET    /api/v1/security/scans              - List security scans (paginated, filterable)
 * - GET    /api/v1/security/scans/:id          - Get single scan details
 * - POST   /api/v1/security/scans              - Trigger manual security scan
 * - GET    /api/v1/security/findings           - List security findings (paginated, filterable)
 * - GET    /api/v1/security/findings/:id       - Get single finding details
 * - PATCH  /api/v1/security/findings/:id/resolve - Mark finding as resolved
 * - PATCH  /api/v1/security/findings/:id/dismiss - Mark finding as dismissed
 * - GET    /api/v1/security/summary            - Get security summary statistics
 *
 * Rate Limits:
 * - Read operations (GET):       100 requests per 15 minutes
 * - Write operations (POST):     10 requests per 15 minutes (expensive operations)
 * - Update operations (PATCH):   20 requests per 15 minutes
 * - Summary operations (GET):    50 requests per 15 minutes
 *
 * Authentication:
 * - All routes require valid JWT token
 * - Tenant isolation enforced at controller level
 *
 * @module Security/Routes
 */

import { Router } from 'express';
import { securityController } from '../controllers/security.controller';
import { authenticate } from '../../../middleware/auth';
import rateLimit from 'express-rate-limit';

// ============================================================
// Rate Limiter Configuration
// ============================================================

/**
 * Read rate limiter for GET endpoints (scans and findings list/detail)
 * - 100 requests per 15 minutes per IP
 */
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Maximum 100 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again after 15 minutes',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip || 'unknown';
  },
});

/**
 * Write rate limiter for POST endpoints (trigger scans)
 * - 10 requests per 15 minutes per IP
 * - Scans are expensive operations that consume cloud provider API quotas
 */
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Maximum 10 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many scan requests from this IP, please try again after 15 minutes',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip || 'unknown';
  },
});

/**
 * Update rate limiter for PATCH endpoints (resolve/dismiss findings)
 * - 20 requests per 15 minutes per IP
 */
const updateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Maximum 20 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many update requests from this IP, please try again after 15 minutes',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip || 'unknown';
  },
});

/**
 * Summary rate limiter for GET /summary endpoint
 * - 50 requests per 15 minutes per IP
 * - Summary calculations can be computationally expensive
 */
const summaryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Maximum 50 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many summary requests from this IP, please try again after 15 minutes',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip || 'unknown';
  },
});

// ============================================================
// Router Configuration
// ============================================================

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// ============================================================
// Routes Definition - Scans
// ============================================================

/**
 * @route   GET /api/v1/security/scans
 * @desc    List security scans with pagination, filtering, and sorting
 * @access  Authenticated users
 * @limit   100 requests per 15 minutes per IP
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - status: Filter by status ('running' | 'completed' | 'failed')
 * - cloudAccountId: Filter by cloud account UUID
 * - startDate: Filter by start date (ISO 8601)
 * - endDate: Filter by end date (ISO 8601)
 * - sortBy: Sort field ('startedAt' | 'findingsCount')
 * - sortOrder: Sort order ('asc' | 'desc')
 *
 * Example Request:
 * GET /api/v1/security/scans?page=1&limit=20&status=completed&sortBy=startedAt&sortOrder=desc
 *
 * Example Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "tenantId": "uuid",
 *       "cloudAccountId": "uuid",
 *       "provider": "aws",
 *       "scanType": "full",
 *       "framework": ["CIS", "NIST"],
 *       "startedAt": "2025-12-09T10:00:00.000Z",
 *       "completedAt": "2025-12-09T10:30:00.000Z",
 *       "status": "completed",
 *       "findingsCount": 15,
 *       "criticalCount": 2,
 *       "highCount": 5,
 *       "mediumCount": 6,
 *       "lowCount": 2,
 *       "error": null,
 *       "cloudAccount": {
 *         "accountName": "Production AWS",
 *         "provider": "aws"
 *       }
 *     }
 *   ],
 *   "meta": {
 *     "page": 1,
 *     "limit": 20,
 *     "total": 50,
 *     "totalPages": 3
 *   }
 * }
 */
router.get('/scans', readLimiter, (req, res) => securityController.listScans(req, res));

/**
 * @route   GET /api/v1/security/scans/:id
 * @desc    Get single security scan by ID
 * @access  Authenticated users (must belong to same tenant)
 * @limit   100 requests per 15 minutes per IP
 *
 * URL Parameters:
 * - id: Scan UUID
 *
 * Example Request:
 * GET /api/v1/security/scans/550e8400-e29b-41d4-a716-446655440000
 *
 * Example Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "550e8400-e29b-41d4-a716-446655440000",
 *     "tenantId": "tenant-uuid",
 *     "cloudAccountId": "account-uuid",
 *     "provider": "aws",
 *     "scanType": "full",
 *     "framework": ["CIS"],
 *     "startedAt": "2025-12-09T10:00:00.000Z",
 *     "completedAt": "2025-12-09T10:30:00.000Z",
 *     "status": "completed",
 *     "findingsCount": 15,
 *     "criticalCount": 2,
 *     "highCount": 5,
 *     "mediumCount": 6,
 *     "lowCount": 2,
 *     "error": null,
 *     "cloudAccount": {
 *       "accountName": "Production AWS",
 *       "provider": "aws"
 *     }
 *   }
 * }
 *
 * Error Responses:
 * - 401 Unauthorized: User not authenticated
 * - 403 Forbidden: Scan belongs to different tenant
 * - 404 Not Found: Scan does not exist
 */
router.get('/scans/:id', readLimiter, (req, res) => securityController.getScan(req, res));

/**
 * @route   POST /api/v1/security/scans
 * @desc    Trigger manual security scan for tenant
 * @access  Authenticated users
 * @limit   10 requests per 15 minutes per IP
 *
 * Request Body (optional):
 * {
 *   "cloudAccountId": "uuid" // Optional: Scope scan to specific account
 * }
 *
 * Example Request:
 * POST /api/v1/security/scans
 * Content-Type: application/json
 * {
 *   "cloudAccountId": "account-uuid-1"
 * }
 *
 * Example Response:
 * {
 *   "success": true,
 *   "data": {
 *     "jobId": "scan-1234567890",
 *     "status": "queued",
 *     "message": "Security scan triggered successfully"
 *   }
 * }
 *
 * Notes:
 * - Scans are queued asynchronously and processed by background workers
 * - This is an expensive operation that consumes cloud provider API quotas
 * - Rate limiting is strict to prevent abuse (10 requests per 15 minutes)
 * - Use GET /api/v1/security/scans/:id to check scan progress
 */
router.post('/scans', writeLimiter, (req, res) => securityController.triggerScan(req, res));

// ============================================================
// Routes Definition - Findings
// ============================================================

/**
 * @route   GET /api/v1/security/findings
 * @desc    List security findings with pagination, filtering, and sorting
 * @access  Authenticated users
 * @limit   100 requests per 15 minutes per IP
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - severity: Filter by severity ('critical' | 'high' | 'medium' | 'low')
 * - category: Filter by category/framework
 * - status: Filter by status ('open' | 'resolved' | 'dismissed')
 * - cloudAccountId: Filter by cloud account UUID
 * - resourceType: Filter by resource type
 * - scanId: Filter by scan UUID
 * - sortBy: Sort field ('severity' | 'detectedAt')
 * - sortOrder: Sort order ('asc' | 'desc')
 *
 * Example Request:
 * GET /api/v1/security/findings?page=1&limit=20&severity=critical&status=open&sortBy=severity&sortOrder=desc
 *
 * Example Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "tenantId": "uuid",
 *       "scanId": "uuid",
 *       "assetId": "uuid",
 *       "ruleCode": "CIS-1.1",
 *       "framework": "CIS",
 *       "severity": "critical",
 *       "status": "open",
 *       "provider": "aws",
 *       "resourceType": "s3_bucket",
 *       "title": "S3 bucket is publicly accessible",
 *       "description": "...",
 *       "remediation": "...",
 *       "evidence": {...},
 *       "detectedAt": "2025-12-09T10:00:00.000Z",
 *       "resolvedAt": null,
 *       "cloudAccount": {
 *         "accountName": "Production AWS",
 *         "provider": "aws"
 *       },
 *       "scan": {
 *         "scanType": "full",
 *         "startedAt": "2025-12-09T10:00:00.000Z"
 *       }
 *     }
 *   ],
 *   "meta": {
 *     "page": 1,
 *     "limit": 20,
 *     "total": 50,
 *     "totalPages": 3
 *   }
 * }
 */
router.get('/findings', readLimiter, (req, res) => securityController.listFindings(req, res));

/**
 * @route   GET /api/v1/security/findings/:id
 * @desc    Get single security finding by ID
 * @access  Authenticated users (must belong to same tenant)
 * @limit   100 requests per 15 minutes per IP
 *
 * URL Parameters:
 * - id: Finding UUID
 *
 * Example Request:
 * GET /api/v1/security/findings/550e8400-e29b-41d4-a716-446655440000
 *
 * Example Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "550e8400-e29b-41d4-a716-446655440000",
 *     "tenantId": "tenant-uuid",
 *     "scanId": "scan-uuid",
 *     "assetId": "asset-uuid",
 *     "ruleCode": "CIS-1.1",
 *     "framework": "CIS",
 *     "severity": "high",
 *     "status": "open",
 *     "provider": "aws",
 *     "resourceType": "s3_bucket",
 *     "title": "S3 bucket is publicly accessible",
 *     "description": "...",
 *     "remediation": "...",
 *     "evidence": {...},
 *     "detectedAt": "2025-12-09T10:00:00.000Z",
 *     "resolvedAt": null
 *   }
 * }
 *
 * Error Responses:
 * - 401 Unauthorized: User not authenticated
 * - 403 Forbidden: Finding belongs to different tenant
 * - 404 Not Found: Finding does not exist
 */
router.get('/findings/:id', readLimiter, (req, res) => securityController.getFinding(req, res));

/**
 * @route   PATCH /api/v1/security/findings/:id/resolve
 * @desc    Mark security finding as resolved
 * @access  Authenticated users (must belong to same tenant)
 * @limit   20 requests per 15 minutes per IP
 *
 * URL Parameters:
 * - id: Finding UUID
 *
 * Request Body (optional):
 * {
 *   "notes": "Fixed by updating bucket policy" // Optional
 * }
 *
 * Example Request:
 * PATCH /api/v1/security/findings/550e8400-e29b-41d4-a716-446655440000/resolve
 * Content-Type: application/json
 * {
 *   "notes": "Fixed by updating bucket policy"
 * }
 *
 * Example Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "550e8400-e29b-41d4-a716-446655440000",
 *     "status": "resolved",
 *     "resolvedAt": "2025-12-09T10:00:00.000Z"
 *   }
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Finding is already resolved
 * - 401 Unauthorized: User not authenticated
 * - 403 Forbidden: Finding belongs to different tenant
 * - 404 Not Found: Finding does not exist
 *
 * Notes:
 * - Updates status to 'resolved' and sets resolvedAt timestamp
 * - Emits 'security.finding.resolved' event for audit logging
 * - Optional notes are stored for documentation purposes
 */
router.patch('/findings/:id/resolve', updateLimiter, (req, res) => securityController.resolveFinding(req, res));

/**
 * @route   PATCH /api/v1/security/findings/:id/dismiss
 * @desc    Mark security finding as dismissed (accepted risk)
 * @access  Authenticated users (must belong to same tenant)
 * @limit   20 requests per 15 minutes per IP
 *
 * URL Parameters:
 * - id: Finding UUID
 *
 * Request Body:
 * {
 *   "reason": "Accepted risk - legacy system" // Required
 * }
 *
 * Example Request:
 * PATCH /api/v1/security/findings/550e8400-e29b-41d4-a716-446655440000/dismiss
 * Content-Type: application/json
 * {
 *   "reason": "Accepted risk - legacy system scheduled for decommission"
 * }
 *
 * Example Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "550e8400-e29b-41d4-a716-446655440000",
 *     "status": "dismissed"
 *   }
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Reason is required
 * - 401 Unauthorized: User not authenticated
 * - 403 Forbidden: Finding belongs to different tenant
 * - 404 Not Found: Finding does not exist
 *
 * Notes:
 * - Updates status to 'dismissed' (accepted risk)
 * - Reason is required for audit trail and compliance
 * - Emits 'security.finding.dismissed' event for audit logging
 * - Dismissed findings are excluded from open findings count
 */
router.patch('/findings/:id/dismiss', updateLimiter, (req, res) => securityController.dismissFinding(req, res));

// ============================================================
// Routes Definition - Summary
// ============================================================

/**
 * @route   GET /api/v1/security/summary
 * @desc    Get security summary statistics for tenant
 * @access  Authenticated users
 * @limit   50 requests per 15 minutes per IP
 *
 * Example Request:
 * GET /api/v1/security/summary
 *
 * Example Response:
 * {
 *   "success": true,
 *   "data": {
 *     "scansLast30Days": 15,
 *     "openFindingsBySeverity": {
 *       "critical": 5,
 *       "high": 12,
 *       "medium": 25,
 *       "low": 8
 *     },
 *     "findingsByCategory": [
 *       { "category": "CIS", "count": 30 },
 *       { "category": "NIST", "count": 20 }
 *     ],
 *     "recentScans": [
 *       {
 *         "id": "uuid",
 *         "provider": "aws",
 *         "scanType": "full",
 *         "status": "completed",
 *         "findingsCount": 15,
 *         "startedAt": "2025-12-09T10:00:00.000Z"
 *       }
 *     ],
 *     "trendData": [
 *       {
 *         "date": "2025-12-09",
 *         "criticalCount": 2,
 *         "highCount": 5,
 *         "mediumCount": 6,
 *         "lowCount": 2
 *       }
 *     ]
 *   }
 * }
 *
 * Notes:
 * - Summary includes scans from last 30 days
 * - Trend data covers last 7 days
 * - Recent scans limited to last 5
 * - Statistics are calculated in real-time
 * - May be computationally expensive for large datasets
 */
router.get('/summary', summaryLimiter, (req, res) => securityController.getSummary(req, res));

// ============================================================
// Export Router
// ============================================================

export default router;
