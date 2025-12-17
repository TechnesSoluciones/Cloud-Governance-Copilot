import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger, LogContext } from '../services/logger.service';

// Extend Express Request interface to include tracing context
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
      logger?: typeof logger;
      logContext?: LogContext;
    }
  }
}

/**
 * Request Tracing Middleware Configuration
 */
export interface RequestTracingConfig {
  /**
   * Threshold in milliseconds for slow request warnings
   * @default 2000
   */
  slowRequestThreshold: number;

  /**
   * Whether to generate request IDs
   * @default true
   */
  enableRequestId: boolean;

  /**
   * Header name for incoming request ID
   * @default 'X-Request-ID'
   */
  requestIdHeader: string;

  /**
   * Whether to log request start
   * @default false
   */
  logRequestStart: boolean;

  /**
   * Whether to log request end
   * @default true
   */
  logRequestEnd: boolean;

  /**
   * Paths to exclude from logging (e.g., health checks)
   */
  excludePaths: string[];
}

const defaultConfig: RequestTracingConfig = {
  slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || '2000', 10),
  enableRequestId: process.env.ENABLE_REQUEST_TRACING !== 'false',
  requestIdHeader: 'X-Request-ID',
  logRequestStart: process.env.LOG_REQUEST_START === 'true',
  logRequestEnd: true,
  excludePaths: ['/health', '/health/ready', '/metrics'],
};

/**
 * Request Tracing Middleware
 *
 * Features:
 * - Generates unique requestId for each API call
 * - Attaches requestId to all logs in the request lifecycle
 * - Adds request metadata (method, path, userId, duration)
 * - Logs request start and end
 * - Logs slow requests (>2 seconds) as warnings
 * - Creates child logger with request context
 *
 * @param config - Optional configuration
 */
export function requestTracing(config?: Partial<RequestTracingConfig>) {
  const finalConfig: RequestTracingConfig = { ...defaultConfig, ...config };

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip excluded paths
    if (finalConfig.excludePaths.includes(req.path)) {
      return next();
    }

    // Generate or extract request ID
    let requestId: string;
    if (finalConfig.enableRequestId) {
      requestId = (req.get(finalConfig.requestIdHeader) || randomUUID()).toString();
      // Store request ID for use in other middleware/handlers
      req.requestId = requestId;
      // Add to response headers for client tracing
      res.setHeader(finalConfig.requestIdHeader, requestId);
    } else {
      requestId = 'disabled';
    }

    // Record start time
    const startTime = Date.now();
    req.startTime = startTime;

    // Extract user ID from request (if authenticated)
    // @ts-expect-error - req.user might be set by auth middleware
    const userId = req.user?.id || req.user?.userId;

    // Create log context
    const logContext: LogContext = {
      requestId,
      userId,
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    };

    // Store context in request for use in handlers
    req.logContext = logContext;

    // Create child logger with request context
    req.logger = logger.child(logContext);

    // Log request start (optional)
    if (finalConfig.logRequestStart) {
      logger.info('Request started', logContext);
    }

    // Track original end function
    const originalEnd = res.end.bind(res);

    // Override res.end to log when response is sent
    res.end = function (...args: any[]) {
      // Calculate duration
      const duration = Date.now() - startTime;

      // Update log context with response data
      const endLogContext: LogContext = {
        ...logContext,
        statusCode: res.statusCode,
        duration,
        contentLength: res.get('content-length'),
      };

      // Log request completion
      if (finalConfig.logRequestEnd) {
        // Determine log level based on status code and duration
        if (res.statusCode >= 500) {
          logger.error('Request failed with server error', endLogContext);
        } else if (res.statusCode >= 400) {
          logger.warn('Request failed with client error', endLogContext);
        } else if (duration >= finalConfig.slowRequestThreshold) {
          logger.warn('Slow request detected', {
            ...endLogContext,
            threshold: finalConfig.slowRequestThreshold,
          });
        } else {
          logger.info('Request completed', endLogContext);
        }
      }

      // Call original end function with all arguments
      return originalEnd(...args);
    } as any;

    next();
  };
}

/**
 * Get request ID from request object
 */
export function getRequestId(req: Request): string | undefined {
  return req.requestId;
}

/**
 * Get logger with request context
 */
export function getRequestLogger(req: Request): typeof logger {
  return req.logger || logger;
}

/**
 * Add additional context to request logger
 */
export function addLogContext(req: Request, context: LogContext): void {
  if (req.logContext) {
    req.logContext = { ...req.logContext, ...context };
    req.logger = logger.child(req.logContext);
  }
}

/**
 * Middleware to add operation name to log context
 */
export function logOperation(operationName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    addLogContext(req, { operation: operationName });
    next();
  };
}
