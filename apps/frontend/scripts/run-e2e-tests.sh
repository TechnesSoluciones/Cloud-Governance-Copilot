#!/bin/bash

###############################################################################
# E2E Test Runner Script
# Cloud Governance Copilot - Frontend
#
# This script checks if backend and frontend are running, then runs E2E tests
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:3010"
BACKEND_HEALTH_URL="$BACKEND_URL/health"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Cloud Governance Copilot - E2E Test Runner                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if service is running
check_service() {
    local url=$1
    local name=$2

    echo -n "Checking $name... "

    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e "${RED}✗ Not Running${NC}"
        return 1
    fi
}

# Check backend
BACKEND_RUNNING=false
if check_service "$BACKEND_HEALTH_URL" "Backend ($BACKEND_URL)"; then
    BACKEND_RUNNING=true
fi

# Check frontend
FRONTEND_RUNNING=false
if check_service "$FRONTEND_URL" "Frontend ($FRONTEND_URL)"; then
    FRONTEND_RUNNING=true
fi

echo ""

# Exit if services are not running
if [ "$BACKEND_RUNNING" = false ] || [ "$FRONTEND_RUNNING" = false ]; then
    echo -e "${RED}Error: Required services are not running!${NC}"
    echo ""
    echo -e "${YELLOW}Please start the services:${NC}"
    echo ""

    if [ "$BACKEND_RUNNING" = false ]; then
        echo -e "${YELLOW}Terminal 1 - Start Backend:${NC}"
        echo "  cd apps/api-gateway"
        echo "  npm run dev"
        echo ""
    fi

    if [ "$FRONTEND_RUNNING" = false ]; then
        echo -e "${YELLOW}Terminal 2 - Start Frontend:${NC}"
        echo "  cd apps/frontend"
        echo "  npm run dev"
        echo ""
    fi

    exit 1
fi

echo -e "${GREEN}All services are running!${NC}"
echo ""

# Determine which tests to run
TEST_TYPE=${1:-"critical"}

case $TEST_TYPE in
    "critical")
        echo -e "${BLUE}Running Critical Flow Tests (27 tests)...${NC}"
        npm run test:e2e:critical
        ;;
    "all")
        echo -e "${BLUE}Running All E2E Tests...${NC}"
        npm run test:e2e
        ;;
    "ui")
        echo -e "${BLUE}Opening Playwright UI for Critical Flows...${NC}"
        npm run test:e2e:critical:ui
        ;;
    "headed")
        echo -e "${BLUE}Running Critical Flow Tests in Headed Mode...${NC}"
        npm run test:e2e:critical:headed
        ;;
    *)
        echo -e "${RED}Unknown test type: $TEST_TYPE${NC}"
        echo ""
        echo "Usage: $0 [critical|all|ui|headed]"
        echo ""
        echo "Options:"
        echo "  critical  - Run critical flow tests (default)"
        echo "  all       - Run all E2E tests"
        echo "  ui        - Open Playwright UI"
        echo "  headed    - Run tests with visible browser"
        exit 1
        ;;
esac

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  Tests Completed Successfully! ✓                          ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "View report: ${BLUE}npm run test:e2e:critical:report${NC}"
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  Tests Failed! ✗                                          ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Debug: ${BLUE}npm run test:e2e:critical:ui${NC}"
    echo -e "Report: ${BLUE}npm run test:e2e:critical:report${NC}"
    exit 1
fi
