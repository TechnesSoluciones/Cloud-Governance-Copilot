/**
 * Security Scan Service (Orchestrator)
 *
 * This service orchestrates security scanning across multiple cloud providers and accounts.
 * It coordinates AWS and Azure security scanners, manages scan lifecycle, and handles
 * finding deduplication and persistence.
 *
 * Features:
 * - Multi-cloud account orchestration (AWS, Azure)
 * - Parallel scanning with individual error handling
 * - Finding deduplication (7-day window)
 * - Event emission for CRITICAL/HIGH findings
 * - Scan status tracking (running, completed, failed)
 * - Comprehensive error handling
 *
 * Architecture:
 * - Orchestrates provider-specific scanners (AWSSecurityScannerService, AzureSecurityScannerService)
 * - Decrypts credentials using EncryptionService
 * - Persists findings to database via Prisma
 * - Emits events via EventEmitter for alerting
 *
 * @module modules/security/services/scan.service
 */

import { PrismaClient, CloudAccount, Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { EventEmitter } from 'events';
import { AWSSecurityScannerService } from '../../../integrations/aws/security-scanner.service';
import { AzureSecurityScannerService } from '../../../integrations/azure/security-scanner.service';
import { ClientSecretCredential } from '@azure/identity';
import { decrypt, decryptFields } from '../../../utils/encryption';
import { logger } from '../../../utils/logger';
import type { SecurityFinding as AWSSecurityFinding } from '../../../integrations/cloud-provider.interface';

// ============================================================
// Types and Interfaces
// ============================================================

/**
 * Result of a complete scan operation
 */
export interface ScanResult {
  /** Combined scan ID (or 'combined' for multi-account) */
  scanId: string;

  /** Number of accounts scanned */
  accountsScanned: number;

  /** Total findings across all accounts */
  totalFindings: number;

  /** Count of CRITICAL findings */
  criticalCount: number;

  /** Count of HIGH findings */
  highCount: number;

  /** Count of MEDIUM findings */
  mediumCount: number;

  /** Count of LOW findings */
  lowCount: number;

  /** Scan duration in milliseconds */
  duration: number;
}

/**
 * Result of scanning a single account
 */
export interface AccountScanResult {
  /** Scan ID from database */
  scanId: string;

  /** Number of findings for this account */
  findingsCount: number;

  /** Count of CRITICAL findings */
  criticalCount: number;

  /** Count of HIGH findings */
  highCount: number;

  /** Count of MEDIUM findings */
  mediumCount: number;

  /** Count of LOW findings */
  lowCount: number;

  /** Whether scan succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;
}

/**
 * Encrypted credentials structure from database
 */
interface EncryptedCredentials {
  ciphertext: string;
  iv: string;
  authTag: string;
}

/**
 * AWS decrypted credentials
 */
interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
}

/**
 * Azure decrypted credentials
 */
interface AzureCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
}

// ============================================================
// Security Scan Service
// ============================================================

/**
 * Security Scan Service
 *
 * Orchestrates security scanning across cloud providers and accounts.
 *
 * @example
 * ```typescript
 * const scanService = new SecurityScanService();
 *
 * // Scan all accounts for a tenant
 * const result = await scanService.runScan('tenant-id');
 *
 * // Scan specific account
 * const result = await scanService.runScan('tenant-id', 'account-id');
 *
 * // Listen for security events
 * scanService.on('security.finding.created', (finding) => {
 *   console.log('Critical finding:', finding);
 * });
 * ```
 */
export class SecurityScanService extends EventEmitter {
  private prisma: PrismaClient;

  constructor() {
    super();
    this.prisma = prisma;
  }

