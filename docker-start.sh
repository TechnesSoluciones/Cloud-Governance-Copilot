#!/bin/bash
# ============================================================
# Docker Compose Wrapper Script
# ============================================================
# This script ensures no shell environment variables override .env
# Usage: ./docker-start.sh [docker-compose command]
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}Cloud Governance Copilot - Docker Wrapper${NC}"
echo -e "${BLUE}============================================================${NC}"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}ERROR: .env file not found!${NC}"
    echo "Please ensure .env exists in: $SCRIPT_DIR"
    exit 1
fi

echo -e "${GREEN}✓ Found .env file${NC}"

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}ERROR: docker-compose.yml not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found docker-compose.yml${NC}"

# List of environment variables to unset (prevents shell vars from overriding .env)
VARS_TO_UNSET=(
    "DATABASE_URL"
    "POSTGRES_HOST"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "POSTGRES_DB"
    "REDIS_HOST"
    "REDIS_PORT"
    "REDIS_URL"
    "REDIS_PASSWORD"
    "BULLMQ_REDIS_HOST"
    "BULLMQ_REDIS_PORT"
    "BULLMQ_REDIS_PASSWORD"
    "NODE_ENV"
    "API_PORT"
    "FRONTEND_PORT"
    "JWT_SECRET"
    "NEXTAUTH_SECRET"
    "ENCRYPTION_KEY"
    "SESSION_SECRET"
)

# Unset shell environment variables that might conflict
echo -e "${YELLOW}Clearing conflicting environment variables...${NC}"
for var in "${VARS_TO_UNSET[@]}"; do
    if [ ! -z "${!var}" ]; then
        echo -e "  Unsetting: $var"
        unset "$var"
    fi
done

echo -e "${GREEN}✓ Environment cleaned${NC}"

# If no arguments provided, show usage
if [ $# -eq 0 ]; then
    echo ""
    echo -e "${BLUE}Usage:${NC}"
    echo "  $0 up -d              # Start all services"
    echo "  $0 down               # Stop all services"
    echo "  $0 logs -f            # View logs"
    echo "  $0 ps                 # List services"
    echo "  $0 build              # Build images"
    echo "  $0 config             # Show configuration"
    echo ""
    echo -e "${YELLOW}Or run any docker-compose command:${NC}"
    echo "  $0 [any docker-compose command]"
    echo ""
    exit 0
fi

# Execute docker-compose with provided arguments
echo -e "${BLUE}Executing: docker-compose $@${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# Run docker-compose with all arguments passed to this script
exec docker-compose "$@"
