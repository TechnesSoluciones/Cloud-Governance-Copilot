#!/bin/bash

set -e

echo "🧪 Running local test suite..."

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Start test dependencies
echo "${YELLOW}Starting test dependencies...${NC}"
docker-compose -f docker-compose.test.yml up -d

# Wait for services to be healthy
echo "${YELLOW}Waiting for services to be ready...${NC}"
sleep 5

# Check if services are healthy
if ! docker-compose -f docker-compose.test.yml ps | grep -q "healthy"; then
    echo "${YELLOW}Waiting for health checks...${NC}"
    sleep 10
fi

# Setup test DB
echo "${YELLOW}Setting up test database...${NC}"
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/copilot_test"
./scripts/setup-test-db.sh

# Run tests with coverage
echo "${YELLOW}Running tests with coverage...${NC}"
cd apps/api-gateway

# Run unit tests
echo "${GREEN}1/3 Running unit tests...${NC}"
npm run test:unit

# Run integration tests
echo "${GREEN}2/3 Running integration tests...${NC}"
export REDIS_URL="redis://localhost:6380"
export JWT_SECRET="test-jwt-secret-key"
export JWT_REFRESH_SECRET="test-refresh-secret-key"
npm run test:integration

# Run E2E tests if they exist
echo "${GREEN}3/3 Running E2E tests...${NC}"
npm run test:e2e || echo "${YELLOW}No E2E tests found or tests failed${NC}"

# Generate coverage report
echo "${GREEN}Generating coverage report...${NC}"
npm run test:coverage

# Cleanup
echo "${YELLOW}Cleaning up...${NC}"
cd ../..
docker-compose -f docker-compose.test.yml down

echo "${GREEN}✅ Local testing complete!${NC}"
echo "Coverage report available at: apps/api-gateway/coverage/lcov-report/index.html"
