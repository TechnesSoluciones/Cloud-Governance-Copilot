# Incident Management Migration

**Migration ID:** 20251215_incident_management
**Date:** December 15, 2025
**Type:** Schema Addition & Table Creation

## Overview

This migration adds comprehensive incident management capabilities to the Cloud Governance Copilot platform. It creates the necessary database schema for tracking Azure Monitor alerts, activity logs, incidents, and comments.

## What This Migration Does

### 1. Creates New Tables

#### `azure_alerts`
Stores Azure Monitor alerts for incident tracking and correlation.

**Columns:**
- `id` (UUID) - Primary key
- `tenant_id` (UUID) - Foreign key to tenants table
- `account_id` (VARCHAR) - Azure account identifier
- `alert_id` (VARCHAR) - Unique Azure alert ID
- `alert_name` (VARCHAR) - Alert name
- `severity` (VARCHAR) - critical, high, medium, low
- `status` (VARCHAR) - active, resolved, suppressed
- `resource_id` (VARCHAR) - Azure resource ID
- `resource_type` (VARCHAR) - Resource type
- `description` (TEXT) - Alert description
- `fired_at` (TIMESTAMPTZ) - When alert fired
- `resolved_at` (TIMESTAMPTZ) - When alert resolved
- `metadata` (JSONB) - Additional alert metadata
- `created_at` (TIMESTAMPTZ) - Record creation time

**Indexes:**
- `idx_alerts_tenant_account` - (tenant_id, account_id)
- `idx_alerts_severity` - (severity)
- `idx_alerts_status` - (status)
- `idx_alerts_fired_at` - (fired_at DESC)
- `idx_alerts_resource_id` - (resource_id)
- `idx_alerts_resource_type` - (resource_type)

#### `azure_activity_logs`
Stores Azure Activity Logs for correlation with incidents.

**Columns:**
- `id` (UUID) - Primary key
- `tenant_id` (UUID) - Foreign key to tenants table
- `account_id` (VARCHAR) - Azure account identifier
- `operation_name` (VARCHAR) - Azure operation name
- `operation_id` (VARCHAR) - Operation identifier
- `status` (VARCHAR) - Succeeded, Failed, InProgress, Canceled
- `caller` (VARCHAR) - User or service principal
- `resource_id` (VARCHAR) - Azure resource ID
- `resource_type` (VARCHAR) - Resource type
- `event_timestamp` (TIMESTAMPTZ) - When event occurred
- `level` (VARCHAR) - Critical, Error, Warning, Informational, Verbose
- `description` (TEXT) - Event description
- `metadata` (JSONB) - Additional properties
- `created_at` (TIMESTAMPTZ) - Record creation time

**Indexes:**
- `idx_activity_logs_tenant_account` - (tenant_id, account_id)
- `idx_activity_logs_timestamp` - (event_timestamp DESC)
- `idx_activity_logs_status` - (status)
- `idx_activity_logs_level` - (level)
- `idx_activity_logs_operation` - (operation_name)
- `idx_activity_logs_resource_id` - (resource_id)

#### `incident_comments`
Stores comments and notes for incidents.

**Columns:**
- `id` (UUID) - Primary key
- `incident_id` (UUID) - Foreign key to incidents table
- `user_id` (VARCHAR) - User who created comment
- `comment` (TEXT) - Comment text
- `created_at` (TIMESTAMPTZ) - Comment creation time

**Indexes:**
- `idx_incident_comments_incident` - (incident_id)
- `idx_incident_comments_user` - (user_id)
- `idx_incident_comments_created` - (created_at DESC)

### 2. Updates Existing Tables

#### `incidents` table
Adds new columns for enhanced incident management:

- `account_id` (VARCHAR) - Azure account identifier
- `affected_resources` (TEXT[]) - Array of resource IDs
- `alert_ids` (TEXT[]) - Array of alert IDs
- `acknowledged_at` (TIMESTAMPTZ) - When incident was acknowledged
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

Updates constraints:
- `status` - Adds new statuses: acknowledged, investigating
- `severity` - Standardizes to: critical, high, medium, low

Adds new indexes:
- `idx_incidents_tenant_account` - (tenant_id, account_id)
- `idx_incidents_account_status` - (account_id, status)

### 3. Adds Documentation

Adds PostgreSQL comments for all tables and important columns to improve schema documentation.

## How to Apply This Migration

### Method 1: Using Prisma (Recommended)

```bash
# Navigate to api-gateway directory
cd apps/api-gateway

# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://user:password@localhost:5432/copilot_db"

# Apply migration
npx prisma db push
```

### Method 2: Using the Migration Script

