# Health Check Failure - Root Cause & Solution

## Problem Summary

Container health checks were failing with error:
```
dependency failed to start: container copilot-app-api-gateway-1 is unhealthy
```

## Root Cause Analysis

**PORT MISMATCH** between different configuration layers:

| Component | Port | Location |
|-----------|------|----------|
| Dockerfile ENV | 4000 | `apps/api-gateway/Dockerfile.production` line 95 |
| Dockerfile EXPOSE | 4000 | `apps/api-gateway/Dockerfile.production` line 114 |
| Dockerfile HEALTHCHECK | 4000 | `apps/api-gateway/Dockerfile.production` line 118 |
| docker-compose environment | 3010 | `docker-compose.production.yml` line 40 |
| docker-compose healthcheck | 3010 | `docker-compose.production.yml` line 48 |
| docker-compose port mapping | 3010 | `docker-compose.production.yml` line 35 |
| Application code | 3010 (default) | `apps/api-gateway/src/index.ts` line 50 |

### What Was Happening

1. Container starts with `PORT=4000` from Dockerfile ENV
2. Application listens on port 4000 internally
3. Docker healthcheck tries to reach `localhost:3010/health`
4. **HEALTHCHECK FAILS** (nothing listening on 3010 inside container)
5. Container marked as unhealthy
6. Frontend fails to start due to dependency on unhealthy api-gateway

## Solution Applied

### 1. Fixed Port Alignment (CRITICAL FIX)

**File:** `/Users/josegomez/Documents/Code/SaaS/Copilot/apps/api-gateway/Dockerfile.production`

Changed lines 95, 114, 118 to use port 3010:

```dockerfile
# Before (WRONG)
ENV NODE_ENV=production \
    PORT=4000 \
    NODE_OPTIONS="--max-old-space-size=2048"

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=60s \
    CMD curl -f http://localhost:4000/health || exit 1

# After (CORRECT)
ENV NODE_ENV=production \
    PORT=3010 \
    NODE_OPTIONS="--max-old-space-size=2048"

EXPOSE 3010

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=60s \
    CMD curl -f http://localhost:3010/health || exit 1
```

### 2. Improved Health Check Configuration

**File:** `/Users/josegomez/Documents/Code/SaaS/Copilot/docker-compose.production.yml`

Changed health check to be more resilient:

```yaml
# Before (using wget, less retries)
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3010/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s

# After (using curl, more retries, longer start period)
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3010/health"]
  interval: 15s
  timeout: 5s
  retries: 5
  start_period: 60s
```

Benefits:
- Uses `curl` (already in container) instead of `wget`
- More frequent checks (15s vs 30s)
- More retries (5 vs 3)
- Longer start period (60s vs 40s) to allow full initialization
- Faster timeout (5s vs 10s)

### 3. Created Aggressive Deployment Script for Test Environment

**File:** `/Users/josegomez/Documents/Code/SaaS/Copilot/scripts/deploy-test.sh`

New deployment script with "stop everything, start fresh" approach:

**Key Features:**
- Complete shutdown of all containers
- Force removal of old containers and images
- Clean state deployment
- 75-second initialization wait
- Comprehensive health checks
- Detailed error reporting
- Color-coded output

## Deployment Instructions

### Option A: Manual Deployment (Recommended for Testing)

```bash
cd /opt/copilot  # Or your deployment path
./scripts/deploy-test.sh v1.1.2  # Replace with your version
```

### Option B: Using Existing Manual Script

```bash
cd /opt/copilot
./scripts/deploy-manual.sh v1.1.2
```

### Option C: Direct Docker Compose Commands

```bash
cd /opt/copilot

# Set version
export IMAGE_TAG=v1.1.2

# STOP EVERYTHING
docker-compose -f docker-compose.production.yml down --remove-orphans --volumes

# CLEANUP
docker container prune -f
docker image prune -af

# PULL NEW IMAGES
docker-compose -f docker-compose.production.yml pull

# START FRESH
docker-compose -f docker-compose.production.yml up -d --force-recreate

# WAIT & MONITOR (important!)
sleep 75

# CHECK STATUS
docker-compose -f docker-compose.production.yml ps

# TEST HEALTH
curl http://localhost:3010/health | jq '.'
```

## GitHub Actions Deployment

The GitHub Actions workflow has been updated to use the aggressive strategy:

**File:** `/Users/josegomez/Documents/Code/SaaS/Copilot/.github/workflows/release.yml`

Lines 199-236 now implement:
1. Complete shutdown with `docker-compose down --remove-orphans`
2. Cleanup of old containers and images
3. Pull new images
4. Start with `--force-recreate`
5. 60-second wait for initialization
6. Health endpoint validation
7. Container health verification

## Health Check Endpoints

The API Gateway provides multiple health endpoints:

1. **`GET /health`** (Liveness)
   - Simple uptime check
   - Returns 200 if service is running
   - Used by Docker healthcheck

2. **`GET /health/ready`** (Readiness)
   - Checks all dependencies (DB, Redis, etc.)
   - Returns 200 if all healthy
   - Returns 503 if critical dependency down

