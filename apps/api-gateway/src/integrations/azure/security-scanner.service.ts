/**
 * Azure Security Scanner Service
 *
 * Performs security compliance checks on Azure resources based on CIS benchmarks.
 * Scans Storage Accounts, Network Security Groups, and other resources for security
 * vulnerabilities and misconfigurations.
 *
 * Features:
 * - Storage Account security checks (public access, HTTPS enforcement, encryption)
 * - Network Security Group (NSG) rules analysis for unrestricted access
 * - Resource encryption validation
 * - CIS Azure Benchmark compliance verification
 * - Parallel scan execution for optimal performance
 * - Comprehensive error handling with graceful permission failures
 *
 * CIS Benchmarks Covered:
 * - Storage.1: Storage accounts should not allow public blob access (CIS 3.1)
 * - Storage.2: Storage accounts should require secure transfer/HTTPS only (CIS 3.8)
 * - Network.1: NSGs should not allow unrestricted access to high-risk ports (CIS 6.1)
 *
 * @module integrations/azure/security-scanner.service
 */

import { StorageManagementClient } from '@azure/arm-storage';
import { NetworkManagementClient } from '@azure/arm-network';
import { DefaultAzureCredential, ClientSecretCredential, TokenCredential } from '@azure/identity';
import { logger } from '../../utils/logger';

/**
 * Security Finding Severity Levels
 */
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Security Finding Category Types
 */
export type SecurityCategory = 'DATA_PROTECTION' | 'NETWORK' | 'ENCRYPTION' | 'ACCESS_CONTROL';

/**
 * Azure Resource Types
 */
export type AzureResourceType = 'STORAGE_ACCOUNT' | 'NSG' | 'VIRTUAL_MACHINE' | 'SQL_DATABASE';

/**
 * Security Finding Interface
 *
 * Represents a security vulnerability or misconfiguration found during scanning.
 */
export interface SecurityFinding {
  resourceId: string; // Azure Resource ID
  resourceType: AzureResourceType;
  category: SecurityCategory;
  severity: Severity;
  title: string;
  description: string;
  remediation: string;
  cisReference?: string; // CIS Azure Benchmark reference
  region: string; // Azure location
  metadata: Record<string, any>;
}

/**
 * Azure Security Scanner Configuration
 */
export interface AzureSecurityScannerConfig {
  credentials: TokenCredential;
  subscriptionId: string;
}

/**
 * Critical Ports that should not be exposed to the internet
 */
const CRITICAL_PORTS = {
  SSH: 22,
  RDP: 3389,
  MYSQL: 3306,
  POSTGRESQL: 5432,
  MSSQL: 1433,
  MONGODB: 27017,
  REDIS: 6379,
} as const;

/**
 * Azure Security Scanner Service
 *
 * Scans Azure resources for security vulnerabilities and compliance issues.
 * Implements CIS Azure Benchmark checks across Storage Accounts, NSGs, and other resources.
 *
 * @example
 * ```typescript
 * const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
 * const scanner = new AzureSecurityScannerService({
 *   credentials: credential,
 *   subscriptionId: 'your-subscription-id'
 * });
 *
 * // Scan all resources
 * const findings = await scanner.scanAll();
 *
 * // Scan specific resource types
 * const storageFindings = await scanner.scanStorageAccounts();
 * const nsgFindings = await scanner.scanNetworkSecurityGroups();
 * ```
 */
export class AzureSecurityScannerService {
  private storageClient: StorageManagementClient;
  private networkClient: NetworkManagementClient;
  private subscriptionId: string;
  private credentials: TokenCredential;

  /**
   * Creates a new Azure Security Scanner Service instance
   *
   * @param config - Scanner configuration with credentials and subscription ID
   */
  constructor(config: AzureSecurityScannerConfig) {
    this.credentials = config.credentials;
    this.subscriptionId = config.subscriptionId;

    // Initialize Azure SDK clients
    this.storageClient = new StorageManagementClient(this.credentials, this.subscriptionId);
    this.networkClient = new NetworkManagementClient(this.credentials, this.subscriptionId);
  }

