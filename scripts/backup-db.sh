#!/bin/bash
# Script para hacer backup de todas las bases de datos PostgreSQL
# Comprime los backups y los guarda con timestamp

set -e

# Configuración
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONTAINER_NAME="copilot-postgres"

# Bases de datos a respaldar
DATABASES=(
    "copilot_main"
    "onecloud_db"
    "spend_db"
    "security_db"
    "asset_db"
    "incident_db"
    "advisor_db"
)

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo "=========================================="
echo "Starting database backup - $TIMESTAMP"
echo "=========================================="

# Backup de cada base de datos
for db in "${DATABASES[@]}"; do
    echo "Backing up database: $db"
    docker-compose exec -T postgres pg_dump -U copilot "$db" | gzip > "$BACKUP_DIR/${db}_${TIMESTAMP}.sql.gz"

    if [ $? -eq 0 ]; then
        echo "✓ Backup completed: ${db}_${TIMESTAMP}.sql.gz"
    else
        echo "✗ Error backing up: $db"
        exit 1
    fi
done

# Backup de esquema global (usuarios, roles, etc.)
echo "Backing up global schema..."
docker-compose exec -T postgres pg_dumpall -U copilot --globals-only | gzip > "$BACKUP_DIR/globals_${TIMESTAMP}.sql.gz"

echo "=========================================="
echo "All backups completed successfully!"
echo "Location: $BACKUP_DIR"
echo "=========================================="

# Limpieza de backups antiguos (mantener últimos 7 días)
echo "Cleaning old backups (keeping last 7 days)..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
echo "Cleanup completed"

# Opcional: Subir a Hetzner Object Storage (descomentar si se configura)
# echo "Uploading to Hetzner Object Storage..."
# for file in "$BACKUP_DIR"/*_${TIMESTAMP}.sql.gz; do
#     aws s3 cp "$file" "s3://${HETZNER_BACKUP_BUCKET}/$(basename $file)" \
#         --endpoint-url "$HETZNER_OBJECT_STORAGE_ENDPOINT"
# done
# echo "Upload completed"
