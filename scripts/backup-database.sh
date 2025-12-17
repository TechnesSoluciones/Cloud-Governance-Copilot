#!/bin/bash
# Automated PostgreSQL Backup Script for Hetzner VPS
# Usage: ./backup-database.sh
# Requires environment variables: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

set -euo pipefail

# Configuration from environment variables
DB_HOST="${DB_HOST:-46.224.33.191}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-copilot_dev}"
DB_USER="${DB_USER:-copilot_dev}"
DB_PASSWORD="${DB_PASSWORD:?Error: DB_PASSWORD environment variable not set}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgresql}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${DATE}.sql.gz"
LOG_FILE="${LOG_FILE:-/var/log/postgresql-backup.log}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "Starting PostgreSQL backup..."
log "Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"

# Perform backup
export PGPASSWORD="${DB_PASSWORD}"
if pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    --format=plain --no-owner --no-acl | gzip > "${BACKUP_FILE}"; then
    
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    log "✅ Backup completed successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"
    
    # Delete old backups
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."
    DELETED=$(find "${BACKUP_DIR}" -name "backup_${DB_NAME}_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
    log "Deleted ${DELETED} old backup(s)"
    
    REMAINING_BACKUPS=$(find "${BACKUP_DIR}" -name "backup_${DB_NAME}_*.sql.gz" | wc -l)
    log "✅ Cleanup complete. ${REMAINING_BACKUPS} backups remaining."
    
    exit 0
else
    log "❌ Backup failed!"
    exit 1
fi
