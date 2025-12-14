import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { emailVerificationController } from '../controllers/emailVerification.controller';
import { mfaController } from '../controllers/mfa.controller';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import rateLimit from 'express-rate-limit';

const router = Router();

/**
 * Strict rate limiter for password reset request
 * 3 attempts per hour per IP (anti-spam)
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many password reset requests. Please try again later.',
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
 * Rate limiter for password reset completion
 * 5 attempts per hour per IP
 */
const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many password reset attempts. Please try again later.',
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
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 * @limit   5 attempts per 15 minutes per IP
 */
router.post('/register', authLimiter, (req, res) => authController.register(req, res));

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 * @limit   5 attempts per 15 minutes per IP
 */
router.post('/login', authLimiter, (req, res) => authController.login(req, res));

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 * @limit   5 attempts per 15 minutes per IP
 */
router.post('/refresh', authLimiter, (req, res) => authController.refresh(req, res));

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticate, (req, res) => authController.me(req, res));

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 * @limit   3 attempts per hour per IP
 */
router.post('/forgot-password', forgotPasswordLimiter, (req, res) =>
  authController.forgotPassword(req, res)
);

/**
 * @route   GET /api/v1/auth/verify-reset-token/:token
 * @desc    Verify password reset token
 * @access  Public
 * @limit   No rate limit (needed for UX)
 */
router.get('/verify-reset-token/:token', (req, res) =>
  authController.verifyResetToken(req, res)
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 * @limit   5 attempts per hour per IP
 */
router.post('/reset-password', resetPasswordLimiter, (req, res) =>
  authController.resetPassword(req, res)
);

/**
 * Rate limiter for email verification sending
 * 3 attempts per hour per IP (anti-spam)
 */
const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many email verification requests. Please try again later.',
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
 * Rate limiter for MFA verification attempts
 * 5 attempts per 15 minutes per IP
 */
const mfaVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many MFA verification attempts. Please try again later.',
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

// ============================================================
// EMAIL VERIFICATION ROUTES
// ============================================================

/**
 * @route   POST /api/v1/auth/send-verification
 * @desc    Send email verification link
 * @access  Private (requires authentication)
 * @limit   3 attempts per hour per IP
 */
router.post('/send-verification', authenticate, emailVerificationLimiter, (req, res) =>
  emailVerificationController.sendVerification(req, res)
);

/**
 * @route   GET /api/v1/auth/verify-email/:token
 * @desc    Verify email with token
 * @access  Public
 */
router.get('/verify-email/:token', (req, res) =>
  emailVerificationController.verifyEmail(req, res)
);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Private (requires authentication)
 * @limit   3 attempts per hour per IP
 */
router.post('/resend-verification', authenticate, emailVerificationLimiter, (req, res) =>
  emailVerificationController.resendVerification(req, res)
);

// ============================================================
// MFA ROUTES
// ============================================================

/**
 * @route   POST /api/v1/auth/mfa/setup
 * @desc    Initialize MFA setup (returns QR code and secret)
 * @access  Private (requires authentication)
 */
router.post('/mfa/setup', authenticate, (req, res) => mfaController.setupMFA(req, res));

/**
 * @route   POST /api/v1/auth/mfa/verify-setup
 * @desc    Verify MFA setup with token (enables MFA)
 * @access  Private (requires authentication)
 * @limit   5 attempts per 15 minutes per IP
 */
router.post('/mfa/verify-setup', authenticate, mfaVerificationLimiter, (req, res) =>
  mfaController.verifySetup(req, res)
);

/**
 * @route   POST /api/v1/auth/mfa/verify
 * @desc    Verify MFA token during login
 * @access  Public (used during login flow)
 * @limit   5 attempts per 15 minutes per IP
 */
router.post('/mfa/verify', mfaVerificationLimiter, (req, res) =>
  mfaController.verifyMFA(req, res)
);

/**
 * @route   POST /api/v1/auth/mfa/disable
 * @desc    Disable MFA (requires password + token)
 * @access  Private (requires authentication)
 */
router.post('/mfa/disable', authenticate, (req, res) => mfaController.disableMFA(req, res));

/**
 * @route   POST /api/v1/auth/mfa/backup-codes
 * @desc    Regenerate backup codes
 * @access  Private (requires authentication)
 */
router.post('/mfa/backup-codes', authenticate, (req, res) =>
  mfaController.regenerateBackupCodes(req, res)
);

export default router;
