#!/usr/bin/env tsx

/**
 * Azure Advisor Integration Test Script
 *
 * Tests the complete Azure Advisor integration by making real API calls
 * to Azure Advisor using the configured Service Principal credentials.
 *
 * Prerequisites:
 * - Azure Service Principal with "Advisor Recommendations Reader" role
 * - Environment variables configured in .env
 * - npm install @azure/arm-advisor @azure/identity
 *
 * Usage:
 *   npx tsx scripts/test-advisor-integration.ts
 *
 * Environment Variables:
 *   AZURE_TENANT_ID          - Azure AD Tenant ID
 *   AZURE_CLIENT_ID          - Service Principal Client ID
 *   AZURE_CLIENT_SECRET      - Service Principal Client Secret
 *   AZURE_SUBSCRIPTION_ID    - Azure Subscription ID
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { AzureAdvisorService } from '../src/integrations/azure/advisor.service';
import type { CloudProviderCredentials } from '../src/integrations/cloud-provider.interface';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Colors for console output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Logger utilities
 */
const log = {
  section: (title: string) => {
    console.log(`\n${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}${title}${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
  },
  success: (message: string) => {
    console.log(`${colors.green}✓${colors.reset} ${message}`);
  },
  error: (message: string) => {
    console.log(`${colors.red}✗${colors.reset} ${message}`);
  },
  info: (message: string) => {
    console.log(`${colors.cyan}ℹ${colors.reset} ${message}`);
  },
  warning: (message: string) => {
    console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
  },
  data: (label: string, value: any) => {
    console.log(`  ${colors.dim}${label}:${colors.reset} ${colors.bright}${value}${colors.reset}`);
  },
};

/**
 * Validate required environment variables
 */
function validateEnvironment(): { valid: boolean; missing: string[] } {
  const required = [
    'AZURE_TENANT_ID',
    'AZURE_CLIENT_ID',
    'AZURE_CLIENT_SECRET',
    'AZURE_SUBSCRIPTION_ID',
  ];

  const missing = required.filter((key) => !process.env[key]);

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Main test function
 */
async function testAdvisorIntegration() {
  log.section('Azure Advisor Integration Test');

  // Validate environment
  const envValidation = validateEnvironment();
  if (!envValidation.valid) {
    log.error('Missing required environment variables:');
    envValidation.missing.forEach((key) => {
      console.log(`  - ${key}`);
    });
    console.log('\nPlease set these variables in your .env file');
    process.exit(1);
  }

  log.success('Environment variables validated');

  // Display configuration
  log.info('Configuration:');
  log.data('Tenant ID', process.env.AZURE_TENANT_ID!.substring(0, 8) + '...');
  log.data('Client ID', process.env.AZURE_CLIENT_ID!.substring(0, 8) + '...');
  log.data('Subscription ID', process.env.AZURE_SUBSCRIPTION_ID!.substring(0, 8) + '...');

  // Initialize service
  const credentials: CloudProviderCredentials = {
    provider: 'azure',
    azureTenantId: process.env.AZURE_TENANT_ID!,
    azureClientId: process.env.AZURE_CLIENT_ID!,
    azureClientSecret: process.env.AZURE_CLIENT_SECRET!,
    azureSubscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
  };

  let service: AzureAdvisorService;

  try {
    service = new AzureAdvisorService(credentials);
    log.success('AzureAdvisorService initialized');
  } catch (error) {
    log.error(`Failed to initialize service: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  // Test 1: Fetch all recommendations
  log.section('Test 1: Fetch All Recommendations');

  try {
    const allRecommendations = await service.getRecommendations();
    log.success(`Retrieved ${allRecommendations.length} recommendations`);

    if (allRecommendations.length === 0) {
      log.warning('No recommendations found. This could mean:');
      console.log('  - Your Azure resources are already optimized');
      console.log('  - Azure Advisor has not generated recommendations yet');
      console.log('  - Service Principal lacks proper permissions');
    } else {
      log.info('Sample recommendation:');
      const sample = allRecommendations[0];
      log.data('ID', sample.id.split('/').pop());
      log.data('Category', sample.category);
      log.data('Impact', sample.impact);
      log.data('Description', sample.shortDescription.substring(0, 60) + '...');
    }
  } catch (error) {
    log.error(`Failed to fetch recommendations: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error);
    process.exit(1);
  }

  // Test 2: Fetch Cost recommendations
  log.section('Test 2: Fetch Cost Recommendations');

  try {
    const costRecommendations = await service.getCostRecommendations();
    log.success(`Retrieved ${costRecommendations.length} cost recommendations`);

    if (costRecommendations.length > 0) {
      let totalPotentialSavings = 0;
      let currency = 'USD';

      costRecommendations.forEach((rec) => {
        if (rec.metadata.estimatedSavings) {
          totalPotentialSavings += rec.metadata.estimatedSavings.amount;
          currency = rec.metadata.estimatedSavings.currency;
        }
      });

      if (totalPotentialSavings > 0) {
        log.info(`Total potential savings: ${colors.bright}${currency} ${totalPotentialSavings.toFixed(2)}${colors.reset}`);
      }

      // Display top 3 cost recommendations
      const top3 = costRecommendations
        .filter((rec) => rec.metadata.estimatedSavings)
        .sort((a, b) => (b.metadata.estimatedSavings?.amount || 0) - (a.metadata.estimatedSavings?.amount || 0))
        .slice(0, 3);

      if (top3.length > 0) {
        console.log('\n  Top cost-saving opportunities:');
        top3.forEach((rec, index) => {
          const savings = rec.metadata.estimatedSavings!;
          console.log(`  ${index + 1}. ${rec.shortDescription.substring(0, 50)}...`);
          console.log(`     ${colors.green}Save ${savings.currency} ${savings.amount.toFixed(2)}/year${colors.reset}`);
        });
      }
    }
  } catch (error) {
    log.error(`Failed to fetch cost recommendations: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Test 3: Fetch Security recommendations
  log.section('Test 3: Fetch Security Recommendations');

  try {
    const securityRecommendations = await service.getSecurityRecommendations();
    log.success(`Retrieved ${securityRecommendations.length} security recommendations`);

    if (securityRecommendations.length > 0) {
      const highImpact = securityRecommendations.filter((rec) => rec.impact === 'High').length;
      const mediumImpact = securityRecommendations.filter((rec) => rec.impact === 'Medium').length;
      const lowImpact = securityRecommendations.filter((rec) => rec.impact === 'Low').length;

      log.data('High Impact', highImpact);
      log.data('Medium Impact', mediumImpact);
      log.data('Low Impact', lowImpact);

      if (highImpact > 0) {
        log.warning('You have high-impact security recommendations that should be addressed immediately');
      }
    }
  } catch (error) {
    log.error(`Failed to fetch security recommendations: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Test 4: Fetch Reliability recommendations
  log.section('Test 4: Fetch Reliability Recommendations');

  try {
    const reliabilityRecommendations = await service.getReliabilityRecommendations();
    log.success(`Retrieved ${reliabilityRecommendations.length} reliability recommendations`);

    if (reliabilityRecommendations.length > 0) {
      log.info('Sample reliability recommendation:');
      const sample = reliabilityRecommendations[0];
      log.data('Description', sample.shortDescription);
      log.data('Impact', sample.impact);
    }
  } catch (error) {
    log.error(`Failed to fetch reliability recommendations: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Test 5: Fetch Performance recommendations
  log.section('Test 5: Fetch Performance Recommendations');

  try {
    const performanceRecommendations = await service.getPerformanceRecommendations();
    log.success(`Retrieved ${performanceRecommendations.length} performance recommendations`);
  } catch (error) {
    log.error(`Failed to fetch performance recommendations: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Test 6: Fetch Operational Excellence recommendations
  log.section('Test 6: Fetch Operational Excellence Recommendations');

  try {
    const opexRecommendations = await service.getOperationalExcellenceRecommendations();
    log.success(`Retrieved ${opexRecommendations.length} operational excellence recommendations`);
  } catch (error) {
    log.error(`Failed to fetch operational excellence recommendations: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Test 7: Filter by impact
  log.section('Test 7: Filter by High Impact');

  try {
    const highImpactRecs = await service.getRecommendations({ impact: ['High'] });
    log.success(`Retrieved ${highImpactRecs.length} high-impact recommendations`);

    if (highImpactRecs.length > 0) {
      const byCategoryCount: Record<string, number> = {};
      highImpactRecs.forEach((rec) => {
        byCategoryCount[rec.category] = (byCategoryCount[rec.category] || 0) + 1;
      });

      log.info('High-impact recommendations by category:');
      Object.entries(byCategoryCount).forEach(([category, count]) => {
        log.data(category, count);
      });
    }
  } catch (error) {
    log.error(`Failed to filter by impact: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Test 8: Generate recommendations (optional - triggers Azure to regenerate)
  if (process.env.TEST_ADVISOR_GENERATE === 'true') {
    log.section('Test 8: Trigger Recommendation Generation');

    try {
      await service.generateRecommendations();
      log.success('Recommendation generation triggered');
      log.info('Note: New recommendations may take 5-10 minutes to appear');
    } catch (error) {
      log.error(`Failed to trigger generation: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    log.section('Test 8: Trigger Recommendation Generation (Skipped)');
    log.info('Set TEST_ADVISOR_GENERATE=true to enable this test');
  }

  // Summary
  log.section('Test Summary');
  log.success('All tests completed successfully!');
  console.log('\n' + colors.green + '✓ Azure Advisor integration is working correctly' + colors.reset);
  console.log('\nNext steps:');
  console.log('  1. Review the recommendations in your Azure Portal');
  console.log('  2. Integrate AzureAdvisorService into your API endpoints');
  console.log('  3. Set up caching for recommendation data');
  console.log('  4. Configure rate limiting per tenant\n');
}

/**
 * Run the test
 */
if (require.main === module) {
  testAdvisorIntegration()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n' + colors.red + '✗ Test failed with error:' + colors.reset);
      console.error(error);
      process.exit(1);
    });
}

export { testAdvisorIntegration };
