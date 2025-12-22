#!/bin/bash
# ============================================================
# PostgreSQL Restore Script
# ============================================================
# Description: Restore PostgreSQL database from backup
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
RESTORE_LOG="${LOG_DIR}/restore_$(date +%Y%m%d_%H%M%S).log"
BACKUP_FILE=""
RESTORE_TARGET_DB=""
CREATE_NEW_DB=false
DROP_EXISTING=false

# ============================================================
# FUNCTIONS
# ============================================================

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$RESTORE_LOG"
}

# Display usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Restore PostgreSQL database from backup.

OPTIONS:
    -f, --file FILE         Backup file to restore (required)
    -d, --database DB       Target database name (default: from config)
    -n, --new-db           Create a new database for restore
    -D, --drop             Drop existing database before restore (use with caution!)
    -h, --help             Display this help message
    -l, --list             List available backups
    --from-hetzner         Download latest backup from Hetzner Storage Box
    --verify-only          Verify backup integrity without restoring

EXAMPLES:
    # List available backups
    $0 --list

    # Restore from local backup
    $0 -f /path/to/backup.sql.gz

    # Restore to a different database
    $0 -f /path/to/backup.sql.gz -d copilot_restored

    # Restore from Hetzner Storage Box
    $0 --from-hetzner

    # Create new database and restore
    $0 -f /path/to/backup.sql.gz -d copilot_test --new-db

    # Verify backup without restoring
    $0 -f /path/to/backup.sql.gz --verify-only

EOF
    exit 1
}

