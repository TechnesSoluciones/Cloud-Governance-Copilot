-- AddArchitectRecommendedIndexes
--
-- This migration adds compound indexes recommended by the Software Architect
-- to optimize frequently executed queries in the application.
--
-- Performance improvements:
-- 1. assets(tenant_id, resource_type, status): Optimizes asset listing and filtering by type/status
-- 2. security_findings(tenant_id, severity, status): Optimizes security dashboard queries by severity
--
-- These indexes complement existing indexes and are designed to reduce query times
-- for multi-tenant queries that filter by resource type, status, and severity.

-- Add compound index for optimized asset queries
-- Supports queries like: SELECT * FROM assets WHERE tenant_id = ? AND resource_type = ? AND status = ?
CREATE INDEX IF NOT EXISTS "assets_tenant_id_resource_type_status_idx" ON "assets"("tenant_id", "resource_type", "status");

-- Add compound index for optimized security dashboard queries
-- Supports queries like: SELECT * FROM security_findings WHERE tenant_id = ? AND severity = ? AND status = ?
CREATE INDEX IF NOT EXISTS "security_findings_tenant_id_severity_status_idx" ON "security_findings"("tenant_id", "severity", "status");
