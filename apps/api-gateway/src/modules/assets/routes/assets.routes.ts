/**
 * Assets Routes
 *
 * Defines REST API routes for cloud asset management and discovery.
 * All routes require authentication and enforce tenant isolation.
 *
 * Routes:
 * - GET    /api/v1/assets          - List assets (paginated, filterable)
 * - GET    /api/v1/assets/:id      - Get single asset details
 * - POST   /api/v1/assets/discover - Trigger manual asset discovery
 *
 * Rate Limits:
 * - Read operations (GET):    100 requests per 15 minutes
 * - Write operations (POST):  20 requests per 15 minutes
 *
 * Authentication:
 * - All routes require valid JWT token
 * - Tenant isolation enforced at controller level
 *
 * @module Assets/Routes
 */

import { Router } from 'express';
import { assetsController } from '../controllers/assets.controller';
import { authenticate } from '../../../middleware/auth';
import rateLimit from 'express-rate-limit';

// ============================================================
// Rate Limiter Configuration
// ============================================================

/**
 * Read rate limiter for GET endpoints
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
 * Write rate limiter for POST endpoints
 * - 20 requests per 15 minutes per IP
 */
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Maximum 20 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many write requests from this IP, please try again after 15 minutes',
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
// Routes Definition
// ============================================================

/**
 * @route   GET /api/v1/assets
 * @desc    List cloud assets with pagination, filtering, and sorting
 * @access  Authenticated users
 * @limit   100 requests per 15 minutes per IP
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - provider: Filter by provider ('AWS' | 'AZURE')
 * - resourceType: Filter by resource type
 * - region: Filter by region
 * - status: Filter by status ('active' | 'terminated')
 * - tags: Filter by tags (format: "key:value")
 * - sortBy: Sort field ('createdAt' | 'resourceType')
 * - sortOrder: Sort order ('asc' | 'desc')
 *
 * Example Request:
 * GET /api/v1/assets?page=1&limit=20&provider=AWS&status=active&sortBy=createdAt&sortOrder=desc
 *
 * Example Response:
 * {
 *   "success": true,
 *   "data": [...],
 *   "meta": {
 *     "page": 1,
 *     "limit": 20,
 *     "total": 50,
 *     "totalPages": 3
 *   }
 * }
 */
router.get('/', readLimiter, (req, res) => assetsController.list(req, res));

/**
 * @route   GET /api/v1/assets/:id
 * @desc    Get single cloud asset by ID
 * @access  Authenticated users (must belong to same tenant)
 * @limit   100 requests per 15 minutes per IP
 *
 * URL Parameters:
 * - id: Asset UUID
 *
 * Example Request:
 * GET /api/v1/assets/550e8400-e29b-41d4-a716-446655440000
 *
 * Example Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "550e8400-e29b-41d4-a716-446655440000",
 *     "tenantId": "tenant-uuid",
 *     "cloudAccountId": "account-uuid",
 *     "provider": "aws",
 *     "resourceType": "ec2_instance",
 *     "resourceId": "i-1234567890abcdef0",
 *     "name": "web-server-01",
 *     "region": "us-east-1",
 *     "zone": "us-east-1a",
 *     "status": "active",
 *     "tags": {...},
 *     "metadata": {...},
 *     "lastSeenAt": "2025-12-09T10:00:00.000Z"
 *   }
 * }
 *
 * Error Responses:
 * - 401 Unauthorized: User not authenticated
 * - 403 Forbidden: Asset belongs to different tenant
 * - 404 Not Found: Asset does not exist
 */
router.get('/:id', readLimiter, (req, res) => assetsController.get(req, res));

/**
 * @route   POST /api/v1/assets/discover
 * @desc    Trigger manual asset discovery for tenant
 * @access  Authenticated users
 * @limit   20 requests per 15 minutes per IP
 *
 * Request Body (optional):
 * {
 *   "cloudAccountId": "uuid" // Optional: Scope discovery to specific account
 * }
 *
 * Example Request:
 * POST /api/v1/assets/discover
 * Content-Type: application/json
 * {
 *   "cloudAccountId": "account-uuid-1"
 * }
 *
 * Example Response:
 * {
 *   "success": true,
 *   "data": {
 *     "assetsDiscovered": 25,
 *     "accountsProcessed": 2,
 *     "errors": [
 *       {
 *         "accountId": "account-uuid-2",
 *         "provider": "azure",
 *         "error": "Invalid credentials"
 *       }
 *     ]
 *   }
 * }
 *
 * Notes:
 * - Discovery runs synchronously (may take several seconds)
 * - Assets are automatically saved to database
 * - Stale assets are marked as terminated
 * - Errors per account are returned in response
 */
router.post('/discover', writeLimiter, (req, res) => assetsController.discover(req, res));

// ============================================================
// Export Router
// ============================================================

export default router;
