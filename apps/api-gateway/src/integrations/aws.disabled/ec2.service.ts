/**
 * AWS EC2 Service
 *
 * Handles EC2 instance discovery and asset management for AWS integration.
 * Supports multi-region discovery and provides normalized CloudAsset data.
 *
 * Features:
 * - Discover EC2 instances across all AWS regions
 * - Filter by region, tags, status, and resource type
 * - Transform AWS EC2 instances to CloudAsset format
 * - Retry logic with exponential backoff
 * - Comprehensive error handling
 *
 * @module integrations/aws/ec2.service
 */

import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeRegionsCommand,
  type Instance,
  type Tag,
  type Region,
  type Reservation,
} from '@aws-sdk/client-ec2';
import type {
  CloudAsset,
  AssetFilters,
  CloudProviderCredentials,
} from '../cloud-provider.interface';

/**
 * AWS EC2 Service Configuration
 */
interface EC2ServiceConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * AWS EC2 Service
 *
 * Provides EC2 instance discovery and asset management capabilities.
 *
 * @example
 * ```typescript
 * const ec2Service = new AWSEC2Service({
 *   provider: 'aws',
 *   awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
 *   awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
 *   awsRegion: 'us-east-1'
 * });
 *
 * // Discover all EC2 instances
 * const assets = await ec2Service.discoverAssets();
 *
 * // Discover in specific region with filters
 * const filtered = await ec2Service.discoverAssets({
 *   region: 'us-west-2',
 *   status: 'running',
 *   tags: { Environment: 'production' }
 * });
 *
 * // Get details for specific instance
 * const details = await ec2Service.getAssetDetails('i-1234567890abcdef0');
 * ```
 */
export class AWSEC2Service {
  private client: EC2Client;
  private region: string;
  private config: EC2ServiceConfig;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  /**
   * Creates a new AWS EC2 Service instance
   *
   * @param credentials - Cloud provider credentials
   * @throws {Error} If AWS credentials are missing
   */
  constructor(credentials: CloudProviderCredentials) {
    if (!credentials.awsAccessKeyId || !credentials.awsSecretAccessKey) {
      throw new Error('AWS credentials (accessKeyId and secretAccessKey) are required');
    }

    this.region = credentials.awsRegion || 'us-east-1';
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second base delay

    this.config = {
      accessKeyId: credentials.awsAccessKeyId,
      secretAccessKey: credentials.awsSecretAccessKey,
      region: this.region,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
    };

    this.client = new EC2Client({
      region: this.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      maxAttempts: this.maxRetries,
    });
  }

