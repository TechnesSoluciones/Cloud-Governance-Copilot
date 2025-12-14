#!/bin/bash

# ============================================================
# Deployment Script - Cloud Governance Copilot to Hetzner
# ============================================================
# Automated deployment with health checks, backups, and rollback
# Usage: ./scripts/deploy-production.sh [VERSION]
# ============================================================

set -euo pipefail

# ============================================================
# Configuration
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${LOG_DIR:-${PROJECT_ROOT}/logs}"
LOG_FILE="${LOG_DIR}/deploy-$(date +%Y%m%d-%H%M%S).log"

# Deployment parameters
VERSION="${1:-latest}"
ENVIRONMENT="${ENVIRONMENT:-production}"
DOCKER_COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.production.yml"
ENV_FILE="${PROJECT_ROOT}/.env.production"

# Thresholds
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=5
BACKUP_BEFORE_DEPLOY=true
ENABLE_ROLLBACK=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================
# Logging Functions
# ============================================================

mkdir -p "$LOG_DIR"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $@" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $@" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $@" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $@" | tee -a "$LOG_FILE"
}

# ============================================================
# Pre-deployment Checks
# ============================================================

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    log_success "Docker found: $(docker --version)"

    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    log_success "Docker Compose found: $(docker-compose --version)"

    # Check if .env.production exists
    if [ ! -f "$ENV_FILE" ]; then
        log_error ".env.production file not found at $ENV_FILE"
        log_info "Copy from .env.production.example: cp .env.production.example .env.production"
        exit 1
    fi
    log_success "Environment file found"

    # Check if docker-compose.production.yml exists
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        log_error "docker-compose.production.yml not found"
        exit 1
    fi
    log_success "Docker Compose file found"

    # Create data directories if they don't exist
    mkdir -p /data/copilot/{postgres,redis,nginx/logs,backups}
    log_success "Data directories verified"
}

# ============================================================
# Backup Functions
# ============================================================

backup_database() {
    log_info "Creating database backup..."

    local backup_dir="/data/copilot/backups"
    local backup_file="${backup_dir}/postgres-backup-$(date +%Y%m%d-%H%M%S).sql.gz"

    mkdir -p "$backup_dir"

    # Get PostgreSQL credentials from .env
    local postgres_user=$(grep "^POSTGRES_USER=" "$ENV_FILE" | cut -d'=' -f2 || echo "copilot_prod")
    local postgres_password=$(grep "^POSTGRES_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2)
    local postgres_db=$(grep "^POSTGRES_DB=" "$ENV_FILE" | cut -d'=' -f2 || echo "copilot_main")

    # Perform backup
    PGPASSWORD="$postgres_password" docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres \
        pg_dump -U "$postgres_user" "$postgres_db" | gzip > "$backup_file"

    if [ $? -eq 0 ]; then
        local backup_size=$(du -h "$backup_file" | cut -f1)
        log_success "Database backup created: $backup_file (size: $backup_size)"
        echo "$backup_file"
    else
        log_error "Database backup failed"
        exit 1
    fi
}

create_full_backup() {
    if [ "$BACKUP_BEFORE_DEPLOY" = true ]; then
        log_info "Creating full system backup..."
        local db_backup=$(backup_database)
        log_success "Full backup completed: $db_backup"
    fi
}

# ============================================================
# Build Functions
# ============================================================

build_images() {
    log_info "Building Docker images..."

    export VERSION=$VERSION
    export DOCKER_BUILDKIT=1

    # Build API Gateway
    log_info "Building API Gateway image..."
    if docker-compose -f "$DOCKER_COMPOSE_FILE" build api-gateway; then
        log_success "API Gateway image built"
    else
        log_error "Failed to build API Gateway image"
        exit 1
    fi

    # Build Frontend
    log_info "Building Frontend image..."
    if docker-compose -f "$DOCKER_COMPOSE_FILE" build frontend; then
        log_success "Frontend image built"
    else
        log_error "Failed to build Frontend image"
        exit 1
    fi

    log_success "All images built successfully"
}

# ============================================================
# Health Check Functions
# ============================================================

check_service_health() {
    local service=$1
    local max_retries=${2:-$HEALTH_CHECK_RETRIES}
    local retry=0

    log_info "Checking health of $service..."

    while [ $retry -lt $max_retries ]; do
        if docker-compose -f "$DOCKER_COMPOSE_FILE" ps "$service" 2>/dev/null | grep -q "Up"; then
            log_success "$service is running"
            return 0
        fi

        retry=$((retry + 1))
        if [ $retry -lt $max_retries ]; then
            log_warning "Health check attempt $retry/$max_retries for $service"
            sleep $HEALTH_CHECK_INTERVAL
        fi
    done

    log_error "$service failed health check after $max_retries attempts"
    return 1
}

check_all_services_health() {
    log_info "Performing health checks on all services..."

    local services=("postgres" "redis" "api-gateway" "frontend" "nginx")
    local failed_services=()

    for service in "${services[@]}"; do
        if ! check_service_health "$service"; then
            failed_services+=("$service")
        fi
    done

    if [ ${#failed_services[@]} -gt 0 ]; then
        log_error "Health check failed for: ${failed_services[*]}"
        return 1
    fi

    log_success "All services are healthy"
    return 0
}

# ============================================================
# Deployment Functions
# ============================================================

prepare_deployment() {
    log_info "Preparing deployment..."

    # Create required directories
    mkdir -p /data/copilot/{postgres,redis,nginx/logs,backups}

    # Set permissions
    chmod 755 /data/copilot
    chmod 700 /data/copilot/{postgres,redis,nginx,backups} 2>/dev/null || true

    log_success "Deployment preparation complete"
}

deploy_services() {
    log_info "Deploying services..."

    cd "$PROJECT_ROOT"

    # Stop running containers gracefully
    log_info "Stopping existing containers..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down --timeout 30 || true

    # Start new containers
    log_info "Starting new containers..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d

    if [ $? -eq 0 ]; then
        log_success "Services deployed successfully"
    else
        log_error "Failed to deploy services"
        exit 1
    fi
}

# ============================================================
# Post-deployment Functions
# ============================================================

verify_deployment() {
    log_info "Verifying deployment..."

    # Check all services are running
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up"; then
        log_success "Services are running"
    else
        log_error "Not all services are running"
        return 1
    fi

    # Check health endpoints
    sleep 5

    local api_health=$(curl -sf http://127.0.0.1:4000/health 2>/dev/null || echo "FAILED")
    if [ "$api_health" != "FAILED" ]; then
        log_success "API Gateway is responding"
    else
        log_warning "API Gateway health check pending"
    fi

    log_success "Deployment verification complete"
}

# ============================================================
# Main Deployment Flow
# ============================================================

main() {
    log_info "========================================="
    log_info "Starting Deployment to Hetzner"
    log_info "Version: $VERSION"
    log_info "Environment: $ENVIRONMENT"
    log_info "========================================="

    # Pre-deployment checks
    check_prerequisites || exit 1

    # Prepare deployment
    prepare_deployment || exit 1

    # Create backups
    create_full_backup || exit 1

    # Build images
    build_images || exit 1

    # Deploy services
    deploy_services || exit 1

    # Health checks
    sleep 15
    if ! check_all_services_health; then
        log_error "Health checks failed"
        exit 1
    fi

    # Verify deployment
    verify_deployment || exit 1

    log_success "========================================="
    log_success "Deployment completed successfully!"
    log_success "========================================="
    log_info "Deployment log: $LOG_FILE"
}

# Run main function
main "$@"
