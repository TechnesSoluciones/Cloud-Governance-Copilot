/**
 * Unit Tests: Cost Collection Service
 *
 * This test suite verifies the CostCollectionService with mocked Prisma, AWS SDK, and Azure SDK.
 * Tests cover the complete cost collection workflow including credential decryption,
 * AWS/Azure integration, database persistence, and error handling.
 */

import { CostCollectionService } from '../cost-collection.service';
import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import { AWSCostExplorerService } from '../../../../integrations/aws';
import { AzureCostManagementService } from '../../../../integrations/azure';
import crypto from 'crypto';

// Mock Prisma
jest.mock('@prisma/client');

// Mock AWS Cost Explorer Service
jest.mock('../../../../integrations/aws', () => ({
  AWSCostExplorerService: jest.fn(),
}));

// Mock Azure Cost Management Service
jest.mock('../../../../integrations/azure', () => ({
  AzureCostManagementService: jest.fn(),
}));

/**
 * Helper function to encrypt credentials for testing
 * Uses the same padEnd logic as the cost-collection service
 */
function encryptTestCredentials(credentials: any, encryptionKey: string): {
  credentialsCiphertext: string;
  credentialsIv: string;
  credentialsAuthTag: string;
} {
  const plaintext = JSON.stringify(credentials);
  const keyBuffer = Buffer.from(encryptionKey.padEnd(32, '0').substring(0, 32));
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
  let ciphertext = cipher.update(plaintext, 'utf8');
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    credentialsCiphertext: ciphertext.toString('hex'),
    credentialsIv: iv.toString('hex'),
    credentialsAuthTag: authTag.toString('hex'),
  };
}

