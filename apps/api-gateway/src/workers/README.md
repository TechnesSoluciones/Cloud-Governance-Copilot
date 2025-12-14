# Background Workers

This directory contains standalone worker processes for the API Gateway.

## Overview

Background workers are separate Node.js processes that handle long-running or scheduled tasks independently from the main API server. This architecture provides:

- **Isolation**: Worker failures don't affect the API server
- **Scalability**: Workers can be scaled independently
- **Resource Management**: CPU-intensive tasks don't block API requests
- **Reliability**: Jobs can retry automatically without user intervention

## Available Workers

### Cost Collection Worker

**File**: `cost-collection-worker.ts`

**Purpose**: Automatically collects cost data from all active cloud accounts daily at 2 AM.

**Schedule**: Daily at 2:00 AM (America/New_York timezone)

**How it works**:
1. Retrieves all active AWS cloud accounts
2. For each account:
   - Collects yesterday's cost data from AWS Cost Explorer
   - Analyzes costs for anomalies (>50% deviation from 30-day average)
   - Creates anomaly records and emits events for alerting
3. Returns summary of successful/failed account processing

**Environment Variables**:
- `REDIS_HOST`: Redis server hostname
- `REDIS_PORT`: Redis server port
- `DATABASE_URL`: PostgreSQL connection string
- `ENCRYPTION_KEY`: 32-byte encryption key for credentials

**Starting the Worker**:

```bash
# Development
npx tsx src/workers/cost-collection-worker.ts

# Production (compiled)
node dist/workers/cost-collection-worker.js

# Using PM2 (recommended)
pm2 start ecosystem.config.js --only cost-collection-worker
```

**Logs**:
```bash
# View worker logs
pm2 logs cost-collection-worker

# View last 100 lines
pm2 logs cost-collection-worker --lines 100

# Follow logs in real-time
pm2 logs cost-collection-worker --raw
```

**Monitoring**:
```bash
# Check worker status
pm2 status cost-collection-worker

# View resource usage
pm2 monit
```

**Manual Trigger** (for testing):
```bash
npx tsx examples/trigger-cost-collection.ts
```

## Architecture

```
┌─────────────────────────────────────────┐
│           Main API Server               │
│          (Express.js + REST)            │
│                                         │
│  - Handles HTTP requests                │
│  - User authentication                  │
│  - Real-time API responses              │
└─────────────────┬───────────────────────┘
                  │
                  │ Can trigger jobs via queue
                  │
                  v
         ┌────────────────┐
         │  Redis Queue   │
         │   (BullMQ)     │
         └────────┬───────┘
                  │
                  │ Job scheduling & distribution
                  │
                  v
┌─────────────────────────────────────────┐
│        Background Workers               │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Cost Collection Worker           │  │
│  │  - Scheduled: 2 AM daily          │  │
│  │  - Processes: Cost data collection│  │
│  │  - Retry: 3 attempts              │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Future Worker 2                  │  │
│  │  (e.g., Asset Discovery)          │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Future Worker 3                  │  │
│  │  (e.g., Security Scanning)        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Development Guidelines

### Creating a New Worker

1. **Create worker file**: `src/workers/{name}-worker.ts`

```typescript
import { scheduleYourJob } from '../shared/jobs';

async function startWorker() {
  console.log('[Worker] Starting {name} worker...');

  try {
    await scheduleYourJob();
    console.log('[Worker] Worker ready and listening for jobs');
  } catch (error) {
    console.error('[Worker] Failed to start:', error);
    process.exit(1);
  }
}

// Error handlers
process.on('uncaughtException', (error) => {
  console.error('[Worker] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Worker] Unhandled rejection:', reason);
  process.exit(1);
});

startWorker();
```

2. **Create job implementation**: `src/shared/jobs/{name}.job.ts`

```typescript
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

export const yourQueue = new Queue('your-job-name', { connection });

const worker = new Worker(
  'your-job-name',
  async (job) => {
    // Job logic here
    console.log('Processing job:', job.id);
    return { success: true };
  },
  { connection }
);

export async function scheduleYourJob() {
  // Schedule logic here
}

export async function shutdownYourJob() {
  await worker.close();
  await yourQueue.close();
  await connection.quit();
}
```

3. **Add to PM2 config**: `ecosystem.config.js`

```javascript
{
  name: 'your-worker-name',
  script: './dist/workers/your-worker.js',
  instances: 1,
  exec_mode: 'fork',
  // ... other config
}
```

4. **Update documentation**: Add worker details to this README

### Best Practices

1. **Always use graceful shutdown**:
   - Close workers properly on SIGTERM/SIGINT
   - Wait for current job to complete before exiting
   - Close all connections (Redis, Database, etc.)

2. **Implement comprehensive logging**:
   - Log job start/completion
   - Log errors with stack traces
   - Include contextual information (job ID, account ID, etc.)

3. **Error handling**:
   - Catch errors at job level (don't crash the worker)
   - Re-throw errors for BullMQ retry mechanism
   - Log all errors for debugging

4. **Resource management**:
   - Set memory limits (`max_memory_restart` in PM2)
   - Clean up completed jobs to prevent memory leaks
   - Use connection pooling for databases

5. **Monitoring**:
   - Emit metrics (job duration, success rate, etc.)
   - Set up alerts for job failures
   - Monitor queue depth and processing rate

## Deployment

### Production Deployment Checklist

- [ ] Set all required environment variables
- [ ] Configure PM2 ecosystem file
- [ ] Set up log rotation
- [ ] Configure monitoring/alerting
- [ ] Test graceful shutdown
- [ ] Document on-call procedures
- [ ] Set up health checks

### Docker Deployment

```dockerfile
# Dockerfile.worker
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY prisma ./prisma

RUN npx prisma generate

CMD ["node", "dist/workers/cost-collection-worker.js"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cost-collection-worker
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cost-collection-worker
  template:
    metadata:
      labels:
        app: cost-collection-worker
    spec:
      containers:
      - name: worker
        image: your-registry/cost-collection-worker:latest
        envFrom:
        - secretRef:
            name: copilot-secrets
```

## Troubleshooting

### Worker not starting

1. Check Redis connection:
   ```bash
   redis-cli ping
   ```

2. Check environment variables:
   ```bash
   pm2 env cost-collection-worker
   ```

3. Check logs:
   ```bash
   pm2 logs cost-collection-worker --lines 100
   ```

### Worker consuming too much memory

1. Check PM2 memory usage:
   ```bash
   pm2 monit
   ```

2. Adjust memory limit:
   ```javascript
   max_memory_restart: '512M'  // in ecosystem.config.js
   ```

3. Review job retention settings:
   ```typescript
   removeOnComplete: { count: 100 }  // Reduce if needed
   ```

### Jobs not processing

1. Check worker status:
   ```bash
   pm2 status
   ```

2. Check Redis queue:
   ```bash
   redis-cli
   > KEYS bull:cost-collection:*
   ```

3. Manually trigger job:
   ```bash
   npx tsx examples/trigger-cost-collection.ts
   ```

## References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Node.js Worker Threads](https://nodejs.org/api/worker_threads.html)
