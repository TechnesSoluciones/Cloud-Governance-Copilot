/**
 * AWS EC2 Service - Usage Examples
 *
 * This file demonstrates how to use the AWSEC2Service for EC2 instance discovery
 * and asset management.
 *
 * @example
 * DO NOT IMPORT THIS FILE IN PRODUCTION CODE
 * This is for documentation purposes only
 */

import { AWSEC2Service } from './ec2.service';
import type { CloudProviderCredentials, AssetFilters } from '../cloud-provider.interface';

// ============================================================
// Basic Setup
// ============================================================

/**
 * Example 1: Initialize EC2 Service
 */
function initializeEC2Service(): AWSEC2Service {
  const credentials: CloudProviderCredentials = {
    provider: 'aws',
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    awsRegion: process.env.AWS_REGION || 'us-east-1',
  };

  return new AWSEC2Service(credentials);
}

// ============================================================
// Discovery Examples
// ============================================================

/**
 * Example 2: Discover all EC2 instances in configured region
 */
async function discoverAllInstances() {
  const ec2Service = initializeEC2Service();

  const assets = await ec2Service.discoverAssets();

  console.log(`Found ${assets.length} EC2 instances`);
  assets.forEach((asset) => {
    console.log(`- ${asset.name} (${asset.resourceId}): ${asset.status}`);
  });

  return assets;
}

/**
 * Example 3: Discover instances in specific region
 */
async function discoverInSpecificRegion() {
  const ec2Service = initializeEC2Service();

  const filters: AssetFilters = {
    region: 'us-west-2',
  };

  const assets = await ec2Service.discoverAssets(filters);

  console.log(`Found ${assets.length} instances in us-west-2`);
  return assets;
}

/**
 * Example 4: Filter by instance status
 */
async function discoverRunningInstances() {
  const ec2Service = initializeEC2Service();

  const filters: AssetFilters = {
    status: 'running',
  };

  const assets = await ec2Service.discoverAssets(filters);

  console.log(`Found ${assets.length} running instances`);
  return assets;
}

/**
 * Example 5: Filter by tags
 */
async function discoverProductionInstances() {
  const ec2Service = initializeEC2Service();

  const filters: AssetFilters = {
    tags: {
      Environment: 'production',
      Project: 'cloud-copilot',
    },
  };

  const assets = await ec2Service.discoverAssets(filters);

  console.log(`Found ${assets.length} production instances`);
  return assets;
}

/**
 * Example 6: Combined filters
 */
async function discoverWithMultipleFilters() {
  const ec2Service = initializeEC2Service();

  const filters: AssetFilters = {
    region: 'us-east-1',
    status: 'running',
    tags: {
      Environment: 'production',
    },
  };

  const assets = await ec2Service.discoverAssets(filters);

  console.log(`Found ${assets.length} running production instances in us-east-1`);
  return assets;
}

/**
 * Example 7: Discover in all AWS regions
 *
 * Note: This can take several minutes to complete
 */