  /**
   * Discovers EC2 instances in the configured region or all regions
   *
   * @param filters - Optional filters for asset discovery
   * @returns Array of discovered EC2 instances as CloudAssets
   *
   * @example
   * ```typescript
   * // Discover all instances
   * const assets = await ec2Service.discoverAssets();
   *
   * // Filter by region and status
   * const running = await ec2Service.discoverAssets({
   *   region: 'us-east-1',
   *   status: 'running'
   * });
   *
   * // Filter by tags
   * const production = await ec2Service.discoverAssets({
   *   tags: { Environment: 'production' }
   * });
   * ```
   */
  async discoverAssets(filters?: AssetFilters): Promise<CloudAsset[]> {
    try {
      // If region filter is specified, discover only in that region
      if (filters?.region) {
        return await this.discoverInRegion(filters.region, filters);
      }

      // Otherwise, discover in current region by default
      // (discoverInAllRegions can be called separately if needed)
      return await this.discoverInRegion(this.region, filters);
    } catch (error) {
      console.error('[AWSEC2Service] Error discovering assets:', error);
      throw new Error(
        `Failed to discover EC2 assets: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets detailed information for a specific EC2 instance
   *
   * @param resourceId - Instance ID or ARN
   * @returns CloudAsset with complete instance details, or null if not found
   *
   * @example
   * ```typescript
   * const instance = await ec2Service.getAssetDetails('i-1234567890abcdef0');
   * if (instance) {
   *   console.log('Instance type:', instance.metadata.instanceType);
   *   console.log('VPC:', instance.metadata.vpcId);
   * }
   * ```
   */
  async getAssetDetails(resourceId: string): Promise<CloudAsset | null> {
    try {
      // Extract instance ID from ARN if provided
      const instanceId = this.extractInstanceId(resourceId);

      const command = new DescribeInstancesCommand({
        InstanceIds: [instanceId],
      });

      const response = await this.executeWithRetry(async () => this.client.send(command));

      if (!response.Reservations || response.Reservations.length === 0) {
        return null;
      }

      // Find the instance in reservations
      for (const reservation of response.Reservations) {
        if (reservation.Instances && reservation.Instances.length > 0) {
          const instance = reservation.Instances[0];
          return this.transformEC2Instance(instance, this.region);
        }
      }

      return null;
    } catch (error) {
      // If instance not found, return null instead of throwing
      if (
        error instanceof Error &&
        (error.name === 'InvalidInstanceID.NotFound' || error.message.includes('does not exist'))
      ) {
        return null;
      }

      console.error('[AWSEC2Service] Error getting asset details:', error);
      throw new Error(
        `Failed to get EC2 asset details: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Discovers EC2 instances across all active AWS regions
   *
   * Note: This method can take several minutes to complete as it queries
   * each region sequentially. Consider using discoverAssets() with region
   * filter for faster results.
   *
   * @param filters - Optional filters (region filter will be ignored)
   * @returns Array of all discovered EC2 instances across all regions
   *
   * @example
   * ```typescript
   * // Discover instances in all regions (may take several minutes)
   * const allAssets = await ec2Service.discoverInAllRegions();
   *
   * // Filter by status across all regions
   * const runningInstances = await ec2Service.discoverInAllRegions({
   *   status: 'running'
   * });
   * ```
   */
  async discoverInAllRegions(filters?: AssetFilters): Promise<CloudAsset[]> {
    try {
      const regions = await this.getActiveRegions();
      const allAssets: CloudAsset[] = [];

      // Process regions sequentially to avoid rate limiting
      for (const region of regions) {
        try {
          const assets = await this.discoverInRegion(region, filters);
          allAssets.push(...assets);
        } catch (error) {
          // Log error but continue with other regions
          console.error(`[AWSEC2Service] Error discovering in region ${region}:`, error);
        }
      }

      return allAssets;
    } catch (error) {
      console.error('[AWSEC2Service] Error discovering in all regions:', error);
      throw new Error(
        `Failed to discover EC2 assets in all regions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Discovers EC2 instances in a specific region
   *
   * @private
   * @param region - AWS region to query
   * @param filters - Optional filters for asset discovery
   * @returns Array of discovered EC2 instances
   */
  private async discoverInRegion(region: string, filters?: AssetFilters): Promise<CloudAsset[]> {
    // Create region-specific client
    const regionalClient = new EC2Client({
      region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      maxAttempts: this.maxRetries,
    });

    try {
      const ec2Filters = this.buildEC2Filters(filters);
      const command = new DescribeInstancesCommand({
        Filters: ec2Filters.length > 0 ? ec2Filters : undefined,
      });

      const response = await this.executeWithRetry(async () => regionalClient.send(command));

      const assets: CloudAsset[] = [];

      if (response.Reservations) {
        for (const reservation of response.Reservations) {
          if (reservation.Instances) {
            for (const instance of reservation.Instances) {
              const asset = this.transformEC2Instance(instance, region);

              // Apply additional filters that can't be done via AWS API
              if (this.matchesFilters(asset, filters)) {
                assets.push(asset);
              }
            }
          }
        }
      }

      return assets;
    } finally {
      // Clean up regional client
      regionalClient.destroy();
    }
  }

  /**
   * Gets list of active AWS regions
   *
   * @private
   * @returns Array of region identifiers
   */
  private async getActiveRegions(): Promise<string[]> {
    try {
      const command = new DescribeRegionsCommand({
        AllRegions: false, // Only enabled regions
      });

      const response = await this.executeWithRetry(async () => this.client.send(command));

      if (!response.Regions) {
        return [this.region]; // Fallback to configured region
      }

      return response.Regions.map((region: Region) => region.RegionName).filter(
        (name): name is string => name !== undefined
      );
    } catch (error) {
      console.error('[AWSEC2Service] Error getting active regions:', error);
      // Return default region if we can't fetch regions
      return [this.region];
    }
  }

  /**
   * Transforms AWS EC2 Instance to normalized CloudAsset format
   *
   * @private
   * @param instance - AWS EC2 Instance object
   * @param region - AWS region
   * @returns Normalized CloudAsset object
   */
  private transformEC2Instance(instance: Instance, region: string): CloudAsset {
    const instanceId = instance.InstanceId || 'unknown';
    const tags = this.extractTags(instance.Tags);
    const name = tags['Name'] || instanceId;

    // Build ARN: arn:aws:ec2:region:account-id:instance/instance-id
    // Note: We can't easily get account ID from EC2 instance, so we use instance ID as resourceId
    const resourceId = instanceId;

    return {
      resourceId,
      resourceType: 'ec2:instance',
      name,
      region,
      zone: instance.Placement?.AvailabilityZone,
      status: instance.State?.Name || 'unknown',
      tags,
      metadata: {
        instanceType: instance.InstanceType,
        vpcId: instance.VpcId,
        subnetId: instance.SubnetId,
        securityGroups: instance.SecurityGroups?.map((sg) => sg.GroupId).filter(
          (id): id is string => id !== undefined
        ) || [],
        publicIp: instance.PublicIpAddress,
        privateIp: instance.PrivateIpAddress,
        monitoring: instance.Monitoring?.State || 'disabled',
        platform: instance.Platform || 'linux',
        imageId: instance.ImageId,
        keyName: instance.KeyName,
        architecture: instance.Architecture,
        rootDeviceType: instance.RootDeviceType,
        virtualizationType: instance.VirtualizationType,
        hypervisor: instance.Hypervisor,
        instanceLifecycle: instance.InstanceLifecycle,
        spotInstanceRequestId: instance.SpotInstanceRequestId,
      },
      createdAt: instance.LaunchTime,
      lastModifiedAt: instance.LaunchTime, // EC2 doesn't track modification time
    };
  }

  /**
   * Extracts tags from AWS EC2 instance and converts to plain object
   *
   * @private
   * @param tags - AWS EC2 tag array
   * @returns Plain object with tag key-value pairs
   */
  private extractTags(tags?: Tag[]): Record<string, string> {
    if (!tags || tags.length === 0) {
      return {};
    }

    const tagObject: Record<string, string> = {};

    for (const tag of tags) {
      if (tag.Key && tag.Value) {
        tagObject[tag.Key] = tag.Value;
      }
    }

    return tagObject;
  }

  /**
   * Builds EC2 API filters from AssetFilters
   *
   * @private
   * @param filters - Asset filters
   * @returns Array of EC2 Filter objects
   */
  private buildEC2Filters(filters?: AssetFilters): Array<{ Name: string; Values: string[] }> {
    const ec2Filters: Array<{ Name: string; Values: string[] }> = [];

    if (!filters) {
      return ec2Filters;
    }

    // Filter by resource type (only include if it's ec2:instance)
    if (filters.resourceType && filters.resourceType !== 'ec2:instance') {
      // Return empty results if filtering for non-EC2 resources
      return [{ Name: 'instance-id', Values: ['none'] }];
    }

    // Filter by status (instance-state-name)
    if (filters.status) {
      ec2Filters.push({
        Name: 'instance-state-name',
        Values: [filters.status],
      });
    }

    // Filter by tags
    if (filters.tags) {
      for (const [key, value] of Object.entries(filters.tags)) {
        ec2Filters.push({
          Name: `tag:${key}`,
          Values: [value],
        });
      }
    }

    return ec2Filters;
  }

  /**
   * Checks if an asset matches the given filters
   * (For filters that can't be applied via AWS API)
   *
   * @private
   * @param asset - CloudAsset to check
   * @param filters - Asset filters
   * @returns True if asset matches all filters
   */
  private matchesFilters(asset: CloudAsset, filters?: AssetFilters): boolean {
    if (!filters) {
      return true;
    }

    // Resource type filter (already handled in buildEC2Filters, but double-check)
    if (filters.resourceType && asset.resourceType !== filters.resourceType) {
      return false;
    }

    // Status filter (already handled in buildEC2Filters, but double-check)
    if (filters.status && asset.status !== filters.status) {
      return false;
    }

    // Tag filters (already handled in buildEC2Filters, but double-check)
    if (filters.tags) {
      for (const [key, value] of Object.entries(filters.tags)) {
        if (asset.tags[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Extracts instance ID from ARN or returns the ID as-is
   *
   * @private
   * @param resourceId - Instance ID or ARN
   * @returns Instance ID
   */
  private extractInstanceId(resourceId: string): string {
    // ARN format: arn:aws:ec2:region:account-id:instance/instance-id
    if (resourceId.startsWith('arn:aws:ec2:')) {
      const parts = resourceId.split('/');
      return parts[parts.length - 1];
    }

    // Already an instance ID
    return resourceId;
  }

  /**
   * Executes an AWS SDK command with retry logic and exponential backoff
   *
   * @private
   * @param operation - Async operation to execute
   * @returns Operation result
   * @throws {Error} If operation fails after all retries
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on authentication/authorization errors
        if (
          lastError.name === 'UnauthorizedOperation' ||
          lastError.name === 'UnrecognizedClientException' ||
          lastError.name === 'InvalidClientTokenId'
        ) {
          throw lastError;
        }

        // Don't retry on invalid parameter errors
        if (lastError.name === 'InvalidParameterValue' || lastError.name === 'ValidationError') {
          throw lastError;
        }

        // Calculate exponential backoff delay
        const delay = this.retryDelay * Math.pow(2, attempt);

        console.warn(
          `[AWSEC2Service] Attempt ${attempt + 1}/${this.maxRetries} failed, retrying in ${delay}ms:`,
          lastError.message
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // All retries exhausted
    throw new Error(
      `Operation failed after ${this.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }
}
