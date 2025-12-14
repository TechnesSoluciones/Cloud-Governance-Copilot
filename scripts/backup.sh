#!/bin/bash
# ============================================================
# Cloud Governance Copilot - Backup Script
# ============================================================
# Creates backups of PostgreSQL database and Redis data
# Supports local and remote (S3-compatible) storage
# Usage: ./scripts/backup.sh [--remote] [--retention-days N]
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
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=${RETENTION_DAYS:-30}

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
# Load Environment Variables
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
# Create Backup Directory
# ============================================================
create_backup_dir() {
    mkdir -p "${BACKUP_DIR}"
    mkdir -p "${BACKUP_DIR}/postgres"
    mkdir -p "${BACKUP_DIR}/redis"
    mkdir -p "${BACKUP_DIR}/volumes"
}

# ============================================================
# Backup PostgreSQL Database
# ============================================================
backup_postgres() {
    log_info "Backing up PostgreSQL database..."

    local backup_file="${BACKUP_DIR}/postgres/postgres-${TIMESTAMP}.sql"

    # Check if PostgreSQL container is running
    if ! docker-compose -f "${COMPOSE_FILE}" ps postgres | grep -q "Up"; then
        log_error "PostgreSQL container is not running"
        return 1
    fi

    # Create backup using pg_dump
    docker-compose -f "${COMPOSE_FILE}" exec -T postgres pg_dump \
        -U "${POSTGRES_USER:-copilot_prod}" \
        -d "${POSTGRES_DB:-copilot_main}" \
        --clean \
        --if-exists \
        --create \
        --format=plain \
        > "${backup_file}"

    # Compress backup
    gzip "${backup_file}"

    local compressed_file="${backup_file}.gz"
    local file_size=$(du -h "${compressed_file}" | cut -f1)

    log_success "PostgreSQL backup created: ${compressed_file} (${file_size})"

    echo "${compressed_file}"
}

# ============================================================
# Backup PostgreSQL Globals (Users, Roles)
# ============================================================
backup_postgres_globals() {
    log_info "Backing up PostgreSQL globals (users, roles)..."

    local backup_file="${BACKUP_DIR}/postgres/postgres-globals-${TIMESTAMP}.sql"

    docker-compose -f "${COMPOSE_FILE}" exec -T postgres pg_dumpall \
        -U "${POSTGRES_USER:-copilot_prod}" \
        --globals-only \
        > "${backup_file}"

    gzip "${backup_file}"

    log_success "PostgreSQL globals backup created: ${backup_file}.gz"
}

# ============================================================
# Backup Redis Data
# ============================================================
backup_redis() {
    log_info "Backing up Redis data..."

    local backup_file="${BACKUP_DIR}/redis/redis-${TIMESTAMP}.rdb"

    # Check if Redis container is running
    if ! docker-compose -f "${COMPOSE_FILE}" ps redis | grep -q "Up"; then
        log_error "Redis container is not running"
        return 1
    fi

    # Trigger Redis save
    docker-compose -f "${COMPOSE_FILE}" exec -T redis redis-cli \
        --pass "${REDIS_PASSWORD}" \
        SAVE &> /dev/null

    # Copy RDB file
    docker-compose -f "${COMPOSE_FILE}" cp redis:/data/dump.rdb "${backup_file}"

    # Compress backup
    gzip "${backup_file}"

    local compressed_file="${backup_file}.gz"
    local file_size=$(du -h "${compressed_file}" | cut -f1)

    log_success "Redis backup created: ${compressed_file} (${file_size})"

    echo "${compressed_file}"
}

# ============================================================
# Backup Docker Volumes
# ============================================================
backup_volumes() {
    log_info "Backing up Docker volumes..."

    local volumes=("postgres_data" "redis_data")

    for volume in "${volumes[@]}"; do
        local volume_name="copilot_${volume}"
        local backup_file="${BACKUP_DIR}/volumes/${volume}-${TIMESTAMP}.tar.gz"

        # Create tar archive of volume
        docker run --rm \
            -v "${volume_name}:/data:ro" \
            -v "${BACKUP_DIR}/volumes:/backup" \
            alpine \
            tar czf "/backup/$(basename ${backup_file})" -C /data .

        local file_size=$(du -h "${backup_file}" | cut -f1)
        log_success "Volume backup created: ${backup_file} (${file_size})"
    done
}

