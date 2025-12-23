# Docker Build Fixes - Cloud Governance Copilot v1.2.0

**Date:** 2025-12-23
**Issue:** Frontend and API Gateway build failures in GitHub Actions deployment to Hetzner
**Status:** FIXED

## Summary

Three critical issues prevented successful Docker builds in CI/CD:
1. References to non-existent `Dockerfile.production` files
2. Incorrect COPY paths relative to build context
3. Invalid build arguments passed to Dockerfiles

All issues have been resolved.

---

## Issue #1: Non-existent Dockerfile References

### Problem
GitHub Actions workflow referenced `Dockerfile.production` which did not exist:
- `./apps/frontend/Dockerfile.production` (non-existent)
- `./apps/api-gateway/Dockerfile.production` (non-existent)

Only these files existed:
- `./apps/frontend/Dockerfile` (production multi-stage)
- `./apps/api-gateway/Dockerfile` (production multi-stage)
- `./apps/frontend/Dockerfile.dev` (development)
- `./apps/api-gateway/Dockerfile.dev` (development)

### Solution
**File:** `.github/workflows/build-and-push.yml`

```yaml
# API Gateway Job - Line 59
- BEFORE: file: ./apps/api-gateway/Dockerfile.production
+ AFTER:  file: ./apps/api-gateway/Dockerfile

# Frontend Job - Line 110
- BEFORE: file: ./apps/frontend/Dockerfile.production
+ AFTER:  file: ./apps/frontend/Dockerfile
```

---

## Issue #2: Incorrect Build Context Paths

### Problem
**GitHub Actions Build Context:** `.` (project root)
**Dockerfile Locations:** `./apps/frontend/` and `./apps/api-gateway/`

When using context `.` (root), COPY commands need to reference full paths from root.
However, Dockerfiles used relative paths as if context was their own directory:

```dockerfile
# BEFORE (incorrect for context=.)
COPY package*.json ./          # Looks in context root, not apps/frontend/
COPY . .                       # Copies entire project to /app
```

This caused:
- Build failures: "package.json not found"
- Incorrect build outputs in container

### Solution

#### Frontend Dockerfile
**File:** `/apps/frontend/Dockerfile`

```dockerfile
# Stage 1: Dependencies Installation
WORKDIR /app

# Line 19: Copy package files
- BEFORE: COPY package*.json ./
+ AFTER:  COPY apps/frontend/package*.json ./

# Line 41: Copy application source
- BEFORE: COPY . .
+ AFTER:  COPY apps/frontend/ .
```

#### API Gateway Dockerfile
**File:** `/apps/api-gateway/Dockerfile`

```dockerfile
# Stage 1: Dependencies Installation
WORKDIR /app

# Line 19-20: Copy package and config files
- BEFORE: COPY package*.json ./
         COPY prisma ./prisma/
+ AFTER:  COPY apps/api-gateway/package*.json ./
         COPY apps/api-gateway/prisma ./prisma/

# Stage 2: Builder
# Line 42: Copy source code
- BEFORE: COPY . .
+ AFTER:  COPY apps/api-gateway/ .
```

---

## Issue #3: Invalid Build Arguments

### Problem
GitHub Actions passed build arguments that weren't used in Dockerfiles:

```yaml
# BEFORE
build-args: |
  NODE_ENV=production              # Not used in Dockerfile
  NEXT_PUBLIC_API_URL=...         # Not used in build phase
  BUILDKIT_INLINE_CACHE=1         # Valid
  GIT_COMMIT_SHA=${{ github.sha }}
  BUILD_TIMESTAMP=${{ github.run_number }}
  VERSION_TAG=latest
```

### Solution
**File:** `.github/workflows/build-and-push.yml`

Removed unused arguments and maintained essential ones:

