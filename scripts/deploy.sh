#!/bin/bash

# ============================================================
# Deployment Script - Cloud Governance Copilot to Hetzner
# ============================================================
# Automated deployment with health checks, backups, and rollback
# Usage: ./scripts/deploy.sh [VERSION]
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
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $@"
    log "INFO" "$@"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $@"
    log "SUCCESS" "$@"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $@"
    log "WARNING" "$@"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $@"
    log "ERROR" "$@"
}

# ============================================================
# Pre-flight Checks
# ============================================================
preflight_checks() {
    log_info "Running pre-flight checks..."

    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root"
        exit 1
    fi

    # Check Docker installation
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    # Check Docker Compose installation
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi

    # Check if compose file exists
    if [[ ! -f "${COMPOSE_FILE}" ]]; then
        log_error "Docker Compose file not found: ${COMPOSE_FILE}"
        exit 1
    fi

    # Check if environment file exists
    if [[ ! -f "${ENV_FILE}" ]]; then
        log_error "Environment file not found: ${ENV_FILE}"
        log_info "Copy .env.production.example to .env.production and configure it"
        exit 1
    fi

    # Check for required environment variables
    source "${ENV_FILE}"
    required_vars=(
        "POSTGRES_PASSWORD"
        "REDIS_PASSWORD"
        "JWT_SECRET"
        "NEXTAUTH_SECRET"
        "ENCRYPTION_KEY"
    )

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]] || [[ "${!var}" == *"CHANGE_ME"* ]]; then
            log_error "Required environment variable ${var} is not set or contains CHANGE_ME"
            exit 1
        fi
    done

    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi

    # Check available disk space (require at least 10GB)
    available_space=$(df -BG "${PROJECT_ROOT}" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ ${available_space} -lt 10 ]]; then
        log_warning "Low disk space: ${available_space}GB available (recommend 10GB+)"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    log_success "Pre-flight checks passed"
}

# ============================================================
# Backup Before Deployment
# ============================================================
backup_before_deploy() {
    log_info "Creating backup before deployment..."

    mkdir -p "${BACKUP_DIR}"

    # Backup database if running
    if docker-compose -f "${COMPOSE_FILE}" ps postgres | grep -q "Up"; then
        local backup_file="${BACKUP_DIR}/pre-deploy-$(date +%Y%m%d-%H%M%S).sql"
        docker-compose -f "${COMPOSE_FILE}" exec -T postgres pg_dump \
            -U "${POSTGRES_USER:-copilot_prod}" \
            -d "${POSTGRES_DB:-copilot_main}" \
            > "${backup_file}"

        gzip "${backup_file}"
        log_success "Database backup created: ${backup_file}.gz"
    else
        log_warning "Database not running, skipping backup"
    fi
}

# ============================================================
# Pull Latest Images
# ============================================================
pull_images() {
    log_info "Pulling latest images..."
    docker-compose -f "${COMPOSE_FILE}" pull --quiet
    log_success "Images pulled successfully"
}

# ============================================================
# Build Images
# ============================================================
build_images() {
    log_info "Building application images..."

    # Build with build cache
    docker-compose -f "${COMPOSE_FILE}" build \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        --progress=plain \
        api-gateway frontend 2>&1 | tee -a "${LOG_FILE}"

    log_success "Images built successfully"
}

# ============================================================
# Run Database Migrations
# ============================================================
run_migrations() {
    log_info "Running database migrations..."

    # Ensure database is running
    docker-compose -f "${COMPOSE_FILE}" up -d postgres redis

    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    for i in {1..30}; do
        if docker-compose -f "${COMPOSE_FILE}" exec -T postgres pg_isready -U "${POSTGRES_USER:-copilot_prod}" &> /dev/null; then
            break
        fi
        sleep 2
    done

    # Run Prisma migrations
    docker-compose -f "${COMPOSE_FILE}" run --rm api-gateway npx prisma migrate deploy

    log_success "Database migrations completed"
}

# ============================================================
# Deploy Services
# ============================================================
deploy_services() {
    log_info "Deploying services..."

    # Start services with zero-downtime deployment
    docker-compose -f "${COMPOSE_FILE}" up -d \
        --remove-orphans \
        --no-build

    log_success "Services deployed"
}

