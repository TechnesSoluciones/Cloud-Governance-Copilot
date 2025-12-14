/**
 * Asset Discovery Service
 *
 * Orchestrates cloud resource discovery across multiple providers (AWS, Azure)
 * with proper normalization, deduplication, and persistence to the database.
 *
 * Features:
 * - Multi-cloud asset discovery (AWS EC2, Azure VMs)
 * - Asset normalization to unified schema
 * - Asset deduplication by resourceId
 * - Soft delete for stale/terminated assets
 * - Tenant-scoped discovery
 * - Multi-region support
 * - Secure credential decryption
 * - Event emissions for discovered assets
 * - Comprehensive error handling per account
 * - Audit logging
 *
 * @module modules/assets/services/asset-discovery
 */

import { PrismaClient, CloudAccount, Asset } from '@prisma/client';
import { EventEmitter } from 'events';
import { AWSEC2Service } from '../../../integrations/aws/ec2.service';
import { AzureComputeService } from '../../../integrations/azure/compute.service';
import { decrypt } from '../../../utils/encryption';
import type {
  CloudAsset,
  CloudProviderCredentials,
} from '../../../integrations/cloud-provider.interface';

/**
 * Discovery result summary
 */
export interface DiscoveryResult {
  assetsDiscovered: number;
  accountsProcessed: number;
  errors: DiscoveryError[];
}

/**
 * Discovery error details
 */
export interface DiscoveryError {
  accountId: string;
  provider: string;
  error: string;
}

/**
 * Encrypted credential data structure
 */
interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
}

/**
 * Asset Discovery Service
 *
 * Main service for discovering cloud assets across multiple providers.
 * Implements TDD approach with comprehensive test coverage.
 *
 * @example
 * ```typescript
 * const service = new AssetDiscoveryService(prisma, eventBus);
 *
 * // Discover all assets for a tenant
 * const result = await service.discoverAssets('tenant-123');
 * console.log(`Discovered ${result.assetsDiscovered} assets`);
 *
 * // Discover assets for a specific cloud account
 * const result = await service.discoverAssets('tenant-123', 'account-456');
 * ```
 */
