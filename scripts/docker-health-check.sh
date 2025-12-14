#!/bin/bash

# ============================================================
# Docker Health Check Script
# Cloud Governance Copilot
# ============================================================
# Validates all services are healthy in production environment
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

print_header() {
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_service() {
    local service_name=$1
    local health_url=$2
    local max_retries=${3:-30}
    local retry_interval=${4:-2}

    print_info "Checking $service_name..."

    local retry_count=0
    while [ $retry_count -lt $max_retries ]; do
        if curl -sf "$health_url" > /dev/null 2>&1; then
            print_success "$service_name is healthy"
            return 0
        fi

        retry_count=$((retry_count + 1))
        echo -n "."
        sleep $retry_interval
    done

    echo ""
    print_error "$service_name failed health check after $max_retries attempts"
    return 1
}

check_docker_compose() {
    print_header "Docker Compose Status"

    if docker-compose -f docker-compose.production.yml ps 2>/dev/null; then
        print_success "All containers are running"
        return 0
    else
        print_error "Failed to get container status"
        return 1
    fi
}

main() {
    print_header "Health Check - Cloud Governance Copilot"

    local all_healthy=true

    # Check Docker Compose
    if ! check_docker_compose; then
        all_healthy=false
    fi

    echo ""
    print_header "Service Health Checks"

    # Check API Gateway
    if ! check_service "API Gateway" "http://localhost:4000/health"; then
        all_healthy=false
    fi

    # Check Frontend
    if ! check_service "Frontend" "http://localhost:3010/api/health"; then
        all_healthy=false
    fi

    # Check Nginx
    if ! check_service "Nginx" "http://localhost/health"; then
        all_healthy=false
    fi

    echo ""
    if [ "$all_healthy" = true ]; then
        print_header "All Services Healthy"
        exit 0
    else
        print_header "Some Services Failed Health Checks"
        exit 1
    fi
}

main
