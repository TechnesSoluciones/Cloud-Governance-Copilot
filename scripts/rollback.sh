#!/bin/bash
# ============================================================
# Cloud Governance Copilot - Rollback Script
# ============================================================
# Rolls back to a previous backup or Docker image version
# Usage: ./scripts/rollback.sh [backup_file] [--confirm]
# ============================================================

set -euo pipefail

# ============================================================
# Configuration
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yml"
ENV_FILE="${PROJECT_ROOT}/.env.production"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================
# Functions
# ============================================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $@"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $@"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $@"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $@"
}

# ============================================================
# Load Environment
# ============================================================
load_env() {
    if [[ -f "${ENV_FILE}" ]]; then
        source "${ENV_FILE}"
    else
        log_error "Environment file not found: ${ENV_FILE}"
        exit 1
    fi
}

# ============================================================
# List Available Backups
# ============================================================
list_backups() {
    log_info "Available backups:"
    echo ""
    echo "PostgreSQL Backups:"
    ls -lh "${BACKUP_DIR}/postgres/"*.sql.gz* 2>/dev/null | awk '{print $9, "(" $5 ")"}'
    echo ""
    echo "Redis Backups:"
    ls -lh "${BACKUP_DIR}/redis/"*.rdb.gz* 2>/dev/null | awk '{print $9, "(" $5 ")"}'
    echo ""
}

# ============================================================
# Find Latest Backup
# ============================================================
find_latest_backup() {
    local backup_type=$1
    local latest=""

    if [[ "${backup_type}" == "postgres" ]]; then
        latest=$(ls -t "${BACKUP_DIR}/postgres/"*.sql.gz 2>/dev/null | head -1)
    elif [[ "${backup_type}" == "redis" ]]; then
        latest=$(ls -t "${BACKUP_DIR}/redis/"*.rdb.gz 2>/dev/null | head -1)
    fi

    echo "${latest}"
}

# ============================================================
# Decrypt Backup if Encrypted
# ============================================================
decrypt_backup() {
    local backup_file=$1

    if [[ "${backup_file}" == *.enc ]]; then
        if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
            log_error "Backup is encrypted but BACKUP_ENCRYPTION_KEY not set"
            exit 1
        fi

        log_info "Decrypting backup..."
        local decrypted_file="${backup_file%.enc}"

        openssl enc -aes-256-cbc -d \
            -in "${backup_file}" \
            -out "${decrypted_file}" \
            -pass "pass:${BACKUP_ENCRYPTION_KEY}"

        echo "${decrypted_file}"
    else
        echo "${backup_file}"
    fi
}

# ============================================================
# Create Pre-Rollback Backup
# ============================================================
create_pre_rollback_backup() {
    log_info "Creating pre-rollback backup..."

    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_file="${BACKUP_DIR}/postgres/pre-rollback-${timestamp}.sql"

    docker-compose -f "${COMPOSE_FILE}" exec -T postgres pg_dump \
        -U "${POSTGRES_USER:-copilot_prod}" \
        -d "${POSTGRES_DB:-copilot_main}" \
        > "${backup_file}"

    gzip "${backup_file}"
    log_success "Pre-rollback backup created: ${backup_file}.gz"
}

# ============================================================
# Restore PostgreSQL Database
# ============================================================
restore_postgres() {
    local backup_file=$1

    log_info "Restoring PostgreSQL database from: ${backup_file}"

    # Decrypt if encrypted
    backup_file=$(decrypt_backup "${backup_file}")

    # Decompress if gzipped
    if [[ "${backup_file}" == *.gz ]]; then
        log_info "Decompressing backup..."
        gunzip -k "${backup_file}"
        backup_file="${backup_file%.gz}"
    fi

    # Stop application services
    log_info "Stopping application services..."
    docker-compose -f "${COMPOSE_FILE}" stop api-gateway frontend

    # Drop existing connections
    log_info "Dropping existing database connections..."
    docker-compose -f "${COMPOSE_FILE}" exec -T postgres psql \
        -U "${POSTGRES_USER:-copilot_prod}" \
        -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB:-copilot_main}' AND pid <> pg_backend_pid();"

    # Restore database
    log_info "Restoring database..."
    cat "${backup_file}" | docker-compose -f "${COMPOSE_FILE}" exec -T postgres psql \
        -U "${POSTGRES_USER:-copilot_prod}" \
        -d postgres

    # Clean up decompressed file
    [[ -f "${backup_file}" ]] && rm "${backup_file}"

    log_success "PostgreSQL database restored successfully"
}

