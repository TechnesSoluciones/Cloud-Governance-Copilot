/**
 * Azure Advisor Test Fixtures
 *
 * Mock data for Azure Advisor recommendations used in unit tests.
 * Based on actual Azure Advisor API responses.
 *
 * @see https://learn.microsoft.com/en-us/rest/api/advisor/recommendations
 */

import type { CloudProviderCredentials } from '../integrations/cloud-provider.interface';
import type { AdvisorRecommendation } from '../integrations/azure/advisor.service';

/**
 * Valid Azure credentials for testing
 */
export const mockAzureAdvisorCredentials = {
  tenantId: '12345678-1234-1234-1234-123456789012',
  clientId: '87654321-4321-4321-4321-210987654321',
  clientSecret: 'mock-client-secret-for-testing',
  subscriptionId: 'abcdef12-3456-7890-abcd-ef1234567890',
};

/**
 * Cloud provider credentials for testing
 */
export const mockAdvisorCloudCredentials: CloudProviderCredentials = {
  provider: 'azure',
  azureTenantId: mockAzureAdvisorCredentials.tenantId,
  azureClientId: mockAzureAdvisorCredentials.clientId,
  azureClientSecret: mockAzureAdvisorCredentials.clientSecret,
  azureSubscriptionId: mockAzureAdvisorCredentials.subscriptionId,
};

/**
 * Mock Azure Advisor API response - Cost Recommendation
 */
export const mockAzureCostRecommendation = {
  id: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Compute/virtualMachines/vm-web-01/providers/Microsoft.Advisor/recommendations/cost-rec-001',
  name: 'cost-rec-001',
  type: 'Microsoft.Advisor/recommendations',
  category: 'Cost',
  impact: 'High',
  impactedField: 'Microsoft.Compute/virtualMachines',
  impactedValue: 'vm-web-01',
  lastUpdated: new Date('2024-12-15T10:30:00Z'),
  shortDescription: {
    problem: 'Right-size or shutdown underutilized virtual machines',
    solution: 'Resize VM from Standard_D8s_v3 to Standard_D4s_v3',
  },
  extendedProperties: {
    assessmentKey: 'cost-optimization-vm-rightsize',
    description: 'This virtual machine has been underutilized for the past 7 days. Average CPU utilization is 5% and network usage is low.',
    savingsAmount: 1752.00,
    savingsCurrency: 'USD',
    recommendationTypeId: 'e10b1381-5f0a-47ff-8c7b-37bd13d7c974',
  },
  resourceMetadata: {
    resourceId: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Compute/virtualMachines/vm-web-01',
    source: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Compute/virtualMachines/vm-web-01',
    location: 'eastus',
  },
  recommendedActions: [
    { actionText: 'Resize the virtual machine to Standard_D4s_v3' },
    { actionText: 'Monitor performance after resizing' },
  ],
};

/**
 * Mock Azure Advisor API response - Security Recommendation
 */
export const mockAzureSecurityRecommendation = {
  id: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Storage/storageAccounts/stprod001/providers/Microsoft.Advisor/recommendations/sec-rec-001',
  name: 'sec-rec-001',
  type: 'Microsoft.Advisor/recommendations',
  category: 'Security',
  impact: 'High',
  impactedField: 'Microsoft.Storage/storageAccounts',
  impactedValue: 'stprod001',
  lastUpdated: new Date('2024-12-15T09:15:00Z'),
  shortDescription: {
    problem: 'Storage account does not use Azure Active Directory authorization',
    solution: 'Enable Azure Active Directory authorization for storage account',
  },
  extendedProperties: {
    assessmentKey: 'security-storage-aad-auth',
    description: 'Using Azure Active Directory (Azure AD) authorization provides superior security and ease of use over Shared Key authorization.',
    recommendationTypeId: 'c6b94711-f1f5-4e7e-9c89-c17ed4190969',
  },
  resourceMetadata: {
    resourceId: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Storage/storageAccounts/stprod001',
    source: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Storage/storageAccounts/stprod001',
    location: 'westus2',
  },
  recommendedActions: [
    { actionText: 'Enable Azure AD authentication' },
    { actionText: 'Disable shared key access' },
  ],
};

/**
 * Mock Azure Advisor API response - Reliability Recommendation
 */
