#!/bin/bash

# ============================================================
# Backup Script - Cloud Governance Copilot
# ============================================================
# Automated backup of PostgreSQL and Redis
# Supports local storage and Hetzner Object Storage
# Usage: ./scripts/backup-production.sh [target]
# ============================================================

set -euo pipefail

# ============================================================
# Configuration
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env.production"
DOCKER_COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.production.yml"

# Backup parameters
BACKUP_TARGET="${1:-local}"  # local | hetzner | aws
LOCAL_BACKUP_DIR="/data/copilot/backups"
BACKUP_RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

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

    # Create backup directory
    mkdir -p "$LOCAL_BACKUP_DIR"
    log_success "Prerequisites verified"
}

# ============================================================
# Database Backup Functions
# ============================================================

backup_postgresql() {
    log_info "Backing up PostgreSQL database..."

    local backup_file="${LOCAL_BACKUP_DIR}/postgres-${TIMESTAMP}.sql.gz"

    # Get credentials from .env
    local postgres_user=$(grep "^POSTGRES_USER=" "$ENV_FILE" | cut -d'=' -f2 || echo "copilot_prod")
    local postgres_password=$(grep "^POSTGRES_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2)
    local postgres_db=$(grep "^POSTGRES_DB=" "$ENV_FILE" | cut -d'=' -f2 || echo "copilot_main")

    # Perform backup
    PGPASSWORD="$postgres_password" docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres \
        pg_dump -U "$postgres_user" -h localhost "$postgres_db" | gzip > "$backup_file"

    if [ $? -eq 0 ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        log_success "PostgreSQL backup: $backup_file (size: $size)"
        echo "$backup_file"
    else
        log_error "PostgreSQL backup failed"
        return 1
    fi
}

backup_redis() {
    log_info "Backing up Redis data..."

    local backup_file="${LOCAL_BACKUP_DIR}/redis-${TIMESTAMP}.rdb"

    # Get Redis password
    local redis_password=$(grep "^REDIS_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2)

    # Create backup
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T redis \
        redis-cli -a "$redis_password" BGSAVE > /dev/null 2>&1

    sleep 2

    # Copy backup file
    docker cp copilot-redis:/data/dump.rdb "$backup_file" 2>/dev/null || {
        log_warning "Redis backup file not accessible, continuing..."
        return 0
    }

    if [ -f "$backup_file" ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        log_success "Redis backup: $backup_file (size: $size)"
        echo "$backup_file"
    fi
}

# ============================================================
# Upload Functions
# ============================================================

upload_to_hetzner() {
    local file=$1

    log_info "Uploading $file to Hetzner Object Storage..."

    # Get Hetzner credentials
    local access_key=$(grep "^HETZNER_OBJECT_STORAGE_ACCESS_KEY=" "$ENV_FILE" | cut -d'=' -f2)
    local secret_key=$(grep "^HETZNER_OBJECT_STORAGE_SECRET_KEY=" "$ENV_FILE" | cut -d'=' -f2)
    local endpoint=$(grep "^HETZNER_OBJECT_STORAGE_ENDPOINT=" "$ENV_FILE" | cut -d'=' -f2)
    local bucket=$(grep "^HETZNER_BACKUP_BUCKET=" "$ENV_FILE" | cut -d'=' -f2)

    # Check if credentials are set
    if [ -z "$access_key" ] || [ "$access_key" = "CHANGE_ME_ACCESS_KEY" ]; then
        log_warning "Hetzner credentials not configured, skipping upload"
        return 0
    fi

    # Upload using S3-compatible API (requires AWS CLI or mc)
    if command -v aws &> /dev/null; then
        aws s3 cp "$file" "s3://${bucket}/$(basename $file)" \
            --endpoint-url "$endpoint" \
            --region fsn1 2>/dev/null || {
            log_warning "Hetzner upload failed, keeping local backup"
        }
    else
        log_warning "AWS CLI not found, skipping Hetzner upload"
    fi
}

upload_to_aws() {
    local file=$1

    log_info "Uploading $file to AWS S3..."

    # Get AWS credentials
    local bucket=$(grep "^AWS_S3_BUCKET=" "$ENV_FILE" | cut -d'=' -f2)

    if [ -z "$bucket" ] || [ "$bucket" = "copilot-backups-prod" ]; then
        log_warning "AWS S3 bucket not configured, skipping upload"
        return 0
    fi

    if command -v aws &> /dev/null; then
        aws s3 cp "$file" "s3://${bucket}/$(basename $file)" || {
            log_warning "AWS S3 upload failed, keeping local backup"
        }
    else
        log_warning "AWS CLI not found, skipping S3 upload"
    fi
}

# ============================================================
# Cleanup Functions
# ============================================================

cleanup_old_backups() {
    log_info "Cleaning up old backups (retention: ${BACKUP_RETENTION_DAYS} days)..."

    find "$LOCAL_BACKUP_DIR" -type f -name "*.sql.gz" -o -name "*.rdb" | while read file; do
        local file_age=$(( ($(date +%s) - $(date -r "$file" +%s)) / 86400 ))
        if [ $file_age -gt $BACKUP_RETENTION_DAYS ]; then
            log_info "Removing old backup: $(basename $file) (${file_age} days old)"
            rm -f "$file"
        fi
    done

    log_success "Cleanup completed"
}

# ============================================================
# Verification Functions
# ============================================================

verify_backup() {
    local file=$1

    log_info "Verifying backup: $(basename $file)..."

    if [ ! -f "$file" ]; then
        log_error "Backup file not found: $file"
        return 1
    fi

    local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
    if [ "$size" -lt 1000 ]; then
        log_error "Backup file too small: $size bytes"
        return 1
    fi

    log_success "Backup verified: $file (size: $(du -h $file | cut -f1))"
    return 0
}

# ============================================================
# Manifest Functions
# ============================================================

create_backup_manifest() {
    local db_backup=$1
    local redis_backup=$2

    log_info "Creating backup manifest..."

    cat > "${LOCAL_BACKUP_DIR}/manifest-${TIMESTAMP}.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "$(grep '^VERSION=' "$ENV_FILE" | cut -d'=' -f2 || echo "unknown")",
  "environment": "production",
  "backups": {
    "database": "$(basename $db_backup)",
    "redis": "$(basename $redis_backup 2>/dev/null || echo "skipped")"
  },
  "retention_days": $BACKUP_RETENTION_DAYS,
  "compression": "gzip"
}
EOF

    log_success "Manifest created: ${LOCAL_BACKUP_DIR}/manifest-${TIMESTAMP}.json"
}

# ============================================================
# Main Backup Flow
# ============================================================

main() {
    log_info "========================================="
    log_info "Starting Backup Process"
    log_info "Target: $BACKUP_TARGET"
    log_info "Timestamp: $TIMESTAMP"
    log_info "========================================="

    # Check prerequisites
    check_prerequisites || exit 1

    # Backup databases
    local db_backup=$(backup_postgresql) || exit 1
    local redis_backup=$(backup_redis) || true  # Redis is optional

    # Verify backups
    verify_backup "$db_backup" || exit 1

    # Upload if specified
    case "$BACKUP_TARGET" in
        hetzner)
            upload_to_hetzner "$db_backup"
            ;;
        aws)
            upload_to_aws "$db_backup"
            ;;
        local)
            log_info "Keeping backup local: $LOCAL_BACKUP_DIR"
            ;;
        *)
            log_error "Unknown backup target: $BACKUP_TARGET"
            exit 1
            ;;
    esac

    # Create manifest
    create_backup_manifest "$db_backup" "$redis_backup"

    # Cleanup old backups
    cleanup_old_backups

    log_success "========================================="
    log_success "Backup completed successfully!"
    log_success "Location: $db_backup"
    log_success "========================================="
}

# Run main function
main "$@"
