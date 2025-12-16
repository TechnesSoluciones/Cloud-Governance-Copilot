-- Azure Service Health and Notifications Tables Migration
-- Created: 2025-12-15
-- Purpose: Add tables for Azure Service Health monitoring and notification system

-- ============================================================
-- Azure Service Health Events Table
-- ============================================================

CREATE TABLE IF NOT EXISTS azure_service_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  account_id VARCHAR(255) NOT NULL,

  -- Event identification
  event_type VARCHAR(50) NOT NULL, -- incident, maintenance, informational, security
  event_id VARCHAR(255) NOT NULL UNIQUE,

  -- Event details
  title VARCHAR(500) NOT NULL,
  description TEXT,
  impact_type VARCHAR(100), -- Incident, Informational, ActionRequired
  status VARCHAR(100) NOT NULL, -- active, resolved, completed, cancelled
  severity VARCHAR(50), -- critical, high, medium, low, informational

  -- Affected resources
  affected_services TEXT[] DEFAULT ARRAY[]::TEXT[],
  affected_regions TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Timing
  impact_start TIMESTAMP WITH TIME ZONE,
  impact_end TIMESTAMP WITH TIME ZONE,
  last_update_time TIMESTAMP WITH TIME ZONE,
  notification_time TIMESTAMP WITH TIME ZONE,

  -- Additional information
  resolution TEXT,
  tracking_id VARCHAR(255),
  is_platform_initiated BOOLEAN DEFAULT FALSE,
  is_hir BOOLEAN DEFAULT FALSE, -- High Impact Region
  requires_action BOOLEAN DEFAULT FALSE,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for azure_service_health
CREATE INDEX idx_service_health_tenant_account ON azure_service_health(tenant_id, account_id);
CREATE INDEX idx_service_health_status ON azure_service_health(status);
CREATE INDEX idx_service_health_event_type ON azure_service_health(event_type);
CREATE INDEX idx_service_health_impact_start ON azure_service_health(impact_start DESC);
CREATE INDEX idx_service_health_severity ON azure_service_health(severity);
CREATE INDEX idx_service_health_event_id ON azure_service_health(event_id);
CREATE INDEX idx_service_health_created_at ON azure_service_health(created_at DESC);

-- GIN index for affected services and regions array search
CREATE INDEX idx_service_health_affected_services ON azure_service_health USING GIN(affected_services);
CREATE INDEX idx_service_health_affected_regions ON azure_service_health USING GIN(affected_regions);

-- GIN index for metadata JSONB search
CREATE INDEX idx_service_health_metadata ON azure_service_health USING GIN(metadata);

-- ============================================================
-- Notifications Table
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,

  -- Notification details
  type VARCHAR(50) NOT NULL, -- service_health, alert, incident, security, cost
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(50) NOT NULL, -- info, warning, critical

  -- Status
  read BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,

  -- Actions
  link VARCHAR(500), -- Link to details page
  action_required BOOLEAN DEFAULT FALSE,
  action_taken BOOLEAN DEFAULT FALSE,
  action_taken_at TIMESTAMP WITH TIME ZONE,

  -- Related entity
  related_entity_type VARCHAR(50), -- service_health_event, asset, security_finding
  related_entity_id UUID,

  -- Delivery
  delivery_method VARCHAR(50)[] DEFAULT ARRAY['in_app']::VARCHAR[], -- in_app, email, webhook
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  webhook_sent BOOLEAN DEFAULT FALSE,
  webhook_sent_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for notifications
CREATE INDEX idx_notifications_tenant_user ON notifications(tenant_id, user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_severity ON notifications(severity);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read_at ON notifications(read_at DESC) WHERE read = TRUE;
CREATE INDEX idx_notifications_archived ON notifications(archived) WHERE archived = FALSE;
CREATE INDEX idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id);

-- GIN index for delivery_method array search
CREATE INDEX idx_notifications_delivery_method ON notifications USING GIN(delivery_method);

-- GIN index for metadata JSONB search
CREATE INDEX idx_notifications_metadata ON notifications USING GIN(metadata);

