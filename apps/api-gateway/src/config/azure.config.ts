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
    advisor: {
      requestsPerSecond: number;
      burstSize: number;
    };
  };

  // Azure Advisor configuration
  advisor: {
    enabled: boolean;
    cacheTTLSeconds: number;          // How long to cache recommendations
    rateLimitPerTenant: number;       // Max requests per minute per tenant
    autoGenerateInterval: number;     // Hours between auto-generation (0 = disabled)
    categories: {
      cost: boolean;
      security: boolean;
      reliability: boolean;
      performance: boolean;
      operationalExcellence: boolean;
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
    resources: 3600,     // 1 hour (increased from 15 min to reduce Azure API calls)
    costs: 7200,         // 2 hours (increased from 1 hour)
    security: 600,       // 10 minutes (increased from 5 min)
    advisor: 3600,       // 1 hour (increased from 30 min)
    metrics: 600,        // 10 minutes (increased from 5 min)
  },

  rateLimit: {
    resourceGraph: {
      requestsPerSecond: 5,   // Reduced from 15 to prevent Azure rate limiting
      burstSize: 8,           // Reduced from 20 to prevent burst spikes
    },
    costManagement: {
      requestsPerSecond: 3,   // Reduced from 5 to be more conservative
      burstSize: 5,           // Reduced from 10
    },
    advisor: {
      requestsPerSecond: 5,   // Reduced from 10
      burstSize: 8,           // Reduced from 15
    },
  },

  advisor: {
    enabled: process.env.AZURE_ADVISOR_ENABLED === 'true',
    cacheTTLSeconds: 86400,           // 24 hours (recommendations updated daily)
    rateLimitPerTenant: 10,           // 10 requests per minute per tenant
    autoGenerateInterval: 0,          // Disabled by default (Azure auto-generates daily)
    categories: {
      cost: true,
      security: true,
      reliability: true,
      performance: true,
      operationalExcellence: true,
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