```bash
# Navigate to migrations directory
cd apps/api-gateway/prisma/migrations

# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://user:password@localhost:5432/copilot_db"

# Make script executable (if not already)
chmod +x apply-incident-management.sh

# Run migration script
./apply-incident-management.sh
```

### Method 3: Manual SQL Execution

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://user:password@localhost:5432/copilot_db"

# Apply migration directly
psql "$DATABASE_URL" -f 20251215_incident_management/migration.sql
```

## Verification

After applying the migration, verify the schema:

### Check Tables

```sql
-- List all tables
\dt

-- Verify azure_alerts table
\d azure_alerts

-- Verify azure_activity_logs table
\d azure_activity_logs

-- Verify incident_comments table
\d incident_comments

-- Verify incidents table updates
\d incidents
```

### Check Indexes

```sql
-- List all indexes
\di

-- Check alert indexes
\di idx_alerts_*

-- Check activity log indexes
\di idx_activity_logs_*

-- Check incident indexes
\di idx_incident*
```

### Test Queries

```sql
-- Test alert insertion
INSERT INTO azure_alerts (
  tenant_id, account_id, alert_id, alert_name, severity, status, description, fired_at
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000'::uuid,
  'azure-account-1',
  'alert-12345',
  'High CPU Usage',
  'high',
  'active',
  'CPU usage above 90%',
  NOW()
);

-- Verify insertion
SELECT * FROM azure_alerts WHERE alert_id = 'alert-12345';

-- Clean up test data
DELETE FROM azure_alerts WHERE alert_id = 'alert-12345';
```

## Rollback

If you need to rollback this migration:

```sql
-- Drop new tables
DROP TABLE IF EXISTS incident_comments CASCADE;
DROP TABLE IF EXISTS azure_activity_logs CASCADE;
DROP TABLE IF EXISTS azure_alerts CASCADE;

-- Remove added columns from incidents table
ALTER TABLE incidents DROP COLUMN IF EXISTS account_id;
ALTER TABLE incidents DROP COLUMN IF EXISTS affected_resources;
ALTER TABLE incidents DROP COLUMN IF EXISTS alert_ids;
ALTER TABLE incidents DROP COLUMN IF EXISTS acknowledged_at;
ALTER TABLE incidents DROP COLUMN IF EXISTS updated_at;

-- Drop added indexes
DROP INDEX IF EXISTS idx_incidents_tenant_account;
DROP INDEX IF EXISTS idx_incidents_account_status;
```

## Performance Considerations

### Index Usage

This migration creates several indexes to optimize common queries:

1. **Tenant + Account queries**: Most queries filter by tenant and account
2. **Time-based queries**: Activity logs and alerts are frequently queried by time
3. **Status filtering**: Incidents and alerts are often filtered by status
4. **Resource correlation**: Resource IDs are used to correlate alerts and logs

### Expected Storage

Estimate storage requirements based on your environment:

- **azure_alerts**: ~500 bytes per row
- **azure_activity_logs**: ~600 bytes per row
- **incident_comments**: ~200 bytes per row
- **Indexes**: ~30% overhead on table size

Example for 1 year of data (1000 alerts/day):
- Alerts: 365,000 rows × 500 bytes = ~175 MB
- Indexes: ~50 MB
- Total: ~225 MB

## Dependencies

### Required Tables

This migration depends on the following existing tables:
- `tenants` - For tenant_id foreign key
- `incidents` - Updates existing table

### Required Permissions

The database user must have the following permissions:
- `CREATE TABLE`
- `CREATE INDEX`
- `ALTER TABLE`
- `INSERT`
- `SELECT`
- `UPDATE`
- `DELETE`

## Testing

After applying the migration, test the following:

1. **Alert Management**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3010/api/v1/incidents/alerts?accountId=test-account&severity=critical"
   ```

2. **Activity Logs**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3010/api/v1/incidents/activity-logs?accountId=test-account&startDate=2025-12-01T00:00:00Z&endDate=2025-12-15T23:59:59Z"
   ```

3. **Incidents**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3010/api/v1/incidents?accountId=test-account&status=new"
   ```

## Support

For issues or questions:
- Review the migration SQL file: `migration.sql`
- Check API documentation: `/docs/INCIDENT_MANAGEMENT_API.md`
- Review service implementation: `/src/modules/incidents/`

## Changelog

### Version 1.0 (2025-12-15)
- Initial implementation
- Created azure_alerts, azure_activity_logs, incident_comments tables
- Updated incidents table with new columns
- Added comprehensive indexes
- Added table and column documentation

---

**Author:** Cloud Governance Copilot Team
**Last Updated:** December 16, 2025
