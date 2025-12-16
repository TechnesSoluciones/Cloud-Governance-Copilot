-- Migration: Enhanced Asset Discovery and Management
-- Description: Adds advanced asset management fields for discovery, cost allocation, and tagging
-- Created: 2025-12-15

-- Step 1: Add new columns to assets table
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS last_discovered TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_orphaned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cost_last_30_days DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS owner_tag VARCHAR(255),
  ADD COLUMN IF NOT EXISTS environment_tag VARCHAR(50),
  ADD COLUMN IF NOT EXISTS project_tag VARCHAR(255);

-- Step 2: Create performance indexes for enhanced asset queries
CREATE INDEX IF NOT EXISTS idx_assets_orphaned
  ON assets(tenant_id, is_orphaned)
  WHERE is_orphaned = TRUE;

CREATE INDEX IF NOT EXISTS idx_assets_owner_tag
  ON assets(tenant_id, owner_tag);

CREATE INDEX IF NOT EXISTS idx_assets_environment_tag
  ON assets(tenant_id, environment_tag);

CREATE INDEX IF NOT EXISTS idx_assets_project_tag
  ON assets(tenant_id, project_tag);

CREATE INDEX IF NOT EXISTS idx_assets_last_discovered
  ON assets(last_discovered);

-- Step 3: Create GIN index for tags JSON column (for efficient tag searching)
CREATE INDEX IF NOT EXISTS idx_assets_tags_gin
  ON assets USING GIN(tags);

-- Step 4: Create materialized view for asset summary statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS assets_summary AS
SELECT
  tenant_id,
  provider,
  resource_type,
  region,
  environment_tag,
  COUNT(*) as resource_count,
  SUM(cost_last_30_days) as total_cost,
  COUNT(*) FILTER (WHERE is_orphaned = TRUE) as orphaned_count,
  COUNT(*) FILTER (WHERE status = 'running') as running_count,
  COUNT(*) FILTER (WHERE status = 'stopped') as stopped_count,
  MAX(last_discovered) as last_discovery_time
FROM assets
WHERE deleted_at IS NULL
GROUP BY tenant_id, provider, resource_type, region, environment_tag;

-- Create unique index on materialized view for refresh performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_summary_unique
  ON assets_summary(
    tenant_id,
    provider,
    resource_type,
    region,
    COALESCE(environment_tag, '')
  );

-- Step 5: Create function to refresh assets summary
CREATE OR REPLACE FUNCTION refresh_assets_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY assets_summary;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Add comments for documentation
COMMENT ON COLUMN assets.last_discovered IS 'Timestamp of last successful discovery scan';
COMMENT ON COLUMN assets.is_orphaned IS 'Flag indicating resource is orphaned (no owner tag or stopped without tags)';
COMMENT ON COLUMN assets.cost_last_30_days IS 'Total cost for this resource in the last 30 days';
COMMENT ON COLUMN assets.owner_tag IS 'Extracted owner from tags for quick filtering';
COMMENT ON COLUMN assets.environment_tag IS 'Extracted environment from tags (prod, dev, staging, etc)';
COMMENT ON COLUMN assets.project_tag IS 'Extracted project identifier from tags';

-- Step 7: Update existing records with extracted tag values (backfill)
UPDATE assets
SET
  owner_tag = tags->>'owner',
  environment_tag = tags->>'environment',
  project_tag = tags->>'project',
  last_discovered = last_seen_at
WHERE tags IS NOT NULL AND tags::text != '{}';

-- Step 8: Mark orphaned resources (resources with no owner tag and stopped/terminated)
UPDATE assets
SET is_orphaned = TRUE
WHERE (
  owner_tag IS NULL
  OR owner_tag = ''
) AND (
  status IN ('stopped', 'terminated', 'deallocated')
  OR deleted_at IS NOT NULL
);

-- Step 9: Initial refresh of materialized view
REFRESH MATERIALIZED VIEW assets_summary;