  /**
   * Run security scan for one or all accounts
   *
   * @param tenantId - Tenant ID
   * @param cloudAccountId - Optional specific cloud account ID (if omitted, scans all active accounts)
   * @returns Scan result with findings summary
   *
   * @example
   * ```typescript
   * // Scan all active accounts
   * const result = await scanService.runScan('tenant-123');
   *
   * // Scan specific account
   * const result = await scanService.runScan('tenant-123', 'account-456');
   * ```
   */
  async runScan(tenantId: string, cloudAccountId?: string): Promise<ScanResult> {
    const startTime = Date.now();

    logger.info('Starting security scan', {
      tenantId,
      cloudAccountId: cloudAccountId || 'all',
    });

    // Get accounts to scan
    const accounts = cloudAccountId
      ? await this.getSpecificAccount(cloudAccountId, tenantId)
      : await this.getActiveAccounts(tenantId);

    if (!accounts || accounts.length === 0) {
      logger.warn('No accounts found to scan', { tenantId, cloudAccountId });
      throw new Error('No accounts found to scan');
    }

    logger.info(`Found ${accounts.length} account(s) to scan`);

    // Scan each account
    const results: AccountScanResult[] = [];
    const isSingleAccount = cloudAccountId !== undefined;

    for (const account of accounts) {
      try {
        const result = await this.runAccountScan(account);
        results.push(result);
      } catch (error: any) {
        logger.error(`Failed to scan account ${account.id}`, {
          accountId: account.id,
          error: error.message,
        });

        // If scanning a specific account, propagate the error
        if (isSingleAccount) {
          throw error;
        }

        // For multi-account scans, continue with other accounts even if one fails
        results.push({
          scanId: '',
          findingsCount: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          success: false,
          error: error.message,
        });
      }
    }

    // Aggregate results
    const totalFindings = results.reduce((sum, r) => sum + r.findingsCount, 0);
    const criticalCount = results.reduce((sum, r) => sum + r.criticalCount, 0);
    const highCount = results.reduce((sum, r) => sum + r.highCount, 0);
    const mediumCount = results.reduce((sum, r) => sum + r.mediumCount, 0);
    const lowCount = results.reduce((sum, r) => sum + r.lowCount, 0);

    const duration = Date.now() - startTime;

    logger.info('Security scan completed', {
      tenantId,
      accountsScanned: accounts.length,
      totalFindings,
      duration: `${duration}ms`,
    });

    return {
      scanId: cloudAccountId || 'combined',
      accountsScanned: accounts.length,
      totalFindings,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      duration,
    };
  }

  /**
   * Get specific cloud account by ID
   *
   * @param accountId - Cloud account ID
   * @param tenantId - Tenant ID for verification
   * @returns Array with single account or empty array
   */
  private async getSpecificAccount(accountId: string, tenantId: string): Promise<CloudAccount[]> {
    const account = await this.prisma.cloudAccount.findFirst({
      where: {
        id: accountId,
        tenantId,
        status: 'active',
      },
    });

    return account ? [account] : [];
  }

  /**
   * Get all active cloud accounts for a tenant
   *
   * @param tenantId - Tenant ID
   * @returns Array of active cloud accounts
   */
  private async getActiveAccounts(tenantId: string): Promise<CloudAccount[]> {
    return this.prisma.cloudAccount.findMany({
      where: {
        tenantId,
        status: 'active',
      },
    });
  }

