# Build Validation Steps - Docker Build Fixes

**Date:** 2025-12-23
**Purpose:** Validate that Docker build fixes work correctly before deployment
**Estimated Time:** 5-10 minutes per build

---

## Pre-Validation Checklist

Before running builds, ensure:

- [ ] Docker is installed and running
- [ ] Project root directory: `/Users/josegomez/Documents/Code/SaaS/Copilot`
- [ ] All three files have been modified (see DOCKER_BUILD_FIXES.md)
- [ ] Git changes are ready to be committed

---

## Option 1: Validate Frontend Build

### Step 1: Build Frontend Image

```bash
cd /Users/josegomez/Documents/Code/SaaS/Copilot

docker build \
  --file ./apps/frontend/Dockerfile \
  --tag copilot-frontend:validation \
  --build-arg GIT_COMMIT_SHA=$(git rev-parse --short HEAD) \
  --build-arg BUILD_TIMESTAMP=$(date +%s) \
  --build-arg VERSION_TAG=validation \
  .
```

**Expected Output:**
```
[+] Building 45.2s (18/18) FINISHED
 => [internal] load build definition from Dockerfile
 => [internal] load .dockerignore
 => [internal] load metadata for docker.io/library/node:20-alpine
 ...
 => => writing image sha256:abc123...
 => => naming to docker.io/library/copilot-frontend:validation
```

### Step 2: Verify Frontend Image

```bash
# Check image was created
docker images | grep copilot-frontend

# Test image runs
docker run --rm copilot-frontend:validation \
  node -e "console.log('Frontend image is valid')"

# Expected output:
# Frontend image is valid
```

### Step 3: Check Frontend Files in Container

```bash
# Verify .next directory exists
docker run --rm copilot-frontend:validation \
  ls -la /.next/

# Expected output: Shows BUILD_ID, static/, server/ directories

# Verify server.js exists
docker run --rm copilot-frontend:validation \
  test -f ./server.js && echo "server.js exists" || echo "ERROR: server.js not found"

# Expected output:
# server.js exists
```

### Step 4: Clean Up

```bash
docker rmi copilot-frontend:validation
```

---

## Option 2: Validate API Gateway Build

### Step 1: Build API Gateway Image

```bash
cd /Users/josegomez/Documents/Code/SaaS/Copilot

docker build \
  --file ./apps/api-gateway/Dockerfile \
  --tag copilot-api-gateway:validation \
  --build-arg GIT_COMMIT_SHA=$(git rev-parse --short HEAD) \
  --build-arg BUILD_TIMESTAMP=$(date +%s) \
  --build-arg VERSION_TAG=validation \
  .
```

**Expected Output:**
```
[+] Building 52.1s (21/21) FINISHED
 => [internal] load build definition from Dockerfile
 => [internal] load .dockerignore
 => [internal] load metadata for docker.io/library/node:20-alpine
 ...
 => => writing image sha256:def456...
 => => naming to docker.io/library/copilot-api-gateway:validation
```

### Step 2: Verify API Gateway Image

```bash
# Check image was created
docker images | grep copilot-api-gateway

# Test image runs
docker run --rm copilot-api-gateway:validation \
  node -e "console.log('API Gateway image is valid')"

# Expected output:
# API Gateway image is valid
```

### Step 3: Check API Gateway Files in Container

```bash
# Verify dist directory exists
docker run --rm copilot-api-gateway:validation \
  ls -la /app/dist/

# Expected output: Shows compiled TypeScript files

# Verify main entry point exists
docker run --rm copilot-api-gateway:validation \
  test -f /app/dist/index.js && echo "dist/index.js exists" || echo "ERROR: dist/index.js not found"

# Expected output:
# dist/index.js exists
```

### Step 4: Clean Up

```bash
docker rmi copilot-api-gateway:validation
```

---

## Option 3: Build Both Images (Simulating GitHub Actions)

### Parallel Build (Faster)

```bash
cd /Users/josegomez/Documents/Code/SaaS/Copilot

# Build both images in background
docker build \
  --file ./apps/frontend/Dockerfile \
  --tag copilot-frontend:validation \
  --build-arg GIT_COMMIT_SHA=$(git rev-parse --short HEAD) \
  --build-arg BUILD_TIMESTAMP=$(date +%s) \
  --build-arg VERSION_TAG=validation \
  . &

docker build \
  --file ./apps/api-gateway/Dockerfile \
  --tag copilot-api-gateway:validation \
  --build-arg GIT_COMMIT_SHA=$(git rev-parse --short HEAD) \
  --build-arg BUILD_TIMESTAMP=$(date +%s) \
  --build-arg VERSION_TAG=validation \
  . &

# Wait for both to complete
wait
```

