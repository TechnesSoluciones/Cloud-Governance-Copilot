/**
 * Azure Compute Service - Usage Examples
 *
 * This file demonstrates how to use the AzureComputeService for Virtual Machine discovery
 * and asset management.
 *
 * @example
 * DO NOT IMPORT THIS FILE IN PRODUCTION CODE
 * This is for documentation purposes only
 */

import { AzureComputeService } from './compute.service';
import type { CloudProviderCredentials, AssetFilters } from '../cloud-provider.interface';

// ============================================================
// Basic Setup
// ============================================================

/**
 * Example 1: Initialize Azure Compute Service
 */
function initializeComputeService(): AzureComputeService {
  const credentials: CloudProviderCredentials = {
    provider: 'azure',
    azureClientId: process.env.AZURE_CLIENT_ID!,
    azureClientSecret: process.env.AZURE_CLIENT_SECRET!,
    azureTenantId: process.env.AZURE_TENANT_ID!,
    azureSubscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
  };

  return new AzureComputeService(credentials);
}

// ============================================================
// Discovery Examples
// ============================================================

/**
 * Example 2: Discover all Virtual Machines in configured subscription
 */
async function discoverAllVMs() {
  const computeService = initializeComputeService();

  const assets = await computeService.discoverAssets();

  console.log(`Found ${assets.length} Virtual Machines`);
  assets.forEach((asset) => {
    console.log(`- ${asset.name} (${asset.resourceId}): ${asset.status}`);
  });

  return assets;
}

/**
 * Example 3: Discover VMs in specific region (location)
 */
async function discoverInSpecificRegion() {
  const computeService = initializeComputeService();

  const filters: AssetFilters = {
    region: 'eastus',
  };

  const assets = await computeService.discoverAssets(filters);

  console.log(`Found ${assets.length} VMs in eastus`);
  return assets;
}

/**
 * Example 4: Filter by VM status
 */
async function discoverRunningVMs() {
  const computeService = initializeComputeService();

  const filters: AssetFilters = {
    status: 'running',
  };

  const assets = await computeService.discoverAssets(filters);

  console.log(`Found ${assets.length} running VMs`);
  return assets;
}

/**
 * Example 5: Filter by tags
 */
async function discoverProductionVMs() {
  const computeService = initializeComputeService();

  const filters: AssetFilters = {
    tags: {
      Environment: 'production',
      Project: 'cloud-copilot',
    },
  };

  const assets = await computeService.discoverAssets(filters);

  console.log(`Found ${assets.length} production VMs`);
  return assets;
}

/**
 * Example 6: Combined filters
 */
async function discoverWithMultipleFilters() {
  const computeService = initializeComputeService();

  const filters: AssetFilters = {
    region: 'eastus',
    status: 'running',
    tags: {
      Environment: 'production',
    },
  };

  const assets = await computeService.discoverAssets(filters);

  console.log(`Found ${assets.length} running production VMs in eastus`);
  return assets;
}

/**
 * Example 7: Discover VMs across multiple subscriptions
 *
 * Note: The service principal must have access to all subscriptions
 */
