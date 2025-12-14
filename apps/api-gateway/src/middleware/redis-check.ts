import { Request, Response, NextFunction } from 'express';
import { isRedisAvailable, getRedisHealthStatus } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * Redis Availability Middleware
 *
 * Protects routes that require Redis to function properly.
 * Returns 503 Service Unavailable if Redis is not available.
 *
 * Usage:
 * ```typescript
 * import { requireRedis } from '../middleware/redis-check';
 *
 * // Apply to specific routes
 * router.post('/api/v1/sessions', requireRedis, sessionController.create);
 *
 * // Or apply to entire route group
 * router.use('/api/v1/cache', requireRedis);
 * ```
 */

/**
 * Middleware to check if Redis is available
 * Returns 503 with Retry-After header if unavailable
 */
export const requireRedis = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!isRedisAvailable()) {
    const redisHealth = getRedisHealthStatus();

    // Determine retry-after time based on connection state
    const retryAfterSeconds = redisHealth.status === 'connecting' ? 5 : 30;

    logger.warn('Request blocked due to Redis unavailability', {
      path: req.path,
      method: req.method,
      redisStatus: redisHealth.status,
      retryCount: redisHealth.details.retryCount,
    });

    res.status(503)
      .set('Retry-After', String(retryAfterSeconds))
      .json({
        error: 'Service Temporarily Unavailable',
        message: 'Redis cache is currently unavailable. Please retry in a few seconds.',
        status: redisHealth.status,
        retryAfter: retryAfterSeconds,
        details: {
          connectionState: redisHealth.status,
          retrying: redisHealth.status === 'connecting',
        },
      });
    return;
  }

  next();
};

/**
 * Middleware to check Redis availability but allow degraded operation
 * Adds redis availability flag to request object for conditional logic
 */
export const checkRedis = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Add Redis availability info to request for downstream handlers
  (req as any).redisAvailable = isRedisAvailable();

  if (!isRedisAvailable()) {
    const redisHealth = getRedisHealthStatus();
    logger.debug('Request proceeding with Redis unavailable', {
      path: req.path,
      method: req.method,
      redisStatus: redisHealth.status,
    });
  }

  next();
};

/**
 * Type guard to check if request has Redis availability info
 */
export interface RequestWithRedis extends Request {
  redisAvailable: boolean;
}
