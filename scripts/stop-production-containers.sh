#!/bin/bash
# ============================================================
# Stop and Remove Production Containers
# Cloud Governance Copilot
# ============================================================

set -e

SERVER_IP="91.98.42.19"
APP_DIR="/opt/copilot-app"

echo "🛑 Stopping and removing production containers on ${SERVER_IP}..."
echo ""

# SSH to server and execute cleanup commands
ssh -o StrictHostKeyChecking=no root@${SERVER_IP} << 'ENDSSH'
    set -e

    cd /opt/copilot-app

    echo "📦 Current running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""

    echo "🛑 Stopping all services..."
    docker compose down
    echo ""

    echo "🗑️  Removing containers, networks, and orphaned volumes..."
    docker compose down -v --remove-orphans
    echo ""

    echo "🧹 Cleaning up unused Docker resources..."
    docker system prune -f
    echo ""

    echo "✅ Cleanup complete!"
    echo ""
    echo "📊 Remaining Docker resources:"
    docker ps -a
    echo ""
    docker images | grep copilot || echo "No copilot images found"

ENDSSH

echo ""
echo "✅ All containers stopped and removed from production server"
