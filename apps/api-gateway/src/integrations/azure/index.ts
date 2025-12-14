/**
 * Azure Integration Services
 *
 * Barrel export file for all Azure integration services
 */

export { AzureComputeService } from './compute.service';
export { AzureCostManagementService } from './cost-management.service';
export { AzureSecurityScannerService } from './security-scanner.service';
export type { SecurityFinding, Severity, SecurityCategory, AzureResourceType } from './security-scanner.service';

// Future exports:
// export { AzureStorageService } from './storage.service';
// export { AzureSQLService } from './sql.service';
// export { AzureSecurityCenterService } from './security-center.service';
