import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getRedis, isRedisAvailable, getRedisHealthStatus } from '../config/redis';
import { metricsService } from '../services/metrics.service';
import { logger } from '../services/logger.service';

const router = Router();

/**
 * Health Check Status
 */
interface HealthCheckStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version?: string;
  checks?: {
    [key: string]: {
      status: 'up' | 'down' | 'degraded';
      message?: string;
      responseTime?: number;
    };
  };
}

/**
 * GET /health
 *
 * Simple liveness check
 * Returns 200 if the service is running
 * Used by container orchestrators (k8s, Docker, etc.)
 */
router.get('/health', (req: Request, res: Response) => {
  const health: HealthCheckStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.1.1',
  };

  // Log health check for monitoring
  logger.debug('[Health] Service is healthy', {
    uptime: process.uptime(),
    version: health.version,
    memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
  });

  res.status(200).json(health);
});

/**
 * GET /health/ready
 *
 * Readiness check - verifies dependencies
 * Checks:
 * - Database connectivity (Prisma)
 * - Redis connectivity
 * - Azure credentials (optional)
 *
 * Returns:
 * - 200 if all dependencies are healthy
 * - 503 if any critical dependency is down
 * - 200 with degraded status if optional dependencies are down
 */
router.get('/health/ready', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const checks: HealthCheckStatus['checks'] = {};

  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

  // Check Database (Prisma)
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;

    checks.database = {
      status: 'up',
      responseTime: Date.now() - dbStart,
    };

    // DO NOT disconnect - we're using a singleton instance
    // await prisma.$disconnect();
  } catch (error) {
    checks.database = {
      status: 'down',
      message: error instanceof Error ? error.message : 'Database check failed',
    };
    overallStatus = 'unhealthy';
    logger.error('Health check: Database is down', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });
  }

  // Check Redis - using new resilient status check
  try {
    const redisStart = Date.now();
    const redisHealth = getRedisHealthStatus();

    if (isRedisAvailable()) {
      const redis = getRedis();
      await redis.ping();

      checks.redis = {
        status: 'up',
        responseTime: Date.now() - redisStart,
        message: redisHealth.details.uptime
          ? `Connected for ${Math.floor(redisHealth.details.uptime / 1000)}s`
          : 'Connected',
      };
    } else {
      // Redis is not available - determine appropriate status
      const statusMessage = redisHealth.status === 'connecting'
        ? `Connecting (attempt ${redisHealth.details.retryCount})`
        : redisHealth.details.lastError || 'Not available';

      checks.redis = {
        status: redisHealth.status === 'connecting' ? 'degraded' : 'down',
        message: statusMessage,
      };

      // Redis is important but not critical - mark as degraded (not unhealthy)
      if (overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }

      logger.warn('Health check: Redis is not available', {
        redisStatus: redisHealth.status,
        retryCount: redisHealth.details.retryCount,
        lastError: redisHealth.details.lastError,
      });
    }
  } catch (error) {
    checks.redis = {
      status: 'down',
      message: error instanceof Error ? error.message : 'Redis check failed',
    };
    // Redis is important but not critical - mark as degraded
    if (overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }
    logger.warn('Health check: Redis check error', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });
  }

  // Check Azure Credentials (optional - informational only)
  try {
    const azureCredentialsConfigured =
      process.env.AZURE_CLIENT_ID &&
      process.env.AZURE_CLIENT_SECRET &&
      process.env.AZURE_TENANT_ID;

    if (azureCredentialsConfigured) {
      checks.azureCredentials = {
        status: 'up',
        message: 'Credentials configured',
      };
    } else {
      checks.azureCredentials = {
        status: 'degraded',
        message: 'Credentials not fully configured',
      };
    }
  } catch (error) {
    checks.azureCredentials = {
      status: 'down',
      message: 'Configuration check failed',
    };
  }

  // AWS Credentials check (optional)
  try {
    const awsCredentialsConfigured =
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

    if (awsCredentialsConfigured) {
      checks.awsCredentials = {
        status: 'up',
        message: 'Credentials configured',
      };
    } else {
      checks.awsCredentials = {
        status: 'degraded',
        message: 'Credentials not fully configured',
      };
    }
  } catch (error) {
    checks.awsCredentials = {
      status: 'down',
      message: 'Configuration check failed',
    };
  }

  const health: HealthCheckStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    checks,
  };

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  // Log degraded or unhealthy states
  if (overallStatus !== 'healthy') {
    logger.warn('Health check returned non-healthy status', {
      status: overallStatus,
      checks,
      duration: Date.now() - startTime,
    });
  }

  res.status(statusCode).json(health);
});

/**
 * GET /health/live
 *
 * Kubernetes liveness probe
 * Simple check that the process is running
 */
router.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /metrics
 *
 * Prometheus metrics endpoint
 * Returns metrics in Prometheus text format
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.set('Content-Type', metricsService.getContentType());
    res.send(metrics);
  } catch (error) {
    logger.error('Failed to generate metrics', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });
    res.status(500).json({
      error: 'Failed to generate metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /health/dependencies
 *
 * Detailed dependency health check
 * Useful for troubleshooting and monitoring
 */
router.get('/health/dependencies', async (req: Request, res: Response) => {
  const dependencies: Record<string, any> = {};

  // Check Node.js version
  dependencies.nodejs = {
    version: process.version,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
  };

  // Check environment
  dependencies.environment = {
    nodeEnv: process.env.NODE_ENV || 'development',
    platform: process.platform,
    arch: process.arch,
  };

  // Check Database
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;

    dependencies.database = {
      status: 'connected',
      responseTime: Date.now() - dbStart,
    };

    // DO NOT disconnect - we're using a singleton instance
    // await prisma.$disconnect();
  } catch (error) {
    dependencies.database = {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check Redis - using new resilient status check
  try {
    const redisHealth = getRedisHealthStatus();

    if (isRedisAvailable()) {
      const redis = getRedis();
      const redisStart = Date.now();
      const pong = await redis.ping();
      const info = await redis.info();

      dependencies.redis = {
        status: 'connected',
        connectionState: redisHealth.status,
        responseTime: Date.now() - redisStart,
        uptime: redisHealth.details.uptime,
        ping: pong,
        info: info.split('\r\n').slice(0, 10).join('\n'), // First 10 lines
      };
    } else {
      dependencies.redis = {
        status: 'disconnected',
        connectionState: redisHealth.status,
        retryCount: redisHealth.details.retryCount,
        lastError: redisHealth.details.lastError,
        message: redisHealth.status === 'connecting'
          ? 'Connection in progress'
          : 'Not available',
      };
    }
  } catch (error) {
    const redisHealth = getRedisHealthStatus();
    dependencies.redis = {
      status: 'disconnected',
      connectionState: redisHealth.status,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  res.json(dependencies);
});

export default router;
