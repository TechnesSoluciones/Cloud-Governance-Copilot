/**
 * Azure Virtual Machines Fixtures
 *
 * Mock data for testing Azure Compute Service discovery and management.
 * Based on Azure Compute REST API: https://docs.microsoft.com/en-us/rest/api/compute/virtual-machines
 */

import type { CloudAsset } from '../integrations/cloud-provider.interface';
import { faker } from '@faker-js/faker';

/**
 * Mock Azure Virtual Machine response (single VM)
 * Mimics the structure returned by @azure/arm-compute ComputeManagementClient
 */
export const mockAzureVMResponse = {
  id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/production-rg/providers/Microsoft.Compute/virtualMachines/web-server-prod-01',
  name: 'web-server-prod-01',
  type: 'Microsoft.Compute/virtualMachines',
  location: 'eastus',
  tags: {
    Environment: 'Production',
    CostCenter: 'Engineering',
    Owner: 'devops-team',
  },
  properties: {
    vmId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    hardwareProfile: {
      vmSize: 'Standard_DS2_v2',
    },
    storageProfile: {
      osDisk: {
        osType: 'Linux',
        name: 'web-server-prod-01-osdisk',
        createOption: 'FromImage',
        diskSizeGB: 30,
      },
      imageReference: {
        publisher: 'Canonical',
        offer: 'UbuntuServer',
        sku: '20.04-LTS',
        version: 'latest',
      },
    },
    osProfile: {
      computerName: 'web-server-prod-01',
      adminUsername: 'azureuser',
    },
    networkProfile: {
      networkInterfaces: [
        {
          id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/production-rg/providers/Microsoft.Network/networkInterfaces/web-server-nic',
        },
      ],
    },
    provisioningState: 'Succeeded',
  },
  instanceView: {
    statuses: [
      {
        code: 'ProvisioningState/succeeded',
        level: 'Info',
        displayStatus: 'Provisioning succeeded',
      },
      {
        code: 'PowerState/running',
        level: 'Info',
        displayStatus: 'VM running',
      },
    ],
  },
};

/**
 * Mock Azure VM with stopped/deallocated state
 */
export const mockAzureVMStopped = {
  id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/development-rg/providers/Microsoft.Compute/virtualMachines/dev-server-01',
  name: 'dev-server-01',
  type: 'Microsoft.Compute/virtualMachines',
  location: 'westus2',
  tags: {
    Environment: 'Development',
    AutoShutdown: 'true',
  },
  properties: {
    vmId: 'f7e8d9c0-1234-5678-90ab-cdef12345678',
    hardwareProfile: {
      vmSize: 'Standard_B2s',
    },
    storageProfile: {
      osDisk: {
        osType: 'Windows',
        name: 'dev-server-01-osdisk',
      },
    },
    osProfile: {
      computerName: 'dev-server-01',
    },
    provisioningState: 'Succeeded',
  },
  instanceView: {
    statuses: [
      {
        code: 'ProvisioningState/succeeded',
        level: 'Info',
        displayStatus: 'Provisioning succeeded',
      },
      {
        code: 'PowerState/deallocated',
        level: 'Info',
        displayStatus: 'VM deallocated',
      },
    ],
  },
};

/**
 * Mock Azure VM list response
 */
export const mockAzureVMList = [
  mockAzureVMResponse,
  mockAzureVMStopped,
  {
    id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/production-rg/providers/Microsoft.Compute/virtualMachines/db-server-prod-01',
    name: 'db-server-prod-01',
    type: 'Microsoft.Compute/virtualMachines',
    location: 'eastus',
    tags: {
      Environment: 'Production',
      Type: 'Database',
      CostCenter: 'Engineering',
    },
    properties: {
      vmId: '11223344-5566-7788-99aa-bbccddeeff00',
      hardwareProfile: {
        vmSize: 'Standard_DS3_v2',
      },
      storageProfile: {
        osDisk: {
          osType: 'Linux',
          name: 'db-server-prod-01-osdisk',
        },
      },
      osProfile: {
        computerName: 'db-server-prod-01',
      },
      provisioningState: 'Succeeded',
    },
    instanceView: {
      statuses: [
        {
          code: 'ProvisioningState/succeeded',
          level: 'Info',
        },
        {
          code: 'PowerState/running',
          level: 'Info',
          displayStatus: 'VM running',
        },
      ],
    },
  },
];

/**
 * Expected CloudAsset output after transformation
 */
