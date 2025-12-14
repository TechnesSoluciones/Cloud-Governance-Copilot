/**
 * Recommendation Generator Service - Usage Examples
 *
 * This file demonstrates how to use the RecommendationGeneratorService
 * to generate cost optimization recommendations for cloud accounts.
 *
 * @module FinOps/Examples
 */

import { PrismaClient } from '@prisma/client';
import { RecommendationGeneratorService } from './recommendation-generator.service';
import { eventBus } from '../../../shared/events/event-bus';

// ============================================================
// Example 1: Generate Recommendations for All Tenant Accounts
// ============================================================

/**
 * Generate recommendations for all cloud accounts of a tenant
 */
async function example1_generateForAllAccounts() {
  const prisma = new PrismaClient();
  const service = new RecommendationGeneratorService(prisma, eventBus);

  try {
    // Generate recommendations for all accounts
    const result = await service.generateRecommendations('tenant-id-123');

    console.log('Generation Results:');
    console.log(`Success: ${result.success}`);
    console.log(`Recommendations Generated: ${result.recommendationsGenerated}`);
    console.log(`Total Estimated Savings: $${result.totalEstimatedSavings.toFixed(2)}/month`);
    console.log(`Execution Time: ${result.executionTimeMs}ms`);

    console.log('\nBreakdown by Type:');
    console.log(`  Idle Resources: ${result.breakdown.idle_resource}`);
    console.log(`  Rightsizing: ${result.breakdown.rightsize}`);
    console.log(`  Unused Resources: ${result.breakdown.unused_resource}`);
    console.log(`  Old Snapshots: ${result.breakdown.delete_snapshot}`);
    console.log(`  Reserved Instances: ${result.breakdown.reserved_instance}`);

    if (result.errors && result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }

  } catch (error) {
    console.error('Error generating recommendations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================
// Example 2: Generate Recommendations for Specific Account
// ============================================================

/**
 * Generate recommendations for a specific cloud account
 */
async function example2_generateForSpecificAccount() {
  const prisma = new PrismaClient();
  const service = new RecommendationGeneratorService(prisma, eventBus);

  try {
    const tenantId = 'tenant-id-123';
    const cloudAccountId = 'account-id-456';

    console.log(`Generating recommendations for account: ${cloudAccountId}`);

    const result = await service.generateRecommendations(tenantId, cloudAccountId);

    console.log(`\nGenerated ${result.recommendationsGenerated} recommendations`);
    console.log(`Estimated monthly savings: $${result.totalEstimatedSavings.toFixed(2)}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================
// Example 3: Query Recommendations with Filters
// ============================================================

/**
 * Query recommendations with various filters
 */
async function example3_queryRecommendations() {
  const prisma = new PrismaClient();
  const service = new RecommendationGeneratorService(prisma, eventBus);

  try {
    const tenantId = 'tenant-id-123';

    // Get all open high-priority recommendations
    const highPriorityRecs = await service.getRecommendations(tenantId, {
      status: 'open',
      priority: 'high',
    });

    console.log(`High Priority Recommendations: ${highPriorityRecs.length}`);
    highPriorityRecs.forEach(rec => {
      console.log(`\n${rec.title}`);
      console.log(`  Type: ${rec.type}`);
      console.log(`  Provider: ${rec.provider}`);
      console.log(`  Service: ${rec.service}`);
      console.log(`  Estimated Savings: $${rec.estimatedSavings.toString()}/month`);
      console.log(`  Description: ${rec.description}`);
    });

    // Get all AWS recommendations
    const awsRecs = await service.getRecommendations(tenantId, {
      provider: 'AWS',
      status: 'open',
    });

    console.log(`\n\nAWS Recommendations: ${awsRecs.length}`);

    // Get all idle resource recommendations
    const idleRecs = await service.getRecommendations(tenantId, {
      type: 'idle_resource',
      status: 'open',
    });

    console.log(`Idle Resource Recommendations: ${idleRecs.length}`);

    // Get total estimated savings
    const totalSavings = await service.getTotalEstimatedSavings(tenantId);
    console.log(`\nTotal Potential Monthly Savings: $${totalSavings.toFixed(2)}`);

  } catch (error) {
    console.error('Error querying recommendations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================
// Example 4: Update Recommendation Status
// ============================================================

/**
 * Update recommendation status (apply or dismiss)
 */
async function example4_updateRecommendationStatus() {
  const prisma = new PrismaClient();
  const service = new RecommendationGeneratorService(prisma, eventBus);

  try {
    const recommendationId = 'recommendation-id-789';

    // Mark recommendation as applied
    const applied = await service.updateRecommendationStatus(
      recommendationId,
      'applied',
      new Date()
    );

    console.log(`Recommendation ${applied.id} marked as applied`);
    console.log(`Applied at: ${applied.appliedAt}`);

    // Or dismiss a recommendation
    const dismissed = await service.updateRecommendationStatus(
      'another-recommendation-id',
      'dismissed'
    );

    console.log(`\nRecommendation ${dismissed.id} dismissed`);

  } catch (error) {
    console.error('Error updating status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================
// Example 5: Subscribe to Recommendation Events
// ============================================================

/**
 * Subscribe to recommendation generated events
 */
async function example5_subscribeToEvents() {
  const prisma = new PrismaClient();
  const service = new RecommendationGeneratorService(prisma, eventBus);

  // Set up event listener before generating recommendations
  eventBus.on('recommendation.generated', (data) => {
    console.log('\nNew Recommendation Generated:');
    console.log(`  ID: ${data.recommendationId}`);
    console.log(`  Type: ${data.type}`);
    console.log(`  Priority: ${data.priority}`);
    console.log(`  Provider: ${data.provider}`);
    console.log(`  Service: ${data.service}`);
    console.log(`  Resource: ${data.resourceId}`);
    console.log(`  Estimated Savings: $${data.estimatedSavings.toFixed(2)}/month`);

    // You could trigger additional actions here:
    // - Send email notification
    // - Create incident ticket
    // - Update dashboard
    // - Send Slack message
  });

  try {
    // Generate recommendations
    const result = await service.generateRecommendations('tenant-id-123');

    console.log(`\nGeneration complete: ${result.recommendationsGenerated} recommendations`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================
// Example 6: Scheduled Recommendation Generation
// ============================================================

/**
 * Run recommendation generation on a schedule (e.g., daily)
 */
async function example6_scheduledGeneration() {
  const prisma = new PrismaClient();
  const service = new RecommendationGeneratorService(prisma, eventBus);

  try {
    // Get all active tenants
    const tenants = await prisma.tenant.findMany({
      where: { status: 'active' },
      select: { id: true, name: true },
    });

    console.log(`Running scheduled recommendation generation for ${tenants.length} tenants...\n`);

    // Generate recommendations for each tenant
    for (const tenant of tenants) {
      try {
        console.log(`Processing tenant: ${tenant.name}`);

        const result = await service.generateRecommendations(tenant.id);

        console.log(`  Generated: ${result.recommendationsGenerated} recommendations`);
        console.log(`  Savings: $${result.totalEstimatedSavings.toFixed(2)}/month`);
        console.log(`  Time: ${result.executionTimeMs}ms\n`);

      } catch (error) {
        console.error(`  Error for tenant ${tenant.name}:`, error);
      }
    }

    console.log('Scheduled generation complete!');

  } catch (error) {
    console.error('Error in scheduled generation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================
// Example 7: Generate Summary Report
// ============================================================

/**
 * Generate a summary report of all recommendations
 */
async function example7_generateSummaryReport() {
  const prisma = new PrismaClient();
  const service = new RecommendationGeneratorService(prisma, eventBus);

  try {
    const tenantId = 'tenant-id-123';

    // Get all recommendations
    const recommendations = await service.getRecommendations(tenantId, {
      status: 'open',
    });

    // Group by type
    const byType = recommendations.reduce((acc, rec) => {
      if (!acc[rec.type]) {
        acc[rec.type] = { count: 0, savings: 0 };
      }
      acc[rec.type].count++;
      acc[rec.type].savings += rec.estimatedSavings.toNumber();
      return acc;
    }, {} as Record<string, { count: number; savings: number }>);

    // Group by priority
    const byPriority = recommendations.reduce((acc, rec) => {
      if (!acc[rec.priority]) {
        acc[rec.priority] = { count: 0, savings: 0 };
      }
      acc[rec.priority].count++;
      acc[rec.priority].savings += rec.estimatedSavings.toNumber();
      return acc;
    }, {} as Record<string, { count: number; savings: number }>);

    // Group by provider
    const byProvider = recommendations.reduce((acc, rec) => {
      if (!acc[rec.provider]) {
        acc[rec.provider] = { count: 0, savings: 0 };
      }
      acc[rec.provider].count++;
      acc[rec.provider].savings += rec.estimatedSavings.toNumber();
      return acc;
    }, {} as Record<string, { count: number; savings: number }>);

    console.log('=== COST OPTIMIZATION RECOMMENDATIONS SUMMARY ===\n');

    console.log(`Total Recommendations: ${recommendations.length}`);
    console.log(`Total Potential Monthly Savings: $${await service.getTotalEstimatedSavings(tenantId)}\n`);

    console.log('By Type:');
    Object.entries(byType).forEach(([type, data]) => {
      console.log(`  ${type}: ${data.count} ($${data.savings.toFixed(2)}/month)`);
    });

    console.log('\nBy Priority:');
    Object.entries(byPriority).forEach(([priority, data]) => {
      console.log(`  ${priority}: ${data.count} ($${data.savings.toFixed(2)}/month)`);
    });

    console.log('\nBy Provider:');
    Object.entries(byProvider).forEach(([provider, data]) => {
      console.log(`  ${provider}: ${data.count} ($${data.savings.toFixed(2)}/month)`);
    });

    console.log('\nTop 5 Recommendations by Savings:');
    const topRecs = recommendations
      .sort((a, b) => b.estimatedSavings.toNumber() - a.estimatedSavings.toNumber())
      .slice(0, 5);

    topRecs.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.title}`);
      console.log(`   Priority: ${rec.priority} | Savings: $${rec.estimatedSavings.toString()}/month`);
      console.log(`   ${rec.description.substring(0, 100)}...`);
    });

  } catch (error) {
    console.error('Error generating report:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================
// Export Examples
// ============================================================

export {
  example1_generateForAllAccounts,
  example2_generateForSpecificAccount,
  example3_queryRecommendations,
  example4_updateRecommendationStatus,
  example5_subscribeToEvents,
  example6_scheduledGeneration,
  example7_generateSummaryReport,
};

// ============================================================
// Main Execution (uncomment to run specific example)
// ============================================================

/*
// Run a specific example
(async () => {
  await example1_generateForAllAccounts();
  // await example2_generateForSpecificAccount();
  // await example3_queryRecommendations();
  // await example4_updateRecommendationStatus();
  // await example5_subscribeToEvents();
  // await example6_scheduledGeneration();
  // await example7_generateSummaryReport();
})();
*/
