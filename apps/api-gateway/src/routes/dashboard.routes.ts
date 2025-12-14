/**
 * Dashboard Routes
 * Endpoints for retrieving dashboard data
 */

import { Router } from 'express';
import * as dashboardController from '../modules/dashboard/controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/dashboard/overview
 * @desc    Get dashboard overview (resources, costs, security, alerts)
 * @query   accountId - Cloud account ID
 * @access  Authenticated users
 */
router.get('/overview', dashboardController.getOverview);

/**
 * @route   GET /api/v1/dashboard/health
 * @desc    Get health status (VMs, resources by location, recent activity)
 * @query   accountId - Cloud account ID
 * @access  Authenticated users
 */
router.get('/health', dashboardController.getHealthStatus);

export default router;