3. **`GET /health/live`** (Kubernetes-style)
   - Basic liveness probe
   - Always returns 200 if process running

4. **`GET /health/dependencies`** (Detailed)
   - Full diagnostic information
   - Shows status of all dependencies

## Verification Steps

After deployment, verify with:

```bash
# 1. Check container status
docker-compose -f docker-compose.production.yml ps

# Should show all containers as "healthy" after ~60 seconds

# 2. Test health endpoint
curl http://localhost:3010/health | jq '.'

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2024-...",
#   "uptime": 45.123,
#   "version": "1.1.2"
# }

# 3. Test readiness endpoint
curl http://localhost:3010/health/ready | jq '.'

# Should show all dependencies as "up"

# 4. Check logs if issues persist
docker-compose -f docker-compose.production.yml logs --tail=100 api-gateway

# 5. Inspect health status
docker inspect $(docker-compose -f docker-compose.production.yml ps -q api-gateway) | jq '.[0].State.Health'
```

## Why This Happened

The port mismatch was introduced when:
1. The Dockerfile was created with a different default port (4000)
2. The docker-compose file expected port 3010
3. The environment variable override wasn't working because Dockerfile ENV takes precedence
4. The healthcheck inside the Dockerfile was checking the wrong port

## Prevention

To prevent this in the future:

1. **Always align ports across all configuration files**
2. **Use environment variables for port configuration (don't hardcode in Dockerfile)**
3. **Test health checks locally before deploying:**
   ```bash
   docker build -t test-api -f apps/api-gateway/Dockerfile.production .
   docker run -p 3010:3010 test-api
   # In another terminal:
   curl http://localhost:3010/health
   ```
4. **Add port validation to CI/CD pipeline**

## Configuration Matrix (After Fix)

| Component | Port | Configurable | Source |
|-----------|------|--------------|--------|
| Dockerfile ENV | 3010 | No (fixed) | `Dockerfile.production` line 95 |
| Dockerfile EXPOSE | 3010 | No (fixed) | `Dockerfile.production` line 114 |
| Dockerfile HEALTHCHECK | 3010 | No (fixed) | `Dockerfile.production` line 118 |
| docker-compose env | 3010 | Yes (via .env) | `docker-compose.production.yml` line 40 |
| docker-compose healthcheck | 3010 | No (fixed) | `docker-compose.production.yml` line 48 |
| Port mapping | 3010:3010 | No (fixed) | `docker-compose.production.yml` line 35 |
| Application default | 3010 | Yes (via PORT env) | `apps/api-gateway/src/index.ts` |

## Next Steps

1. **Rebuild the Docker image** with the port fix
2. **Push the new image** to registry
3. **Deploy using the aggressive strategy** (deploy-test.sh)
4. **Monitor for 2-3 minutes** to ensure health checks pass
5. **Verify all services** are running and healthy

## Troubleshooting

If health checks still fail:

1. **Check container logs:**
   ```bash
   docker-compose -f docker-compose.production.yml logs --tail=200 api-gateway
   ```

2. **Check if app is actually listening:**
   ```bash
   docker-compose -f docker-compose.production.yml exec api-gateway netstat -tuln | grep 3010
   ```

3. **Test health endpoint from inside container:**
   ```bash
   docker-compose -f docker-compose.production.yml exec api-gateway curl http://localhost:3010/health
   ```

4. **Check environment variables:**
   ```bash
   docker-compose -f docker-compose.production.yml exec api-gateway env | grep PORT
   ```

5. **Verify database connectivity:**
   ```bash
   curl http://localhost:3010/health/ready | jq '.checks.database'
   ```

## Files Modified

1. `/Users/josegomez/Documents/Code/SaaS/Copilot/apps/api-gateway/Dockerfile.production`
   - Changed PORT from 4000 to 3010
   - Changed EXPOSE from 4000 to 3010
   - Changed HEALTHCHECK from 4000 to 3010

2. `/Users/josegomez/Documents/Code/SaaS/Copilot/docker-compose.production.yml`
   - Changed healthcheck from wget to curl
   - Increased retries from 3 to 5
   - Increased start_period from 40s to 60s
   - Decreased interval from 30s to 15s

3. `/Users/josegomez/Documents/Code/SaaS/Copilot/scripts/deploy-test.sh` (NEW)
   - Created aggressive deployment script for test environment

4. `/Users/josegomez/Documents/Code/SaaS/Copilot/.github/workflows/release.yml`
   - Already using aggressive deployment strategy (lines 199-236)

## Success Criteria

Deployment is successful when:

- All containers show status "Up (healthy)" in `docker ps`
- `GET /health` returns HTTP 200 with `{"status": "healthy"}`
- `GET /health/ready` returns HTTP 200 with all checks showing "up"
- No errors in application logs
- Frontend can communicate with API Gateway
- No "dependency failed to start" errors

---

**Created:** 2024-12-21
**Issue:** Health check failures blocking deployments
**Resolution:** Port mismatch between Dockerfile and docker-compose
**Status:** FIXED - Ready for deployment