### Sequential Build (Simpler Debugging)

```bash
cd /Users/josegomez/Documents/Code/SaaS/Copilot

# Build API Gateway first (it's smaller)
docker build \
  --file ./apps/api-gateway/Dockerfile \
  --tag copilot-api-gateway:validation \
  --build-arg GIT_COMMIT_SHA=$(git rev-parse --short HEAD) \
  --build-arg BUILD_TIMESTAMP=$(date +%s) \
  --build-arg VERSION_TAG=validation \
  .

echo "API Gateway build complete. Starting Frontend build..."

# Build Frontend
docker build \
  --file ./apps/frontend/Dockerfile \
  --tag copilot-frontend:validation \
  --build-arg GIT_COMMIT_SHA=$(git rev-parse --short HEAD) \
  --build-arg BUILD_TIMESTAMP=$(date +%s) \
  --build-arg VERSION_TAG=validation \
  .

echo "Both builds complete!"
```

---

## Troubleshooting Common Issues

### Issue: "COPY apps/frontend/package*.json: file not found"

**Cause:** Build context is not the project root

**Solution:**
- Ensure you're running docker build from project root
- Verify command includes correct context: `.` at the end

```bash
# CORRECT
docker build --file ./apps/frontend/Dockerfile ... .

# INCORRECT
cd apps/frontend && docker build --file ./Dockerfile ... .
```

---

### Issue: "No such file or directory" for Dockerfile

**Cause:** Dockerfile path is incorrect

**Solution:**
- Verify Dockerfile exists in exact location
- Use `--file` flag with full path from context root

```bash
# Verify file exists
ls -la ./apps/frontend/Dockerfile

# Use correct flag
docker build --file ./apps/frontend/Dockerfile ...
```

---

### Issue: Build takes much longer than expected

**Cause:** Docker cache might be stale or disabled

**Solution:**
```bash
# Clear Docker build cache
docker builder prune --all -f

# Rebuild (will be slower first time, faster after)
docker build ...
```

---

### Issue: "package.json not found" in build stage

**Cause:** COPY path is incorrect for build context

**Solution:** Ensure line 19 in Dockerfile has correct path

```dockerfile
# CORRECT (for context=.)
COPY apps/frontend/package*.json ./

# INCORRECT (for context=.)
COPY package*.json ./
```

---

## Validation Success Criteria

Build is successful when:

✓ Docker build completes without errors
✓ Image is created with correct tag
✓ All build layers complete successfully
✓ Final image size is reasonable (Frontend: ~180MB, API Gateway: ~130MB)
✓ Files in container exist in correct locations
✓ No "file not found" errors during COPY commands

---

## Image Size Expectations

After successful build:

**Frontend Image:**
```bash
docker images | grep copilot-frontend
# Expected size: ~180-200MB
```

**API Gateway Image:**
```bash
docker images | grep copilot-api-gateway
# Expected size: ~120-150MB
```

---

## Post-Validation Next Steps

1. **If builds succeed:**
   - Commit changes to git
   - Push to main branch
   - GitHub Actions will run automatically
   - Monitor workflow progress
   - Verify deployment to Hetzner

2. **If builds fail:**
   - Review error message carefully
   - Check troubleshooting section above
   - Verify all three files were modified correctly
   - Review DOCKER_BUILD_FIXES.md for expected changes
   - Contact development team with error output

---

## Quick Reference Commands

```bash
# Navigate to project root
cd /Users/josegomez/Documents/Code/SaaS/Copilot

# Build Frontend
docker build --file ./apps/frontend/Dockerfile \
  --tag copilot-frontend:validation \
  --build-arg GIT_COMMIT_SHA=$(git rev-parse --short HEAD) \
  --build-arg BUILD_TIMESTAMP=$(date +%s) \
  --build-arg VERSION_TAG=validation .

# Build API Gateway
docker build --file ./apps/api-gateway/Dockerfile \
  --tag copilot-api-gateway:validation \
  --build-arg GIT_COMMIT_SHA=$(git rev-parse --short HEAD) \
  --build-arg BUILD_TIMESTAMP=$(date +%s) \
  --build-arg VERSION_TAG=validation .

# Verify images
docker images | grep copilot

# Clean up images
docker rmi copilot-frontend:validation copilot-api-gateway:validation

# View build output (after starting build)
docker buildx build ... --progress=plain
```

---

**Documentation Date:** 2025-12-23
**Related Files:** DOCKER_BUILD_FIXES.md, BUILD_FIXES_SUMMARY.txt, SESSION_LOG_2025_12_23.md
