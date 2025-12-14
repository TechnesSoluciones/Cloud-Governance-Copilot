/**
 * Azure Cost Management Service - Usage Examples
 *
 * This file demonstrates how to use the AzureCostManagementService
 * for various cost management operations.
 *
 * NOTE: This is a documentation/example file, not meant to be run directly.
 */

import { AzureCostManagementService } from './cost-management.service';
import type { CloudProviderCredentials, DateRange } from '../cloud-provider.interface';

// ============================================================
// Example 1: Initialize the service
// ============================================================

function initializeService(): AzureCostManagementService {
  // Option 1: Using environment variables (recommended for production)
  const credentials: CloudProviderCredentials = {
    provider: 'azure',
    azureClientId: process.env.AZURE_CLIENT_ID!,
    azureClientSecret: process.env.AZURE_CLIENT_SECRET!,
    azureTenantId: process.env.AZURE_TENANT_ID!,
    azureSubscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
  };

  // Option 2: Direct credentials (for testing only - not recommended)
  // const credentials: CloudProviderCredentials = {
  //   provider: 'azure',
  //   azureClientId: '00000000-0000-0000-0000-000000000000',
  //   azureClientSecret: 'secret...',
  //   azureTenantId: '00000000-0000-0000-0000-000000000000',
  //   azureSubscriptionId: '00000000-0000-0000-0000-000000000000',
  // };

  const service = new AzureCostManagementService(credentials);
  return service;
}

// ============================================================
// Example 2: Validate credentials
// ============================================================

async function validateCredentialsExample() {
  const service = initializeService();

  const isValid = await service.validateCredentials();

  if (isValid) {
    console.log('Azure credentials are valid');
  } else {
    console.error('Azure credentials are invalid');
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

  // Filter by Virtual Machines service only
  const vmCosts = await service.getCosts(dateRange, {
    service: 'Virtual Machines',
  });

  console.log(`Virtual Machines costs: ${vmCosts.length} entries`);

  // Filter by region
  const eastUSCosts = await service.getCosts(dateRange, {
    region: 'eastus',
  });

  console.log(`East US costs: ${eastUSCosts.length} entries`);

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
    service: 'Virtual Machines',
    region: 'eastus',
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

  // Weekly trends (uses daily granularity)
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
    if (error.statusCode === 401) {
      console.error('Unauthorized - Invalid Azure credentials');
    } else if (error.statusCode === 403) {
      console.error('Access denied - Insufficient Service Principal permissions for Cost Management');
    } else if (error.statusCode === 429) {
      console.error('Azure API rate limiting - retry later');
    } else if (error.code === 'TooManyRequests') {
      console.error('Too many requests - implement exponential backoff');
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
    throw new Error('Invalid Azure credentials');
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
  console.log('\nStep 4: Analyzing Virtual Machines costs...');
  const vmCosts = await service.getCosts(dateRange, {
    service: 'Virtual Machines',
  });

  const totalVMCost = vmCosts.reduce((sum, cost) => sum + cost.amount, 0);
  console.log(`Total VM cost: $${totalVMCost.toFixed(2)}`);
  console.log(`VM cost entries: ${vmCosts.length}`);
}

// ============================================================
// Example 9: Multi-region cost analysis
// ============================================================

async function multiRegionAnalysisExample() {
  const service = initializeService();

  const dateRange: DateRange = {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
  };

  // Common Azure regions
  const regions = ['eastus', 'westus', 'northeurope', 'westeurope', 'southeastasia'];

  console.log('Analyzing costs by region:');
  for (const region of regions) {
    const regionCosts = await service.getCosts(dateRange, { region });
    const total = regionCosts.reduce((sum, cost) => sum + cost.amount, 0);
    console.log(`${region}: $${total.toFixed(2)}`);
  }
}

// ============================================================
// Example 10: Service-specific analysis
// ============================================================

async function serviceSpecificAnalysisExample() {
  const service = initializeService();

  const dateRange: DateRange = {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
  };

  // Common Azure services
  const services = [
    'Virtual Machines',
    'Storage',
    'SQL Database',
    'Azure Kubernetes Service',
    'Bandwidth',
  ];

  console.log('Analyzing costs by Azure service:');
  for (const serviceName of services) {
    try {
      const serviceCosts = await service.getCosts(dateRange, { service: serviceName });
      const total = serviceCosts.reduce((sum, cost) => sum + cost.amount, 0);
      console.log(`${serviceName}: $${total.toFixed(2)} (${serviceCosts.length} entries)`);
    } catch (error) {
      console.log(`${serviceName}: Error retrieving costs`);
    }
  }
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
  multiRegionAnalysisExample,
  serviceSpecificAnalysisExample,
};