export const mockAzureReliabilityRecommendation = {
  id: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Sql/servers/sql-prod-01/providers/Microsoft.Advisor/recommendations/rel-rec-001',
  name: 'rel-rec-001',
  type: 'Microsoft.Advisor/recommendations',
  category: 'HighAvailability',
  impact: 'Medium',
  impactedField: 'Microsoft.Sql/servers',
  impactedValue: 'sql-prod-01',
  lastUpdated: new Date('2024-12-15T08:00:00Z'),
  shortDescription: {
    problem: 'Enable geo-redundant backup for Azure SQL Database',
    solution: 'Configure geo-redundant backup for business continuity',
  },
  extendedProperties: {
    assessmentKey: 'reliability-sql-geo-backup',
    description: 'Protect your data from regional outages by enabling geo-redundant backup.',
    recommendationTypeId: 'a5f6b8c2-3d4e-5f6a-7b8c-9d0e1f2a3b4c',
  },
  resourceMetadata: {
    resourceId: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Sql/servers/sql-prod-01',
    source: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Sql/servers/sql-prod-01',
    location: 'centralus',
  },
  recommendedActions: [
    { actionText: 'Enable geo-redundant backup in database settings' },
  ],
};

/**
 * Mock Azure Advisor API response - Performance Recommendation
 */
export const mockAzurePerformanceRecommendation = {
  id: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Web/sites/app-api-01/providers/Microsoft.Advisor/recommendations/perf-rec-001',
  name: 'perf-rec-001',
  type: 'Microsoft.Advisor/recommendations',
  category: 'Performance',
  impact: 'Medium',
  impactedField: 'Microsoft.Web/sites',
  impactedValue: 'app-api-01',
  lastUpdated: new Date('2024-12-15T11:45:00Z'),
  shortDescription: {
    problem: 'App Service plan is experiencing high CPU usage',
    solution: 'Scale up App Service plan to handle increased load',
  },
  extendedProperties: {
    assessmentKey: 'performance-appservice-scale',
    description: 'Your App Service plan has been running at high CPU utilization (>80%) for the past 72 hours.',
    recommendationTypeId: 'd8e9f0a1-2b3c-4d5e-6f7a-8b9c0d1e2f3a',
  },
  resourceMetadata: {
    resourceId: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Web/sites/app-api-01',
    source: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Web/sites/app-api-01',
    location: 'westeurope',
  },
  recommendedActions: [
    { actionText: 'Scale up to Premium P2v3 tier' },
    { actionText: 'Enable auto-scaling rules' },
  ],
};

/**
 * Mock Azure Advisor API response - Operational Excellence Recommendation
 */
export const mockAzureOperationalExcellenceRecommendation = {
  id: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Network/applicationGateways/appgw-01/providers/Microsoft.Advisor/recommendations/opex-rec-001',
  name: 'opex-rec-001',
  type: 'Microsoft.Advisor/recommendations',
  category: 'OperationalExcellence',
  impact: 'Low',
  impactedField: 'Microsoft.Network/applicationGateways',
  impactedValue: 'appgw-01',
  lastUpdated: new Date('2024-12-15T07:30:00Z'),
  shortDescription: {
    problem: 'Application Gateway diagnostic logs are not enabled',
    solution: 'Enable diagnostic logging for better monitoring and troubleshooting',
  },
  extendedProperties: {
    assessmentKey: 'opex-appgw-diagnostics',
    description: 'Enable diagnostic logs to track requests, performance, and errors in your Application Gateway.',
    recommendationTypeId: 'f1a2b3c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c',
  },
  resourceMetadata: {
    resourceId: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Network/applicationGateways/appgw-01',
    source: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Network/applicationGateways/appgw-01',
    location: 'northeurope',
  },
  recommendedActions: [
    { actionText: 'Enable diagnostic settings in Azure Monitor' },
    { actionText: 'Configure Log Analytics workspace' },
  ],
};

/**
 * Mock Azure Advisor API response - Multiple recommendations
 */
export const mockAzureAdvisorResponseMultiple = {
  value: [
    mockAzureCostRecommendation,
    mockAzureSecurityRecommendation,
    mockAzureReliabilityRecommendation,
    mockAzurePerformanceRecommendation,
    mockAzureOperationalExcellenceRecommendation,
  ],
  nextLink: null,
};

