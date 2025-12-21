#!/bin/bash

# ============================================================
# AGGRESSIVE Deployment Script for TEST Environment
# ============================================================
# This script uses a "stop everything, start fresh" approach
# suitable for test environments where downtime is acceptable
#
# Usage: ./scripts/deploy-test.sh [version]
# Example: ./scripts/deploy-test.sh v1.1.2
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

VERSION=${1:-latest}

echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}  TEST Environment Deployment${NC}"
echo -e "${CYAN}======================================${NC}"
echo -e "${YELLOW}Version: ${VERSION}${NC}"
echo -e "${YELLOW}Strategy: AGGRESSIVE (full restart)${NC}"
echo -e "${YELLOW}Downtime: ACCEPTABLE${NC}"
echo ""

# Check if in correct directory
if [ ! -f "docker-compose.production.yml" ]; then
    echo -e "${RED}Error: docker-compose.production.yml not found${NC}"
    echo "Make sure you're in the project root directory"
    exit 1
fi

# ============================================================
# PHASE 1: PREPARATION
# ============================================================
echo -e "${BLUE}[1/7] Pulling latest code...${NC}"
git pull origin main || {
    echo -e "${YELLOW}Warning: Git pull failed, continuing anyway...${NC}"
}

echo -e "${BLUE}[2/7] Setting version to ${VERSION}...${NC}"
export IMAGE_TAG=$VERSION
echo "IMAGE_TAG=$IMAGE_TAG" > .env.version
echo -e "${GREEN}Version set: ${IMAGE_TAG}${NC}"

# ============================================================
# PHASE 2: COMPLETE SHUTDOWN
# ============================================================
echo -e "${BLUE}[3/7] STOPPING all containers...${NC}"
docker-compose -f docker-compose.production.yml down --remove-orphans --volumes || true
echo -e "${GREEN}All containers stopped${NC}"

# Verify everything is down
RUNNING=$(docker ps -q --filter "name=copilot" | wc -l)
if [ "$RUNNING" -gt 0 ]; then
    echo -e "${YELLOW}Warning: Found ${RUNNING} copilot containers still running${NC}"
    echo -e "${YELLOW}Force stopping...${NC}"
    docker ps -q --filter "name=copilot" | xargs -r docker stop
    docker ps -q --filter "name=copilot" | xargs -r docker rm -f
fi

# ============================================================
# PHASE 3: CLEANUP
# ============================================================
echo -e "${BLUE}[4/7] Cleaning up old resources...${NC}"
docker container prune -f
docker image prune -af
echo -e "${GREEN}Cleanup complete${NC}"

# ============================================================
# PHASE 4: PULL NEW IMAGES
# ============================================================
echo -e "${BLUE}[5/7] Pulling new images (TAG: ${IMAGE_TAG})...${NC}"
docker-compose -f docker-compose.production.yml pull
echo -e "${GREEN}Images pulled successfully${NC}"

# ============================================================
# PHASE 5: START FRESH
# ============================================================
echo -e "${BLUE}[6/7] Starting all services from scratch...${NC}"
docker-compose -f docker-compose.production.yml up -d --force-recreate --remove-orphans

# ============================================================
# PHASE 6: MONITORING & VALIDATION
# ============================================================
echo -e "${BLUE}[7/7] Monitoring startup...${NC}"
echo ""

# Wait for containers to initialize (start_period is 60s)
echo -e "${CYAN}Waiting for services to initialize (75 seconds)...${NC}"
for i in {1..75}; do
    echo -n "."
    sleep 1

    # Check every 15 seconds
    if [ $((i % 15)) -eq 0 ]; then
        echo ""
        docker-compose -f docker-compose.production.yml ps
        echo ""
    fi
done
echo ""

# ============================================================
# PHASE 7: HEALTH CHECKS
# ============================================================
echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}  Health Check Validation${NC}"
echo -e "${CYAN}======================================${NC}"
echo ""

# Show container status
echo -e "${BLUE}Container Status:${NC}"
docker-compose -f docker-compose.production.yml ps
echo ""

# Check Redis health
echo -e "${BLUE}Testing Redis...${NC}"
if docker-compose -f docker-compose.production.yml exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}Redis: HEALTHY${NC}"
else
    echo -e "${RED}Redis: UNHEALTHY${NC}"
fi

# Check API Gateway health
echo -e "${BLUE}Testing API Gateway health endpoint...${NC}"
sleep 5

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3010/health 2>/dev/null)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)

if [ "$HEALTH_CODE" = "200" ]; then
    echo -e "${GREEN}API Gateway: HEALTHY (HTTP $HEALTH_CODE)${NC}"
    echo -e "${GREEN}Response:${NC}"
    echo "$HEALTH_BODY" | jq '.' 2>/dev/null || echo "$HEALTH_BODY"
else
    echo -e "${RED}API Gateway: UNHEALTHY (HTTP $HEALTH_CODE)${NC}"
    echo -e "${YELLOW}Response: $HEALTH_BODY${NC}"

    echo ""
    echo -e "${YELLOW}Showing API Gateway logs:${NC}"
    docker-compose -f docker-compose.production.yml logs --tail=100 api-gateway

    echo ""
    echo -e "${YELLOW}Container health details:${NC}"
    CONTAINER_ID=$(docker-compose -f docker-compose.production.yml ps -q api-gateway)
    docker inspect "$CONTAINER_ID" | jq '.[0].State.Health' 2>/dev/null || echo "No health info available"

    echo ""
    echo -e "${RED}======================================${NC}"
    echo -e "${RED}  DEPLOYMENT FAILED${NC}"
    echo -e "${RED}======================================${NC}"
    exit 1
fi

# Check Frontend health
echo -e "${BLUE}Testing Frontend...${NC}"
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null)
if [ "$FRONTEND_CODE" = "200" ]; then
    echo -e "${GREEN}Frontend: HEALTHY (HTTP $FRONTEND_CODE)${NC}"
else
    echo -e "${YELLOW}Frontend: Response code $FRONTEND_CODE (may still be starting)${NC}"
fi

# ============================================================
# PHASE 8: FINAL STATUS
# ============================================================
echo ""
echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}  Final Container Status${NC}"
echo -e "${CYAN}======================================${NC}"
docker-compose -f docker-compose.production.yml ps
echo ""

# Check if all containers are healthy
UNHEALTHY=$(docker-compose -f docker-compose.production.yml ps | grep -i "unhealthy" | wc -l)
if [ "$UNHEALTHY" -gt 0 ]; then
    echo -e "${RED}======================================${NC}"
    echo -e "${RED}  WARNING: ${UNHEALTHY} Unhealthy Container(s)${NC}"
    echo -e "${RED}======================================${NC}"
    echo -e "${YELLOW}Check logs with:${NC}"
    echo "  docker-compose -f docker-compose.production.yml logs --tail=100 api-gateway"
    exit 1
fi

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  DEPLOYMENT SUCCESSFUL${NC}"
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Version: ${VERSION}${NC}"
echo -e "${GREEN}All services are healthy and running${NC}"
echo ""
echo -e "${CYAN}Service URLs:${NC}"
echo "  API Gateway: http://localhost:3010/health"
echo "  Frontend:    http://localhost:3000/"
echo ""
