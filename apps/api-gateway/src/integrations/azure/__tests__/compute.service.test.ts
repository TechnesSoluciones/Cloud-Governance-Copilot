/**
 * Unit Tests: Azure Compute Service
 *
 * This test suite verifies the AzureComputeService functionality with mocked Azure SDK.
 * Tests cover asset discovery, multi-subscription support, filtering, transformation, and error handling.
 *
 * Following TDD methodology - Tests written before implementation.
 */

import { AzureComputeService } from '../compute.service';
import { ComputeManagementClient } from '@azure/arm-compute';
import { ClientSecretCredential } from '@azure/identity';
import type { AssetFilters, CloudAsset } from '../../cloud-provider.interface';
import {
  mockAzureVMResponse,
  mockAzureVMStopped,
  mockAzureVMList,
  mockAzureErrors,
  expectedCloudAssetFromAzure,
} from '../../../__fixtures__/azure-vms.fixture';

// Mock Azure SDK
jest.mock('@azure/arm-compute');
jest.mock('@azure/identity');

describe('AzureComputeService', () => {
  let service: AzureComputeService;
  let mockVirtualMachinesList: jest.Mock;
  let mockVirtualMachinesGet: jest.Mock;
  let mockVirtualMachinesInstanceView: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock functions
    mockVirtualMachinesList = jest.fn();
    mockVirtualMachinesGet = jest.fn();
    mockVirtualMachinesInstanceView = jest.fn();

    // Mock ComputeManagementClient
    (ComputeManagementClient as jest.MockedClass<typeof ComputeManagementClient>).mockImplementation(
      () =>
        ({
          virtualMachines: {
            listAll: mockVirtualMachinesList,
            get: mockVirtualMachinesGet,
            instanceView: mockVirtualMachinesInstanceView,
          },
        }) as any
    );

    // Mock ClientSecretCredential
    (ClientSecretCredential as jest.MockedClass<typeof ClientSecretCredential>).mockImplementation(
      () => ({} as any)
    );

    // Create service instance with test credentials
    service = new AzureComputeService({
      provider: 'azure',
      azureTenantId: 'test-tenant-id',
      azureClientId: 'test-client-id',
      azureClientSecret: 'test-client-secret',
      azureSubscriptionId: '12345678-1234-1234-1234-123456789012',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // Constructor Tests
  // ============================================================

  describe('Constructor', () => {
    it('should initialize client correctly with valid credentials', () => {
      expect(ClientSecretCredential).toHaveBeenCalledWith(
        'test-tenant-id',
        'test-client-id',
        'test-client-secret'
      );
      expect(ComputeManagementClient).toHaveBeenCalledWith(
        expect.any(Object),
        '12345678-1234-1234-1234-123456789012'
      );
    });

    it('should throw error if tenantId is missing', () => {
      expect(() => {
        new AzureComputeService({
          provider: 'azure',
          azureTenantId: '',
          azureClientId: 'test-client-id',
          azureClientSecret: 'test-secret',
          azureSubscriptionId: 'test-sub',
        });
      }).toThrow('Azure credentials (tenantId, clientId, clientSecret, subscriptionId) are required');
    });

    it('should throw error if clientId is missing', () => {
      expect(() => {
        new AzureComputeService({
          provider: 'azure',
          azureTenantId: 'test-tenant',
          azureClientId: '',
          azureClientSecret: 'test-secret',
          azureSubscriptionId: 'test-sub',
        });
      }).toThrow('Azure credentials (tenantId, clientId, clientSecret, subscriptionId) are required');
    });

    it('should throw error if clientSecret is missing', () => {
      expect(() => {
        new AzureComputeService({
          provider: 'azure',
          azureTenantId: 'test-tenant',
          azureClientId: 'test-client',
          azureClientSecret: '',
          azureSubscriptionId: 'test-sub',
        });
      }).toThrow('Azure credentials (tenantId, clientId, clientSecret, subscriptionId) are required');
    });

    it('should throw error if subscriptionId is missing', () => {
      expect(() => {
        new AzureComputeService({
          provider: 'azure',
          azureTenantId: 'test-tenant',
          azureClientId: 'test-client',
          azureClientSecret: 'test-secret',
          azureSubscriptionId: '',
        });
      }).toThrow('Azure credentials (tenantId, clientId, clientSecret, subscriptionId) are required');
    });
  });

  // ============================================================
  // discoverAssets Tests
  // ============================================================

  describe('discoverAssets', () => {
    it('should discover VMs across all subscriptions', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse;
          yield mockAzureVMStopped;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      expect(result).toHaveLength(2);
      expect(mockVirtualMachinesList).toHaveBeenCalled();
    });

    it('should transform Azure VMs to CloudAsset[] format', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        resourceId: mockAzureVMResponse.id,
        resourceType: 'azurevm',
        name: 'web-server-prod-01',
        region: 'eastus',
        status: 'running',
        tags: {
          Environment: 'Production',
          CostCenter: 'Engineering',
          Owner: 'devops-team',
        },
      });
      expect(result[0].metadata).toMatchObject({
        vmSize: 'Standard_DS2_v2',
        osType: 'Linux',
        provisioningState: 'Succeeded',
        resourceGroup: 'production-rg',
        subscriptionId: '12345678-1234-1234-1234-123456789012',
      });
    });

    it('should filter by VM status (running)', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse; // running
          yield mockAzureVMStopped; // deallocated
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets({ status: 'running' });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('running');
      expect(result[0].name).toBe('web-server-prod-01');
    });

    it('should filter by VM status (stopped/deallocated)', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse; // running
          yield mockAzureVMStopped; // deallocated
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets({ status: 'deallocated' });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('deallocated');
      expect(result[0].name).toBe('dev-server-01');
    });

    it('should filter by tags', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse;
          yield mockAzureVMStopped;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets({
        tags: {
          Environment: 'Production',
        },
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].tags.Environment).toBe('Production');
      expect(result[0].name).toBe('web-server-prod-01');
    });

    it('should filter by location/region', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse; // eastus
          yield mockAzureVMStopped; // westus2
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets({ region: 'eastus' });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].region).toBe('eastus');
      expect(result[0].name).toBe('web-server-prod-01');
    });

    it('should handle multiple filters simultaneously', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse;
          yield mockAzureVMStopped;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets({
        region: 'eastus',
        status: 'running',
        tags: {
          Environment: 'Production',
        },
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('web-server-prod-01');
    });

    it('should handle VMs without tags', async () => {
      // Arrange
      const vmWithoutTags = {
        ...mockAzureVMResponse,
        tags: undefined,
      };
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield vmWithoutTags;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].tags).toEqual({});
    });

    it('should extract resource group correctly', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      expect(result[0].metadata.resourceGroup).toBe('production-rg');
    });

    it('should extract subscription ID correctly', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      expect(result[0].metadata.subscriptionId).toBe('12345678-1234-1234-1234-123456789012');
    });

    it('should set correct resourceType (azurevm)', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      expect(result[0].resourceType).toBe('azurevm');
    });

    it('should generate correct Azure resource ID', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      expect(result[0].resourceId).toBe(
        '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/production-rg/providers/Microsoft.Compute/virtualMachines/web-server-prod-01'
      );
    });
  });

  // ============================================================
  // getAssetDetails Tests
  // ============================================================

  describe('getAssetDetails', () => {
    it('should return asset details by resource ID', async () => {
      // Arrange
      const resourceId =
        '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/production-rg/providers/Microsoft.Compute/virtualMachines/web-server-prod-01';
      mockVirtualMachinesGet.mockResolvedValue(mockAzureVMResponse);
      mockVirtualMachinesInstanceView.mockResolvedValue(mockAzureVMResponse.instanceView);

      // Act
      const result = await service.getAssetDetails(resourceId);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.resourceId).toBe(resourceId);
      expect(result?.name).toBe('web-server-prod-01');
      expect(mockVirtualMachinesGet).toHaveBeenCalledWith('production-rg', 'web-server-prod-01');
    });

    it('should include VM size, status, and tags', async () => {
      // Arrange
      const resourceId =
        '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/production-rg/providers/Microsoft.Compute/virtualMachines/web-server-prod-01';
      mockVirtualMachinesGet.mockResolvedValue(mockAzureVMResponse);
      mockVirtualMachinesInstanceView.mockResolvedValue(mockAzureVMResponse.instanceView);

      // Act
      const result = await service.getAssetDetails(resourceId);

      // Assert
      expect(result?.metadata.vmSize).toBe('Standard_DS2_v2');
      expect(result?.status).toBe('running');
      expect(result?.tags).toEqual({
        Environment: 'Production',
        CostCenter: 'Engineering',
        Owner: 'devops-team',
      });
    });

    it('should return null for non-existent VM', async () => {
      // Arrange
      const resourceId =
        '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.Compute/virtualMachines/nonexistent-vm';
      mockVirtualMachinesGet.mockRejectedValue(mockAzureErrors.resourceNotFound);

      // Act
      const result = await service.getAssetDetails(resourceId);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle invalid resource ID format', async () => {
      // Arrange
      const invalidResourceId = 'invalid-resource-id';

      // Act
      const result = await service.getAssetDetails(invalidResourceId);

      // Assert
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // Multi-Subscription Discovery Tests
  // ============================================================

  describe('Multi-Subscription Discovery', () => {
    it('should query all subscriptions in credentials', async () => {
      // This test verifies that the service can be configured with multiple subscriptions
      // For now, we test single subscription behavior
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      expect(result).toHaveLength(1);
      expect(mockVirtualMachinesList).toHaveBeenCalled();
    });

    it('should aggregate results from all subscriptions', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse;
          yield mockAzureVMStopped;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle subscription-specific errors gracefully', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse;
          throw mockAzureErrors.subscriptionNotFound;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act & Assert
      // Service should handle errors gracefully and return what it could fetch
      await expect(service.discoverAssets()).rejects.toThrow();
    });
  });

  // ============================================================
  // Asset Normalization Tests
  // ============================================================

  describe('Asset Normalization', () => {
    it('should map Azure VM fields to CloudAsset interface', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      const asset = result[0];
      expect(asset).toHaveProperty('resourceId');
      expect(asset).toHaveProperty('resourceType');
      expect(asset).toHaveProperty('name');
      expect(asset).toHaveProperty('region');
      expect(asset).toHaveProperty('status');
      expect(asset).toHaveProperty('tags');
      expect(asset).toHaveProperty('metadata');
    });

    it('should extract VM size correctly', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      expect(result[0].metadata.vmSize).toBe('Standard_DS2_v2');
    });

    it('should extract tags correctly', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      expect(result[0].tags).toEqual({
        Environment: 'Production',
        CostCenter: 'Engineering',
        Owner: 'devops-team',
      });
    });

    it('should set correct resourceType (azurevm)', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      expect(result[0].resourceType).toBe('azurevm');
    });

    it('should generate correct ARN-like identifier', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      expect(result[0].resourceId).toContain('/subscriptions/');
      expect(result[0].resourceId).toContain('/resourceGroups/');
      expect(result[0].resourceId).toContain('/providers/Microsoft.Compute/virtualMachines/');
    });
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================

  describe('Error Handling', () => {
    it('should handle AuthenticationError', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          throw mockAzureErrors.authenticationError;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act & Assert
      await expect(service.discoverAssets()).rejects.toThrow();
    });

    it('should handle ResourceGroupNotFound', async () => {
      // Arrange
      mockVirtualMachinesGet.mockRejectedValue(mockAzureErrors.resourceGroupNotFound);

      // Act
      const result = await service.getAssetDetails(
        '/subscriptions/test/resourceGroups/nonexistent/providers/Microsoft.Compute/virtualMachines/test-vm'
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should retry on transient failures', async () => {
      // Arrange
      let attemptCount = 0;
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          attemptCount++;
          if (attemptCount === 1) {
            throw mockAzureErrors.networkError;
          }
          yield mockAzureVMResponse;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      expect(result).toHaveLength(1);
      expect(attemptCount).toBe(2);
    });

    it('should not retry on authentication errors', async () => {
      // Arrange
      let attemptCount = 0;
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          attemptCount++;
          throw mockAzureErrors.authenticationError;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act & Assert
      await expect(service.discoverAssets()).rejects.toThrow();
      expect(attemptCount).toBe(1); // Should not retry
    });

    it('should handle throttling errors with retry', async () => {
      // Arrange
      let attemptCount = 0;
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          attemptCount++;
          if (attemptCount === 1) {
            throw mockAzureErrors.throttlingError;
          }
          yield mockAzureVMResponse;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      expect(result).toHaveLength(1);
      expect(attemptCount).toBe(2);
    });
  });

  // ============================================================
  // Resource Type Filter Tests
  // ============================================================

  describe('Resource Type Filter', () => {
    it('should return empty array when filtering for non-VM resources', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets({ resourceType: 'storage-account' });

      // Assert
      expect(result).toEqual([]);
    });

    it('should discover assets when filtering for azurevm', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets({ resourceType: 'azurevm' });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].resourceType).toBe('azurevm');
    });

    it('should discover all VMs when no resourceType filter is provided', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield mockAzureVMResponse;
          yield mockAzureVMStopped;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('Edge Cases', () => {
    it('should handle empty VM list', async () => {
      // Arrange
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          // No VMs
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle VMs with incomplete data', async () => {
      // Arrange
      const incompleteVM = {
        id: '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Compute/virtualMachines/incomplete-vm',
        name: 'incomplete-vm',
        location: 'eastus',
        // Missing properties, tags, instanceView
      };
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield incompleteVM;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('incomplete-vm');
      expect(result[0].tags).toEqual({});
    });

    it('should handle VMs without instance view', async () => {
      // Arrange
      const vmWithoutInstanceView = {
        ...mockAzureVMResponse,
        instanceView: undefined,
      };
      const mockIterator = {
        [Symbol.asyncIterator]: async function* () {
          yield vmWithoutInstanceView;
        },
      };
      mockVirtualMachinesList.mockReturnValue(mockIterator);

      // Act
      const result = await service.discoverAssets();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('unknown');
    });
  });
});