/**
 * Mock Azure Advisor API response - Cost recommendations only
 */
export const mockAzureAdvisorResponseCostOnly = {
  value: [mockAzureCostRecommendation],
  nextLink: null,
};

/**
 * Mock Azure Advisor API response - Empty
 */
export const mockAzureAdvisorResponseEmpty = {
  value: [],
  nextLink: null,
};

/**
 * Expected normalized recommendation - Cost
 */
export const expectedCostRecommendationNormalized: AdvisorRecommendation = {
  id: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Compute/virtualMachines/vm-web-01/providers/Microsoft.Advisor/recommendations/cost-rec-001',
  name: 'cost-rec-001',
  category: 'Cost',
  impact: 'High',
  shortDescription: 'Right-size or shutdown underutilized virtual machines',
  longDescription: 'This virtual machine has been underutilized for the past 7 days. Average CPU utilization is 5% and network usage is low.',
  potentialBenefits: 'Resize VM from Standard_D8s_v3 to Standard_D4s_v3',
  impactedField: 'Microsoft.Compute/virtualMachines',
  impactedValue: 'vm-web-01',
  lastUpdated: new Date('2024-12-15T10:30:00Z'),
  metadata: {
    resourceId: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Compute/virtualMachines/vm-web-01',
    resourceType: 'Microsoft.Compute/virtualMachines',
    resourceGroup: 'rg-production',
    region: 'eastus',
    estimatedSavings: {
      amount: 1752.00,
      currency: 'USD',
    },
    recommendedActions: [
      'Resize the virtual machine to Standard_D4s_v3',
      'Monitor performance after resizing',
    ],
  },
};

/**
 * Expected normalized recommendation - Security
 */
export const expectedSecurityRecommendationNormalized: AdvisorRecommendation = {
  id: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Storage/storageAccounts/stprod001/providers/Microsoft.Advisor/recommendations/sec-rec-001',
  name: 'sec-rec-001',
  category: 'Security',
  impact: 'High',
  shortDescription: 'Storage account does not use Azure Active Directory authorization',
  longDescription: 'Using Azure Active Directory (Azure AD) authorization provides superior security and ease of use over Shared Key authorization.',
  potentialBenefits: 'Enable Azure Active Directory authorization for storage account',
  impactedField: 'Microsoft.Storage/storageAccounts',
  impactedValue: 'stprod001',
  lastUpdated: new Date('2024-12-15T09:15:00Z'),
  metadata: {
    resourceId: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Storage/storageAccounts/stprod001',
    resourceType: 'Microsoft.Storage/storageAccounts',
    resourceGroup: 'rg-production',
    region: 'westus2',
    recommendedActions: [
      'Enable Azure AD authentication',
      'Disable shared key access',
    ],
  },
};

/**
 * Mock invalid Azure credentials
 */
export const mockAzureAdvisorCredentialsInvalid: CloudProviderCredentials = {
  provider: 'azure',
  azureTenantId: 'invalid-tenant',
  azureClientId: 'invalid-client',
  azureClientSecret: 'invalid-secret',
  azureSubscriptionId: 'invalid-subscription',
};

/**
 * Mock Azure API error - Authentication Failed
 */
export const mockAzureAdvisorAuthError = {
  statusCode: 401,
  code: 'AuthenticationFailed',
  message: 'Authentication failed. The credentials provided are invalid.',
};

/**
 * Mock Azure API error - Subscription Not Found
 */
export const mockAzureAdvisorSubscriptionNotFoundError = {
  statusCode: 404,
  code: 'SubscriptionNotFound',
  message: 'The subscription was not found.',
};

/**
 * Mock Azure API error - Access Denied
 */
export const mockAzureAdvisorAccessDeniedError = {
  statusCode: 403,
  code: 'AuthorizationFailed',
  message: 'The client does not have authorization to perform action Microsoft.Advisor/recommendations/read.',
};

/**
 * Mock Azure API error - Rate Limit
 */
export const mockAzureAdvisorRateLimitError = {
  statusCode: 429,
  code: 'TooManyRequests',
  message: 'Too many requests. Please retry after some time.',
  retryAfter: 60,
};
