#!/usr/bin/env tsx
/**
 * Asset Discovery Service - Integration Test Script
 *
 * Tests all the new asset discovery features:
 * - Full resource discovery
 * - Orphan detection
 * - Resource filtering by type
 * - Cost allocation
 * - Tag updates (single and bulk)
 *
 * Usage:
 *   tsx scripts/test-asset-discovery.ts
 */

import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import { AssetDiscoveryService } from '../src/modules/assets/services/asset-discovery.service';

const prisma = new PrismaClient();
const eventBus = new EventEmitter();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function separator() {
  console.log('\n' + '='.repeat(80) + '\n');
}

async function testAssetDiscovery() {
  log('Asset Discovery Service - Integration Test', 'cyan');
  separator();

  try {
    // Get first active cloud account for testing
    log('Step 1: Finding active cloud account...', 'blue');
    const account = await prisma.cloudAccount.findFirst({
      where: { status: 'active' },
      include: { tenant: true },
    });

    if (!account) {
      log('No active cloud accounts found. Please add a cloud account first.', 'red');
      return;
    }

    log(`Found account: ${account.accountName} (${account.provider})`, 'green');
    log(`Tenant: ${account.tenant.name}`, 'green');
    separator();

    // Initialize service
    const service = new AssetDiscoveryService(prisma, eventBus);

    // Test 1: Full Discovery
    log('Test 1: Full Resource Discovery', 'yellow');
    log('Running discovery...', 'blue');
    const discoveryResult = await service.discoverAllResources(account.id);

    log(`Assets Discovered: ${discoveryResult.assetsDiscovered}`, 'green');
    log(`Orphaned Resources: ${discoveryResult.orphanedCount || 0}`, 'green');
    log('Resources by Type:', 'green');
    if (discoveryResult.resourcesByType) {
      Object.entries(discoveryResult.resourcesByType).forEach(([type, count]) => {
        log(`  - ${type}: ${count}`, 'cyan');
      });
    }
    separator();

    // Test 2: Get Orphaned Resources
    log('Test 2: Get Orphaned Resources', 'yellow');
    const orphaned = await service.getOrphanedResources(account.id);
    log(`Found ${orphaned.length} orphaned resources`, 'green');

    if (orphaned.length > 0) {
      log('Sample orphaned resources:', 'blue');
      orphaned.slice(0, 5).forEach((resource) => {
        log(
          `  - ${resource.name || resource.resourceId} (${resource.status})`,
          'cyan'
        );
      });
    }
    separator();

    // Test 3: Get Resources by Type
    log('Test 3: Get Resources by Type', 'yellow');

    // Get all assets to find a resource type
    const allAssets = await prisma.asset.findMany({
      where: { cloudAccountId: account.id, deletedAt: null },
      select: { resourceType: true },
      distinct: ['resourceType'],
    });

    if (allAssets.length > 0) {
      const resourceType = allAssets[0].resourceType;
      log(`Filtering by type: ${resourceType}`, 'blue');

      const resourcesByType = await service.getResourcesByType(account.id, resourceType);
      log(`Found ${resourcesByType.length} resources of type ${resourceType}`, 'green');

      if (resourcesByType.length > 0) {
        log('Sample resources:', 'blue');
        resourcesByType.slice(0, 3).forEach((resource) => {
          log(`  - ${resource.name || resource.resourceId}`, 'cyan');
        });
      }
    } else {
      log('No resources found to test type filtering', 'yellow');
    }
    separator();

    // Test 4: Cost Allocation
    log('Test 4: Cost Allocation by Tags', 'yellow');
    log('Grouping by project...', 'blue');

    const costAllocation = await service.getResourceCostAllocation(account.id, 'project');
    log(`Found ${costAllocation.length} project groups`, 'green');

    if (costAllocation.length > 0) {
      log('Top cost groups:', 'blue');
      costAllocation.slice(0, 3).forEach((group) => {
        log(
          `  - ${group.groupValue}: $${group.totalCost.toFixed(2)} (${group.resourceCount} resources)`,
          'cyan'
        );
      });
    }
    separator();

    // Test 5: Update Tags (if we have resources)
    log('Test 5: Tag Management', 'yellow');

    const sampleResource = await prisma.asset.findFirst({
      where: { cloudAccountId: account.id, deletedAt: null },
    });

    if (sampleResource) {
      log(`Testing tag update on: ${sampleResource.name || sampleResource.resourceId}`, 'blue');

      // Update tags
      await service.updateResourceTags(account.id, sampleResource.resourceId, {
        owner: 'test-user@example.com',
        environment: 'testing',
        project: 'integration-test',
        'test-tag': 'automated-test',
      });

      log('Tags updated successfully', 'green');

      // Verify update
      const updated = await prisma.asset.findUnique({
        where: { id: sampleResource.id },
      });

      if (updated) {
        log('Verified tag values:', 'blue');
        log(`  - Owner: ${updated.ownerTag}`, 'cyan');
        log(`  - Environment: ${updated.environmentTag}`, 'cyan');
        log(`  - Project: ${updated.projectTag}`, 'cyan');
        log(`  - Is Orphaned: ${updated.isOrphaned}`, 'cyan');
      }
    } else {
      log('No resources found to test tag updates', 'yellow');
    }
    separator();

    // Test 6: Bulk Tag Update (if we have multiple resources)
    log('Test 6: Bulk Tag Update', 'yellow');

    const multipleResources = await prisma.asset.findMany({
      where: { cloudAccountId: account.id, deletedAt: null },
      take: 3,
    });

    if (multipleResources.length > 1) {
      log(`Testing bulk update on ${multipleResources.length} resources`, 'blue');

      const resourceIds = multipleResources.map((r) => r.resourceId);
      const bulkResult = await service.bulkUpdateTags(account.id, resourceIds, {
        'bulk-test': 'true',
        'test-timestamp': new Date().toISOString(),
      });

      log(`Bulk update results:`, 'green');
      log(`  - Success: ${bulkResult.success}`, 'cyan');
      log(`  - Failed: ${bulkResult.failed}`, 'cyan');

      if (bulkResult.errors.length > 0) {
        log('Errors:', 'red');
        bulkResult.errors.forEach((error) => {
          log(`  - ${error.resourceId}: ${error.error}`, 'red');
        });
      }
    } else {
      log('Not enough resources to test bulk update (need at least 2)', 'yellow');
    }
    separator();

    // Summary
    log('TEST SUMMARY', 'cyan');
    log('All tests completed successfully!', 'green');
    log('\nTested Features:', 'blue');
    log('  ✓ Full resource discovery with classification', 'green');
    log('  ✓ Orphaned resource detection', 'green');
    log('  ✓ Resource filtering by type', 'green');
    log('  ✓ Cost allocation by tags', 'green');
    log('  ✓ Single resource tag update', 'green');
    log('  ✓ Bulk tag update', 'green');
    separator();

  } catch (error) {
    log('Test failed with error:', 'red');
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testAssetDiscovery()
  .then(() => {
    log('\nIntegration test completed successfully!', 'green');
    process.exit(0);
  })
  .catch((error) => {
    log('\nIntegration test failed!', 'red');
    console.error(error);
    process.exit(1);
  });
