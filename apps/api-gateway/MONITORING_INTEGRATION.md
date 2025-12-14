# Monitoring Integration Examples

This document provides code examples for integrating the monitoring infrastructure into your application.

## Table of Contents
1. [Application Setup](#application-setup)
2. [Using the Logger](#using-the-logger)
3. [Request Tracing](#request-tracing)
4. [Recording Metrics](#recording-metrics)
5. [Error Tracking](#error-tracking)
6. [Health Checks](#health-checks)

## Application Setup

### 1. Update app.ts

Add the monitoring middleware to your Express application:

```typescript
import express from 'express';
import { requestTracing } from './middleware/request-tracing';
import healthRoutes from './routes/health.routes';
import { logger } from './services/logger.service';
import { metricsService } from './services/metrics.service';

const app = express();

// Add request tracing middleware early in the stack
// This should be before other middleware to capture all requests
app.use(requestTracing({
  slowRequestThreshold: 2000,
  logRequestStart: false,
  excludePaths: ['/health', '/health/ready', '/metrics'],
}));

// Add health check routes
app.use(healthRoutes);

// Your existing routes
app.use('/api/costs', costsRoutes);
app.use('/api/resources', resourcesRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV,
  });
});

export default app;
```

### 2. Update index.ts

Add graceful shutdown handling:

```typescript
import app from './app';
import { logger } from './services/logger.service';
import { errorTracking } from './services/error-tracking.service';
import { initRedis, closeRedis } from './config/redis';

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  errorTracking.captureError(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', {
    error: reason instanceof Error ? reason : new Error(String(reason)),
    promise: String(promise),
  });
  errorTracking.captureError(
    reason instanceof Error ? reason : new Error(String(reason))
  );
});

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully...');

  try {
    // Flush error tracking events
    await errorTracking.flush(2000);

    // Close database connections
    await closeRedis();

    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: error instanceof Error ? error : new Error(String(error)),
    });
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start application
async function start() {
  try {
    await initRedis();
    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application', {
      error: error instanceof Error ? error : new Error(String(error)),
    });
    process.exit(1);
  }
}

start();
```

## Using the Logger

### Basic Logging

```typescript
import { logger } from '../services/logger.service';

// Info level (successful operations)
logger.info('User logged in successfully', {
  userId: '123',
  email: 'user@example.com',
});

// Warning level (potential issues)
logger.warn('Cache miss, fetching from database', {
  key: 'user:123:profile',
  operation: 'getProfile',
});

// Error level (failures)
logger.error('Failed to fetch user data', {
  userId: '123',
  error: new Error('Database connection failed'),
});

// Debug level (detailed information)
logger.debug('Processing payment', {
  userId: '123',
  amount: 99.99,
  currency: 'USD',
});
```

### Logging in Request Handlers

Use the request logger for automatic context:

```typescript
import { Request, Response } from 'express';
import { getRequestLogger } from '../middleware/request-tracing';

export async function getCostSummary(req: Request, res: Response) {
  const log = getRequestLogger(req); // Includes requestId, userId automatically

  try {
    const { accountId } = req.params;

    log.info('Fetching cost summary', {
      cloudAccountId: accountId,
      operation: 'getCostSummary',
    });

    const summary = await CostService.getSummary(accountId);

    log.info('Cost summary retrieved', {
      cloudAccountId: accountId,
      currentMonth: summary.currentMonth,
    });

    res.json(summary);
  } catch (error) {
    log.error('Failed to get cost summary', {
      error: error instanceof Error ? error : new Error(String(error)),
    });
    res.status(500).json({ error: 'Failed to get cost summary' });
  }
}
```

### Creating Child Loggers

For service-level logging with default context:

```typescript
import { logger } from '../services/logger.service';

class PaymentService {
  private log = logger.child({
    service: 'PaymentService',
  });

  async processPayment(userId: string, amount: number) {
    this.log.info('Processing payment', { userId, amount });

    try {
      // Process payment
      this.log.info('Payment processed successfully', { userId, amount });
    } catch (error) {
      this.log.error('Payment processing failed', {
        userId,
        amount,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }
}
```

## Request Tracing

### Adding Operation Context

```typescript
import { Request, Response, NextFunction } from 'express';
import { addLogContext, logOperation } from '../middleware/request-tracing';

// Using middleware
router.get('/costs/summary',
  logOperation('getCostSummary'), // Adds operation name to logs
  async (req, res) => {
    // Handler code
  }
);

// Programmatically
export async function handler(req: Request, res: Response) {
  addLogContext(req, {
    cloudAccountId: req.params.accountId,
    operation: 'complexOperation',
  });

  // All subsequent logs in this request will include this context
}
```

### Custom Request ID Header

```typescript
import { requestTracing } from './middleware/request-tracing';

app.use(requestTracing({
  requestIdHeader: 'X-Correlation-ID', // Use custom header
  slowRequestThreshold: 1500,
}));
```

## Recording Metrics

### HTTP Request Metrics (Automatic)

HTTP request metrics are recorded automatically by the request tracing middleware:
- Request count by method, route, status
- Request duration histogram
- Error count by type

### Azure API Call Metrics

```typescript
import { metricsService } from '../services/metrics.service';

async function queryCostManagement(accountId: string) {
  const startTime = Date.now();

  try {
    const result = await client.query.usage(scope, query);

    // Record successful API call
    const duration = Date.now() - startTime;
    metricsService.recordAzureApiCall(
      'CostManagement',
      'query',
      'success',
      duration
    );

    return result;
  } catch (error) {
    // Record failed API call
    const duration = Date.now() - startTime;
    metricsService.recordAzureApiCall(
      'CostManagement',
      'query',
      'error',
      duration
    );

    // Record specific error type
    metricsService.recordAzureApiError(
      'CostManagement',
      'query',
      error.code || 'UnknownError'
    );

    throw error;
  }
}
```

### Database Query Metrics

```typescript
import { metricsService } from '../services/metrics.service';

async function findUser(userId: string) {
  const startTime = Date.now();

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // Record query metrics
    const duration = Date.now() - startTime;
    metricsService.recordDatabaseQuery('findUnique', 'User', duration);

    return user;
  } catch (error) {
    // Still record metrics even on error
    const duration = Date.now() - startTime;
    metricsService.recordDatabaseQuery('findUnique', 'User', duration);
    throw error;
  }
}
```

### Redis Cache Metrics

```typescript
import { metricsService } from '../services/metrics.service';

async function getCachedData(key: string) {
  try {
    const cached = await redis.get(key);

    if (cached) {
      metricsService.recordCacheHit('user_profile');
      return JSON.parse(cached);
    }

    metricsService.recordCacheMiss('user_profile');

    // Fetch from database
    const data = await fetchFromDatabase();
    await redis.set(key, JSON.stringify(data), 'EX', 3600);

    return data;
  } catch (error) {
    // Cache errors shouldn't break the application
    logger.warn('Cache operation failed', { key, error });
    return fetchFromDatabase();
  }
}
```

### Custom Business Metrics

```typescript
import { metricsService } from '../services/metrics.service';

// Counter: Increment on events
metricsService.incrementBusinessMetric('cost_queries', {
  operation: 'getCostSummary',
  provider: 'azure',
});

metricsService.incrementBusinessMetric('recommendations_generated', {
  category: 'cost_optimization',
  severity: 'high',
});

// Gauge: Set to specific value
metricsService.setBusinessGauge('active_users', 1234);

metricsService.setBusinessGauge('total_cost_this_month', 5678.90, {
  currency: 'USD',
});
```

## Error Tracking

### Capturing Errors

```typescript
import { errorTracking } from '../services/error-tracking.service';

try {
  await riskyOperation();
} catch (error) {
  // Capture error with context
  errorTracking.captureError(error instanceof Error ? error : new Error(String(error)), {
    user: {
      id: req.user.id,
      email: req.user.email,
    },
    tags: {
      operation: 'riskyOperation',
      severity: 'high',
    },
    extra: {
      accountId: req.params.accountId,
      requestBody: req.body,
    },
    level: 'error',
  });

  throw error;
}
```

### Adding Breadcrumbs

```typescript
import { errorTracking } from '../services/error-tracking.service';

export async function processOrder(orderId: string) {
  errorTracking.addBreadcrumb({
    category: 'order',
    message: 'Started processing order',
    data: { orderId },
    level: 'info',
  });

  const order = await fetchOrder(orderId);

  errorTracking.addBreadcrumb({
    category: 'order',
    message: 'Order fetched',
    data: { orderId, status: order.status },
    level: 'info',
  });

  try {
    await chargePayment(order);

    errorTracking.addBreadcrumb({
      category: 'payment',
      message: 'Payment charged successfully',
      data: { orderId, amount: order.total },
      level: 'info',
    });
  } catch (error) {
    // Breadcrumbs will be included in error report
    errorTracking.captureError(error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
```

### Setting User Context

```typescript
import { errorTracking } from '../services/error-tracking.service';

// In authentication middleware
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = getUserFromToken(req);

  if (user) {
    // Set user context for error tracking
    errorTracking.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });
  }

  next();
}

// Clear user context on logout
export function logout(req: Request, res: Response) {
  errorTracking.setUser(null);
  // ... logout logic
}
```

### Custom Tags and Context

```typescript
import { errorTracking } from '../services/error-tracking.service';

// Set tags for filtering in error tracking UI
errorTracking.setTags({
  environment: process.env.NODE_ENV,
  region: 'us-east-1',
  version: '1.2.3',
});

// Set custom context
errorTracking.setContext('business', {
  subscriptionTier: 'premium',
  companyId: 'acme-corp',
  feature: 'cost-optimization',
});
```

## Health Checks

### Using Health Check Endpoints

The health check endpoints are automatically available:

**Kubernetes Liveness Probe:**
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
```

**Kubernetes Readiness Probe:**
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

**Docker Health Check:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

**Load Balancer Health Check:**
- Configure your load balancer to check `/health/ready`
- Unhealthy threshold: 2 consecutive failures
- Healthy threshold: 2 consecutive successes
- Interval: 10 seconds

### Custom Health Checks

You can extend the health check routes:

```typescript
import { Router } from 'express';
import { logger } from '../services/logger.service';

const healthRouter = Router();

// Add custom health check
healthRouter.get('/health/custom', async (req, res) => {
  const checks = {
    externalApi: 'unknown',
    messageQueue: 'unknown',
  };

  try {
    // Check external API
    const apiResponse = await fetch('https://api.example.com/health');
    checks.externalApi = apiResponse.ok ? 'up' : 'down';
  } catch (error) {
    checks.externalApi = 'down';
    logger.error('External API health check failed', { error });
  }

  try {
    // Check message queue
    await messageQueue.ping();
    checks.messageQueue = 'up';
  } catch (error) {
    checks.messageQueue = 'down';
    logger.error('Message queue health check failed', { error });
  }

  const allHealthy = Object.values(checks).every(status => status === 'up');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
  });
});

export default healthRouter;
```

## Complete Example: Controller with Full Monitoring

```typescript
import { Request, Response } from 'express';
import { getRequestLogger } from '../middleware/request-tracing';
import { metricsService } from '../services/metrics.service';
import { errorTracking } from '../services/error-tracking.service';

export class CostsController {
  /**
   * GET /api/costs/:accountId/summary
   * Get cost summary with full monitoring
   */
  async getSummary(req: Request, res: Response) {
    const log = getRequestLogger(req);
    const { accountId } = req.params;
    const startTime = Date.now();

    try {
      // Add breadcrumb
      errorTracking.addBreadcrumb({
        category: 'api',
        message: 'Fetching cost summary',
        data: { accountId },
        level: 'info',
      });

      log.info('Fetching cost summary', {
        cloudAccountId: accountId,
        operation: 'getCostSummary',
      });

      // Fetch data
      const summary = await CostManagementService.getCostSummary(accountId);

      // Record business metric
      metricsService.incrementBusinessMetric('cost_queries', {
        operation: 'getCostSummary',
      });

      // Calculate duration
      const duration = Date.now() - startTime;

      // Log success
      log.info('Cost summary retrieved successfully', {
        cloudAccountId: accountId,
        operation: 'getCostSummary',
        currentMonth: summary.currentMonth,
        trend: summary.trend,
        duration,
      });

      // Add success breadcrumb
      errorTracking.addBreadcrumb({
        category: 'api',
        message: 'Cost summary retrieved',
        data: { accountId, duration },
        level: 'info',
      });

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error
      log.error('Failed to get cost summary', {
        cloudAccountId: accountId,
        operation: 'getCostSummary',
        duration,
        error: error instanceof Error ? error : new Error(String(error)),
      });

      // Capture in error tracking
      errorTracking.captureError(
        error instanceof Error ? error : new Error(String(error)),
        {
          tags: {
            operation: 'getCostSummary',
            cloudAccountId: accountId,
          },
          extra: {
            duration,
            params: req.params,
            query: req.query,
          },
        }
      );

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve cost summary',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
```

## Tips and Best Practices

1. **Always use structured logging** - Pass objects, not strings
2. **Include operation names** - Makes filtering and debugging easier
3. **Log at appropriate levels** - Don't overuse error level
4. **Record metrics for all external calls** - API, database, cache
5. **Add breadcrumbs before risky operations** - Helps debug errors
6. **Set user context early** - In authentication middleware
7. **Use child loggers for services** - Adds automatic context
8. **Monitor health checks in production** - Alert on failures
9. **Review metrics regularly** - Identify trends and issues
10. **Keep log messages concise** - Put details in context object