  /**
   * Run security scan for a single account
   *
   * @param account - Cloud account to scan
   * @returns Account scan result
   */
  private async runAccountScan(account: CloudAccount): Promise<AccountScanResult> {
    logger.info(`Starting scan for account ${account.id}`, {
      accountId: account.id,
      provider: account.provider,
      accountName: account.accountName,
    });

    // Create scan record in database
    const scan = await this.prisma.securityScan.create({
      data: {
        tenantId: account.tenantId,
        cloudAccountId: account.id,
        provider: account.provider,
        scanType: 'full',
        framework: ['CIS'],
        status: 'running',
        startedAt: new Date(),
      },
    });

    try {
      // Run provider-specific scan
      let findings: AWSSecurityFinding[] = [];

      if (account.provider === 'AWS') {
        findings = await this.scanAWSAccount(account);
      } else if (account.provider === 'AZURE') {
        findings = await this.scanAzureAccount(account);
      } else {
        throw new Error(`Unsupported provider: ${account.provider}`);
      }

      logger.info(`Scan completed for account ${account.id}, found ${findings.length} findings`);

      // Deduplicate findings (check for existing findings in last 7 days)
      const newFindings = await this.deduplicateFindings(
        account.tenantId,
        account.id,
        findings
      );

      logger.info(`After deduplication: ${newFindings.length} new findings`);

      // Save new findings to database
      if (newFindings.length > 0) {
        await this.saveFindings(account.tenantId, account.id, scan.id, newFindings);
      }

      // Calculate severity counts
      const counts = this.calculateSeverityCounts(newFindings);

      // Update scan record as completed
      await this.prisma.securityScan.update({
        where: { id: scan.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          findingsCount: newFindings.length,
          ...counts,
        },
      });

      logger.info(`Scan record updated for account ${account.id}`);

      return {
        scanId: scan.id,
        findingsCount: newFindings.length,
        ...counts,
        success: true,
      };
    } catch (error: any) {
      // Update scan record as failed
      await this.prisma.securityScan.update({
        where: { id: scan.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: error.message,
        },
      });

      logger.error(`Scan failed for account ${account.id}`, {
        accountId: account.id,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Calculate severity counts from findings
   *
   * @param findings - Array of security findings
   * @returns Object with severity counts
   */
  private calculateSeverityCounts(findings: AWSSecurityFinding[]): {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  } {
    return {
      criticalCount: findings.filter(f => f.severity === 'critical').length,
      highCount: findings.filter(f => f.severity === 'high').length,
      mediumCount: findings.filter(f => f.severity === 'medium').length,
      lowCount: findings.filter(f => f.severity === 'low').length,
    };
  }

  /**
   * Scan AWS account for security misconfigurations
   *
   * @param account - AWS cloud account
   * @returns Array of security findings
   */
  private async scanAWSAccount(account: CloudAccount): Promise<AWSSecurityFinding[]> {
    logger.info('Scanning AWS account', { accountId: account.id });

    // Decrypt credentials from database
    const credentials = this.decryptAWSCredentials(account);

    // Initialize AWS security scanner
    const scanner = new AWSSecurityScannerService(
      {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
      credentials.region || 'us-east-1'
    );

    // Run comprehensive scan
    const findings = await scanner.scanAll();

    logger.info(`AWS scan completed: ${findings.length} findings`, {
      accountId: account.id,
    });

    return findings;
  }

  /**
   * Scan Azure account for security misconfigurations
   *
   * @param account - Azure cloud account
   * @returns Array of security findings
   */
  private async scanAzureAccount(account: CloudAccount): Promise<AWSSecurityFinding[]> {
    logger.info('Scanning Azure account', { accountId: account.id });

    // Decrypt credentials from database
    const credentials = this.decryptAzureCredentials(account);

    // Initialize Azure security scanner
    const azureCredential = new ClientSecretCredential(
      credentials.tenantId,
      credentials.clientId,
      credentials.clientSecret
    );

    const scanner = new AzureSecurityScannerService({
      credentials: azureCredential,
      subscriptionId: credentials.subscriptionId,
    });

    // Run comprehensive scan
    const findings = await scanner.scanAll();

    // Convert Azure findings to common format
    const normalizedFindings: AWSSecurityFinding[] = findings.map((finding: any) => ({
      findingId: `azure-${finding.resourceId}-${Date.now()}`,
      title: finding.title,
      description: finding.description,
      severity: finding.severity.toLowerCase() as any,
      category: finding.category,
      resourceId: finding.resourceId,
      resourceType: finding.resourceType,
      region: finding.region,
      remediation: finding.remediation,
      compliance: finding.cisReference ? [finding.cisReference] : [],
      metadata: finding.metadata || {},
      firstObservedAt: new Date(),
      lastObservedAt: new Date(),
    }));

    logger.info(`Azure scan completed: ${normalizedFindings.length} findings`, {
      accountId: account.id,
    });

    return normalizedFindings;
  }

  /**
   * Decrypt AWS credentials from database
   *
   * @param account - Cloud account with encrypted credentials
   * @returns Decrypted AWS credentials
   */
  private decryptAWSCredentials(account: CloudAccount): AWSCredentials {
    try {
      // Decrypt the credentials stored in the database
      const decrypted = decrypt({
        ciphertext: account.credentialsCiphertext,
        iv: account.credentialsIv,
        authTag: account.credentialsAuthTag,
      });

      // Parse decrypted JSON
      const credentials = JSON.parse(decrypted);

      // Extract AWS credentials
      return {
        accessKeyId: credentials.accessKeyId || credentials.awsAccessKeyId,
        secretAccessKey: credentials.secretAccessKey || credentials.awsSecretAccessKey,
        region: credentials.region || credentials.awsRegion,
      };
    } catch (error: any) {
      logger.error('Failed to decrypt AWS credentials', {
        accountId: account.id,
        error: error.message,
      });
      throw new Error(`Failed to decrypt AWS credentials: ${error.message}`);
    }
  }

  /**
   * Decrypt Azure credentials from database
   *
   * @param account - Cloud account with encrypted credentials
   * @returns Decrypted Azure credentials
   */
  private decryptAzureCredentials(account: CloudAccount): AzureCredentials {
    try {
      // Decrypt the credentials stored in the database
      const decrypted = decrypt({
        ciphertext: account.credentialsCiphertext,
        iv: account.credentialsIv,
        authTag: account.credentialsAuthTag,
      });

      // Parse decrypted JSON
      const credentials = JSON.parse(decrypted);

      // Extract Azure credentials
      return {
        tenantId: credentials.tenantId || credentials.azureTenantId,
        clientId: credentials.clientId || credentials.azureClientId,
        clientSecret: credentials.clientSecret || credentials.azureClientSecret,
        subscriptionId: credentials.subscriptionId || credentials.azureSubscriptionId,
      };
    } catch (error: any) {
      logger.error('Failed to decrypt Azure credentials', {
        accountId: account.id,
        error: error.message,
      });
      throw new Error(`Failed to decrypt Azure credentials: ${error.message}`);
    }
  }

  /**
   * Save findings to database and emit events
   *
   * @param tenantId - Tenant ID
   * @param accountId - Cloud account ID
   * @param scanId - Scan ID
   * @param findings - Array of security findings
   */
  private async saveFindings(
    tenantId: string,
    accountId: string,
    scanId: string,
    findings: AWSSecurityFinding[]
  ): Promise<void> {
    logger.info(`Saving ${findings.length} findings to database`, {
      tenantId,
      accountId,
      scanId,
    });

    // Save each finding to database
    for (const finding of findings) {
      try {
        // Create finding record
        const savedFinding = await this.prisma.securityFinding.create({
          data: {
            tenantId,
            scanId,
            assetId: null, // Asset linking can be done later via resourceId
            ruleCode: finding.compliance?.[0] || 'CUSTOM',
            framework: finding.compliance?.[0]?.split('-')[0] || 'CIS',
            severity: finding.severity,
            status: 'open',
            provider: accountId.startsWith('aws') ? 'aws' : 'azure',
            resourceType: finding.resourceType || 'unknown',
            title: finding.title,
            description: finding.description,
            remediation: finding.remediation || 'No remediation provided',
            evidence: finding.metadata || {},
            detectedAt: new Date(),
          },
        });

        // Emit event for CRITICAL or HIGH severity findings
        if (finding.severity === 'critical' || finding.severity === 'high') {
          this.emit('security.finding.created', {
            tenantId,
            findingId: savedFinding.id,
            severity: finding.severity,
            title: finding.title,
            resourceId: finding.resourceId,
            category: finding.category,
          });

          logger.info('Emitted security finding event', {
            findingId: savedFinding.id,
            severity: finding.severity,
          });
        }
      } catch (error: any) {
        logger.error('Failed to save finding', {
          finding: finding.title,
          error: error.message,
        });
        // Continue with other findings even if one fails
      }
    }

    logger.info('All findings saved successfully');
  }

  /**
   * Deduplicate findings against existing findings in database
   *
   * Checks for existing findings with the same resourceId and title within the last 7 days.
   * If found, updates lastObservedAt timestamp. Otherwise, returns as new finding.
   *
   * @param tenantId - Tenant ID
   * @param accountId - Cloud account ID
   * @param findings - Array of security findings from scan
   * @returns Array of new findings (after deduplication)
   */
  private async deduplicateFindings(
    tenantId: string,
    accountId: string,
    findings: AWSSecurityFinding[]
  ): Promise<AWSSecurityFinding[]> {
    logger.info(`Deduplicating ${findings.length} findings`, { tenantId, accountId });

    const newFindings: AWSSecurityFinding[] = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const finding of findings) {
      try {
        // Check for existing finding with same resource and title
        const existingFinding = await this.prisma.securityFinding.findFirst({
          where: {
            tenantId,
            title: finding.title,
            status: 'open',
            detectedAt: {
              gte: sevenDaysAgo,
            },
            evidence: {
              path: ['resourceId'],
              equals: finding.resourceId,
            },
          },
        });

        if (existingFinding) {
          // Update lastObservedAt for existing finding
          await this.prisma.securityFinding.update({
            where: { id: existingFinding.id },
            data: {
              detectedAt: new Date(), // Update timestamp to show it's still present
            },
          });

          logger.debug('Updated existing finding', {
            findingId: existingFinding.id,
            title: finding.title,
          });
        } else {
          // New finding - not seen in last 7 days
          newFindings.push(finding);
        }
      } catch (error: any) {
        logger.error('Error during deduplication check', {
          finding: finding.title,
          error: error.message,
        });
        // If deduplication check fails, treat as new finding to be safe
        newFindings.push(finding);
      }
    }

    logger.info(`Deduplication complete: ${newFindings.length} new findings`, {
      original: findings.length,
      new: newFindings.length,
      deduplicated: findings.length - newFindings.length,
    });

    return newFindings;
  }

  /**
   * Close database connection
   *
   * Should be called when service is no longer needed
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
