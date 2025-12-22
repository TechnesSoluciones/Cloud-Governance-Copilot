#!/bin/bash
# ============================================================
# Hetzner Storage Box - PostgreSQL Backup Script
# ============================================================
# Automated backup of PostgreSQL to Hetzner Storage Box
# Uses SSH/SFTP for secure transfer with key-based authentication
# ============================================================

set -euo pipefail

# ============================================================
# Configuration
# ============================================================

# Database Configuration (from environment or defaults)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-copilot_main}"
DB_USER="${DB_USER:-copilot}"
DB_PASSWORD="${DB_PASSWORD:?Error: DB_PASSWORD not set}"

# Backup Configuration
LOCAL_BACKUP_DIR="${LOCAL_BACKUP_DIR:-/tmp/postgres-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +"%Y%m%d_%H%M%S")
YEAR=$(date +"%Y")
MONTH=$(date +"%m")
DAY=$(date +"%d")

# Hetzner Storage Box Configuration
STORAGEBOX_USER="${STORAGEBOX_USER:?Error: STORAGEBOX_USER not set}"
STORAGEBOX_HOST="${STORAGEBOX_HOST:?Error: STORAGEBOX_HOST not set}"
STORAGEBOX_PORT="${STORAGEBOX_PORT:-23}"
STORAGEBOX_SSH_KEY="${STORAGEBOX_SSH_KEY:-$HOME/.ssh/hetzner_storagebox_rsa}"
STORAGEBOX_REMOTE_DIR="${STORAGEBOX_REMOTE_DIR:-/backups/postgresql}"

# Backup file names
BACKUP_FILENAME="backup_${DB_NAME}_${DATE}.sql.gz"
BACKUP_FILEPATH="${LOCAL_BACKUP_DIR}/${BACKUP_FILENAME}"
CHECKSUM_FILENAME="${BACKUP_FILENAME}.sha256"

# Logging
LOG_FILE="${LOG_FILE:-/var/log/hetzner-backup.log}"
ENABLE_SLACK_NOTIFICATIONS="${ENABLE_SLACK_NOTIFICATIONS:-false}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

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

send_slack_notification() {
    if [[ "${ENABLE_SLACK_NOTIFICATIONS}" == "true" ]] && [[ -n "${SLACK_WEBHOOK_URL}" ]]; then
        local status="$1"
        local message="$2"
        local color="good"

        if [[ "${status}" == "ERROR" ]]; then
            color="danger"
        elif [[ "${status}" == "WARNING" ]]; then
            color="warning"
        fi

        curl -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"${color}\",\"text\":\"${message}\"}]}" \
            "${SLACK_WEBHOOK_URL}" 2>/dev/null || true
    fi
}

check_dependencies() {
    log_info "Checking dependencies..."

    local missing_deps=()

    for cmd in pg_dump gzip ssh sftp sha256sum; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_deps+=("$cmd")
        fi
    done

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_error "Install with: apt-get install postgresql-client openssh-client coreutils"
        exit 1
    fi

    log_success "All dependencies found"
}

verify_ssh_key() {
    log_info "Verifying SSH key for Storage Box..."

    if [[ ! -f "${STORAGEBOX_SSH_KEY}" ]]; then
        log_error "SSH key not found: ${STORAGEBOX_SSH_KEY}"
        log_error "Generate one with: ssh-keygen -t rsa -b 4096 -f ${STORAGEBOX_SSH_KEY}"
        exit 1
    fi

    # Check key permissions
    local key_perms=$(stat -c "%a" "${STORAGEBOX_SSH_KEY}" 2>/dev/null || stat -f "%OLp" "${STORAGEBOX_SSH_KEY}")
    if [[ "${key_perms}" != "600" ]]; then
        log_info "Fixing SSH key permissions..."
        chmod 600 "${STORAGEBOX_SSH_KEY}"
    fi

    # Test SSH connection
    if ssh -p "${STORAGEBOX_PORT}" \
           -i "${STORAGEBOX_SSH_KEY}" \
           -o ConnectTimeout=10 \
           -o StrictHostKeyChecking=no \
           -o UserKnownHostsFile=/dev/null \
           -q \
           "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
           "echo 'OK'" &>/dev/null; then
        log_success "SSH connection verified"
    else
        log_error "Cannot connect to Storage Box via SSH"
        log_error "Check credentials: ${STORAGEBOX_USER}@${STORAGEBOX_HOST}:${STORAGEBOX_PORT}"
        exit 1
    fi
}

