/**
 * Cost Collection Worker Entry Point
 *
 * This file serves as the standalone entry point for running the cost collection
 * worker process. In production, this should run as a separate process from the
 * main API server to ensure job processing continues independently.
 *
 * Usage in Production:
 * -------------------
 *
 * 1. Start the worker process:
 *    ```bash
 *    node dist/workers/cost-collection-worker.js
 *    ```
 *
 * 2. Using PM2 (process manager):
 *    ```bash
 *    pm2 start dist/workers/cost-collection-worker.js --name cost-collection-worker
 *    pm2 save
 *    ```
 *
 * 3. Using Docker:
 *    ```dockerfile
 *    # In Dockerfile
 *    CMD ["node", "dist/workers/cost-collection-worker.js"]
 *    ```
 *
 * 4. Using systemd:
 *    ```ini
 *    [Unit]
 *    Description=Cost Collection Worker
 *    After=network.target
 *
 *    [Service]
 *    Type=simple
 *    User=copilot
 *    WorkingDirectory=/opt/copilot
 *    ExecStart=/usr/bin/node dist/workers/cost-collection-worker.js
 *    Restart=on-failure
 *
 *    [Install]
 *    WantedBy=multi-user.target
 *    ```
 *
 * Environment Variables Required:
 * ------------------------------
 * - REDIS_HOST: Redis server hostname (default: localhost)
 * - REDIS_PORT: Redis server port (default: 6379)
 * - DATABASE_URL: PostgreSQL connection string
 * - ENCRYPTION_KEY: 32-byte encryption key for credentials
 *
 * Architecture:
 * ------------
 * This worker runs independently from the main API server, ensuring:
 * - Job processing continues even if API server restarts
 * - API server resources aren't consumed by background jobs
 * - Worker can scale independently (multiple instances for high load)
 * - Fault isolation (worker crashes don't affect API)
 *
 * @module Workers/CostCollectionWorker
 */

import { scheduleDailyCostCollection } from '../shared/jobs';

/**
 * Initialize and start the cost collection worker
 */
async function startWorker() {
  console.log('========================================');
  console.log('Cost Collection Worker Starting');
  console.log('========================================');
  console.log(`Process ID: ${process.pid}`);
  console.log(`Node Version: ${process.version}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Redis Host: ${process.env.REDIS_HOST || 'localhost'}`);
  console.log(`Redis Port: ${process.env.REDIS_PORT || '6379'}`);
  console.log('========================================');

  try {
    // Schedule the daily cost collection job
    console.log('[Worker] Scheduling daily cost collection job...');
    await scheduleDailyCostCollection();
    console.log('[Worker] Daily cost collection job scheduled successfully');

    console.log('========================================');
    console.log('Worker is ready and listening for jobs');
    console.log('Schedule: Daily at 2:00 AM (America/New_York)');
    console.log('Press Ctrl+C to gracefully shutdown');
    console.log('========================================');
  } catch (error: any) {
    console.error('[Worker] Failed to start worker:', error.message);
    console.error('[Worker] Stack trace:', error.stack);
    process.exit(1);
  }
}

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error: Error) => {
  console.error('[Worker] Uncaught exception:', error.message);
  console.error('[Worker] Stack trace:', error.stack);
  console.error('[Worker] Shutting down due to uncaught exception...');
  process.exit(1);
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('[Worker] Unhandled promise rejection at:', promise);
  console.error('[Worker] Reason:', reason);
  console.error('[Worker] Shutting down due to unhandled rejection...');
  process.exit(1);
});

// Start the worker
startWorker().catch((error) => {
  console.error('[Worker] Fatal error during startup:', error);
  process.exit(1);
});
