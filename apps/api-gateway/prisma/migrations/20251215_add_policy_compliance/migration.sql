-- CreateTable: azure_policy_compliance
-- Purpose: Cache Azure Policy compliance results for faster queries and historical tracking
--
-- This table stores policy compliance evaluation results from Azure Policy.
-- It supports multi-tenant architecture and provides indexed access for common queries.

CREATE TABLE IF NOT EXISTS azure_policy_compliance (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant relationship (multi-tenant support)
  tenant_id UUID NOT NULL,

  -- Azure account information
  account_id VARCHAR(255) NOT NULL,

  -- Policy information
  policy_id VARCHAR(500) NOT NULL,
  policy_name VARCHAR(500),
  policy_category VARCHAR(100),
  policy_type VARCHAR(50), -- BuiltIn, Custom, Static

  -- Compliance state
  compliance_state VARCHAR(50) NOT NULL, -- Compliant, NonCompliant, Conflict, Exempt

  -- Resource information
  resource_id VARCHAR(500),
  resource_name VARCHAR(255),
  resource_type VARCHAR(255),
  resource_location VARCHAR(100),
  resource_group VARCHAR(255),

  -- Severity and priority
  severity VARCHAR(20), -- critical, high, medium, low

  -- Evaluation metadata
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Additional metadata (flexible JSON for future extensibility)
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common query patterns

-- Tenant-based queries (most common access pattern)
CREATE INDEX IF NOT EXISTS idx_policy_compliance_tenant
  ON azure_policy_compliance(tenant_id);

-- Account-based queries
CREATE INDEX IF NOT EXISTS idx_policy_compliance_account
  ON azure_policy_compliance(account_id);

-- Compliance state queries (filter non-compliant resources)
CREATE INDEX IF NOT EXISTS idx_policy_compliance_state
  ON azure_policy_compliance(compliance_state);

-- Policy-based queries (view all resources affected by a specific policy)
CREATE INDEX IF NOT EXISTS idx_policy_compliance_policy
  ON azure_policy_compliance(policy_id);

-- Resource-based queries (view all policies affecting a specific resource)
CREATE INDEX IF NOT EXISTS idx_policy_compliance_resource
  ON azure_policy_compliance(resource_id);

-- Severity-based queries (prioritize critical violations)
CREATE INDEX IF NOT EXISTS idx_policy_compliance_severity
  ON azure_policy_compliance(severity);

-- Time-based queries (track compliance over time)
CREATE INDEX IF NOT EXISTS idx_policy_compliance_evaluated_at
  ON azure_policy_compliance(evaluated_at DESC);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_policy_compliance_tenant_account_state
  ON azure_policy_compliance(tenant_id, account_id, compliance_state);

-- Composite index for policy category analysis
CREATE INDEX IF NOT EXISTS idx_policy_compliance_category_state
  ON azure_policy_compliance(policy_category, compliance_state);

-- GIN index for JSONB metadata queries (if needed for advanced filtering)
CREATE INDEX IF NOT EXISTS idx_policy_compliance_metadata
  ON azure_policy_compliance USING GIN (metadata);

-- Add comment to table
COMMENT ON TABLE azure_policy_compliance IS 'Stores Azure Policy compliance evaluation results with multi-tenant support';

-- Add comments to key columns
COMMENT ON COLUMN azure_policy_compliance.tenant_id IS 'Multi-tenant identifier - references tenants table';
COMMENT ON COLUMN azure_policy_compliance.compliance_state IS 'Policy compliance state: Compliant, NonCompliant, Conflict, Exempt';
COMMENT ON COLUMN azure_policy_compliance.severity IS 'Violation severity: critical, high, medium, low';
COMMENT ON COLUMN azure_policy_compliance.metadata IS 'Flexible JSON storage for additional policy evaluation details';