create_local_backup() {
    log_info "Creating local PostgreSQL backup..."

    # Create backup directory
    mkdir -p "${LOCAL_BACKUP_DIR}"

    # Perform backup
    export PGPASSWORD="${DB_PASSWORD}"

    if pg_dump -h "${DB_HOST}" \
                -p "${DB_PORT}" \
                -U "${DB_USER}" \
                -d "${DB_NAME}" \
                --format=plain \
                --no-owner \
                --no-acl \
                --verbose 2>&1 | gzip > "${BACKUP_FILEPATH}"; then

        local backup_size=$(du -h "${BACKUP_FILEPATH}" | cut -f1)
        log_success "Local backup created: ${BACKUP_FILEPATH} (${backup_size})"

        # Create checksum
        cd "${LOCAL_BACKUP_DIR}"
        sha256sum "${BACKUP_FILENAME}" > "${CHECKSUM_FILENAME}"
        log_info "Checksum created: ${CHECKSUM_FILENAME}"

        return 0
    else
        log_error "Failed to create PostgreSQL backup"
        send_slack_notification "ERROR" "PostgreSQL backup failed for ${DB_NAME}"
        exit 1
    fi

    unset PGPASSWORD
}

upload_to_storagebox() {
    log_info "Uploading backup to Hetzner Storage Box..."

    # Create remote directory structure: /backups/postgresql/YYYY/MM/DD/
    local remote_path="${STORAGEBOX_REMOTE_DIR}/${YEAR}/${MONTH}/${DAY}"

    # Create directories via SFTP
    sftp -P "${STORAGEBOX_PORT}" \
         -i "${STORAGEBOX_SSH_KEY}" \
         -o StrictHostKeyChecking=no \
         -o UserKnownHostsFile=/dev/null \
         "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" <<EOF
-mkdir ${STORAGEBOX_REMOTE_DIR}
-mkdir ${STORAGEBOX_REMOTE_DIR}/${YEAR}
-mkdir ${STORAGEBOX_REMOTE_DIR}/${YEAR}/${MONTH}
-mkdir ${STORAGEBOX_REMOTE_DIR}/${YEAR}/${MONTH}/${DAY}
EOF

    log_info "Remote directory created: ${remote_path}"

    # Upload backup file and checksum using rsync for efficiency
    if command -v rsync &> /dev/null; then
        log_info "Using rsync for upload..."

        rsync -avz \
              --progress \
              -e "ssh -p ${STORAGEBOX_PORT} -i ${STORAGEBOX_SSH_KEY} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" \
              "${BACKUP_FILEPATH}" \
              "${LOCAL_BACKUP_DIR}/${CHECKSUM_FILENAME}" \
              "${STORAGEBOX_USER}@${STORAGEBOX_HOST}:${remote_path}/"

        if [[ $? -eq 0 ]]; then
            log_success "Backup uploaded via rsync"
        else
            log_error "rsync upload failed, trying SFTP..."
            upload_via_sftp "${remote_path}"
        fi
    else
        upload_via_sftp "${remote_path}"
    fi

    # Verify upload
    verify_remote_backup "${remote_path}"
}

upload_via_sftp() {
    local remote_path="$1"

    log_info "Uploading via SFTP..."

    sftp -P "${STORAGEBOX_PORT}" \
         -i "${STORAGEBOX_SSH_KEY}" \
         -o StrictHostKeyChecking=no \
         -o UserKnownHostsFile=/dev/null \
         "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" <<EOF
cd ${remote_path}
put ${BACKUP_FILEPATH}
put ${LOCAL_BACKUP_DIR}/${CHECKSUM_FILENAME}
bye
EOF

    if [[ $? -eq 0 ]]; then
        log_success "Backup uploaded via SFTP"
    else
        log_error "SFTP upload failed"
        send_slack_notification "ERROR" "Failed to upload backup to Storage Box"
        exit 1
    fi
}