async function discoverInAllRegions() {
  const ec2Service = initializeEC2Service();

  console.log('Starting multi-region discovery (this may take several minutes)...');

  const assets = await ec2Service.discoverInAllRegions();

  console.log(`Found ${assets.length} instances across all regions`);

  // Group by region
  const byRegion = assets.reduce((acc, asset) => {
    acc[asset.region] = (acc[asset.region] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('Instances by region:');
  Object.entries(byRegion).forEach(([region, count]) => {
    console.log(`  ${region}: ${count}`);
  });

  return assets;
}

// ============================================================
// Asset Details Examples
// ============================================================

/**
 * Example 8: Get details for specific instance
 */
async function getInstanceDetails() {
  const ec2Service = initializeEC2Service();

  const instanceId = 'i-1234567890abcdef0';
  const asset = await ec2Service.getAssetDetails(instanceId);

  if (asset) {
    console.log('Instance Details:');
    console.log(`  Name: ${asset.name}`);
    console.log(`  Type: ${asset.metadata.instanceType}`);
    console.log(`  Status: ${asset.status}`);
    console.log(`  VPC: ${asset.metadata.vpcId}`);
    console.log(`  Public IP: ${asset.metadata.publicIp || 'N/A'}`);
    console.log(`  Private IP: ${asset.metadata.privateIp || 'N/A'}`);
    console.log(`  Security Groups: ${asset.metadata.securityGroups.join(', ')}`);
    console.log(`  Monitoring: ${asset.metadata.monitoring}`);
    console.log(`  Platform: ${asset.metadata.platform}`);
    console.log(`  Launched: ${asset.createdAt?.toISOString()}`);
  } else {
    console.log(`Instance ${instanceId} not found`);
  }

  return asset;
}

/**
 * Example 9: Get instance details using ARN
 */
async function getInstanceDetailsByARN() {
  const ec2Service = initializeEC2Service();

  const arn = 'arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0';
  const asset = await ec2Service.getAssetDetails(arn);

  if (asset) {
    console.log(`Found instance: ${asset.name}`);
  }

  return asset;
}

// ============================================================
// Advanced Usage Examples
// ============================================================

/**
 * Example 10: Process assets by status
 */
async function processAssetsByStatus() {
  const ec2Service = initializeEC2Service();
  const assets = await ec2Service.discoverAssets();

  const grouped = assets.reduce((acc, asset) => {
    acc[asset.status] = acc[asset.status] || [];
    acc[asset.status].push(asset);
    return acc;
  }, {} as Record<string, typeof assets>);

  console.log('Instances by status:');
  Object.entries(grouped).forEach(([status, instances]) => {
    console.log(`  ${status}: ${instances.length}`);
  });

  return grouped;
}

/**
 * Example 11: Find instances without required tags
 */
async function findUntaggedInstances() {
  const ec2Service = initializeEC2Service();
  const assets = await ec2Service.discoverAssets();

  const requiredTags = ['Environment', 'Project', 'Owner'];

  const untagged = assets.filter((asset) => {
    return requiredTags.some((tag) => !asset.tags[tag]);
  });

  console.log(`Found ${untagged.length} instances missing required tags`);
  untagged.forEach((asset) => {
    const missingTags = requiredTags.filter((tag) => !asset.tags[tag]);
    console.log(`  ${asset.name}: Missing ${missingTags.join(', ')}`);
  });

  return untagged;
}

/**
 * Example 12: Calculate total instances by type
 */
async function calculateInstancesByType() {
  const ec2Service = initializeEC2Service();
  const assets = await ec2Service.discoverAssets();

  const byType = assets.reduce((acc, asset) => {
    const type = asset.metadata.instanceType as string;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('Instances by type:');
  Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  return byType;
}

/**
 * Example 13: Find instances in default VPC
 */
async function findDefaultVPCInstances() {
  const ec2Service = initializeEC2Service();
  const assets = await ec2Service.discoverAssets();

  const defaultVPC = assets.filter((asset) => {
    const vpcId = asset.metadata.vpcId as string;
    // Default VPCs typically have a specific naming pattern
    // This is a simplified check - in production you'd want to query VPC details
    return vpcId && vpcId.includes('default');
  });

  console.log(`Found ${defaultVPC.length} instances in default VPC`);
  return defaultVPC;
}

/**
 * Example 14: Error handling
 */
async function handleErrors() {
  try {
    const ec2Service = initializeEC2Service();
    const assets = await ec2Service.discoverAssets();
    console.log(`Successfully discovered ${assets.length} instances`);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('UnauthorizedOperation')) {
        console.error('AWS credentials lack required permissions');
      } else if (error.message.includes('InvalidClientTokenId')) {
        console.error('Invalid AWS credentials');
      } else {
        console.error('Error discovering assets:', error.message);
      }
    }
  }
}

// ============================================================
// Export examples (for documentation only)
// ============================================================

export const examples = {
  // Setup
  initializeEC2Service,

  // Discovery
  discoverAllInstances,
  discoverInSpecificRegion,
  discoverRunningInstances,
  discoverProductionInstances,
  discoverWithMultipleFilters,
  discoverInAllRegions,

  // Asset Details
  getInstanceDetails,
  getInstanceDetailsByARN,

  // Advanced
  processAssetsByStatus,
  findUntaggedInstances,
  calculateInstancesByType,
  findDefaultVPCInstances,
  handleErrors,
};
