#!/bin/bash
# ============================================================
# PostgreSQL Backup Script with Hetzner Storage Box Integration
# ============================================================
# Description: Automated PostgreSQL backup with compression,
#              remote upload, rotation, and error handling
# Author: Cloud Governance Copilot Team
# Version: 1.0.0
# ============================================================

set -euo pipefail

# ============================================================
# CONFIGURATION
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/configs/backup.conf"

# Source configuration
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "ERROR: Configuration file not found: $CONFIG_FILE"
    exit 1
fi

source "$CONFIG_FILE"

# ============================================================
# VARIABLES
# ============================================================
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y-%m-%d)
BACKUP_FILENAME="${BACKUP_PREFIX}_${TIMESTAMP}"
TEMP_DIR="${BACKUP_DIR}/tmp"
LOCKFILE="/tmp/postgres_backup.lock"
EXIT_CODE=0

# ============================================================
# FUNCTIONS
# ============================================================

# Initialize directories and log file
init() {
    mkdir -p "$BACKUP_DIR" "$LOG_DIR" "$TEMP_DIR"

    # Set secure permissions
    chmod 700 "$BACKUP_DIR"
    chmod 700 "$LOG_DIR"

    # Create or rotate log file
    if [[ -f "$LOG_FILE" ]]; then
        local log_size=$(du -m "$LOG_FILE" | cut -f1)
        if [[ $log_size -gt $MAX_LOG_SIZE ]]; then
            mv "$LOG_FILE" "${LOG_FILE}.old"
            gzip -f "${LOG_FILE}.old"
        fi
    fi

    touch "$LOG_FILE"
    chmod 600 "$LOG_FILE"
}

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Check for lock file to prevent concurrent backups
check_lock() {
    if [[ -f "$LOCKFILE" ]]; then
        local pid=$(cat "$LOCKFILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            log "ERROR" "Backup already running with PID $pid"
            exit 1
        else
            log "WARN" "Stale lock file found, removing..."
            rm -f "$LOCKFILE"
        fi
    fi
    echo $$ > "$LOCKFILE"
}

# Remove lock file
remove_lock() {
    rm -f "$LOCKFILE"
}

# Test database connection
test_connection() {
    log "INFO" "Testing database connection..."

    export PGPASSWORD="$DB_PASSWORD"

    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
        log "ERROR" "Cannot connect to database"
        return 1
    fi

    log "INFO" "Database connection successful"
    return 0
}

# Run VACUUM ANALYZE if enabled
run_vacuum() {
    if [[ "$RUN_VACUUM" == "true" ]]; then
        log "INFO" "Running VACUUM ANALYZE..."
        export PGPASSWORD="$DB_PASSWORD"

        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "VACUUM ANALYZE;" >> "$LOG_FILE" 2>&1; then
            log "INFO" "VACUUM ANALYZE completed successfully"
        else
            log "WARN" "VACUUM ANALYZE failed, continuing with backup..."
        fi
    fi
}

# Perform PostgreSQL backup
perform_backup() {
    log "INFO" "Starting PostgreSQL backup..."
    log "INFO" "Database: $DB_NAME@$DB_HOST:$DB_PORT"
    log "INFO" "Backup file: $BACKUP_FILENAME"

    export PGPASSWORD="$DB_PASSWORD"

    # Determine backup format and extension
    local format_option=""
    local extension=""

    if [[ "$USE_CUSTOM_FORMAT" == "true" ]]; then
        format_option="-Fc"
        extension=".custom"
    else
        format_option="-Fp"
        extension=".sql"
    fi

    # Add parallel jobs if enabled and using custom format
    local parallel_option=""
    if [[ "$USE_CUSTOM_FORMAT" == "true" && "$PARALLEL_JOBS" -gt 1 ]]; then
        parallel_option="-j $PARALLEL_JOBS"
    fi

    local backup_file="${TEMP_DIR}/${BACKUP_FILENAME}${extension}"

    # Run pg_dump with timeout if specified
    local dump_cmd="pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER $format_option $parallel_option $PGDUMP_OPTIONS -d $DB_NAME -f $backup_file"

    log "INFO" "Executing: pg_dump [connection details hidden]"

    if [[ $BACKUP_TIMEOUT -gt 0 ]]; then
        if timeout $BACKUP_TIMEOUT bash -c "$dump_cmd" >> "$LOG_FILE" 2>&1; then
            log "INFO" "Database dump completed successfully"
        else
            log "ERROR" "Database dump failed or timed out"
            return 1
        fi
    else
        if $dump_cmd >> "$LOG_FILE" 2>&1; then
            log "INFO" "Database dump completed successfully"
        else
            log "ERROR" "Database dump failed"
            return 1
        fi
    fi

    # Create schema-only backup if enabled
    if [[ "$SCHEMA_ONLY_BACKUP" == "true" ]]; then
        log "INFO" "Creating schema-only backup..."
        local schema_file="${TEMP_DIR}/${BACKUP_FILENAME}_schema${extension}"

        if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" $format_option -s $PGDUMP_OPTIONS -d "$DB_NAME" -f "$schema_file" >> "$LOG_FILE" 2>&1; then
            log "INFO" "Schema-only backup completed"
        else
            log "WARN" "Schema-only backup failed"
        fi
    fi

    # Verify backup file
    if [[ ! -f "$backup_file" ]]; then
        log "ERROR" "Backup file not created: $backup_file"
        return 1
    fi

    local backup_size=$(du -h "$backup_file" | cut -f1)
    log "INFO" "Backup file size (uncompressed): $backup_size"

    # Verify backup integrity if enabled
    if [[ "$VERIFY_BACKUP" == "true" && "$USE_CUSTOM_FORMAT" == "true" ]]; then
        log "INFO" "Verifying backup integrity..."
        if pg_restore --list "$backup_file" > /dev/null 2>&1; then
            log "INFO" "Backup verification successful"
        else
            log "ERROR" "Backup verification failed"
            return 1
        fi
    fi

    return 0
}

# Compress backup
compress_backup() {
    log "INFO" "Compressing backup..."

    local extension=""
    if [[ "$USE_CUSTOM_FORMAT" == "true" ]]; then
        extension=".custom"
    else
        extension=".sql"
    fi

    local backup_file="${TEMP_DIR}/${BACKUP_FILENAME}${extension}"

    if [[ ! -f "$backup_file" ]]; then
        log "ERROR" "Backup file not found for compression: $backup_file"
        return 1
    fi

    # Compress using gzip with specified compression level
    if gzip -${COMPRESSION_LEVEL} "$backup_file"; then
        log "INFO" "Compression completed successfully"
        local compressed_file="${backup_file}.gz"
        local compressed_size=$(du -h "$compressed_file" | cut -f1)
        log "INFO" "Compressed file size: $compressed_size"

        # Move to final backup directory
        mv "$compressed_file" "${BACKUP_DIR}/"

        # Also compress schema backup if exists
        if [[ "$SCHEMA_ONLY_BACKUP" == "true" ]]; then
            local schema_file="${TEMP_DIR}/${BACKUP_FILENAME}_schema${extension}"
            if [[ -f "$schema_file" ]]; then
                gzip -${COMPRESSION_LEVEL} "$schema_file"
                mv "${schema_file}.gz" "${BACKUP_DIR}/"
            fi
        fi

        return 0
    else
        log "ERROR" "Compression failed"
        return 1
    fi
}

# Upload to Hetzner Storage Box
upload_to_hetzner() {
    if [[ "$HETZNER_ENABLED" != "true" ]]; then
        log "INFO" "Hetzner Storage Box upload disabled, skipping..."
        return 0
    fi

    if [[ -z "$HETZNER_USER" || -z "$HETZNER_HOST" ]]; then
        log "WARN" "Hetzner credentials not configured, skipping upload..."
        return 0
    fi

    log "INFO" "Uploading backup to Hetzner Storage Box..."

    # Check if SSH key exists
    if [[ ! -f "$HETZNER_SSH_KEY" ]]; then
        log "WARN" "Hetzner SSH key not found: $HETZNER_SSH_KEY"
        log "WARN" "Skipping remote upload..."
        return 0
    fi

    local extension=""
    if [[ "$USE_CUSTOM_FORMAT" == "true" ]]; then
        extension=".custom.gz"
    else
        extension=".sql.gz"
    fi

    local backup_file="${BACKUP_DIR}/${BACKUP_FILENAME}${extension}"
    local remote_path="${HETZNER_USER}@${HETZNER_HOST}:${HETZNER_REMOTE_DIR}/"

    # Create remote directory if it doesn't exist
    ssh -p "$HETZNER_PORT" -i "$HETZNER_SSH_KEY" -o StrictHostKeyChecking=no "${HETZNER_USER}@${HETZNER_HOST}" "mkdir -p ${HETZNER_REMOTE_DIR}" 2>> "$LOG_FILE" || true

    # Upload using rsync with progress
    if rsync -avz --progress -e "ssh -p ${HETZNER_PORT} -i ${HETZNER_SSH_KEY} -o StrictHostKeyChecking=no" \
        "$backup_file" "$remote_path" >> "$LOG_FILE" 2>&1; then
        log "INFO" "Upload to Hetzner Storage Box completed successfully"

        # Also upload schema backup if exists
        if [[ "$SCHEMA_ONLY_BACKUP" == "true" ]]; then
            local schema_file="${BACKUP_DIR}/${BACKUP_FILENAME}_schema${extension}"
            if [[ -f "$schema_file" ]]; then
                rsync -avz -e "ssh -p ${HETZNER_PORT} -i ${HETZNER_SSH_KEY} -o StrictHostKeyChecking=no" \
                    "$schema_file" "$remote_path" >> "$LOG_FILE" 2>&1
            fi
        fi

        return 0
    else
        log "ERROR" "Upload to Hetzner Storage Box failed"
        return 1
    fi
}

# Rotate local backups
rotate_local_backups() {
    log "INFO" "Rotating local backups..."

    # Delete backups older than retention days
    find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*.gz" -type f -mtime +${RETENTION_DAYS} -delete 2>> "$LOG_FILE"

    # Keep only max number of backups
    local backup_count=$(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*.gz" -type f | wc -l)

    if [[ $backup_count -gt $MAX_LOCAL_BACKUPS ]]; then
        local to_delete=$((backup_count - MAX_LOCAL_BACKUPS))
        log "INFO" "Removing $to_delete old backups to maintain max limit of $MAX_LOCAL_BACKUPS"

        find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*.gz" -type f -printf '%T+ %p\n' | \
            sort | head -n $to_delete | cut -d' ' -f2- | xargs rm -f
    fi

    local remaining=$(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*.gz" -type f | wc -l)
    log "INFO" "Local backups remaining: $remaining"
}

# Rotate Hetzner backups
rotate_hetzner_backups() {
    if [[ "$HETZNER_ENABLED" != "true" ]]; then
        return 0
    fi

    if [[ -z "$HETZNER_USER" || -z "$HETZNER_HOST" || ! -f "$HETZNER_SSH_KEY" ]]; then
        return 0
    fi

    log "INFO" "Rotating Hetzner Storage Box backups..."

    # Delete backups older than Hetzner retention days
    ssh -p "$HETZNER_PORT" -i "$HETZNER_SSH_KEY" -o StrictHostKeyChecking=no "${HETZNER_USER}@${HETZNER_HOST}" \
        "find ${HETZNER_REMOTE_DIR} -name '${BACKUP_PREFIX}_*.gz' -type f -mtime +${HETZNER_RETENTION_DAYS} -delete" 2>> "$LOG_FILE" || true

    log "INFO" "Hetzner backup rotation completed"
}

# Cleanup temporary files
cleanup() {
    log "INFO" "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"/*
}

# Send notification
send_notification() {
    local status=$1
    local message=$2

    if [[ "$NOTIFICATIONS_ENABLED" != "true" ]]; then
        return 0
    fi

    # Email notification
    if [[ "$NOTIFICATION_METHOD" == "email" || "$NOTIFICATION_METHOD" == "both" ]] && [[ -n "$NOTIFY_EMAIL" ]]; then
        local subject=""
        if [[ "$status" == "success" ]]; then
            subject="$EMAIL_SUBJECT_SUCCESS"
        else
            subject="$EMAIL_SUBJECT_FAILURE"
        fi

        echo "$message" | mail -s "$subject" -r "$EMAIL_FROM" "$NOTIFY_EMAIL" 2>> "$LOG_FILE" || true
    fi

    # Webhook notification
    if [[ "$WEBHOOK_ENABLED" == "true" && -n "$WEBHOOK_URL" ]]; then
        local payload=$(cat <<EOF
{
    "status": "$status",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "database": "$DB_NAME",
    "message": "$message"
}
EOF
)
        curl -X POST -H "Content-Type: application/json" -d "$payload" "$WEBHOOK_URL" >> "$LOG_FILE" 2>&1 || true
    fi

    # Slack notification
    if [[ "$SLACK_ENABLED" == "true" && -n "$SLACK_WEBHOOK_URL" ]]; then
        local color="good"
        if [[ "$status" != "success" ]]; then
            color="danger"
        fi

        local slack_payload=$(cat <<EOF
{
    "attachments": [{
        "color": "$color",
        "title": "PostgreSQL Backup $status",
        "text": "$message",
        "fields": [
            {
                "title": "Database",
                "value": "$DB_NAME",
                "short": true
            },
            {
                "title": "Timestamp",
                "value": "$(date '+%Y-%m-%d %H:%M:%S')",
                "short": true
            }
        ]
    }]
}
EOF
)
        curl -X POST -H "Content-Type: application/json" -d "$slack_payload" "$SLACK_WEBHOOK_URL" >> "$LOG_FILE" 2>&1 || true
    fi

    # Healthcheck ping
    if [[ "$HEALTHCHECK_ENABLED" == "true" && -n "$HEALTHCHECK_URL" && "$status" == "success" ]]; then
        curl -fsS --retry 3 "$HEALTHCHECK_URL" >> "$LOG_FILE" 2>&1 || true
    fi
}

# Error handler
handle_error() {
    local line_num=$1
    log "ERROR" "Script failed at line $line_num"
    EXIT_CODE=1
    cleanup
    remove_lock

    local error_msg="Backup failed at line $line_num. Check logs for details: $LOG_FILE"
    send_notification "failure" "$error_msg"

    exit $EXIT_CODE
}

# ============================================================
# MAIN EXECUTION
# ============================================================

# Set up error trap
trap 'handle_error ${LINENO}' ERR

log "INFO" "=========================================="
log "INFO" "PostgreSQL Backup Started"
log "INFO" "=========================================="
log "INFO" "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
log "INFO" "Database: $DB_NAME"
log "INFO" "Host: $DB_HOST"

# Initialize
init

# Check for concurrent backups
check_lock

# Test database connection
if ! test_connection; then
    handle_error ${LINENO}
fi

# Run VACUUM if enabled
run_vacuum

# Perform backup
if ! perform_backup; then
    handle_error ${LINENO}
fi

# Compress backup
if ! compress_backup; then
    handle_error ${LINENO}
fi

# Upload to Hetzner
if ! upload_to_hetzner; then
    log "WARN" "Hetzner upload failed, but local backup exists"
    # Don't fail the entire backup if remote upload fails
fi

# Rotate backups
rotate_local_backups
rotate_hetzner_backups

# Cleanup
cleanup
remove_lock

# Calculate total time
BACKUP_END=$(date +%s)
TOTAL_TIME=$((BACKUP_END - $(date +%s)))

log "INFO" "=========================================="
log "INFO" "PostgreSQL Backup Completed Successfully"
log "INFO" "=========================================="
log "INFO" "Total backups in local directory: $(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*.gz" -type f | wc -l)"

# Send success notification
local success_msg="PostgreSQL backup completed successfully for database $DB_NAME on $DATE"
send_notification "success" "$success_msg"

exit 0
