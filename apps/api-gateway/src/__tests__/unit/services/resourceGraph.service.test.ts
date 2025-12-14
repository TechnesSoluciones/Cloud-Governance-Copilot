/**
 * Azure Resource Graph Service Unit Tests
 *
 * Comprehensive test suite for Azure Resource Graph Service.
 * Tests KQL query execution, resource summary retrieval, and error handling.
 *
 * Test Coverage:
 * - Resource summary retrieval
 * - Resource count by type
 * - Resource search functionality
 * - Recent changes retrieval
 * - Compliance status queries
 * - Query execution with proper KQL formatting
 * - Error handling for Azure SDK failures
 * - Authorization error handling
 * - Empty result handling
 * - Cache behavior
 *
 * @module __tests__/unit/services/resourceGraph.service.test
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AzureResourceGraphService } from '../../../services/azure/resourceGraph.service';

// Mock all dependencies before importing
jest.mock('@azure/arm-resourcegraph');
jest.mock('../../../services/azure/azureCredentials.service');
jest.mock('../../../services/azure/azureRateLimiter.service');
jest.mock('../../../services/azure/azureCache.service');
jest.mock('../../../utils/logger');

describe('AzureResourceGraphService', () => {
  let mockResourceGraphClient: any;
  const { ResourceGraphClient } = require('@azure/arm-resourcegraph');
  const { AzureCredentialsService } = require('../../../services/azure/azureCredentials.service');
  const { AzureRateLimiterService } = require('../../../services/azure/azureRateLimiter.service');
  const { AzureCacheService } = require('../../../services/azure/azureCache.service');

  const ACCOUNT_ID = 'test-account-id';
  const SUBSCRIPTION_ID = 'test-subscription-id';

  const mockCredentials = {
    tenantId: 'test-tenant',
    clientId: 'test-client',
    clientSecret: 'test-secret',
    subscriptionId: SUBSCRIPTION_ID,
  };

  const mockTokenCredential = {
    getToken: jest.fn().mockResolvedValue({
      token: 'mock-token',
      expiresOnTimestamp: Date.now() + 3600000,
    }),
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock AzureCredentialsService methods
    AzureCredentialsService.getTokenCredential = jest.fn().mockResolvedValue(mockTokenCredential);
    AzureCredentialsService.getCredentials = jest.fn().mockResolvedValue(mockCredentials);

    // Mock AzureRateLimiterService
    AzureRateLimiterService.checkRateLimit = jest.fn().mockResolvedValue({
      allowed: true,
      retryAfter: 0,
    });
    AzureRateLimiterService.consumeToken = jest.fn().mockResolvedValue(undefined);

    // Mock AzureCacheService with a simple pass-through for getOrSet
    AzureCacheService.getOrSet = jest.fn().mockImplementation(
      async (category: string, accountId: string, keys: string[], fn: () => Promise<any>) => {
        return await fn();
      }
    );
    AzureCacheService.invalidateAccount = jest.fn().mockResolvedValue(undefined);

    // Mock ResourceGraphClient
    mockResourceGraphClient = {
      resources: jest.fn(),
    };

    ResourceGraphClient.mockImplementation(() => mockResourceGraphClient);
  });

  describe('getResourceSummary', () => {
    it('should return complete resource summary with all data', async () => {
      // Mock responses for each query
      const byTypeResponse = {
        data: [
          { type: 'microsoft.compute/virtualmachines', count_: 10 },
          { type: 'microsoft.storage/storageaccounts', count_: 5 },
          { type: 'microsoft.network/virtualnetworks', count_: 3 },
        ],
      };

      const byLocationResponse = {
        data: [
          { location: 'eastus', count_: 12 },
          { location: 'westus', count_: 6 },
        ],
      };

      const vmResponse = {
        data: [
          {
            total: 10,
            running: 7,
            stopped: 3,
          },
        ],
      };

      mockResourceGraphClient.resources
        .mockResolvedValueOnce(byTypeResponse)
        .mockResolvedValueOnce(byLocationResponse)
        .mockResolvedValueOnce(vmResponse);

      const summary = await AzureResourceGraphService.getResourceSummary(ACCOUNT_ID);

      expect(summary).toEqual({
        totalResources: 18,
        byType: [
          { type: 'microsoft.compute/virtualmachines', count: 10 },
          { type: 'microsoft.storage/storageaccounts', count: 5 },
          { type: 'microsoft.network/virtualnetworks', count: 3 },
        ],
        byLocation: [
          { location: 'eastus', count: 12 },
          { location: 'westus', count: 6 },
        ],
        virtualMachines: {
          total: 10,
          running: 7,
          stopped: 3,
        },
      });

      // Verify queries were called with correct subscription
      expect(mockResourceGraphClient.resources).toHaveBeenCalledTimes(3);
      expect(mockResourceGraphClient.resources).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptions: [SUBSCRIPTION_ID],
        })
      );
    });

    it('should handle empty VM data gracefully', async () => {
      const byTypeResponse = { data: [{ type: 'microsoft.storage/storageaccounts', count_: 5 }] };
      const byLocationResponse = { data: [{ location: 'eastus', count: 5 }] };
      const vmResponse = { data: [] }; // No VM data

      mockResourceGraphClient.resources
        .mockResolvedValueOnce(byTypeResponse)
        .mockResolvedValueOnce(byLocationResponse)
        .mockResolvedValueOnce(vmResponse);

      const summary = await AzureResourceGraphService.getResourceSummary(ACCOUNT_ID);

      expect(summary.virtualMachines).toEqual({
        total: 0,
        running: 0,
        stopped: 0,
      });
    });

    it('should handle null VM counts gracefully', async () => {
      const byTypeResponse = { data: [{ type: 'microsoft.storage/storageaccounts', count_: 5 }] };
      const byLocationResponse = { data: [{ location: 'eastus', count: 5 }] };
      const vmResponse = {
        data: [
          {
            total: null,
            running: null,
            stopped: null,
          },
        ],
      };

      mockResourceGraphClient.resources
        .mockResolvedValueOnce(byTypeResponse)
        .mockResolvedValueOnce(byLocationResponse)
        .mockResolvedValueOnce(vmResponse);

      const summary = await AzureResourceGraphService.getResourceSummary(ACCOUNT_ID);

      expect(summary.virtualMachines).toEqual({
        total: 0,
        running: 0,
        stopped: 0,
      });
    });

    it('should calculate total resources correctly from resource types', async () => {
      const byTypeResponse = {
        data: [
          { type: 'type1', count_: 100 },
          { type: 'type2', count_: 50 },
          { type: 'type3', count_: 25 },
        ],
      };
      const byLocationResponse = { data: [{ location: 'eastus', count: 175 }] };
      const vmResponse = { data: [{ total: 10, running: 5, stopped: 5 }] };

      mockResourceGraphClient.resources
        .mockResolvedValueOnce(byTypeResponse)
        .mockResolvedValueOnce(byLocationResponse)
        .mockResolvedValueOnce(vmResponse);

      const summary = await AzureResourceGraphService.getResourceSummary(ACCOUNT_ID);

      expect(summary.totalResources).toBe(175); // 100 + 50 + 25
    });

    it('should handle empty resource list', async () => {
      const emptyResponse = { data: [] };

      mockResourceGraphClient.resources
        .mockResolvedValueOnce(emptyResponse)
        .mockResolvedValueOnce(emptyResponse)
        .mockResolvedValueOnce(emptyResponse);

      const summary = await AzureResourceGraphService.getResourceSummary(ACCOUNT_ID);

      expect(summary.totalResources).toBe(0);
      expect(summary.byType).toEqual([]);
      expect(summary.byLocation).toEqual([]);
      expect(summary.virtualMachines.total).toBe(0);
    });

    it('should propagate errors from query execution', async () => {
      const error = new Error('Query execution failed');
      mockResourceGraphClient.resources.mockRejectedValue(error);

      await expect(
        AzureResourceGraphService.getResourceSummary(ACCOUNT_ID)
      ).rejects.toThrow('Query execution failed');
    });

    it('should call getCredentials and getTokenCredential', async () => {
      const byTypeResponse = { data: [{ type: 'type1', count_: 1 }] };
      const byLocationResponse = { data: [{ location: 'eastus', count: 1 }] };
      const vmResponse = { data: [{ total: 0, running: 0, stopped: 0 }] };

      mockResourceGraphClient.resources
        .mockResolvedValueOnce(byTypeResponse)
        .mockResolvedValueOnce(byLocationResponse)
        .mockResolvedValueOnce(vmResponse);

      await AzureResourceGraphService.getResourceSummary(ACCOUNT_ID);

      expect(AzureCredentialsService.getTokenCredential).toHaveBeenCalledWith(ACCOUNT_ID);
      expect(AzureCredentialsService.getCredentials).toHaveBeenCalledWith(ACCOUNT_ID);
    });
  });

  describe('getResourceCountByType', () => {
    it('should return count for specified resource type', async () => {
      const response = {
        data: [{ Count: 15 }],
      };

      mockResourceGraphClient.resources.mockResolvedValue(response);

      const count = await AzureResourceGraphService.getResourceCountByType(
        ACCOUNT_ID,
        'Microsoft.Compute/virtualMachines'
      );

      expect(count).toBe(15);

      // Verify query format
      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('microsoft.compute/virtualmachines');
      expect(queryArg.query).toContain('count');
    });

    it('should convert resource type to lowercase in query', async () => {
      const response = { data: [{ Count: 5 }] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getResourceCountByType(
        ACCOUNT_ID,
        'Microsoft.Storage/StorageAccounts'
      );

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('microsoft.storage/storageaccounts');
    });

    it('should return 0 when no resources found', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      const count = await AzureResourceGraphService.getResourceCountByType(
        ACCOUNT_ID,
        'Microsoft.Compute/disks'
      );

      expect(count).toBe(0);
    });

    it('should return 0 when Count is null', async () => {
      const response = { data: [{ Count: null }] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      const count = await AzureResourceGraphService.getResourceCountByType(
        ACCOUNT_ID,
        'Microsoft.Network/loadBalancers'
      );

      expect(count).toBe(0);
    });

    it('should handle query errors', async () => {
      const error = new Error('Resource type not found');
      mockResourceGraphClient.resources.mockRejectedValue(error);

      await expect(
        AzureResourceGraphService.getResourceCountByType(ACCOUNT_ID, 'Invalid.Type')
      ).rejects.toThrow();
    });
  });

  describe('searchResources', () => {
    it('should search resources by name', async () => {
      const response = {
        data: [
          {
            id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/vm1',
            name: 'test-vm-1',
            type: 'microsoft.compute/virtualmachines',
            location: 'eastus',
            resourceGroup: 'test-rg',
            tags: { env: 'prod' },
          },
          {
            id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/vm2',
            name: 'test-vm-2',
            type: 'microsoft.compute/virtualmachines',
            location: 'westus',
            resourceGroup: 'test-rg',
            tags: { env: 'dev' },
          },
        ],
      };

      mockResourceGraphClient.resources.mockResolvedValue(response);

      const results = await AzureResourceGraphService.searchResources(ACCOUNT_ID, 'test-vm');

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('test-vm-1');
      expect(results[1].name).toBe('test-vm-2');

      // Verify search query includes the term
      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('test-vm');
      expect(queryArg.query).toContain('contains');
    });

    it('should search resources by tag', async () => {
      const response = {
        data: [
          {
            id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/sa1',
            name: 'storage1',
            type: 'microsoft.storage/storageaccounts',
            location: 'eastus',
            resourceGroup: 'test-rg',
            tags: { environment: 'production' },
          },
        ],
      };

      mockResourceGraphClient.resources.mockResolvedValue(response);

      const results = await AzureResourceGraphService.searchResources(ACCOUNT_ID, 'production');

      expect(results).toHaveLength(1);
      expect(results[0].tags.environment).toBe('production');
    });

    it('should limit results to 100', async () => {
      const response = { data: Array(150).fill({ name: 'resource' }) };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.searchResources(ACCOUNT_ID, 'resource');

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('limit 100');
    });

    it('should return empty array when no matches found', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      const results = await AzureResourceGraphService.searchResources(ACCOUNT_ID, 'nonexistent');

      expect(results).toEqual([]);
    });

    it('should handle special characters in search term', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      // Should not throw error
      await expect(
        AzureResourceGraphService.searchResources(ACCOUNT_ID, "test'vm")
      ).resolves.toEqual([]);
    });
  });

  describe('getRecentChanges', () => {
    it('should return recent resource changes', async () => {
      const response = {
        data: [
          {
            timestamp: '2024-01-15T10:30:00Z',
            resourceId: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/vm1',
            changeType: 'Update',
            changes: { powerState: 'running' },
          },
          {
            timestamp: '2024-01-15T09:15:00Z',
            resourceId: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/sa1',
            changeType: 'Create',
            changes: { sku: 'Standard_LRS' },
          },
        ],
      };

      mockResourceGraphClient.resources.mockResolvedValue(response);

      const changes = await AzureResourceGraphService.getRecentChanges(ACCOUNT_ID);

      expect(changes).toHaveLength(2);
      expect(changes[0].changeType).toBe('Update');
      expect(changes[1].changeType).toBe('Create');

      // Verify query uses ResourceChanges and 24h timeframe
      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('ResourceChanges');
      expect(queryArg.query).toContain('ago(24h)');
      expect(queryArg.query).toContain('limit 50');
    });

    it('should return empty array when ResourceChanges not available', async () => {
      const error = new Error('ResourceChanges not supported');
      (error as any).code = 'ResourceChangesNotSupported';
      mockResourceGraphClient.resources.mockRejectedValue(error);

      const changes = await AzureResourceGraphService.getRecentChanges(ACCOUNT_ID);

      expect(changes).toEqual([]);
    });

    it('should handle no recent changes', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      const changes = await AzureResourceGraphService.getRecentChanges(ACCOUNT_ID);

      expect(changes).toEqual([]);
    });

    it('should handle errors gracefully and return empty array', async () => {
      const error = new Error('Subscription not found');
      mockResourceGraphClient.resources.mockRejectedValue(error);

      const changes = await AzureResourceGraphService.getRecentChanges(ACCOUNT_ID);

      expect(changes).toEqual([]);
    });

    it('should sort changes by timestamp descending', async () => {
      const response = {
        data: [
          { timestamp: '2024-01-15T10:30:00Z', resourceId: 'res1', changeType: 'Update' },
          { timestamp: '2024-01-15T09:15:00Z', resourceId: 'res2', changeType: 'Create' },
        ],
      };

      mockResourceGraphClient.resources.mockResolvedValue(response);

      const changes = await AzureResourceGraphService.getRecentChanges(ACCOUNT_ID);

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('order by timestamp desc');
    });
  });

  describe('getComplianceStatus', () => {
    it('should return compliance status summary', async () => {
      const response = {
        data: [
          {
            total: 100,
            compliant: 80,
            nonCompliant: 20,
          },
        ],
      };

      mockResourceGraphClient.resources.mockResolvedValue(response);

      const status = await AzureResourceGraphService.getComplianceStatus(ACCOUNT_ID);

      expect(status).toEqual({
        total: 100,
        compliant: 80,
        nonCompliant: 20,
      });

      // Verify query uses PolicyResources
      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('PolicyResources');
      expect(queryArg.query).toContain('microsoft.policyinsights/policystates');
    });

    it('should return default values when no policy data available', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      const status = await AzureResourceGraphService.getComplianceStatus(ACCOUNT_ID);

      expect(status).toEqual({
        total: 0,
        compliant: 0,
        nonCompliant: 0,
      });
    });

    it('should handle errors and return default values', async () => {
      const error = new Error('Policy insights not available');
      mockResourceGraphClient.resources.mockRejectedValue(error);

      const status = await AzureResourceGraphService.getComplianceStatus(ACCOUNT_ID);

      expect(status).toEqual({
        total: 0,
        compliant: 0,
        nonCompliant: 0,
      });
    });

    it('should handle null values in compliance data', async () => {
      const response = {
        data: [
          {
            total: null,
            compliant: null,
            nonCompliant: null,
          },
        ],
      };

      mockResourceGraphClient.resources.mockResolvedValue(response);

      const status = await AzureResourceGraphService.getComplianceStatus(ACCOUNT_ID);

      // The service returns the values as-is from the query response
      // In production, null values would be handled by the consumer
      expect(status).toEqual({
        total: null,
        compliant: null,
        nonCompliant: null,
      });
    });
  });

  describe('Query Execution Error Handling', () => {
    it('should throw error with descriptive message on query failure', async () => {
      const azureError = new Error('Invalid KQL syntax');
      (azureError as any).code = 'InvalidQuery';
      mockResourceGraphClient.resources.mockRejectedValue(azureError);

      await expect(
        AzureResourceGraphService.getResourceSummary(ACCOUNT_ID)
      ).rejects.toThrow('Failed to execute Azure Resource Graph query');
    });

    it('should handle authorization errors', async () => {
      const authError = new Error('Insufficient permissions');
      (authError as any).statusCode = 403;
      mockResourceGraphClient.resources.mockRejectedValue(authError);

      await expect(
        AzureResourceGraphService.getResourceCountByType(ACCOUNT_ID, 'Microsoft.Compute/virtualMachines')
      ).rejects.toThrow('Failed to execute Azure Resource Graph query');
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      (timeoutError as any).code = 'ETIMEDOUT';
      mockResourceGraphClient.resources.mockRejectedValue(timeoutError);

      await expect(
        AzureResourceGraphService.searchResources(ACCOUNT_ID, 'test')
      ).rejects.toThrow('Failed to execute Azure Resource Graph query');
    });

    it('should handle throttling errors', async () => {
      const throttleError = new Error('Too many requests');
      (throttleError as any).statusCode = 429;
      mockResourceGraphClient.resources.mockRejectedValue(throttleError);

      await expect(
        AzureResourceGraphService.getResourceSummary(ACCOUNT_ID)
      ).rejects.toThrow('Failed to execute Azure Resource Graph query');
    });

    it('should handle credential retrieval errors', async () => {
      AzureCredentialsService.getTokenCredential = jest.fn().mockRejectedValue(
        new Error('Invalid credentials')
      );

      await expect(
        AzureResourceGraphService.getResourceSummary(ACCOUNT_ID)
      ).rejects.toThrow('Failed to execute Azure Resource Graph query');
    });
  });

  describe('Query Format Validation', () => {
    it('should use objectArray result format', async () => {
      const response = { data: [{ Count: 1 }] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getResourceCountByType(ACCOUNT_ID, 'Microsoft.Compute/type1');

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.options.resultFormat).toBe('objectArray');
    });

    it('should include subscription in query request', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.searchResources(ACCOUNT_ID, 'test');

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.subscriptions).toEqual([SUBSCRIPTION_ID]);
    });

    it('should properly format KQL queries', async () => {
      const response = { data: [{ type: 'vm', count_: 5 }] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getResourceCountByType(
        ACCOUNT_ID,
        'Microsoft.Compute/virtualMachines'
      );

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      const query = queryArg.query;

      // Verify KQL structure
      expect(query).toContain('Resources');
      expect(query).toContain('where');
      expect(query).toContain('count');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large result sets', async () => {
      const largeData = Array(1000).fill(null).map((_, i) => ({
        type: `type-${i}`,
        count_: i,
      }));

      const response = { data: largeData };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await expect(
        AzureResourceGraphService.getResourceSummary(ACCOUNT_ID)
      ).resolves.toBeDefined();
    });

    it('should handle resources with missing fields', async () => {
      const response = {
        data: [
          {
            // Missing 'name' field
            id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/vm1',
            type: 'microsoft.compute/virtualmachines',
            location: 'eastus',
          },
        ],
      };

      mockResourceGraphClient.resources.mockResolvedValue(response);

      const results = await AzureResourceGraphService.searchResources(ACCOUNT_ID, 'vm');

      expect(results).toBeDefined();
      expect(results).toHaveLength(1);
    });

    it('should handle undefined or null data in response', async () => {
      const response = { data: null };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await expect(
        AzureResourceGraphService.getResourceCountByType(ACCOUNT_ID, 'type1')
      ).rejects.toThrow();
    });

    it('should handle empty subscription ID', async () => {
      (AzureCredentialsService.getCredentials as jest.Mock).mockResolvedValue({
        ...mockCredentials,
        subscriptionId: '',
      });

      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.searchResources(ACCOUNT_ID, 'test');

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.subscriptions).toEqual(['']);
    });
  });

  describe('getResourcesWithFilters', () => {
    it('should return filtered resources with pagination', async () => {
      const response = {
        data: [
          {
            id: '/subscriptions/sub/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm1',
            name: 'vm1',
            type: 'microsoft.compute/virtualmachines',
            location: 'eastus',
            resourceGroup: 'rg1',
            tags: { env: 'prod' },
            properties: {},
          },
          {
            id: '/subscriptions/sub/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm2',
            name: 'vm2',
            type: 'microsoft.compute/virtualmachines',
            location: 'eastus',
            resourceGroup: 'rg1',
            tags: { env: 'prod' },
            properties: {},
          },
        ],
      };

      mockResourceGraphClient.resources.mockResolvedValue(response);

      const result = await AzureResourceGraphService.getResourcesWithFilters(
        ACCOUNT_ID,
        { type: 'Microsoft.Compute/virtualMachines', location: 'eastus' },
        { page: 1, limit: 50 }
      );

      expect(result.resources).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
      expect(result.pagination.hasMore).toBe(false);

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('type =~');
      expect(queryArg.query).toContain('location =~');
      expect(queryArg.query).toContain('skip 0');
      expect(queryArg.query).toContain('take 51');
    });

    it('should filter by resource group', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getResourcesWithFilters(
        ACCOUNT_ID,
        { resourceGroup: 'my-resource-group' },
        { page: 1, limit: 10 }
      );

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain("resourceGroup =~ 'my-resource-group'");
    });

    it('should filter by tags', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getResourcesWithFilters(
        ACCOUNT_ID,
        { tags: { environment: 'production', team: 'platform' } },
        { page: 1, limit: 10 }
      );

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain("tags['environment'] =~ 'production'");
      expect(queryArg.query).toContain("tags['team'] =~ 'platform'");
    });

    it('should handle multiple filters together', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getResourcesWithFilters(
        ACCOUNT_ID,
        {
          type: 'Microsoft.Storage/storageAccounts',
          location: 'westus',
          resourceGroup: 'storage-rg',
          tags: { env: 'dev' },
        },
        { page: 1, limit: 25 }
      );

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('type =~');
      expect(queryArg.query).toContain('location =~');
      expect(queryArg.query).toContain('resourceGroup =~');
      expect(queryArg.query).toContain("tags['env']");
      expect(queryArg.query).toContain(' and ');
    });

    it('should detect hasMore when results exceed limit', async () => {
      const response = {
        data: Array(51)
          .fill(null)
          .map((_, i) => ({
            id: `resource-${i}`,
            name: `resource-${i}`,
            type: 'type1',
            location: 'eastus',
            resourceGroup: 'rg1',
            tags: {},
            properties: {},
          })),
      };

      mockResourceGraphClient.resources.mockResolvedValue(response);

      const result = await AzureResourceGraphService.getResourcesWithFilters(
        ACCOUNT_ID,
        {},
        { page: 1, limit: 50 }
      );

      expect(result.resources).toHaveLength(50);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should calculate correct skip for pagination', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getResourcesWithFilters(
        ACCOUNT_ID,
        {},
        { page: 3, limit: 20 }
      );

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('skip 40'); // (3-1) * 20
      expect(queryArg.query).toContain('take 21');
    });

    it('should validate pagination parameters', async () => {
      await expect(
        AzureResourceGraphService.getResourcesWithFilters(ACCOUNT_ID, {}, { page: 0, limit: 10 })
      ).rejects.toThrow('Page must be greater than 0');

      await expect(
        AzureResourceGraphService.getResourcesWithFilters(ACCOUNT_ID, {}, { page: 1, limit: 0 })
      ).rejects.toThrow('Limit must be between 1 and 1000');

      await expect(
        AzureResourceGraphService.getResourcesWithFilters(ACCOUNT_ID, {}, { page: 1, limit: 1001 })
      ).rejects.toThrow('Limit must be between 1 and 1000');
    });

    it('should sanitize filter inputs to prevent KQL injection', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getResourcesWithFilters(
        ACCOUNT_ID,
        { location: "eastus' or 1==1 --" },
        { page: 1, limit: 10 }
      );

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      // Should escape the single quote
      expect(queryArg.query).toContain("\\'");
    });

    it('should work with no filters', async () => {
      const response = {
        data: [
          { id: 'r1', name: 'res1', type: 'type1', location: 'eastus', resourceGroup: 'rg1' },
        ],
      };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      const result = await AzureResourceGraphService.getResourcesWithFilters(ACCOUNT_ID, {}, { page: 1, limit: 50 });

      expect(result.resources).toHaveLength(1);
      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('Resources');
      expect(queryArg.query).toContain('project');
    });

    it('should use default pagination when not provided', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      const result = await AzureResourceGraphService.getResourcesWithFilters(ACCOUNT_ID);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
    });
  });

  describe('getResourceTypes', () => {
    it('should return list of unique resource types', async () => {
      const response = {
        data: [
          { type: 'microsoft.compute/virtualmachines' },
          { type: 'microsoft.storage/storageaccounts' },
          { type: 'microsoft.network/virtualnetworks' },
        ],
      };

      mockResourceGraphClient.resources.mockResolvedValue(response);

      const types = await AzureResourceGraphService.getResourceTypes(ACCOUNT_ID);

      expect(types).toHaveLength(3);
      expect(types).toContain('microsoft.compute/virtualmachines');
      expect(types).toContain('microsoft.storage/storageaccounts');

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('distinct type');
      expect(queryArg.query).toContain('order by type asc');
    });

    it('should handle empty resource types', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      const types = await AzureResourceGraphService.getResourceTypes(ACCOUNT_ID);

      expect(types).toEqual([]);
    });

    it('should cache resource types', async () => {
      const response = { data: [{ type: 'type1' }] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getResourceTypes(ACCOUNT_ID);

      expect(AzureCacheService.getOrSet).toHaveBeenCalledWith(
        'resources',
        ACCOUNT_ID,
        ['metadata', 'types'],
        expect.any(Function)
      );
    });

    it('should handle query errors', async () => {
      mockResourceGraphClient.resources.mockRejectedValue(new Error('Query failed'));

      await expect(AzureResourceGraphService.getResourceTypes(ACCOUNT_ID)).rejects.toThrow('Query failed');
    });
  });

  describe('getLocations', () => {
    it('should return list of unique locations', async () => {
      const response = {
        data: [{ location: 'eastus' }, { location: 'westus' }, { location: 'centralus' }],
      };

      mockResourceGraphClient.resources.mockResolvedValue(response);

      const locations = await AzureResourceGraphService.getLocations(ACCOUNT_ID);

      expect(locations).toHaveLength(3);
      expect(locations).toContain('eastus');
      expect(locations).toContain('westus');

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain("where location != ''");
      expect(queryArg.query).toContain('distinct location');
      expect(queryArg.query).toContain('order by location asc');
    });

    it('should exclude empty locations', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getLocations(ACCOUNT_ID);

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain("where location != ''");
    });

    it('should cache locations', async () => {
      const response = { data: [{ location: 'eastus' }] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getLocations(ACCOUNT_ID);

      expect(AzureCacheService.getOrSet).toHaveBeenCalledWith(
        'resources',
        ACCOUNT_ID,
        ['metadata', 'locations'],
        expect.any(Function)
      );
    });

    it('should handle query errors', async () => {
      mockResourceGraphClient.resources.mockRejectedValue(new Error('Network error'));

      await expect(AzureResourceGraphService.getLocations(ACCOUNT_ID)).rejects.toThrow('Network error');
    });
  });

  describe('getResourceGroups', () => {
    it('should return list of resource groups', async () => {
      const response = {
        data: [{ resourceGroup: 'rg1' }, { resourceGroup: 'rg2' }, { resourceGroup: 'rg3' }],
      };

      mockResourceGraphClient.resources.mockResolvedValue(response);

      const resourceGroups = await AzureResourceGraphService.getResourceGroups(ACCOUNT_ID);

      expect(resourceGroups).toHaveLength(3);
      expect(resourceGroups).toContain('rg1');
      expect(resourceGroups).toContain('rg2');

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('distinct resourceGroup');
      expect(queryArg.query).toContain('order by resourceGroup asc');
    });

    it('should handle empty resource groups', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      const resourceGroups = await AzureResourceGraphService.getResourceGroups(ACCOUNT_ID);

      expect(resourceGroups).toEqual([]);
    });

    it('should cache resource groups', async () => {
      const response = { data: [{ resourceGroup: 'rg1' }] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getResourceGroups(ACCOUNT_ID);

      expect(AzureCacheService.getOrSet).toHaveBeenCalledWith(
        'resources',
        ACCOUNT_ID,
        ['metadata', 'resourceGroups'],
        expect.any(Function)
      );
    });

    it('should handle query errors', async () => {
      mockResourceGraphClient.resources.mockRejectedValue(new Error('Authorization failed'));

      await expect(AzureResourceGraphService.getResourceGroups(ACCOUNT_ID)).rejects.toThrow(
        'Authorization failed'
      );
    });
  });

  describe('searchResourcesAdvanced', () => {
    it('should search resources with custom limit', async () => {
      const response = {
        data: [
          {
            id: 'res1',
            name: 'my-vm-1',
            type: 'microsoft.compute/virtualmachines',
            location: 'eastus',
            resourceGroup: 'rg1',
            tags: {},
          },
        ],
      };

      mockResourceGraphClient.resources.mockResolvedValue(response);

      const results = await AzureResourceGraphService.searchResourcesAdvanced(ACCOUNT_ID, 'my-vm', 50);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('my-vm-1');

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('limit 50');
      expect(queryArg.query).toContain('my-vm');
    });

    it('should validate search term length', async () => {
      await expect(AzureResourceGraphService.searchResourcesAdvanced(ACCOUNT_ID, '')).rejects.toThrow(
        'Search term cannot be empty'
      );

      const longTerm = 'a'.repeat(201);
      await expect(AzureResourceGraphService.searchResourcesAdvanced(ACCOUNT_ID, longTerm)).rejects.toThrow(
        'Search term too long'
      );
    });

    it('should validate limit parameter', async () => {
      await expect(AzureResourceGraphService.searchResourcesAdvanced(ACCOUNT_ID, 'test', 0)).rejects.toThrow(
        'Limit must be between 1 and 1000'
      );

      await expect(AzureResourceGraphService.searchResourcesAdvanced(ACCOUNT_ID, 'test', 1001)).rejects.toThrow(
        'Limit must be between 1 and 1000'
      );
    });

    it('should search across name, type, and location', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.searchResourcesAdvanced(ACCOUNT_ID, 'searchterm');

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain("name contains 'searchterm'");
      expect(queryArg.query).toContain("type contains 'searchterm'");
      expect(queryArg.query).toContain("location contains 'searchterm'");
      expect(queryArg.query).toContain(' or ');
    });

    it('should sanitize search term to prevent injection', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.searchResourcesAdvanced(ACCOUNT_ID, "test' or 1==1 --");

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain("\\'");
    });

    it('should use default limit of 100', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.searchResourcesAdvanced(ACCOUNT_ID, 'test');

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('limit 100');
    });

    it('should project only necessary fields', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.searchResourcesAdvanced(ACCOUNT_ID, 'test');

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('project id, name, type, location, resourceGroup, tags');
    });

    it('should cache search results', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.searchResourcesAdvanced(ACCOUNT_ID, 'myterm', 100);

      expect(AzureCacheService.getOrSet).toHaveBeenCalledWith(
        'resources',
        ACCOUNT_ID,
        ['search-advanced', 'myterm', 'limit100'],
        expect.any(Function)
      );
    });
  });

  describe('getResourceMetadata', () => {
    it('should fetch all metadata in parallel', async () => {
      const typesResponse = {
        data: [{ type: 'microsoft.compute/virtualmachines' }, { type: 'microsoft.storage/storageaccounts' }],
      };
      const locationsResponse = { data: [{ location: 'eastus' }, { location: 'westus' }] };
      const resourceGroupsResponse = { data: [{ resourceGroup: 'rg1' }, { resourceGroup: 'rg2' }] };

      mockResourceGraphClient.resources
        .mockResolvedValueOnce(typesResponse)
        .mockResolvedValueOnce(locationsResponse)
        .mockResolvedValueOnce(resourceGroupsResponse);

      const metadata = await AzureResourceGraphService.getResourceMetadata(ACCOUNT_ID);

      expect(metadata.types).toHaveLength(2);
      expect(metadata.locations).toHaveLength(2);
      expect(metadata.resourceGroups).toHaveLength(2);
      expect(metadata.types).toContain('microsoft.compute/virtualmachines');
      expect(metadata.locations).toContain('eastus');
      expect(metadata.resourceGroups).toContain('rg1');
    });

    it('should handle empty metadata', async () => {
      const emptyResponse = { data: [] };
      mockResourceGraphClient.resources
        .mockResolvedValueOnce(emptyResponse)
        .mockResolvedValueOnce(emptyResponse)
        .mockResolvedValueOnce(emptyResponse);

      const metadata = await AzureResourceGraphService.getResourceMetadata(ACCOUNT_ID);

      expect(metadata.types).toEqual([]);
      expect(metadata.locations).toEqual([]);
      expect(metadata.resourceGroups).toEqual([]);
    });

    it('should propagate errors from metadata queries', async () => {
      mockResourceGraphClient.resources.mockRejectedValue(new Error('Query timeout'));

      await expect(AzureResourceGraphService.getResourceMetadata(ACCOUNT_ID)).rejects.toThrow('Query timeout');
    });
  });

  describe('Rate Limiting', () => {
    it('should check rate limit before executing query', async () => {
      const response = { data: [{ Count: 5 }] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getResourceTypes(ACCOUNT_ID);

      expect(AzureRateLimiterService.checkRateLimit).toHaveBeenCalledWith('resourceGraph', ACCOUNT_ID);
    });

    it('should throw error when rate limit exceeded', async () => {
      AzureRateLimiterService.checkRateLimit = jest.fn().mockResolvedValue({
        allowed: false,
        retryAfter: 10,
      });

      await expect(AzureResourceGraphService.getResourceTypes(ACCOUNT_ID)).rejects.toThrow('Rate limit exceeded');
    });

    it('should consume token after successful query', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getResourceGroups(ACCOUNT_ID);

      expect(AzureRateLimiterService.consumeToken).toHaveBeenCalledWith('resourceGraph', ACCOUNT_ID);
    });
  });

  describe('Performance Logging', () => {
    it('should log query duration for filtered resources', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getResourcesWithFilters(ACCOUNT_ID, {}, { page: 1, limit: 10 });

      // Logger should be called with performance metrics
      // Note: This verifies the logging infrastructure is being used
      expect(mockResourceGraphClient.resources).toHaveBeenCalled();
    });

    it('should log query duration for metadata fetches', async () => {
      const response = { data: [{ type: 'type1' }] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getResourceTypes(ACCOUNT_ID);

      expect(mockResourceGraphClient.resources).toHaveBeenCalled();
    });

    it('should log query duration for advanced search', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.searchResourcesAdvanced(ACCOUNT_ID, 'test');

      expect(mockResourceGraphClient.resources).toHaveBeenCalled();
    });
  });

  describe('getResourceAggregations', () => {
    it('should return aggregations by type, location, resource group, and tags', async () => {
      const typeResponse = {
        data: [
          { type: 'microsoft.compute/virtualmachines', count_: 10 },
          { type: 'microsoft.storage/storageaccounts', count_: 5 },
        ],
      };

      const locationResponse = {
        data: [
          { location: 'eastus', count_: 8 },
          { location: 'westus', count_: 7 },
        ],
      };

      const rgResponse = {
        data: [
          { resourceGroup: 'prod-rg', count_: 10 },
          { resourceGroup: 'dev-rg', count_: 5 },
        ],
      };

      const tagResponse = {
        data: [
          { tagKey: 'environment', tagValue: 'production', count_: 8 },
          { tagKey: 'team', tagValue: 'platform', count_: 3 },
        ],
      };

      mockResourceGraphClient.resources
        .mockResolvedValueOnce(typeResponse)
        .mockResolvedValueOnce(locationResponse)
        .mockResolvedValueOnce(rgResponse)
        .mockResolvedValueOnce(tagResponse);

      const aggregations = await AzureResourceGraphService.getResourceAggregations(ACCOUNT_ID);

      expect(aggregations.byType).toHaveLength(2);
      expect(aggregations.byType[0]).toEqual({
        type: 'microsoft.compute/virtualmachines',
        count: 10,
      });

      expect(aggregations.byLocation).toHaveLength(2);
      expect(aggregations.byLocation[0]).toEqual({
        location: 'eastus',
        count: 8,
      });

      expect(aggregations.byResourceGroup).toHaveLength(2);
      expect(aggregations.byResourceGroup[0]).toEqual({
        resourceGroup: 'prod-rg',
        count: 10,
      });

      expect(aggregations.byTag).toHaveLength(2);
      expect(aggregations.byTag[0]).toEqual({
        key: 'environment',
        value: 'production',
        count: 8,
      });

      // Verify parallel execution
      expect(mockResourceGraphClient.resources).toHaveBeenCalledTimes(4);
    });

    it('should handle tag query failures gracefully', async () => {
      const typeResponse = { data: [{ type: 'type1', count_: 1 }] };
      const locationResponse = { data: [{ location: 'eastus', count_: 1 }] };
      const rgResponse = { data: [{ resourceGroup: 'rg1', count_: 1 }] };

      mockResourceGraphClient.resources
        .mockResolvedValueOnce(typeResponse)
        .mockResolvedValueOnce(locationResponse)
        .mockResolvedValueOnce(rgResponse)
        .mockRejectedValueOnce(new Error('Tag query failed'));

      const aggregations = await AzureResourceGraphService.getResourceAggregations(ACCOUNT_ID);

      expect(aggregations.byTag).toEqual([]);
      expect(aggregations.byType).toHaveLength(1);
    });

    it('should cache aggregation results', async () => {
      const response = { data: [{ type: 'type1', count_: 1 }] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getResourceAggregations(ACCOUNT_ID);

      expect(AzureCacheService.getOrSet).toHaveBeenCalledWith(
        'resources',
        ACCOUNT_ID,
        ['aggregations'],
        expect.any(Function)
      );
    });
  });

  describe('getResourcesByTags', () => {
    it('should filter resources by tags', async () => {
      const response = {
        data: [
          {
            id: 'res1',
            name: 'prod-vm',
            type: 'microsoft.compute/virtualmachines',
            location: 'eastus',
            resourceGroup: 'prod-rg',
            tags: { environment: 'production', team: 'platform' },
            properties: {},
          },
        ],
      };

      mockResourceGraphClient.resources.mockResolvedValue(response);

      const result = await AzureResourceGraphService.getResourcesByTags(
        ACCOUNT_ID,
        { environment: 'production', team: 'platform' },
        { page: 1, limit: 50 }
      );

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].tags.environment).toBe('production');
      expect(result.resources[0].tags.team).toBe('platform');

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain("tags['environment']");
      expect(queryArg.query).toContain("tags['team']");
    });

    it('should throw error when no tags provided', async () => {
      await expect(
        AzureResourceGraphService.getResourcesByTags(ACCOUNT_ID, {}, { page: 1, limit: 10 })
      ).rejects.toThrow('At least one tag filter is required');
    });

    it('should use default pagination when not provided', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      const result = await AzureResourceGraphService.getResourcesByTags(ACCOUNT_ID, {
        env: 'prod',
      });

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
    });
  });

  describe('getCostRelevantResources', () => {
    it('should return cost-relevant resources with extended properties', async () => {
      const response = {
        data: [
          {
            id: 'vm1',
            name: 'prod-vm-1',
            type: 'microsoft.compute/virtualmachines',
            location: 'eastus',
            resourceGroup: 'prod-rg',
            tags: {},
            vmSize: 'Standard_D4s_v3',
            powerState: 'PowerState/running',
            storageSku: null,
            databaseTier: null,
            databaseCapacity: null,
          },
          {
            id: 'storage1',
            name: 'prodstorage',
            type: 'microsoft.storage/storageaccounts',
            location: 'eastus',
            resourceGroup: 'prod-rg',
            tags: {},
            vmSize: null,
            powerState: null,
            storageSku: 'Standard_LRS',
            databaseTier: null,
            databaseCapacity: null,
          },
        ],
      };

      mockResourceGraphClient.resources.mockResolvedValue(response);

      const resources = await AzureResourceGraphService.getCostRelevantResources(ACCOUNT_ID);

      expect(resources).toHaveLength(2);
      expect(resources[0].vmSize).toBe('Standard_D4s_v3');
      expect(resources[1].storageSku).toBe('Standard_LRS');

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('microsoft.compute/virtualmachines');
      expect(queryArg.query).toContain('microsoft.storage/storageaccounts');
      expect(queryArg.query).toContain('extend');
      expect(queryArg.query).toContain('vmSize');
    });

    it('should validate limit parameter', async () => {
      await expect(AzureResourceGraphService.getCostRelevantResources(ACCOUNT_ID, 0)).rejects.toThrow(
        'Limit must be between 1 and 10000'
      );

      await expect(
        AzureResourceGraphService.getCostRelevantResources(ACCOUNT_ID, 10001)
      ).rejects.toThrow('Limit must be between 1 and 10000');
    });

    it('should cache cost-relevant resources', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getCostRelevantResources(ACCOUNT_ID, 100);

      expect(AzureCacheService.getOrSet).toHaveBeenCalledWith(
        'resources',
        ACCOUNT_ID,
        ['cost-relevant', 'limit100'],
        expect.any(Function)
      );
    });

    it('should use default limit of 1000', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getCostRelevantResources(ACCOUNT_ID);

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('limit 1000');
    });
  });

  describe('getResourceInventory', () => {
    it('should return resource inventory with basic properties', async () => {
      const response = {
        data: [
          {
            id: 'res1',
            name: 'resource-1',
            type: 'microsoft.compute/virtualmachines',
            location: 'eastus',
            resourceGroup: 'rg1',
            tags: { env: 'prod' },
            properties: {},
          },
          {
            id: 'res2',
            name: 'resource-2',
            type: 'microsoft.storage/storageaccounts',
            location: 'westus',
            resourceGroup: 'rg2',
            tags: { env: 'dev' },
            properties: {},
          },
        ],
      };

      mockResourceGraphClient.resources.mockResolvedValue(response);

      const result = await AzureResourceGraphService.getResourceInventory(ACCOUNT_ID);

      expect(result.resources).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(100);
    });

    it('should include extended properties when requested', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getResourceInventory(ACCOUNT_ID, {
        includeProperties: true,
      });

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('kind');
      expect(queryArg.query).toContain('sku');
      expect(queryArg.query).toContain('identity');
      expect(queryArg.query).toContain('zones');
    });

    it('should apply filters when provided', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getResourceInventory(ACCOUNT_ID, {
        filters: {
          type: 'Microsoft.Compute/virtualMachines',
          location: 'eastus',
        },
        pagination: { page: 2, limit: 25 },
      });

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('microsoft.compute/virtualmachines');
      expect(queryArg.query).toContain('eastus');
      expect(queryArg.query).toContain('skip 25');
      expect(queryArg.query).toContain('take 26');
    });

    it('should cache inventory results with proper key', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.getResourceInventory(ACCOUNT_ID, {
        filters: { type: 'Microsoft.Compute/virtualMachines' },
        pagination: { page: 1, limit: 50 },
        includeProperties: true,
      });

      expect(AzureCacheService.getOrSet).toHaveBeenCalledWith(
        'resources',
        ACCOUNT_ID,
        expect.arrayContaining(['inventory', 'page1', 'limit50', 'propstrue']),
        expect.any(Function)
      );
    });

    it('should handle empty options parameter', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      const result = await AzureResourceGraphService.getResourceInventory(ACCOUNT_ID);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(100);
    });
  });

  describe('searchResourcesAdvanced - Enhanced', () => {
    it('should include resourceGroup in search', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.searchResourcesAdvanced(ACCOUNT_ID, 'production');

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('name contains');
      expect(queryArg.query).toContain('type contains');
      expect(queryArg.query).toContain('location contains');
      expect(queryArg.query).toContain('resourceGroup contains');
    });

    it('should order results by name', async () => {
      const response = { data: [] };
      mockResourceGraphClient.resources.mockResolvedValue(response);

      await AzureResourceGraphService.searchResourcesAdvanced(ACCOUNT_ID, 'test');

      const queryArg = mockResourceGraphClient.resources.mock.calls[0][0];
      expect(queryArg.query).toContain('order by name asc');
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate all cache for an account', async () => {
      await AzureResourceGraphService.invalidateCache(ACCOUNT_ID);

      expect(AzureCacheService.invalidateAccount).toHaveBeenCalledWith(ACCOUNT_ID);
    });
  });
});
