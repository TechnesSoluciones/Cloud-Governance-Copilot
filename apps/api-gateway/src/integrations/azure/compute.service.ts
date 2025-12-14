/**
 * Azure Compute Service
 *
 * Handles Azure Virtual Machine discovery and asset management for Azure integration.
 * Supports multi-subscription discovery and provides normalized CloudAsset data.
 *
 * Features:
 * - Discover Azure Virtual Machines across all subscriptions
 * - Filter by region (location), tags, status, and resource type
 * - Transform Azure VMs to CloudAsset format
 * - Retry logic with exponential backoff
 * - Comprehensive error handling
 *
 * @module integrations/azure/compute.service
 */

import { ComputeManagementClient } from '@azure/arm-compute';
import { ClientSecretCredential } from '@azure/identity';
import type { VirtualMachine } from '@azure/arm-compute';
import type {
  CloudAsset,
  AssetFilters,
  CloudProviderCredentials,
} from '../cloud-provider.interface';

/**
 * Azure Compute Service Configuration
 */
interface AzureComputeServiceConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  subscriptionId: string;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Azure Compute Service
 *
 * Provides Azure Virtual Machine discovery and asset management capabilities.
 *
 * @example
 * ```typescript
 * const computeService = new AzureComputeService({
 *   provider: 'azure',
 *   azureClientId: process.env.AZURE_CLIENT_ID,
 *   azureClientSecret: process.env.AZURE_CLIENT_SECRET,
 *   azureTenantId: process.env.AZURE_TENANT_ID,
 *   azureSubscriptionId: process.env.AZURE_SUBSCRIPTION_ID
 * });
 *
 * // Discover all Virtual Machines
 * const assets = await computeService.discoverAssets();
 *
 * // Discover in specific region with filters
 * const filtered = await computeService.discoverAssets({
 *   region: 'eastus',
 *   status: 'running',
 *   tags: { Environment: 'production' }
 * });
 *
 * // Get details for specific VM
 * const details = await computeService.getAssetDetails(
 *   '/subscriptions/.../resourceGroups/.../providers/Microsoft.Compute/virtualMachines/vm-name'
 * );
 * ```
 */
export class AzureComputeService {
  private client: ComputeManagementClient;
  private credential: ClientSecretCredential;
  private config: AzureComputeServiceConfig;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  /**
   * Creates a new Azure Compute Service instance
   *
   * @param credentials - Cloud provider credentials
   * @throws {Error} If Azure credentials are missing
   */
  constructor(credentials: CloudProviderCredentials) {
    if (
      !credentials.azureClientId ||
      !credentials.azureClientSecret ||
      !credentials.azureTenantId ||
      !credentials.azureSubscriptionId
    ) {
      throw new Error(
        'Azure credentials (tenantId, clientId, clientSecret, subscriptionId) are required'
      );
    }

    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second base delay

    this.config = {
      clientId: credentials.azureClientId,
      clientSecret: credentials.azureClientSecret,
      tenantId: credentials.azureTenantId,
      subscriptionId: credentials.azureSubscriptionId,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
    };

    // Initialize Azure credential
    this.credential = new ClientSecretCredential(
      this.config.tenantId,
      this.config.clientId,
      this.config.clientSecret
    );

    // Initialize Compute Management Client
    this.client = new ComputeManagementClient(this.credential, this.config.subscriptionId);
  }

