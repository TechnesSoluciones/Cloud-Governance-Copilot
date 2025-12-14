/**
 * Azure Configuration
 * Centralized configuration for all Azure SDK clients
 */

export interface AzureCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
}

export interface AzureConfig {
  // Default timeout for Azure API calls (ms)
  defaultTimeout: number;

  // Retry configuration
  retryOptions: {
    maxRetries: number;
    retryDelayMs: number;
    maxRetryDelayMs: number;
  };

  // Cache TTLs (seconds)
  cacheTTL: {
    resources: number;        // 15 minutes
    costs: number;            // 1 hour
    security: number;         // 5 minutes
    advisor: number;          // 30 minutes
    metrics: number;          // 5 minutes
  };

  // Rate limiting
  rateLimit: {
    resourceGraph: {
      requestsPerSecond: number;
      burstSize: number;
    };
    costManagement: {
      requestsPerSecond: number;
      burstSize: number;
    };
  };
}

export const azureConfig: AzureConfig = {
  defaultTimeout: 30000, // 30 seconds

  retryOptions: {
    maxRetries: 3,
    retryDelayMs: 1000,
    maxRetryDelayMs: 10000,
  },

  cacheTTL: {
    resources: 900,      // 15 minutes
    costs: 3600,         // 1 hour
    security: 300,       // 5 minutes
    advisor: 1800,       // 30 minutes
    metrics: 300,        // 5 minutes
  },

  rateLimit: {
    resourceGraph: {
      requestsPerSecond: 15,  // Azure Resource Graph limit
      burstSize: 20,
    },
    costManagement: {
      requestsPerSecond: 5,   // Conservative for cost APIs
      burstSize: 10,
    },
  },
};

/**
 * Azure API Endpoints
 */
export const AZURE_ENDPOINTS = {
  resourceManager: 'https://management.azure.com',
  activeDirectory: 'https://graph.microsoft.com',
  storage: 'https://storage.azure.com',
} as const;

/**
 * Azure Resource Types
 */
export const AZURE_RESOURCE_TYPES = {
  virtualMachine: 'Microsoft.Compute/virtualMachines',
  storageAccount: 'Microsoft.Storage/storageAccounts',
  sqlDatabase: 'Microsoft.Sql/servers/databases',
  appService: 'Microsoft.Web/sites',
  loadBalancer: 'Microsoft.Network/loadBalancers',
  networkInterface: 'Microsoft.Network/networkInterfaces',
  publicIpAddress: 'Microsoft.Network/publicIPAddresses',
  virtualNetwork: 'Microsoft.Network/virtualNetworks',
  keyVault: 'Microsoft.KeyVault/vaults',
  containerRegistry: 'Microsoft.ContainerRegistry/registries',
  kubernetesCluster: 'Microsoft.ContainerService/managedClusters',
} as const;
