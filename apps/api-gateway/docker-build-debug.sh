#!/bin/bash
# ============================================================
# Docker Build Debugging Script
# ============================================================
# Use this script to debug Docker build failures with detailed output
# Usage: ./docker-build-debug.sh [dockerfile-name]
# Example: ./docker-build-debug.sh Dockerfile.production.clean
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DOCKERFILE="${1:-Dockerfile.production.clean}"
IMAGE_NAME="api-gateway-debug"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}Docker Build Debugging Script${NC}"
echo -e "${BLUE}============================================================${NC}"
echo -e "Dockerfile: ${YELLOW}$DOCKERFILE${NC}"
echo -e "Working directory: ${YELLOW}$(pwd)${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "$DOCKERFILE" ]; then
    echo -e "${RED}ERROR: $DOCKERFILE not found in current directory${NC}"
    echo -e "Please run this script from: /Users/josegomez/Documents/Code/SaaS/Copilot/apps/api-gateway"
    exit 1
fi

# Check if required files exist
echo -e "${BLUE}Checking required files...${NC}"
FILES_TO_CHECK=(
    "package.json"
    "tsconfig.docker.json"
    "src/index.ts"
    "prisma/schema.prisma"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} Found: $file"
    else
        echo -e "${RED}✗${NC} Missing: $file"
    fi
done
echo ""

# Build with verbose output
echo -e "${BLUE}Starting Docker build with verbose output...${NC}"
echo -e "${YELLOW}This will show detailed progress and errors${NC}"
echo ""

# Build command with progress output
DOCKER_BUILDKIT=1 docker build \
    --progress=plain \
    --no-cache \
    --file "$DOCKERFILE" \
    --tag "$IMAGE_NAME:latest" \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    ../../ 2>&1 | tee docker-build.log

BUILD_EXIT_CODE=$?

echo ""
echo -e "${BLUE}============================================================${NC}"

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ BUILD SUCCESSFUL${NC}"
    echo ""
    echo -e "Image created: ${GREEN}$IMAGE_NAME:latest${NC}"
    echo ""
    echo -e "${BLUE}Image details:${NC}"
    docker images "$IMAGE_NAME:latest" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    echo ""
    echo -e "${BLUE}To run the container:${NC}"
    echo -e "${YELLOW}docker run -p 4000:4000 $IMAGE_NAME:latest${NC}"
else
    echo -e "${RED}✗ BUILD FAILED (Exit code: $BUILD_EXIT_CODE)${NC}"
    echo ""
    echo -e "${YELLOW}Build log saved to: docker-build.log${NC}"
    echo ""
    echo -e "${BLUE}Common issues to check:${NC}"
    echo -e "1. TypeScript compilation errors in source code"
    echo -e "2. Missing dependencies in package.json"
    echo -e "3. tsconfig.json configuration issues"
    echo -e "4. Prisma schema errors"
    echo ""
    echo -e "${YELLOW}Review the log above for detailed error messages${NC}"
    exit 1
fi

echo -e "${BLUE}============================================================${NC}"
