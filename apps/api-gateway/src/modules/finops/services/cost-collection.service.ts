/**
 * FinOps Cost Collection Service
 *
 * This service orchestrates the cost data collection workflow from cloud providers.
 * It coordinates credential decryption, cost data fetching, database persistence,
 * and anomaly detection triggering.
 *
 * Workflow:
 * 1. Retrieve cloud account from database (with encrypted credentials)
 * 2. Decrypt credentials using AES-256-GCM encryption
 * 3. Use Factory Pattern to instantiate appropriate cloud provider service (AWS or Azure)
 * 4. Validate cloud provider credentials
 * 5. Fetch cost data for the specified date range
 * 6. Transform and save cost data to database (with duplicate prevention)
 * 7. Update lastSync timestamp on cloud account
 * 8. Return collection statistics
 *
 * Supported Cloud Providers:
 * - AWS: Uses AWSCostExplorerService
 * - Azure: Uses AzureCostManagementService
 *
 * Architecture Patterns:
 * - Orchestration Service: Coordinates multiple operations
 * - Factory Pattern: Creates appropriate provider service based on account type
 * - Transaction Management: Uses Prisma transactions for data consistency
 * - Error Handling: Comprehensive error handling with rollback on failures
 * - Audit Logging: Logs all operations with metrics (includes provider identification)
 *
 * @module FinOps/CostCollection
 */

import { PrismaClient, CloudAccount } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { createDecipheriv } from 'crypto';
import { EventEmitter } from 'events';
import { AWSCostExplorerService } from '../../../integrations/aws';
import { AzureCostManagementService } from '../../../integrations/azure';
import { eventBus } from '../../../shared/events/event-bus';
import type { DateRange, CloudCostData, CloudProvider } from '../../../integrations/cloud-provider.interface';

// ============================================================
// Types and Interfaces
// ============================================================

/**
 * Result of a cost collection operation
 */
export interface CollectionResult {
  /** Indicates if the collection was successful */
  success: boolean;

  /** Number of cost records obtained from cloud provider */
  recordsObtained: number;

  /** Number of cost records saved to database */
  recordsSaved: number;

  /** Total execution time in milliseconds */
  executionTimeMs: number;

  /** Error messages if any occurred */
  errors?: string[];
}

/**
 * Decrypted AWS cloud provider credentials
 */
interface DecryptedAWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
}

/**
 * Decrypted Azure cloud provider credentials
 */
interface DecryptedAzureCredentials {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  subscriptionId: string;
}

/**
 * Union type for decrypted credentials (AWS or Azure)
 */
type DecryptedCredentials = DecryptedAWSCredentials | DecryptedAzureCredentials;

/**
 * Extended CloudAccount with tenant relation
 */
interface CloudAccountWithTenant extends CloudAccount {
  tenant: {
    id: string;
    name: string;
  };
}

// ============================================================
// Cost Collection Service
// ============================================================

/**
 * Service for collecting and persisting cloud cost data
 *
 * @example
 * ```typescript
 * const prisma = new PrismaClient();
 * const service = new CostCollectionService(prisma, eventBus);
 *
 * const result = await service.collectCostsForAccount(
 *   'account-id-123',
 *   { start: new Date('2024-01-01'), end: new Date('2024-01-31') }
 * );
 *
 * console.log(`Saved ${result.recordsSaved} cost records`);
 * ```
 */
export class CostCollectionService {
  constructor(
    private prisma: PrismaClient,
    private eventBus: EventEmitter
  ) {}

  // ============================================================
  // Main Collection Method
  // ============================================================

