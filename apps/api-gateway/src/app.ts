/**
 * Express App Configuration
 *
 * This file exports the Express app instance for testing purposes.
 * Separating app configuration from server startup allows for easier testing.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { globalLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import cloudAccountRoutes from './routes/cloudAccount.routes';
import finopsRoutes from './modules/finops/routes';
import policyRoutes from './routes/policy.routes';

export const app = express();

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
// Health Check
// ============================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Root - shows available endpoints
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'Cloud Governance Copilot API v1',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      cloudAccounts: '/api/v1/cloud-accounts',
      finops: '/api/v1/finops',
      policy: '/api/v1/policy',
    },
  });
});

// ============================================================
// Routes
// ============================================================

// Auth routes
app.use('/api/v1/auth', authRoutes);

// User routes
app.use('/api/v1/users', userRoutes);

// Cloud Account routes
app.use('/api/v1/cloud-accounts', cloudAccountRoutes);

// FinOps routes
app.use('/api/v1/finops', finopsRoutes);

// Policy routes
app.use('/api/v1/policy', policyRoutes);

// ============================================================
// Error Handling
// ============================================================
app.use(errorHandler);