  /**
   * Scans all Azure resources for security vulnerabilities
   *
   * Executes all security checks in parallel for optimal performance.
   * Handles errors gracefully - if one scan fails due to permissions, others continue.
   *
   * @returns Array of all security findings across all resource types
   *
   * @example
   * ```typescript
   * const findings = await scanner.scanAll();
   * const criticalFindings = findings.filter(f => f.severity === 'CRITICAL');
   * console.log(`Found ${criticalFindings.length} critical issues`);
   * ```
   */
  async scanAll(): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      // Run all scans in parallel for better performance
      const [storageFindings, nsgFindings] = await Promise.all([
        this.scanStorageAccounts(),
        this.scanNetworkSecurityGroups(),
      ]);

      findings.push(...storageFindings, ...nsgFindings);

      logger.info('Azure security scan completed', {
        totalFindings: findings.length,
        critical: findings.filter((f) => f.severity === 'CRITICAL').length,
        high: findings.filter((f) => f.severity === 'HIGH').length,
        medium: findings.filter((f) => f.severity === 'MEDIUM').length,
        low: findings.filter((f) => f.severity === 'LOW').length,
      });

      return findings;
    } catch (error) {
      logger.error('Error during Azure security scan', { error });
      throw new Error(
        `Azure security scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Scans Azure Storage Accounts for security vulnerabilities
   *
   * Checks performed:
   * - Public blob access enabled (CIS 3.1)
   * - HTTPS-only enforcement disabled (CIS 3.8)
   * - Encryption at rest disabled
   *
   * @returns Array of security findings for storage accounts
   * @private
   *
   * @example
   * ```typescript
   * const storageFindings = await scanner.scanStorageAccounts();
   * ```
   */
  async scanStorageAccounts(): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      logger.info('Starting Azure Storage Account security scan');

      // List all storage accounts in the subscription
      const storageAccounts = [];
      for await (const account of this.storageClient.storageAccounts.list()) {
        storageAccounts.push(account);
      }

      logger.debug(`Found ${storageAccounts.length} storage accounts to scan`);

      for (const account of storageAccounts) {
        // Check 1: Public blob access enabled (CRITICAL)
        if (account.allowBlobPublicAccess === true) {
          findings.push({
            resourceId: account.id!,
            resourceType: 'STORAGE_ACCOUNT',
            category: 'DATA_PROTECTION',
            severity: 'CRITICAL',
            title: 'Storage account allows public blob access',
            description: `Storage account "${account.name}" allows public blob access, which could expose data publicly without authentication. This violates the principle of least privilege and may lead to unauthorized data access.`,
            remediation:
              'Disable public blob access by setting allowBlobPublicAccess to false. Use Azure Portal: Storage Account > Configuration > Allow Blob public access > Disabled. Or use Azure CLI: az storage account update --name <account-name> --resource-group <rg-name> --allow-blob-public-access false',
            cisReference: 'CIS Azure 1.3.0 - 3.1',
            region: account.location!,
            metadata: {
              accountName: account.name,
              allowBlobPublicAccess: account.allowBlobPublicAccess,
              resourceGroup: this.extractResourceGroup(account.id || ''),
              sku: account.sku?.name,
              kind: account.kind,
            },
          });
        }

        // Check 2: HTTPS-only enforcement disabled (HIGH)
        if (account.enableHttpsTrafficOnly === false) {
          findings.push({
            resourceId: account.id!,
            resourceType: 'STORAGE_ACCOUNT',
            category: 'DATA_PROTECTION',
            severity: 'HIGH',
            title: 'Storage account allows HTTP traffic',
            description: `Storage account "${account.name}" allows unencrypted HTTP traffic. Data transmitted over HTTP can be intercepted and read by attackers, exposing sensitive information.`,
            remediation:
              'Enable "Secure transfer required" to enforce HTTPS-only access. Use Azure Portal: Storage Account > Configuration > Secure transfer required > Enabled. Or use Azure CLI: az storage account update --name <account-name> --resource-group <rg-name> --https-only true',
            cisReference: 'CIS Azure 1.3.0 - 3.8',
            region: account.location!,
            metadata: {
              accountName: account.name,
              enableHttpsTrafficOnly: account.enableHttpsTrafficOnly,
              resourceGroup: this.extractResourceGroup(account.id || ''),
              sku: account.sku?.name,
              kind: account.kind,
            },
          });
        }

        // Check 3: Encryption at rest (MEDIUM)
        // Azure Storage accounts have encryption enabled by default, but we check for custom configuration
        if (account.encryption) {
          const hasEncryptionDisabled =
            account.encryption.services?.blob?.enabled === false ||
            account.encryption.services?.file?.enabled === false;

          if (hasEncryptionDisabled) {
            findings.push({
              resourceId: account.id!,
              resourceType: 'STORAGE_ACCOUNT',
              category: 'ENCRYPTION',
              severity: 'MEDIUM',
              title: 'Storage account has encryption disabled for some services',
              description: `Storage account "${account.name}" has encryption disabled for blob or file services. Encryption at rest protects data stored in Azure Storage from unauthorized access.`,
              remediation:
                'Enable encryption for all storage services. This is typically enabled by default, but verify in Azure Portal: Storage Account > Encryption > Enable for all services.',
              cisReference: 'CIS Azure 1.3.0 - 3.2',
              region: account.location!,
              metadata: {
                accountName: account.name,
                blobEncryption: account.encryption.services?.blob?.enabled,
                fileEncryption: account.encryption.services?.file?.enabled,
                resourceGroup: this.extractResourceGroup(account.id || ''),
              },
            });
          }
        }
      }

      logger.info(`Storage Account scan completed: ${findings.length} findings`);
      return findings;
    } catch (error: any) {
      // Handle permission errors gracefully
      if (
        error.code === 'AuthorizationFailed' ||
        error.statusCode === 403 ||
        error.message?.includes('authorization')
      ) {
        logger.warn('No Storage permissions, skipping storage account scan', {
          error: error.message,
        });
        return findings;
      }

      logger.error('Error scanning storage accounts', { error });
      throw new Error(
        `Failed to scan storage accounts: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Scans Azure Network Security Groups for unrestricted access rules
   *
   * Checks performed:
   * - Inbound rules allowing unrestricted access from internet to critical ports
   * - Rules with source address prefix: *, 0.0.0.0/0, or Internet
   *
   * Critical ports checked: SSH (22), RDP (3389), MySQL (3306), PostgreSQL (5432),
   * MSSQL (1433), MongoDB (27017), Redis (6379)
   *
   * @returns Array of security findings for NSGs
   * @private
   *
   * @example
   * ```typescript
   * const nsgFindings = await scanner.scanNetworkSecurityGroups();
   * ```
   */
  async scanNetworkSecurityGroups(): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const criticalPorts = Object.values(CRITICAL_PORTS);

    try {
      logger.info('Starting Azure Network Security Group security scan');

      // List all NSGs in the subscription
      const nsgs = [];
      for await (const nsg of this.networkClient.networkSecurityGroups.listAll()) {
        nsgs.push(nsg);
      }

      logger.debug(`Found ${nsgs.length} Network Security Groups to scan`);

      for (const nsg of nsgs) {
        if (!nsg.securityRules || nsg.securityRules.length === 0) {
          continue;
        }

        for (const rule of nsg.securityRules) {
          // Only check inbound rules that allow traffic
          if (rule.direction !== 'Inbound' || rule.access !== 'Allow') {
            continue;
          }

          // Check for unrestricted source address
          const hasUnrestrictedSource = this.hasUnrestrictedSource(rule);

          if (!hasUnrestrictedSource) {
            continue;
          }

          // Parse destination ports
          const ports = this.parsePortRange(rule.destinationPortRange);

          // Also check destinationPortRanges array (multiple port ranges)
          if (rule.destinationPortRanges && rule.destinationPortRanges.length > 0) {
            for (const portRange of rule.destinationPortRanges) {
              ports.push(...this.parsePortRange(portRange));
            }
          }

          // Check if any critical ports are exposed
          const criticalPortsExposed = ports.filter((p) => criticalPorts.includes(p as any));

          if (criticalPortsExposed.length > 0) {
            const severity = this.calculateNSGSeverity(criticalPortsExposed);

            findings.push({
              resourceId: nsg.id!,
              resourceType: 'NSG',
              category: 'NETWORK',
              severity,
              title: 'Network Security Group allows unrestricted access',
              description: `NSG "${nsg.name}" rule "${rule.name}" allows unrestricted inbound access from the internet on ports ${criticalPortsExposed.join(', ')}. This exposes services to potential brute-force attacks and unauthorized access attempts.`,
              remediation: `Restrict source IP addresses for rule "${rule.name}" to only trusted networks/IPs. Use Azure Portal: Network Security Group > Inbound security rules > Edit rule > Source: IP Addresses (specify trusted IPs). Remove wildcard (*) or Internet sources. Consider using Azure Bastion or VPN for administrative access instead of exposing management ports.`,
              cisReference: 'CIS Azure 1.3.0 - 6.1',
              region: nsg.location!,
              metadata: {
                nsgName: nsg.name,
                ruleName: rule.name,
                ports: criticalPortsExposed,
                sourceAddressPrefix: rule.sourceAddressPrefix,
                sourceAddressPrefixes: rule.sourceAddressPrefixes,
                destinationPortRange: rule.destinationPortRange,
                destinationPortRanges: rule.destinationPortRanges,
                protocol: rule.protocol,
                priority: rule.priority,
                resourceGroup: this.extractResourceGroup(nsg.id || ''),
              },
            });
          }
        }
      }

      logger.info(`Network Security Group scan completed: ${findings.length} findings`);
      return findings;
    } catch (error: any) {
      // Handle permission errors gracefully
      if (
        error.code === 'AuthorizationFailed' ||
        error.statusCode === 403 ||
        error.message?.includes('authorization')
      ) {
        logger.warn('No Network permissions, skipping NSG scan', { error: error.message });
        return findings;
      }

      logger.error('Error scanning network security groups', { error });
      throw new Error(
        `Failed to scan network security groups: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Checks if an NSG rule has an unrestricted source address
   *
   * Unrestricted sources include: *, 0.0.0.0/0, Internet, ::/0 (IPv6 any)
   *
   * @private
   * @param rule - NSG security rule to check
   * @returns True if the rule has an unrestricted source
   */
  private hasUnrestrictedSource(rule: any): boolean {
    const unrestrictedSources = ['*', '0.0.0.0/0', 'Internet', '::/0', '<nw>/0'];

    // Check sourceAddressPrefix (single value)
    if (rule.sourceAddressPrefix) {
      const normalizedPrefix = rule.sourceAddressPrefix.trim();
      if (unrestrictedSources.includes(normalizedPrefix)) {
        return true;
      }
    }

    // Check sourceAddressPrefixes (array of values)
    if (rule.sourceAddressPrefixes && Array.isArray(rule.sourceAddressPrefixes)) {
      for (const prefix of rule.sourceAddressPrefixes) {
        const normalizedPrefix = prefix.trim();
        if (unrestrictedSources.includes(normalizedPrefix)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Parses port range string into array of port numbers
   *
   * Handles various port specifications:
   * - Single port: "22" => [22]
   * - Port range: "22-25" => [22, 23, 24, 25]
   * - Wildcard: "*" => all critical ports
   *
   * @private
   * @param portRange - Port range string from Azure NSG rule
   * @returns Array of port numbers
   *
   * @example
   * ```typescript
   * parsePortRange("22") => [22]
   * parsePortRange("22-25") => [22, 23, 24, 25]
   * parsePortRange("*") => [22, 3389, 3306, 5432, 1433, 27017, 6379]
   * ```
   */
  private parsePortRange(portRange?: string): number[] {
    if (!portRange) {
      return [];
    }

    const trimmedRange = portRange.trim();

    // Wildcard means all ports - return all critical ports for checking
    if (trimmedRange === '*') {
      return Object.values(CRITICAL_PORTS);
    }

    // Port range: "22-25"
    if (trimmedRange.includes('-')) {
      const [startStr, endStr] = trimmedRange.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end)) {
        logger.warn(`Invalid port range: ${portRange}`);
        return [];
      }

      // Limit range size to prevent memory issues
      if (end - start > 10000) {
        logger.warn(`Port range too large: ${portRange}, limiting to critical ports check`);
        return Object.values(CRITICAL_PORTS);
      }

      const ports: number[] = [];
      for (let i = start; i <= end; i++) {
        ports.push(i);
      }
      return ports;
    }

    // Single port: "22"
    const port = parseInt(trimmedRange, 10);
    if (isNaN(port)) {
      logger.warn(`Invalid port number: ${portRange}`);
      return [];
    }

    return [port];
  }

  /**
   * Calculates severity for NSG findings based on exposed ports
   *
   * SSH (22) and RDP (3389) are CRITICAL (remote access)
   * Database ports are HIGH (data access)
   * Other ports are MEDIUM
   *
   * @private
   * @param exposedPorts - Array of exposed port numbers
   * @returns Severity level
   */
  private calculateNSGSeverity(exposedPorts: number[]): Severity {
    // SSH or RDP exposed = CRITICAL (remote access to systems)
    if (exposedPorts.includes(CRITICAL_PORTS.SSH) || exposedPorts.includes(CRITICAL_PORTS.RDP)) {
      return 'CRITICAL';
    }

    // Database ports exposed = HIGH (direct data access)
    const databasePorts = [
      CRITICAL_PORTS.MYSQL,
      CRITICAL_PORTS.POSTGRESQL,
      CRITICAL_PORTS.MSSQL,
      CRITICAL_PORTS.MONGODB,
      CRITICAL_PORTS.REDIS,
    ];

    const hasDatabasePort = exposedPorts.some((port) => databasePorts.includes(port as any));
    if (hasDatabasePort) {
      return 'HIGH';
    }

    // Other critical services
    return 'MEDIUM';
  }

  /**
   * Extracts resource group name from Azure resource ID
   *
   * @private
   * @param resourceId - Full Azure resource URI
   * @returns Resource group name
   *
   * @example
   * Input: "/subscriptions/sub-id/resourceGroups/my-rg/providers/Microsoft.Storage/storageAccounts/myaccount"
   * Output: "my-rg"
   */
  private extractResourceGroup(resourceId: string): string {
    const match = resourceId.match(/\/resourceGroups\/([^\/]+)/i);
    return match ? match[1] : 'unknown';
  }

  /**
   * Gets security scan summary statistics
   *
   * @param findings - Array of security findings
   * @returns Summary statistics object
   *
   * @example
   * ```typescript
   * const findings = await scanner.scanAll();
   * const summary = scanner.getSummary(findings);
   * console.log(`Total: ${summary.total}, Critical: ${summary.critical}`);
   * ```
   */
  getSummary(findings: SecurityFinding[]): {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    byCategory: Record<SecurityCategory, number>;
    byResourceType: Record<AzureResourceType, number>;
  } {
    const summary = {
      total: findings.length,
      critical: findings.filter((f) => f.severity === 'CRITICAL').length,
      high: findings.filter((f) => f.severity === 'HIGH').length,
      medium: findings.filter((f) => f.severity === 'MEDIUM').length,
      low: findings.filter((f) => f.severity === 'LOW').length,
      byCategory: {} as Record<SecurityCategory, number>,
      byResourceType: {} as Record<AzureResourceType, number>,
    };

    // Count by category
    findings.forEach((finding) => {
      summary.byCategory[finding.category] = (summary.byCategory[finding.category] || 0) + 1;
      summary.byResourceType[finding.resourceType] =
        (summary.byResourceType[finding.resourceType] || 0) + 1;
    });

    return summary;
  }

  /**
   * Filters findings by severity level
   *
   * @param findings - Array of security findings
   * @param severities - Severity levels to include
   * @returns Filtered findings
   *
   * @example
   * ```typescript
   * const findings = await scanner.scanAll();
   * const critical = scanner.filterBySeverity(findings, ['CRITICAL', 'HIGH']);
   * ```
   */
  filterBySeverity(findings: SecurityFinding[], severities: Severity[]): SecurityFinding[] {
    return findings.filter((finding) => severities.includes(finding.severity));
  }

  /**
   * Filters findings by category
   *
   * @param findings - Array of security findings
   * @param categories - Categories to include
   * @returns Filtered findings
   *
   * @example
   * ```typescript
   * const findings = await scanner.scanAll();
   * const dataProtection = scanner.filterByCategory(findings, ['DATA_PROTECTION']);
   * ```
   */
  filterByCategory(
    findings: SecurityFinding[],
    categories: SecurityCategory[]
  ): SecurityFinding[] {
    return findings.filter((finding) => categories.includes(finding.category));
  }

  /**
   * Filters findings by resource type
   *
   * @param findings - Array of security findings
   * @param resourceTypes - Resource types to include
   * @returns Filtered findings
   *
   * @example
   * ```typescript
   * const findings = await scanner.scanAll();
   * const storageFindings = scanner.filterByResourceType(findings, ['STORAGE_ACCOUNT']);
   * ```
   */
  filterByResourceType(
    findings: SecurityFinding[],
    resourceTypes: AzureResourceType[]
  ): SecurityFinding[] {
    return findings.filter((finding) => resourceTypes.includes(finding.resourceType));
  }
}
