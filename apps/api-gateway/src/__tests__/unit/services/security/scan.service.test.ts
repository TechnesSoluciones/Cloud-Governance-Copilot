/**
 * Unit Tests for Security Scan Service
 *
 * Comprehensive test suite covering all functionality of the SecurityScanService orchestrator.
 * Tests include success cases, error scenarios, edge cases, and event emissions.
 *
 * Test Coverage:
 * - Constructor initialization
 * - Single account scanning (AWS, Azure)
 * - Multiple account scanning
 * - Credential decryption
 * - Finding deduplication
 * - Finding persistence
 * - Event emissions
 * - Error handling
 * - Edge cases
 *
 * @module __tests__/unit/services/security/scan.service.test
 */

import { SecurityScanService } from '../../../../modules/security/services/scan.service';
import { PrismaClient } from '@prisma/client';
import { AWSSecurityScannerService } from '../../../../integrations/aws/security-scanner.service';
import { AzureSecurityScannerService } from '../../../../integrations/azure/security-scanner.service';
import * as encryption from '../../../../utils/encryption';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../../../integrations/aws/security-scanner.service');
jest.mock('../../../../integrations/azure/security-scanner.service');
jest.mock('../../../../utils/encryption');
jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SecurityScanService', () => {
  let scanService: SecurityScanService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockAWSScanner: jest.Mocked<AWSSecurityScannerService>;
  let mockAzureScanner: jest.Mocked<AzureSecurityScannerService>;

  // Sample data
  const mockTenantId = 'tenant-123';
  const mockAccountId = 'account-456';
  const mockScanId = 'scan-789';

  const mockAWSAccount = {
    id: 'aws-account-1',
    tenantId: mockTenantId,
    provider: 'AWS',
    accountName: 'AWS Production',
    accountIdentifier: '123456789012',
    credentialsCiphertext: 'encrypted-ciphertext',
    credentialsIv: 'encrypted-iv',
    credentialsAuthTag: 'encrypted-authtag',
    status: 'active',
    lastSync: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAzureAccount = {
    id: 'azure-account-1',
    tenantId: mockTenantId,
    provider: 'AZURE',
    accountName: 'Azure Production',
    accountIdentifier: 'sub-123',
    credentialsCiphertext: 'encrypted-ciphertext',
    credentialsIv: 'encrypted-iv',
    credentialsAuthTag: 'encrypted-authtag',
    status: 'active',
    lastSync: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAWSCredentials = {
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    region: 'us-east-1',
  };

  const mockAzureCredentials = {
    tenantId: 'azure-tenant-id',
    clientId: 'azure-client-id',
    clientSecret: 'azure-client-secret',
    subscriptionId: 'azure-subscription-id',
  };

  const mockSecurityFinding = {
    findingId: 'finding-1',
    title: 'S3 Bucket Public Access',
    description: 'S3 bucket allows public access',
    severity: 'high' as const,
    category: 'DATA_PROTECTION',
    resourceId: 'arn:aws:s3:::my-bucket',
    resourceType: 's3:bucket',
    region: 'us-east-1',
    remediation: 'Disable public access',
    compliance: ['CIS-1.1'],
    metadata: { bucketName: 'my-bucket' },
    firstObservedAt: new Date(),
    lastObservedAt: new Date(),
  };

  const mockCriticalFinding = {
    ...mockSecurityFinding,
    findingId: 'finding-2',
    title: 'IAM Root Account Usage',
    severity: 'critical' as const,
    category: 'IAM',
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup Prisma mock
    mockPrisma = {
      cloudAccount: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      securityScan: {
        create: jest.fn(),
        update: jest.fn(),
      },
      securityFinding: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $disconnect: jest.fn(),
    } as any;

    // Mock PrismaClient constructor
    (PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma);

    // Setup AWS scanner mock
    mockAWSScanner = {
      scanAll: jest.fn(),
    } as any;
    (AWSSecurityScannerService as jest.MockedClass<typeof AWSSecurityScannerService>).mockImplementation(
      () => mockAWSScanner
    );

    // Setup Azure scanner mock
    mockAzureScanner = {
      scanAll: jest.fn(),
    } as any;
    (AzureSecurityScannerService as jest.MockedClass<typeof AzureSecurityScannerService>).mockImplementation(
      () => mockAzureScanner
    );

    // Setup encryption mock
    (encryption.decrypt as jest.Mock).mockReturnValue(JSON.stringify(mockAWSCredentials));

    // Create service instance
    scanService = new SecurityScanService();
  });

  afterEach(async () => {
    await scanService.disconnect();
  });

  // ============================================================
  // Constructor Tests
  // ============================================================

  describe('Constructor', () => {
    it('should initialize with PrismaClient', () => {
      const service = new SecurityScanService();
      expect(PrismaClient).toHaveBeenCalled();
      expect(service).toBeInstanceOf(SecurityScanService);
    });

    it('should extend EventEmitter', () => {
      expect(scanService.on).toBeDefined();
      expect(scanService.emit).toBeDefined();
    });
  });

  // ============================================================
  // runScan - Single Account Tests
  // ============================================================

  describe('runScan - Single Account', () => {
    beforeEach(() => {
      mockPrisma.cloudAccount.findFirst.mockResolvedValue(mockAWSAccount);
      mockPrisma.securityScan.create.mockResolvedValue({
        id: mockScanId,
        tenantId: mockTenantId,
        cloudAccountId: mockAWSAccount.id,
        provider: 'AWS',
        scanType: 'full',
        framework: ['CIS'],
        status: 'running',
        startedAt: new Date(),
        completedAt: null,
        findingsCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        error: null,
      } as any);
      mockPrisma.securityScan.update.mockResolvedValue({} as any);
      mockPrisma.securityFinding.findFirst.mockResolvedValue(null); // No duplicates
      mockPrisma.securityFinding.create.mockResolvedValue({} as any);
    });

    it('should scan single AWS account successfully', async () => {
      mockAWSScanner.scanAll.mockResolvedValue([mockSecurityFinding]);

      const result = await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(result.accountsScanned).toBe(1);
      expect(result.totalFindings).toBe(1);
      expect(result.highCount).toBe(1);
      expect(mockPrisma.cloudAccount.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockAWSAccount.id,
          tenantId: mockTenantId,
          status: 'active',
        },
      });
    });

    it('should scan single Azure account successfully', async () => {
      mockPrisma.cloudAccount.findFirst.mockResolvedValue(mockAzureAccount);
      (encryption.decrypt as jest.Mock).mockReturnValue(JSON.stringify(mockAzureCredentials));
      mockAzureScanner.scanAll.mockResolvedValue([
        {
          resourceId: '/subscriptions/sub-123/resourceGroups/rg-1/providers/Microsoft.Storage/storageAccounts/storage1',
          resourceType: 'STORAGE_ACCOUNT',
          category: 'DATA_PROTECTION',
          severity: 'HIGH',
          title: 'Storage Account Public Access',
          description: 'Storage account allows public blob access',
          remediation: 'Disable public access',
          cisReference: 'CIS-3.1',
          region: 'eastus',
          metadata: {},
        },
      ] as any);

      const result = await scanService.runScan(mockTenantId, mockAzureAccount.id);

      expect(result.accountsScanned).toBe(1);
      expect(result.totalFindings).toBe(1);
      expect(mockAzureScanner.scanAll).toHaveBeenCalled();
    });

    it('should throw error if account not found', async () => {
      mockPrisma.cloudAccount.findFirst.mockResolvedValue(null);

      await expect(scanService.runScan(mockTenantId, 'invalid-account')).rejects.toThrow(
        'No accounts found to scan'
      );
    });

    it('should throw error if account is not active', async () => {
      mockPrisma.cloudAccount.findFirst.mockResolvedValue(null); // Returns null for inactive

      await expect(scanService.runScan(mockTenantId, mockAccountId)).rejects.toThrow(
        'No accounts found to scan'
      );
    });
  });

  // ============================================================
  // runScan - Multiple Accounts Tests
  // ============================================================

  describe('runScan - Multiple Accounts', () => {
    beforeEach(() => {
      mockPrisma.securityScan.create.mockResolvedValue({
        id: mockScanId,
        status: 'running',
      } as any);
      mockPrisma.securityScan.update.mockResolvedValue({} as any);
      mockPrisma.securityFinding.findFirst.mockResolvedValue(null);
      mockPrisma.securityFinding.create.mockResolvedValue({} as any);
    });

    it('should scan multiple accounts successfully', async () => {
      mockPrisma.cloudAccount.findMany.mockResolvedValue([mockAWSAccount, mockAzureAccount]);
      (encryption.decrypt as jest.Mock)
        .mockReturnValueOnce(JSON.stringify(mockAWSCredentials))
        .mockReturnValueOnce(JSON.stringify(mockAzureCredentials));

      mockAWSScanner.scanAll.mockResolvedValue([mockSecurityFinding]);
      mockAzureScanner.scanAll.mockResolvedValue([
        {
          resourceId: 'azure-resource-1',
          resourceType: 'STORAGE_ACCOUNT',
          severity: 'MEDIUM',
          title: 'Azure Finding',
          description: 'Test',
          remediation: 'Fix it',
          region: 'eastus',
          category: 'DATA_PROTECTION',
          metadata: {},
        },
      ] as any);

      const result = await scanService.runScan(mockTenantId);

      expect(result.accountsScanned).toBe(2);
      expect(result.totalFindings).toBe(2);
      expect(mockPrisma.cloudAccount.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, status: 'active' },
      });
    });

    it('should continue scanning if one account fails', async () => {
      mockPrisma.cloudAccount.findMany.mockResolvedValue([mockAWSAccount, mockAzureAccount]);
      (encryption.decrypt as jest.Mock)
        .mockImplementationOnce(() => {
          throw new Error('Decryption failed');
        })
        .mockReturnValueOnce(JSON.stringify(mockAzureCredentials));

      mockAzureScanner.scanAll.mockResolvedValue([mockSecurityFinding]);

      const result = await scanService.runScan(mockTenantId);

      expect(result.accountsScanned).toBe(2);
      // First account failed, second succeeded
      expect(result.totalFindings).toBe(1);
    });

    it('should return zero findings if all accounts fail', async () => {
      mockPrisma.cloudAccount.findMany.mockResolvedValue([mockAWSAccount]);
      mockAWSScanner.scanAll.mockRejectedValue(new Error('Scanner failed'));

      const result = await scanService.runScan(mockTenantId);

      expect(result.accountsScanned).toBe(1);
      expect(result.totalFindings).toBe(0);
    });
  });

  // ============================================================
  // Credential Decryption Tests
  // ============================================================

  describe('Credential Decryption', () => {
    beforeEach(() => {
      mockPrisma.cloudAccount.findFirst.mockResolvedValue(mockAWSAccount);
      mockPrisma.securityScan.create.mockResolvedValue({ id: mockScanId } as any);
      mockPrisma.securityScan.update.mockResolvedValue({} as any);
      mockPrisma.securityFinding.findFirst.mockResolvedValue(null);
      mockPrisma.securityFinding.create.mockResolvedValue({} as any);
    });

    it('should decrypt AWS credentials successfully', async () => {
      mockAWSScanner.scanAll.mockResolvedValue([]);
      (encryption.decrypt as jest.Mock).mockReturnValue(JSON.stringify(mockAWSCredentials));

      await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(encryption.decrypt).toHaveBeenCalledWith({
        ciphertext: mockAWSAccount.credentialsCiphertext,
        iv: mockAWSAccount.credentialsIv,
        authTag: mockAWSAccount.credentialsAuthTag,
      });
      expect(AWSSecurityScannerService).toHaveBeenCalledWith(
        {
          accessKeyId: mockAWSCredentials.accessKeyId,
          secretAccessKey: mockAWSCredentials.secretAccessKey,
        },
        mockAWSCredentials.region
      );
    });

    it('should decrypt Azure credentials successfully', async () => {
      mockPrisma.cloudAccount.findFirst.mockResolvedValue(mockAzureAccount);
      mockAzureScanner.scanAll.mockResolvedValue([]);
      (encryption.decrypt as jest.Mock).mockReturnValue(JSON.stringify(mockAzureCredentials));

      await scanService.runScan(mockTenantId, mockAzureAccount.id);

      expect(encryption.decrypt).toHaveBeenCalledWith({
        ciphertext: mockAzureAccount.credentialsCiphertext,
        iv: mockAzureAccount.credentialsIv,
        authTag: mockAzureAccount.credentialsAuthTag,
      });
      expect(AzureSecurityScannerService).toHaveBeenCalledWith(
        {
          tenantId: mockAzureCredentials.tenantId,
          clientId: mockAzureCredentials.clientId,
          clientSecret: mockAzureCredentials.clientSecret,
        },
        mockAzureCredentials.subscriptionId
      );
    });

    it('should handle decryption failure for AWS', async () => {
      (encryption.decrypt as jest.Mock).mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      await expect(scanService.runScan(mockTenantId, mockAWSAccount.id)).rejects.toThrow();

      expect(mockPrisma.securityScan.update).toHaveBeenCalledWith({
        where: { id: mockScanId },
        data: expect.objectContaining({
          status: 'failed',
        }),
      });
    });

    it('should handle invalid JSON in decrypted credentials', async () => {
      (encryption.decrypt as jest.Mock).mockReturnValue('invalid-json');

      await expect(scanService.runScan(mockTenantId, mockAWSAccount.id)).rejects.toThrow();
    });
  });

  // ============================================================
  // Scanner Integration Tests
  // ============================================================

  describe('Scanner Integration', () => {
    beforeEach(() => {
      mockPrisma.cloudAccount.findFirst.mockResolvedValue(mockAWSAccount);
      mockPrisma.securityScan.create.mockResolvedValue({ id: mockScanId } as any);
      mockPrisma.securityScan.update.mockResolvedValue({} as any);
      mockPrisma.securityFinding.findFirst.mockResolvedValue(null);
      mockPrisma.securityFinding.create.mockResolvedValue({} as any);
    });

    it('should call AWS scanner with correct parameters', async () => {
      mockAWSScanner.scanAll.mockResolvedValue([]);

      await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(AWSSecurityScannerService).toHaveBeenCalledWith(
        {
          accessKeyId: mockAWSCredentials.accessKeyId,
          secretAccessKey: mockAWSCredentials.secretAccessKey,
        },
        mockAWSCredentials.region
      );
      expect(mockAWSScanner.scanAll).toHaveBeenCalled();
    });

    it('should handle AWS scanner failure', async () => {
      mockAWSScanner.scanAll.mockRejectedValue(new Error('AWS API error'));

      await expect(scanService.runScan(mockTenantId, mockAWSAccount.id)).rejects.toThrow('AWS API error');

      expect(mockPrisma.securityScan.update).toHaveBeenCalledWith({
        where: { id: mockScanId },
        data: expect.objectContaining({
          status: 'failed',
          error: 'AWS API error',
        }),
      });
    });

    it('should throw error for unsupported provider', async () => {
      const unsupportedAccount = { ...mockAWSAccount, provider: 'GCP' };
      mockPrisma.cloudAccount.findFirst.mockResolvedValue(unsupportedAccount);

      await expect(scanService.runScan(mockTenantId, unsupportedAccount.id)).rejects.toThrow(
        'Unsupported provider: GCP'
      );
    });
  });

  // ============================================================
  // Finding Deduplication Tests
  // ============================================================

  describe('Finding Deduplication', () => {
    beforeEach(() => {
      mockPrisma.cloudAccount.findFirst.mockResolvedValue(mockAWSAccount);
      mockPrisma.securityScan.create.mockResolvedValue({ id: mockScanId } as any);
      mockPrisma.securityScan.update.mockResolvedValue({} as any);
    });

    it('should save new findings', async () => {
      mockAWSScanner.scanAll.mockResolvedValue([mockSecurityFinding]);
      mockPrisma.securityFinding.findFirst.mockResolvedValue(null); // No existing
      mockPrisma.securityFinding.create.mockResolvedValue({ id: 'new-finding-id' } as any);

      await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(mockPrisma.securityFinding.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.securityFinding.findFirst).toHaveBeenCalled();
    });

    it('should update existing findings within 7 days', async () => {
      mockAWSScanner.scanAll.mockResolvedValue([mockSecurityFinding]);
      const existingFinding = {
        id: 'existing-finding-id',
        title: mockSecurityFinding.title,
        detectedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      };
      mockPrisma.securityFinding.findFirst.mockResolvedValue(existingFinding as any);
      mockPrisma.securityFinding.update.mockResolvedValue({} as any);

      await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(mockPrisma.securityFinding.update).toHaveBeenCalledWith({
        where: { id: existingFinding.id },
        data: { detectedAt: expect.any(Date) },
      });
      expect(mockPrisma.securityFinding.create).not.toHaveBeenCalled();
    });

    it('should not deduplicate findings older than 7 days', async () => {
      mockAWSScanner.scanAll.mockResolvedValue([mockSecurityFinding]);
      mockPrisma.securityFinding.findFirst.mockResolvedValue(null); // Older than 7 days filtered out
      mockPrisma.securityFinding.create.mockResolvedValue({ id: 'new-finding-id' } as any);

      await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(mockPrisma.securityFinding.create).toHaveBeenCalledTimes(1);
    });

    it('should handle deduplication errors gracefully', async () => {
      mockAWSScanner.scanAll.mockResolvedValue([mockSecurityFinding]);
      mockPrisma.securityFinding.findFirst.mockRejectedValue(new Error('DB error'));
      mockPrisma.securityFinding.create.mockResolvedValue({ id: 'new-finding-id' } as any);

      // Should not throw, should treat as new finding
      await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(mockPrisma.securityFinding.create).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Finding Persistence Tests
  // ============================================================

  describe('Finding Persistence', () => {
    beforeEach(() => {
      mockPrisma.cloudAccount.findFirst.mockResolvedValue(mockAWSAccount);
      mockPrisma.securityScan.create.mockResolvedValue({ id: mockScanId } as any);
      mockPrisma.securityScan.update.mockResolvedValue({} as any);
      mockPrisma.securityFinding.findFirst.mockResolvedValue(null);
    });

    it('should persist findings to database', async () => {
      mockAWSScanner.scanAll.mockResolvedValue([mockSecurityFinding]);
      mockPrisma.securityFinding.create.mockResolvedValue({ id: 'saved-finding' } as any);

      await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(mockPrisma.securityFinding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          scanId: mockScanId,
          title: mockSecurityFinding.title,
          description: mockSecurityFinding.description,
          severity: mockSecurityFinding.severity,
          status: 'open',
        }),
      });
    });

    it('should continue if one finding fails to save', async () => {
      const findings = [mockSecurityFinding, mockCriticalFinding];
      mockAWSScanner.scanAll.mockResolvedValue(findings);
      mockPrisma.securityFinding.create
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ id: 'saved-finding' } as any);

      await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(mockPrisma.securityFinding.create).toHaveBeenCalledTimes(2);
    });

    it('should handle empty findings array', async () => {
      mockAWSScanner.scanAll.mockResolvedValue([]);

      const result = await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(result.totalFindings).toBe(0);
      expect(mockPrisma.securityFinding.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Event Emission Tests
  // ============================================================

  describe('Event Emissions', () => {
    beforeEach(() => {
      mockPrisma.cloudAccount.findFirst.mockResolvedValue(mockAWSAccount);
      mockPrisma.securityScan.create.mockResolvedValue({ id: mockScanId } as any);
      mockPrisma.securityScan.update.mockResolvedValue({} as any);
      mockPrisma.securityFinding.findFirst.mockResolvedValue(null);
      mockPrisma.securityFinding.create.mockResolvedValue({ id: 'saved-finding' } as any);
    });

    it('should emit event for CRITICAL findings', async () => {
      mockAWSScanner.scanAll.mockResolvedValue([mockCriticalFinding]);

      const eventSpy = jest.fn();
      scanService.on('security.finding.created', eventSpy);

      await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          severity: 'critical',
          title: mockCriticalFinding.title,
        })
      );
    });

    it('should emit event for HIGH findings', async () => {
      mockAWSScanner.scanAll.mockResolvedValue([mockSecurityFinding]);

      const eventSpy = jest.fn();
      scanService.on('security.finding.created', eventSpy);

      await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          severity: 'high',
          title: mockSecurityFinding.title,
        })
      );
    });

    it('should NOT emit event for MEDIUM findings', async () => {
      const mediumFinding = { ...mockSecurityFinding, severity: 'medium' as const };
      mockAWSScanner.scanAll.mockResolvedValue([mediumFinding]);

      const eventSpy = jest.fn();
      scanService.on('security.finding.created', eventSpy);

      await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(eventSpy).not.toHaveBeenCalled();
    });

    it('should NOT emit event for LOW findings', async () => {
      const lowFinding = { ...mockSecurityFinding, severity: 'low' as const };
      mockAWSScanner.scanAll.mockResolvedValue([lowFinding]);

      const eventSpy = jest.fn();
      scanService.on('security.finding.created', eventSpy);

      await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(eventSpy).not.toHaveBeenCalled();
    });

    it('should emit multiple events for multiple CRITICAL/HIGH findings', async () => {
      mockAWSScanner.scanAll.mockResolvedValue([mockCriticalFinding, mockSecurityFinding]);

      const eventSpy = jest.fn();
      scanService.on('security.finding.created', eventSpy);

      await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(eventSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================
  // Scan Status Tracking Tests
  // ============================================================

  describe('Scan Status Tracking', () => {
    beforeEach(() => {
      mockPrisma.cloudAccount.findFirst.mockResolvedValue(mockAWSAccount);
      mockPrisma.securityFinding.findFirst.mockResolvedValue(null);
      mockPrisma.securityFinding.create.mockResolvedValue({} as any);
    });

    it('should create scan with status "running"', async () => {
      mockPrisma.securityScan.create.mockResolvedValue({ id: mockScanId } as any);
      mockPrisma.securityScan.update.mockResolvedValue({} as any);
      mockAWSScanner.scanAll.mockResolvedValue([]);

      await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(mockPrisma.securityScan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'running',
        }),
      });
    });

    it('should update scan to "completed" on success', async () => {
      mockPrisma.securityScan.create.mockResolvedValue({ id: mockScanId } as any);
      mockPrisma.securityScan.update.mockResolvedValue({} as any);
      mockAWSScanner.scanAll.mockResolvedValue([mockSecurityFinding]);

      await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(mockPrisma.securityScan.update).toHaveBeenCalledWith({
        where: { id: mockScanId },
        data: expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(Date),
          findingsCount: 1,
        }),
      });
    });

    it('should update scan to "failed" on error', async () => {
      mockPrisma.securityScan.create.mockResolvedValue({ id: mockScanId } as any);
      mockPrisma.securityScan.update.mockResolvedValue({} as any);
      mockAWSScanner.scanAll.mockRejectedValue(new Error('Scanner error'));

      await expect(scanService.runScan(mockTenantId, mockAWSAccount.id)).rejects.toThrow();

      expect(mockPrisma.securityScan.update).toHaveBeenCalledWith({
        where: { id: mockScanId },
        data: expect.objectContaining({
          status: 'failed',
          completedAt: expect.any(Date),
          error: 'Scanner error',
        }),
      });
    });
  });

  // ============================================================
  // Severity Count Tests
  // ============================================================

  describe('Severity Counts', () => {
    beforeEach(() => {
      mockPrisma.cloudAccount.findFirst.mockResolvedValue(mockAWSAccount);
      mockPrisma.securityScan.create.mockResolvedValue({ id: mockScanId } as any);
      mockPrisma.securityScan.update.mockResolvedValue({} as any);
      mockPrisma.securityFinding.findFirst.mockResolvedValue(null);
      mockPrisma.securityFinding.create.mockResolvedValue({} as any);
    });

    it('should calculate severity counts correctly', async () => {
      const findings = [
        { ...mockSecurityFinding, severity: 'critical' as const },
        { ...mockSecurityFinding, severity: 'critical' as const },
        { ...mockSecurityFinding, severity: 'high' as const },
        { ...mockSecurityFinding, severity: 'medium' as const },
        { ...mockSecurityFinding, severity: 'low' as const },
      ];
      mockAWSScanner.scanAll.mockResolvedValue(findings);

      const result = await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(result.criticalCount).toBe(2);
      expect(result.highCount).toBe(1);
      expect(result.mediumCount).toBe(1);
      expect(result.lowCount).toBe(1);
      expect(result.totalFindings).toBe(5);
    });

    it('should handle all same severity', async () => {
      const findings = [
        { ...mockSecurityFinding, severity: 'high' as const },
        { ...mockSecurityFinding, severity: 'high' as const },
        { ...mockSecurityFinding, severity: 'high' as const },
      ];
      mockAWSScanner.scanAll.mockResolvedValue(findings);

      const result = await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(result.criticalCount).toBe(0);
      expect(result.highCount).toBe(3);
      expect(result.mediumCount).toBe(0);
      expect(result.lowCount).toBe(0);
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('Edge Cases', () => {
    it('should handle no active accounts', async () => {
      mockPrisma.cloudAccount.findMany.mockResolvedValue([]);

      await expect(scanService.runScan(mockTenantId)).rejects.toThrow('No accounts found to scan');
    });

    it('should calculate duration correctly', async () => {
      mockPrisma.cloudAccount.findFirst.mockResolvedValue(mockAWSAccount);
      mockPrisma.securityScan.create.mockResolvedValue({ id: mockScanId } as any);
      mockPrisma.securityScan.update.mockResolvedValue({} as any);
      mockPrisma.securityFinding.findFirst.mockResolvedValue(null);
      mockAWSScanner.scanAll.mockResolvedValue([]);

      const result = await scanService.runScan(mockTenantId, mockAWSAccount.id);

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe('number');
    });

    it('should handle disconnect gracefully', async () => {
      await scanService.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});
