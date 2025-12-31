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
// AWS TEMPORALMENTE DESHABILITADO - Azure-only mode (v1.6.0)
// import { AWSEC2Service } from '../../../integrations/aws.disabled/ec2.service';
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
  orphanedCount?: number;
  resourcesByType?: Record<string, number>;
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
 * Cost allocation by tag grouping
 */
export interface CostAllocation {
  groupBy: string;
  groupValue: string;
  totalCost: number;
  resourceCount: number;
  resources: Array<{
    resourceId: string;
    name: string;
    cost: number;
  }>;
}

/**
 * Bulk tag update result
 */
export interface BulkTagUpdateResult {
  success: number;
  failed: number;
  errors: Array<{
    resourceId: string;
    error: string;
  }>;
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
      /* AWS TEMPORALMENTE DESHABILITADO - Azure-only mode (v1.6.0)
      case 'aws':
        return await this.discoverAWSAssets(account);
      */

      case 'azure':
        return await this.discoverAzureAssets(account);

      case 'gcp':
        throw new Error('Unsupported provider: GCP discovery not yet implemented');

      default:
        throw new Error(`Only 'azure' is currently supported. Provider: ${account.provider}`);
    }
  }

  /* AWS TEMPORALMENTE DESHABILITADO - Azure-only mode (v1.6.0)
  /**
   * Discover AWS EC2 assets
   *
   * @private
   * @param account - AWS cloud account
   * @returns Array of discovered EC2 instances
   *\/
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
  */

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
      lastDiscovered: new Date(),
      isOrphaned: false,
      costLast30Days: null,
      ownerTag: null,
      environmentTag: null,
      projectTag: null,
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

  /**
   * Discover all resources for an account with enhanced classification
   *
   * Performs a comprehensive scan of all resources, including:
   * - Automatic classification by resource type
   * - Detection of resources without tags
   * - Identification of orphaned resources
   * - Tag extraction (owner, environment, project)
   * - Orphan detection (resources without owner tag or stopped)
   *
   * @param accountId - Cloud account ID to scan
   * @returns Enhanced discovery result with statistics
   */
  async discoverAllResources(accountId: string): Promise<DiscoveryResult> {
    try {
      // Get cloud account details
      const account = await this.prisma.cloudAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error(`Cloud account ${accountId} not found`);
      }

      console.log(`[AssetDiscoveryService] Starting full discovery for account ${accountId}`);

      // Discover all assets
      const assets = await this.discoverAccountAssets(account);

      // Classify resources by type
      const resourcesByType: Record<string, number> = {};
      let orphanedCount = 0;

      assets.forEach((asset) => {
        resourcesByType[asset.resourceType] = (resourcesByType[asset.resourceType] || 0) + 1;

        // Check if orphaned (no owner tag and stopped/terminated)
        const hasOwnerTag = asset.tags && 'owner' in asset.tags;
        const isStopped = ['stopped', 'terminated', 'deallocated'].includes(asset.status);

        if (!hasOwnerTag && (isStopped || !asset.tags || Object.keys(asset.tags).length === 0)) {
          orphanedCount++;
        }
      });

      // Save assets with enhanced fields
      await this.saveAssetsEnhanced(account.tenantId, accountId, assets);

      // Mark stale assets
      await this.markStaleAssets(accountId, assets.map(a => a.resourceId));

      const result: DiscoveryResult = {
        assetsDiscovered: assets.length,
        accountsProcessed: 1,
        errors: [],
        orphanedCount,
        resourcesByType,
      };

      console.log(
        `[AssetDiscoveryService] Discovery completed: ${assets.length} assets, ${orphanedCount} orphaned`
      );

      return result;
    } catch (error) {
      console.error(`[AssetDiscoveryService] Error in discoverAllResources:`, error);
      throw error;
    }
  }

  /**
   * Get resources by type with optional filters
   *
   * @param accountId - Cloud account ID
   * @param resourceType - Resource type to filter by
   * @returns Array of resources matching the type
   */
  async getResourcesByType(accountId: string, resourceType: string): Promise<any[]> {
    try {
      const account = await this.prisma.cloudAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error(`Cloud account ${accountId} not found`);
      }

      const resources = await this.prisma.asset.findMany({
        where: {
          cloudAccountId: accountId,
          resourceType,
          deletedAt: null,
        },
        orderBy: {
          name: 'asc',
        },
      });

      return resources;
    } catch (error) {
      console.error(`[AssetDiscoveryService] Error in getResourcesByType:`, error);
      throw error;
    }
  }

  /**
   * Get orphaned resources for an account
   *
   * Orphaned resources are defined as:
   * - Resources without owner tag
   * - Resources without resource group association
   * - Resources with incomplete tags
   * - Stopped/deallocated resources without tags
   * - Unattached disks, unused IPs
   *
   * @param accountId - Cloud account ID
   * @returns Array of orphaned resources
   */
  async getOrphanedResources(accountId: string): Promise<any[]> {
    try {
      const resources = await this.prisma.asset.findMany({
        where: {
          cloudAccountId: accountId,
          isOrphaned: true,
          deletedAt: null,
        },
        orderBy: {
          lastSeenAt: 'desc',
        },
      });

      return resources;
    } catch (error) {
      console.error(`[AssetDiscoveryService] Error in getOrphanedResources:`, error);
      throw error;
    }
  }

  /**
   * Get resource cost allocation grouped by tags
   *
   * Correlates assets with cost data and groups by:
   * - Department tag
   * - Project tag
   * - Environment tag
   *
   * @param accountId - Cloud account ID
   * @param groupBy - Tag to group by ('department' | 'project' | 'environment')
   * @returns Cost allocation grouped by tag
   */
  async getResourceCostAllocation(
    accountId: string,
    groupBy: 'department' | 'project' | 'environment' = 'project'
  ): Promise<CostAllocation[]> {
    try {
      const tagField = groupBy === 'department' ? 'ownerTag' : groupBy === 'project' ? 'projectTag' : 'environmentTag';

      // Get all assets with costs
      const assets = await this.prisma.asset.findMany({
        where: {
          cloudAccountId: accountId,
          deletedAt: null,
          costLast30Days: {
            not: null,
          },
        },
        select: {
          id: true,
          resourceId: true,
          name: true,
          costLast30Days: true,
          ownerTag: true,
          projectTag: true,
          environmentTag: true,
        },
      });

      // Group by tag value
      const grouped = new Map<string, CostAllocation>();

      assets.forEach((asset) => {
        const tagValue = (asset as any)[tagField] || 'untagged';
        const cost = Number(asset.costLast30Days) || 0;

        if (!grouped.has(tagValue)) {
          grouped.set(tagValue, {
            groupBy,
            groupValue: tagValue,
            totalCost: 0,
            resourceCount: 0,
            resources: [],
          });
        }

        const group = grouped.get(tagValue)!;
        group.totalCost += cost;
        group.resourceCount++;
        group.resources.push({
          resourceId: asset.resourceId,
          name: asset.name || asset.resourceId,
          cost,
        });
      });

      // Sort resources within each group by cost
      const allocations = Array.from(grouped.values());
      allocations.forEach((allocation) => {
        allocation.resources.sort((a, b) => b.cost - a.cost);
        allocation.resources = allocation.resources.slice(0, 10); // Top 10 per group
      });

      // Sort allocations by total cost
      allocations.sort((a, b) => b.totalCost - a.totalCost);

      return allocations;
    } catch (error) {
      console.error(`[AssetDiscoveryService] Error in getResourceCostAllocation:`, error);
      throw error;
    }
  }

  /**
   * Update tags for a single resource
   *
   * Updates both the database and syncs with the cloud provider.
   *
   * @param accountId - Cloud account ID
   * @param resourceId - Resource ID
   * @param tags - New tags to apply
   */
  async updateResourceTags(
    accountId: string,
    resourceId: string,
    tags: Record<string, string>
  ): Promise<void> {
    try {
      // Find the asset
      const asset = await this.prisma.asset.findFirst({
        where: {
          cloudAccountId: accountId,
          resourceId,
        },
      });

      if (!asset) {
        throw new Error(`Resource ${resourceId} not found in account ${accountId}`);
      }

      // Extract standard tags
      const ownerTag = tags.owner || null;
      const environmentTag = tags.environment || null;
      const projectTag = tags.project || null;

      // Check if orphaned (no owner tag and stopped)
      const isStopped = ['stopped', 'terminated', 'deallocated'].includes(asset.status);
      const isOrphaned = !ownerTag && isStopped;

      // Update in database
      await this.prisma.asset.update({
        where: { id: asset.id },
        data: {
          tags: tags as any,
          ownerTag,
          environmentTag,
          projectTag,
          isOrphaned,
          updatedAt: new Date(),
        },
      });

      console.log(`[AssetDiscoveryService] Updated tags for resource ${resourceId}`);

      // TODO: Sync with cloud provider (Azure Resource Manager / AWS Resource Groups Tagging API)
      // This would require implementing provider-specific tag update methods
    } catch (error) {
      console.error(`[AssetDiscoveryService] Error updating resource tags:`, error);
      throw error;
    }
  }

  /**
   * Bulk update tags for multiple resources
   *
   * Updates tags for multiple resources in parallel.
   * Returns success/failure counts and errors.
   *
   * @param accountId - Cloud account ID
   * @param resourceIds - Array of resource IDs
   * @param tags - Tags to apply to all resources
   * @returns Bulk update result
   */
  async bulkUpdateTags(
    accountId: string,
    resourceIds: string[],
    tags: Record<string, string>
  ): Promise<BulkTagUpdateResult> {
    const result: BulkTagUpdateResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Process in parallel with limit
    const BATCH_SIZE = 10;
    for (let i = 0; i < resourceIds.length; i += BATCH_SIZE) {
      const batch = resourceIds.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (resourceId) => {
          try {
            await this.updateResourceTags(accountId, resourceId, tags);
            result.success++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              resourceId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        })
      );
    }

    console.log(
      `[AssetDiscoveryService] Bulk update completed: ${result.success} success, ${result.failed} failed`
    );

    return result;
  }

  /**
   * Save discovered assets with enhanced fields
   *
   * Enhanced version of saveAssets that extracts and stores tag-based fields.
   *
   * @private
   * @param tenantId - Tenant ID
   * @param cloudAccountId - Cloud account ID
   * @param assets - Array of discovered cloud assets
   */
  private async saveAssetsEnhanced(
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

        // Extract tag-based fields
        const tags = cloudAsset.tags || {};
        const ownerTag = tags.owner || tags.Owner || null;
        const environmentTag = tags.environment || tags.Environment || tags.env || null;
        const projectTag = tags.project || tags.Project || tags['project-name'] || null;

        // Determine if orphaned
        const isStopped = ['stopped', 'terminated', 'deallocated'].includes(cloudAsset.status);
        const hasNoTags = !tags || Object.keys(tags).length === 0;
        const isOrphaned = (!ownerTag && isStopped) || (!ownerTag && hasNoTags);

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
            lastDiscovered: now,
            ownerTag,
            environmentTag,
            projectTag,
            isOrphaned,
            updatedAt: now,
            deletedAt: null, // Unmark as deleted if it was previously soft-deleted
          },
          create: {
            ...normalizedAsset,
            tags: normalizedAsset.tags as any,
            metadata: normalizedAsset.metadata as any,
            lastSeenAt: now,
            lastDiscovered: now,
            ownerTag,
            environmentTag,
            projectTag,
            isOrphaned,
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
          isOrphaned,
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
}