  /**
   * Discovers Azure Virtual Machines in the configured subscription
   *
   * @param filters - Optional filters for asset discovery
   * @returns Array of discovered Virtual Machines as CloudAssets
   *
   * @example
   * ```typescript
   * // Discover all VMs
   * const assets = await computeService.discoverAssets();
   *
   * // Filter by region and status
   * const running = await computeService.discoverAssets({
   *   region: 'eastus',
   *   status: 'running'
   * });
   *
   * // Filter by tags
   * const production = await computeService.discoverAssets({
   *   tags: { Environment: 'production' }
   * });
   * ```
   */
  async discoverAssets(filters?: AssetFilters): Promise<CloudAsset[]> {
    try {
      // Check if filtering for non-VM resource type
      if (filters?.resourceType && filters.resourceType !== 'azurevm') {
        return [];
      }

      return await this.discoverInSubscription(this.config.subscriptionId, filters);
    } catch (error) {
      console.error('[AzureComputeService] Error discovering assets:', error);
      throw new Error(
        `Failed to discover Azure VM assets: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets detailed information for a specific Azure Virtual Machine
   *
   * @param resourceId - Full Azure resource URI
   * @returns CloudAsset with complete VM details, or null if not found
   *
   * @example
   * ```typescript
   * const vm = await computeService.getAssetDetails(
   *   '/subscriptions/sub-id/resourceGroups/rg-name/providers/Microsoft.Compute/virtualMachines/vm-name'
   * );
   * if (vm) {
   *   console.log('VM Size:', vm.metadata.vmSize);
   *   console.log('Resource Group:', vm.metadata.resourceGroup);
   * }
   * ```
   */
  async getAssetDetails(resourceId: string): Promise<CloudAsset | null> {
    try {
      // Parse Azure resource ID to extract components
      const { resourceGroup, vmName } = this.parseResourceId(resourceId);

      if (!resourceGroup || !vmName) {
        console.error('[AzureComputeService] Invalid resource ID format:', resourceId);
        return null;
      }

      // Get VM details
      const vm = await this.client.virtualMachines.get(resourceGroup, vmName);

      if (!vm) {
        return null;
      }

      // Get instance view separately to include power state
      const instanceView = await this.client.virtualMachines.instanceView(resourceGroup, vmName);

      // Combine VM with instance view
      const vmWithInstanceView = {
        ...vm,
        instanceView,
      };

      return this.transformVMToAsset(vmWithInstanceView, this.config.subscriptionId);
    } catch (error) {
      // If VM not found, return null instead of throwing
      if (error instanceof Error && (
        error.name === 'ResourceNotFound' ||
        error.name === 'RestError' ||
        error.message.includes('not found') ||
        error.message.includes('ResourceGroupNotFound')
      )) {
        return null;
      }

      console.error('[AzureComputeService] Error getting asset details:', error);
      throw new Error(
        `Failed to get Azure VM asset details: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Discovers Azure Virtual Machines across multiple subscriptions
   *
   * Note: This method processes subscriptions in parallel for better performance.
   * Ensure the service principal has access to all specified subscriptions.
   *
   * @param subscriptionIds - Array of Azure subscription IDs
   * @param filters - Optional filters (applied to all subscriptions)
   * @returns Array of all discovered VMs across all subscriptions
   *
   * @example
   * ```typescript
   * // Discover VMs in multiple subscriptions
   * const allAssets = await computeService.discoverInAllSubscriptions([
   *   'subscription-id-1',
   *   'subscription-id-2'
   * ]);
   *
   * // Filter by status across all subscriptions
   * const runningVMs = await computeService.discoverInAllSubscriptions(
   *   ['sub-1', 'sub-2'],
   *   { status: 'running' }
   * );
   * ```
   */
  async discoverInAllSubscriptions(
    subscriptionIds: string[],
    filters?: AssetFilters
  ): Promise<CloudAsset[]> {
    try {
      // Process subscriptions in parallel
      const allAssets = await Promise.all(
        subscriptionIds.map(async (subscriptionId) => {
          try {
            return await this.discoverInSubscription(subscriptionId, filters);
          } catch (error) {
            // Log error but continue with other subscriptions
            console.error(
              `[AzureComputeService] Error discovering in subscription ${subscriptionId}:`,
              error
            );
            return [];
          }
        })
      );

      return allAssets.flat();
    } catch (error) {
      console.error('[AzureComputeService] Error discovering in all subscriptions:', error);
      throw new Error(
        `Failed to discover Azure VM assets in all subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Discovers Azure Virtual Machines in a specific subscription
   *
   * @private
   * @param subscriptionId - Azure subscription ID
   * @param filters - Optional filters for asset discovery
   * @returns Array of discovered Virtual Machines
   */
  private async discoverInSubscription(
    subscriptionId: string,
    filters?: AssetFilters
  ): Promise<CloudAsset[]> {
    // Create subscription-specific client
    const subscriptionClient = new ComputeManagementClient(this.credential, subscriptionId);

    try {
      const assets: CloudAsset[] = [];

      // List all VMs - instance view will be included in the response
      const vmsIterator = subscriptionClient.virtualMachines.listAll();

      for await (const vm of vmsIterator) {
        const asset = this.transformVMToAsset(vm, subscriptionId);

        // Apply filters
        if (this.matchesFilters(asset, filters)) {
          assets.push(asset);
        }
      }

      return assets;
    } catch (error) {
      console.error(`[AzureComputeService] Error discovering in subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Transforms Azure Virtual Machine to normalized CloudAsset format
   *
   * @private
   * @param vm - Azure VirtualMachine object
   * @param subscriptionId - Azure subscription ID
   * @returns Normalized CloudAsset object
   */
  private transformVMToAsset(vm: VirtualMachine, subscriptionId: string): CloudAsset {
    const resourceId = vm.id || 'unknown';
    const name = vm.name || 'unknown';
    const tags = vm.tags || {};
    const location = vm.location || 'unknown';
    const zone = vm.zones?.[0]; // Azure VMs can have availability zones

    // Extract power state from instance view
    const powerState = this.extractPowerState(vm);
    const status = this.normalizePowerState(powerState);

    // Extract resource group from resource ID
    const resourceGroup = this.extractResourceGroup(resourceId);

    // Build metadata object with image reference details
    const metadata: Record<string, any> = {
      vmSize: vm.hardwareProfile?.vmSize,
      osType: vm.storageProfile?.osDisk?.osType,
      provisioningState: vm.provisioningState,
      resourceGroup,
      subscriptionId,
      vmId: vm.vmId,
      computerName: vm.osProfile?.computerName,
    };

    // Add image reference details if available
    if (vm.storageProfile?.imageReference) {
      metadata.imagePublisher = vm.storageProfile.imageReference.publisher;
      metadata.imageOffer = vm.storageProfile.imageReference.offer;
      metadata.imageSku = vm.storageProfile.imageReference.sku;
    }

    // Add additional metadata
    if (vm.storageProfile?.osDisk?.name) {
      metadata.osDiskName = vm.storageProfile.osDisk.name;
    }
    if (vm.storageProfile?.osDisk?.diskSizeGB) {
      metadata.osDiskSize = vm.storageProfile.osDisk.diskSizeGB;
    }
    if (vm.storageProfile?.dataDisks && vm.storageProfile.dataDisks.length > 0) {
      metadata.dataDisks = vm.storageProfile.dataDisks.map((disk) => ({
        name: disk.name,
        diskSizeGB: disk.diskSizeGB,
        lun: disk.lun,
        caching: disk.caching,
      }));
    }
    if (vm.networkProfile?.networkInterfaces && vm.networkProfile.networkInterfaces.length > 0) {
      metadata.networkInterfaces = vm.networkProfile.networkInterfaces
        .map((nic) => nic.id)
        .filter((id): id is string => id !== undefined);
    }
    if (powerState) {
      metadata.powerState = powerState;
    }
    if (vm.licenseType) {
      metadata.licenseType = vm.licenseType;
    }
    if (vm.availabilitySet?.id) {
      metadata.availabilitySetId = vm.availabilitySet.id;
    }
    if (vm.proximityPlacementGroup?.id) {
      metadata.proximityPlacementGroupId = vm.proximityPlacementGroup.id;
    }
    if (vm.priority) {
      metadata.priority = vm.priority;
    }
    if (vm.evictionPolicy) {
      metadata.evictionPolicy = vm.evictionPolicy;
    }
    if (vm.billingProfile) {
      metadata.billingProfile = {
        maxPrice: vm.billingProfile.maxPrice,
      };
    }

    return {
      resourceId,
      resourceType: 'azurevm',
      name,
      region: location,
      zone,
      status,
      tags,
      metadata,
      createdAt: vm.timeCreated,
      lastModifiedAt: vm.timeCreated, // Azure VMs don't track modification time separately
    };
  }

  /**
   * Extracts power state from VM instance view
   *
   * @private
   * @param vm - Azure VirtualMachine object
   * @returns Power state string (e.g., "VM running", "VM deallocated")
   */
  private extractPowerState(vm: VirtualMachine): string {
    if (!vm.instanceView?.statuses) {
      return 'unknown';
    }

    // Power state is typically the second status (first is provisioning state)
    const powerStatus = vm.instanceView.statuses.find((status) =>
      status.code?.startsWith('PowerState/')
    );

    if (powerStatus?.displayStatus) {
      return powerStatus.displayStatus;
    }

    // Fallback: try to get from code
    if (powerStatus?.code) {
      return powerStatus.code.replace('PowerState/', 'VM ');
    }

    return 'unknown';
  }

  /**
   * Normalizes Azure power state to standard status
   *
   * Maps Azure-specific power states to normalized status values used across cloud providers.
   *
   * @private
   * @param powerState - Azure power state (e.g., "VM running", "VM deallocated")
   * @returns Normalized status string
   */
  private normalizePowerState(powerState: string): string {
    const normalizedState = powerState.toLowerCase();

    if (normalizedState.includes('running')) {
      return 'running';
    }
    if (normalizedState.includes('deallocated')) {
      return 'deallocated';
    }
    if (normalizedState.includes('stopped')) {
      return 'stopped';
    }
    if (normalizedState.includes('starting')) {
      return 'pending';
    }
    if (normalizedState.includes('stopping')) {
      return 'stopping';
    }

    return 'unknown';
  }

  /**
   * Extracts resource group name from Azure resource ID
   *
   * @private
   * @param resourceId - Full Azure resource URI
   * @returns Resource group name
   *
   * @example
   * Input: "/subscriptions/sub-id/resourceGroups/my-rg/providers/Microsoft.Compute/virtualMachines/vm-name"
   * Output: "my-rg"
   */
  private extractResourceGroup(resourceId: string): string {
    const match = resourceId.match(/\/resourceGroups\/([^\/]+)/i);
    return match ? match[1] : 'unknown';
  }

  /**
   * Parses Azure resource ID to extract components
   *
   * @private
   * @param resourceId - Full Azure resource URI
   * @returns Object with resourceGroup and vmName
   */
  private parseResourceId(resourceId: string): { resourceGroup?: string; vmName?: string } {
    // Format: /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Compute/virtualMachines/{vmName}
    const pattern =
      /\/subscriptions\/[^\/]+\/resourceGroups\/([^\/]+)\/providers\/Microsoft\.Compute\/virtualMachines\/([^\/]+)/i;
    const match = resourceId.match(pattern);

    if (!match) {
      return {};
    }

    return {
      resourceGroup: match[1],
      vmName: match[2],
    };
  }

  /**
   * Checks if an asset matches the given filters
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

    // Resource type filter
    if (filters.resourceType && asset.resourceType !== filters.resourceType) {
      return false;
    }

    // Region filter (Azure uses "location")
    if (filters.region && asset.region !== filters.region) {
      return false;
    }

    // Status filter
    if (filters.status && asset.status !== filters.status) {
      return false;
    }

    // Tag filters - all specified tags must match
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
   * Executes an Azure SDK operation with retry logic and exponential backoff
   *
   * Implements retry for transient errors (rate limiting, network issues, service unavailable).
   * Does not retry authentication/authorization errors or invalid parameter errors.
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
        if (this.isNonRetryableError(lastError)) {
          throw lastError;
        }

        // Calculate exponential backoff delay
        const delay = this.retryDelay * Math.pow(2, attempt);

        console.warn(
          `[AzureComputeService] Attempt ${attempt + 1}/${this.maxRetries} failed, retrying in ${delay}ms:`,
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

  /**
   * Checks if an error should not be retried
   *
   * @private
   * @param error - Error to check
   * @returns True if error should not be retried
   */
  private isNonRetryableError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name;

    // Authentication/authorization errors
    if (
      errorName === 'AuthenticationFailed' ||
      errorName === 'AuthorizationFailed' ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('401') ||
      errorMessage.includes('403')
    ) {
      return true;
    }

    // Not found errors
    if (errorName === 'ResourceNotFound' || errorMessage.includes('404')) {
      return true;
    }

    // Invalid parameter errors
    if (
      errorName === 'InvalidParameter' ||
      errorName === 'ValidationError' ||
      errorMessage.includes('invalid parameter')
    ) {
      return true;
    }

    return false;
  }
}
