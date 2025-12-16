-- Azure Advisor Integration Migration
-- Phase 4: Advisor + AI
-- Created: 2025-12-16

-- ============================================================
-- Table: azure_advisor_recommendations
-- Stores Azure Advisor recommendations with caching
-- ============================================================
CREATE TABLE IF NOT EXISTS azure_advisor_recommendations (
  recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  azure_recommendation_id VARCHAR(500) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('Cost', 'Security', 'Reliability', 'Performance', 'OperationalExcellence')),
  impact VARCHAR(20) NOT NULL CHECK (impact IN ('High', 'Medium', 'Low')),
  short_description TEXT NOT NULL,
  long_description TEXT,
  potential_benefits TEXT,
  resource_id VARCHAR(500) NOT NULL,
  resource_type VARCHAR(100),
  resource_group VARCHAR(200),
  region VARCHAR(100),
  potential_savings_amount DECIMAL(10,2),
  potential_savings_currency VARCHAR(10) DEFAULT 'USD',
  potential_savings_period VARCHAR(20),
  remediation_steps JSONB,
  status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Suppressed', 'Dismissed', 'Resolved')),
  suppressed_until TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, azure_recommendation_id)
);

-- Indexes for azure_advisor_recommendations
CREATE INDEX idx_advisor_recs_tenant ON azure_advisor_recommendations(tenant_id);
CREATE INDEX idx_advisor_recs_category ON azure_advisor_recommendations(category);
CREATE INDEX idx_advisor_recs_status ON azure_advisor_recommendations(status);
CREATE INDEX idx_advisor_recs_impact ON azure_advisor_recommendations(impact);
CREATE INDEX idx_advisor_recs_resource_type ON azure_advisor_recommendations(resource_type);
CREATE INDEX idx_advisor_recs_last_updated ON azure_advisor_recommendations(last_updated DESC);
CREATE INDEX idx_advisor_recs_savings ON azure_advisor_recommendations(potential_savings_amount DESC) WHERE potential_savings_amount IS NOT NULL;

-- ============================================================
-- Table: advisor_actions
-- Tracks user actions on recommendations (suppress, dismiss, apply, resolve)
-- ============================================================
CREATE TABLE IF NOT EXISTS advisor_actions (
  action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES azure_advisor_recommendations(recommendation_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id),
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('suppress', 'dismiss', 'apply', 'resolve')),
  duration_days INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for advisor_actions
CREATE INDEX idx_advisor_actions_rec ON advisor_actions(recommendation_id);
CREATE INDEX idx_advisor_actions_user ON advisor_actions(user_id);
CREATE INDEX idx_advisor_actions_type ON advisor_actions(action_type);
CREATE INDEX idx_advisor_actions_created ON advisor_actions(created_at DESC);

-- ============================================================
-- Trigger: Update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_advisor_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_advisor_recs_updated_at
    BEFORE UPDATE ON azure_advisor_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_advisor_recommendations_updated_at();

-- ============================================================
-- Comments for documentation
-- ============================================================
COMMENT ON TABLE azure_advisor_recommendations IS 'Stores Azure Advisor recommendations with caching and tenant isolation';
COMMENT ON TABLE advisor_actions IS 'Tracks user actions on recommendations for audit trail';

COMMENT ON COLUMN azure_advisor_recommendations.category IS 'Recommendation category: Cost, Security, Reliability, Performance, or OperationalExcellence';
COMMENT ON COLUMN azure_advisor_recommendations.impact IS 'Potential impact level: High, Medium, or Low';
COMMENT ON COLUMN azure_advisor_recommendations.status IS 'Current status: Active, Suppressed, Dismissed, or Resolved';
COMMENT ON COLUMN azure_advisor_recommendations.potential_savings_amount IS 'Estimated cost savings (for Cost category recommendations)';
COMMENT ON COLUMN azure_advisor_recommendations.remediation_steps IS 'JSON array of step-by-step remediation instructions';

COMMENT ON COLUMN advisor_actions.action_type IS 'Type of action taken: suppress, dismiss, apply, or resolve';
COMMENT ON COLUMN advisor_actions.duration_days IS 'Duration in days for suppress action (NULL for other actions)';