async function discoverInMultipleSubscriptions() {
  const computeService = initializeComputeService();

  const subscriptionIds = [
    'subscription-id-1',
    'subscription-id-2',
    'subscription-id-3',
  ];

  console.log('Starting multi-subscription discovery...');

  const assets = await computeService.discoverInAllSubscriptions(subscriptionIds);

  console.log(`Found ${assets.length} VMs across ${subscriptionIds.length} subscriptions`);

  // Group by subscription
  const bySubscription = assets.reduce((acc, asset) => {
    const subId = asset.metadata.subscriptionId as string;
    acc[subId] = (acc[subId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('VMs by subscription:');
  Object.entries(bySubscription).forEach(([subId, count]) => {
    console.log(`  ${subId}: ${count}`);
  });

  return assets;
}

// ============================================================
// Asset Details Examples
// ============================================================

/**
 * Example 8: Get details for specific VM
 */
async function getVMDetails() {
  const computeService = initializeComputeService();

  const resourceId =
    '/subscriptions/sub-id/resourceGroups/my-rg/providers/Microsoft.Compute/virtualMachines/my-vm';

  const asset = await computeService.getAssetDetails(resourceId);

  if (asset) {
    console.log('VM Details:');
    console.log(`  Name: ${asset.name}`);
    console.log(`  VM Size: ${asset.metadata.vmSize}`);
    console.log(`  Status: ${asset.status}`);
    console.log(`  Power State: ${asset.metadata.powerState}`);
    console.log(`  OS Type: ${asset.metadata.osType}`);
    console.log(`  Resource Group: ${asset.metadata.resourceGroup}`);
    console.log(`  Location: ${asset.region}`);
    console.log(`  Availability Zone: ${asset.zone || 'N/A'}`);
    console.log(`  OS Disk Size: ${asset.metadata.osDiskSize} GB`);
    console.log(`  Data Disks: ${asset.metadata.dataDisks.length}`);
    console.log(`  Provisioning State: ${asset.metadata.provisioningState}`);
    console.log(`  Created: ${asset.createdAt?.toISOString()}`);
  } else {
    console.log(`VM ${resourceId} not found`);
  }

  return asset;
}

/**
 * Example 9: Discover and process VM details
 */
async function discoverAndProcessVMDetails() {
  const computeService = initializeComputeService();

  const assets = await computeService.discoverAssets({ region: 'eastus' });

  console.log(`Processing ${assets.length} VMs...`);

  for (const asset of assets.slice(0, 5)) {
    // Process first 5 for demo
    const details = await computeService.getAssetDetails(asset.resourceId);
    if (details) {
      console.log(
        `${details.name}: ${details.metadata.vmSize} - ${details.metadata.osType}`
      );
    }
  }
}

// ============================================================
// Advanced Usage Examples
// ============================================================

/**
 * Example 10: Process VMs by status
 */
async function processVMsByStatus() {
  const computeService = initializeComputeService();
  const assets = await computeService.discoverAssets();

  const grouped = assets.reduce((acc, asset) => {
    acc[asset.status] = acc[asset.status] || [];
    acc[asset.status].push(asset);
    return acc;
  }, {} as Record<string, typeof assets>);

  console.log('VMs by status:');
  Object.entries(grouped).forEach(([status, vms]) => {
    console.log(`  ${status}: ${vms.length}`);
  });

  return grouped;
}

/**
 * Example 11: Find VMs without required tags
 */
async function findUntaggedVMs() {
  const computeService = initializeComputeService();
  const assets = await computeService.discoverAssets();

  const requiredTags = ['Environment', 'Project', 'Owner', 'CostCenter'];

  const untagged = assets.filter((asset) => {
    return requiredTags.some((tag) => !asset.tags[tag]);
  });

  console.log(`Found ${untagged.length} VMs missing required tags`);
  untagged.forEach((asset) => {
    const missingTags = requiredTags.filter((tag) => !asset.tags[tag]);
    console.log(
      `  ${asset.name} (${asset.metadata.resourceGroup}): Missing ${missingTags.join(', ')}`
    );
  });

  return untagged;
}

/**
 * Example 12: Calculate total VMs by size
 */
async function calculateVMsBySize() {
  const computeService = initializeComputeService();
  const assets = await computeService.discoverAssets();

  const bySize = assets.reduce((acc, asset) => {
    const size = asset.metadata.vmSize as string;
    acc[size] = (acc[size] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('VMs by size:');
  Object.entries(bySize)
    .sort((a, b) => b[1] - a[1])
    .forEach(([size, count]) => {
      console.log(`  ${size}: ${count}`);
    });

  return bySize;
}

/**
 * Example 13: Group VMs by resource group
 */
async function groupVMsByResourceGroup() {
  const computeService = initializeComputeService();
  const assets = await computeService.discoverAssets();

  const byResourceGroup = assets.reduce((acc, asset) => {
    const rg = asset.metadata.resourceGroup as string;
    acc[rg] = acc[rg] || [];
    acc[rg].push(asset);
    return acc;
  }, {} as Record<string, typeof assets>);

  console.log('VMs by resource group:');
  Object.entries(byResourceGroup)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([rg, vms]) => {
      console.log(`  ${rg}: ${vms.length} VMs`);
    });

  return byResourceGroup;
}

/**
 * Example 14: Find VMs with specific OS type
 */
async function findLinuxVMs() {
  const computeService = initializeComputeService();
  const assets = await computeService.discoverAssets();

  const linuxVMs = assets.filter((asset) => {
    const osType = (asset.metadata.osType as string)?.toLowerCase();
    return osType === 'linux';
  });

  console.log(`Found ${linuxVMs.length} Linux VMs`);
  return linuxVMs;
}

/**
 * Example 15: Find VMs in availability zones
 */
async function findZonalVMs() {
  const computeService = initializeComputeService();
  const assets = await computeService.discoverAssets();

  const zonalVMs = assets.filter((asset) => asset.zone);

  console.log(`Found ${zonalVMs.length} VMs with availability zones`);

  const byZone = zonalVMs.reduce((acc, asset) => {
    const zone = asset.zone!;
    acc[zone] = (acc[zone] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('VMs by zone:');
  Object.entries(byZone).forEach(([zone, count]) => {
    console.log(`  Zone ${zone}: ${count}`);
  });

  return zonalVMs;
}

/**
 * Example 16: Analyze disk configuration
 */
async function analyzeDiskConfiguration() {
  const computeService = initializeComputeService();
  const assets = await computeService.discoverAssets();

  const diskStats = {
    totalVMs: assets.length,
    avgOSDiskSize: 0,
    avgDataDisks: 0,
    vmsWithDataDisks: 0,
  };

  let totalOSDiskSize = 0;
  let totalDataDisks = 0;

  assets.forEach((asset) => {
    const osDiskSize = asset.metadata.osDiskSize as number;
    const dataDisks = asset.metadata.dataDisks as any[];

    if (osDiskSize) {
      totalOSDiskSize += osDiskSize;
    }

    if (dataDisks && dataDisks.length > 0) {
      diskStats.vmsWithDataDisks++;
      totalDataDisks += dataDisks.length;
    }
  });

  diskStats.avgOSDiskSize = totalOSDiskSize / assets.length;
  diskStats.avgDataDisks = totalDataDisks / assets.length;

  console.log('Disk Configuration Analysis:');
  console.log(`  Total VMs: ${diskStats.totalVMs}`);
  console.log(`  Avg OS Disk Size: ${diskStats.avgOSDiskSize.toFixed(2)} GB`);
  console.log(`  VMs with Data Disks: ${diskStats.vmsWithDataDisks}`);
  console.log(`  Avg Data Disks per VM: ${diskStats.avgDataDisks.toFixed(2)}`);

  return diskStats;
}

/**
 * Example 17: Find stopped VMs (cost optimization opportunity)
 */
async function findStoppedVMs() {
  const computeService = initializeComputeService();
  const assets = await computeService.discoverAssets({ status: 'stopped' });

  console.log(`Found ${assets.length} stopped VMs (potential cost savings)`);

  assets.forEach((asset) => {
    console.log(
      `  ${asset.name}: ${asset.metadata.vmSize} in ${asset.metadata.resourceGroup}`
    );
  });

  return assets;
}

/**
 * Example 18: Multi-subscription discovery with filters
 */
async function multiSubscriptionFilteredDiscovery() {
  const computeService = initializeComputeService();

  const subscriptionIds = ['sub-1', 'sub-2', 'sub-3'];

  const filters: AssetFilters = {
    status: 'running',
    tags: {
      Environment: 'production',
    },
  };

  const assets = await computeService.discoverInAllSubscriptions(subscriptionIds, filters);

  console.log(
    `Found ${assets.length} running production VMs across ${subscriptionIds.length} subscriptions`
  );

  return assets;
}

/**
 * Example 19: Error handling
 */
async function handleErrors() {
  try {
    const computeService = initializeComputeService();
    const assets = await computeService.discoverAssets();
    console.log(`Successfully discovered ${assets.length} VMs`);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('AuthenticationFailed')) {
        console.error('Azure authentication failed - check credentials');
      } else if (error.message.includes('AuthorizationFailed')) {
        console.error('Azure service principal lacks required permissions');
      } else if (error.message.includes('SubscriptionNotFound')) {
        console.error('Azure subscription not found or not accessible');
      } else {
        console.error('Error discovering assets:', error.message);
      }
    }
  }
}

/**
 * Example 20: Compare regions
 */
async function compareRegions() {
  const computeService = initializeComputeService();
  const assets = await computeService.discoverAssets();

  const byRegion = assets.reduce((acc, asset) => {
    acc[asset.region] = acc[asset.region] || [];
    acc[asset.region].push(asset);
    return acc;
  }, {} as Record<string, typeof assets>);

  console.log('Regional Distribution:');
  Object.entries(byRegion)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([region, vms]) => {
      const running = vms.filter((vm) => vm.status === 'running').length;
      console.log(`  ${region}: ${vms.length} total (${running} running)`);
    });

  return byRegion;
}

// ============================================================
// Export examples (for documentation only)
// ============================================================

export const examples = {
  // Setup
  initializeComputeService,

  // Discovery
  discoverAllVMs,
  discoverInSpecificRegion,
  discoverRunningVMs,
  discoverProductionVMs,
  discoverWithMultipleFilters,
  discoverInMultipleSubscriptions,

  // Asset Details
  getVMDetails,
  discoverAndProcessVMDetails,

  // Advanced
  processVMsByStatus,
  findUntaggedVMs,
  calculateVMsBySize,
  groupVMsByResourceGroup,
  findLinuxVMs,
  findZonalVMs,
  analyzeDiskConfiguration,
  findStoppedVMs,
  multiSubscriptionFilteredDiscovery,
  compareRegions,
  handleErrors,
};