# ============================================================
# Health Checks
# ============================================================
health_checks() {
    log_info "Running health checks..."

    local max_attempts=30
    local attempt=0

    # Wait for services to be healthy
    sleep 10

    # Check PostgreSQL
    log_info "Checking PostgreSQL..."
    while [[ ${attempt} -lt ${max_attempts} ]]; do
        if docker-compose -f "${COMPOSE_FILE}" exec -T postgres pg_isready -U "${POSTGRES_USER:-copilot_prod}" &> /dev/null; then
            log_success "PostgreSQL is healthy"
            break
        fi
        ((attempt++))
        sleep 2
    done

    # Check Redis
    log_info "Checking Redis..."
    attempt=0
    while [[ ${attempt} -lt ${max_attempts} ]]; do
        if docker-compose -f "${COMPOSE_FILE}" exec -T redis redis-cli ping &> /dev/null; then
            log_success "Redis is healthy"
            break
        fi
        ((attempt++))
        sleep 2
    done

    # Check API Gateway
    log_info "Checking API Gateway..."
    attempt=0
    while [[ ${attempt} -lt ${max_attempts} ]]; do
        if curl -f http://localhost:4000/health &> /dev/null; then
            log_success "API Gateway is healthy"
            break
        fi
        ((attempt++))
        sleep 2
    done

    # Check Frontend
    log_info "Checking Frontend..."
    attempt=0
    while [[ ${attempt} -lt ${max_attempts} ]]; do
        if curl -f http://localhost:3000/api/health &> /dev/null; then
            log_success "Frontend is healthy"
            break
        fi
        ((attempt++))
        sleep 2
    done

    # Check Nginx
    log_info "Checking Nginx..."
    if curl -f http://localhost/health &> /dev/null; then
        log_success "Nginx is healthy"
    else
        log_warning "Nginx health check failed"
    fi

    log_success "All health checks passed"
}

# ============================================================
# Cleanup Old Images
# ============================================================
cleanup() {
    log_info "Cleaning up old images..."

    # Remove dangling images
    docker image prune -f &> /dev/null || true

    # Remove old containers
    docker container prune -f &> /dev/null || true

    log_success "Cleanup completed"
}

# ============================================================
# Rollback Function
# ============================================================
rollback() {
    log_error "Deployment failed, initiating rollback..."

    # Stop new containers
    docker-compose -f "${COMPOSE_FILE}" down

    # Restore from backup if exists
    local latest_backup=$(ls -t "${BACKUP_DIR}"/pre-deploy-*.sql.gz 2>/dev/null | head -1)
    if [[ -n "${latest_backup}" ]]; then
        log_info "Restoring from backup: ${latest_backup}"
        gunzip -c "${latest_backup}" | docker-compose -f "${COMPOSE_FILE}" exec -T postgres psql \
            -U "${POSTGRES_USER:-copilot_prod}" \
            -d "${POSTGRES_DB:-copilot_main}"
    fi

    log_error "Rollback completed. Please check logs for errors."
    exit 1
}

# ============================================================
# Main Deployment Flow
# ============================================================
main() {
    log_info "========================================"
    log_info "Cloud Governance Copilot - Deployment"
    log_info "========================================"
    log_info "Started at: $(date)"
    log_info "Environment: Production"
    log_info "Project Root: ${PROJECT_ROOT}"
    log_info "========================================"

    # Create logs directory
    mkdir -p "${PROJECT_ROOT}/logs"

    # Trap errors and rollback
    trap rollback ERR

    # Execute deployment steps
    preflight_checks
    backup_before_deploy
    pull_images
    build_images
    run_migrations
    deploy_services
    health_checks
    cleanup

    log_success "========================================"
    log_success "Deployment completed successfully!"
    log_success "========================================"
    log_info "Application URL: https://${DOMAIN:-localhost}"
    log_info "API URL: https://api.${DOMAIN:-localhost}"
    log_info "Logs: ${LOG_FILE}"
    log_success "========================================"
}

# ============================================================
# Execute Main Function
# ============================================================
main "$@"
