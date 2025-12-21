/**
 * Tenant Context Middleware
 *
 * CRITICAL SECURITY MIDDLEWARE: Injects tenant context into async local storage
 * for automatic tenant isolation in database queries.
 *
 * This middleware MUST be applied AFTER the authenticate middleware and BEFORE
 * any route handlers that access the database.
 *
 * Flow:
 * 1. Request comes in with JWT token
 * 2. authenticate middleware validates token and sets req.user
 * 3. THIS middleware extracts tenantId from req.user
 * 4. Sets tenant context using AsyncLocalStorage
 * 5. All Prisma queries in the request chain are automatically filtered by tenantId
 *
 * Architecture Pattern: Async Context Propagation
 * - Uses Node.js AsyncLocalStorage to pass tenant ID through async call chains
 * - No need to explicitly pass tenantId to every service/repository
 * - Tenant isolation is automatic and transparent
 *
 * Usage:
 * ```typescript
 * import { authenticate } from './middleware/auth';
 * import { injectTenantContext } from './middleware/tenant-context';
 *
 * // Apply to protected routes
 * app.use('/api/v1/users', authenticate, injectTenantContext, userRoutes);
 * ```
 *
 * @module middleware/tenant-context
 */

import { Request, Response, NextFunction } from 'express';
import { setTenantContext } from '../lib/prisma';

/**
 * Express middleware that injects tenant context from authenticated user
 *
 * IMPORTANT: This middleware depends on req.user being set by authenticate middleware.
 * It must be used AFTER authenticate middleware in the middleware chain.
 *
 * @param req - Express request with user property (set by authenticate middleware)
 * @param res - Express response
 * @param next - Express next function
 *
 * @example
 * ```typescript
 * // Correct usage (tenant context is set)
 * app.use('/api/v1/protected', authenticate, injectTenantContext, protectedRoutes);
 *
 * // Incorrect usage (will fail - no req.user)
 * app.use('/api/v1/protected', injectTenantContext, protectedRoutes); // ❌ Missing authenticate
 * ```
 */
export function injectTenantContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Ensure user is authenticated (this should never happen if middleware order is correct)
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
      },
    });
    return;
  }

  // Ensure tenant ID exists in user payload
  if (!req.user.tenantId) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Tenant ID not found in authentication token',
        code: 'TENANT_ID_MISSING',
      },
    });
    return;
  }

  // Set tenant context for the duration of this request
  // All async operations within this request will have access to the tenant ID
  setTenantContext(req.user.tenantId, () => {
    next();
  });
}

/**
 * Optional middleware for routes that should work with or without authentication
 * Sets tenant context only if user is authenticated
 *
 * Use this for routes that may return different data based on whether user is logged in,
 * but don't strictly require authentication.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 *
 * @example
 * ```typescript
 * // Public route that returns more data if user is authenticated
 * app.use('/api/v1/public-data', optionalTenantContext, publicDataRoutes);
 * ```
 */
export function optionalTenantContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If user is authenticated and has tenantId, set context
  if (req.user?.tenantId) {
    setTenantContext(req.user.tenantId, () => {
      next();
    });
  } else {
    // No tenant context - queries will run without tenant filtering
    // (Only allowed for models not requiring tenant isolation)
    next();
  }
}
