#!/bin/bash

###############################################################################
# Docker Compose Clean Start Script
#
# This script starts Docker Compose with the correct environment file,
# ensuring shell environment variables don't override .env values.
#
# Usage: ./scripts/docker-start-clean.sh [options]
#
# Options:
#   --rebuild    Rebuild containers before starting
#   --logs       Show logs after starting
#   --check      Run environment check before starting
###############################################################################

set -e

# Change to project root directory
cd "$(dirname "$0")/.."

echo "========================================="
echo "Docker Compose Clean Start"
echo "========================================="
echo ""

# Parse options
REBUILD=false
SHOW_LOGS=false
RUN_CHECK=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --rebuild)
      REBUILD=true
      shift
      ;;
    --logs)
      SHOW_LOGS=true
      shift
      ;;
    --check)
      RUN_CHECK=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--rebuild] [--logs] [--check]"
      exit 1
      ;;
  esac
done

# Run environment check if requested
if [ "$RUN_CHECK" = true ]; then
  echo "Running environment variable conflict check..."
  if [ -f "./scripts/check-env-conflicts.sh" ]; then
    ./scripts/check-env-conflicts.sh || true
  else
    echo "Warning: check-env-conflicts.sh not found, skipping check"
  fi
  echo ""
fi

# Check if .env.docker exists
if [ ! -f ".env.docker" ]; then
  echo "ERROR: .env.docker file not found!"
  echo "This file is required to override shell environment variables."
  echo ""
  echo "Please create it first or copy from .env:"
  echo "  cp .env .env.docker"
  exit 1
fi

echo "Using environment file: .env.docker"
echo ""

# Stop any running containers
echo "Stopping existing containers..."
docker-compose --env-file .env.docker down
echo ""

# Rebuild if requested
if [ "$REBUILD" = true ]; then
  echo "Rebuilding containers..."
  docker-compose --env-file .env.docker build
  echo ""
fi

# Start containers
echo "Starting containers..."
docker-compose --env-file .env.docker up -d
echo ""

# Show status
echo "Container status:"
docker-compose --env-file .env.docker ps
echo ""

# Wait a moment for containers to initialize
echo "Waiting for containers to initialize..."
sleep 3
echo ""

# Check health
echo "Checking container health..."
HEALTHY=true

# Check api-gateway
if docker-compose --env-file .env.docker ps api-gateway | grep -q "Up"; then
  echo "✓ api-gateway is running"
else
  echo "✗ api-gateway failed to start"
  HEALTHY=false
fi

# Check frontend
if docker-compose --env-file .env.docker ps frontend | grep -q "Up"; then
  echo "✓ frontend is running"
else
  echo "✗ frontend failed to start"
  HEALTHY=false
fi

echo ""

if [ "$HEALTHY" = false ]; then
  echo "WARNING: Some containers failed to start"
  echo "Check logs with: docker-compose --env-file .env.docker logs"
  exit 1
fi

echo "========================================="
echo "Docker Compose started successfully!"
echo "========================================="
echo ""
echo "Services available at:"
echo "  API Gateway:  http://localhost:3010"
echo "  Frontend:     http://localhost:3000"
echo "  Health Check: http://localhost:3010/health"
echo ""
echo "Useful commands:"
echo "  View logs:        docker-compose --env-file .env.docker logs -f"
echo "  Stop containers:  docker-compose --env-file .env.docker down"
echo "  Restart:          docker-compose --env-file .env.docker restart"
echo ""

# Show logs if requested
if [ "$SHOW_LOGS" = true ]; then
  echo "Showing container logs (Ctrl+C to exit)..."
  echo ""
  docker-compose --env-file .env.docker logs -f
fi
