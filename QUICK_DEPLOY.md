# Quick Deployment Guide - Test Environment

## The Fix (What Changed)

**ROOT CAUSE:** Port mismatch - Dockerfile used port 4000, docker-compose expected 3010

**FIXED FILES:**
1. `apps/api-gateway/Dockerfile.production` - Changed all ports from 4000 to 3010
2. `docker-compose.production.yml` - Improved health check (curl, more retries, longer start period)
3. Created `scripts/deploy-test.sh` - New aggressive deployment script

## Deploy Now (Choose One Method)

### Method 1: New Aggressive Script (RECOMMENDED)

```bash
cd /opt/copilot  # Your deployment directory
./scripts/deploy-test.sh v1.1.2  # Replace with your version
```

This script:
- Stops everything completely
- Cleans up old containers/images
- Pulls fresh images
- Starts from clean state
- Waits 75 seconds for initialization
- Validates health checks
- Shows detailed status

### Method 2: Manual Steps

```bash
cd /opt/copilot

# 1. Set version
export IMAGE_TAG=v1.1.2

# 2. STOP EVERYTHING
docker-compose -f docker-compose.production.yml down --remove-orphans --volumes

# 3. CLEANUP
docker container prune -f
docker image prune -af

# 4. PULL NEW IMAGES (with the port fix)
docker-compose -f docker-compose.production.yml pull

# 5. START FRESH
docker-compose -f docker-compose.production.yml up -d --force-recreate

# 6. WAIT (IMPORTANT!)
echo "Waiting 75 seconds for initialization..."
sleep 75

# 7. CHECK STATUS
docker-compose -f docker-compose.production.yml ps

# 8. TEST HEALTH
curl http://localhost:3010/health | jq '.'
```

## Before Deploying

You MUST rebuild and push the Docker image with the port fix:

```bash
# On your development machine
cd /path/to/Copilot

# Commit the fixes
git add .
git commit -m "fix: resolve port mismatch in Dockerfile (4000 -> 3010)"
git push origin main

# This will trigger GitHub Actions to:
# 1. Build new image with correct port (3010)
# 2. Push to registry
# 3. Deploy automatically

# OR build manually:
docker build -t ghcr.io/technessoluciones/copilot-api-gateway:v1.1.2 \
  -f apps/api-gateway/Dockerfile.production .

docker push ghcr.io/technessoluciones/copilot-api-gateway:v1.1.2
```

## Verify Deployment

```bash
# 1. Container status (wait ~60 seconds after start)
docker-compose -f docker-compose.production.yml ps
# Should show: "Up (healthy)"

# 2. Health check
curl http://localhost:3010/health
# Should return: {"status":"healthy","timestamp":"...","uptime":...}

# 3. Readiness check
curl http://localhost:3010/health/ready
# Should return: {"status":"healthy","checks":{"database":{"status":"up"},...}}

# 4. If unhealthy, check logs
docker-compose -f docker-compose.production.yml logs --tail=100 api-gateway
```

## Health Check Timeline

After starting containers:
- **0-60s**: Start period (initialization, health checks allowed to fail)
- **60s+**: First health check attempt
- **75s**: Check should pass if everything is working
- **90s**: All services should be healthy

## Troubleshooting

### Container shows "starting" for too long
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs --tail=100 api-gateway

# Check what the app is doing
docker-compose -f docker-compose.production.yml exec api-gateway ps aux
```

### Health check fails
```bash
# Test from inside container
docker-compose -f docker-compose.production.yml exec api-gateway curl http://localhost:3010/health

# Check if port is listening
docker-compose -f docker-compose.production.yml exec api-gateway netstat -tuln | grep 3010

# Check environment
docker-compose -f docker-compose.production.yml exec api-gateway env | grep PORT
```

### Database connection issues
```bash
# Test database connectivity
curl http://localhost:3010/health/ready | jq '.checks.database'

# Check Redis
curl http://localhost:3010/health/ready | jq '.checks.redis'
```

## Key Changes Summary

| What | Before | After | Impact |
|------|--------|-------|--------|
| Dockerfile PORT | 4000 | 3010 | App now listens on correct port |
| Dockerfile EXPOSE | 4000 | 3010 | Documentation alignment |
| Dockerfile HEALTHCHECK | 4000 | 3010 | Health check now works |
| Health check tool | wget | curl | More reliable |
| Health check retries | 3 | 5 | More fault-tolerant |
| Health check start_period | 40s | 60s | More time to initialize |

## Success Indicators

Deployment successful when you see:

```
NAME                          STATUS          PORTS
copilot-redis-1              Up (healthy)     127.0.0.1:6379->6379/tcp
copilot-api-gateway-1        Up (healthy)     0.0.0.0:3010->3010/tcp
copilot-frontend-1           Up (healthy)     0.0.0.0:3000->3000/tcp
```

And health endpoint returns:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-21T...",
  "uptime": 45.678,
  "version": "1.1.2"
}
```

## Next Deployment

For future deployments, you can use the simpler approach since the port fix is permanent:

```bash
export IMAGE_TAG=v1.1.3
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

But for this FIRST deployment after the fix, use the aggressive approach to ensure clean state.

---

**IMPORTANT:** This is a TEST environment. Downtime is acceptable. The aggressive "stop everything" approach ensures clean state and reliable deployments.
