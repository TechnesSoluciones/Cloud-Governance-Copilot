# Deployment Checklist - Docker Build Fixes

**Date:** 2025-12-23
**Project:** Cloud Governance Copilot v1.2.0
**Target:** Hetzner Server (91.98.42.19)

---

## Pre-Deployment Verification

### Code Changes Verification
- [ ] Reviewed changes in `.github/workflows/build-and-push.yml`
  - [ ] API Gateway Dockerfile reference changed to correct path
  - [ ] Frontend Dockerfile reference changed to correct path
  - [ ] Invalid build-args removed
- [ ] Reviewed changes in `/apps/frontend/Dockerfile`
  - [ ] COPY paths updated with `apps/frontend/` prefix
  - [ ] All 2 COPY commands verified
- [ ] Reviewed changes in `/apps/api-gateway/Dockerfile`
  - [ ] COPY paths updated with `apps/api-gateway/` prefix
  - [ ] All 3 COPY commands verified

### Documentation Review
- [ ] Read RESUMEN_FINAL_SESION.txt (overview)
- [ ] Read BUILD_FIXES_SUMMARY.txt (visual summary)
- [ ] Reviewed DOCKER_BUILD_FIXES.md (technical details)
- [ ] Bookmarked VALIDATION_STEPS.md for reference

### Git Status
- [ ] `git status` shows expected files modified
  - [ ] .github/workflows/build-and-push.yml
  - [ ] apps/frontend/Dockerfile
  - [ ] apps/api-gateway/Dockerfile
- [ ] No unexpected changes in git diff
- [ ] No sensitive files included in changes (no .env, keys, credentials)

---

## Local Validation (Optional but Recommended)

### Frontend Build Test
- [ ] Executed Frontend build command from VALIDATION_STEPS.md
- [ ] Build completed without errors
- [ ] Image created successfully
- [ ] Image size is ~180-200MB (expected)
- [ ] Container runs and responds correctly

### API Gateway Build Test
- [ ] Executed API Gateway build command from VALIDATION_STEPS.md
- [ ] Build completed without errors
- [ ] Image created successfully
- [ ] Image size is ~120-150MB (expected)
- [ ] Container runs and responds correctly

### Clean Up
- [ ] Removed test images after validation
- [ ] Docker disk space freed (if necessary)

---

## Git Commit and Push

### Prepare Commit
- [ ] All code changes reviewed and tested
- [ ] Commit message is clear and descriptive
- [ ] Message references the issues fixed

```bash
git add -A
git commit -m "Fix: Correct Docker build context paths and Dockerfile references

- Fix Dockerfile.production references in GitHub Actions workflow
- Update COPY commands to use correct paths relative to build context
- Remove invalid build-args from workflow
- Add comprehensive build documentation

Fixes deployment failures for frontend and API Gateway containers to Hetzner."
```

### Push to Repository
- [ ] Connected to internet
- [ ] GitHub credentials configured
- [ ] Push to main branch (or feature branch as needed)
- [ ] Waited for push to complete successfully

---

## GitHub Actions Workflow Monitoring

### Initial Workflow Run
- [ ] Navigated to GitHub Actions page
- [ ] New workflow run visible
- [ ] Workflow name: "Build and Push Docker Images"
- [ ] Branch: main (or appropriate branch)

### API Gateway Build Job
- [ ] Job started and running
- [ ] No errors in "Checkout code" step
- [ ] No errors in "Set up Docker Buildx" step
- [ ] No errors in "Log in to GitHub Container Registry" step
- [ ] No errors in "Build and push API Gateway" step
  - [ ] All build layers completed successfully
  - [ ] Image size shown and verified (~120-150MB)
  - [ ] Image pushed to ghcr.io successfully

### Frontend Build Job
- [ ] Job started and running (runs in parallel with API Gateway)
- [ ] No errors in checkout and setup steps
- [ ] No errors in "Build and push Frontend" step
  - [ ] All build layers completed successfully
  - [ ] Image size shown and verified (~180-200MB)
  - [ ] Image pushed to ghcr.io successfully

### Workflow Completion
- [ ] Both jobs completed successfully
- [ ] No workflow failures or warnings
- [ ] Artifacts/images visible in GitHub Container Registry
  - [ ] ghcr.io/[org]/copilot-api-gateway:[version]
  - [ ] ghcr.io/[org]/copilot-frontend:[version]

---

## Pre-Deployment to Hetzner

### Image Verification
- [ ] Images visible in GitHub Container Registry
- [ ] Both frontend and API gateway images present
- [ ] Latest tag available for both images
- [ ] Image creation timestamp is recent

### Health Check Endpoints
- [ ] Frontend health check endpoint verified to exist
  - [ ] Path: `/api/health`
  - [ ] Location: `/apps/frontend/src/app/api/health/route.ts`
  - [ ] Returns: `{ status: 'healthy', timestamp, service }`
- [ ] API Gateway health check endpoint exists
  - [ ] Path: `/health`
  - [ ] Port: 4000

### Connection to Hetzner
- [ ] SSH access to 91.98.42.19 verified
- [ ] Credentials ready for deployment
- [ ] Network connectivity confirmed

---

## Deployment to Hetzner

### Preparation
- [ ] Login to Hetzner server: `ssh root@91.98.42.19`
- [ ] Confirmed in correct directory: `/opt/copilot-app`
- [ ] Current docker-compose.yml verified