describe('CostCollectionService', () => {
  let service: CostCollectionService;
  let prismaMock: jest.Mocked<PrismaClient>;
  let eventBusMock: jest.Mocked<EventEmitter>;
  let mockCostExplorerService: jest.Mocked<AWSCostExplorerService>;
  let mockAzureCostService: jest.Mocked<AzureCostManagementService>;

  beforeEach(() => {
    // Create Prisma mock
    prismaMock = {
      cloudAccount: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      costData: {
        createMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prismaMock)),
    } as any;

    // Create EventBus mock
    eventBusMock = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    } as any;

    // Create AWS Cost Explorer mock
    mockCostExplorerService = {
      validateCredentials: jest.fn(),
      getCosts: jest.fn(),
    } as any;

    // Create Azure Cost Management mock
    mockAzureCostService = {
      validateCredentials: jest.fn(),
      getCosts: jest.fn(),
    } as any;

    (AWSCostExplorerService as jest.MockedClass<typeof AWSCostExplorerService>).mockImplementation(
      () => mockCostExplorerService
    );

    (AzureCostManagementService as jest.MockedClass<typeof AzureCostManagementService>).mockImplementation(
      () => mockAzureCostService
    );

    // Set ENCRYPTION_KEY for decryption tests
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-bytes!!';

    // Create service instance
    service = new CostCollectionService(prismaMock, eventBusMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // collectCostsForAccount - Success Cases
  // ============================================================

  describe('collectCostsForAccount - Success', () => {
    it('should obtain cloud account correctly', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-123',
        tenantId: 'tenant-456',
        provider: 'aws',
        accountName: 'Production AWS',
        credentialsCiphertext: '5468697320697320656e637279707465642064617461',
        credentialsIv: '0123456789abcdef0123456789abcdef',
        credentialsAuthTag: 'fedcba9876543210fedcba9876543210',
        tenant: {
          id: 'tenant-456',
          name: 'Test Tenant',
        },
      };

      prismaMock.cloudAccount.findUnique.mockResolvedValue(mockAccount as any);
      mockCostExplorerService.validateCredentials.mockResolvedValue(true);
      mockCostExplorerService.getCosts.mockResolvedValue([]);
      prismaMock.costData.createMany.mockResolvedValue({ count: 0 } as any);
      prismaMock.cloudAccount.update.mockResolvedValue({} as any);

      // Act
      await service.collectCostsForAccount('account-123', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(prismaMock.cloudAccount.findUnique).toHaveBeenCalledWith({
        where: { id: 'account-123' },
        include: { tenant: true },
      });
    });

    it('should validate AWS credentials', async () => {
      // Arrange
      const testKey = 'test-encryption-key-32-bytes!!';
      const credentials = {
        accessKeyId: 'AKIATEST',
        secretAccessKey: 'secretTest',
      };

      const mockAccount = {
        id: 'account-123',
        provider: 'aws',
        accountName: 'Test Account',
        ...encryptTestCredentials(credentials, testKey),
        tenant: { id: 'tenant-1', name: 'Tenant' },
        tenantId: 'tenant-1',
      };

      prismaMock.cloudAccount.findUnique.mockResolvedValue(mockAccount as any);
      mockCostExplorerService.validateCredentials.mockResolvedValue(true);
      mockCostExplorerService.getCosts.mockResolvedValue([]);
      prismaMock.costData.createMany.mockResolvedValue({ count: 0 } as any);
      prismaMock.cloudAccount.update.mockResolvedValue({} as any);

      // Act
      await service.collectCostsForAccount('account-123', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(AWSCostExplorerService).toHaveBeenCalled();
      expect(mockCostExplorerService.validateCredentials).toHaveBeenCalled();
    });

    it('should save costs to database', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-123',
        tenantId: 'tenant-456',
        provider: 'aws',
        accountName: 'Test Account',
        ...encryptTestCredentials({
            accessKeyId: 'AKIATEST',
            secretAccessKey: 'secretTest',
          }, 'test-encryption-key-32-bytes!!'),
        tenant: { id: 'tenant-456', name: 'Tenant' },
      };

      const mockCosts = [
        {
          date: new Date('2024-01-15'),
          service: 'Amazon EC2',
          amount: 150.5,
          currency: 'USD',
          usageType: 't2.micro',
          operation: 'RunInstances',
          tags: { Environment: 'prod' },
          metadata: { region: 'us-east-1' },
        },
        {
          date: new Date('2024-01-16'),
          service: 'Amazon RDS',
          amount: 75.25,
          currency: 'USD',
          usageType: 'db.t3.small',
          operation: null,
          tags: {},
          metadata: {},
        },
      ];

      prismaMock.cloudAccount.findUnique.mockResolvedValue(mockAccount as any);
      mockCostExplorerService.validateCredentials.mockResolvedValue(true);
      mockCostExplorerService.getCosts.mockResolvedValue(mockCosts as any);
      prismaMock.costData.createMany.mockResolvedValue({ count: 2 } as any);
      prismaMock.cloudAccount.update.mockResolvedValue({} as any);

      // Act
      const result = await service.collectCostsForAccount('account-123', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(prismaMock.costData.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            tenantId: 'tenant-456',
            cloudAccountId: 'account-123',
            service: 'Amazon EC2',
            amount: 150.5,
            currency: 'USD',
          }),
          expect.objectContaining({
            service: 'Amazon RDS',
            amount: 75.25,
          }),
        ]),
        skipDuplicates: true,
      });

      expect(result.success).toBe(true);
      expect(result.recordsSaved).toBe(2);
    });

    it('should update lastSync timestamp', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-123',
        provider: 'aws',
        accountName: 'Test Account',
        ...encryptTestCredentials({
            accessKeyId: 'AKIATEST',
            secretAccessKey: 'secretTest',
          }, 'test-encryption-key-32-bytes!!'),
        tenant: { id: 'tenant-1', name: 'Tenant' },
        tenantId: 'tenant-1',
      };

      prismaMock.cloudAccount.findUnique.mockResolvedValue(mockAccount as any);
      mockCostExplorerService.validateCredentials.mockResolvedValue(true);
      mockCostExplorerService.getCosts.mockResolvedValue([]);
      prismaMock.costData.createMany.mockResolvedValue({ count: 0 } as any);
      prismaMock.cloudAccount.update.mockResolvedValue({} as any);

      // Act
      await service.collectCostsForAccount('account-123', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(prismaMock.cloudAccount.update).toHaveBeenCalledWith({
        where: { id: 'account-123' },
        data: { lastSync: expect.any(Date) },
      });
    });

    it('should return collection statistics', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-123',
        provider: 'aws',
        accountName: 'Test Account',
        ...encryptTestCredentials({
            accessKeyId: 'AKIATEST',
            secretAccessKey: 'secretTest',
          }, 'test-encryption-key-32-bytes!!'),
        tenant: { id: 'tenant-1', name: 'Tenant' },
        tenantId: 'tenant-1',
      };

      const mockCosts = [
        {
          date: new Date(),
          service: 'EC2',
          amount: 100,
          currency: 'USD',
          usageType: 't2.micro',
        },
        {
          date: new Date(),
          service: 'RDS',
          amount: 50,
          currency: 'USD',
          usageType: 'db.t3.small',
        },
      ];

      prismaMock.cloudAccount.findUnique.mockResolvedValue(mockAccount as any);
      mockCostExplorerService.validateCredentials.mockResolvedValue(true);
      mockCostExplorerService.getCosts.mockResolvedValue(mockCosts as any);
      prismaMock.costData.createMany.mockResolvedValue({ count: 2 } as any);
      prismaMock.cloudAccount.update.mockResolvedValue({} as any);

      // Act
      const result = await service.collectCostsForAccount('account-123', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(result).toMatchObject({
        success: true,
        recordsObtained: 2,
        recordsSaved: 2,
        executionTimeMs: expect.any(Number),
      });
    });

    it('should use transaction for database operations', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-123',
        provider: 'aws',
        accountName: 'Test Account',
        ...encryptTestCredentials({
            accessKeyId: 'AKIATEST',
            secretAccessKey: 'secretTest',
          }, 'test-encryption-key-32-bytes!!'),
        tenant: { id: 'tenant-1', name: 'Tenant' },
        tenantId: 'tenant-1',
      };

      prismaMock.cloudAccount.findUnique.mockResolvedValue(mockAccount as any);
      mockCostExplorerService.validateCredentials.mockResolvedValue(true);
      mockCostExplorerService.getCosts.mockResolvedValue([
        {
          date: new Date(),
          service: 'EC2',
          amount: 100,
          currency: 'USD',
          usageType: 't2.micro',
        },
      ] as any);
      prismaMock.costData.createMany.mockResolvedValue({ count: 1 } as any);
      prismaMock.cloudAccount.update.mockResolvedValue({} as any);

      // Act
      await service.collectCostsForAccount('account-123', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });

  // ============================================================
  // collectCostsForAccount - Error Cases
  // ============================================================

  describe('collectCostsForAccount - Errors', () => {
    it('should handle error if account not found', async () => {
      // Arrange
      prismaMock.cloudAccount.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.collectCostsForAccount('nonexistent-id', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Cloud account with ID "nonexistent-id" not found');
    });

    it('should handle error if provider is unsupported', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-123',
        provider: 'gcp', // GCP not yet supported
        accountName: 'GCP Account',
        ...encryptTestCredentials({ someKey: 'someValue' }, 'test-encryption-key-32-bytes!!'),
        tenant: { id: 'tenant-1', name: 'Tenant' },
      };

      prismaMock.cloudAccount.findUnique.mockResolvedValue(mockAccount as any);

      // Act
      const result = await service.collectCostsForAccount('account-123', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Unsupported cloud provider');
    });

    it('should handle error if credentials are invalid', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-123',
        provider: 'aws',
        accountName: 'Test Account',
        ...encryptTestCredentials({
            accessKeyId: 'INVALID',
            secretAccessKey: 'INVALID',
          }, 'test-encryption-key-32-bytes!!'),
        tenant: { id: 'tenant-1', name: 'Tenant' },
        tenantId: 'tenant-1',
      };

      prismaMock.cloudAccount.findUnique.mockResolvedValue(mockAccount as any);
      mockCostExplorerService.validateCredentials.mockResolvedValue(false);

      // Act
      const result = await service.collectCostsForAccount('account-123', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Invalid AWS credentials');
    });

    it('should handle missing ENCRYPTION_KEY', async () => {
      // Arrange
      delete process.env.ENCRYPTION_KEY;

      const mockAccount = {
        id: 'account-123',
        provider: 'aws',
        accountName: 'Test Account',
        credentialsCiphertext: 'encrypted',
        credentialsIv: 'iv',
        credentialsAuthTag: 'tag',
        tenant: { id: 'tenant-1', name: 'Tenant' },
      };

      prismaMock.cloudAccount.findUnique.mockResolvedValue(mockAccount as any);

      // Act
      const result = await service.collectCostsForAccount('account-123', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('ENCRYPTION_KEY environment variable is not set');
    });

    it('should rollback transaction on AWS error', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-123',
        provider: 'aws',
        accountName: 'Test Account',
        ...encryptTestCredentials({
            accessKeyId: 'AKIATEST',
            secretAccessKey: 'secretTest',
          }, 'test-encryption-key-32-bytes!!'),
        tenant: { id: 'tenant-1', name: 'Tenant' },
        tenantId: 'tenant-1',
      };

      prismaMock.cloudAccount.findUnique.mockResolvedValue(mockAccount as any);
      mockCostExplorerService.validateCredentials.mockResolvedValue(true);
      mockCostExplorerService.getCosts.mockRejectedValue(new Error('AWS API Error'));

      // Act
      const result = await service.collectCostsForAccount('account-123', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(result.success).toBe(false);
      expect(prismaMock.cloudAccount.update).not.toHaveBeenCalled(); // Transaction rolled back
    });

    it('should handle decryption errors', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-123',
        provider: 'aws',
        accountName: 'Test Account',
        credentialsCiphertext: 'invalid-hex',
        credentialsIv: 'invalid',
        credentialsAuthTag: 'invalid',
        tenant: { id: 'tenant-1', name: 'Tenant' },
      };

      prismaMock.cloudAccount.findUnique.mockResolvedValue(mockAccount as any);

      // Act
      const result = await service.collectCostsForAccount('account-123', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Failed to decrypt credentials');
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('Edge Cases', () => {
    it('should handle zero cost records from AWS', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-123',
        provider: 'aws',
        accountName: 'Test Account',
        ...encryptTestCredentials({
            accessKeyId: 'AKIATEST',
            secretAccessKey: 'secretTest',
          }, 'test-encryption-key-32-bytes!!'),
        tenant: { id: 'tenant-1', name: 'Tenant' },
        tenantId: 'tenant-1',
      };

      prismaMock.cloudAccount.findUnique.mockResolvedValue(mockAccount as any);
      mockCostExplorerService.validateCredentials.mockResolvedValue(true);
      mockCostExplorerService.getCosts.mockResolvedValue([]);
      prismaMock.costData.createMany.mockResolvedValue({ count: 0 } as any);
      prismaMock.cloudAccount.update.mockResolvedValue({} as any);

      // Act
      const result = await service.collectCostsForAccount('account-123', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.recordsObtained).toBe(0);
      expect(result.recordsSaved).toBe(0);
    });

    it('should handle skipDuplicates in database save', async () => {
      // Arrange
      const mockAccount = {
        id: 'account-123',
        provider: 'aws',
        accountName: 'Test Account',
        ...encryptTestCredentials({
            accessKeyId: 'AKIATEST',
            secretAccessKey: 'secretTest',
          }, 'test-encryption-key-32-bytes!!'),
        tenant: { id: 'tenant-1', name: 'Tenant' },
        tenantId: 'tenant-1',
      };

      const mockCosts = [
        {
          date: new Date(),
          service: 'EC2',
          amount: 100,
          currency: 'USD',
          usageType: 't2.micro',
        },
      ];

      prismaMock.cloudAccount.findUnique.mockResolvedValue(mockAccount as any);
      mockCostExplorerService.validateCredentials.mockResolvedValue(true);
      mockCostExplorerService.getCosts.mockResolvedValue(mockCosts as any);
      // Simulate duplicate: 1 obtained but 0 saved
      prismaMock.costData.createMany.mockResolvedValue({ count: 0 } as any);
      prismaMock.cloudAccount.update.mockResolvedValue({} as any);

      // Act
      const result = await service.collectCostsForAccount('account-123', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.recordsObtained).toBe(1);
      expect(result.recordsSaved).toBe(0); // All were duplicates
      expect(prismaMock.costData.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skipDuplicates: true,
        })
      );
    });
  });

  // ============================================================
  // Azure Integration Tests
  // ============================================================

  describe('Azure Cloud Provider Support', () => {
    it('should collect costs from Azure account', async () => {
      // Arrange
      const mockAccount = {
        id: 'azure-account-123',
        tenantId: 'tenant-456',
        provider: 'azure',
        accountName: 'Production Azure',
        ...encryptTestCredentials({
            clientId: 'azure-client-id',
            clientSecret: 'azure-secret',
            tenantId: 'azure-tenant-id',
            subscriptionId: 'azure-subscription-id',
          }, 'test-encryption-key-32-bytes!!'),
        tenant: { id: 'tenant-456', name: 'Test Tenant' },
      };

      const mockCosts = [
        {
          date: new Date('2024-01-15'),
          service: 'Virtual Machines',
          amount: 250.75,
          currency: 'USD',
          usageType: 'Standard_D2s_v3',
          operation: 'Compute',
          tags: { Department: 'Engineering' },
          metadata: { location: 'eastus' },
        },
      ];

      prismaMock.cloudAccount.findUnique.mockResolvedValue(mockAccount as any);
      mockAzureCostService.validateCredentials.mockResolvedValue(true);
      mockAzureCostService.getCosts.mockResolvedValue(mockCosts as any);
      prismaMock.costData.createMany.mockResolvedValue({ count: 1 } as any);
      prismaMock.cloudAccount.update.mockResolvedValue({} as any);

      // Act
      const result = await service.collectCostsForAccount('azure-account-123', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(AzureCostManagementService).toHaveBeenCalledWith({
        provider: 'azure',
        azureClientId: 'azure-client-id',
        azureClientSecret: 'azure-secret',
        azureTenantId: 'azure-tenant-id',
        azureSubscriptionId: 'azure-subscription-id',
      });
      expect(mockAzureCostService.validateCredentials).toHaveBeenCalled();
      expect(mockAzureCostService.getCosts).toHaveBeenCalledWith({
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });
      expect(result.success).toBe(true);
      expect(result.recordsObtained).toBe(1);
      expect(result.recordsSaved).toBe(1);
    });

    it('should handle invalid Azure credentials', async () => {
      // Arrange
      const mockAccount = {
        id: 'azure-account-123',
        tenantId: 'tenant-456',
        provider: 'azure',
        accountName: 'Azure Account',
        ...encryptTestCredentials({
            clientId: 'invalid-client',
            clientSecret: 'invalid-secret',
            tenantId: 'invalid-tenant',
            subscriptionId: 'invalid-subscription',
          }, 'test-encryption-key-32-bytes!!'),
        tenant: { id: 'tenant-456', name: 'Test Tenant' },
      };

      prismaMock.cloudAccount.findUnique.mockResolvedValue(mockAccount as any);
      mockAzureCostService.validateCredentials.mockResolvedValue(false);

      // Act
      const result = await service.collectCostsForAccount('azure-account-123', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Invalid AZURE credentials');
    });

    it('should save Azure costs with correct provider field', async () => {
      // Arrange
      const mockAccount = {
        id: 'azure-account-123',
        tenantId: 'tenant-456',
        provider: 'azure',
        accountName: 'Azure Account',
        ...encryptTestCredentials({
            clientId: 'client-id',
            clientSecret: 'secret',
            tenantId: 'tenant-id',
            subscriptionId: 'subscription-id',
          }, 'test-encryption-key-32-bytes!!'),
        tenant: { id: 'tenant-456', name: 'Test Tenant' },
      };

      const mockCosts = [
        {
          date: new Date('2024-01-15'),
          service: 'Azure SQL Database',
          amount: 150.0,
          currency: 'USD',
          usageType: 'Standard S1',
          operation: null,
          tags: {},
          metadata: {},
        },
      ];

      prismaMock.cloudAccount.findUnique.mockResolvedValue(mockAccount as any);
      mockAzureCostService.validateCredentials.mockResolvedValue(true);
      mockAzureCostService.getCosts.mockResolvedValue(mockCosts as any);
      prismaMock.costData.createMany.mockResolvedValue({ count: 1 } as any);
      prismaMock.cloudAccount.update.mockResolvedValue({} as any);

      // Act
      await service.collectCostsForAccount('azure-account-123', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(prismaMock.costData.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            provider: 'azure',
            service: 'Azure SQL Database',
            amount: 150.0,
          }),
        ]),
        skipDuplicates: true,
      });
    });
  });

  // ============================================================
  // Multi-Provider Edge Cases
  // ============================================================

  describe('Multi-Provider Edge Cases', () => {
    it('should handle both AWS and Azure accounts in sequence', async () => {
      // This test ensures factory pattern works correctly for both providers

      // First: AWS account
      const awsAccount = {
        id: 'aws-123',
        tenantId: 'tenant-1',
        provider: 'aws',
        accountName: 'AWS Account',
        ...encryptTestCredentials({
            accessKeyId: 'AKIA',
            secretAccessKey: 'secret',
          }, 'test-encryption-key-32-bytes!!'),
        tenant: { id: 'tenant-1', name: 'Tenant' },
      };

      prismaMock.cloudAccount.findUnique.mockResolvedValueOnce(awsAccount as any);
      mockCostExplorerService.validateCredentials.mockResolvedValue(true);
      mockCostExplorerService.getCosts.mockResolvedValue([]);
      prismaMock.costData.createMany.mockResolvedValue({ count: 0 } as any);
      prismaMock.cloudAccount.update.mockResolvedValue({} as any);

      await service.collectCostsForAccount('aws-123', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      expect(AWSCostExplorerService).toHaveBeenCalled();

      // Reset mocks
      jest.clearAllMocks();

      // Second: Azure account
      const azureAccount = {
        id: 'azure-123',
        tenantId: 'tenant-1',
        provider: 'azure',
        accountName: 'Azure Account',
        ...encryptTestCredentials({
            clientId: 'client',
            clientSecret: 'secret',
            tenantId: 'tenant',
            subscriptionId: 'subscription',
          }, 'test-encryption-key-32-bytes!!'),
        tenant: { id: 'tenant-1', name: 'Tenant' },
      };

      prismaMock.cloudAccount.findUnique.mockResolvedValueOnce(azureAccount as any);
      mockAzureCostService.validateCredentials.mockResolvedValue(true);
      mockAzureCostService.getCosts.mockResolvedValue([]);
      prismaMock.costData.createMany.mockResolvedValue({ count: 0 } as any);
      prismaMock.cloudAccount.update.mockResolvedValue({} as any);

      await service.collectCostsForAccount('azure-123', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      expect(AzureCostManagementService).toHaveBeenCalled();
    });
  });
});
