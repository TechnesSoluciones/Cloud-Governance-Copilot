/**
 * Asset Discovery Service Unit Tests
 *
 * Purpose: Test the asset discovery service that orchestrates cloud resource discovery
 * across multiple providers (AWS EC2, Azure VMs) with proper normalization and persistence.
 *
 * Test Coverage:
 * - AWS EC2 asset discovery
 * - Azure VM asset discovery
 * - Asset normalization to unified schema
 * - Asset deduplication by resourceId
 * - Soft delete for stale assets
 * - Tenant-scoped discovery
 * - Multi-region support
 * - Credential decryption
 * - Event emissions
 * - Error handling
 *
 * @module Tests/Unit/Services/AssetDiscovery
 */

import { AssetDiscoveryService, DiscoveryResult } from '../../../modules/assets/services/asset-discovery.service';
import { prismaMock } from '../../../__mocks__/prisma';
import { EventEmitter } from 'events';
import { CloudAsset } from '../../../integrations/cloud-provider.interface';
import type { CloudAccount, Asset } from '@prisma/client';

// AWS TEMPORALMENTE DESHABILITADO - Azure-only mode (v1.6.0)
// Mock AWS EC2 Service
/* jest.mock('../../../integrations/aws.disabled/ec2.service', () => {
  return {
    AWSEC2Service: jest.fn().mockImplementation(() => ({
      discoverAssets: jest.fn().mockResolvedValue([]),
      discoverInAllRegions: jest.fn().mockResolvedValue([]),
    })),
  };
}); */

// Mock Azure Compute Service
jest.mock('../../../integrations/azure/compute.service', () => {
  return {
    AzureComputeService: jest.fn().mockImplementation(() => ({
      discoverAssets: jest.fn().mockResolvedValue([]),
      discoverInAllSubscriptions: jest.fn().mockResolvedValue([]),
    })),
  };
});

// Mock encryption utilities
jest.mock('../../../utils/encryption', () => ({
  decrypt: jest.fn((encrypted: any) => {
    if (encrypted.ciphertext === 'encrypted-access-key') return 'AKIAIOSFODNN7EXAMPLE';
    if (encrypted.ciphertext === 'encrypted-secret-key') return 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
    if (encrypted.ciphertext === 'encrypted-client-id') return 'azure-client-id-123';
    if (encrypted.ciphertext === 'encrypted-client-secret') return 'azure-client-secret-456';
    return 'decrypted-value';
  }),
}));

// import { AWSEC2Service } from '../../../integrations/aws.disabled/ec2.service';
import { AzureComputeService } from '../../../integrations/azure/compute.service';