export class AssetDiscoveryService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventEmitter
  ) {}

  /**
   * Main entry point for asset discovery
   *
   * Discovers assets for all active cloud accounts belonging to a tenant.
   * Optionally filters to a specific cloud account.
   *
   * @param tenantId - Tenant ID to discover assets for
   * @param cloudAccountId - Optional cloud account ID to filter by
   * @returns Discovery result with counts and errors
   */
  async discoverAssets(
    tenantId: string,
    cloudAccountId?: string
  ): Promise<DiscoveryResult> {
    const result: DiscoveryResult = {
      assetsDiscovered: 0,
      accountsProcessed: 0,
      errors: [],
    };

    try {
      // Fetch active cloud accounts for tenant
      const whereClause: any = {
        tenantId,
        status: 'active',
      };

      if (cloudAccountId) {
        whereClause.id = cloudAccountId;
      }

      const accounts = await this.prisma.cloudAccount.findMany({
        where: whereClause,
      });

      if (accounts.length === 0) {
        return result;
      }

      // Process each cloud account
      for (const account of accounts) {
        result.accountsProcessed += 1; // Count as processed even if errors occur

        try {
          const assets = await this.discoverAccountAssets(account);
          result.assetsDiscovered += assets.length;

          // Persist discovered assets
          await this.saveAssets(tenantId, account.id, assets);

          // Mark stale assets (assets not found in this discovery)
          await this.markStaleAssets(account.id, assets.map(a => a.resourceId));

        } catch (error) {
          // Log error but continue with other accounts
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push({
            accountId: account.id,
            provider: account.provider,
            error: errorMessage,
          });

          console.error(
            `[AssetDiscoveryService] Error discovering assets for account ${account.id}:`,
            error
          );
        }
      }

      return result;
    } catch (error) {
      console.error('[AssetDiscoveryService] Fatal error in asset discovery:', error);
      throw error;
    }
  }

  /**
   * Discover assets for a specific cloud account
   *
   * Routes to provider-specific discovery methods based on account provider.
   *
   * @private
   * @param account - Cloud account to discover assets for
   * @returns Array of discovered cloud assets
   */
  private async discoverAccountAssets(account: CloudAccount): Promise<CloudAsset[]> {
    const provider = account.provider.toLowerCase();

    switch (provider) {
      case 'aws':
        return await this.discoverAWSAssets(account);

      case 'azure':
        return await this.discoverAzureAssets(account);

      case 'gcp':
        throw new Error('Unsupported provider: GCP discovery not yet implemented');

      default:
        throw new Error(`Unsupported provider: ${account.provider}`);
    }
  }

  /**
   * Discover AWS EC2 assets
   *
   * @private
   * @param account - AWS cloud account
   * @returns Array of discovered EC2 instances
   */
  private async discoverAWSAssets(account: CloudAccount): Promise<CloudAsset[]> {
    try {
      // Decrypt AWS credentials
      const credentials = this.decryptCredentials(account);

      // Create AWS EC2 service instance
      const ec2Service = new AWSEC2Service({
        provider: 'aws',
        awsAccessKeyId: credentials.awsAccessKeyId,
        awsSecretAccessKey: credentials.awsSecretAccessKey,
        awsRegion: credentials.awsRegion || 'us-east-1',
      });

      // Discover EC2 instances across all regions
      const assets = await ec2Service.discoverInAllRegions();

      return assets;
    } catch (error) {
      console.error(`[AssetDiscoveryService] Error discovering AWS assets:`, error);
      throw error;
    }
  }

  /**
   * Discover Azure VM assets
   *
   * @private
   * @param account - Azure cloud account
   * @returns Array of discovered Azure VMs
   */
  private async discoverAzureAssets(account: CloudAccount): Promise<CloudAsset[]> {
    try {
      // Decrypt Azure credentials
      const credentials = this.decryptCredentials(account);

      // Create Azure Compute service instance
      const computeService = new AzureComputeService({
        provider: 'azure',
        azureTenantId: credentials.azureTenantId,
        azureClientId: credentials.azureClientId,
        azureClientSecret: credentials.azureClientSecret,
        azureSubscriptionId: credentials.azureSubscriptionId,
      });

      // Discover VMs - use discoverAssets for single subscription
      // or discoverInAllSubscriptions if multiple subscriptions are needed
      const assets = await computeService.discoverAssets();

      return assets;
    } catch (error) {
      console.error(`[AssetDiscoveryService] Error discovering Azure assets:`, error);
      throw error;
    }
  }

  /**
   * Decrypt cloud account credentials
   *
   * Decrypts the encrypted credentials stored in the database.
   * Supports both AWS and Azure credential structures.
   *
   * @private
   * @param account - Cloud account with encrypted credentials
   * @returns Decrypted credentials object
   */
  private decryptCredentials(account: CloudAccount): any {
    try {
      // Parse encrypted credentials JSON
      const encryptedCreds = JSON.parse(account.credentialsCiphertext);
      const decrypted: any = {};

      // Decrypt each field
      for (const [key, value] of Object.entries(encryptedCreds)) {
        const encryptedData = value as EncryptedData;
        decrypted[key] = decrypt(encryptedData);
      }

      return decrypted;
    } catch (error) {
      throw new Error(
        `Failed to decrypt credentials for account ${account.id}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Save discovered assets to database
   *
   * Uses upsert to handle both new assets and updates to existing assets.
   * Emits asset.discovered event for each asset.
   *
   * @private
   * @param tenantId - Tenant ID
   * @param cloudAccountId - Cloud account ID
   * @param assets - Array of discovered cloud assets
   */
  private async saveAssets(
    tenantId: string,
    cloudAccountId: string,
    assets: CloudAsset[]
  ): Promise<void> {
    const now = new Date();

    for (const cloudAsset of assets) {
      try {
        // Normalize cloud asset to database Asset schema
        const normalizedAsset = this.normalizeAsset(
          tenantId,
          cloudAccountId,
          cloudAsset
        );

        // Upsert asset (create if new, update if exists)
        const savedAsset = await this.prisma.asset.upsert({
          where: {
            tenantId_provider_resourceId: {
              tenantId,
              provider: normalizedAsset.provider,
              resourceId: normalizedAsset.resourceId,
            },
          },
          update: {
            name: normalizedAsset.name,
            region: normalizedAsset.region,
            zone: normalizedAsset.zone,
            status: normalizedAsset.status,
            tags: normalizedAsset.tags as any,
            metadata: normalizedAsset.metadata as any,
            lastSeenAt: now,
            updatedAt: now,
            deletedAt: null, // Unmark as deleted if it was previously soft-deleted
          },
          create: {
            ...normalizedAsset,
            tags: normalizedAsset.tags as any,
            metadata: normalizedAsset.metadata as any,
            lastSeenAt: now,
          },
        });

        // Emit asset discovered event
        this.eventBus.emit('asset.discovered', {
          tenantId,
          assetId: savedAsset.id,
          provider: savedAsset.provider,
          resourceType: savedAsset.resourceType,
          resourceId: savedAsset.resourceId,
          region: savedAsset.region,
          metadata: savedAsset.metadata,
        });
      } catch (error) {
        console.error(
          `[AssetDiscoveryService] Error saving asset ${cloudAsset.resourceId}:`,
          error
        );
        // Continue with other assets
      }
    }
  }

  /**
   * Normalize CloudAsset to database Asset schema
   *
   * Transforms provider-specific CloudAsset format to unified Asset schema.
   *
   * @private
   * @param tenantId - Tenant ID
   * @param cloudAccountId - Cloud account ID
   * @param cloudAsset - Cloud asset from provider
   * @returns Normalized asset data for database
   */
  private normalizeAsset(
    tenantId: string,
    cloudAccountId: string,
    cloudAsset: CloudAsset
  ): Omit<Asset, 'id' | 'firstSeenAt' | 'lastSeenAt' | 'createdAt' | 'updatedAt'> {
    // Determine provider from resource ID or type
    let provider: string;
    let arn: string | null = null;
    let resourceUri: string | null = null;

    if (cloudAsset.resourceId.startsWith('i-')) {
      // AWS EC2 instance
      provider = 'aws';
    } else if (cloudAsset.resourceId.includes('Microsoft.Compute')) {
      // Azure VM
      provider = 'azure';
      resourceUri = cloudAsset.resourceId;
    } else if (cloudAsset.resourceId.startsWith('arn:aws:')) {
      // AWS ARN
      provider = 'aws';
      arn = cloudAsset.resourceId;
    } else {
      // Default to resourceType-based detection
      provider = cloudAsset.resourceType.includes('ec2') ? 'aws' : 'azure';
    }

    return {
      tenantId,
      cloudAccountId,
      provider,
      resourceType: cloudAsset.resourceType,
      resourceId: cloudAsset.resourceId,
      arn,
      resourceUri,
      name: cloudAsset.name || null,
      region: cloudAsset.region,
      zone: cloudAsset.zone || null,
      status: cloudAsset.status,
      tags: cloudAsset.tags as any, // Prisma Json type
      metadata: cloudAsset.metadata as any, // Prisma Json type
      deletedAt: null,
    };
  }

  /**
   * Mark stale assets (not found in latest discovery)
   *
   * Performs soft delete by setting deletedAt timestamp and status to 'terminated'.
   * Assets not found in the current discovery are considered terminated/deleted.
   *
   * @private
   * @param cloudAccountId - Cloud account ID
   * @param discoveredResourceIds - Array of resource IDs found in this discovery
   */
  private async markStaleAssets(
    cloudAccountId: string,
    discoveredResourceIds: string[]
  ): Promise<void> {
    try {
      const now = new Date();

      // Update assets that:
      // 1. Belong to this cloud account
      // 2. Were NOT found in the current discovery
      // 3. Are not already marked as deleted
      const result = await this.prisma.asset.updateMany({
        where: {
          cloudAccountId,
          resourceId: {
            notIn: discoveredResourceIds,
          },
          deletedAt: null,
        },
        data: {
          deletedAt: now,
          status: 'terminated',
        },
      });

      if (result.count > 0) {
        console.log(
          `[AssetDiscoveryService] Marked ${result.count} stale assets as terminated for account ${cloudAccountId}`
        );
      }
    } catch (error) {
      console.error(
        `[AssetDiscoveryService] Error marking stale assets for account ${cloudAccountId}:`,
        error
      );
      // Non-fatal error, continue
    }
  }
}
