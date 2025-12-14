/**
 * Resources Routes
 * Endpoints for retrieving resource inventory and metadata
 */

import { Router } from 'express';
import * as resourcesController from '../modules/resources/controllers/resources.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
// Temporarily disabled for testing
// router.use(authenticate);

/**
 * @route   GET /api/v1/resources
 * @desc    Get resource inventory with filters and pagination
 * @query   accountId - Cloud account ID (required)
 * @query   resourceType - Filter by resource type (optional)
 * @query   location - Filter by location (optional)
 * @query   resourceGroup - Filter by resource group (optional)
 * @query   tags[key] - Filter by tags (optional, can be multiple)
 * @query   page - Page number (optional, default: 1)
 * @query   limit - Items per page (optional, default: 50, max: 100)
 * @access  Authenticated users
 */
router.get('/', resourcesController.getResourceInventory);

/**
 * @route   GET /api/v1/resources/metadata
 * @desc    Get resource metadata (types, locations, resource groups)
 * @query   accountId - Cloud account ID (required)
 * @access  Authenticated users
 */
router.get('/metadata', resourcesController.getResourceMetadata);

/**
 * @route   GET /api/v1/resources/search
 * @desc    Search resources by name, type, or location
 * @query   accountId - Cloud account ID (required)
 * @query   q - Search term (required)
 * @query   limit - Maximum results (optional, default: 100, max: 1000)
 * @access  Authenticated users
 */
router.get('/search', resourcesController.searchResources);

export default router;