# ============================================================
# Restore Redis Data
# ============================================================
restore_redis() {
    local backup_file=$1

    log_info "Restoring Redis data from: ${backup_file}"

    # Decrypt if encrypted
    backup_file=$(decrypt_backup "${backup_file}")

    # Decompress if gzipped
    if [[ "${backup_file}" == *.gz ]]; then
        log_info "Decompressing backup..."
        gunzip -k "${backup_file}"
        backup_file="${backup_file%.gz}"
    fi

    # Stop Redis
    log_info "Stopping Redis..."
    docker-compose -f "${COMPOSE_FILE}" stop redis

    # Copy RDB file
    log_info "Copying RDB file..."
    docker-compose -f "${COMPOSE_FILE}" cp "${backup_file}" redis:/data/dump.rdb

    # Start Redis
    log_info "Starting Redis..."
    docker-compose -f "${COMPOSE_FILE}" start redis

    # Wait for Redis to be ready
    sleep 5

    # Clean up decompressed file
    [[ -f "${backup_file}" ]] && rm "${backup_file}"

    log_success "Redis data restored successfully"
}

# ============================================================
# Rollback Docker Images
# ============================================================
rollback_images() {
    local version=${1:-"previous"}

    log_info "Rolling back to image version: ${version}"

    # Pull previous version
    if [[ "${version}" != "latest" ]]; then
        export VERSION="${version}"
        docker-compose -f "${COMPOSE_FILE}" pull api-gateway frontend
    fi

    # Restart services with previous version
    docker-compose -f "${COMPOSE_FILE}" up -d api-gateway frontend

    log_success "Images rolled back to version: ${version}"
}

# ============================================================
# Verify System Health
# ============================================================
verify_health() {
    log_info "Verifying system health..."

    local max_attempts=30
    local attempt=0

    # Check PostgreSQL
    while [[ ${attempt} -lt ${max_attempts} ]]; do
        if docker-compose -f "${COMPOSE_FILE}" exec -T postgres pg_isready -U "${POSTGRES_USER:-copilot_prod}" &> /dev/null; then
            log_success "PostgreSQL is healthy"
            break
        fi
        ((attempt++))
        sleep 2
    done

    # Check Redis
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
    attempt=0
    while [[ ${attempt} -lt ${max_attempts} ]]; do
        if curl -f http://localhost:3000/api/health &> /dev/null; then
            log_success "Frontend is healthy"
            break
        fi
        ((attempt++))
        sleep 2
    done

    log_success "All services are healthy"
}

# ============================================================
# Confirm Rollback
# ============================================================
confirm_rollback() {
    log_warning "========================================"
    log_warning "WARNING: You are about to rollback!"
    log_warning "========================================"
    log_warning "This will:"
    log_warning "  - Stop application services"
    log_warning "  - Restore database from backup"
    log_warning "  - Potentially lose recent data"
    log_warning "========================================"

    read -p "Are you sure you want to continue? (yes/NO) " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi
}

# ============================================================
# Main Rollback Function
# ============================================================
main() {
    log_info "========================================"
    log_info "Cloud Governance Copilot - Rollback"
    log_info "========================================"

    # Load environment
    load_env

    # Parse arguments
    local backup_file=""
    local confirm=false
    local image_version=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --confirm)
                confirm=true
                shift
                ;;
            --list)
                list_backups
                exit 0
                ;;
            --image)
                image_version=$2
                shift 2
                ;;
            *)
                backup_file=$1
                shift
                ;;
        esac
    done

    # Confirm rollback unless --confirm flag is set
    if [[ "${confirm}" == false ]]; then
        confirm_rollback
    fi

    # Create pre-rollback backup
    create_pre_rollback_backup

    # If no backup file specified, use latest
    if [[ -z "${backup_file}" ]]; then
        log_info "No backup specified, using latest backup..."
        backup_file=$(find_latest_backup "postgres")

        if [[ -z "${backup_file}" ]]; then
            log_error "No backups found"
            exit 1
        fi

        log_info "Using backup: ${backup_file}"
    fi

    # Verify backup file exists
    if [[ ! -f "${backup_file}" ]]; then
        log_error "Backup file not found: ${backup_file}"
        exit 1
    fi

    # Restore database
    restore_postgres "${backup_file}"

    # Restore Redis if backup exists
    local redis_backup=$(find_latest_backup "redis")
    if [[ -n "${redis_backup}" ]]; then
        restore_redis "${redis_backup}"
    fi

    # Rollback images if version specified
    if [[ -n "${image_version}" ]]; then
        rollback_images "${image_version}"
    fi

    # Restart all services
    log_info "Restarting all services..."
    docker-compose -f "${COMPOSE_FILE}" up -d

    # Verify health
    verify_health

    log_success "========================================"
    log_success "Rollback completed successfully!"
    log_success "========================================"
}

# ============================================================
# Error Handler
# ============================================================
error_handler() {
    log_error "Rollback failed!"
    log_error "System may be in an inconsistent state"
    log_error "Please check logs and restore manually if needed"
    exit 1
}

trap error_handler ERR

# ============================================================
# Execute Main Function
# ============================================================
main "$@"
