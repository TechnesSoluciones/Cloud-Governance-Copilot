#!/bin/bash

set -e

echo "🗄️  Setting up test database..."

# Load env vars
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/copilot_test}"

# Extract database components
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\(.*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\(.*\)/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\(.*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/.*:\(.*\)@.*/\1/p')

echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "User: $DB_USER"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
max_attempts=30
attempt=0
while ! PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c '\q' 2>/dev/null; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_attempts ]; then
    echo "❌ PostgreSQL is not available after $max_attempts attempts"
    exit 1
  fi
  echo "Waiting for PostgreSQL... (attempt $attempt/$max_attempts)"
  sleep 2
done

echo "✅ PostgreSQL is ready"

# Drop existing test DB if exists
echo "Dropping existing test database if exists..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;" postgres 2>/dev/null || true

# Create test DB
echo "Creating test database..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;" postgres

# Run migrations
echo "Running migrations..."
cd apps/api-gateway
npx prisma migrate deploy

echo "✅ Test database ready!"
