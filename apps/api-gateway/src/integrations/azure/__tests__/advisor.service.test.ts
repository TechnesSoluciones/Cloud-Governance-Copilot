/**
 * Azure Advisor Service Tests
 *
 * Comprehensive unit tests for Azure Advisor integration.
 * Tests cover all recommendation categories, error handling, and data transformation.
 *
 * Coverage Target: >80%
 */

import { AzureAdvisorService } from '../advisor.service';
import type { CloudProviderCredentials } from '../../cloud-provider.interface';
import {
  mockAdvisorCloudCredentials,
  mockAzureCostRecommendation,
  mockAzureSecurityRecommendation,
  mockAzureReliabilityRecommendation,
  mockAzurePerformanceRecommendation,
  mockAzureOperationalExcellenceRecommendation,
  expectedCostRecommendationNormalized,
} from '../../../__fixtures__/azure-advisor.fixture';

// Mock Azure SDK
jest.mock('@azure/arm-advisor');
jest.mock('@azure/identity');

/**
 * Helper function to create async iterator mock
 */
function createAsyncIteratorMock(...items: any[]) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const item of items) {
        yield item;
      }
    },
  };
}

describe('AzureAdvisorService', () => {
  let service: AzureAdvisorService;
  let mockCredentials: CloudProviderCredentials;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup valid credentials
    mockCredentials = { ...mockAdvisorCloudCredentials };
  });

  // ============================================================
  // Constructor & Initialization Tests
  // ============================================================

  describe('Constructor', () => {
    it('should initialize with valid Azure credentials', () => {
      expect(() => {
        service = new AzureAdvisorService(mockCredentials);
      }).not.toThrow();

      expect(service).toBeInstanceOf(AzureAdvisorService);
    });

    it('should throw error on missing clientId', () => {
      const invalidCreds = { ...mockCredentials, azureClientId: undefined };

      expect(() => {
        new AzureAdvisorService(invalidCreds);
      }).toThrow('Azure credentials (tenantId, clientId, clientSecret, subscriptionId) are required');
    });

    it('should throw error on missing clientSecret', () => {
      const invalidCreds = { ...mockCredentials, azureClientSecret: undefined };

      expect(() => {
        new AzureAdvisorService(invalidCreds);
      }).toThrow('Azure credentials (tenantId, clientId, clientSecret, subscriptionId) are required');
    });

    it('should throw error on missing tenantId', () => {
      const invalidCreds = { ...mockCredentials, azureTenantId: undefined };

      expect(() => {
        new AzureAdvisorService(invalidCreds);
      }).toThrow('Azure credentials (tenantId, clientId, clientSecret, subscriptionId) are required');
    });

    it('should throw error on missing subscriptionId', () => {
      const invalidCreds = { ...mockCredentials, azureSubscriptionId: undefined };

      expect(() => {
        new AzureAdvisorService(invalidCreds);
      }).toThrow('Azure credentials (tenantId, clientId, clientSecret, subscriptionId) are required');
    });

    it('should initialize with correct subscription ID', () => {
      service = new AzureAdvisorService(mockCredentials);

      // Access private config for testing
      const config = (service as any).config;
      expect(config.subscriptionId).toBe(mockCredentials.azureSubscriptionId);
    });
  });

  // ============================================================
  // getRecommendations() Method Tests
  // ============================================================

  describe('getRecommendations()', () => {
    beforeEach(() => {
      service = new AzureAdvisorService(mockCredentials);
    });

    it('should fetch all recommendations without filters', async () => {
      // Mock Azure Advisor API response with proper async iterator
      const mockList = jest.fn(() =>
        createAsyncIteratorMock(
          mockAzureCostRecommendation,
          mockAzureSecurityRecommendation,
          mockAzureReliabilityRecommendation
        )
      );
      (service as any).client.recommendations = { list: mockList };

      const result = await service.getRecommendations();

      expect(mockList).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });

    it('should filter by Cost category', async () => {
      const mockList = jest.fn(() => createAsyncIteratorMock(mockAzureCostRecommendation));
      (service as any).client.recommendations = { list: mockList };

      const result = await service.getRecommendations({ category: 'Cost' });

      expect(result.length).toBeGreaterThan(0);
      result.forEach((rec: any) => {
        expect(rec.category).toBe('Cost');
      });
    });

    it('should filter by Security category', async () => {
      const mockList = jest.fn(() => createAsyncIteratorMock(mockAzureSecurityRecommendation));
      (service as any).client.recommendations = { list: mockList };

      const result = await service.getRecommendations({ category: 'Security' });

      expect(result.length).toBeGreaterThan(0);
      result.forEach((rec: any) => {
        expect(rec.category).toBe('Security');
      });
    });

    it('should filter by impact level', async () => {
      const mockList = jest.fn(() =>
        createAsyncIteratorMock(mockAzureCostRecommendation, mockAzureSecurityRecommendation)
      );
      (service as any).client.recommendations = { list: mockList };

      const result = await service.getRecommendations({ impact: ['High'] });

      expect(result.length).toBeGreaterThan(0);
      result.forEach((rec: any) => {
        expect(rec.impact).toBe('High');
      });
    });

    it('should handle empty results', async () => {
      const mockList = jest.fn(() => createAsyncIteratorMock());
      (service as any).client.recommendations = { list: mockList };

      const result = await service.getRecommendations();

      expect(result).toEqual([]);
    });

    it('should normalize recommendation data correctly', async () => {
      const mockList = jest.fn(() => createAsyncIteratorMock(mockAzureCostRecommendation));
      (service as any).client.recommendations = { list: mockList };

      const result = await service.getRecommendations();

      expect(result.length).toBe(1);
      const rec = result[0];

      expect(rec).toHaveProperty('id');
      expect(rec).toHaveProperty('name');
      expect(rec).toHaveProperty('category');
      expect(rec).toHaveProperty('impact');
      expect(rec).toHaveProperty('shortDescription');
      expect(rec).toHaveProperty('metadata');
      expect(rec.metadata).toHaveProperty('resourceId');
      expect(rec.metadata).toHaveProperty('estimatedSavings');
    });

    it('should handle Azure API errors gracefully', async () => {
      const mockList = jest.fn().mockRejectedValue(new Error('Azure API error'));
      (service as any).client.recommendations = { list: mockList };

      await expect(service.getRecommendations()).rejects.toThrow(
        'Failed to fetch Azure Advisor recommendations'
      );
    });

    it('should transform Azure recommendation to normalized format', async () => {
      const mockList = jest.fn(() => createAsyncIteratorMock(mockAzureCostRecommendation));
      (service as any).client.recommendations = { list: mockList };

      const result = await service.getRecommendations();

      const normalized = result[0];
      expect(normalized.id).toBe(expectedCostRecommendationNormalized.id);
      expect(normalized.category).toBe(expectedCostRecommendationNormalized.category);
      expect(normalized.impact).toBe(expectedCostRecommendationNormalized.impact);
      expect(normalized.metadata.estimatedSavings?.amount).toBe(1752.0);
    });
  });

  // ============================================================
  // Category-Specific Methods Tests
  // ============================================================

  describe('Category-Specific Methods', () => {
    beforeEach(() => {
      service = new AzureAdvisorService(mockCredentials);
    });

    it('should fetch cost recommendations only', async () => {
      const mockList = jest.fn(() => createAsyncIteratorMock(mockAzureCostRecommendation));
      (service as any).client.recommendations = { list: mockList };

      const result = await service.getCostRecommendations();

      expect(result.length).toBeGreaterThan(0);
      result.forEach((rec: any) => {
        expect(rec.category).toBe('Cost');
      });
    });

    it('should fetch security recommendations only', async () => {
      const mockList = jest.fn(() => createAsyncIteratorMock(mockAzureSecurityRecommendation));
      (service as any).client.recommendations = { list: mockList };

      const result = await service.getSecurityRecommendations();

      expect(result.length).toBeGreaterThan(0);
      result.forEach((rec: any) => {
        expect(rec.category).toBe('Security');
      });
    });

    it('should fetch reliability recommendations only', async () => {
      const mockList = jest.fn(() => createAsyncIteratorMock(mockAzureReliabilityRecommendation));
      (service as any).client.recommendations = { list: mockList };

      const result = await service.getReliabilityRecommendations();

      expect(result.length).toBeGreaterThan(0);
      result.forEach((rec: any) => {
        expect(rec.category).toBe('Reliability');
      });
    });

    it('should fetch performance recommendations only', async () => {
      const mockList = jest.fn(() => createAsyncIteratorMock(mockAzurePerformanceRecommendation));
      (service as any).client.recommendations = { list: mockList };

      const result = await service.getPerformanceRecommendations();

      expect(result.length).toBeGreaterThan(0);
      result.forEach((rec: any) => {
        expect(rec.category).toBe('Performance');
      });
    });

    it('should fetch operational excellence recommendations only', async () => {
      const mockList = jest.fn(() =>
        createAsyncIteratorMock(mockAzureOperationalExcellenceRecommendation)
      );
      (service as any).client.recommendations = { list: mockList };

      const result = await service.getOperationalExcellenceRecommendations();

      expect(result.length).toBeGreaterThan(0);
      result.forEach((rec: any) => {
        expect(rec.category).toBe('OperationalExcellence');
      });
    });
  });

  // ============================================================
  // generateRecommendations() Method Tests
  // ============================================================

  describe('generateRecommendations()', () => {
    beforeEach(() => {
      service = new AzureAdvisorService(mockCredentials);
    });

    it('should trigger recommendation generation', async () => {
      const mockGenerate = jest.fn().mockResolvedValue({});
      (service as any).client.recommendations = { generate: mockGenerate };

      await service.generateRecommendations();

      expect(mockGenerate).toHaveBeenCalled();
    });

    it('should handle errors during generation', async () => {
      const mockGenerate = jest.fn().mockRejectedValue(new Error('Generation failed'));
      (service as any).client.recommendations = { generate: mockGenerate };

      await expect(service.generateRecommendations()).rejects.toThrow(
        'Failed to generate Azure Advisor recommendations'
      );
    });
  });

  // ============================================================
  // getRecommendationsForResource() Method Tests
  // ============================================================

  describe('getRecommendationsForResource()', () => {
    beforeEach(() => {
      service = new AzureAdvisorService(mockCredentials);
    });

    it('should fetch recommendations for specific resource', async () => {
      const resourceId =
        '/subscriptions/abcdef12-3456-7890-abcd-ef1234567890/resourceGroups/rg-production/providers/Microsoft.Compute/virtualMachines/vm-web-01';

      const mockList = jest.fn(() =>
        createAsyncIteratorMock(mockAzureCostRecommendation, mockAzureSecurityRecommendation)
      );
      (service as any).client.recommendations = { list: mockList };

      const result = await service.getRecommendationsForResource(resourceId);

      result.forEach((rec: any) => {
        expect(rec.metadata.resourceId).toBe(resourceId);
      });
    });

    it('should return empty array if no recommendations for resource', async () => {
      const resourceId =
        '/subscriptions/test/resourceGroups/test/providers/Microsoft.Compute/virtualMachines/nonexistent';

      const mockList = jest.fn(() => createAsyncIteratorMock(mockAzureCostRecommendation));
      (service as any).client.recommendations = { list: mockList };

      const result = await service.getRecommendationsForResource(resourceId);

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================

  describe('Error Handling', () => {
    beforeEach(() => {
      service = new AzureAdvisorService(mockCredentials);
    });

    it('should handle AuthenticationError', async () => {
      const authError = new Error('Authentication failed');
      (authError as any).statusCode = 401;

      const mockList = jest.fn().mockRejectedValue(authError);
      (service as any).client.recommendations = { list: mockList };

      await expect(service.getRecommendations()).rejects.toThrow(
        'Failed to fetch Azure Advisor recommendations'
      );
    });

    it('should handle SubscriptionNotFound', async () => {
      const notFoundError = new Error('Subscription not found');
      (notFoundError as any).code = 'SubscriptionNotFound';
      (notFoundError as any).statusCode = 404;

      const mockList = jest.fn().mockRejectedValue(notFoundError);
      (service as any).client.recommendations = { list: mockList };

      await expect(service.getRecommendations()).rejects.toThrow(
        'Failed to fetch Azure Advisor recommendations'
      );
    });

    it('should handle AuthorizationFailed (access denied)', async () => {
      const accessDeniedError = new Error('Authorization failed');
      (accessDeniedError as any).code = 'AuthorizationFailed';
      (accessDeniedError as any).statusCode = 403;

      const mockList = jest.fn().mockRejectedValue(accessDeniedError);
      (service as any).client.recommendations = { list: mockList };

      await expect(service.getRecommendations()).rejects.toThrow(
        'Failed to fetch Azure Advisor recommendations'
      );
    });

    it('should handle RateLimitError (429)', async () => {
      const rateLimitError = new Error('Too many requests');
      (rateLimitError as any).statusCode = 429;

      const mockList = jest.fn().mockRejectedValue(rateLimitError);
      (service as any).client.recommendations = { list: mockList };

      await expect(service.getRecommendations()).rejects.toThrow(
        'Failed to fetch Azure Advisor recommendations'
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error: ECONNREFUSED');

      const mockList = jest.fn().mockRejectedValue(networkError);
      (service as any).client.recommendations = { list: mockList };

      await expect(service.getRecommendations()).rejects.toThrow(
        'Failed to fetch Azure Advisor recommendations'
      );
    });
  });

  // ============================================================
  // Data Transformation Tests
  // ============================================================

  describe('Data Transformation', () => {
    beforeEach(() => {
      service = new AzureAdvisorService(mockCredentials);
    });

    it('should normalize category "Cost" correctly', () => {
      const normalized = (service as any).normalizeCategory('Cost');
      expect(normalized).toBe('Cost');
    });

    it('should normalize category "Security" correctly', () => {
      const normalized = (service as any).normalizeCategory('Security');
      expect(normalized).toBe('Security');
    });

    it('should normalize category "HighAvailability" to "Reliability"', () => {
      const normalized = (service as any).normalizeCategory('HighAvailability');
      expect(normalized).toBe('Reliability');
    });

    it('should normalize category "Performance" correctly', () => {
      const normalized = (service as any).normalizeCategory('Performance');
      expect(normalized).toBe('Performance');
    });

    it('should normalize category "OperationalExcellence" correctly', () => {
      const normalized = (service as any).normalizeCategory('OperationalExcellence');
      expect(normalized).toBe('OperationalExcellence');
    });

    it('should default unknown category to "OperationalExcellence"', () => {
      const normalized = (service as any).normalizeCategory('UnknownCategory');
      expect(normalized).toBe('OperationalExcellence');
    });

    it('should normalize impact "High" correctly', () => {
      const normalized = (service as any).normalizeImpact('High');
      expect(normalized).toBe('High');
    });

    it('should normalize impact "Medium" correctly', () => {
      const normalized = (service as any).normalizeImpact('Medium');
      expect(normalized).toBe('Medium');
    });

    it('should normalize impact "Low" correctly', () => {
      const normalized = (service as any).normalizeImpact('Low');
      expect(normalized).toBe('Low');
    });

    it('should default unknown impact to "Low"', () => {
      const normalized = (service as any).normalizeImpact('UnknownImpact');
      expect(normalized).toBe('Low');
    });

    it('should extract resource group from resource ID', () => {
      const resourceId =
        '/subscriptions/abc/resourceGroups/my-rg/providers/Microsoft.Compute/virtualMachines/vm1';
      const resourceGroup = (service as any).extractResourceGroup(resourceId);
      expect(resourceGroup).toBe('my-rg');
    });

    it('should handle resource ID without resource group', () => {
      const resourceId = '/subscriptions/abc/providers/Microsoft.Compute/virtualMachines/vm1';
      const resourceGroup = (service as any).extractResourceGroup(resourceId);
      expect(resourceGroup).toBeUndefined();
    });

    it('should parse estimated savings for cost recommendations', async () => {
      const mockList = jest.fn(() => createAsyncIteratorMock(mockAzureCostRecommendation));
      (service as any).client.recommendations = { list: mockList };

      const result = await service.getRecommendations({ category: 'Cost' });

      expect(result[0].metadata.estimatedSavings).toBeDefined();
      expect(result[0].metadata.estimatedSavings?.amount).toBe(1752.0);
      expect(result[0].metadata.estimatedSavings?.currency).toBe('USD');
    });

    it('should handle recommendations without estimated savings', async () => {
      const mockList = jest.fn(() => createAsyncIteratorMock(mockAzureSecurityRecommendation));
      (service as any).client.recommendations = { list: mockList };

      const result = await service.getRecommendations({ category: 'Security' });

      expect(result[0].metadata.estimatedSavings).toBeUndefined();
    });

    it('should extract recommended actions', async () => {
      const mockList = jest.fn(() => createAsyncIteratorMock(mockAzureCostRecommendation));
      (service as any).client.recommendations = { list: mockList };

      const result = await service.getRecommendations();

      expect(result[0].metadata.recommendedActions).toBeDefined();
      expect(Array.isArray(result[0].metadata.recommendedActions)).toBe(true);
      expect(result[0].metadata.recommendedActions?.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // Filter Building Tests
  // ============================================================

  describe('Filter Building', () => {
    beforeEach(() => {
      service = new AzureAdvisorService(mockCredentials);
    });

    it('should build filter for category', () => {
      const filter = (service as any).buildFilter({ category: 'Cost' });
      expect(filter).toBe("Category eq 'Cost'");
    });

    it('should build filter for resource type', () => {
      const filter = (service as any).buildFilter({
        resourceType: 'Microsoft.Compute/virtualMachines',
      });
      expect(filter).toBe("ImpactedField eq 'Microsoft.Compute/virtualMachines'");
    });

    it('should build combined filter', () => {
      const filter = (service as any).buildFilter({
        category: 'Cost',
        resourceType: 'Microsoft.Compute/virtualMachines',
      });
      expect(filter).toContain('Category eq');
      expect(filter).toContain('ImpactedField eq');
      expect(filter).toContain(' and ');
    });

    it('should return undefined for empty filters', () => {
      const filter = (service as any).buildFilter({});
      expect(filter).toBeUndefined();
    });

    it('should not include impact in API filter', () => {
      const filter = (service as any).buildFilter({ impact: ['High'] });
      expect(filter).toBeUndefined();
    });
  });

  // ============================================================
  // Client-Side Filtering Tests
  // ============================================================

  describe('Client-Side Filtering', () => {
    beforeEach(() => {
      service = new AzureAdvisorService(mockCredentials);
    });

    it('should match recommendations with no filters', () => {
      const matches = (service as any).matchesFilters(expectedCostRecommendationNormalized, undefined);
      expect(matches).toBe(true);
    });

    it('should match recommendations with matching impact', () => {
      const matches = (service as any).matchesFilters(expectedCostRecommendationNormalized, {
        impact: ['High'],
      });
      expect(matches).toBe(true);
    });

    it('should not match recommendations with non-matching impact', () => {
      const matches = (service as any).matchesFilters(expectedCostRecommendationNormalized, {
        impact: ['Low'],
      });
      expect(matches).toBe(false);
    });

    it('should match recommendations with matching resource type', () => {
      const matches = (service as any).matchesFilters(expectedCostRecommendationNormalized, {
        resourceType: 'Microsoft.Compute/virtualMachines',
      });
      expect(matches).toBe(true);
    });

    it('should not match recommendations with non-matching resource type', () => {
      const matches = (service as any).matchesFilters(expectedCostRecommendationNormalized, {
        resourceType: 'Microsoft.Storage/storageAccounts',
      });
      expect(matches).toBe(false);
    });
  });
});
