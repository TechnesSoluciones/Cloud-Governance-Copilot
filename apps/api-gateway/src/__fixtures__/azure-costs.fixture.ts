/**
 * Azure Cost Data Fixtures
 *
 * Mock data for testing Azure Cost Management API integration.
 * Based on Azure Cost Management API documentation:
 * https://docs.microsoft.com/en-us/rest/api/cost-management/
 */

import type { CloudCostData } from '../integrations/cloud-provider.interface';

/**
 * Mock Azure credentials for testing
 */
export const mockAzureCredentials = {
  clientId: 'test-client-id-12345',
  clientSecret: 'test-client-secret-67890',
  tenantId: 'test-tenant-id-abcde',
  subscriptionId: 'test-subscription-id-fghij',
};

/**
 * Invalid Azure credentials for testing error scenarios
 */
export const mockAzureCredentialsInvalid = {
  clientId: 'invalid-client-id',
  clientSecret: 'invalid-client-secret',
  tenantId: 'invalid-tenant-id',
  subscriptionId: 'invalid-subscription-id',
};

/**
 * Mock Azure Cost Management API response
 *
 * Format based on Azure Cost Management Query API:
 * https://learn.microsoft.com/en-us/rest/api/cost-management/query/usage
 *
 * Response structure:
 * - rows: Array of cost data rows
 * - columns: Column definitions
 *
 * Each row contains:
 * [UsageDate (YYYYMMDD), Cost, MeterCategory, ResourceGroup]
 */
export const mockAzureCostResponse = {
  rows: [
    [
      20241201, // UsageDate (YYYYMMDD format)
      123.45, // Cost
      'Virtual Machines', // MeterCategory (service name)
      'rg-prod', // ResourceGroup
    ],
    [
      20241202,
      145.67,
      'Virtual Machines',
      'rg-prod',
    ],
    [
      20241203,
      98.23,
      'Virtual Machines',
      'rg-prod',
    ],
  ],
  columns: [
    { name: 'UsageDate', type: 'Number' },
    { name: 'Cost', type: 'Number' },
    { name: 'MeterCategory', type: 'String' },
    { name: 'ResourceGroup', type: 'String' },
  ],
};

/**
 * Mock Azure Cost Management API response with multiple services
 */
export const mockAzureCostResponseMultipleServices = {
  rows: [
    // Virtual Machines
    [20241201, 123.45, 'Virtual Machines', 'rg-prod'],
    [20241202, 145.67, 'Virtual Machines', 'rg-prod'],
    [20241203, 98.23, 'Virtual Machines', 'rg-dev'],

    // Storage
    [20241201, 45.12, 'Storage', 'rg-prod'],
    [20241202, 47.89, 'Storage', 'rg-prod'],
    [20241203, 50.34, 'Storage', 'rg-dev'],

    // Azure SQL Database
    [20241201, 200.00, 'SQL Database', 'rg-prod'],
    [20241202, 210.50, 'SQL Database', 'rg-prod'],
    [20241203, 195.75, 'SQL Database', 'rg-dev'],

    // Azure App Service
    [20241201, 75.30, 'App Service', 'rg-prod'],
    [20241202, 80.25, 'App Service', 'rg-dev'],

    // Azure Kubernetes Service
    [20241201, 150.00, 'Container Service', 'rg-prod'],
    [20241202, 155.00, 'Container Service', 'rg-prod'],
  ],
  columns: [
    { name: 'UsageDate', type: 'Number' },
    { name: 'Cost', type: 'Number' },
    { name: 'MeterCategory', type: 'String' },
    { name: 'ResourceGroup', type: 'String' },
  ],
};

/**
 * Mock empty Azure Cost Management API response
 */
export const mockAzureCostResponseEmpty = {
  rows: [],
  columns: [
    { name: 'UsageDate', type: 'Number' },
    { name: 'Cost', type: 'Number' },
    { name: 'MeterCategory', type: 'String' },
    { name: 'ResourceGroup', type: 'String' },
  ],
};

/**
 * Mock Azure Cost Management API response with multiple currencies
 */
export const mockAzureCostResponseMultiCurrency = {
  rows: [
    [20241201, 100.00, 'Virtual Machines', 'rg-prod'],
    [20241201, 85.50, 'Storage', 'rg-prod'],
    [20241201, 120.75, 'SQL Database', 'rg-prod'],
  ],
  columns: [
    { name: 'UsageDate', type: 'Number' },
    { name: 'Cost', type: 'Number' },
    { name: 'MeterCategory', type: 'String' },
    { name: 'ResourceGroup', type: 'String' },
  ],
};

