import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { createServer } from 'http';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { globalLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import cloudAccountRoutes from './routes/cloudAccount.routes';
import dashboardRoutes from './routes/dashboard.routes';
import resourcesRoutes from './routes/resources.routes';
import finopsRoutes from './modules/finops/routes';
import azureSecurityRoutes from './routes/azure-security.routes';
import securityRoutes from './modules/security/routes/security.routes';
import healthRoutes from './routes/health.routes';
import dependenciesRoutes from './routes/dependencies.routes';
import incidentsRoutes from './modules/incidents/routes';
import serviceHealthRoutes from './modules/service-health/controllers/service-health.controller';
import advisorRoutes from './modules/advisor/routes/advisor.routes';
import assetsRoutes from './modules/assets/routes/assets.routes';
import { initRedis, closeRedis } from './config/redis';
import {
  scheduleDailyCostCollection,
  shutdownCostCollectionJob,
  scheduleDailyRecommendationGeneration,
  shutdownRecommendationGenerationJob,
  scheduleDailyAssetDiscovery,
  shutdownAssetDiscoveryWorker,
  setupSecurityScanSchedule,
  shutdownSecurityScanWorker,
} from './shared/jobs';
import {
  startServiceHealthMonitor,
  stopServiceHealthMonitor,
} from './jobs/service-health-monitor.job';
import { disconnectPrisma } from './lib/prisma';

// Load environment variables (only in non-Docker development)
if (process.env.NODE_ENV !== 'production' && !process.env.DOCKER_ENV) {
  dotenv.config();
  logger.info('Loaded environment variables from .env file');
} else {
  logger.info('Using environment variables from container environment');
}

const app = express();
const PORT = process.env.PORT || process.env.API_PORT || 3010;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================
// Security & Middleware
// ============================================================
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply global rate limiter to all API routes
app.use('/api/', globalLimiter);

app.use(requestLogger);

// ============================================================
// Health Check & Monitoring Routes
// ============================================================
// Register comprehensive health check routes from health.routes.ts
app.use('/', healthRoutes);

// ============================================================
// API Routes
// ============================================================
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'Cloud Governance Copilot API Gateway',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      tenants: '/api/v1/tenants',
      users: '/api/v1/users',
      cloudAccounts: '/api/v1/cloud-accounts',
      dashboard: '/api/v1/dashboard',
      resources: '/api/v1/resources',
      finops: '/api/v1/finops',
      costs: '/api/v1/costs', // Alias for finops costs endpoints
      security: '/api/v1/security',
      azureSecurity: '/api/v1/security/azure',
      dependencies: '/api/v1/dependencies',
      incidents: '/api/v1/incidents',
      serviceHealth: '/api/v1/service-health',
      advisor: '/api/v1/advisor',
      assets: '/api/v1/assets',
    },
  });
});

// Auth routes
app.use('/api/v1/auth', authRoutes);

// User routes
app.use('/api/v1/users', userRoutes);

// Cloud Account routes
app.use('/api/v1/cloud-accounts', cloudAccountRoutes);

// Dashboard routes
app.use('/api/v1/dashboard', dashboardRoutes);

// Resources routes
app.use('/api/v1/resources', resourcesRoutes);

// FinOps routes
app.use('/api/v1/finops', finopsRoutes);

// Costs alias route - redirects /api/v1/costs to finops module
// This allows frontend to call /api/v1/costs directly while maintaining
// the organized finops module structure
app.use('/api/v1/costs', finopsRoutes);

// Security routes
app.use('/api/v1/security', securityRoutes);

// Azure Security routes
app.use('/api/v1/security/azure', azureSecurityRoutes);

// Dependencies routes
app.use('/api/v1/dependencies', dependenciesRoutes);

// Incidents routes
app.use('/api/v1/incidents', incidentsRoutes);

// Assets routes
app.use('/api/v1/assets', assetsRoutes);

// Service Health routes
app.use('/api/v1/service-health', serviceHealthRoutes);

// Azure Advisor routes
app.use('/api/v1/advisor', advisorRoutes);

// TODO: Import and use other route modules
// app.use('/api/v1/tenants', tenantRoutes);

// ============================================================
// Error Handling
// ============================================================
app.use(errorHandler);

// ============================================================
// Server Start
// ============================================================
const server = createServer(app);

// Initialize Redis and start server
const startServer = async () => {
  try {
    // Initialize Redis connection (non-blocking - continues in background)
    // Redis will retry connection automatically if unavailable
    initRedis().catch(err => {
      logger.warn('Redis initialization encountered issues, will retry in background', {
        error: err instanceof Error ? err.message : String(err),
      });
    });

    // Attempt to schedule BullMQ jobs (these require Redis)
    // If Redis is not ready yet, these will fail gracefully
    try {
      await scheduleDailyCostCollection();
      logger.info('Daily Cost Collection Job scheduled successfully (runs daily at 2 AM)');
    } catch (error) {
      logger.warn('Could not schedule Daily Cost Collection Job - Redis may not be ready yet', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      await scheduleDailyRecommendationGeneration();
      logger.info('Daily Recommendations Generation Job scheduled successfully (runs daily at 3 AM)');
    } catch (error) {
      logger.warn('Could not schedule Daily Recommendations Generation Job - Redis may not be ready yet', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      await scheduleDailyAssetDiscovery();
      logger.info('Daily Asset Discovery Job scheduled successfully (runs daily at 4 AM)');
    } catch (error) {
      logger.warn('Could not schedule Daily Asset Discovery Job - Redis may not be ready yet', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      await setupSecurityScanSchedule();
      logger.info('Weekly Security Scan Job scheduled successfully (runs Sundays at 4 AM)');
    } catch (error) {
      logger.warn('Could not schedule Weekly Security Scan Job - Redis may not be ready yet', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Start Service Health Monitor (cron-based, does not require Redis)
    if (process.env.SERVICE_HEALTH_ENABLED !== 'false') {
      startServiceHealthMonitor();
      logger.info('Service Health Monitor started successfully');
    } else {
      logger.info('Service Health Monitor is disabled (SERVICE_HEALTH_ENABLED=false)');
    }

    // Start HTTP server (always starts, regardless of Redis status)
    server.listen(PORT, () => {
      logger.info(`API Gateway running on port ${PORT} in ${NODE_ENV} mode`);
      logger.info(`Health check available at http://localhost:${PORT}/health`);
      logger.info('Server started - some features may be degraded if dependencies are unavailable');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  stopServiceHealthMonitor();
  await shutdownCostCollectionJob();
  await shutdownRecommendationGenerationJob();
  await shutdownAssetDiscoveryWorker();
  await shutdownSecurityScanWorker();
  await closeRedis();
  await disconnectPrisma();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  stopServiceHealthMonitor();
  await shutdownCostCollectionJob();
  await shutdownRecommendationGenerationJob();
  await shutdownAssetDiscoveryWorker();
  await shutdownSecurityScanWorker();
  await closeRedis();
  await disconnectPrisma();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
