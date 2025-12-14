/**
 * PM2 Ecosystem Configuration
 *
 * This file configures PM2 process manager for running the API Gateway
 * and background workers in production.
 *
 * Usage:
 * ------
 * # Start all processes
 * pm2 start ecosystem.config.js
 *
 * # Start only the API server
 * pm2 start ecosystem.config.js --only api-gateway
 *
 * # Start only the worker
 * pm2 start ecosystem.config.js --only cost-collection-worker
 *
 * # View status
 * pm2 status
 *
 * # View logs
 * pm2 logs
 *
 * # Restart all
 * pm2 restart ecosystem.config.js
 *
 * # Stop all
 * pm2 stop ecosystem.config.js
 *
 * # Delete all
 * pm2 delete ecosystem.config.js
 *
 * Documentation: https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {
  apps: [
    // ========================================
    // API Gateway (Main Server)
    // ========================================
    {
      name: 'api-gateway',
      script: './dist/index.js',
      instances: 'max', // Use all CPU cores (cluster mode)
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      // Auto-restart settings
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,

      // Logging
      error_file: './logs/api-gateway-error.log',
      out_file: './logs/api-gateway-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Advanced features
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
    },

    // ========================================
    // Cost Collection Worker
    // ========================================
    {
      name: 'cost-collection-worker',
      script: './dist/workers/cost-collection-worker.js',
      instances: 1, // Only 1 instance to avoid duplicate jobs
      exec_mode: 'fork', // Fork mode (not cluster)
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },
      // Auto-restart settings
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,

      // Logging
      error_file: './logs/cost-collection-worker-error.log',
      out_file: './logs/cost-collection-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Cron restart (optional - restart every day at 1 AM for cleanup)
      cron_restart: '0 1 * * *',

      // Advanced features
      kill_timeout: 30000, // Allow 30 seconds for graceful shutdown
      listen_timeout: 3000,
      shutdown_with_message: true,
    },
  ],
};
