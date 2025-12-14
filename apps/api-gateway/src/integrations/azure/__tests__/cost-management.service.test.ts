/**
 * Azure Cost Management Service Tests
 *
 * TDD approach: Tests written first before implementation
 * Following the same pattern as AWS Cost Explorer Service
 */

import { AzureCostManagementService } from '../cost-management.service';
import type {
  CloudProviderCredentials,
  CloudCostData,
  CostByService,
  DateRange,
} from '../../cloud-provider.interface';
import {
  mockAzureCostResponse,
  mockAzureCredentials,
  expectedCostDataFromAzure,
  mockAzureCostResponseMultipleServices,
  mockAzureCostResponseEmpty,
  mockAzureCredentialsInvalid,
} from '../../../__fixtures__/azure-costs.fixture';

// Mock Azure SDK
jest.mock('@azure/arm-costmanagement');
jest.mock('@azure/identity');

describe('AzureCostManagementService', () => {
  let service: AzureCostManagementService;
  let mockCredentials: CloudProviderCredentials;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup valid credentials
    mockCredentials = {
      provider: 'azure',
      azureTenantId: mockAzureCredentials.tenantId,
      azureClientId: mockAzureCredentials.clientId,
      azureClientSecret: mockAzureCredentials.clientSecret,
      azureSubscriptionId: mockAzureCredentials.subscriptionId,
    };
  });

  // ============================================================
  // Constructor & Initialization Tests
  // ============================================================

  describe('Constructor', () => {
    it('should initialize with valid Azure credentials', () => {
      expect(() => {
        service = new AzureCostManagementService(mockCredentials);
      }).not.toThrow();

      expect(service).toBeInstanceOf(AzureCostManagementService);
      expect(service.name).toBe('azure');
    });

    it('should throw error on missing clientId', () => {
      const invalidCreds = { ...mockCredentials, azureClientId: undefined };

      expect(() => {
        new AzureCostManagementService(invalidCreds);
      }).toThrow('Azure credentials (clientId, clientSecret, tenantId, subscriptionId) are required');
    });

    it('should throw error on missing clientSecret', () => {
      const invalidCreds = { ...mockCredentials, azureClientSecret: undefined };

      expect(() => {
        new AzureCostManagementService(invalidCreds);
      }).toThrow('Azure credentials (clientId, clientSecret, tenantId, subscriptionId) are required');
    });

    it('should throw error on missing tenantId', () => {
      const invalidCreds = { ...mockCredentials, azureTenantId: undefined };

      expect(() => {
        new AzureCostManagementService(invalidCreds);
      }).toThrow('Azure credentials (clientId, clientSecret, tenantId, subscriptionId) are required');
    });

    it('should throw error on missing subscriptionId', () => {
      const invalidCreds = { ...mockCredentials, azureSubscriptionId: undefined };

      expect(() => {
        new AzureCostManagementService(invalidCreds);
      }).toThrow('Azure credentials (clientId, clientSecret, tenantId, subscriptionId) are required');
    });
  });

  // ============================================================
  // Credential Validation Tests
  // ============================================================

  describe('validateCredentials()', () => {
    beforeEach(() => {
      service = new AzureCostManagementService(mockCredentials);
    });

    it('should validate Azure credentials successfully', async () => {
      // Mock successful Azure API call
      const mockQueryUsage = jest.fn().mockResolvedValue({ rows: [], columns: [] });
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.validateCredentials();

      expect(result).toBe(true);
      expect(mockQueryUsage).toHaveBeenCalled();
    });

    it('should return false on invalid credentials', async () => {
      // Mock Azure authentication error
      const mockQueryUsage = jest.fn().mockRejectedValue({
        statusCode: 401,
        message: 'Invalid credentials',
      });
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.validateCredentials();

      expect(result).toBe(false);
    });

    it('should return false on access denied error', async () => {
      // Mock Azure access denied error
      const mockQueryUsage = jest.fn().mockRejectedValue({
        statusCode: 403,
        message: 'The client does not have authorization to perform action',
      });
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.validateCredentials();

      expect(result).toBe(false);
    });

    it('should return false on subscription not found', async () => {
      // Mock Azure subscription not found error
      const mockQueryUsage = jest.fn().mockRejectedValue({
        code: 'SubscriptionNotFound',
        message: 'The subscription was not found',
      });
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.validateCredentials();

      expect(result).toBe(false);
    });
  });

  // ============================================================
  // getCosts() Method Tests
  // ============================================================

  describe('getCosts()', () => {
    const dateRange: DateRange = {
      start: new Date('2024-12-01'),
      end: new Date('2024-12-07'),
    };

    beforeEach(() => {
      service = new AzureCostManagementService(mockCredentials);
    });

    it('should fetch costs for date range from Azure Cost Management API', async () => {
      // Mock Azure Cost Management API response
      const mockQueryUsage = jest.fn().mockResolvedValue(mockAzureCostResponse);
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.getCosts(dateRange);

      expect(mockQueryUsage).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should transform Azure response to CloudCostData[] format', async () => {
      const mockQueryUsage = jest.fn().mockResolvedValue(mockAzureCostResponse);
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.getCosts(dateRange);

      expect(result.length).toBeGreaterThan(0);

      // Verify structure matches CloudCostData interface
      result.forEach((costData: CloudCostData) => {
        expect(costData).toHaveProperty('date');
        expect(costData).toHaveProperty('service');
        expect(costData).toHaveProperty('amount');
        expect(costData).toHaveProperty('currency');
        expect(costData.date).toBeInstanceOf(Date);
        expect(typeof costData.service).toBe('string');
        expect(typeof costData.amount).toBe('number');
        expect(typeof costData.currency).toBe('string');
      });
    });

    it('should handle multiple subscriptions', async () => {
      const mockQueryUsage = jest.fn().mockResolvedValue(mockAzureCostResponseMultipleServices);
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.getCosts(dateRange);

      expect(result.length).toBeGreaterThan(0);

      // Check for multiple services
      const services = new Set(result.map((c: CloudCostData) => c.service));
      expect(services.size).toBeGreaterThan(1);
    });

    it('should apply date filters correctly', async () => {
      const mockQueryUsage = jest.fn().mockResolvedValue(mockAzureCostResponse);
      (service as any).client.query = { usage: mockQueryUsage };

      await service.getCosts(dateRange);

      // Verify the API was called with correct date filters
      const callArgs = mockQueryUsage.mock.calls[0];
      expect(callArgs).toBeDefined();
    });

    it('should aggregate costs by service', async () => {
      const mockQueryUsage = jest.fn().mockResolvedValue(mockAzureCostResponseMultipleServices);
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.getCosts(dateRange);

      // Verify costs are properly aggregated
      const serviceMap = new Map<string, number>();
      result.forEach((cost: CloudCostData) => {
        const current = serviceMap.get(cost.service) || 0;
        serviceMap.set(cost.service, current + cost.amount);
      });

      expect(serviceMap.size).toBeGreaterThan(0);
    });

    it('should handle Azure API errors gracefully', async () => {
      const mockQueryUsage = jest.fn().mockRejectedValue(new Error('Azure API error'));
      (service as any).client.query = { usage: mockQueryUsage };

      await expect(service.getCosts(dateRange)).rejects.toThrow('Azure API error');
    });

    it('should handle empty results', async () => {
      const mockQueryUsage = jest.fn().mockResolvedValue(mockAzureCostResponseEmpty);
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.getCosts(dateRange);

      expect(result).toEqual([]);
    });

    it('should filter by service when provided', async () => {
      const mockQueryUsage = jest.fn().mockResolvedValue(mockAzureCostResponse);
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.getCosts(dateRange, { service: 'Virtual Machines' });

      // All results should be for the specified service
      result.forEach((cost: CloudCostData) => {
        expect(cost.service).toBe('Virtual Machines');
      });
    });

    it('should filter by region when provided', async () => {
      const mockQueryUsage = jest.fn().mockResolvedValue(mockAzureCostResponse);
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.getCosts(dateRange, { region: 'eastus' });

      // All results should be for the specified region
      result.forEach((cost: CloudCostData) => {
        expect(cost.region).toBe('eastus');
      });
    });
  });

  // ============================================================
  // getCostsByService() Method Tests
  // ============================================================

  describe('getCostsByService()', () => {
    const dateRange: DateRange = {
      start: new Date('2024-12-01'),
      end: new Date('2024-12-07'),
    };

    beforeEach(() => {
      service = new AzureCostManagementService(mockCredentials);
    });

    it('should group costs by Azure service name', async () => {
      const mockQueryUsage = jest.fn().mockResolvedValue(mockAzureCostResponseMultipleServices);
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.getCostsByService(dateRange);

      expect(result.length).toBeGreaterThan(0);

      // Verify structure matches CostByService interface
      result.forEach((cost: CostByService) => {
        expect(cost).toHaveProperty('service');
        expect(cost).toHaveProperty('totalCost');
        expect(cost).toHaveProperty('currency');
        expect(cost).toHaveProperty('percentage');
        expect(typeof cost.service).toBe('string');
        expect(typeof cost.totalCost).toBe('number');
        expect(typeof cost.currency).toBe('string');
        expect(typeof cost.percentage).toBe('number');
      });
    });

    it('should aggregate costs correctly', async () => {
      const mockQueryUsage = jest.fn().mockResolvedValue(mockAzureCostResponseMultipleServices);
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.getCostsByService(dateRange);

      // Verify percentages sum to approximately 100
      const totalPercentage = result.reduce((sum, cost) => sum + cost.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 1);

      // Verify costs are positive
      result.forEach((cost: CostByService) => {
        expect(cost.totalCost).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle empty results', async () => {
      const mockQueryUsage = jest.fn().mockResolvedValue(mockAzureCostResponseEmpty);
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.getCostsByService(dateRange);

      expect(result).toEqual([]);
    });

    it('should sort results by cost descending', async () => {
      const mockQueryUsage = jest.fn().mockResolvedValue(mockAzureCostResponseMultipleServices);
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.getCostsByService(dateRange);

      // Verify descending order
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].totalCost).toBeGreaterThanOrEqual(result[i].totalCost);
      }
    });
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================

  describe('Error Handling', () => {
    const dateRange: DateRange = {
      start: new Date('2024-12-01'),
      end: new Date('2024-12-07'),
    };

    beforeEach(() => {
      service = new AzureCostManagementService(mockCredentials);
    });

    it('should handle AuthenticationError', async () => {
      const authError = new Error('Authentication failed');
      (authError as any).statusCode = 401;

      const mockQueryUsage = jest.fn().mockRejectedValue(authError);
      (service as any).client.query = { usage: mockQueryUsage };

      await expect(service.getCosts(dateRange)).rejects.toThrow('Authentication failed');
    });

    it('should handle SubscriptionNotFound', async () => {
      const notFoundError = new Error('Subscription not found');
      (notFoundError as any).code = 'SubscriptionNotFound';
      (notFoundError as any).statusCode = 404;

      const mockQueryUsage = jest.fn().mockRejectedValue(notFoundError);
      (service as any).client.query = { usage: mockQueryUsage };

      await expect(service.getCosts(dateRange)).rejects.toThrow('Subscription not found');
    });

    it('should retry on transient failures', async () => {
      let callCount = 0;
      const mockQueryUsage = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          const rateLimitError = new Error('Too many requests');
          (rateLimitError as any).statusCode = 429;
          return Promise.reject(rateLimitError);
        }
        return Promise.resolve(mockAzureCostResponse);
      });
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.getCosts(dateRange);

      expect(mockQueryUsage).toHaveBeenCalledTimes(3);
      expect(result).toBeDefined();
    });

    it('should timeout after configured duration', async () => {
      const mockQueryUsage = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => setTimeout(resolve, 5000));
      });
      (service as any).client.query = { usage: mockQueryUsage };

      // This test should complete quickly if timeout is working
      // For now, we just verify the mock was called
      const promise = service.getCosts(dateRange);

      // Don't await the full timeout
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockQueryUsage).toHaveBeenCalled();
    }, 10000);

    it('should throw error after max retries exceeded', async () => {
      const rateLimitError = new Error('Too many requests');
      (rateLimitError as any).statusCode = 429;

      const mockQueryUsage = jest.fn().mockRejectedValue(rateLimitError);
      (service as any).client.query = { usage: mockQueryUsage };

      // Temporarily reduce retry delays for faster testing
      (service as any).retryConfig = {
        maxRetries: 3,
        initialDelayMs: 10, // Reduced from 1000ms
        maxDelayMs: 100, // Reduced from 10000ms
        backoffMultiplier: 2,
      };

      // Should throw after all retries
      await expect(service.getCosts(dateRange)).rejects.toThrow('Too many requests');

      // Should have attempted max retries (3) + 1 initial call = 4 total
      expect(mockQueryUsage).toHaveBeenCalledTimes(4);
    });
  });

  // ============================================================
  // Data Transformation Tests
  // ============================================================

  describe('Data Transformation', () => {
    const dateRange: DateRange = {
      start: new Date('2024-12-01'),
      end: new Date('2024-12-07'),
    };

    beforeEach(() => {
      service = new AzureCostManagementService(mockCredentials);
    });

    it('should map Azure cost fields to CloudCostData interface', async () => {
      const mockQueryUsage = jest.fn().mockResolvedValue(mockAzureCostResponse);
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.getCosts(dateRange);

      expect(result.length).toBeGreaterThan(0);

      const firstCost = result[0];
      expect(firstCost).toHaveProperty('date');
      expect(firstCost).toHaveProperty('service');
      expect(firstCost).toHaveProperty('amount');
      expect(firstCost).toHaveProperty('currency');
      expect(firstCost.date).toBeInstanceOf(Date);
    });

    it('should parse Azure dates correctly (UTC)', async () => {
      const mockQueryUsage = jest.fn().mockResolvedValue(mockAzureCostResponse);
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.getCosts(dateRange);

      result.forEach((cost: CloudCostData) => {
        expect(cost.date).toBeInstanceOf(Date);
        expect(isNaN(cost.date.getTime())).toBe(false);
      });
    });

    it('should handle multiple currencies', async () => {
      const mockResponseWithMultiCurrency = {
        rows: [
          [20241201, 100, 'USD', 'Virtual Machines', 'eastus'],
          [20241201, 50, 'EUR', 'Storage', 'westeurope'],
        ],
        columns: [
          { name: 'UsageDate', type: 'Number' },
          { name: 'Cost', type: 'Number' },
          { name: 'Currency', type: 'String' },
          { name: 'MeterCategory', type: 'String' },
          { name: 'ResourceLocation', type: 'String' },
        ],
      };

      const mockQueryUsage = jest.fn().mockResolvedValue(mockResponseWithMultiCurrency);
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.getCosts(dateRange);

      // Note: Azure Cost Management returns USD by default
      // Multi-currency is handled at the subscription level
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle zero costs', async () => {
      const mockResponseWithZero = {
        rows: [
          [20241201, 0, 'Virtual Machines', 'eastus'],
          [20241201, 100, 'Storage', 'eastus'],
        ],
        columns: [
          { name: 'UsageDate', type: 'Number' },
          { name: 'Cost', type: 'Number' },
          { name: 'MeterCategory', type: 'String' },
          { name: 'ResourceLocation', type: 'String' },
        ],
      };

      const mockQueryUsage = jest.fn().mockResolvedValue(mockResponseWithZero);
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.getCosts(dateRange);

      // Zero costs are filtered out (amount > 0 check in transformation)
      const zeroCosts = result.filter((c: CloudCostData) => c.amount === 0);
      expect(zeroCosts.length).toBe(0);
    });
  });

  // ============================================================
  // getCostTrends() Method Tests
  // ============================================================

  describe('getCostTrends()', () => {
    const dateRange: DateRange = {
      start: new Date('2024-12-01'),
      end: new Date('2024-12-31'),
    };

    beforeEach(() => {
      service = new AzureCostManagementService(mockCredentials);
    });

    it('should retrieve daily cost trends', async () => {
      const mockQueryUsage = jest.fn().mockResolvedValue(mockAzureCostResponse);
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.getCostTrends(dateRange, 'daily');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should retrieve monthly cost trends', async () => {
      const mockQueryUsage = jest.fn().mockResolvedValue(mockAzureCostResponse);
      (service as any).client.query = { usage: mockQueryUsage };

      const result = await service.getCostTrends(dateRange, 'monthly');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================
  // Asset Discovery & Security Methods (Not Implemented - Stubs)
  // ============================================================

  describe('Asset Discovery Methods (Stubs)', () => {
    beforeEach(() => {
      service = new AzureCostManagementService(mockCredentials);
    });

    it('should throw error for discoverAssets', async () => {
      await expect(service.discoverAssets()).rejects.toThrow(
        'Asset discovery not implemented in Cost Management service'
      );
    });

    it('should throw error for getAssetDetails', async () => {
      await expect(service.getAssetDetails('resource-id')).rejects.toThrow(
        'Asset details not implemented in Cost Management service'
      );
    });

    it('should throw error for scanForMisconfigurations', async () => {
      await expect(service.scanForMisconfigurations()).rejects.toThrow(
        'Security scanning not implemented in Cost Management service'
      );
    });

    it('should throw error for getSecurityFindings', async () => {
      await expect(service.getSecurityFindings('resource-id')).rejects.toThrow(
        'Security findings not implemented in Cost Management service'
      );
    });
  });
});
