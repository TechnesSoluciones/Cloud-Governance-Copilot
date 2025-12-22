#!/bin/bash
# ============================================================
# Hetzner Storage Box - PostgreSQL Restore Script
# ============================================================
# Restore PostgreSQL backup from Hetzner Storage Box
# ============================================================

set -euo pipefail

# ============================================================
# Configuration
# ============================================================

# Database Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-copilot_main}"
DB_USER="${DB_USER:-copilot}"
DB_PASSWORD="${DB_PASSWORD:?Error: DB_PASSWORD not set}"

# Restore Configuration
LOCAL_RESTORE_DIR="${LOCAL_RESTORE_DIR:-/tmp/postgres-restore}"

# Hetzner Storage Box Configuration
STORAGEBOX_USER="${STORAGEBOX_USER:?Error: STORAGEBOX_USER not set}"
STORAGEBOX_HOST="${STORAGEBOX_HOST:?Error: STORAGEBOX_HOST not set}"
STORAGEBOX_PORT="${STORAGEBOX_PORT:-23}"
STORAGEBOX_SSH_KEY="${STORAGEBOX_SSH_KEY:-$HOME/.ssh/hetzner_storagebox_rsa}"
STORAGEBOX_REMOTE_DIR="${STORAGEBOX_REMOTE_DIR:-/backups/postgresql}"

# Logging
LOG_FILE="${LOG_FILE:-/var/log/hetzner-restore.log}"

# ============================================================
# Functions
# ============================================================

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() {
    log "INFO" "$@"
}

log_error() {
    log "ERROR" "$@"
}

log_success() {
    log "SUCCESS" "$@"
}

list_available_backups() {
    log_info "Listing available backups from Storage Box..."

    ssh -p "${STORAGEBOX_PORT}" \
        -i "${STORAGEBOX_SSH_KEY}" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
        "find ${STORAGEBOX_REMOTE_DIR} -type f -name 'backup_*.sql.gz' -printf '%T@ %p %s\n' | sort -rn | head -20" | \
        awk '{
            cmd="date -d @"$1" +\"%Y-%m-%d %H:%M:%S\""
            cmd | getline date
            close(cmd)
            size=$3/(1024*1024)
            printf "%-20s %-80s %.2f MB\n", date, $2, size
        }'
}

download_backup() {
    local remote_backup_path="$1"
    local backup_filename=$(basename "${remote_backup_path}")
    local local_backup_path="${LOCAL_RESTORE_DIR}/${backup_filename}"

    log_info "Downloading backup: ${remote_backup_path}"

    mkdir -p "${LOCAL_RESTORE_DIR}"

    # Download using rsync if available
    if command -v rsync &> /dev/null; then
        rsync -avz \
              --progress \
              -e "ssh -p ${STORAGEBOX_PORT} -i ${STORAGEBOX_SSH_KEY} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" \
              "${STORAGEBOX_USER}@${STORAGEBOX_HOST}:${remote_backup_path}" \
              "${local_backup_path}"
    else
        # Fallback to SFTP
        sftp -P "${STORAGEBOX_PORT}" \
             -i "${STORAGEBOX_SSH_KEY}" \
             -o StrictHostKeyChecking=no \
             -o UserKnownHostsFile=/dev/null \
             "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" <<EOF
get ${remote_backup_path} ${local_backup_path}
bye
EOF
    fi

    if [[ -f "${local_backup_path}" ]]; then
        log_success "Backup downloaded: ${local_backup_path}"
        echo "${local_backup_path}"
    else
        log_error "Failed to download backup"
        exit 1
    fi
}

verify_backup_integrity() {
    local backup_file="$1"
    local checksum_file="${backup_file}.sha256"

    log_info "Verifying backup integrity..."

    # Download checksum file
    local remote_checksum_path=$(ssh -p "${STORAGEBOX_PORT}" \
                                     -i "${STORAGEBOX_SSH_KEY}" \
                                     -o StrictHostKeyChecking=no \
                                     -o UserKnownHostsFile=/dev/null \
                                     "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
                                     "find ${STORAGEBOX_REMOTE_DIR} -name '$(basename ${backup_file}).sha256' | head -1")

    if [[ -n "${remote_checksum_path}" ]]; then
        sftp -P "${STORAGEBOX_PORT}" \
             -i "${STORAGEBOX_SSH_KEY}" \
             -o StrictHostKeyChecking=no \
             -o UserKnownHostsFile=/dev/null \
             "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" <<EOF
get ${remote_checksum_path} ${checksum_file}
bye
EOF

        # Verify checksum
        cd "$(dirname ${backup_file})"
        if sha256sum -c "${checksum_file}"; then
            log_success "Backup integrity verified"
        else
            log_error "Checksum verification failed!"
            exit 1
        fi
    else
        log_info "No checksum file found, skipping verification"
    fi
}

restore_database() {
    local backup_file="$1"

    log_info "Restoring database from: ${backup_file}"

    # Confirm restoration
    echo ""
    echo "WARNING: This will restore the database '${DB_NAME}' from backup."
    echo "Current data will be REPLACED!"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirmation

    if [[ "${confirmation}" != "yes" ]]; then
        log_info "Restore cancelled by user"
        exit 0
    fi

    export PGPASSWORD="${DB_PASSWORD}"

    # Drop existing database and recreate
    log_info "Dropping existing database..."
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"

    log_info "Creating fresh database..."
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${DB_NAME};"

    # Restore from backup
    log_info "Restoring data..."
    gunzip -c "${backup_file}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}"

    if [[ $? -eq 0 ]]; then
        log_success "Database restored successfully"

        # Verify restoration
        local table_count=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
        log_info "Tables in restored database: ${table_count}"
    else
        log_error "Database restoration failed"
        exit 1
    fi

    unset PGPASSWORD
}

cleanup_local_files() {
    log_info "Cleaning up local files..."
    rm -rf "${LOCAL_RESTORE_DIR}"
    log_success "Cleanup complete"
}

# ============================================================
# Main Execution
# ============================================================

main() {
    log_info "=== Hetzner Storage Box Restore Started ==="

    # Show available backups
    echo ""
    echo "Available backups:"
    echo "=================="
    list_available_backups

    echo ""
    read -p "Enter the full path of the backup to restore: " backup_path

    if [[ -z "${backup_path}" ]]; then
        log_error "No backup path provided"
        exit 1
    fi

    # Download backup
    local_backup=$(download_backup "${backup_path}")

    # Verify integrity
    verify_backup_integrity "${local_backup}"

    # Restore database
    restore_database "${local_backup}"

    # Cleanup
    cleanup_local_files

    log_success "=== Restore Completed Successfully ==="
}

# Run main function
main
