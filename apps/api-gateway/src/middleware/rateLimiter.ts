import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter Configuration
 *
 * Protects endpoints from brute force attacks and abuse
 */

/**
 * Strict rate limiter for authentication endpoints
 * - 5 attempts per 15 minutes per IP
 * - Only failed attempts count (skipSuccessfulRequests: true)
 * - Used for login, register, password reset
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 failed attempts
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  },
  // Custom key generator using IP address
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if behind proxy, otherwise use req.ip
    return req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip || 'unknown';
  }
});

/**
 * Moderate rate limiter for sensitive operations
 * - 10 attempts per 15 minutes per IP
 * - Used for cloud account connections, API key generation
 */
export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Maximum 10 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again after 15 minutes',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  },
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip || 'unknown';
  }
});

/**
 * Global rate limiter for all API endpoints
 * - 100 requests per 15 minutes per IP
 * - Applies to all routes unless overridden
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Maximum 100 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  },
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip || 'unknown';
  },
  // Skip rate limiting for health checks
  skip: (req) => {
    return req.path === '/health' || req.path === '/api/health';
  }
});

/**
 * Lenient rate limiter for public endpoints
 * - 50 requests per 15 minutes per IP
 * - Used for public documentation, health checks
 */
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Maximum 50 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  },
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip || 'unknown';
  }
});
