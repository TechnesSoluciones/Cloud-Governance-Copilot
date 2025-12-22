#!/bin/bash
# Fix Frontend Build ID Mismatch - Quick Solution
# This resolves the "Failed to find Server Action" error

set -e

echo "🔧 Fixing Frontend Build ID Mismatch..."
echo "============================================"

# Get current git commit
GIT_SHA=$(git rev-parse --short HEAD)
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "📦 Git SHA: $GIT_SHA"
echo "⏰ Timestamp: $TIMESTAMP"

# Clean Next.js cache completely
echo ""
echo "🧹 Cleaning Next.js cache..."
rm -rf apps/frontend/.next
rm -rf apps/frontend/.turbo
rm -rf apps/frontend/node_modules/.cache

# Rebuild with proper BUILD_ID
echo ""
echo "🔨 Building frontend with BUILD_ID: $GIT_SHA"
cd apps/frontend
NEXT_PUBLIC_BUILD_ID=$GIT_SHA npm run build

# Build Docker image with BUILD_ID
echo ""
echo "🐳 Building Docker image..."
cd ../..
docker build \
  --build-arg GIT_COMMIT_SHA=$GIT_SHA \
  --build-arg BUILD_TIMESTAMP=$TIMESTAMP \
  --no-cache \
  -f apps/frontend/Dockerfile \
  -t ghcr.io/technessoluciones/copilot-frontend:$GIT_SHA \
  -t ghcr.io/technessoluciones/copilot-frontend:latest \
  apps/frontend

echo ""
echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo "1. Push to registry: docker push ghcr.io/technessoluciones/copilot-frontend:$GIT_SHA"
echo "2. Push latest tag: docker push ghcr.io/technessoluciones/copilot-frontend:latest"
echo "3. Deploy: ssh root@91.98.42.19 'cd /opt/copilot-app && docker compose pull frontend && docker compose up -d frontend'"
echo ""
echo "Or run the automatic deployment:"
echo "./deploy-frontend.sh"
