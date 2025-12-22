#!/bin/bash
# Automated Frontend Deployment to Dev Server
# Pushes and deploys the frontend with proper build tracking

set -e

GIT_SHA=$(git rev-parse --short HEAD)

echo "🚀 Deploying Frontend to Dev Server..."
echo "======================================="
echo "Build ID: $GIT_SHA"
echo ""

# Push images to registry
echo "📤 Pushing to GitHub Container Registry..."
docker push ghcr.io/technessoluciones/copilot-frontend:$GIT_SHA
docker push ghcr.io/technessoluciones/copilot-frontend:latest

# Deploy to server
echo ""
echo "🔄 Deploying to server..."
ssh root@91.98.42.19 << EOF
  set -e
  cd /opt/copilot-app

  echo "Pulling latest image..."
  docker compose pull frontend

  echo "Stopping old container..."
  docker compose stop frontend

  echo "Removing old container..."
  docker compose rm -f frontend

  echo "Starting new container..."
  docker compose up -d frontend

  echo "Waiting for health check..."
  sleep 10

  echo "Container status:"
  docker ps | grep copilot-frontend

  echo ""
  echo "Recent logs:"
  docker logs copilot-frontend --tail 20
EOF

echo ""
echo "✅ Deployment complete!"
echo "🌐 Check: http://91.98.42.19:3000"
echo ""
echo "Monitor with:"
echo "ssh root@91.98.42.19 'docker logs -f copilot-frontend'"
