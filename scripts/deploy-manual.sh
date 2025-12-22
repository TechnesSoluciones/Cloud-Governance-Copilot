#!/bin/bash

# ============================================================
# Manual Deployment Script for Test Environment
# ============================================================
# Use this to deploy manually on the server for debugging
# Usage: ./scripts/deploy-manual.sh [version]
# Example: ./scripts/deploy-manual.sh v1.1.2
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

VERSION=${1:-latest}

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Manual Deployment Script${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "${YELLOW}Version: ${VERSION}${NC}"
echo -e "${YELLOW}Strategy: AGGRESSIVE (stop everything, start fresh)${NC}"
echo ""

# Check if in correct directory
if [ ! -f "docker-compose.production.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.production.yml not found${NC}"
    echo "Make sure you're in the project root directory"
    exit 1
fi

# STEP 1: Pull latest code
echo -e "${BLUE}📥 Step 1: Pulling latest code...${NC}"
git pull origin main || {
    echo -e "${YELLOW}⚠️  Git pull failed, continuing anyway...${NC}"
}

# STEP 2: Set version
echo -e "${BLUE}📦 Step 2: Setting version to ${VERSION}...${NC}"
export IMAGE_TAG=$VERSION
echo "IMAGE_TAG=$IMAGE_TAG" > .env.version

# STEP 3: Stop everything
echo -e "${BLUE}🛑 Step 3: Stopping all containers...${NC}"
docker-compose -f docker-compose.production.yml down --remove-orphans || true

# STEP 4: Show current containers (should be empty)
echo -e "${BLUE}📊 Step 4: Current containers (should be empty):${NC}"
docker ps -a | grep copilot || echo "No copilot containers found (good!)"

# STEP 5: Clean up
echo -e "${BLUE}🧹 Step 5: Cleaning up...${NC}"
docker container prune -f || true
docker image prune -af || true

# STEP 6: Pull new images
echo -e "${BLUE}📥 Step 6: Pulling images (IMAGE_TAG=${IMAGE_TAG})...${NC}"
docker-compose -f docker-compose.production.yml pull

# STEP 7: Start fresh
echo -e "${BLUE}🚀 Step 7: Starting services from scratch...${NC}"
docker-compose -f docker-compose.production.yml up -d --force-recreate

# STEP 8: Monitor startup
echo -e "${BLUE}⏳ Step 8: Monitoring startup...${NC}"
for i in {1..30}; do
    echo -n "."
    sleep 2

    # Check if containers are running
    if docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
        echo ""
        echo -e "${GREEN}✅ Containers are up!${NC}"
        break
    fi
done
echo ""

# STEP 9: Check status
echo -e "${BLUE}📊 Step 9: Container status:${NC}"
docker-compose -f docker-compose.production.yml ps

# STEP 10: Check logs
echo -e "${BLUE}📋 Step 10: Recent logs from api-gateway:${NC}"
docker-compose -f docker-compose.production.yml logs --tail=20 api-gateway

# STEP 11: Test health endpoint
echo -e "${BLUE}🏥 Step 11: Testing health endpoint...${NC}"
sleep 5
curl -s http://localhost:3010/health | jq '.' || {
    echo -e "${RED}❌ Health endpoint failed!${NC}"
    echo -e "${YELLOW}Showing more logs...${NC}"
    docker-compose -f docker-compose.production.yml logs --tail=50 api-gateway
}

# STEP 12: Check if healthy
echo -e "${BLUE}🔍 Step 12: Checking health status...${NC}"
if docker-compose -f docker-compose.production.yml ps | grep -q "healthy"; then
    echo -e "${GREEN}✅ Container is HEALTHY!${NC}"
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}Deployment successful!${NC}"
    echo -e "${GREEN}================================${NC}"
else
    echo -e "${RED}❌ Container is UNHEALTHY!${NC}"
    echo -e "${YELLOW}Debugging information:${NC}"
    echo ""
    echo -e "${YELLOW}Full logs:${NC}"
    docker-compose -f docker-compose.production.yml logs --tail=100 api-gateway
    echo ""
    echo -e "${YELLOW}Container inspect:${NC}"
    docker inspect $(docker-compose -f docker-compose.production.yml ps -q api-gateway) | jq '.[0].State.Health'
    exit 1
fi