verify_remote_backup() {
    local remote_path="$1"

    log_info "Verifying remote backup integrity..."

    # Get remote file size
    local remote_size=$(ssh -p "${STORAGEBOX_PORT}" \
                            -i "${STORAGEBOX_SSH_KEY}" \
                            -o StrictHostKeyChecking=no \
                            -o UserKnownHostsFile=/dev/null \
                            "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
                            "ls -lh ${remote_path}/${BACKUP_FILENAME}" | awk '{print $5}')

    local local_size=$(du -h "${BACKUP_FILEPATH}" | cut -f1)

    log_info "Local size: ${local_size}, Remote size: ${remote_size}"

    if [[ -n "${remote_size}" ]]; then
        log_success "Remote backup verified: ${remote_path}/${BACKUP_FILENAME} (${remote_size})"

        # Send success notification
        send_slack_notification "SUCCESS" "Backup successful: ${DB_NAME} - ${remote_size} uploaded to Storage Box"
    else
        log_error "Remote backup verification failed"
        exit 1
    fi
}

cleanup_old_local_backups() {
    log_info "Cleaning up local backups older than ${RETENTION_DAYS} days..."

    local deleted_count=$(find "${LOCAL_BACKUP_DIR}" \
                              -name "backup_${DB_NAME}_*.sql.gz" \
                              -mtime +${RETENTION_DAYS} \
                              -delete -print | wc -l)

    log_info "Deleted ${deleted_count} old local backup(s)"
}

cleanup_old_remote_backups() {
    log_info "Cleaning up remote backups older than ${RETENTION_DAYS} days..."

    # SSH into Storage Box and delete old backups
    ssh -p "${STORAGEBOX_PORT}" \
        -i "${STORAGEBOX_SSH_KEY}" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" <<EOF
find ${STORAGEBOX_REMOTE_DIR} -type f -name "backup_${DB_NAME}_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
find ${STORAGEBOX_REMOTE_DIR} -type f -name "*.sha256" -mtime +${RETENTION_DAYS} -delete
# Remove empty directories
find ${STORAGEBOX_REMOTE_DIR} -type d -empty -delete
EOF

    log_success "Remote cleanup complete"
}

generate_backup_report() {
    log_info "Generating backup report..."

    local total_backups=$(ssh -p "${STORAGEBOX_PORT}" \
                              -i "${STORAGEBOX_SSH_KEY}" \
                              -o StrictHostKeyChecking=no \
                              -o UserKnownHostsFile=/dev/null \
                              "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
                              "find ${STORAGEBOX_REMOTE_DIR} -type f -name '*.sql.gz' | wc -l")

    local storage_used=$(ssh -p "${STORAGEBOX_PORT}" \
                             -i "${STORAGEBOX_SSH_KEY}" \
                             -o StrictHostKeyChecking=no \
                             -o UserKnownHostsFile=/dev/null \
                             "${STORAGEBOX_USER}@${STORAGEBOX_HOST}" \
                             "du -sh ${STORAGEBOX_REMOTE_DIR}" | awk '{print $1}')

    log_info "=== Backup Summary ==="
    log_info "Database: ${DB_NAME}"
    log_info "Backup file: ${BACKUP_FILENAME}"
    log_info "Total backups in Storage Box: ${total_backups}"
    log_info "Storage used: ${storage_used}"
    log_info "Retention policy: ${RETENTION_DAYS} days"
}

# ============================================================
# Main Execution
# ============================================================

main() {
    log_info "=== Hetzner Storage Box Backup Started ==="
    log_info "Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
    log_info "Storage Box: ${STORAGEBOX_USER}@${STORAGEBOX_HOST}"

    # Pre-flight checks
    check_dependencies
    verify_ssh_key

    # Backup process
    create_local_backup
    upload_to_storagebox

    # Cleanup
    cleanup_old_local_backups
    cleanup_old_remote_backups

    # Report
    generate_backup_report

    log_success "=== Backup Completed Successfully ==="
}

# Run main function
main