export const expectedCloudAssetFromAzure: CloudAsset[] = [
  {
    resourceId:
      '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/production-rg/providers/Microsoft.Compute/virtualMachines/web-server-prod-01',
    resourceType: 'azurevm',
    name: 'web-server-prod-01',
    region: 'eastus',
    zone: undefined,
    status: 'running',
    tags: {
      Environment: 'Production',
      CostCenter: 'Engineering',
      Owner: 'devops-team',
    },
    metadata: {
      vmSize: 'Standard_DS2_v2',
      osType: 'Linux',
      provisioningState: 'Succeeded',
      resourceGroup: 'production-rg',
      subscriptionId: '12345678-1234-1234-1234-123456789012',
      vmId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      computerName: 'web-server-prod-01',
      imagePublisher: 'Canonical',
      imageOffer: 'UbuntuServer',
      imageSku: '20.04-LTS',
    },
    createdAt: undefined,
    lastModifiedAt: undefined,
  },
  {
    resourceId:
      '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/development-rg/providers/Microsoft.Compute/virtualMachines/dev-server-01',
    resourceType: 'azurevm',
    name: 'dev-server-01',
    region: 'westus2',
    zone: undefined,
    status: 'deallocated',
    tags: {
      Environment: 'Development',
      AutoShutdown: 'true',
    },
    metadata: {
      vmSize: 'Standard_B2s',
      osType: 'Windows',
      provisioningState: 'Succeeded',
      resourceGroup: 'development-rg',
      subscriptionId: '12345678-1234-1234-1234-123456789012',
      vmId: 'f7e8d9c0-1234-5678-90ab-cdef12345678',
      computerName: 'dev-server-01',
    },
    createdAt: undefined,
    lastModifiedAt: undefined,
  },
];

/**
 * Mock Azure Subscription response
 */
export const mockAzureSubscriptions = [
  {
    id: '/subscriptions/12345678-1234-1234-1234-123456789012',
    subscriptionId: '12345678-1234-1234-1234-123456789012',
    displayName: 'Production Subscription',
    state: 'Enabled',
  },
  {
    id: '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890',
    subscriptionId: 'abcdef12-3456-7890-abcd-ef1234567890',
    displayName: 'Development Subscription',
    state: 'Enabled',
  },
];

/**
 * Mock empty Azure VM list (no VMs found)
 */
export const mockEmptyAzureVMList: any[] = [];

/**
 * Generate random Azure VMs for testing
 */
export function generateMockAzureVMs(count: number = 10): any[] {
  const vmSizes = [
    'Standard_B1s',
    'Standard_B2s',
    'Standard_DS2_v2',
    'Standard_DS3_v2',
    'Standard_D4s_v3',
  ];
  const environments = ['development', 'staging', 'production'];
  const regions = ['eastus', 'westus2', 'northeurope', 'southeastasia'];
  const osTypes = ['Linux', 'Windows'];
  const statuses = ['running', 'stopped', 'deallocated'];

  return Array.from({ length: count }, (_, i) => ({
    id: `/subscriptions/${faker.string.uuid()}/resourceGroups/rg-${i}/providers/Microsoft.Compute/virtualMachines/vm-${i}`,
    name: `vm-${faker.word.noun()}-${i + 1}`,
    type: 'Microsoft.Compute/virtualMachines',
    location: faker.helpers.arrayElement(regions),
    tags: {
      Environment: faker.helpers.arrayElement(environments),
      Owner: faker.person.fullName(),
    },
    properties: {
      vmId: faker.string.uuid(),
      hardwareProfile: {
        vmSize: faker.helpers.arrayElement(vmSizes),
      },
      storageProfile: {
        osDisk: {
          osType: faker.helpers.arrayElement(osTypes),
          name: `vm-${i}-osdisk`,
        },
      },
      osProfile: {
        computerName: `vm-${i}`,
      },
      provisioningState: 'Succeeded',
    },
    instanceView: {
      statuses: [
        {
          code: 'ProvisioningState/succeeded',
          level: 'Info',
        },
        {
          code: `PowerState/${faker.helpers.arrayElement(statuses)}`,
          level: 'Info',
          displayStatus: `VM ${faker.helpers.arrayElement(statuses)}`,
        },
      ],
    },
  }));
}

/**
 * Mock Azure API error responses
 */
export const mockAzureErrors = {
  authenticationError: {
    name: 'RestError',
    code: 'AuthenticationFailed',
    statusCode: 401,
    message: 'Authentication failed. The credentials provided are invalid.',
  },
  resourceNotFound: {
    name: 'RestError',
    code: 'ResourceNotFound',
    statusCode: 404,
    message: 'The resource was not found.',
  },
  resourceGroupNotFound: {
    name: 'RestError',
    code: 'ResourceGroupNotFound',
    statusCode: 404,
    message: 'Resource group not found.',
  },
  subscriptionNotFound: {
    name: 'RestError',
    code: 'SubscriptionNotFound',
    statusCode: 404,
    message: 'The subscription could not be found.',
  },
  throttlingError: {
    name: 'RestError',
    code: 'TooManyRequests',
    statusCode: 429,
    message: 'Too many requests. Please retry after some time.',
  },
  networkError: {
    name: 'NetworkError',
    code: 'ECONNRESET',
    message: 'Network connection was reset.',
  },
};
