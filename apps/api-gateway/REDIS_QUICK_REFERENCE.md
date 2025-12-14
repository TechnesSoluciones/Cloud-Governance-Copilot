# Redis Connection Resilience - Quick Reference

## Quick Start Testing

### Test 1: Normal Startup (2 minutes)
```bash
# From project root
cd /Users/josegomez/Documents/Code/SaaS/Copilot
docker-compose down
docker-compose up -d
docker-compose logs -f api-gateway

# Expected: Server starts, Redis connects, "healthy" status
curl http://localhost:4000/health/ready | jq
```

### Test 2: Redis Race Condition (5 minutes)
```bash
# Start without Redis
docker-compose down
docker-compose up postgres -d
sleep 5
docker-compose up api-gateway -d

# Watch logs - should see retry attempts
docker-compose logs -f api-gateway

# Start Redis after 30 seconds
sleep 30
docker-compose up redis -d

# Should see automatic reconnection
```

### Test 3: Quick Health Check
```bash
# Liveness (always succeeds)
curl http://localhost:4000/health/live

# Readiness (shows dependency status)
curl http://localhost:4000/health/ready | jq '.checks.redis'

# Full details
curl http://localhost:4000/health/dependencies | jq '.redis'
```

## API Reference

### Check Redis Availability
```typescript
import { isRedisAvailable, getRedisHealthStatus } from '../config/redis';

// Quick boolean check
if (isRedisAvailable()) {
  // Redis is connected and ready
}

// Detailed status
const health = getRedisHealthStatus();
console.log(health);
// {
//   status: 'connected' | 'connecting' | 'disconnected' | 'failed',
//   isOpen: boolean,
//   details: { retryCount, lastError, uptime, url }
// }
```

### Get Redis Client
```typescript
import { getRedis, getRedisSafe } from '../config/redis';

// Method 1: Throws if unavailable (strict)
try {
  const redis = getRedis();
  await redis.set('key', 'value');
} catch (error) {
  console.log('Redis unavailable');
}

// Method 2: Returns null if unavailable (graceful)
const redis = getRedisSafe();
if (redis) {
  await redis.set('key', 'value');
} else {
  console.log('Redis unavailable, skipping cache');
}
```

### Protect Routes with Middleware
```typescript
import { requireRedis, checkRedis } from '../middleware/redis-check';

// Strict: Block if Redis unavailable (returns 503)
router.post('/api/sessions', requireRedis, sessionController.create);

// Soft: Add availability flag but allow request
router.get('/api/data', checkRedis, (req, res) => {
  const redisAvailable = (req as any).redisAvailable;
  if (redisAvailable) {
    // Serve from cache
  } else {
    // Serve from database
  }
});
```

### Subscribe to Connection Events
```typescript
import { onConnectionStateChange } from '../config/redis';

// Listen for state changes
onConnectionStateChange((state) => {
  console.log('Redis state changed:', state);
  // state: 'connecting' | 'connected' | 'disconnected' | 'failed'
});
```

## Health Check Endpoints

### GET /health/live
Always returns 200 if process is running
```bash
curl http://localhost:4000/health/live
```
Response:
```json
{ "status": "alive", "timestamp": "..." }
```

### GET /health/ready
Returns dependency status (200 even if degraded)
```bash
curl http://localhost:4000/health/ready
```
Response (healthy):
```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "up", "responseTime": 5 },
    "redis": { "status": "up", "responseTime": 2, "message": "Connected for 123s" }
  }
}
```

Response (degraded):
```json
{
  "status": "degraded",
  "checks": {
    "database": { "status": "up" },
    "redis": { "status": "degraded", "message": "Connecting (attempt 5)" }
  }
}
```

### GET /health/dependencies
Detailed dependency information
```bash
curl http://localhost:4000/health/dependencies | jq '.redis'
```
Response:
```json
{
  "status": "connected",
  "connectionState": "connected",
  "responseTime": 2,
  "uptime": 123456,
  "ping": "PONG",
  "info": "redis_version:7.2.4\n..."
}
```

## Common Patterns

### Pattern 1: Cache with Fallback
```typescript
async function getData(id: string) {
  // Try cache first
  const cached = getRedisSafe()?.get(`data:${id}`);
  if (cached) return JSON.parse(cached);

  // Fallback to database
  const data = await database.getData(id);

  // Cache for next time (if Redis available)
  if (isRedisAvailable()) {
    await setRedisValue(`data:${id}`, JSON.stringify(data), 3600);
  }

  return data;
}
```

### Pattern 2: Session with Degraded Mode
```typescript
async function createSession(userId: string) {
  const sessionId = generateId();

  if (isRedisAvailable()) {
    // Use Redis for fast session storage
    await setRedisValue(`session:${sessionId}`, userId, 86400);
  } else {
    // Fallback to database (slower but works)
    await database.createSession(sessionId, userId);
  }

  return sessionId;
}
```

### Pattern 3: Rate Limiting with Fallback
```typescript
async function checkRateLimit(ip: string): Promise<boolean> {
  if (!isRedisAvailable()) {
    // Allow request if Redis unavailable (fail open)
    logger.warn('Rate limiting disabled - Redis unavailable');
    return true;
  }

  const key = `ratelimit:${ip}`;
  const current = await getRedisValue(key);
  const count = current ? parseInt(current) : 0;

  if (count >= 100) return false;

  await setRedisValue(key, String(count + 1), 60);
  return true;
}
```

