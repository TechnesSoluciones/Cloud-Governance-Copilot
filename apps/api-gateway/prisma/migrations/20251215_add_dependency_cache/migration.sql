-- Migration: Add dependency cache table
-- Created: 2025-12-15
-- Description: Create table for caching resource dependency graphs to improve query performance

-- Create dependency cache table
CREATE TABLE IF NOT EXISTS azure_dependency_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  resource_id VARCHAR(500),
  resource_group_id VARCHAR(500),
  graph_type VARCHAR(50) NOT NULL CHECK (graph_type IN ('resource', 'resource_group', 'account')),
  graph_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_dependency_cache_tenant ON azure_dependency_cache(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dependency_cache_account ON azure_dependency_cache(account_id);
CREATE INDEX IF NOT EXISTS idx_dependency_cache_resource ON azure_dependency_cache(resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dependency_cache_resource_group ON azure_dependency_cache(resource_group_id) WHERE resource_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dependency_cache_graph_type ON azure_dependency_cache(graph_type);
CREATE INDEX IF NOT EXISTS idx_dependency_cache_expires ON azure_dependency_cache(expires_at);

-- Create composite index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dependency_cache_lookup ON azure_dependency_cache(tenant_id, account_id, graph_type, expires_at);

-- Add comment to table
COMMENT ON TABLE azure_dependency_cache IS 'Caches resource dependency graphs to improve query performance and reduce Azure Resource Graph API calls';

-- Add comments to columns
COMMENT ON COLUMN azure_dependency_cache.id IS 'Unique identifier for cache entry';
COMMENT ON COLUMN azure_dependency_cache.tenant_id IS 'Tenant ID owning this cache entry';
COMMENT ON COLUMN azure_dependency_cache.account_id IS 'Azure subscription ID';
COMMENT ON COLUMN azure_dependency_cache.resource_id IS 'Azure resource ID for resource-specific graphs';
COMMENT ON COLUMN azure_dependency_cache.resource_group_id IS 'Resource Group ID for resource group graphs';
COMMENT ON COLUMN azure_dependency_cache.graph_type IS 'Type of dependency graph (resource, resource_group, account)';
COMMENT ON COLUMN azure_dependency_cache.graph_data IS 'JSON data containing the dependency graph';
COMMENT ON COLUMN azure_dependency_cache.created_at IS 'Timestamp when cache entry was created';
COMMENT ON COLUMN azure_dependency_cache.expires_at IS 'Timestamp when cache entry expires (default 10 minutes)';
COMMENT ON COLUMN azure_dependency_cache.updated_at IS 'Timestamp when cache entry was last updated';

-- Create function to auto-delete expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_dependency_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM azure_dependency_cache
  WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job to cleanup expired entries (requires pg_cron extension)
-- Note: This is optional and requires the pg_cron extension to be installed
-- If pg_cron is not available, cleanup can be done via application logic
-- SELECT cron.schedule('cleanup-dependency-cache', '*/5 * * * *', 'SELECT cleanup_expired_dependency_cache()');

COMMENT ON FUNCTION cleanup_expired_dependency_cache IS 'Deletes expired dependency cache entries';
