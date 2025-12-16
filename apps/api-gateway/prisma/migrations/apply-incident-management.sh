#!/bin/bash

# Incident Management Migration Script
#
# This script applies the incident management migration to the database.
# It creates the necessary tables and indexes for Azure alerts, activity logs,
# incidents, and comments.
#
# Usage:
#   chmod +x apply-incident-management.sh
#   ./apply-incident-management.sh
#
# Prerequisites:
#   - PostgreSQL database must be running
#   - DATABASE_URL environment variable must be set
#   - User must have CREATE TABLE and CREATE INDEX permissions

set -e  # Exit on error

echo "=========================================="
echo "Incident Management Migration"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set DATABASE_URL before running this script:"
    echo "  export DATABASE_URL=\"postgresql://user:password@localhost:5432/dbname\""
    echo ""
    exit 1
fi

echo "Database URL: ${DATABASE_URL}"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_FILE="${SCRIPT_DIR}/20251215_incident_management/migration.sql"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "ERROR: Migration file not found at: $MIGRATION_FILE"
    exit 1
fi

echo "Migration file: $MIGRATION_FILE"
echo ""

# Confirm execution
read -p "Apply incident management migration? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy](es)?$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

echo "Applying migration..."
echo ""

# Apply migration using psql
psql "$DATABASE_URL" -f "$MIGRATION_FILE"

echo ""
echo "=========================================="
echo "Migration completed successfully!"
echo "=========================================="
echo ""
echo "Tables created:"
echo "  - azure_alerts"
echo "  - azure_activity_logs"
echo "  - incident_comments"
echo ""
echo "Tables updated:"
echo "  - incidents (added new columns)"
echo ""
echo "Next steps:"
echo "  1. Verify tables were created: psql \$DATABASE_URL -c '\dt'"
echo "  2. Check indexes: psql \$DATABASE_URL -c '\di'"
echo "  3. Test the API endpoints"
echo ""