## Log Messages Reference

### Normal Operation
```
Redis: Initializing client { url: '***configured***' }
Redis: Connection initiated
Redis: Ready to accept commands
Redis: Connected successfully { retryCount: 0, totalAttemptTime: 1234 }
```

### Connection Issues
```
Redis: Connection attempt 1/20 failed, retrying in 1000ms
Redis: Connection attempt 2/20 failed, retrying in 2000ms
Redis: Connection attempt 3/20 failed, retrying in 4000ms
```

### Degraded Mode
```
Redis: Max startup retries reached, continuing without Redis { mode: 'degraded' }
Server started - some features may be degraded if dependencies are unavailable
Could not schedule Daily Cost Collection Job - Redis may not be ready yet
```

### Recovery
```
Redis: Connected successfully { retryCount: 5, totalAttemptTime: 31234 }
Daily Cost Collection Job scheduled successfully (runs daily at 2 AM)
```

### Runtime Disconnection
```
Redis: Reconnecting after connection loss
Redis: Runtime reconnecting in 2000ms (attempt 1)
Redis Client Error: { error: ..., connectionState: 'connecting' }
```

## Troubleshooting Quick Fixes

### Server crashes on startup
```bash
# Rebuild Docker image
docker-compose build api-gateway --no-cache
docker-compose up -d

# Verify new code
docker-compose logs api-gateway | grep "Redis:"
```

### Redis never connects
```bash
# Check Redis URL
docker-compose exec api-gateway env | grep REDIS_URL

# Test connectivity
docker-compose exec api-gateway nc -zv redis 6379

# Check Redis is running
docker-compose ps redis
docker-compose logs redis
```

### Health check always degraded
```bash
# Manual Redis test
docker-compose exec redis redis-cli PING

# Check connection state
docker-compose logs api-gateway | grep "connectionState"

# Restart services
docker-compose restart redis api-gateway
```

### Too many retry logs
```bash
# Reduce log verbosity (temporary)
docker-compose exec api-gateway sh -c 'export LOG_LEVEL=warn'

# Or update docker-compose.yml
environment:
  - LOG_LEVEL=warn
```

## Configuration Tuning

### Adjust Retry Behavior
Edit `/apps/api-gateway/src/config/redis.ts`:

```typescript
// Change max startup retries (default: 20)
const maxRetries = isStartup ? 30 : Infinity;

// Change initial delay (default: 1000ms)
let currentDelay = 2000;

// Change max delay cap (default: 15000ms)
currentDelay = Math.min(currentDelay * 2, 30000);
```

### Adjust Health Check Sensitivity
Edit `/apps/api-gateway/src/routes/health.routes.ts`:

```typescript
// Make Redis critical (return unhealthy instead of degraded)
if (overallStatus === 'healthy') {
  overallStatus = 'unhealthy'; // Change from 'degraded'
}
```

## Kubernetes Deployment

### Liveness Probe
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 4000
  initialDelaySeconds: 10
  periodSeconds: 10
  failureThreshold: 3
```

### Readiness Probe
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 4000
  initialDelaySeconds: 15
  periodSeconds: 5
  successThreshold: 1
  failureThreshold: 3
```

Note: Readiness returns 200 even when degraded, so pods stay in rotation.

## Monitoring Alerts

### Prometheus Metrics (if implemented)
```promql
# Alert if Redis disconnected for > 5 minutes
redis_connection_state{state="disconnected"} == 1 for 5m

# Alert if retry count high
redis_retry_count > 10

# Alert if multiple pods degraded
count(health_status{status="degraded"}) > 1
```

### Log-based Alerts
- Alert on: "Max startup retries reached"
- Alert on: "Redis unavailable" (sustained for > 5 min)
- Alert on: Repeated connection failures

## Quick Commands

```bash
# View logs
docker-compose logs -f api-gateway

# Check Redis status
curl -s http://localhost:4000/health/ready | jq '.checks.redis'

# Restart Redis
docker-compose restart redis

# Restart API Gateway
docker-compose restart api-gateway

# View all containers
docker-compose ps

# Clean restart
docker-compose down
docker-compose up -d

# Check Redis directly
docker-compose exec redis redis-cli PING
docker-compose exec redis redis-cli INFO

# Check from API Gateway container
docker-compose exec api-gateway nc -zv redis 6379
```

## Success Indicators

✅ Server starts in < 10 seconds regardless of Redis
✅ Logs show clear connection state transitions
✅ Health checks accurately reflect Redis status
✅ Automatic reconnection when Redis becomes available
✅ No crashes or process exits
✅ BullMQ jobs schedule when Redis connects

## Files Modified

- `/apps/api-gateway/src/config/redis.ts` - Main implementation
- `/apps/api-gateway/src/index.ts` - Non-blocking startup
- `/apps/api-gateway/src/routes/health.routes.ts` - Enhanced health checks
- `/apps/api-gateway/src/middleware/redis-check.ts` - Route protection (new)

## Next Steps

1. Deploy to staging environment
2. Monitor connection behavior for 24-48 hours
3. Adjust retry parameters if needed
4. Implement circuit breaker pattern (optional)
5. Add Prometheus metrics for monitoring (optional)

---

**Last Updated**: 2025-12-13
**Status**: Production Ready
