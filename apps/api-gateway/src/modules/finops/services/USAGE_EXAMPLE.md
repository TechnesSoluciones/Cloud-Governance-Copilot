# CostCollectionService - Usage Examples

This document provides practical examples of how to use the `CostCollectionService` in different scenarios.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Integration with Controllers](#integration-with-controllers)
3. [Scheduled Cost Collection](#scheduled-cost-collection)
4. [Error Handling](#error-handling)
5. [Multi-Account Collection](#multi-account-collection)

---

## Basic Usage

### Simple Cost Collection

```typescript
import { PrismaClient } from '@prisma/client';
import { CostCollectionService } from './services';
import { eventBus } from '../../../shared/events/event-bus';

// Initialize dependencies
const prisma = new PrismaClient();
const costCollectionService = new CostCollectionService(prisma, eventBus);

// Collect costs for last 30 days
const result = await costCollectionService.collectCostsForAccount(
  'cloud-account-uuid-123',
  {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  }
);

// Log results
console.log('Collection Result:', result);
// Output:
// {
//   success: true,
//   recordsObtained: 150,
//   recordsSaved: 145,  // 5 were duplicates
//   executionTimeMs: 3542
// }
```

---

## Integration with Controllers

### Express.js REST API Endpoint

```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { CostCollectionService } from '../services';
import { eventBus } from '../../../../shared/events/event-bus';

const router = Router();
const prisma = new PrismaClient();
const costCollectionService = new CostCollectionService(prisma, eventBus);

/**
 * POST /api/finops/collect-costs
 * Trigger cost collection for a cloud account
 */
router.post('/collect-costs', async (req, res) => {
  try {
    const { cloudAccountId, startDate, endDate } = req.body;

    // Validate inputs
    if (!cloudAccountId || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required fields: cloudAccountId, startDate, endDate'
      });
    }

    // Trigger cost collection
    const result = await costCollectionService.collectCostsForAccount(
      cloudAccountId,
      {
        start: new Date(startDate),
        end: new Date(endDate)
      }
    );

    // Return appropriate response based on success
    if (result.success) {
      return res.status(200).json({
        message: 'Cost collection completed successfully',
        data: result
      });
    } else {
      return res.status(500).json({
        error: 'Cost collection failed',
        details: result.errors
      });
    }
  } catch (error: any) {
    console.error('Cost collection endpoint error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
```

---

## Scheduled Cost Collection

### Using Node-Cron for Daily Collection

```typescript
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { CostCollectionService } from './services';
import { eventBus } from '../../../shared/events/event-bus';

const prisma = new PrismaClient();
const costCollectionService = new CostCollectionService(prisma, eventBus);

/**
 * Schedule daily cost collection at 2:00 AM
 * Collects costs for all active cloud accounts
 */
cron.schedule('0 2 * * *', async () => {
  console.log('[Scheduler] Starting daily cost collection...');

  try {
    // Get all active cloud accounts
    const accounts = await prisma.cloudAccount.findMany({
      where: { status: 'active' }
    });

    console.log(`[Scheduler] Found ${accounts.length} active accounts`);

    // Calculate date range (yesterday's costs)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Collect costs for each account
    const results = await Promise.allSettled(
      accounts.map(account =>
        costCollectionService.collectCostsForAccount(account.id, {
          start: yesterday,
          end: today
        })
      )
    );

    // Log summary
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`[Scheduler] Collection complete: ${successful} succeeded, ${failed} failed`);
  } catch (error: any) {
    console.error('[Scheduler] Daily cost collection failed:', error);
  }
});
```

### Bull Queue for Async Processing

```typescript
import Bull from 'bull';
import { PrismaClient } from '@prisma/client';
import { CostCollectionService } from './services';
import { eventBus } from '../../../shared/events/event-bus';

const prisma = new PrismaClient();
const costCollectionService = new CostCollectionService(prisma, eventBus);

// Create cost collection queue
const costCollectionQueue = new Bull('cost-collection', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
});

// Define job processor
costCollectionQueue.process(async (job) => {
  const { cloudAccountId, startDate, endDate } = job.data;

  console.log(`[Queue] Processing cost collection job for account ${cloudAccountId}`);

  const result = await costCollectionService.collectCostsForAccount(
    cloudAccountId,
    {
      start: new Date(startDate),
      end: new Date(endDate)
    }
  );

  if (!result.success) {
    throw new Error(`Cost collection failed: ${result.errors?.join(', ')}`);
  }

  return result;
});

// Add job to queue
export async function queueCostCollection(
  cloudAccountId: string,
  startDate: Date,
  endDate: Date
) {
  await costCollectionQueue.add(
    {
      cloudAccountId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  );
}
```

---

## Error Handling

### Graceful Error Handling

```typescript
async function collectCostsWithRetry(
  cloudAccountId: string,
  dateRange: { start: Date; end: Date },
  maxRetries: number = 3
) {
  let attempt = 0;

  while (attempt < maxRetries) {
    const result = await costCollectionService.collectCostsForAccount(
      cloudAccountId,
      dateRange
    );

    if (result.success) {
      console.log(`Cost collection succeeded on attempt ${attempt + 1}`);
      return result;
    }

    attempt++;
    console.warn(`Cost collection failed (attempt ${attempt}/${maxRetries}):`, result.errors);

    if (attempt < maxRetries) {
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Cost collection failed after ${maxRetries} attempts`);
}
```

### Handling Specific Errors

```typescript
const result = await costCollectionService.collectCostsForAccount(
  cloudAccountId,
  dateRange
);

if (!result.success) {
  const errorMessage = result.errors?.[0] || 'Unknown error';

  // Handle specific error cases
  if (errorMessage.includes('not found')) {
    console.error('Cloud account does not exist');
    // Maybe trigger account cleanup
  } else if (errorMessage.includes('Invalid AWS credentials')) {
    console.error('AWS credentials are invalid');
    // Maybe trigger re-authentication flow
  } else if (errorMessage.includes('ENCRYPTION_KEY')) {
    console.error('Server configuration error');
    // Alert administrators
  } else {
    console.error('Generic error:', errorMessage);
  }
}
```

---

## Multi-Account Collection

### Parallel Collection with Concurrency Control

```typescript
import pLimit from 'p-limit';

async function collectCostsForAllAccounts(
  dateRange: { start: Date; end: Date },
  concurrency: number = 5
) {
  // Get all cloud accounts
  const accounts = await prisma.cloudAccount.findMany({
    where: { status: 'active' }
  });

  // Create concurrency limiter
  const limit = pLimit(concurrency);

  // Execute collections with concurrency limit
  const results = await Promise.all(
    accounts.map(account =>
      limit(() =>
        costCollectionService.collectCostsForAccount(account.id, dateRange)
      )
    )
  );

  // Calculate statistics
  const stats = {
    total: accounts.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    totalRecordsObtained: results.reduce((sum, r) => sum + r.recordsObtained, 0),
    totalRecordsSaved: results.reduce((sum, r) => sum + r.recordsSaved, 0),
    totalExecutionTimeMs: results.reduce((sum, r) => sum + r.executionTimeMs, 0)
  };

  console.log('Multi-account collection stats:', stats);
  return { results, stats };
}
```

### Collection with Progress Tracking

```typescript
async function collectWithProgress(accountIds: string[], dateRange: { start: Date; end: Date }) {
  const total = accountIds.length;
  let completed = 0;

  const results = [];

  for (const accountId of accountIds) {
    console.log(`[Progress] Collecting costs for account ${accountId} (${completed + 1}/${total})...`);

    const result = await costCollectionService.collectCostsForAccount(
      accountId,
      dateRange
    );

    results.push(result);
    completed++;

    const percentage = ((completed / total) * 100).toFixed(2);
    console.log(`[Progress] ${percentage}% complete (${completed}/${total})`);
  }

  return results;
}
```

---

## Best Practices

1. **Use Transactions**: The service already uses transactions internally, but ensure your calling code doesn't interfere with this.

2. **Handle Errors Gracefully**: Always check the `success` field in the result before proceeding.

3. **Implement Retry Logic**: Network issues and API rate limits can cause temporary failures.

4. **Monitor Performance**: Track `executionTimeMs` to identify slow collections.

5. **Use Background Jobs**: Don't run cost collection synchronously in API endpoints.

6. **Validate Date Ranges**: Ensure date ranges are reasonable (e.g., not more than 90 days).

7. **Implement Idempotency**: The service handles duplicates, but ensure your job queue doesn't submit duplicate jobs.

8. **Log Everything**: The service logs internally, but add your own application-level logging.

9. **Set Alerts**: Monitor for failed collections and alert when success rate drops below threshold.

10. **Respect Rate Limits**: AWS Cost Explorer has rate limits. Don't collect too frequently.