  /**
   * Collects cost data for a specific cloud account and date range
   *
   * This method orchestrates the entire cost collection workflow:
   * - Fetches cloud account with encrypted credentials
   * - Decrypts credentials securely
   * - Uses factory pattern to create appropriate cloud provider service (AWS or Azure)
   * - Validates cloud provider credentials
   * - Retrieves cost data from cloud provider
   * - Persists cost data to database (with duplicate prevention)
   * - Updates lastSync timestamp
   * - Returns collection statistics
   *
   * Supports AWS and Azure cloud providers.
   *
   * @param cloudAccountId - UUID of the cloud account to collect costs for
   * @param dateRange - Start and end dates for cost collection
   * @returns Collection result with statistics and any errors
   * @throws Error if cloud account not found or provider not supported
   *
   * @example
   * ```typescript
   * // Works for both AWS and Azure accounts
   * const result = await service.collectCostsForAccount(
   *   'cloud-account-uuid',
   *   {
   *     start: new Date('2024-01-01'),
   *     end: new Date('2024-01-31')
   *   }
   * );
   * ```
   */
  async collectCostsForAccount(
    cloudAccountId: string,
    dateRange: DateRange
  ): Promise<CollectionResult> {
    const startTime = Date.now();
    console.log(`[CostCollection] Starting collection for account ${cloudAccountId}`);
    console.log(`[CostCollection] Date range: ${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}`);

    try {
      // Step 1: Retrieve cloud account from database
      const account = await this.getCloudAccount(cloudAccountId);
      console.log(`[CostCollection] Retrieved cloud account: ${account.accountName} (${account.provider.toUpperCase()})`);

      // Step 2: Decrypt credentials
      console.log(`[CostCollection] (${account.provider.toUpperCase()}) Decrypting credentials...`);
      const credentials = this.decryptCredentials(
        account.credentialsCiphertext,
        account.credentialsIv,
        account.credentialsAuthTag
      );
      console.log(`[CostCollection] (${account.provider.toUpperCase()}) Credentials decrypted successfully (sensitive data hidden)`);

      // Step 3: Use factory to create appropriate provider service
      console.log(`[CostCollection] (${account.provider.toUpperCase()}) Initializing cloud provider cost service...`);
      const costService = this.createCloudProvider(account, credentials);

      // Step 4: Validate cloud provider credentials
      console.log(`[CostCollection] (${account.provider.toUpperCase()}) Validating credentials...`);
      const isValid = await costService.validateCredentials();
      if (!isValid) {
        throw new Error(
          `Invalid ${account.provider.toUpperCase()} credentials. Please verify the credentials are correct and have Cost Management permissions.`
        );
      }
      console.log(`[CostCollection] (${account.provider.toUpperCase()}) Credentials validated successfully`);

      // Step 5: Fetch cost data from cloud provider
      console.log(`[CostCollection] (${account.provider.toUpperCase()}) Fetching cost data...`);
      const costs = await costService.getCosts(dateRange);
      console.log(`[CostCollection] (${account.provider.toUpperCase()}) Obtained ${costs.length} cost records`);

      // Step 6: Save cost data to database (within transaction)
      console.log(`[CostCollection] (${account.provider.toUpperCase()}) Saving cost data to database...`);
      const savedCount = await this.saveCosts(account, costs);
      console.log(`[CostCollection] (${account.provider.toUpperCase()}) Saved ${savedCount} cost records to database`);

      // Step 7: Update lastSync timestamp
      console.log(`[CostCollection] (${account.provider.toUpperCase()}) Updating lastSync timestamp...`);
      await this.updateLastSync(cloudAccountId);
      console.log(`[CostCollection] (${account.provider.toUpperCase()}) lastSync updated successfully`);

      // Calculate execution time
      const executionTime = Date.now() - startTime;
      console.log(`[CostCollection] Collection completed successfully in ${executionTime}ms`);

      return {
        success: true,
        recordsObtained: costs.length,
        recordsSaved: savedCount,
        executionTimeMs: executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error('[CostCollection] Error during cost collection:', error.message);
      console.error('[CostCollection] Stack trace:', error.stack);

      // Return error result instead of throwing
      // This allows the caller to handle errors gracefully
      return {
        success: false,
        recordsObtained: 0,
        recordsSaved: 0,
        executionTimeMs: executionTime,
        errors: [error.message],
      };
    }
  }

  // ============================================================
  // Factory Method
  // ============================================================

  /**
   * Factory method to create the appropriate cloud provider service
   *
   * This method instantiates the correct cloud provider service (AWS or Azure)
   * based on the account's provider type. It uses the Factory Pattern to abstract
   * the creation logic and ensure type-safe credential handling.
   *
   * Supported providers:
   * - 'aws': Creates AWSCostExplorerService with AWS credentials
   * - 'azure': Creates AzureCostManagementService with Azure credentials
   *
   * @param account - Cloud account with provider type
   * @param credentials - Decrypted credentials (AWS or Azure format)
   * @returns CloudProvider instance (AWSCostExplorerService or AzureCostManagementService)
   * @throws Error if provider is not supported
   * @private
   *
   * @example
   * ```typescript
   * // For AWS account
   * const awsService = this.createCloudProvider(awsAccount, {
   *   accessKeyId: 'AKIA...',
   *   secretAccessKey: 'secret...',
   *   region: 'us-east-1'
   * });
   *
   * // For Azure account
   * const azureService = this.createCloudProvider(azureAccount, {
   *   clientId: 'client-id-uuid',
   *   clientSecret: 'secret-value',
   *   tenantId: 'tenant-id-uuid',
   *   subscriptionId: 'subscription-id-uuid'
   * });
   * ```
   */
  private createCloudProvider(
    account: CloudAccountWithTenant,
    credentials: DecryptedCredentials
  ): CloudProvider {
    switch (account.provider) {
      case 'aws': {
        const awsCreds = credentials as DecryptedAWSCredentials;
        return new AWSCostExplorerService({
          provider: 'aws',
          awsAccessKeyId: awsCreds.accessKeyId,
          awsSecretAccessKey: awsCreds.secretAccessKey,
          awsRegion: awsCreds.region || 'us-east-1',
        });
      }

      case 'azure': {
        const azureCreds = credentials as DecryptedAzureCredentials;
        return new AzureCostManagementService({
          provider: 'azure',
          azureClientId: azureCreds.clientId,
          azureClientSecret: azureCreds.clientSecret,
          azureTenantId: azureCreds.tenantId,
          azureSubscriptionId: azureCreds.subscriptionId,
        });
      }

      default:
        throw new Error(
          `Unsupported cloud provider: ${account.provider}. Currently supports: aws, azure`
        );
    }
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Retrieves a cloud account from the database with tenant relation
   *
   * @param cloudAccountId - UUID of the cloud account
   * @returns Cloud account with tenant information
   * @throws Error if cloud account is not found
   * @private
   */
  private async getCloudAccount(cloudAccountId: string): Promise<CloudAccountWithTenant> {
    const account = await this.prisma.cloudAccount.findUnique({
      where: { id: cloudAccountId },
      include: { tenant: true },
    });

    if (!account) {
      throw new Error(`Cloud account with ID "${cloudAccountId}" not found`);
    }

    return account as CloudAccountWithTenant;
  }

  /**
   * Decrypts cloud provider credentials using AES-256-GCM
   *
   * The credentials are stored encrypted in the database using AES-256-GCM encryption.
   * This method decrypts them using the ENCRYPTION_KEY from environment variables.
   *
   * Security considerations:
   * - Uses AES-256-GCM for authenticated encryption
   * - Verifies authentication tag to detect tampering
   * - ENCRYPTION_KEY must be 32 bytes (256 bits)
   * - Never logs decrypted credentials
   *
   * @param ciphertext - Encrypted credentials (hex-encoded)
   * @param iv - Initialization vector (hex-encoded)
   * @param authTag - Authentication tag (hex-encoded)
   * @returns Decrypted credentials object
   * @throws Error if ENCRYPTION_KEY is not set or decryption fails
   * @private
   */
  private decryptCredentials(
    ciphertext: string,
    iv: string,
    authTag: string
  ): DecryptedCredentials {
    // Get encryption key from environment
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    if (!ENCRYPTION_KEY) {
      throw new Error(
        'ENCRYPTION_KEY environment variable is not set. Cannot decrypt credentials.'
      );
    }

    try {
      // Convert hex strings to buffers
      const ivBuffer = Buffer.from(iv, 'hex');
      const encryptedBuffer = Buffer.from(ciphertext, 'hex');
      const authTagBuffer = Buffer.from(authTag, 'hex');

      // Prepare encryption key (must be 32 bytes for AES-256)
      // Try base64 decoding first (standard approach), fallback to padEnd for legacy keys
      let keyBuffer: Buffer;
      try {
        keyBuffer = Buffer.from(ENCRYPTION_KEY, 'base64');
        if (keyBuffer.length !== 32) {
          // Fallback to legacy padEnd method
          keyBuffer = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
        }
      } catch {
        // If base64 decode fails, use padEnd method
        keyBuffer = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
      }

      // Create decipher with AES-256-GCM
      const decipher = createDecipheriv('aes-256-gcm', keyBuffer, ivBuffer);

      // Set authentication tag for verification
      decipher.setAuthTag(authTagBuffer);

      // Decrypt the data
      let decrypted = decipher.update(encryptedBuffer);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      // Parse JSON credentials
      const credentials = JSON.parse(decrypted.toString('utf8'));

      return credentials;
    } catch (error: any) {
      console.error('[CostCollection] Credential decryption failed:', error.message);
      throw new Error(
        `Failed to decrypt credentials: ${error.message}. Verify ENCRYPTION_KEY is correct.`
      );
    }
  }

  /**
   * Saves cost data to the database with duplicate prevention
   *
   * This method:
   * - Transforms CloudCostData to Prisma CostData format
   * - Uses Prisma transaction for atomicity
   * - Prevents duplicates using unique constraint
   * - Handles errors with automatic rollback
   *
   * Unique constraint: [tenantId, cloudAccountId, date, provider, service, usageType]
   *
   * @param account - Cloud account (with tenant relation)
   * @param costs - Array of cost data from cloud provider
   * @returns Number of records successfully saved
   * @throws Error if database operation fails
   * @private
   */
  private async saveCosts(
    account: CloudAccountWithTenant,
    costs: CloudCostData[]
  ): Promise<number> {
    // Transform CloudCostData[] to Prisma CostData format
    const costRecords = costs.map((cost) => ({
      tenantId: account.tenantId,
      cloudAccountId: account.id,
      assetId: null, // Asset linking can be done later via background job
      date: cost.date,
      amount: cost.amount,
      currency: cost.currency,
      provider: account.provider,
      service: cost.service,
      usageType: cost.usageType || '',
      operation: cost.operation || null,
      tags: cost.tags || {},
      metadata: cost.metadata || {},
    }));

    // Use Prisma transaction to ensure atomicity
    // If any operation fails, the entire transaction is rolled back
    return await this.prisma.$transaction(async (tx) => {
      // Use createMany with skipDuplicates for efficient bulk insert
      // This prevents errors on duplicate records while still inserting new ones
      const result = await tx.costData.createMany({
        data: costRecords,
        skipDuplicates: true,
      });

      // Return count of inserted records
      return result.count;
    });
  }

  /**
   * Updates the lastSync timestamp for a cloud account
   *
   * This timestamp indicates when the account was last successfully synced
   * with the cloud provider. It's used for incremental sync scheduling.
   *
   * @param cloudAccountId - UUID of the cloud account
   * @throws Error if database operation fails
   * @private
   */
  private async updateLastSync(cloudAccountId: string): Promise<void> {
    await this.prisma.cloudAccount.update({
      where: { id: cloudAccountId },
      data: { lastSync: new Date() },
    });
  }
}
