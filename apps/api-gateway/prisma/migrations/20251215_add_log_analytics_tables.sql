-- Migration: Add Log Analytics and Alert Rule Templates tables
-- Created: 2025-12-15
-- Description: Adds tables for storing saved KQL queries and alert rule templates

-- ============================================================
-- Log Analytics Queries
-- ============================================================
CREATE TABLE IF NOT EXISTS log_analytics_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  account_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  query TEXT NOT NULL,
  description TEXT,
  created_by VARCHAR(255),
  last_executed TIMESTAMP WITH TIME ZONE,
  execution_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_log_queries_tenant_account ON log_analytics_queries(tenant_id, account_id);
CREATE INDEX idx_log_queries_name ON log_analytics_queries(tenant_id, name);
CREATE INDEX idx_log_queries_last_executed ON log_analytics_queries(last_executed DESC);

-- Unique constraint for query name per tenant/account
CREATE UNIQUE INDEX idx_log_queries_unique_name ON log_analytics_queries(tenant_id, account_id, name);

-- ============================================================
-- Alert Rule Templates (Optional - can be JSON in code)
-- ============================================================
CREATE TABLE IF NOT EXISTS alert_rule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(100), -- performance, cost, security, availability
  config JSONB NOT NULL,
  provider VARCHAR(50) DEFAULT 'azure', -- azure, aws, gcp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for templates
CREATE INDEX idx_alert_templates_category ON alert_rule_templates(category);
CREATE INDEX idx_alert_templates_provider ON alert_rule_templates(provider);

-- ============================================================
-- Seed Data: Pre-built Alert Rule Templates
-- ============================================================
INSERT INTO alert_rule_templates (name, description, category, provider, config) VALUES
(
  'High CPU Usage',
  'Alert when CPU usage exceeds 80% for 15 minutes',
  'performance',
  'azure',
  '{
    "name": "High CPU Alert",
    "enabled": true,
    "severity": 2,
    "condition": {
      "type": "metric",
      "metricName": "Percentage CPU",
      "metricNamespace": "Microsoft.Compute/virtualMachines",
      "operator": "GreaterThan",
      "threshold": 80,
      "aggregation": "Average"
    },
    "evaluationFrequency": "PT5M",
    "windowSize": "PT15M",
    "autoMitigate": true
  }'::jsonb
),
(
  'High Memory Usage',
  'Alert when available memory is less than 10% for 10 minutes',
  'performance',
  'azure',
  '{
    "name": "High Memory Alert",
    "enabled": true,
    "severity": 2,
    "condition": {
      "type": "metric",
      "metricName": "Available Memory Bytes",
      "metricNamespace": "Microsoft.Compute/virtualMachines",
      "operator": "LessThan",
      "threshold": 1073741824,
      "aggregation": "Average"
    },
    "evaluationFrequency": "PT5M",
    "windowSize": "PT10M",
    "autoMitigate": true
  }'::jsonb
),
(
  'Low Disk Space',
  'Alert when disk space is less than 10%',
  'performance',
  'azure',
  '{
    "name": "Low Disk Space Alert",
    "enabled": true,
    "severity": 1,
    "condition": {
      "type": "metric",
      "metricName": "OS Disk Queue Depth",
      "metricNamespace": "Microsoft.Compute/virtualMachines",
      "operator": "GreaterThan",
      "threshold": 10,
      "aggregation": "Average"
    },
    "evaluationFrequency": "PT5M",
    "windowSize": "PT15M",
    "autoMitigate": true
  }'::jsonb
),
(
  'Cost Threshold Exceeded',
  'Alert when monthly cost exceeds specified amount',
  'cost',
  'azure',
  '{
    "name": "Cost Alert",
    "enabled": true,
    "severity": 1,
    "condition": {
      "type": "log",
      "query": "AzureActivity\\n| where OperationNameValue contains \\"Microsoft.Consumption/budgets\\"\\n| where ActivityStatusValue == \\"Success\\""
    },
    "evaluationFrequency": "PT1H",
    "windowSize": "PT6H",
    "autoMitigate": false
  }'::jsonb
),
(
  'Multiple Failed Login Attempts',
  'Alert when more than 5 failed login attempts detected',
  'security',
  'azure',
  '{
    "name": "Failed Login Alert",
    "enabled": true,
    "severity": 0,
    "condition": {
      "type": "log",
      "query": "SecurityEvent\\n| where EventID == 4625\\n| where TimeGenerated > ago(15m)\\n| summarize FailedAttempts = count() by Account\\n| where FailedAttempts > 5"
    },
    "evaluationFrequency": "PT5M",
    "windowSize": "PT15M",
    "autoMitigate": false
  }'::jsonb
),
(
  'Virtual Machine Unavailable',
  'Alert when VM becomes unavailable',
  'availability',
  'azure',
  '{
    "name": "VM Availability Alert",
    "enabled": true,
    "severity": 0,
    "condition": {
      "type": "metric",
      "metricName": "VmAvailabilityMetric",
      "metricNamespace": "Microsoft.Compute/virtualMachines",
      "operator": "LessThan",
      "threshold": 1,
      "aggregation": "Average"
    },
    "evaluationFrequency": "PT1M",
    "windowSize": "PT5M",
    "autoMitigate": true
  }'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE log_analytics_queries IS 'Stores saved KQL queries for reuse and tracking';
COMMENT ON TABLE alert_rule_templates IS 'Pre-built alert rule templates for common scenarios';

COMMENT ON COLUMN log_analytics_queries.query IS 'KQL (Kusto Query Language) query string';
COMMENT ON COLUMN log_analytics_queries.execution_count IS 'Number of times this query has been executed';
COMMENT ON COLUMN alert_rule_templates.config IS 'JSONB configuration for alert rule';