# ============================================================
# Upload to Remote Storage (S3-compatible)
# ============================================================
upload_to_remote() {
    local backup_file=$1

    if [[ -z "${HETZNER_OBJECT_STORAGE_ACCESS_KEY:-}" ]] || \
       [[ -z "${HETZNER_OBJECT_STORAGE_SECRET_KEY:-}" ]] || \
       [[ -z "${HETZNER_OBJECT_STORAGE_ENDPOINT:-}" ]] || \
       [[ -z "${HETZNER_BACKUP_BUCKET:-}" ]]; then
        log_warning "Remote storage credentials not configured, skipping upload"
        return 0
    fi

    log_info "Uploading backup to remote storage..."

    # Install AWS CLI if not present (in container)
    if ! command -v aws &> /dev/null; then
        log_warning "AWS CLI not installed, skipping remote upload"
        return 0
    fi

    # Upload using AWS CLI with S3-compatible endpoint
    aws s3 cp \
        "${backup_file}" \
        "s3://${HETZNER_BACKUP_BUCKET}/$(basename ${backup_file})" \
        --endpoint-url "${HETZNER_OBJECT_STORAGE_ENDPOINT}" \
        --no-verify-ssl

    log_success "Backup uploaded to remote storage"
}

# ============================================================
# Encrypt Backup
# ============================================================
encrypt_backup() {
    local backup_file=$1

    if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
        log_warning "Backup encryption key not set, skipping encryption"
        return 0
    fi

    log_info "Encrypting backup..."

    # Encrypt using OpenSSL
    openssl enc -aes-256-cbc \
        -salt \
        -in "${backup_file}" \
        -out "${backup_file}.enc" \
        -pass "pass:${BACKUP_ENCRYPTION_KEY}"

    # Remove unencrypted backup
    rm "${backup_file}"

    log_success "Backup encrypted: ${backup_file}.enc"

    echo "${backup_file}.enc"
}

# ============================================================
# Clean Old Backups
# ============================================================
cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."

    # Remove old PostgreSQL backups
    find "${BACKUP_DIR}/postgres" -name "*.sql.gz*" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

    # Remove old Redis backups
    find "${BACKUP_DIR}/redis" -name "*.rdb.gz*" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

    # Remove old volume backups
    find "${BACKUP_DIR}/volumes" -name "*.tar.gz*" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

    log_success "Old backups cleaned up"
}

# ============================================================
# Create Backup Manifest
# ============================================================
create_manifest() {
    local postgres_backup=$1
    local redis_backup=$2
    local manifest_file="${BACKUP_DIR}/manifest-${TIMESTAMP}.json"

    cat > "${manifest_file}" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "postgres_backup": "$(basename ${postgres_backup})",
  "redis_backup": "$(basename ${redis_backup})",
  "postgres_size": "$(du -h ${postgres_backup} | cut -f1)",
  "redis_size": "$(du -h ${redis_backup} | cut -f1)",
  "retention_days": ${RETENTION_DAYS},
  "environment": "production"
}
EOF

    log_success "Backup manifest created: ${manifest_file}"
}

# ============================================================
# Send Notification
# ============================================================
send_notification() {
    local status=$1
    local message=$2

    # Send Slack notification if configured
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        [[ "${status}" == "error" ]] && color="danger"

        curl -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\":database: Backup ${status}\",\"attachments\":[{\"color\":\"${color}\",\"text\":\"${message}\"}]}" \
            &> /dev/null || true
    fi
}

# ============================================================
# Main Backup Function
# ============================================================
main() {
    log_info "========================================"
    log_info "Cloud Governance Copilot - Backup"
    log_info "========================================"
    log_info "Started at: $(date)"
    log_info "Backup Directory: ${BACKUP_DIR}"
    log_info "Retention Period: ${RETENTION_DAYS} days"
    log_info "========================================"

    # Load environment variables
    load_env

    # Create backup directory
    create_backup_dir

    # Perform backups
    local postgres_backup=$(backup_postgres)
    backup_postgres_globals
    local redis_backup=$(backup_redis)
    backup_volumes

    # Encrypt backups if configured
    if [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
        postgres_backup=$(encrypt_backup "${postgres_backup}")
        redis_backup=$(encrypt_backup "${redis_backup}")
    fi

    # Upload to remote storage if configured
    if [[ "${1:-}" == "--remote" ]]; then
        upload_to_remote "${postgres_backup}"
        upload_to_remote "${redis_backup}"
    fi

    # Create manifest
    create_manifest "${postgres_backup}" "${redis_backup}"

    # Cleanup old backups
    cleanup_old_backups

    # Calculate total backup size
    local total_size=$(du -sh "${BACKUP_DIR}" | cut -f1)

    log_success "========================================"
    log_success "Backup completed successfully!"
    log_success "========================================"
    log_info "PostgreSQL: ${postgres_backup}"
    log_info "Redis: ${redis_backup}"
    log_info "Total Size: ${total_size}"
    log_success "========================================"

    # Send success notification
    send_notification "success" "Backup completed successfully. Total size: ${total_size}"
}

# ============================================================
# Error Handler
# ============================================================
error_handler() {
    log_error "Backup failed!"
    send_notification "error" "Backup failed. Please check logs."
    exit 1
}

trap error_handler ERR

# ============================================================
# Execute Main Function
# ============================================================
main "$@"