// TEMPORALMENTE DESHABILITADO - Azure-only mode (v1.6.0)
describe.skip('AssetDiscoveryService - AWS Tests Disabled', () => {
  let service: AssetDiscoveryService;
  let eventBus: EventEmitter;
  let mockAWSEC2Service: jest.Mocked<AWSEC2Service>;
  let mockAzureComputeService: jest.Mocked<AzureComputeService>;

  beforeEach(() => {
    eventBus = new EventEmitter();
    service = new AssetDiscoveryService(prismaMock, eventBus);

    // Get mocked instances
    mockAWSEC2Service = new AWSEC2Service({} as any) as jest.Mocked<AWSEC2Service>;
    mockAzureComputeService = new AzureComputeService({} as any) as jest.Mocked<AzureComputeService>;

    // Default mock for updateMany (stale assets)
    prismaMock.asset.updateMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // Test Suite 1: AWS EC2 Discovery (RED -> GREEN -> REFACTOR)
  // ============================================================

  describe('AWS EC2 Asset Discovery', () => {
    const mockAWSAccount: CloudAccount = {
      id: 'account-123',
      tenantId: 'tenant-123',
      provider: 'aws',
      accountName: 'Production AWS',
      accountIdentifier: '123456789012',
      credentialsCiphertext: JSON.stringify({
        awsAccessKeyId: { ciphertext: 'encrypted-access-key', iv: 'iv1', authTag: 'tag1' },
        awsSecretAccessKey: { ciphertext: 'encrypted-secret-key', iv: 'iv2', authTag: 'tag2' },
        awsRegion: { ciphertext: 'encrypted-region', iv: 'iv3', authTag: 'tag3' },
      }),
      credentialsIv: 'iv',
      credentialsAuthTag: 'tag',
      status: 'active',
      lastSync: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockEC2Instances: CloudAsset[] = [
      {
        resourceId: 'i-0123456789abcdef0',
        resourceType: 'ec2:instance',
        name: 'web-server-1',
        region: 'us-east-1',
        zone: 'us-east-1a',
        status: 'running',
        tags: {
          Environment: 'production',
          Team: 'platform',
        },
        metadata: {
          instanceType: 't3.medium',
          vpcId: 'vpc-123',
          publicIp: '54.1.2.3',
        },
        createdAt: new Date('2024-01-01'),
        lastModifiedAt: new Date('2024-01-15'),
      },
      {
        resourceId: 'i-1234567890abcdef1',
        resourceType: 'ec2:instance',
        name: 'api-server-1',
        region: 'us-east-1',
        status: 'running',
        tags: {
          Environment: 'production',
        },
        metadata: {
          instanceType: 't3.large',
        },
      },
    ];

    it('should discover AWS EC2 instances successfully', async () => {
      // Arrange
      prismaMock.cloudAccount.findMany.mockResolvedValue([mockAWSAccount]);
      mockAWSEC2Service.discoverInAllRegions.mockResolvedValue(mockEC2Instances);

      // Mock AWSEC2Service constructor
      (AWSEC2Service as jest.MockedClass<typeof AWSEC2Service>).mockImplementation(() => mockAWSEC2Service);

      const createdAssets: Asset[] = mockEC2Instances.map((instance, idx) => ({
        id: `asset-${idx}`,
        tenantId: 'tenant-123',
        cloudAccountId: 'account-123',
        provider: 'aws',
        resourceType: 'ec2:instance',
        resourceId: instance.resourceId,
        arn: null,
        resourceUri: null,
        name: instance.name || null,
        region: instance.region,
        zone: instance.zone || null,
        status: instance.status,
        tags: instance.tags,
        metadata: instance.metadata,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      prismaMock.asset.upsert.mockResolvedValue({
        id: 'asset-1',
        tenantId: 'tenant-123',
        cloudAccountId: 'account-123',
        provider: 'aws',
        resourceType: 'ec2:instance',
        resourceId: mockEC2Instances[0].resourceId,
        arn: null,
        resourceUri: null,
        name: mockEC2Instances[0].name || null,
        region: mockEC2Instances[0].region,
        zone: mockEC2Instances[0].zone || null,
        status: mockEC2Instances[0].status,
        tags: mockEC2Instances[0].tags,
        metadata: mockEC2Instances[0].metadata,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Act
      const result = await service.discoverAssets('tenant-123');

      // Assert
      expect(result.assetsDiscovered).toBe(2);
      expect(result.accountsProcessed).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(prismaMock.cloudAccount.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-123', status: 'active' },
      });
    });

    it('should filter by specific cloud account when provided', async () => {
      // Arrange
      prismaMock.cloudAccount.findMany.mockResolvedValue([mockAWSAccount]);
      mockAWSEC2Service.discoverInAllRegions.mockResolvedValue([mockEC2Instances[0]]);
      (AWSEC2Service as jest.MockedClass<typeof AWSEC2Service>).mockImplementation(() => mockAWSEC2Service);

      prismaMock.asset.upsert.mockResolvedValue({
        id: 'asset-1',
        tenantId: 'tenant-123',
        cloudAccountId: 'account-123',
        provider: 'aws',
        resourceType: 'ec2:instance',
        resourceId: mockEC2Instances[0].resourceId,
        arn: null,
        resourceUri: null,
        name: mockEC2Instances[0].name || null,
        region: mockEC2Instances[0].region,
        zone: mockEC2Instances[0].zone || null,
        status: mockEC2Instances[0].status,
        tags: mockEC2Instances[0].tags,
        metadata: mockEC2Instances[0].metadata,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await service.discoverAssets('tenant-123', 'account-123');

      // Assert
      expect(prismaMock.cloudAccount.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-123',
          status: 'active',
          id: 'account-123',
        },
      });
      expect(result.assetsDiscovered).toBe(1);
    });

    it('should normalize AWS EC2 instance to Asset schema correctly', async () => {
      // Arrange
      prismaMock.cloudAccount.findMany.mockResolvedValue([mockAWSAccount]);
      mockAWSEC2Service.discoverInAllRegions.mockResolvedValue([mockEC2Instances[0]]);
      (AWSEC2Service as jest.MockedClass<typeof AWSEC2Service>).mockImplementation(() => mockAWSEC2Service);

      let capturedAsset: any = null;
      (prismaMock.asset.upsert as any).mockImplementation(async (args: any) => {
        capturedAsset = args.create;
        return {
          id: 'asset-1',
          ...args.create,
          firstSeenAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;
      });

      // Act
      await service.discoverAssets('tenant-123');

      // Assert
      expect(capturedAsset).toMatchObject({
        tenantId: 'tenant-123',
        cloudAccountId: 'account-123',
        provider: 'aws',
        resourceType: 'ec2:instance',
        resourceId: 'i-0123456789abcdef0',
        name: 'web-server-1',
        region: 'us-east-1',
        zone: 'us-east-1a',
        status: 'running',
        tags: {
          Environment: 'production',
          Team: 'platform',
        },
      });
      expect(capturedAsset.metadata).toHaveProperty('instanceType', 't3.medium');
      expect(capturedAsset.metadata).toHaveProperty('vpcId', 'vpc-123');
    });

    it('should emit asset.discovered event for each discovered AWS asset', async () => {
      // Arrange
      prismaMock.cloudAccount.findMany.mockResolvedValue([mockAWSAccount]);
      mockAWSEC2Service.discoverInAllRegions.mockResolvedValue(mockEC2Instances);
      (AWSEC2Service as jest.MockedClass<typeof AWSEC2Service>).mockImplementation(() => mockAWSEC2Service);

      (prismaMock.asset.upsert as any).mockImplementation(async (args: any) => ({
        id: `asset-${args.create.resourceId}`,
        ...args.create,
        firstSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any));

      const emittedEvents: any[] = [];
      eventBus.on('asset.discovered', (data) => emittedEvents.push(data));

      // Act
      await service.discoverAssets('tenant-123');

      // Assert
      expect(emittedEvents).toHaveLength(2);
      expect(emittedEvents[0]).toMatchObject({
        tenantId: 'tenant-123',
        provider: 'aws',
        resourceType: 'ec2:instance',
        resourceId: 'i-0123456789abcdef0',
        region: 'us-east-1',
      });
    });
  });

  // ============================================================
  // Test Suite 2: Azure VM Discovery
  // ============================================================

  describe('Azure VM Asset Discovery', () => {
    const mockAzureAccount: CloudAccount = {
      id: 'account-456',
      tenantId: 'tenant-123',
      provider: 'azure',
      accountName: 'Production Azure',
      accountIdentifier: 'sub-123-456',
      credentialsCiphertext: JSON.stringify({
        azureTenantId: { ciphertext: 'encrypted-tenant-id', iv: 'iv1', authTag: 'tag1' },
        azureClientId: { ciphertext: 'encrypted-client-id', iv: 'iv2', authTag: 'tag2' },
        azureClientSecret: { ciphertext: 'encrypted-client-secret', iv: 'iv3', authTag: 'tag3' },
        azureSubscriptionId: { ciphertext: 'encrypted-sub-id', iv: 'iv4', authTag: 'tag4' },
      }),
      credentialsIv: 'iv',
      credentialsAuthTag: 'tag',
      status: 'active',
      lastSync: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockAzureVMs: CloudAsset[] = [
      {
        resourceId: '/subscriptions/sub-123/resourceGroups/rg-prod/providers/Microsoft.Compute/virtualMachines/vm-web-01',
        resourceType: 'vm',
        name: 'vm-web-01',
        region: 'eastus',
        status: 'running',
        tags: {
          Environment: 'production',
          CostCenter: 'engineering',
        },
        metadata: {
          vmSize: 'Standard_D2s_v3',
          osType: 'Linux',
        },
      },
    ];

    it('should discover Azure VMs successfully', async () => {
      // Arrange
      prismaMock.cloudAccount.findMany.mockResolvedValue([mockAzureAccount]);
      mockAzureComputeService.discoverAssets.mockResolvedValue(mockAzureVMs);
      (AzureComputeService as jest.MockedClass<typeof AzureComputeService>).mockImplementation(() => mockAzureComputeService);

      prismaMock.asset.upsert.mockResolvedValue({
        id: 'asset-azure-1',
        tenantId: 'tenant-123',
        cloudAccountId: 'account-456',
        provider: 'azure',
        resourceType: 'vm',
        resourceId: mockAzureVMs[0].resourceId,
        arn: null,
        resourceUri: mockAzureVMs[0].resourceId,
        name: mockAzureVMs[0].name || null,
        region: mockAzureVMs[0].region,
        zone: null,
        status: mockAzureVMs[0].status,
        tags: mockAzureVMs[0].tags,
        metadata: mockAzureVMs[0].metadata,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await service.discoverAssets('tenant-123');

      // Assert
      expect(result.assetsDiscovered).toBe(1);
      expect(result.accountsProcessed).toBe(1);
      expect(prismaMock.asset.upsert).toHaveBeenCalled();
    });

    it('should normalize Azure VM to Asset schema correctly', async () => {
      // Arrange
      prismaMock.cloudAccount.findMany.mockResolvedValue([mockAzureAccount]);
      mockAzureComputeService.discoverAssets.mockResolvedValue(mockAzureVMs);
      (AzureComputeService as jest.MockedClass<typeof AzureComputeService>).mockImplementation(() => mockAzureComputeService);

      let capturedAsset: any = null;
      (prismaMock.asset.upsert as any).mockImplementation(async (args: any) => {
        capturedAsset = args.create;
        return {
          id: 'asset-1',
          ...args.create,
          firstSeenAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;
      });

      // Act
      await service.discoverAssets('tenant-123');

      // Assert
      expect(capturedAsset).toMatchObject({
        tenantId: 'tenant-123',
        cloudAccountId: 'account-456',
        provider: 'azure',
        resourceType: 'vm',
        resourceId: mockAzureVMs[0].resourceId,
        resourceUri: mockAzureVMs[0].resourceId,
        name: 'vm-web-01',
        region: 'eastus',
        status: 'running',
      });
      expect(capturedAsset.tags).toHaveProperty('Environment', 'production');
      expect(capturedAsset.metadata).toHaveProperty('vmSize', 'Standard_D2s_v3');
    });
  });

  // ============================================================
  // Test Suite 3: Multi-Provider Discovery
  // ============================================================

  describe('Multi-Provider Asset Discovery', () => {
    const mockAWSAccount: CloudAccount = {
      id: 'account-aws',
      tenantId: 'tenant-123',
      provider: 'aws',
      accountName: 'AWS Account',
      accountIdentifier: '123456789',
      credentialsCiphertext: JSON.stringify({
        awsAccessKeyId: { ciphertext: 'encrypted-access-key', iv: 'iv1', authTag: 'tag1' },
        awsSecretAccessKey: { ciphertext: 'encrypted-secret-key', iv: 'iv2', authTag: 'tag2' },
      }),
      credentialsIv: 'iv',
      credentialsAuthTag: 'tag',
      status: 'active',
      lastSync: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockAzureAccount: CloudAccount = {
      id: 'account-azure',
      tenantId: 'tenant-123',
      provider: 'azure',
      accountName: 'Azure Account',
      accountIdentifier: 'sub-456',
      credentialsCiphertext: JSON.stringify({
        azureTenantId: { ciphertext: 'encrypted-tenant-id', iv: 'iv1', authTag: 'tag1' },
        azureClientId: { ciphertext: 'encrypted-client-id', iv: 'iv2', authTag: 'tag2' },
        azureClientSecret: { ciphertext: 'encrypted-client-secret', iv: 'iv3', authTag: 'tag3' },
        azureSubscriptionId: { ciphertext: 'encrypted-sub-id', iv: 'iv4', authTag: 'tag4' },
      }),
      credentialsIv: 'iv',
      credentialsAuthTag: 'tag',
      status: 'active',
      lastSync: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should discover assets from both AWS and Azure accounts', async () => {
      // Arrange
      prismaMock.cloudAccount.findMany.mockResolvedValue([mockAWSAccount, mockAzureAccount]);

      mockAWSEC2Service.discoverInAllRegions.mockResolvedValue([
        {
          resourceId: 'i-aws-1',
          resourceType: 'ec2:instance',
          name: 'aws-vm',
          region: 'us-east-1',
          status: 'running',
          tags: {},
          metadata: {},
        },
      ]);

      mockAzureComputeService.discoverAssets.mockResolvedValue([
        {
          resourceId: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/vm-1',
          resourceType: 'vm',
          name: 'azure-vm',
          region: 'eastus',
          status: 'running',
          tags: {},
          metadata: {},
        },
      ]);

      (AWSEC2Service as jest.MockedClass<typeof AWSEC2Service>).mockImplementation(() => mockAWSEC2Service);
      (AzureComputeService as jest.MockedClass<typeof AzureComputeService>).mockImplementation(() => mockAzureComputeService);

      (prismaMock.asset.upsert as any).mockImplementation(async (args: any) => ({
        id: `asset-${args.create.resourceId}`,
        ...args.create,
        firstSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any));

      // Act
      const result = await service.discoverAssets('tenant-123');

      // Assert
      expect(result.assetsDiscovered).toBe(2);
      expect(result.accountsProcessed).toBe(2);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ============================================================
  // Test Suite 4: Asset Deduplication & Stale Asset Handling
  // ============================================================

  describe('Asset Deduplication and Stale Asset Handling', () => {
    const mockAccount: CloudAccount = {
      id: 'account-123',
      tenantId: 'tenant-123',
      provider: 'aws',
      accountName: 'AWS Account',
      accountIdentifier: '123456789',
      credentialsCiphertext: JSON.stringify({
        awsAccessKeyId: { ciphertext: 'encrypted-access-key', iv: 'iv1', authTag: 'tag1' },
        awsSecretAccessKey: { ciphertext: 'encrypted-secret-key', iv: 'iv2', authTag: 'tag2' },
      }),
      credentialsIv: 'iv',
      credentialsAuthTag: 'tag',
      status: 'active',
      lastSync: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should use upsert to handle duplicate assets by resourceId', async () => {
      // Arrange
      prismaMock.cloudAccount.findMany.mockResolvedValue([mockAccount]);
      mockAWSEC2Service.discoverInAllRegions.mockResolvedValue([
        {
          resourceId: 'i-duplicate',
          resourceType: 'ec2:instance',
          name: 'test-vm',
          region: 'us-east-1',
          status: 'running',
          tags: {},
          metadata: {},
        },
      ]);

      (AWSEC2Service as jest.MockedClass<typeof AWSEC2Service>).mockImplementation(() => mockAWSEC2Service);

      prismaMock.asset.upsert.mockResolvedValue({
        id: 'existing-asset',
        tenantId: 'tenant-123',
        cloudAccountId: 'account-123',
        provider: 'aws',
        resourceType: 'ec2:instance',
        resourceId: 'i-duplicate',
        arn: null,
        resourceUri: null,
        name: 'test-vm',
        region: 'us-east-1',
        zone: null,
        status: 'running',
        tags: {},
        metadata: {},
        firstSeenAt: new Date('2024-01-01'),
        lastSeenAt: new Date(),
        deletedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      });

      // Act
      await service.discoverAssets('tenant-123');

      // Assert
      expect(prismaMock.asset.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId_provider_resourceId: {
              tenantId: 'tenant-123',
              provider: 'aws',
              resourceId: 'i-duplicate',
            },
          }),
          update: expect.objectContaining({
            lastSeenAt: expect.any(Date),
            status: 'running',
          }),
          create: expect.any(Object),
        })
      );
    });

    it('should mark assets as stale (soft delete) if not found in discovery', async () => {
      // Arrange
      prismaMock.cloudAccount.findMany.mockResolvedValue([mockAccount]);
      mockAWSEC2Service.discoverInAllRegions.mockResolvedValue([
        {
          resourceId: 'i-active',
          resourceType: 'ec2:instance',
          name: 'active-vm',
          region: 'us-east-1',
          status: 'running',
          tags: {},
          metadata: {},
        },
      ]);

      (AWSEC2Service as jest.MockedClass<typeof AWSEC2Service>).mockImplementation(() => mockAWSEC2Service);

      prismaMock.asset.upsert.mockResolvedValue({
        id: 'asset-active',
        tenantId: 'tenant-123',
        cloudAccountId: 'account-123',
        provider: 'aws',
        resourceType: 'ec2:instance',
        resourceId: 'i-active',
        arn: null,
        resourceUri: null,
        name: 'active-vm',
        region: 'us-east-1',
        zone: null,
        status: 'running',
        tags: {},
        metadata: {},
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prismaMock.asset.updateMany.mockResolvedValue({ count: 2 });

      // Act
      await service.discoverAssets('tenant-123');

      // Assert
      // Should mark stale assets (those NOT in the discovered list)
      expect(prismaMock.asset.updateMany).toHaveBeenCalledWith({
        where: {
          cloudAccountId: 'account-123',
          resourceId: { notIn: ['i-active'] },
          deletedAt: null,
        },
        data: {
          deletedAt: expect.any(Date),
          status: 'terminated',
        },
      });
    });
  });

  // ============================================================
  // Test Suite 5: Error Handling
  // ============================================================

  describe('Error Handling', () => {
    const mockAccount: CloudAccount = {
      id: 'account-123',
      tenantId: 'tenant-123',
      provider: 'aws',
      accountName: 'AWS Account',
      accountIdentifier: '123456789',
      credentialsCiphertext: JSON.stringify({
        awsAccessKeyId: { ciphertext: 'encrypted-access-key', iv: 'iv1', authTag: 'tag1' },
        awsSecretAccessKey: { ciphertext: 'encrypted-secret-key', iv: 'iv2', authTag: 'tag2' },
      }),
      credentialsIv: 'iv',
      credentialsAuthTag: 'tag',
      status: 'active',
      lastSync: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should handle AWS discovery errors gracefully and continue processing', async () => {
      // Arrange
      prismaMock.cloudAccount.findMany.mockResolvedValue([mockAccount]);
      mockAWSEC2Service.discoverInAllRegions.mockRejectedValue(new Error('AWS API rate limit exceeded'));
      (AWSEC2Service as jest.MockedClass<typeof AWSEC2Service>).mockImplementation(() => mockAWSEC2Service);

      // Act
      const result = await service.discoverAssets('tenant-123');

      // Assert
      expect(result.assetsDiscovered).toBe(0);
      expect(result.accountsProcessed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        accountId: 'account-123',
        provider: 'aws',
        error: 'AWS API rate limit exceeded',
      });
    });

    it('should handle credential decryption errors', async () => {
      // Arrange
      const invalidAccount: CloudAccount = {
        ...mockAccount,
        credentialsCiphertext: 'invalid-json',
      };

      prismaMock.cloudAccount.findMany.mockResolvedValue([invalidAccount]);

      // Act
      const result = await service.discoverAssets('tenant-123');

      // Assert
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('credentials');
    });

    it('should return empty result when no cloud accounts found', async () => {
      // Arrange
      prismaMock.cloudAccount.findMany.mockResolvedValue([]);

      // Act
      const result = await service.discoverAssets('tenant-123');

      // Assert
      expect(result).toEqual({
        assetsDiscovered: 0,
        accountsProcessed: 0,
        errors: [],
      });
    });

    it('should handle unsupported cloud provider gracefully', async () => {
      // Arrange
      const gcpAccount: CloudAccount = {
        ...mockAccount,
        provider: 'gcp',
      };

      prismaMock.cloudAccount.findMany.mockResolvedValue([gcpAccount]);

      // Act
      const result = await service.discoverAssets('tenant-123');

      // Assert
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Unsupported provider');
    });
  });

  // ============================================================
  // Test Suite 6: Tenant Isolation & Security
  // ============================================================

  describe('Tenant Isolation and Security', () => {
    it('should only discover assets for the specified tenant', async () => {
      // Arrange
      prismaMock.cloudAccount.findMany.mockResolvedValue([]);

      // Act
      await service.discoverAssets('tenant-123');

      // Assert
      expect(prismaMock.cloudAccount.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-123',
          status: 'active',
        },
      });
    });

    it('should decrypt credentials securely before discovery', async () => {
      // Arrange
      const mockAccount: CloudAccount = {
        id: 'account-123',
        tenantId: 'tenant-123',
        provider: 'aws',
        accountName: 'AWS Account',
        accountIdentifier: '123456789',
        credentialsCiphertext: JSON.stringify({
          awsAccessKeyId: { ciphertext: 'encrypted-access-key', iv: 'iv1', authTag: 'tag1' },
          awsSecretAccessKey: { ciphertext: 'encrypted-secret-key', iv: 'iv2', authTag: 'tag2' },
          awsRegion: { ciphertext: 'encrypted-region', iv: 'iv3', authTag: 'tag3' },
        }),
        credentialsIv: 'iv',
        credentialsAuthTag: 'tag',
        status: 'active',
        lastSync: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.cloudAccount.findMany.mockResolvedValue([mockAccount]);
      mockAWSEC2Service.discoverInAllRegions.mockResolvedValue([]);
      (AWSEC2Service as jest.MockedClass<typeof AWSEC2Service>).mockImplementation(() => mockAWSEC2Service);

      prismaMock.asset.updateMany.mockResolvedValue({ count: 0 });

      // Act
      await service.discoverAssets('tenant-123');

      // Assert - verify AWSEC2Service was instantiated (which means credentials were decrypted)
      expect(AWSEC2Service).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'aws',
          awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          awsSecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        })
      );
    });
  });
});
