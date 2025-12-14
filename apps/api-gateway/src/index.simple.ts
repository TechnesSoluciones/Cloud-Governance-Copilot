const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.API_PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/health', (req: any, res: any) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
  });
});

// API Routes
app.get('/api/v1', (req: any, res: any) => {
  res.json({
    message: 'Cloud Governance Copilot API Gateway',
    version: '1.0.0',
  });
});

// Server Start
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT} in ${NODE_ENV} mode`);
});

module.exports = app;
