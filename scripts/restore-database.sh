#!/bin/bash
# PostgreSQL Database Restore Script
# Usage: ./restore-database.sh <backup_file.sql.gz>

set -euo pipefail

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lh /var/backups/postgresql/backup_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"
DB_HOST="${DB_HOST:-46.224.33.191}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-copilot_dev}"
DB_USER="${DB_USER:-copilot_dev}"
DB_PASSWORD="${DB_PASSWORD:?Error: DB_PASSWORD environment variable not set}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "⚠️  WARNING: This will REPLACE all data in database ${DB_NAME}"
echo "Backup file: ${BACKUP_FILE}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

echo "🔄 Starting database restore..."

# Drop and recreate database
export PGPASSWORD="${DB_PASSWORD}"

echo "1. Dropping existing database..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" || true

echo "2. Creating new database..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${DB_NAME};"

echo "3. Restoring from backup..."
gunzip -c "${BACKUP_FILE}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}"

if [ $? -eq 0 ]; then
    echo "✅ Database restore completed successfully!"
    echo ""
    echo "📊 Database info:"
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "\l ${DB_NAME}"
else
    echo "❌ Database restore failed!"
    exit 1
fi
