import { Request, Response, NextFunction } from 'express';
import auditService from '../services/audit.service';
import { AuditEventType, AuditSeverity } from '../types/audit.types';

/**
 * Audit Logger Middleware
 * Automatically logs requests to audit log
 */

/**
 * Extract IP address from request
 * Handles X-Forwarded-For header for proxied requests
 */
function getIpAddress(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = forwarded.toString().split(',');
    return ips[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Extract user agent from request
 */
function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'unknown';
}

/**
 * Audit logger middleware for authentication events
 * Should be called explicitly in auth controllers
 */
export async function auditAuthEvent(
  req: Request,
  action: AuditEventType,
  success: boolean,
  metadata?: Record<string, any>
): Promise<void> {
  const tenantId = req.user?.tenantId || 'unknown';
  const userId = req.user?.userId;
  const ipAddress = getIpAddress(req);
  const userAgent = getUserAgent(req);

  await auditService.logAuth(action, tenantId, userId, ipAddress, userAgent, success, metadata);
}

/**
 * Audit logger middleware for resource operations
 * Can be used as Express middleware
 */
export function auditResourceOperation(action: AuditEventType, resourceType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original res.json function
    const originalJson = res.json.bind(res);

    // Override res.json to log after response
    res.json = function (body: any): Response {
      // Log the operation (don't await to avoid delaying response)
      if (req.user && res.statusCode < 400) {
        const resourceId = req.params.id || body?.data?.id;
        const ipAddress = getIpAddress(req);

        auditService.logResourceOperation(
          action,
          req.user.tenantId,
          req.user.userId,
          resourceType,
          resourceId,
          ipAddress,
          {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          }
        ).catch((error) => {
          console.error('Failed to log audit event:', error);
        });
      }

      // Call original json function
      return originalJson(body);
    };

    next();
  };
}

/**
 * Audit logger for sensitive operations
 * Use this for operations that require audit logging
 */
export function auditSensitiveOperation(action: AuditEventType, severity: AuditSeverity = AuditSeverity.WARNING) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any): Response {
      if (req.user) {
        const success = res.statusCode < 400;
        const ipAddress = getIpAddress(req);

        auditService.logSecurityEvent(
          action,
          req.user.tenantId,
          req.user.userId,
          severity,
          ipAddress,
          {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            success,
          }
        ).catch((error) => {
          console.error('Failed to log security event:', error);
        });
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Generic audit logger middleware
 * Logs all authenticated requests
 */
export function auditAllRequests() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip health checks and public routes
    if (req.path === '/health' || req.path.startsWith('/api/v1/auth/login') || req.path.startsWith('/api/v1/auth/register')) {
      return next();
    }

    // Only log authenticated requests
    if (!req.user) {
      return next();
    }

    const originalJson = res.json.bind(res);

    res.json = function (body: any): Response {
      // Log after response (don't block)
      const ipAddress = getIpAddress(req);
      const userAgent = getUserAgent(req);
      const success = res.statusCode < 400;

      // Map HTTP methods to audit event types
      let action: AuditEventType | undefined;
      if (req.method === 'POST' && req.path.includes('cloud-accounts')) {
        action = AuditEventType.CLOUD_ACCOUNT_CREATED;
      } else if (req.method === 'PUT' || req.method === 'PATCH') {
        action = AuditEventType.SENSITIVE_DATA_ACCESSED;
      } else if (req.method === 'DELETE') {
        action = AuditEventType.SENSITIVE_DATA_ACCESSED;
      }

      if (action) {
        auditService.log({
          tenantId: req.user!.tenantId,
          userId: req.user!.userId,
          action,
          ipAddress,
          userAgent,
          success,
          severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          },
        }).catch((error) => {
          console.error('Failed to log audit event:', error);
        });
      }

      return originalJson(body);
    };

    next();
  };
}