-- ============================================================
-- Notification Preferences Table
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

  -- Notification settings
  service_health_enabled BOOLEAN DEFAULT TRUE,
  service_health_severity_threshold VARCHAR(50) DEFAULT 'medium', -- critical, high, medium, low, all

  -- Delivery preferences
  email_enabled BOOLEAN DEFAULT TRUE,
  email_address VARCHAR(255),
  email_frequency VARCHAR(50) DEFAULT 'immediate', -- immediate, daily_digest, weekly_digest

  webhook_enabled BOOLEAN DEFAULT FALSE,
  webhook_url VARCHAR(500),
  webhook_secret VARCHAR(255),

  -- Event type preferences
  notify_incidents BOOLEAN DEFAULT TRUE,
  notify_maintenance BOOLEAN DEFAULT TRUE,
  notify_security BOOLEAN DEFAULT TRUE,
  notify_cost_alerts BOOLEAN DEFAULT TRUE,

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_timezone VARCHAR(50) DEFAULT 'UTC',

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Unique constraint: one preference per user per tenant
  UNIQUE(user_id, tenant_id)
);

-- Indexes for notification_preferences
CREATE INDEX idx_notification_prefs_user ON notification_preferences(user_id);
CREATE INDEX idx_notification_prefs_tenant ON notification_preferences(tenant_id);

-- ============================================================
-- Service Health Subscriptions Table (for resource-specific alerts)
-- ============================================================

CREATE TABLE IF NOT EXISTS service_health_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  -- Subscription filters
  account_id VARCHAR(255), -- If null, subscribe to all accounts
  service_name VARCHAR(255), -- Specific Azure service (e.g., 'Microsoft.Compute')
  region VARCHAR(100), -- Specific region (e.g., 'eastus')
  event_types VARCHAR(50)[] DEFAULT ARRAY['incident', 'maintenance']::VARCHAR[],
  min_severity VARCHAR(50) DEFAULT 'medium',

  -- Status
  active BOOLEAN DEFAULT TRUE,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for service_health_subscriptions
CREATE INDEX idx_service_health_subs_tenant_user ON service_health_subscriptions(tenant_id, user_id);
CREATE INDEX idx_service_health_subs_active ON service_health_subscriptions(active) WHERE active = TRUE;
CREATE INDEX idx_service_health_subs_account ON service_health_subscriptions(account_id);
CREATE INDEX idx_service_health_subs_service ON service_health_subscriptions(service_name);
CREATE INDEX idx_service_health_subs_region ON service_health_subscriptions(region);

-- GIN index for event_types array search
CREATE INDEX idx_service_health_subs_event_types ON service_health_subscriptions USING GIN(event_types);

-- ============================================================
-- Triggers for updated_at columns
-- ============================================================

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to azure_service_health
DROP TRIGGER IF EXISTS update_azure_service_health_updated_at ON azure_service_health;
CREATE TRIGGER update_azure_service_health_updated_at
  BEFORE UPDATE ON azure_service_health
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to notifications
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to notification_preferences
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to service_health_subscriptions
DROP TRIGGER IF EXISTS update_service_health_subscriptions_updated_at ON service_health_subscriptions;
CREATE TRIGGER update_service_health_subscriptions_updated_at
  BEFORE UPDATE ON service_health_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Comments for documentation
-- ============================================================

COMMENT ON TABLE azure_service_health IS 'Stores Azure Service Health events, incidents, and planned maintenance';
COMMENT ON TABLE notifications IS 'User notifications for service health, security, and cost events';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification delivery and filtering';
COMMENT ON TABLE service_health_subscriptions IS 'User subscriptions to specific service health events';

COMMENT ON COLUMN azure_service_health.event_type IS 'Type of health event: incident, maintenance, informational, security';
COMMENT ON COLUMN azure_service_health.impact_type IS 'Azure impact classification: Incident, Informational, ActionRequired';
COMMENT ON COLUMN azure_service_health.is_hir IS 'High Impact Region flag from Azure';
COMMENT ON COLUMN notifications.related_entity_type IS 'Type of related entity: service_health_event, asset, security_finding';
COMMENT ON COLUMN notification_preferences.email_frequency IS 'Email delivery frequency: immediate, daily_digest, weekly_digest';
