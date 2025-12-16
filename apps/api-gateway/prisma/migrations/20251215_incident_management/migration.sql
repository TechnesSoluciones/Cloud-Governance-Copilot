-- CreateTable: Azure Alerts
-- Stores alerts from Azure Monitor for incident tracking
CREATE TABLE IF NOT EXISTS azure_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  account_id VARCHAR(255) NOT NULL,
  alert_id VARCHAR(500) NOT NULL UNIQUE,
  alert_name VARCHAR(500) NOT NULL,
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'resolved', 'suppressed')),
  resource_id VARCHAR(500),
  resource_type VARCHAR(255),
  description TEXT,
  fired_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable: Azure Activity Logs
-- Stores Azure Activity Logs for correlation with incidents
CREATE TABLE IF NOT EXISTS azure_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  account_id VARCHAR(255) NOT NULL,
  operation_name VARCHAR(500),
  operation_id VARCHAR(255),
  status VARCHAR(100) CHECK (status IN ('Succeeded', 'Failed', 'InProgress', 'Canceled')),
  caller VARCHAR(255),
  resource_id VARCHAR(500),
  resource_type VARCHAR(255),
  event_timestamp TIMESTAMP WITH TIME ZONE,
  level VARCHAR(50) CHECK (level IN ('Critical', 'Error', 'Warning', 'Informational', 'Verbose')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable: Incident Comments
-- Stores comments and notes for incidents
CREATE TABLE IF NOT EXISTS incident_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Update existing incidents table to add new fields
-- Add account_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incidents' AND column_name = 'account_id'
  ) THEN
    ALTER TABLE incidents ADD COLUMN account_id VARCHAR(255);
  END IF;
END $$;

-- Add new columns for enhanced incident management
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incidents' AND column_name = 'affected_resources'
  ) THEN
    ALTER TABLE incidents ADD COLUMN affected_resources TEXT[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incidents' AND column_name = 'alert_ids'
  ) THEN
    ALTER TABLE incidents ADD COLUMN alert_ids TEXT[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incidents' AND column_name = 'acknowledged_at'
  ) THEN
    ALTER TABLE incidents ADD COLUMN acknowledged_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'incidents' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE incidents ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Update incidents table status constraint to include new statuses
DO $$
BEGIN
  ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;
  ALTER TABLE incidents ADD CONSTRAINT incidents_status_check
    CHECK (status IN ('new', 'acknowledged', 'investigating', 'resolved', 'closed', 'open'));
END $$;

-- Update incidents table severity constraint
DO $$
BEGIN
  ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_severity_check;
  ALTER TABLE incidents ADD CONSTRAINT incidents_severity_check
    CHECK (severity IN ('critical', 'high', 'medium', 'low'));
END $$;

-- CreateIndex: Azure Alerts Indexes
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_account ON azure_alerts(tenant_id, account_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON azure_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON azure_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_fired_at ON azure_alerts(fired_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_resource_id ON azure_alerts(resource_id);
CREATE INDEX IF NOT EXISTS idx_alerts_resource_type ON azure_alerts(resource_type);

-- CreateIndex: Azure Activity Logs Indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_account ON azure_activity_logs(tenant_id, account_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON azure_activity_logs(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_status ON azure_activity_logs(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_level ON azure_activity_logs(level);
CREATE INDEX IF NOT EXISTS idx_activity_logs_operation ON azure_activity_logs(operation_name);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_id ON azure_activity_logs(resource_id);

-- CreateIndex: Enhanced Incident Indexes
CREATE INDEX IF NOT EXISTS idx_incidents_tenant_account ON incidents(tenant_id, account_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX IF NOT EXISTS idx_incidents_account_status ON incidents(account_id, status);

-- CreateIndex: Incident Comments Indexes
CREATE INDEX IF NOT EXISTS idx_incident_comments_incident ON incident_comments(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_comments_user ON incident_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_incident_comments_created ON incident_comments(created_at DESC);

-- Add foreign key constraint for incident_comments
ALTER TABLE incident_comments
  DROP CONSTRAINT IF EXISTS fk_incident_comments_incident;

ALTER TABLE incident_comments
  ADD CONSTRAINT fk_incident_comments_incident
  FOREIGN KEY (incident_id) REFERENCES incidents(incident_id) ON DELETE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE azure_alerts IS 'Azure Monitor alerts for incident tracking and correlation';
COMMENT ON TABLE azure_activity_logs IS 'Azure Activity Logs for operational insights and incident correlation';
COMMENT ON TABLE incident_comments IS 'Comments and notes for incidents';

COMMENT ON COLUMN azure_alerts.severity IS 'Alert severity: critical, high, medium, low';
COMMENT ON COLUMN azure_alerts.status IS 'Alert status: active, resolved, suppressed';
COMMENT ON COLUMN azure_alerts.metadata IS 'Additional alert metadata in JSON format';

COMMENT ON COLUMN azure_activity_logs.level IS 'Log level: Critical, Error, Warning, Informational, Verbose';
COMMENT ON COLUMN azure_activity_logs.status IS 'Operation status: Succeeded, Failed, InProgress, Canceled';
COMMENT ON COLUMN azure_activity_logs.metadata IS 'Additional log properties in JSON format';

COMMENT ON COLUMN incidents.affected_resources IS 'Array of Azure resource IDs affected by this incident';
COMMENT ON COLUMN incidents.alert_ids IS 'Array of alert IDs that triggered this incident';
COMMENT ON COLUMN incidents.acknowledged_at IS 'Timestamp when incident was acknowledged';
COMMENT ON COLUMN incidents.updated_at IS 'Last update timestamp for incident';