### Pre-Deployment
- [ ] Created backup of current deployment (optional but recommended)
- [ ] Checked current running containers: `docker compose ps`
- [ ] Noted current frontend container status
- [ ] Noted current API gateway container status

### Deployment Using Script
- [ ] Executed deploy-frontend.sh script
  - [ ] Git SHA captured: `git rev-parse --short HEAD`
  - [ ] Images pushed to GHCR
  - [ ] SSH to Hetzner successful
  - [ ] Images pulled: `docker compose pull frontend`
  - [ ] Old containers stopped
  - [ ] Old containers removed
  - [ ] New containers started: `docker compose up -d frontend`
  - [ ] Waited 10 seconds for container health check
  - [ ] Verified new container is running: `docker ps | grep copilot-frontend`

### Manual Deployment (Alternative)
- [ ] SSH to Hetzner: `ssh root@91.98.42.19`
- [ ] Navigate to app directory: `cd /opt/copilot-app`
- [ ] Pull latest images:
  ```bash
  docker compose pull frontend api-gateway
  ```
- [ ] Stop old containers:
  ```bash
  docker compose down
  ```
- [ ] Start new containers:
  ```bash
  docker compose up -d
  ```
- [ ] Verify containers are running:
  ```bash
  docker compose ps
  ```

---

## Post-Deployment Verification

### Container Status
- [ ] Frontend container is running
  - [ ] Status: "Up" (not "Restarting" or "Exited")
  - [ ] Health check: passing (if configured)
  - [ ] Correct image version deployed
- [ ] API Gateway container is running
  - [ ] Status: "Up" (not "Restarting" or "Exited")
  - [ ] Health check: passing (if configured)
  - [ ] Correct image version deployed

### Service Connectivity
- [ ] Frontend is accessible: `http://91.98.42.19:3000`
  - [ ] Page loads without errors
  - [ ] CSS and JavaScript loaded correctly
  - [ ] Not showing container startup logs
- [ ] Health check endpoint responds:
  - [ ] `curl http://91.98.42.19:3000/api/health`
  - [ ] Response shows: `{ status: 'healthy', ... }`
- [ ] API Gateway is accessible: `http://91.98.42.19:3010`
  - [ ] Responds to requests
  - [ ] Health check endpoint works
  - [ ] Database connection established

### Container Logs
- [ ] Frontend logs show normal startup
  ```bash
  docker logs copilot-frontend --tail 20
  ```
  - [ ] No error messages
  - [ ] Shows "Ready - started server on 0.0.0.0:3000"
- [ ] API Gateway logs show normal startup
  ```bash
  docker logs copilot-api-gateway --tail 20
  ```
  - [ ] No connection errors
  - [ ] No database errors
  - [ ] Shows startup messages

### User Testing
- [ ] Access frontend in browser
  - [ ] Page loads
  - [ ] Navigation works
  - [ ] No console errors (F12 → Console)
  - [ ] Styles and layout correct
- [ ] Test basic functionality
  - [ ] Authentication works (if required)
  - [ ] Can navigate to main features
  - [ ] No 500 errors
  - [ ] API calls complete successfully (if needed)

---

## Monitoring (Post-Deployment)

### Short Term (1-2 hours after deployment)
- [ ] Monitor container logs for errors
- [ ] Check health endpoints periodically
- [ ] Verify no container restarts
- [ ] Monitor server CPU/memory usage
- [ ] Check browser console for errors

### Medium Term (First day)
- [ ] Review application logs for warnings
- [ ] Check for any reported issues
- [ ] Verify all features working
- [ ] Monitor resource usage stability

### Long Term (First week)
- [ ] No unexpected container restarts
- [ ] Stable performance
- [ ] No memory leaks observed
- [ ] All health checks passing consistently

---

## Rollback Plan (If Needed)

If deployment fails or issues occur:

### Option 1: Rollback to Previous Image
```bash
# SSH to Hetzner
ssh root@91.98.42.19
cd /opt/copilot-app

# Update docker-compose.yml to use previous image version
# Or pull previous tag:
docker pull ghcr.io/[org]/copilot-frontend:previous-version

# Restart services
docker compose down
docker compose up -d
```

### Option 2: Manual Rollback
- [ ] Stop new containers
- [ ] Revert docker-compose.yml to previous version
- [ ] Restart with previous image tag
- [ ] Verify services are running

### Documentation
- [ ] Note the image version that failed (if applicable)
- [ ] Document any error messages
- [ ] Create issue/ticket for investigation
- [ ] Reference this deployment in notes

---

## Completion Sign-Off

### Deployment Verification
- [ ] All services are running correctly
- [ ] Health checks are passing
- [ ] Users can access the application
- [ ] No critical errors in logs

### Documentation
- [ ] Deployment completed date/time: _____________
- [ ] Deployed by: _____________
- [ ] Image versions deployed:
  - Frontend: ghcr.io/[org]/copilot-frontend:_____________
  - API Gateway: ghcr.io/[org]/copilot-api-gateway:_____________

### Notes
```
[Space for deployment notes, issues encountered, solutions applied]




```

### Approval
- [ ] Deployment verified working
- [ ] Ready for production traffic
- [ ] All stakeholders notified of successful deployment

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Verification Date:** _____________
**Verified By:** _____________

For issues or questions, refer to:
1. SESSION_LOG_2025_12_23.md (session context)
2. DOCKER_BUILD_FIXES.md (technical documentation)
3. VALIDATION_STEPS.md (build validation guide)
4. BUILD_FIXES_SUMMARY.txt (visual summary)
