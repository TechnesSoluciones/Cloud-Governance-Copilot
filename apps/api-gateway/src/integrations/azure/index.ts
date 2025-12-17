/**
 * Azure Integration Services
 *
 * Barrel export file for all Azure integration services
 */

export { AzureComputeService } from './compute.service';
export { AzureCostManagementService } from './cost-management.service';
// Temporarily disabled - Azure SDK dependencies missing:
// export { AzureSecurityScannerService } from './security-scanner.service';
// export { AzureSecurityCenterService } from './security-center.service';
// export { AzureResourceGraphService } from './resource-graph.service';
// export { AzurePolicyService } from './policy.service';
// export { AzureAdvisorService } from './advisor.service';
// export { AzureMonitorService } from './monitor.service';
// export { AzureServiceHealthService } from './service-health.service';

// Temporarily disabled - Azure SDK dependencies missing:
// export type { SecurityFinding, Severity, SecurityCategory, AzureResourceType } from './security-scanner.service';
// export type {
//   ComplianceResult,
//   PolicyAssignmentResult,
//   NonCompliantResource,
//   PolicyDefinitionResult,
//   PolicyEvaluationResult,
// } from './policy.service';
// export type {
//   ServiceHealthStatus,
//   ServiceStatus,
//   ServiceIssue,
//   MaintenanceEvent,
//   HealthEvent,
//   ResourceHealth,
// } from './service-health.service';

// Future exports:
// export { AzureStorageService } from './storage.service';
// export { AzureSQLService } from './sql.service';
