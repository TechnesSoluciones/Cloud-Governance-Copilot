import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

/**
 * Rate limiter for user management endpoints
 * 50 requests per 15 minutes
 */
const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  keyGenerator: (req) => {
    return (
      req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
      req.ip ||
      'unknown'
    );
  },
});

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, userLimiter, (req, res) =>
  userController.getCurrentUser(req, res)
);

/**
 * @route   GET /api/v1/users
 * @desc    List users with filters
 * @access  Private (admin or self)
 * @query   role, status, search, limit, offset
 */
router.get('/', authenticate, userLimiter, (req, res) =>
  userController.listUsers(req, res)
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Private (admin or self)
 */
router.get('/:id', authenticate, userLimiter, (req, res) =>
  userController.getUserById(req, res)
);

/**
 * @route   POST /api/v1/users
 * @desc    Create new user
 * @access  Private (admin only)
 */
router.post('/', authenticate, authorize('admin'), userLimiter, (req, res) =>
  userController.createUser(req, res)
);

/**
 * @route   PATCH /api/v1/users/:id
 * @desc    Update user
 * @access  Private (admin or self with restrictions)
 */
router.patch('/:id', authenticate, userLimiter, (req, res) =>
  userController.updateUser(req, res)
);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user (soft delete)
 * @access  Private (admin only)
 */
router.delete('/:id', authenticate, authorize('admin'), userLimiter, (req, res) =>
  userController.deleteUser(req, res)
);

export default router;
