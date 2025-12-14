/**
 * Cost Collection Service Unit Tests
 *
 * Tests the orchestration service that coordinates credential decryption,
 * cloud provider selection, cost data collection, and database persistence.
 */

import { CostCollectionService } from '../../../modules/finops/services/cost-collection.service';
import { AWSCostExplorerService } from '../../../integrations/aws/cost-explorer.service';
import { AzureCostManagementService } from '../../../integrations/azure/cost-management.service';
import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import { createMockDateRange, createMockCostData, createMockPrismaCloudAccount } from '../../utils/test-helpers';

// Mock dependencies
jest.mock('../../../integrations/aws/cost-explorer.service');
jest.mock('../../../integrations/azure/cost-management.service');
jest.mock('crypto', () => ({
  createDecipheriv: jest.fn(() => ({
    setAuthTag: jest.fn(),
    update: jest.fn(() => Buffer.from('{"accessKeyId":"AKIA","secretAccessKey":"secret","region":"us-east-1"}')),
    final: jest.fn(() => Buffer.from('')),
  })),
}));

describe('Cost Collection Service', () => {
  let service: CostCollectionService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockEventBus: EventEmitter;
  let mockAWSService: jest.Mocked<AWSCostExplorerService>;
  let mockAzureService: jest.Mocked<AzureCostManagementService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Prisma client
    mockPrisma = {
      cloudAccount: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      costData: {
        createMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    } as any;

    // Mock Event Bus
    mockEventBus = new EventEmitter();

    // Mock AWS Service
    mockAWSService = {
      validateCredentials: jest.fn().mockResolvedValue(true),
      getCosts: jest.fn().mockResolvedValue([
        createMockCostData({ amount: 100, service: 'EC2' }),
        createMockCostData({ amount: 50, service: 'RDS' }),
      ]),
    } as any;

    // Mock Azure Service
    mockAzureService = {
      validateCredentials: jest.fn().mockResolvedValue(true),
      getCosts: jest.fn().mockResolvedValue([]),
    } as any;

    // Mock service constructors
    (AWSCostExplorerService as jest.MockedClass<typeof AWSCostExplorerService>).mockImplementation(
      () => mockAWSService
    );
    (AzureCostManagementService as jest.MockedClass<typeof AzureCostManagementService>).mockImplementation(
      () => mockAzureService
    );

    // Set encryption key in environment
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars!!';

    service = new CostCollectionService(mockPrisma, mockEventBus);
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  describe('collectCostsForAccount()', () => {
    it('should use correct provider via Factory Pattern', async () => {
      const awsAccount = createMockPrismaCloudAccount({ provider: 'aws' });
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(awsAccount as any);
      mockPrisma.costData.createMany.mockResolvedValueOnce({ count: 2 } as any);

      const dateRange = createMockDateRange(1);
      const result = await service.collectCostsForAccount('account-uuid-1', dateRange);

      expect(result.success).toBe(true);
      expect(AWSCostExplorerService).toHaveBeenCalledWith({
        provider: 'aws',
        awsAccessKeyId: 'AKIA',
        awsSecretAccessKey: 'secret',
        awsRegion: 'us-east-1',
      });
      expect(mockAWSService.getCosts).toHaveBeenCalledWith(dateRange);
    });

    it('should route to Azure provider for Azure accounts', async () => {
      const azureAccount = createMockPrismaCloudAccount({
        provider: 'azure',
        credentialsCiphertext: 'azure-ciphertext',
      });
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(azureAccount as any);

      // Mock decryption to return Azure credentials
      const crypto = require('crypto');
      crypto.createDecipheriv.mockReturnValueOnce({
        setAuthTag: jest.fn(),
        update: jest.fn(() => Buffer.from('{"clientId":"client","clientSecret":"secret","tenantId":"tenant","subscriptionId":"sub"}')),
        final: jest.fn(() => Buffer.from('')),
      });

      mockAzureService.getCosts.mockResolvedValueOnce([createMockCostData()]);
      mockPrisma.costData.createMany.mockResolvedValueOnce({ count: 1 } as any);

      const result = await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      expect(result.success).toBe(true);
      expect(AzureCostManagementService).toHaveBeenCalled();
    });

    it('should throw error for unsupported providers', async () => {
      const unsupportedAccount = createMockPrismaCloudAccount({ provider: 'gcp' });
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(unsupportedAccount as any);

      const result = await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Unsupported cloud provider: gcp'),
        ])
      );
    });

    it('should decrypt credentials before use', async () => {
      const account = createMockPrismaCloudAccount();
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(account as any);
      mockPrisma.costData.createMany.mockResolvedValueOnce({ count: 2 } as any);

      await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      const crypto = require('crypto');
      expect(crypto.createDecipheriv).toHaveBeenCalledWith(
        'aes-256-gcm',
        expect.any(Buffer),
        expect.any(Buffer)
      );
    });

    it('should validate credentials after decryption', async () => {
      const account = createMockPrismaCloudAccount();
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(account as any);
      mockPrisma.costData.createMany.mockResolvedValueOnce({ count: 2 } as any);

      await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      expect(mockAWSService.validateCredentials).toHaveBeenCalled();
    });

    it('should handle invalid credentials gracefully', async () => {
      const account = createMockPrismaCloudAccount();
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(account as any);

      // Mock validation failure
      mockAWSService.validateCredentials.mockResolvedValueOnce(false);

      const result = await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Invalid AWS credentials'),
        ])
      );
    });

    it('should store costs in database', async () => {
      const account = createMockPrismaCloudAccount({ tenantId: 'tenant-123' });
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(account as any);
      mockPrisma.costData.createMany.mockResolvedValueOnce({ count: 2 } as any);

      await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.costData.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            tenantId: 'tenant-123',
            cloudAccountId: 'account-uuid-1',
            provider: 'aws',
            amount: 100,
            service: 'EC2',
          }),
        ]),
        skipDuplicates: true,
      });
    });

    it('should handle collection errors', async () => {
      const account = createMockPrismaCloudAccount();
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(account as any);

      // Mock getCosts to throw error
      mockAWSService.getCosts.mockRejectedValueOnce(new Error('AWS API Error'));

      const result = await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      expect(result.success).toBe(false);
      expect(result.recordsSaved).toBe(0);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('AWS API Error')])
      );
    });

    it('should update lastSync timestamp on success', async () => {
      const account = createMockPrismaCloudAccount();
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(account as any);
      mockPrisma.costData.createMany.mockResolvedValueOnce({ count: 2 } as any);
      mockPrisma.cloudAccount.update.mockResolvedValueOnce({} as any);

      await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      expect(mockPrisma.cloudAccount.update).toHaveBeenCalledWith({
        where: { id: 'account-uuid-1' },
        data: { lastSync: expect.any(Date) },
      });
    });

    it('should return collection statistics', async () => {
      const account = createMockPrismaCloudAccount();
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(account as any);
      mockPrisma.costData.createMany.mockResolvedValueOnce({ count: 2 } as any);

      const result = await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      expect(result).toMatchObject({
        success: true,
        recordsObtained: 2,
        recordsSaved: 2,
        executionTimeMs: expect.any(Number),
      });
    });

    it('should handle cloud account not found', async () => {
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(null);

      const result = await service.collectCostsForAccount('nonexistent', createMockDateRange(1));

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Cloud account with ID "nonexistent" not found'),
        ])
      );
    });
  });

  describe('Factory Pattern', () => {
    it('should create AWS provider with correct credentials', async () => {
      const account = createMockPrismaCloudAccount({ provider: 'aws' });
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(account as any);
      mockPrisma.costData.createMany.mockResolvedValueOnce({ count: 0 } as any);

      await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      expect(AWSCostExplorerService).toHaveBeenCalledWith({
        provider: 'aws',
        awsAccessKeyId: 'AKIA',
        awsSecretAccessKey: 'secret',
        awsRegion: 'us-east-1',
      });
    });

    it('should create Azure provider with correct credentials', async () => {
      const account = createMockPrismaCloudAccount({ provider: 'azure' });
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(account as any);

      const crypto = require('crypto');
      crypto.createDecipheriv.mockReturnValueOnce({
        setAuthTag: jest.fn(),
        update: jest.fn(() => Buffer.from('{"clientId":"client-id","clientSecret":"secret","tenantId":"tenant-id","subscriptionId":"sub-id"}')),
        final: jest.fn(() => Buffer.from('')),
      });

      mockAzureService.getCosts.mockResolvedValueOnce([]);
      mockPrisma.costData.createMany.mockResolvedValueOnce({ count: 0 } as any);

      await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      expect(AzureCostManagementService).toHaveBeenCalledWith({
        provider: 'azure',
        azureClientId: 'client-id',
        azureClientSecret: 'secret',
        azureTenantId: 'tenant-id',
        azureSubscriptionId: 'sub-id',
      });
    });
  });

  describe('Encryption Integration', () => {
    it('should decrypt AWS credentials correctly', async () => {
      const account = createMockPrismaCloudAccount({ provider: 'aws' });
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(account as any);
      mockPrisma.costData.createMany.mockResolvedValueOnce({ count: 0 } as any);

      await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      expect(AWSCostExplorerService).toHaveBeenCalledWith(
        expect.objectContaining({
          awsAccessKeyId: expect.any(String),
          awsSecretAccessKey: expect.any(String),
        })
      );
    });

    it('should handle decryption failures', async () => {
      const account = createMockPrismaCloudAccount();
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(account as any);

      // Mock decryption failure
      const crypto = require('crypto');
      crypto.createDecipheriv.mockReturnValueOnce({
        setAuthTag: jest.fn(),
        update: jest.fn(() => { throw new Error('Decryption failed'); }),
        final: jest.fn(),
      });

      const result = await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Failed to decrypt credentials'),
        ])
      );
    });

    it('should require ENCRYPTION_KEY environment variable', async () => {
      delete process.env.ENCRYPTION_KEY;

      const account = createMockPrismaCloudAccount();
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(account as any);

      const result = await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('ENCRYPTION_KEY environment variable is not set'),
        ])
      );
    });
  });

  describe('Transaction Management', () => {
    it('should use Prisma transaction for atomic operations', async () => {
      const account = createMockPrismaCloudAccount();
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(account as any);
      mockPrisma.costData.createMany.mockResolvedValueOnce({ count: 2 } as any);

      await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should skip duplicates when saving costs', async () => {
      const account = createMockPrismaCloudAccount();
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(account as any);
      mockPrisma.costData.createMany.mockResolvedValueOnce({ count: 1 } as any);

      await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      expect(mockPrisma.costData.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skipDuplicates: true,
        })
      );
    });

    it('should handle transaction failures', async () => {
      const account = createMockPrismaCloudAccount();
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(account as any);

      // Mock transaction failure
      mockPrisma.$transaction.mockRejectedValueOnce(new Error('Transaction failed'));

      const result = await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('Transaction failed')])
      );
    });
  });

  describe('Cost Data Transformation', () => {
    it('should transform CloudCostData to Prisma format', async () => {
      const account = createMockPrismaCloudAccount({ tenantId: 'tenant-123', id: 'account-456' });
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(account as any);

      const mockCosts = [
        createMockCostData({
          date: new Date('2025-12-01'),
          amount: 100.50,
          currency: 'USD',
          service: 'EC2',
          usageType: 'BoxUsage:t3.medium',
          operation: 'RunInstances',
          tags: { Environment: 'prod' },
          metadata: { granularity: 'DAILY' },
        }),
      ];

      mockAWSService.getCosts.mockResolvedValueOnce(mockCosts);
      mockPrisma.costData.createMany.mockResolvedValueOnce({ count: 1 } as any);

      await service.collectCostsForAccount('account-456', createMockDateRange(1));

      expect(mockPrisma.costData.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            tenantId: 'tenant-123',
            cloudAccountId: 'account-456',
            date: new Date('2025-12-01'),
            amount: 100.50,
            currency: 'USD',
            provider: 'aws',
            service: 'EC2',
            usageType: 'BoxUsage:t3.medium',
            operation: 'RunInstances',
            tags: { Environment: 'prod' },
            metadata: { granularity: 'DAILY' },
            assetId: null,
          }),
        ],
        skipDuplicates: true,
      });
    });

    it('should handle empty cost results', async () => {
      const account = createMockPrismaCloudAccount();
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(account as any);

      mockAWSService.getCosts.mockResolvedValueOnce([]);
      mockPrisma.costData.createMany.mockResolvedValueOnce({ count: 0 } as any);

      const result = await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      expect(result.success).toBe(true);
      expect(result.recordsObtained).toBe(0);
      expect(result.recordsSaved).toBe(0);
    });
  });

  describe('Error Recovery', () => {
    it('should continue processing after non-fatal errors', async () => {
      const account = createMockPrismaCloudAccount();
      mockPrisma.cloudAccount.findUnique.mockResolvedValueOnce(account as any);
      mockPrisma.costData.createMany.mockResolvedValueOnce({ count: 0 } as any);

      // Service should not throw, just return error result
      const result = await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      expect(result).toBeDefined();
    });

    it('should log errors for debugging', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockPrisma.cloudAccount.findUnique.mockRejectedValueOnce(new Error('Database error'));

      await service.collectCostsForAccount('account-uuid-1', createMockDateRange(1));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
