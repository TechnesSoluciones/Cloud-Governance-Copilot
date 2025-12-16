/**
 * Incidents API Routes
 *
 * Defines HTTP endpoints for incident management
 *
 * Endpoints:
 * - GET /api/v1/incidents/alerts - List alerts with filtering
 * - GET /api/v1/incidents/activity-logs - List activity logs
 * - GET /api/v1/incidents - List incidents
 * - GET /api/v1/incidents/:id - Get incident details
 * - PATCH /api/v1/incidents/:id/status - Update incident status
 * - POST /api/v1/incidents/:id/comments - Add comment to incident
 * - GET /api/v1/incidents/metrics/:resourceId - Get resource metrics
 *
 * @module modules/incidents/routes
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as incidentsController from '../controllers/incidents.controller';

const router = Router();

// Rate limiter: 30 requests per 15 minutes
const incidentsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests
  message: 'Too many requests to incident management API, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all routes
router.use(incidentsLimiter);

// Authentication middleware (should be applied at app level)
// Assumes req.user is populated with { userId, tenantId }

/**
 * GET /api/v1/incidents/alerts
 *
 * Get alerts with optional filtering
 *
 * Query params:
 * - accountId (required): Azure account ID
 * - severity (optional): Comma-separated list (critical, high, medium, low)
 * - status (optional): Comma-separated list (active, resolved, suppressed)
 * - resourceType (optional): Resource type filter
 * - startDate (optional): ISO date string
 * - endDate (optional): ISO date string
 * - page (optional): Page number (default: 1)
 * - pageSize (optional): Page size (default: 50)
 *
 * Response:
 * {
 *   alerts: Alert[],
 *   total: number,
 *   page: number,
 *   pageSize: number,
 *   hasMore: boolean
 * }
 */
router.get('/alerts', incidentsController.getAlerts);

/**
 * GET /api/v1/incidents/activity-logs
 *
 * Get activity logs with filtering
 *
 * Query params:
 * - accountId (required): Azure account ID
 * - startDate (required): ISO date string
 * - endDate (required): ISO date string
 * - status (optional): Comma-separated list (Succeeded, Failed, InProgress)
 * - level (optional): Comma-separated list (Critical, Error, Warning, Informational)
 * - operationName (optional): Specific operation filter
 * - page (optional): Page number (default: 1)
 * - pageSize (optional): Page size (default: 100)
 *
 * Response:
 * {
 *   logs: ActivityLog[],
 *   total: number,
 *   page: number,
 *   pageSize: number,
 *   hasMore: boolean
 * }
 */
router.get('/activity-logs', incidentsController.getActivityLogs);

/**
 * GET /api/v1/incidents
 *
 * Get incidents with filtering
 *
 * Query params:
 * - accountId (required): Azure account ID
 * - status (optional): Comma-separated list (new, acknowledged, investigating, resolved, closed)
 * - severity (optional): Comma-separated list (critical, high, medium, low)
 * - assignedTo (optional): User ID
 * - page (optional): Page number (default: 1)
 * - pageSize (optional): Page size (default: 20)
 *
 * Response:
 * {
 *   incidents: Incident[],
 *   total: number,
 *   page: number,
 *   pageSize: number,
 *   hasMore: boolean
 * }
 */
router.get('/', incidentsController.getIncidents);

/**
 * GET /api/v1/incidents/:id
 *
 * Get incident by ID with full details
 *
 * Includes:
 * - Incident data
 * - Related alerts
 * - Related activity logs
 * - Comments
 * - Timeline
 *
 * Response: Incident
 */
router.get('/:id', incidentsController.getIncidentById);

/**
 * PATCH /api/v1/incidents/:id/status
 *
 * Update incident status
 *
 * Body:
 * {
 *   status: 'acknowledged' | 'investigating' | 'resolved' | 'closed',
 *   notes?: string,
 *   assignedTo?: string
 * }
 *
 * Response: Incident
 */
router.patch('/:id/status', incidentsController.updateIncidentStatus);

/**
 * POST /api/v1/incidents/:id/comments
 *
 * Add comment to incident
 *
 * Body:
 * {
 *   comment: string
 * }
 *
 * Response: Comment
 */
router.post('/:id/comments', incidentsController.addComment);

/**
 * GET /api/v1/incidents/metrics/:resourceId
 *
 * Get metrics for a specific resource
 *
 * Query params:
 * - accountId (required): Azure account ID
 * - metricNames (required): Comma-separated list (e.g., "Percentage CPU,Network In Total")
 * - startDate (required): ISO date string
 * - endDate (required): ISO date string
 * - aggregation (optional): Average, Minimum, Maximum, Total, Count (default: Average)
 * - interval (optional): ISO 8601 duration (default: PT5M)
 *
 * Response:
 * {
 *   metrics: MetricResult[]
 * }
 */
router.get('/metrics/:resourceId', incidentsController.getResourceMetrics);

export default router;