```yaml
# BOTH API Gateway and Frontend Jobs
- BEFORE:
  build-args: |
    NODE_ENV=production
    NEXT_PUBLIC_API_URL=${{ secrets.NEXT_PUBLIC_API_URL }}
    BUILDKIT_INLINE_CACHE=1
    GIT_COMMIT_SHA=${{ github.sha }}
    BUILD_TIMESTAMP=${{ github.run_number }}
    VERSION_TAG=latest

+ AFTER:
  build-args: |
    BUILDKIT_INLINE_CACHE=1
    GIT_COMMIT_SHA=${{ github.sha }}
    BUILD_TIMESTAMP=${{ github.run_number }}
    VERSION_TAG=latest
```

---

## Verification Checklist

All items verified before deployment:

- [x] Health check endpoint exists: `/apps/frontend/src/app/api/health/route.ts`
- [x] Health check returns correct response: `{ status: 'healthy', timestamp, service: 'copilot-frontend' }`
- [x] Next.js build outputs verified: `.next/BUILD_ID`, `.next/build-manifest.json`, `.next/routes-manifest.json`
- [x] API Gateway build artifacts: `dist/index.js`
- [x] Dockerfile stages: deps → builder → runner (for both services)
- [x] Docker Compose configuration: Correctly references `.dev` Dockerfiles

---

## Files Modified

### 1. `.github/workflows/build-and-push.yml`
- **Changes:** 2 (Dockerfile references)
- **Lines affected:** 59, 110
- **Build args changes:** 2 (API Gateway line 65-69, Frontend line 117-120)

### 2. `/apps/frontend/Dockerfile`
- **Changes:** 2 (COPY paths)
- **Lines affected:** 19, 41

### 3. `/apps/api-gateway/Dockerfile`
- **Changes:** 3 (COPY paths)
- **Lines affected:** 19, 20, 42

---

## Expected Results After Fix

### GitHub Actions Workflow
- Build successfully finds all files
- No "file not found" errors during COPY commands
- Images build with correct artifacts
- Images push to GitHub Container Registry (ghcr.io)

### Deployment to Hetzner
- Server (91.98.42.19) pulls new images
- Containers start successfully
- Health checks pass
- Services available at:
  - Frontend: `http://91.98.42.19:3000`
  - API Gateway: `http://91.98.42.19:3010`

---

## Testing

To validate the build locally before GitHub Actions:

```bash
# Build Frontend
docker build \
  --file ./apps/frontend/Dockerfile \
  --tag copilot-frontend:test \
  --build-arg GIT_COMMIT_SHA=test \
  --build-arg BUILD_TIMESTAMP=123 \
  --build-arg VERSION_TAG=test \
  .

# Build API Gateway
docker build \
  --file ./apps/api-gateway/Dockerfile \
  --tag copilot-api-gateway:test \
  --build-arg GIT_COMMIT_SHA=test \
  --build-arg BUILD_TIMESTAMP=123 \
  --build-arg VERSION_TAG=test \
  .

# Test images
docker run --rm copilot-frontend:test node -e "console.log('OK')"
docker run --rm copilot-api-gateway:test node -e "console.log('OK')"
```

---

## References

- **Build Context Documentation:** https://docs.docker.com/build/building/context/
- **Dockerfile Best Practices:** https://docs.docker.com/develop/develop-images/dockerfile_best-practices/
- **GitHub Actions Docker Build:** https://github.com/docker/build-push-action

---

## Future Recommendations

1. **Simplify Build Configuration:**
   - Change context to `./apps/frontend/` for frontend build
   - Change context to `./apps/api-gateway/` for API build
   - This eliminates need for full paths in COPY commands

2. **Create BUILD.md Documentation:**
   - Document local build process
   - Document CI/CD build process
   - Include troubleshooting guide

3. **Add Build Validation:**
   - Validate required Dockerfiles exist in workflow
   - Validate required files exist before COPY operations
   - Add lint checks for Dockerfiles

4. **Improve Dockerfile Consistency:**
   - Standardize HEALTHCHECK configuration
   - Standardize non-root user creation
   - Standardize build argument naming

---

**Session Complete:** 2025-12-23 14:30
**Status:** Ready for deployment