# List available backups
list_backups() {
    log "INFO" "Listing available backups..."

    echo ""
    echo "=========================================="
    echo "LOCAL BACKUPS"
    echo "=========================================="

    if [[ -d "$BACKUP_DIR" ]]; then
        local backups=($(find "$BACKUP_DIR" -name "${BACKUP_PREFIX}_*.gz" -type f | sort -r))

        if [[ ${#backups[@]} -eq 0 ]]; then
            echo "No local backups found in $BACKUP_DIR"
        else
            for backup in "${backups[@]}"; do
                local filename=$(basename "$backup")
                local size=$(du -h "$backup" | cut -f1)
                local date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$backup")
                printf "%-60s %10s  %s\n" "$filename" "$size" "$date"
            done
        fi
    else
        echo "Backup directory not found: $BACKUP_DIR"
    fi

    echo ""

    # List Hetzner backups if configured
    if [[ "$HETZNER_ENABLED" == "true" && -n "$HETZNER_USER" && -n "$HETZNER_HOST" && -f "$HETZNER_SSH_KEY" ]]; then
        echo "=========================================="
        echo "HETZNER STORAGE BOX BACKUPS"
        echo "=========================================="

        ssh -p "$HETZNER_PORT" -i "$HETZNER_SSH_KEY" -o StrictHostKeyChecking=no "${HETZNER_USER}@${HETZNER_HOST}" \
            "ls -lh ${HETZNER_REMOTE_DIR}/${BACKUP_PREFIX}_*.gz 2>/dev/null || echo 'No backups found on Hetzner Storage Box'" || \
            echo "Unable to connect to Hetzner Storage Box"

        echo ""
    fi

    exit 0
}

# Download backup from Hetzner
download_from_hetzner() {
    if [[ "$HETZNER_ENABLED" != "true" || -z "$HETZNER_USER" || -z "$HETZNER_HOST" ]]; then
        log "ERROR" "Hetzner Storage Box not configured"
        exit 1
    fi

    if [[ ! -f "$HETZNER_SSH_KEY" ]]; then
        log "ERROR" "Hetzner SSH key not found: $HETZNER_SSH_KEY"
        exit 1
    fi

    log "INFO" "Fetching latest backup from Hetzner Storage Box..."

    # Get latest backup filename
    local latest_backup=$(ssh -p "$HETZNER_PORT" -i "$HETZNER_SSH_KEY" -o StrictHostKeyChecking=no \
        "${HETZNER_USER}@${HETZNER_HOST}" \
        "ls -t ${HETZNER_REMOTE_DIR}/${BACKUP_PREFIX}_*.gz 2>/dev/null | head -1" || echo "")

    if [[ -z "$latest_backup" ]]; then
        log "ERROR" "No backups found on Hetzner Storage Box"
        exit 1
    fi

    log "INFO" "Latest backup: $latest_backup"

    local filename=$(basename "$latest_backup")
    local local_path="${BACKUP_DIR}/${filename}"

    # Download using rsync
    log "INFO" "Downloading to: $local_path"

    if rsync -avz --progress -e "ssh -p ${HETZNER_PORT} -i ${HETZNER_SSH_KEY} -o StrictHostKeyChecking=no" \
        "${HETZNER_USER}@${HETZNER_HOST}:${latest_backup}" "$local_path"; then
        log "INFO" "Download completed successfully"
        BACKUP_FILE="$local_path"
    else
        log "ERROR" "Download failed"
        exit 1
    fi
}

# Verify backup integrity
verify_backup() {
    local backup_file=$1

    log "INFO" "Verifying backup integrity: $backup_file"

    # Decompress to temporary location for verification
    local temp_file="${TEMP_DIR}/verify_$(basename "$backup_file" .gz)"

    if [[ "$backup_file" == *.gz ]]; then
        if ! gunzip -c "$backup_file" > "$temp_file" 2>> "$RESTORE_LOG"; then
            log "ERROR" "Failed to decompress backup file"
            return 1
        fi
    else
        temp_file="$backup_file"
    fi

    # Check if it's a custom format backup
    if [[ "$temp_file" == *.custom ]]; then
        export PGPASSWORD="$DB_PASSWORD"
        if pg_restore --list "$temp_file" > /dev/null 2>&1; then
            log "INFO" "Backup verification successful (custom format)"
            rm -f "$temp_file"
            return 0
        else
            log "ERROR" "Backup verification failed"
            rm -f "$temp_file"
            return 1
        fi
    else
        # SQL format - check if it's valid SQL
        if head -100 "$temp_file" | grep -q "PostgreSQL database dump"; then
            log "INFO" "Backup verification successful (SQL format)"
            rm -f "$temp_file"
            return 0
        else
            log "ERROR" "Backup file doesn't appear to be a valid PostgreSQL dump"
            rm -f "$temp_file"
            return 1
        fi
    fi
}

# Check database connection
test_connection() {
    log "INFO" "Testing database connection..."

    export PGPASSWORD="$DB_PASSWORD"

    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1" > /dev/null 2>&1; then
        log "ERROR" "Cannot connect to database server"
        return 1
    fi

    log "INFO" "Database connection successful"
    return 0
}

# Create database
create_database() {
    local dbname=$1

    log "INFO" "Creating database: $dbname"

    export PGPASSWORD="$DB_PASSWORD"

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
        -c "CREATE DATABASE $dbname WITH ENCODING='UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8';" \
        >> "$RESTORE_LOG" 2>&1; then
        log "INFO" "Database created successfully"
        return 0
    else
        log "ERROR" "Failed to create database"
        return 1
    fi
}

# Drop database
drop_database() {
    local dbname=$1

    log "WARN" "Dropping database: $dbname"

    export PGPASSWORD="$DB_PASSWORD"

    # Terminate existing connections
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$dbname' AND pid <> pg_backend_pid();" \
        >> "$RESTORE_LOG" 2>&1 || true

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
        -c "DROP DATABASE IF EXISTS $dbname;" >> "$RESTORE_LOG" 2>&1; then
        log "INFO" "Database dropped successfully"
        return 0
    else
        log "ERROR" "Failed to drop database"
        return 1
    fi
}

# Perform restore
perform_restore() {
    local backup_file=$1
    local target_db=$2

    log "INFO" "=========================================="
    log "INFO" "Starting database restore"
    log "INFO" "=========================================="
    log "INFO" "Source: $backup_file"
    log "INFO" "Target database: $target_db"

    export PGPASSWORD="$DB_PASSWORD"

    # Decompress backup file
    local decompressed_file=""
    if [[ "$backup_file" == *.gz ]]; then
        log "INFO" "Decompressing backup file..."
        decompressed_file="${TEMP_DIR}/restore_$(basename "$backup_file" .gz)"

        if ! gunzip -c "$backup_file" > "$decompressed_file" 2>> "$RESTORE_LOG"; then
            log "ERROR" "Failed to decompress backup file"
            return 1
        fi
    else
        decompressed_file="$backup_file"
    fi

    # Determine restore method based on file type
    if [[ "$decompressed_file" == *.custom ]]; then
        log "INFO" "Restoring from custom format backup..."

        # Use pg_restore for custom format
        if pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
            -d "$target_db" --verbose --no-owner --no-acl \
            -j "$PARALLEL_JOBS" "$decompressed_file" >> "$RESTORE_LOG" 2>&1; then
            log "INFO" "Restore completed successfully"
        else
            log "ERROR" "Restore failed. Check log for details: $RESTORE_LOG"
            rm -f "$decompressed_file"
            return 1
        fi
    else
        log "INFO" "Restoring from SQL format backup..."

        # Use psql for SQL format
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
            -d "$target_db" -f "$decompressed_file" >> "$RESTORE_LOG" 2>&1; then
            log "INFO" "Restore completed successfully"
        else
            log "ERROR" "Restore failed. Check log for details: $RESTORE_LOG"
            rm -f "$decompressed_file"
            return 1
        fi
    fi

    # Cleanup decompressed file if it was created
    if [[ "$backup_file" == *.gz ]]; then
        rm -f "$decompressed_file"
    fi

    return 0
}

# Verify restored database
verify_restore() {
    local dbname=$1

    log "INFO" "Verifying restored database..."

    export PGPASSWORD="$DB_PASSWORD"

    # Check if database exists
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$dbname" -c "SELECT 1" > /dev/null 2>&1; then
        log "ERROR" "Restored database is not accessible"
        return 1
    fi

    # Get table count
    local table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$dbname" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")

    log "INFO" "Number of tables in restored database: $table_count"

    # Run ANALYZE to update statistics
    log "INFO" "Running ANALYZE on restored database..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$dbname" -c "ANALYZE;" >> "$RESTORE_LOG" 2>&1

    log "INFO" "Database verification completed"
    return 0
}

# ============================================================
# MAIN EXECUTION
# ============================================================

# Create directories
mkdir -p "$LOG_DIR" "$TEMP_DIR"
touch "$RESTORE_LOG"

log "INFO" "PostgreSQL Restore Script Started"
log "INFO" "Log file: $RESTORE_LOG"

# Parse command line arguments
VERIFY_ONLY=false
FROM_HETZNER=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--file)
            BACKUP_FILE="$2"
            shift 2
            ;;
        -d|--database)
            RESTORE_TARGET_DB="$2"
            shift 2
            ;;
        -n|--new-db)
            CREATE_NEW_DB=true
            shift
            ;;
        -D|--drop)
            DROP_EXISTING=true
            shift
            ;;
        -l|--list)
            list_backups
            ;;
        --from-hetzner)
            FROM_HETZNER=true
            shift
            ;;
        --verify-only)
            VERIFY_ONLY=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Download from Hetzner if requested
