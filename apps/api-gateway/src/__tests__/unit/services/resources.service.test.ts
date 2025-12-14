/**
 * Resources Service Unit Tests
 * Tests for resource inventory functionality
 */

import { ResourcesService } from '../../../modules/resources/services/resources.service';
import { AzureResourceGraphService } from '../../../services/azure/resourceGraph.service';

// Mock dependencies
jest.mock('../../../services/azure/resourceGraph.service');
jest.mock('../../../utils/logger');

describe('ResourcesService', () => {
  const mockAccountId = 'test-account-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getResourceInventory', () => {
    it('should return paginated resource inventory with default pagination', async () => {
      const mockResources = [
        {
          id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm1',
          name: 'vm1',
          type: 'microsoft.compute/virtualmachines',
          location: 'eastus',
          resourceGroup: 'rg1',
          tags: { environment: 'production' },
          properties: { vmSize: 'Standard_D2s_v3' },
        },
        {
          id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Storage/storageAccounts/storage1',
          name: 'storage1',
          type: 'microsoft.storage/storageaccounts',
          location: 'westus',
          resourceGroup: 'rg1',
          tags: { environment: 'development' },
          properties: { sku: 'Standard_LRS' },
        },
      ];

      (AzureResourceGraphService.getResourcesWithFilters as jest.Mock).mockResolvedValue({
        resources: mockResources,
        pagination: { page: 1, limit: 50, hasMore: false },
      });

      const result = await ResourcesService.getResourceInventory(mockAccountId);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe(mockResources[0].id);
      expect(result.data[0].name).toBe('vm1');
      expect(result.data[1].name).toBe('storage1');
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should apply filters correctly', async () => {
      (AzureResourceGraphService.getResourcesWithFilters as jest.Mock).mockResolvedValue({
        resources: [],
        pagination: { page: 1, limit: 50, hasMore: false },
      });

      const filters = {
        resourceType: 'Microsoft.Compute/virtualMachines',
        location: 'eastus',
        resourceGroup: 'prod-rg',
        tags: { environment: 'production' },
      };

      await ResourcesService.getResourceInventory(mockAccountId, filters);

      expect(AzureResourceGraphService.getResourcesWithFilters).toHaveBeenCalledWith(
        mockAccountId,
        {
          type: 'Microsoft.Compute/virtualMachines',
          location: 'eastus',
          resourceGroup: 'prod-rg',
          tags: { environment: 'production' },
        },
        { page: 1, limit: 50 }
      );
    });

    it('should handle custom pagination', async () => {
      (AzureResourceGraphService.getResourcesWithFilters as jest.Mock).mockResolvedValue({
        resources: new Array(25).fill({
          id: '/test/resource',
          name: 'test',
          type: 'microsoft.test/resources',
          location: 'eastus',
          resourceGroup: 'test-rg',
          tags: {},
        }),
        pagination: { page: 2, limit: 25, hasMore: true },
      });

      const pagination = { page: 2, limit: 25 };
      const result = await ResourcesService.getResourceInventory(
        mockAccountId,
        {},
        pagination
      );

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(25);
      expect(result.pagination.hasMore).toBe(true);
      // Since hasMore is true, total should be at least (page * limit) + 1
      expect(result.pagination.total).toBeGreaterThanOrEqual(51);
    });

    it('should throw error for invalid pagination', async () => {
      await expect(
        ResourcesService.getResourceInventory(mockAccountId, {}, { page: 0, limit: 50 })
      ).rejects.toThrow('Page must be greater than or equal to 1');

      await expect(
        ResourcesService.getResourceInventory(mockAccountId, {}, { page: 1, limit: 0 })
      ).rejects.toThrow('Limit must be greater than or equal to 1');

      await expect(
        ResourcesService.getResourceInventory(mockAccountId, {}, { page: 1, limit: 101 })
      ).rejects.toThrow('Limit cannot exceed 100');
    });

    it('should throw error for invalid resource type format', async () => {
      const filters = {
        resourceType: 'invalid-format',
      };

      await expect(
        ResourcesService.getResourceInventory(mockAccountId, filters)
      ).rejects.toThrow('Invalid resource type format');
    });

    it('should calculate total count correctly when no more results', async () => {
      (AzureResourceGraphService.getResourcesWithFilters as jest.Mock).mockResolvedValue({
        resources: new Array(30).fill({
          id: '/test/resource',
          name: 'test',
          type: 'microsoft.test/resources',
          location: 'eastus',
          resourceGroup: 'test-rg',
          tags: {},
        }),
        pagination: { page: 3, limit: 50, hasMore: false },
      });

      const result = await ResourcesService.getResourceInventory(
        mockAccountId,
        {},
        { page: 3, limit: 50 }
      );

      // Total should be (page - 1) * limit + current count = 2 * 50 + 30 = 130
      expect(result.pagination.total).toBe(130);
      expect(result.pagination.totalPages).toBe(3);
    });
  });

  describe('getResourceMetadata', () => {
    it('should return resource metadata', async () => {
      const mockMetadata = {
        types: ['microsoft.compute/virtualmachines', 'microsoft.storage/storageaccounts'],
        locations: ['eastus', 'westus'],
        resourceGroups: ['prod-rg', 'dev-rg'],
      };

      (AzureResourceGraphService.getResourceMetadata as jest.Mock).mockResolvedValue(
        mockMetadata
      );

      const result = await ResourcesService.getResourceMetadata(mockAccountId);

      expect(result).toEqual(mockMetadata);
      expect(AzureResourceGraphService.getResourceMetadata).toHaveBeenCalledWith(mockAccountId);
    });

    it('should throw error for invalid account ID', async () => {
      await expect(
        ResourcesService.getResourceMetadata('')
      ).rejects.toThrow('Invalid accountId');
    });
  });

  describe('searchResources', () => {
    it('should search resources with valid term', async () => {
      const mockResults = [
        {
          id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/prod-vm',
          name: 'prod-vm',
          type: 'microsoft.compute/virtualmachines',
          location: 'eastus',
          resourceGroup: 'rg1',
          tags: {},
        },
      ];

      (AzureResourceGraphService.searchResourcesAdvanced as jest.Mock).mockResolvedValue(
        mockResults
      );

      const result = await ResourcesService.searchResources(mockAccountId, 'prod', 100);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('prod-vm');
      expect(AzureResourceGraphService.searchResourcesAdvanced).toHaveBeenCalledWith(
        mockAccountId,
        'prod',
        100
      );
    });

    it('should throw error for empty search term', async () => {
      await expect(
        ResourcesService.searchResources(mockAccountId, '', 100)
      ).rejects.toThrow('Invalid searchTerm');
    });

    it('should throw error for search term that is too long', async () => {
      const longTerm = 'a'.repeat(201);
      await expect(
        ResourcesService.searchResources(mockAccountId, longTerm, 100)
      ).rejects.toThrow('Search term too long');
    });

    it('should not trim search term automatically', async () => {
      (AzureResourceGraphService.searchResourcesAdvanced as jest.Mock).mockResolvedValue([]);

      await ResourcesService.searchResources(mockAccountId, '  search term  ', 100);

      // The service doesn't trim automatically, it passes the term as-is
      expect(AzureResourceGraphService.searchResourcesAdvanced).toHaveBeenCalledWith(
        mockAccountId,
        '  search term  ',
        100
      );
    });

    it('should enforce limit constraints', async () => {
      (AzureResourceGraphService.searchResourcesAdvanced as jest.Mock).mockResolvedValue([]);

      // Test with limit above max
      await expect(
        ResourcesService.searchResources(mockAccountId, 'test', 2000)
      ).rejects.toThrow('Limit must be between 1 and 100');

      // Test with limit below min
      await expect(
        ResourcesService.searchResources(mockAccountId, 'test', -5)
      ).rejects.toThrow('Limit must be between 1 and 100');

      // Test with valid limit
      await ResourcesService.searchResources(mockAccountId, 'test', 50);
      expect(AzureResourceGraphService.searchResourcesAdvanced).toHaveBeenCalledWith(
        mockAccountId,
        'test',
        50
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle errors from Resource Graph Service', async () => {
      (AzureResourceGraphService.getResourcesWithFilters as jest.Mock).mockRejectedValue(
        new Error('Azure API error')
      );

      await expect(
        ResourcesService.getResourceInventory(mockAccountId)
      ).rejects.toThrow('Failed to retrieve resource inventory');
    });

    it('should handle invalid account ID', async () => {
      await expect(
        ResourcesService.getResourceInventory('')
      ).rejects.toThrow('Invalid accountId');

      await expect(
        ResourcesService.getResourceInventory(null as any)
      ).rejects.toThrow('Invalid accountId');
    });
  });
});