/**
 * Mock Azure Cost Management API response with zero costs
 */
export const mockAzureCostResponseWithZero = {
  rows: [
    [20241201, 0, 'Virtual Machines', 'rg-prod'],
    [20241201, 100.00, 'Storage', 'rg-prod'],
    [20241201, 0, 'SQL Database', 'rg-prod'],
  ],
  columns: [
    { name: 'UsageDate', type: 'Number' },
    { name: 'Cost', type: 'Number' },
    { name: 'MeterCategory', type: 'String' },
    { name: 'ResourceGroup', type: 'String' },
  ],
};

/**
 * Expected normalized CloudCostData output from Azure response
 *
 * This is what the service should transform the Azure API response into
 */
export const expectedCostDataFromAzure: CloudCostData[] = [
  {
    date: new Date('2024-12-01'),
    service: 'Virtual Machines',
    amount: 123.45,
    currency: 'USD',
    region: 'eastus',
    metadata: {
      provider: 'azure',
      subscriptionId: 'test-subscription-id-fghij',
    },
  },
  {
    date: new Date('2024-12-02'),
    service: 'Virtual Machines',
    amount: 145.67,
    currency: 'USD',
    region: 'eastus',
    metadata: {
      provider: 'azure',
      subscriptionId: 'test-subscription-id-fghij',
    },
  },
  {
    date: new Date('2024-12-03'),
    service: 'Virtual Machines',
    amount: 98.23,
    currency: 'USD',
    region: 'eastus',
    metadata: {
      provider: 'azure',
      subscriptionId: 'test-subscription-id-fghij',
    },
  },
];

/**
 * Mock Azure Cost Management API error responses
 */
export const mockAzureErrorResponses = {
  authenticationError: {
    name: 'AuthenticationError',
    message: 'The credentials provided are invalid',
    code: 'InvalidAuthenticationToken',
  },
  authorizationFailed: {
    name: 'AuthorizationFailed',
    message: 'The client does not have authorization to perform action',
    code: 'AuthorizationFailed',
  },
  subscriptionNotFound: {
    name: 'SubscriptionNotFound',
    message: 'The subscription was not found',
    code: 'SubscriptionNotFound',
  },
  throttlingException: {
    name: 'ThrottlingException',
    message: 'Too many requests',
    code: 'TooManyRequests',
    statusCode: 429,
  },
  internalServerError: {
    name: 'InternalServerError',
    message: 'An internal server error occurred',
    code: 'InternalServerError',
    statusCode: 500,
  },
};

/**
 * Mock Azure cost data with detailed metadata
 */
export const mockAzureCostDataDetailed = {
  rows: [
    [
      20241207, // UsageDate
      250.00, // Cost
      'Virtual Machines', // MeterCategory
      'rg-prod', // ResourceGroup
    ],
  ],
  columns: [
    { name: 'UsageDate', type: 'Number' },
    { name: 'Cost', type: 'Number' },
    { name: 'MeterCategory', type: 'String' },
    { name: 'ResourceGroup', type: 'String' },
  ],
};

/**
 * Generate mock Azure cost data for testing
 *
 * @param count Number of cost entries to generate
 * @param services Array of Azure services to use
 * @returns Mock Azure Cost Management API response
 */
export function generateMockAzureCostData(
  count: number = 10,
  services: string[] = ['Virtual Machines', 'Storage', 'SQL Database', 'App Service']
): any {
  const rows: any[] = [];
  const startDate = new Date('2024-12-01');
  const resourceGroups = ['rg-prod', 'rg-dev', 'rg-staging'];

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + Math.floor(i / services.length));

    const dateNumber = parseInt(
      date.getFullYear() +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0')
    );

    const service = services[i % services.length];
    const cost = parseFloat((Math.random() * 500 + 10).toFixed(2));
    const resourceGroup = resourceGroups[Math.floor(Math.random() * resourceGroups.length)];

    rows.push([dateNumber, cost, service, resourceGroup]);
  }

  return {
    rows,
    columns: [
      { name: 'UsageDate', type: 'Number' },
      { name: 'Cost', type: 'Number' },
      { name: 'MeterCategory', type: 'String' },
      { name: 'ResourceGroup', type: 'String' },
    ],
  };
}
