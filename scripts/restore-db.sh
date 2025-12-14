#!/bin/bash
# Script para restaurar backup de base de datos PostgreSQL
# Uso: ./restore-db.sh <database_name> <backup_file>

set -e

if [ $# -lt 2 ]; then
    echo "Usage: $0 <database_name> <backup_file>"
    echo "Example: $0 copilot_main backups/copilot_main_20241204_120000.sql.gz"
    exit 1
fi

DATABASE=$1
BACKUP_FILE=$2
CONTAINER_NAME="copilot-postgres"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "=========================================="
echo "Database Restore"
echo "=========================================="
echo "Database: $DATABASE"
echo "Backup file: $BACKUP_FILE"
echo "=========================================="
echo ""
echo "WARNING: This will DROP and RECREATE the database!"
echo "All current data in '$DATABASE' will be LOST."
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Starting restore process..."

# Terminar conexiones activas
echo "Terminating active connections..."
docker-compose exec -T postgres psql -U copilot -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DATABASE' AND pid <> pg_backend_pid();" || true

# Eliminar base de datos
echo "Dropping database..."
docker-compose exec -T postgres psql -U copilot -c "DROP DATABASE IF EXISTS $DATABASE;"

# Crear base de datos
echo "Creating fresh database..."
docker-compose exec -T postgres psql -U copilot -c "CREATE DATABASE $DATABASE;"

# Restaurar backup
echo "Restoring from backup..."
gunzip -c "$BACKUP_FILE" | docker-compose exec -T postgres psql -U copilot -d "$DATABASE"

if [ $? -eq 0 ]; then
    echo "=========================================="
    echo "✓ Database restored successfully!"
    echo "=========================================="
else
    echo "=========================================="
    echo "✗ Error during restore"
    echo "=========================================="
    exit 1
fi