if [[ "$FROM_HETZNER" == "true" ]]; then
    download_from_hetzner
fi

# Validate backup file
if [[ -z "$BACKUP_FILE" ]]; then
    echo "ERROR: Backup file not specified"
    usage
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    log "ERROR" "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Set default target database
if [[ -z "$RESTORE_TARGET_DB" ]]; then
    RESTORE_TARGET_DB="$DB_NAME"
fi

# Verify backup
if ! verify_backup "$BACKUP_FILE"; then
    log "ERROR" "Backup verification failed"
    exit 1
fi

# Exit if verify-only mode
if [[ "$VERIFY_ONLY" == "true" ]]; then
    log "INFO" "Verification completed successfully. Exiting (verify-only mode)."
    exit 0
fi

# Confirm restore operation
echo ""
echo "=========================================="
echo "RESTORE CONFIRMATION"
echo "=========================================="
echo "Source file: $BACKUP_FILE"
echo "Target database: $RESTORE_TARGET_DB"
echo "Host: $DB_HOST"
echo ""

if [[ "$DROP_EXISTING" == "true" ]]; then
    echo "WARNING: Existing database will be DROPPED!"
fi

if [[ "$CREATE_NEW_DB" == "true" ]]; then
    echo "A new database will be created."
fi

echo ""
read -p "Are you sure you want to proceed? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log "INFO" "Restore cancelled by user"
    exit 0
fi

# Test connection
if ! test_connection; then
    exit 1
fi

# Drop existing database if requested
if [[ "$DROP_EXISTING" == "true" ]]; then
    if ! drop_database "$RESTORE_TARGET_DB"; then
        exit 1
    fi
    CREATE_NEW_DB=true
fi

# Create new database if requested
if [[ "$CREATE_NEW_DB" == "true" ]]; then
    if ! create_database "$RESTORE_TARGET_DB"; then
        exit 1
    fi
fi

# Perform restore
if ! perform_restore "$BACKUP_FILE" "$RESTORE_TARGET_DB"; then
    exit 1
fi

# Verify restore
if ! verify_restore "$RESTORE_TARGET_DB"; then
    log "WARN" "Restore completed but verification had issues"
fi

# Cleanup
rm -rf "$TEMP_DIR"/*

log "INFO" "=========================================="
log "INFO" "Restore Completed Successfully"
log "INFO" "=========================================="
log "INFO" "Database: $RESTORE_TARGET_DB"
log "INFO" "Log file: $RESTORE_LOG"

exit 0
