#!/bin/bash

# ============================================================
# Restore Script - Cloud Governance Copilot
# ============================================================
# Restore PostgreSQL from backup file
# Includes safety checks and pre/post restore validation
# Usage: ./scripts/restore-production.sh <backup_file> [--force]
# ============================================================

set -euo pipefail

# ============================================================
# Configuration
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env.production"
DOCKER_COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.production.yml"

# Backup file (first argument)
BACKUP_FILE="${1:-}"
FORCE_RESTORE="${2:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================
# Logging Functions
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
# Validation Functions
# ============================================================

check_prerequisites() {
    log_info "Checking prerequisites..."

    if [ ! -f "$ENV_FILE" ]; then
        log_error ".env.production not found"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "docker-compose not found"
        exit 1
    fi

    log_success "Prerequisites verified"
}

validate_backup_file() {
    log_info "Validating backup file..."

    if [ -z "$BACKUP_FILE" ]; then
        log_error "Backup file not specified"
        echo "Usage: ./scripts/restore-production.sh <backup_file> [--force]"
        exit 1
    fi

    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi

    # Check if file is gzipped
    if ! file "$BACKUP_FILE" | grep -q "gzip"; then
        log_warning "File does not appear to be gzipped: $BACKUP_FILE"
    fi

    local file_size=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
    if [ "$file_size" -lt 1000 ]; then
        log_error "Backup file too small: $file_size bytes"
        exit 1
    fi

    log_success "Backup file validated: $BACKUP_FILE (size: $(du -h $BACKUP_FILE | cut -f1))"
}

# ============================================================
# Pre-restore Checks
# ============================================================

check_container_status() {
    log_info "Checking container status..."

    if ! docker-compose -f "$DOCKER_COMPOSE_FILE" ps postgres | grep -q "Up"; then
        log_warning "PostgreSQL container not running, starting..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" up -d postgres
        sleep 10
    fi

    log_success "PostgreSQL container is running"
}

check_database_connectivity() {
    log_info "Checking database connectivity..."

    local postgres_user=$(grep "^POSTGRES_USER=" "$ENV_FILE" | cut -d'=' -f2 || echo "copilot_prod")
    local postgres_password=$(grep "^POSTGRES_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2)
    local postgres_db=$(grep "^POSTGRES_DB=" "$ENV_FILE" | cut -d'=' -f2 || echo "copilot_main")

    PGPASSWORD="$postgres_password" docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres \
        pg_isready -U "$postgres_user" -h localhost > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        log_success "Database is accessible"
    else
        log_error "Cannot connect to database"
        exit 1
    fi
}

# ============================================================
# Confirmation Functions
# ============================================================

confirm_restore() {
    if [ "$FORCE_RESTORE" = "--force" ]; then
        log_warning "Forcing restore without confirmation"
        return 0
    fi

    log_warning "WARNING: This will overwrite the current database!"
    echo
    read -p "Are you sure you want to restore from $BACKUP_FILE? (yes/no) " -n 3 -r
    echo

    if [[ ! $REPLY =~ ^[Yy] ]]; then
        log_info "Restore cancelled"
        exit 0
    fi

    log_info "Restore confirmed"
}

# ============================================================
# Restore Functions
# ============================================================

restore_database() {
    log_info "Restoring database from $BACKUP_FILE..."

    local postgres_user=$(grep "^POSTGRES_USER=" "$ENV_FILE" | cut -d'=' -f2 || echo "copilot_prod")
    local postgres_password=$(grep "^POSTGRES_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2)
    local postgres_db=$(grep "^POSTGRES_DB=" "$ENV_FILE" | cut -d'=' -f2 || echo "copilot_main")

    # Drop existing database
    log_info "Dropping existing database..."
    PGPASSWORD="$postgres_password" docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres \
        dropdb -U "$postgres_user" -h localhost --if-exists "$postgres_db" || true

    # Create fresh database
    log_info "Creating fresh database..."
    PGPASSWORD="$postgres_password" docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres \
        createdb -U "$postgres_user" -h localhost "$postgres_db"

    # Restore from backup
    log_info "Restoring from backup..."
    gunzip -c "$BACKUP_FILE" | PGPASSWORD="$postgres_password" docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres \
        psql -U "$postgres_user" -h localhost "$postgres_db"

    if [ $? -eq 0 ]; then
        log_success "Database restored successfully"
    else
        log_error "Database restore failed"
        exit 1
    fi
}

# ============================================================
# Post-restore Validation
# ============================================================

verify_restore() {
    log_info "Verifying restore..."

    local postgres_user=$(grep "^POSTGRES_USER=" "$ENV_FILE" | cut -d'=' -f2 || echo "copilot_prod")
    local postgres_password=$(grep "^POSTGRES_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2)
    local postgres_db=$(grep "^POSTGRES_DB=" "$ENV_FILE" | cut -d'=' -f2 || echo "copilot_main")

    # Check table count
    local table_count=$(PGPASSWORD="$postgres_password" docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres \
        psql -U "$postgres_user" -h localhost "$postgres_db" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")

    if [ "$table_count" -gt 0 ]; then
        log_success "Database verified: $table_count tables found"
    else
        log_error "Database verification failed: no tables found"
        exit 1
    fi

    # Check record count
    local record_count=$(PGPASSWORD="$postgres_password" docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres \
        psql -U "$postgres_user" -h localhost "$postgres_db" -t -c \
        "SELECT SUM(n_live_tup) FROM pg_stat_user_tables" 2>/dev/null || echo "0")

    log_success "Database contains approximately $record_count records"
}

restart_services() {
    log_info "Restarting application services..."

    docker-compose -f "$DOCKER_COMPOSE_FILE" restart api-gateway frontend

    sleep 10

    # Check if services are up
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up"; then
        log_success "Services restarted successfully"
    else
        log_warning "Some services failed to restart"
    fi
}

# ============================================================
# Main Restore Flow
# ============================================================

main() {
    log_info "========================================="
    log_info "Starting Database Restore"
    log_info "Backup: $BACKUP_FILE"
    log_info "========================================="

    # Validation
    check_prerequisites || exit 1
    validate_backup_file || exit 1

    # Pre-restore checks
    check_container_status || exit 1
    check_database_connectivity || exit 1

    # Confirmation
    confirm_restore

    # Restore
    restore_database || exit 1

    # Post-restore
    verify_restore || exit 1
    restart_services

    log_success "========================================="
    log_success "Restore completed successfully!"
    log_success "========================================="
    log_info "Please verify the restored data"
}

# Run main function
main "$@"
