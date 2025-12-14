/**
 * Example: Triggering Cost Collection Job Manually
 *
 * This example demonstrates how to manually trigger the cost collection job
 * for testing or on-demand execution.
 *
 * Usage:
 * ------
 * # Development (with tsx)
 * npx tsx examples/trigger-cost-collection.ts
 *
 * # Production (compiled)
 * node dist/examples/trigger-cost-collection.js
 */

import { triggerManualCostCollection, shutdownCostCollectionJob } from '../src/shared/jobs';

async function main() {
  console.log('========================================');
  console.log('Manual Cost Collection Job Trigger');
  console.log('========================================');
  console.log('');

  try {
    // Trigger the cost collection job
    console.log('Triggering cost collection job...');
    const job = await triggerManualCostCollection();

    console.log('');
    console.log('Job triggered successfully!');
    console.log(`Job ID: ${job.id}`);
    console.log(`Job Name: ${job.name}`);
    console.log('');
    console.log('The job has been queued and will be processed by the worker shortly.');
    console.log('Monitor the worker logs to see the execution progress:');
    console.log('  pm2 logs cost-collection-worker');
    console.log('');
    console.log('========================================');

    // Optional: Wait for job completion
    const shouldWait = process.argv.includes('--wait');

    if (shouldWait) {
      console.log('Waiting for job to complete...');
      console.log('(This may take several minutes depending on the number of accounts)');
      console.log('');

      // Note: To use waitUntilFinished, you need to create a QueueEvents instance
      // const queueEvents = new QueueEvents('cost-collection', { connection });
      // const result = await job.waitUntilFinished(queueEvents);
      // console.log('Job Result:', JSON.stringify(result, null, 2));

      console.log('To wait for job completion, implement QueueEvents integration.');
    }
  } catch (error: any) {
    console.error('');
    console.error('========================================');
    console.error('ERROR: Failed to trigger job');
    console.error('========================================');
    console.error('');
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('');
    console.error('Common issues:');
    console.error('  1. Redis is not running or not accessible');
    console.error('  2. Environment variables not set (REDIS_HOST, REDIS_PORT)');
    console.error('  3. Worker is not running (start with: pm2 start ecosystem.config.js --only cost-collection-worker)');
    console.error('');
    process.exit(1);
  } finally {
    // Note: Don't shutdown here if you want the worker to keep running
    // Only use this for testing/scripts that should exit after triggering
    // await shutdownCostCollectionJob();
  }
}

// Run the example
main();
