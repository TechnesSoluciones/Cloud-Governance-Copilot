/**
 * Azure Resource Graph Service Tests
 *
 * @group unit
 * @group azure
 */

import { AzureResourceGraphService } from '../../integrations/azure/resource-graph.service';
import type { CloudProviderCredentials } from '../../integrations/cloud-provider.interface';

// Mock Azure SDK
jest.mock('@azure/arm-resourcegraph');
jest.mock('@azure/identity');

describe('AzureResourceGraphService', () => {
  let service: AzureResourceGraphService;
  let mockCredentials: CloudProviderCredentials;

  beforeEach(() => {
    mockCredentials = {
      provider: 'azure',
      azureClientId: 'mock-client-id',
      azureClientSecret: 'mock-client-secret',
      azureTenantId: 'mock-tenant-id',
      azureSubscriptionId: 'mock-subscription-id',
    };

    service = new AzureResourceGraphService(mockCredentials);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with valid credentials', () => {
      expect(service).toBeInstanceOf(AzureResourceGraphService);
    });

    it('should throw error if credentials are missing', () => {
      expect(() => {
        new AzureResourceGraphService({
          provider: 'azure',
        } as CloudProviderCredentials);
      }).toThrow('Azure credentials (tenantId, clientId, clientSecret, subscriptionId) are required');
    });
  });

  describe('query', () => {
    it('should execute KQL query successfully', async () => {
      const mockResponse = {
        data: {
          columns: [
            { name: 'name', type: 'string' },
            { name: 'count_', type: 'long' },
          ],
          rows: [
            ['microsoft.compute/virtualmachines', 10],
            ['microsoft.storage/storageaccounts', 5],
          ],
        },
        totalRecords: 2,
        count: 2,
        resultTruncated: 'false',
      };

      const mockClient = {
        resources: jest.fn().mockResolvedValue(mockResponse),
      };

      (service as any).client = mockClient;

      const result = await service.query('Resources | summarize count() by type');

      expect(result.rows).toHaveLength(2);
      expect(result.totalRecords).toBe(2);
      expect(mockClient.resources).toHaveBeenCalledWith({
        query: 'Resources | summarize count() by type',
        subscriptions: ['mock-subscription-id'],
      });
    });

    it('should handle query errors', async () => {
      const mockClient = {
        resources: jest.fn().mockRejectedValue(new Error('Query failed')),
      };

      (service as any).client = mockClient;

      await expect(service.query('Invalid KQL')).rejects.toThrow('Resource Graph query failed');
    });
  });

  describe('queryWithPagination', () => {
    it('should handle paginated results', async () => {
      const page1 = {
        data: {
          columns: [{ name: 'name', type: 'string' }],
          rows: [['vm-1'], ['vm-2']],
        },
        totalRecords: 4,
        count: 2,
        resultTruncated: 'true',
        skipToken: 'token-123',
      };

      const page2 = {
        data: {
          columns: [{ name: 'name', type: 'string' }],
          rows: [['vm-3'], ['vm-4']],
        },
        totalRecords: 4,
        count: 2,
        resultTruncated: 'false',
      };

      const mockClient = {
        resources: jest.fn()
          .mockResolvedValueOnce(page1)
          .mockResolvedValueOnce(page2),
      };

      (service as any).client = mockClient;

      const result = await service.queryWithPagination(
        'Resources | where type == "microsoft.compute/virtualmachines"'
      );

      expect(result.rows).toHaveLength(4);
      expect(mockClient.resources).toHaveBeenCalledTimes(2);
    });

    it('should stop pagination at maxRecords', async () => {
      const mockResponse = {
        data: {
          columns: [{ name: 'name', type: 'string' }],
          rows: Array(1000).fill(['vm-x']),
        },
        totalRecords: 5000,
        count: 1000,
        resultTruncated: 'true',
        skipToken: 'token-123',
      };

      const mockClient = {
        resources: jest.fn().mockResolvedValue(mockResponse),
      };

      (service as any).client = mockClient;

      const result = await service.queryWithPagination('Resources', 2000);

      expect(result.rows.length).toBeLessThanOrEqual(2000);
      expect(mockClient.resources).toHaveBeenCalledTimes(2); // 1000 + 1000 = 2000
    });
  });

  describe('pre-built queries', () => {
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        resources: jest.fn().mockResolvedValue({
          data: {
            columns: [{ name: 'id', type: 'string' }],
            rows: [['resource-1']],
          },
          totalRecords: 1,
          count: 1,
          resultTruncated: 'false',
        }),
      };

      (service as any).client = mockClient;
    });

    it('should execute getAllVirtualMachines query', async () => {
      await service.getAllVirtualMachines();

      expect(mockClient.resources).toHaveBeenCalled();
      const callArg = mockClient.resources.mock.calls[0][0];
      expect(callArg.query).toContain('microsoft.compute/virtualmachines');
    });

    it('should execute getResourceCountByType query', async () => {
      await service.getResourceCountByType();

      expect(mockClient.resources).toHaveBeenCalled();
      const callArg = mockClient.resources.mock.calls[0][0];
      expect(callArg.query).toContain('summarize count() by type');
    });

    it('should execute getResourceCountByLocation query', async () => {
      await service.getResourceCountByLocation();

      expect(mockClient.resources).toHaveBeenCalled();
      const callArg = mockClient.resources.mock.calls[0][0];
      expect(callArg.query).toContain('summarize count() by location');
    });

    it('should execute getResourcesByTag query', async () => {
      await service.getResourcesByTag('Environment', 'Production');

      expect(mockClient.resources).toHaveBeenCalled();
      const callArg = mockClient.resources.mock.calls[0][0];
      expect(callArg.query).toContain('tags["Environment"]');
      expect(callArg.query).toContain('Production');
    });

    it('should execute getOrphanedResources query', async () => {
      await service.getOrphanedResources();

      expect(mockClient.resources).toHaveBeenCalled();
      const callArg = mockClient.resources.mock.calls[0][0];
      expect(callArg.query).toContain('deallocated');
      expect(callArg.query).toContain('stopped');
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limit of 15 queries per 5 seconds', async () => {
      const mockClient = {
        resources: jest.fn().mockResolvedValue({
          data: { columns: [], rows: [] },
          totalRecords: 0,
          count: 0,
          resultTruncated: 'false',
        }),
      };

      (service as any).client = mockClient;

      // Execute 15 queries (should succeed)
      for (let i = 0; i < 15; i++) {
        await service.query('Resources | limit 1');
      }

      expect(mockClient.resources).toHaveBeenCalledTimes(15);

      // 16th query should wait
      const start = Date.now();
      await service.query('Resources | limit 1');
      const elapsed = Date.now() - start;

      // Should have waited at least 100ms
      expect(elapsed).toBeGreaterThan(100);
    }, 10000); // 10 second timeout
  });

  describe('error handling', () => {
    it('should retry on transient errors', async () => {
      const mockClient = {
        resources: jest.fn()
          .mockRejectedValueOnce({ statusCode: 429, message: 'Too Many Requests' })
          .mockRejectedValueOnce({ statusCode: 503, message: 'Service Unavailable' })
          .mockResolvedValueOnce({
            data: { columns: [], rows: [] },
            totalRecords: 0,
            count: 0,
            resultTruncated: 'false',
          }),
      };

      (service as any).client = mockClient;

      const result = await service.query('Resources | limit 1');

      expect(result).toBeDefined();
      expect(mockClient.resources).toHaveBeenCalledTimes(3); // 2 failures + 1 success
    }, 15000);

    it('should not retry on authentication errors', async () => {
      const mockClient = {
        resources: jest.fn().mockRejectedValue({
          statusCode: 401,
          message: 'Unauthorized',
        }),
      };

      (service as any).client = mockClient;

      await expect(service.query('Resources | limit 1')).rejects.toThrow();

      // Should only be called once (no retries)
      expect(mockClient.resources).toHaveBeenCalledTimes(1);
    });
  });
});
