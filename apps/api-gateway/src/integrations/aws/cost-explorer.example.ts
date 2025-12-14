/**
 * AWS Cost Explorer Service - Usage Examples
 *
 * This file demonstrates how to use the AWSCostExplorerService
 * for various cost management operations.
 *
 * NOTE: This is a documentation/example file, not meant to be run directly.
 */

import { AWSCostExplorerService } from './cost-explorer.service';
import type { CloudProviderCredentials, DateRange } from '../cloud-provider.interface';

// ============================================================
// Example 1: Initialize the service
// ============================================================

function initializeService(): AWSCostExplorerService {
  // Option 1: Using environment variables (recommended for production)
  const credentials: CloudProviderCredentials = {
    provider: 'aws',
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    awsRegion: process.env.AWS_REGION || 'us-east-1',
  };

  // Option 2: Direct credentials (for testing only - not recommended)
  // const credentials: CloudProviderCredentials = {
  //   provider: 'aws',
  //   awsAccessKeyId: 'AKIA...',
  //   awsSecretAccessKey: 'secret...',
  //   awsRegion: 'us-east-1',
  // };

  const service = new AWSCostExplorerService(credentials);
  return service;
}

// ============================================================
// Example 2: Validate credentials
// ============================================================

async function validateCredentialsExample() {
  const service = initializeService();

  const isValid = await service.validateCredentials();

  if (isValid) {
    console.log('AWS credentials are valid');
  } else {
    console.error('AWS credentials are invalid');
  }
}

// ============================================================
// Example 3: Get costs for a date range
// ============================================================

async function getCostsExample() {
  const service = initializeService();

  // Define date range (last 30 days)
  const dateRange: DateRange = {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
  };

  // Get all costs
  const costs = await service.getCosts(dateRange);

  console.log(`Total cost entries: ${costs.length}`);
  console.log('Sample cost entry:', costs[0]);
}

// ============================================================
// Example 4: Get costs with filters
// ============================================================

async function getCostsWithFiltersExample() {
  const service = initializeService();

  const dateRange: DateRange = {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
  };

  // Filter by EC2 service only
  const ec2Costs = await service.getCosts(dateRange, {
    service: 'Amazon Elastic Compute Cloud - Compute',
  });

  console.log(`EC2 costs: ${ec2Costs.length} entries`);

  // Filter by region
  const usEast1Costs = await service.getCosts(dateRange, {
    region: 'us-east-1',
  });

  console.log(`US East 1 costs: ${usEast1Costs.length} entries`);

  // Filter by tags
  const prodCosts = await service.getCosts(dateRange, {
    tags: {
      Environment: 'production',
      Team: 'engineering',
    },
  });

  console.log(`Production costs: ${prodCosts.length} entries`);

  // Multiple filters
  const filteredCosts = await service.getCosts(dateRange, {
    service: 'Amazon Elastic Compute Cloud - Compute',
    region: 'us-east-1',
    tags: {
      Environment: 'production',
    },
  });

  console.log(`Filtered costs: ${filteredCosts.length} entries`);
}

// ============================================================
// Example 5: Get costs by service
// ============================================================

async function getCostsByServiceExample() {
  const service = initializeService();

  const dateRange: DateRange = {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
  };

  const costsByService = await service.getCostsByService(dateRange);

  console.log('Costs by service:');
  costsByService.forEach((item) => {
    console.log(
      `${item.service}: $${item.totalCost.toFixed(2)} (${item.percentage.toFixed(2)}%)`
    );
  });

  // Calculate total
  const total = costsByService.reduce((sum, item) => sum + item.totalCost, 0);
  console.log(`Total: $${total.toFixed(2)}`);
}

// ============================================================
// Example 6: Get cost trends
// ============================================================

async function getCostTrendsExample() {
  const service = initializeService();

  const dateRange: DateRange = {
    start: new Date('2024-01-01'),
    end: new Date('2024-03-31'),
  };

  // Daily trends
  const dailyTrends = await service.getCostTrends(dateRange, 'daily');
  console.log(`Daily trends: ${dailyTrends.length} data points`);

  // Weekly trends
  const weeklyTrends = await service.getCostTrends(dateRange, 'weekly');
  console.log(`Weekly trends: ${weeklyTrends.length} data points`);

  // Monthly trends
  const monthlyTrends = await service.getCostTrends(dateRange, 'monthly');
  console.log(`Monthly trends: ${monthlyTrends.length} data points`);

  // Print monthly trends
  console.log('\nMonthly cost trends:');
  monthlyTrends.forEach((trend) => {
    console.log(
      `${trend.date.toISOString().slice(0, 7)}: $${trend.totalCost.toFixed(2)} ${trend.currency}`
    );
  });
}

// ============================================================
// Example 7: Error handling
// ============================================================

async function errorHandlingExample() {
  const service = initializeService();

  const dateRange: DateRange = {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
  };

  try {
    const costs = await service.getCosts(dateRange);
    console.log(`Successfully retrieved ${costs.length} cost entries`);
  } catch (error: any) {
    if (error.name === 'UnrecognizedClientException') {
      console.error('Invalid AWS credentials');
    } else if (error.name === 'AccessDeniedException') {
      console.error('Insufficient IAM permissions for Cost Explorer');
    } else if (error.name === 'ThrottlingException') {
      console.error('AWS API throttling - retry later');
    } else {
      console.error('Unexpected error:', error.message);
    }
  }
}

// ============================================================
// Example 8: Complete workflow
// ============================================================

async function completeWorkflowExample() {
  const service = initializeService();

  // Step 1: Validate credentials
  console.log('Step 1: Validating credentials...');
  const isValid = await service.validateCredentials();
  if (!isValid) {
    throw new Error('Invalid AWS credentials');
  }
  console.log('Credentials valid!');

  // Step 2: Get date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const dateRange: DateRange = { start: startDate, end: endDate };

  // Step 3: Get cost breakdown by service
  console.log('\nStep 2: Getting costs by service...');
  const costsByService = await service.getCostsByService(dateRange);

  const total = costsByService.reduce((sum, item) => sum + item.totalCost, 0);
  console.log(`Total cost: $${total.toFixed(2)}`);
  console.log(`Top 5 services:`);
  costsByService.slice(0, 5).forEach((item, index) => {
    console.log(
      `${index + 1}. ${item.service}: $${item.totalCost.toFixed(2)} (${item.percentage.toFixed(1)}%)`
    );
  });

  // Step 4: Get cost trends
  console.log('\nStep 3: Getting cost trends...');
  const trends = await service.getCostTrends(dateRange, 'daily');

  const avgDailyCost = trends.reduce((sum, t) => sum + t.totalCost, 0) / trends.length;
  console.log(`Average daily cost: $${avgDailyCost.toFixed(2)}`);

  // Step 5: Analyze specific service
  console.log('\nStep 4: Analyzing EC2 costs...');
  const ec2Costs = await service.getCosts(dateRange, {
    service: 'Amazon Elastic Compute Cloud - Compute',
  });

  const totalEC2Cost = ec2Costs.reduce((sum, cost) => sum + cost.amount, 0);
  console.log(`Total EC2 cost: $${totalEC2Cost.toFixed(2)}`);
  console.log(`EC2 cost entries: ${ec2Costs.length}`);
}

// ============================================================
// Export examples
// ============================================================

export {
  initializeService,
  validateCredentialsExample,
  getCostsExample,
  getCostsWithFiltersExample,
  getCostsByServiceExample,
  getCostTrendsExample,
  errorHandlingExample,
  completeWorkflowExample,
};
