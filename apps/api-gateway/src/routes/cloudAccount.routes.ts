import { Router } from 'express';
import { cloudAccountController } from '../controllers/cloudAccount.controller';
import { authenticate, authorize } from '../middleware/auth';
import { sensitiveLimiter } from '../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/cloud-accounts
 * @desc    Create a new cloud account
 * @access  Admin only
 * @limit   10 requests per 15 minutes per IP
 */
router.post(
  '/',
  authorize('admin'),
  sensitiveLimiter,
  (req, res) => cloudAccountController.create(req, res)
);

/**
 * @route   GET /api/v1/cloud-accounts
 * @desc    Get all cloud accounts for tenant
 * @access  Authenticated users
 */
router.get('/', (req, res) => cloudAccountController.list(req, res));

/**
 * @route   GET /api/v1/cloud-accounts/:id
 * @desc    Get cloud account by ID
 * @access  Authenticated users
 */
router.get('/:id', (req, res) => cloudAccountController.getById(req, res));

/**
 * @route   PUT /api/v1/cloud-accounts/:id/credentials
 * @desc    Update cloud account credentials
 * @access  Admin only
 * @limit   10 requests per 15 minutes per IP
 */
router.put(
  '/:id/credentials',
  authorize('admin'),
  sensitiveLimiter,
  (req, res) => cloudAccountController.updateCredentials(req, res)
);

/**
 * @route   DELETE /api/v1/cloud-accounts/:id
 * @desc    Delete cloud account
 * @access  Admin only
 */
router.delete(
  '/:id',
  authorize('admin'),
  (req, res) => cloudAccountController.delete(req, res)
);

/**
 * @route   POST /api/v1/cloud-accounts/:id/test
 * @desc    Test cloud account connection
 * @access  Authenticated users
 * @limit   10 requests per 15 minutes per IP
 */
router.post(
  '/:id/test',
  sensitiveLimiter,
  (req, res) => cloudAccountController.testConnection(req, res)
);

export default router;
