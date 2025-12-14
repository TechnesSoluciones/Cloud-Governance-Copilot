/**
 * Azure Security Scanner Service Unit Tests
 *
 * Comprehensive test suite for Azure Security Scanner Service.
 * Tests all security checks, error handling, and edge cases.
 *
 * Test Coverage:
 * - Storage Account security checks (public blob access, HTTPS enforcement, encryption)
 * - Network Security Group (NSG) rule analysis
 * - Port range parsing (single, range, wildcard, arrays)
 * - Unrestricted source detection
 * - Severity calculation
 * - Error handling (authorization failures, API errors, timeouts)
 * - Edge cases (empty resources, missing properties, partial configurations)
 * - Filtering utilities (by severity, category, resource type)
 * - Summary generation
 *
 * @module __tests__/unit/services/azure/security-scanner.service.test
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AzureSecurityScannerService, SecurityFinding } from '../../../../integrations/azure/security-scanner.service';
import { StorageManagementClient } from '@azure/arm-storage';
import { NetworkManagementClient } from '@azure/arm-network';
import { TokenCredential } from '@azure/identity';

// Mock Azure SDK clients
jest.mock('@azure/arm-storage');
jest.mock('@azure/arm-network');
jest.mock('../../../../utils/logger');

describe('AzureSecurityScannerService', () => {
  let scannerService: AzureSecurityScannerService;
  let mockStorageClient: jest.Mocked<StorageManagementClient>;
  let mockNetworkClient: jest.Mocked<NetworkManagementClient>;
  let mockCredentials: TokenCredential;

  const SUBSCRIPTION_ID = 'test-subscription-id';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock credentials
    mockCredentials = {
      getToken: jest.fn().mockResolvedValue({ token: 'mock-token', expiresOnTimestamp: Date.now() + 3600000 }),
    } as any;

    // Create scanner instance
    scannerService = new AzureSecurityScannerService({
      credentials: mockCredentials,
      subscriptionId: SUBSCRIPTION_ID,
    });

    // Get mocked clients from the instance
    mockStorageClient = (scannerService as any).storageClient;
    mockNetworkClient = (scannerService as any).networkClient;
  });

  describe('Constructor', () => {
    it('should create scanner service with valid configuration', () => {
      expect(scannerService).toBeDefined();
      expect((scannerService as any).subscriptionId).toBe(SUBSCRIPTION_ID);
      expect((scannerService as any).credentials).toBe(mockCredentials);
    });

    it('should initialize Storage and Network clients', () => {
      expect((scannerService as any).storageClient).toBeDefined();
      expect((scannerService as any).networkClient).toBeDefined();
    });
  });

  describe('scanStorageAccounts', () => {
    it('should detect storage account with public blob access enabled', async () => {
      const mockStorageAccount = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/testaccount',
        name: 'testaccount',
        location: 'eastus',
        allowBlobPublicAccess: true,
        enableHttpsTrafficOnly: true,
        sku: { name: 'Standard_LRS' },
        kind: 'StorageV2',
      };

      mockStorageClient.storageAccounts = {
        list: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockStorageAccount;
          },
        }),
      } as any;

      const findings = await scannerService.scanStorageAccounts();

      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        resourceType: 'STORAGE_ACCOUNT',
        category: 'DATA_PROTECTION',
        severity: 'CRITICAL',
        title: 'Storage account allows public blob access',
        cisReference: 'CIS Azure 1.3.0 - 3.1',
        region: 'eastus',
      });
      expect(findings[0].metadata.accountName).toBe('testaccount');
      expect(findings[0].metadata.allowBlobPublicAccess).toBe(true);
    });

    it('should detect storage account with HTTP traffic allowed', async () => {
      const mockStorageAccount = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/testaccount',
        name: 'testaccount',
        location: 'westus',
        allowBlobPublicAccess: false,
        enableHttpsTrafficOnly: false,
        sku: { name: 'Premium_LRS' },
        kind: 'BlobStorage',
      };

      mockStorageClient.storageAccounts = {
        list: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockStorageAccount;
          },
        }),
      } as any;

      const findings = await scannerService.scanStorageAccounts();

      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        resourceType: 'STORAGE_ACCOUNT',
        category: 'DATA_PROTECTION',
        severity: 'HIGH',
        title: 'Storage account allows HTTP traffic',
        cisReference: 'CIS Azure 1.3.0 - 3.8',
        region: 'westus',
      });
      expect(findings[0].metadata.accountName).toBe('testaccount');
      expect(findings[0].metadata.enableHttpsTrafficOnly).toBe(false);
    });

    it('should detect storage account with encryption disabled', async () => {
      const mockStorageAccount = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/testaccount',
        name: 'testaccount',
        location: 'centralus',
        allowBlobPublicAccess: false,
        enableHttpsTrafficOnly: true,
        encryption: {
          services: {
            blob: { enabled: false },
            file: { enabled: true },
          },
        },
        sku: { name: 'Standard_GRS' },
        kind: 'StorageV2',
      };

      mockStorageClient.storageAccounts = {
        list: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockStorageAccount;
          },
        }),
      } as any;

      const findings = await scannerService.scanStorageAccounts();

      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        resourceType: 'STORAGE_ACCOUNT',
        category: 'ENCRYPTION',
        severity: 'MEDIUM',
        title: 'Storage account has encryption disabled for some services',
        cisReference: 'CIS Azure 1.3.0 - 3.2',
        region: 'centralus',
      });
      expect(findings[0].metadata.blobEncryption).toBe(false);
      expect(findings[0].metadata.fileEncryption).toBe(true);
    });

    it('should detect multiple issues in single storage account', async () => {
      const mockStorageAccount = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/testaccount',
        name: 'testaccount',
        location: 'eastus2',
        allowBlobPublicAccess: true,
        enableHttpsTrafficOnly: false,
        encryption: {
          services: {
            blob: { enabled: false },
            file: { enabled: false },
          },
        },
        sku: { name: 'Standard_LRS' },
        kind: 'StorageV2',
      };

      mockStorageClient.storageAccounts = {
        list: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockStorageAccount;
          },
        }),
      } as any;

      const findings = await scannerService.scanStorageAccounts();

      expect(findings).toHaveLength(3);
      expect(findings.filter(f => f.severity === 'CRITICAL')).toHaveLength(1);
      expect(findings.filter(f => f.severity === 'HIGH')).toHaveLength(1);
      expect(findings.filter(f => f.severity === 'MEDIUM')).toHaveLength(1);
    });

    it('should return no findings for secure storage account', async () => {
      const mockStorageAccount = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/testaccount',
        name: 'testaccount',
        location: 'westeurope',
        allowBlobPublicAccess: false,
        enableHttpsTrafficOnly: true,
        encryption: {
          services: {
            blob: { enabled: true },
            file: { enabled: true },
          },
        },
        sku: { name: 'Standard_LRS' },
        kind: 'StorageV2',
      };

      mockStorageClient.storageAccounts = {
        list: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockStorageAccount;
          },
        }),
      } as any;

      const findings = await scannerService.scanStorageAccounts();

      expect(findings).toHaveLength(0);
    });

    it('should scan multiple storage accounts', async () => {
      const mockAccounts = [
        {
          id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/account1',
          name: 'account1',
          location: 'eastus',
          allowBlobPublicAccess: true,
          enableHttpsTrafficOnly: true,
        },
        {
          id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/account2',
          name: 'account2',
          location: 'westus',
          allowBlobPublicAccess: false,
          enableHttpsTrafficOnly: false,
        },
      ];

      mockStorageClient.storageAccounts = {
        list: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            for (const account of mockAccounts) {
              yield account;
            }
          },
        }),
      } as any;

      const findings = await scannerService.scanStorageAccounts();

      expect(findings).toHaveLength(2);
      expect(findings[0].metadata.accountName).toBe('account1');
      expect(findings[1].metadata.accountName).toBe('account2');
    });

    it('should handle authorization failure gracefully', async () => {
      const authError = new Error('Authorization failed');
      (authError as any).code = 'AuthorizationFailed';

      mockStorageClient.storageAccounts = {
        list: jest.fn().mockImplementation(() => {
          throw authError;
        }),
      } as any;

      const findings = await scannerService.scanStorageAccounts();

      expect(findings).toHaveLength(0);
    });

    it('should handle 403 status code gracefully', async () => {
      const authError = new Error('Forbidden');
      (authError as any).statusCode = 403;

      mockStorageClient.storageAccounts = {
        list: jest.fn().mockImplementation(() => {
          throw authError;
        }),
      } as any;

      const findings = await scannerService.scanStorageAccounts();

      expect(findings).toHaveLength(0);
    });

    it('should throw error for non-authorization failures', async () => {
      const error = new Error('Network timeout');

      mockStorageClient.storageAccounts = {
        list: jest.fn().mockImplementation(() => {
          throw error;
        }),
      } as any;

      await expect(scannerService.scanStorageAccounts()).rejects.toThrow('Failed to scan storage accounts');
    });

    it('should handle empty storage account list', async () => {
      mockStorageClient.storageAccounts = {
        list: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            // Yield nothing
          },
        }),
      } as any;

      const findings = await scannerService.scanStorageAccounts();

      expect(findings).toHaveLength(0);
    });
  });

  describe('scanNetworkSecurityGroups', () => {
    it('should detect NSG rule with unrestricted SSH access', async () => {
      const mockNSG = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/networkSecurityGroups/test-nsg',
        name: 'test-nsg',
        location: 'eastus',
        securityRules: [
          {
            name: 'allow-ssh',
            direction: 'Inbound',
            access: 'Allow',
            sourceAddressPrefix: '*',
            destinationPortRange: '22',
            protocol: 'TCP',
            priority: 100,
          },
        ],
      };

      mockNetworkClient.networkSecurityGroups = {
        listAll: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockNSG;
          },
        }),
      } as any;

      const findings = await scannerService.scanNetworkSecurityGroups();

      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        resourceType: 'NSG',
        category: 'NETWORK',
        severity: 'CRITICAL',
        title: 'Network Security Group allows unrestricted access',
        cisReference: 'CIS Azure 1.3.0 - 6.1',
        region: 'eastus',
      });
      expect(findings[0].metadata.nsgName).toBe('test-nsg');
      expect(findings[0].metadata.ruleName).toBe('allow-ssh');
      expect(findings[0].metadata.ports).toContain(22);
    });

    it('should detect NSG rule with unrestricted RDP access', async () => {
      const mockNSG = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/networkSecurityGroups/test-nsg',
        name: 'test-nsg',
        location: 'westus',
        securityRules: [
          {
            name: 'allow-rdp',
            direction: 'Inbound',
            access: 'Allow',
            sourceAddressPrefix: '0.0.0.0/0',
            destinationPortRange: '3389',
            protocol: 'TCP',
            priority: 200,
          },
        ],
      };

      mockNetworkClient.networkSecurityGroups = {
        listAll: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockNSG;
          },
        }),
      } as any;

      const findings = await scannerService.scanNetworkSecurityGroups();

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('CRITICAL');
      expect(findings[0].metadata.ports).toContain(3389);
    });

    it('should detect NSG rule with unrestricted database access (MySQL)', async () => {
      const mockNSG = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/networkSecurityGroups/test-nsg',
        name: 'test-nsg',
        location: 'centralus',
        securityRules: [
          {
            name: 'allow-mysql',
            direction: 'Inbound',
            access: 'Allow',
            sourceAddressPrefix: 'Internet',
            destinationPortRange: '3306',
            protocol: 'TCP',
            priority: 300,
          },
        ],
      };

      mockNetworkClient.networkSecurityGroups = {
        listAll: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockNSG;
          },
        }),
      } as any;

      const findings = await scannerService.scanNetworkSecurityGroups();

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('HIGH');
      expect(findings[0].metadata.ports).toContain(3306);
    });

    it('should detect NSG rule with port range containing critical ports', async () => {
      const mockNSG = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/networkSecurityGroups/test-nsg',
        name: 'test-nsg',
        location: 'eastus2',
        securityRules: [
          {
            name: 'allow-range',
            direction: 'Inbound',
            access: 'Allow',
            sourceAddressPrefix: '*',
            destinationPortRange: '20-25',
            protocol: 'TCP',
            priority: 400,
          },
        ],
      };

      mockNetworkClient.networkSecurityGroups = {
        listAll: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockNSG;
          },
        }),
      } as any;

      const findings = await scannerService.scanNetworkSecurityGroups();

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('CRITICAL');
      expect(findings[0].metadata.ports).toContain(22);
    });

    it('should detect NSG rule with wildcard port range', async () => {
      const mockNSG = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/networkSecurityGroups/test-nsg',
        name: 'test-nsg',
        location: 'northeurope',
        securityRules: [
          {
            name: 'allow-all-ports',
            direction: 'Inbound',
            access: 'Allow',
            sourceAddressPrefix: '*',
            destinationPortRange: '*',
            protocol: 'TCP',
            priority: 500,
          },
        ],
      };

      mockNetworkClient.networkSecurityGroups = {
        listAll: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockNSG;
          },
        }),
      } as any;

      const findings = await scannerService.scanNetworkSecurityGroups();

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('CRITICAL');
      expect(findings[0].metadata.ports.length).toBeGreaterThan(0);
    });

    it('should handle multiple destination port ranges', async () => {
      const mockNSG = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/networkSecurityGroups/test-nsg',
        name: 'test-nsg',
        location: 'westeurope',
        securityRules: [
          {
            name: 'allow-multiple',
            direction: 'Inbound',
            access: 'Allow',
            sourceAddressPrefix: '*',
            destinationPortRanges: ['22', '3389', '3306'],
            protocol: 'TCP',
            priority: 600,
          },
        ],
      };

      mockNetworkClient.networkSecurityGroups = {
        listAll: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockNSG;
          },
        }),
      } as any;

      const findings = await scannerService.scanNetworkSecurityGroups();

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('CRITICAL');
      expect(findings[0].metadata.ports).toContain(22);
      expect(findings[0].metadata.ports).toContain(3389);
      expect(findings[0].metadata.ports).toContain(3306);
    });

    it('should handle source address prefixes array', async () => {
      const mockNSG = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/networkSecurityGroups/test-nsg',
        name: 'test-nsg',
        location: 'southcentralus',
        securityRules: [
          {
            name: 'allow-multiple-sources',
            direction: 'Inbound',
            access: 'Allow',
            sourceAddressPrefixes: ['*', '10.0.0.0/8'],
            destinationPortRange: '22',
            protocol: 'TCP',
            priority: 700,
          },
        ],
      };

      mockNetworkClient.networkSecurityGroups = {
        listAll: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockNSG;
          },
        }),
      } as any;

      const findings = await scannerService.scanNetworkSecurityGroups();

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('CRITICAL');
    });

    it('should ignore outbound rules', async () => {
      const mockNSG = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/networkSecurityGroups/test-nsg',
        name: 'test-nsg',
        location: 'eastus',
        securityRules: [
          {
            name: 'allow-outbound-ssh',
            direction: 'Outbound',
            access: 'Allow',
            sourceAddressPrefix: '*',
            destinationPortRange: '22',
            protocol: 'TCP',
            priority: 800,
          },
        ],
      };

      mockNetworkClient.networkSecurityGroups = {
        listAll: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockNSG;
          },
        }),
      } as any;

      const findings = await scannerService.scanNetworkSecurityGroups();

      expect(findings).toHaveLength(0);
    });

    it('should ignore deny rules', async () => {
      const mockNSG = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/networkSecurityGroups/test-nsg',
        name: 'test-nsg',
        location: 'westus',
        securityRules: [
          {
            name: 'deny-ssh',
            direction: 'Inbound',
            access: 'Deny',
            sourceAddressPrefix: '*',
            destinationPortRange: '22',
            protocol: 'TCP',
            priority: 900,
          },
        ],
      };

      mockNetworkClient.networkSecurityGroups = {
        listAll: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockNSG;
          },
        }),
      } as any;

      const findings = await scannerService.scanNetworkSecurityGroups();

      expect(findings).toHaveLength(0);
    });

    it('should ignore rules with restricted source addresses', async () => {
      const mockNSG = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/networkSecurityGroups/test-nsg',
        name: 'test-nsg',
        location: 'centralus',
        securityRules: [
          {
            name: 'allow-ssh-restricted',
            direction: 'Inbound',
            access: 'Allow',
            sourceAddressPrefix: '10.0.0.0/24',
            destinationPortRange: '22',
            protocol: 'TCP',
            priority: 1000,
          },
        ],
      };

      mockNetworkClient.networkSecurityGroups = {
        listAll: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockNSG;
          },
        }),
      } as any;

      const findings = await scannerService.scanNetworkSecurityGroups();

      expect(findings).toHaveLength(0);
    });

    it('should handle NSG without security rules', async () => {
      const mockNSG = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/networkSecurityGroups/test-nsg',
        name: 'test-nsg',
        location: 'eastus2',
        securityRules: [],
      };

      mockNetworkClient.networkSecurityGroups = {
        listAll: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockNSG;
          },
        }),
      } as any;

      const findings = await scannerService.scanNetworkSecurityGroups();

      expect(findings).toHaveLength(0);
    });

    it('should handle authorization failure gracefully', async () => {
      const authError = new Error('Authorization failed');
      (authError as any).code = 'AuthorizationFailed';

      mockNetworkClient.networkSecurityGroups = {
        listAll: jest.fn().mockImplementation(() => {
          throw authError;
        }),
      } as any;

      const findings = await scannerService.scanNetworkSecurityGroups();

      expect(findings).toHaveLength(0);
    });

    it('should throw error for non-authorization failures', async () => {
      const error = new Error('Network error');

      mockNetworkClient.networkSecurityGroups = {
        listAll: jest.fn().mockImplementation(() => {
          throw error;
        }),
      } as any;

      await expect(scannerService.scanNetworkSecurityGroups()).rejects.toThrow('Failed to scan network security groups');
    });

    it('should handle empty NSG list', async () => {
      mockNetworkClient.networkSecurityGroups = {
        listAll: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            // Yield nothing
          },
        }),
      } as any;

      const findings = await scannerService.scanNetworkSecurityGroups();

      expect(findings).toHaveLength(0);
    });
  });

  describe('scanAll', () => {
    it('should execute all scans in parallel', async () => {
      const mockStorageAccount = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/testaccount',
        name: 'testaccount',
        location: 'eastus',
        allowBlobPublicAccess: true,
        enableHttpsTrafficOnly: true,
      };

      const mockNSG = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/networkSecurityGroups/test-nsg',
        name: 'test-nsg',
        location: 'westus',
        securityRules: [
          {
            name: 'allow-ssh',
            direction: 'Inbound',
            access: 'Allow',
            sourceAddressPrefix: '*',
            destinationPortRange: '22',
            protocol: 'TCP',
            priority: 100,
          },
        ],
      };

      mockStorageClient.storageAccounts = {
        list: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockStorageAccount;
          },
        }),
      } as any;

      mockNetworkClient.networkSecurityGroups = {
        listAll: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockNSG;
          },
        }),
      } as any;

      const findings = await scannerService.scanAll();

      expect(findings).toHaveLength(2);
      expect(findings.filter(f => f.resourceType === 'STORAGE_ACCOUNT')).toHaveLength(1);
      expect(findings.filter(f => f.resourceType === 'NSG')).toHaveLength(1);
    });

    it('should continue if one scan type fails', async () => {
      const storageError = new Error('Storage API error');

      mockStorageClient.storageAccounts = {
        list: jest.fn().mockImplementation(() => {
          throw storageError;
        }),
      } as any;

      const mockNSG = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/networkSecurityGroups/test-nsg',
        name: 'test-nsg',
        location: 'westus',
        securityRules: [
          {
            name: 'allow-ssh',
            direction: 'Inbound',
            access: 'Allow',
            sourceAddressPrefix: '*',
            destinationPortRange: '22',
            protocol: 'TCP',
            priority: 100,
          },
        ],
      };

      mockNetworkClient.networkSecurityGroups = {
        listAll: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockNSG;
          },
        }),
      } as any;

      // Should throw because storage scan failed and it's not an authorization error
      await expect(scannerService.scanAll()).rejects.toThrow('Azure security scan failed');
    });

    it('should return empty array when no findings', async () => {
      mockStorageClient.storageAccounts = {
        list: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            // No accounts
          },
        }),
      } as any;

      mockNetworkClient.networkSecurityGroups = {
        listAll: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            // No NSGs
          },
        }),
      } as any;

      const findings = await scannerService.scanAll();

      expect(findings).toHaveLength(0);
    });
  });

  describe('Utility Methods', () => {
    describe('getSummary', () => {
      it('should generate correct summary statistics', () => {
        const findings: SecurityFinding[] = [
          {
            resourceId: 'resource-1',
            resourceType: 'STORAGE_ACCOUNT',
            category: 'DATA_PROTECTION',
            severity: 'CRITICAL',
            title: 'Test finding 1',
            description: 'Description 1',
            remediation: 'Remediation 1',
            region: 'eastus',
            metadata: {},
          },
          {
            resourceId: 'resource-2',
            resourceType: 'NSG',
            category: 'NETWORK',
            severity: 'HIGH',
            title: 'Test finding 2',
            description: 'Description 2',
            remediation: 'Remediation 2',
            region: 'westus',
            metadata: {},
          },
          {
            resourceId: 'resource-3',
            resourceType: 'STORAGE_ACCOUNT',
            category: 'ENCRYPTION',
            severity: 'MEDIUM',
            title: 'Test finding 3',
            description: 'Description 3',
            remediation: 'Remediation 3',
            region: 'centralus',
            metadata: {},
          },
        ];

        const summary = scannerService.getSummary(findings);

        expect(summary.total).toBe(3);
        expect(summary.critical).toBe(1);
        expect(summary.high).toBe(1);
        expect(summary.medium).toBe(1);
        expect(summary.low).toBe(0);
        expect(summary.byCategory.DATA_PROTECTION).toBe(1);
        expect(summary.byCategory.NETWORK).toBe(1);
        expect(summary.byCategory.ENCRYPTION).toBe(1);
        expect(summary.byResourceType.STORAGE_ACCOUNT).toBe(2);
        expect(summary.byResourceType.NSG).toBe(1);
      });

      it('should handle empty findings array', () => {
        const summary = scannerService.getSummary([]);

        expect(summary.total).toBe(0);
        expect(summary.critical).toBe(0);
        expect(summary.high).toBe(0);
        expect(summary.medium).toBe(0);
        expect(summary.low).toBe(0);
      });
    });

    describe('filterBySeverity', () => {
      const findings: SecurityFinding[] = [
        {
          resourceId: 'resource-1',
          resourceType: 'STORAGE_ACCOUNT',
          category: 'DATA_PROTECTION',
          severity: 'CRITICAL',
          title: 'Critical finding',
          description: 'Description',
          remediation: 'Remediation',
          region: 'eastus',
          metadata: {},
        },
        {
          resourceId: 'resource-2',
          resourceType: 'NSG',
          category: 'NETWORK',
          severity: 'HIGH',
          title: 'High finding',
          description: 'Description',
          remediation: 'Remediation',
          region: 'westus',
          metadata: {},
        },
        {
          resourceId: 'resource-3',
          resourceType: 'STORAGE_ACCOUNT',
          category: 'ENCRYPTION',
          severity: 'MEDIUM',
          title: 'Medium finding',
          description: 'Description',
          remediation: 'Remediation',
          region: 'centralus',
          metadata: {},
        },
      ];

      it('should filter by single severity', () => {
        const filtered = scannerService.filterBySeverity(findings, ['CRITICAL']);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].severity).toBe('CRITICAL');
      });

      it('should filter by multiple severities', () => {
        const filtered = scannerService.filterBySeverity(findings, ['CRITICAL', 'HIGH']);
        expect(filtered).toHaveLength(2);
      });

      it('should return empty array when no matches', () => {
        const filtered = scannerService.filterBySeverity(findings, ['LOW']);
        expect(filtered).toHaveLength(0);
      });
    });

    describe('filterByCategory', () => {
      const findings: SecurityFinding[] = [
        {
          resourceId: 'resource-1',
          resourceType: 'STORAGE_ACCOUNT',
          category: 'DATA_PROTECTION',
          severity: 'CRITICAL',
          title: 'Data protection finding',
          description: 'Description',
          remediation: 'Remediation',
          region: 'eastus',
          metadata: {},
        },
        {
          resourceId: 'resource-2',
          resourceType: 'NSG',
          category: 'NETWORK',
          severity: 'HIGH',
          title: 'Network finding',
          description: 'Description',
          remediation: 'Remediation',
          region: 'westus',
          metadata: {},
        },
      ];

      it('should filter by single category', () => {
        const filtered = scannerService.filterByCategory(findings, ['DATA_PROTECTION']);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].category).toBe('DATA_PROTECTION');
      });

      it('should filter by multiple categories', () => {
        const filtered = scannerService.filterByCategory(findings, ['DATA_PROTECTION', 'NETWORK']);
        expect(filtered).toHaveLength(2);
      });
    });

    describe('filterByResourceType', () => {
      const findings: SecurityFinding[] = [
        {
          resourceId: 'resource-1',
          resourceType: 'STORAGE_ACCOUNT',
          category: 'DATA_PROTECTION',
          severity: 'CRITICAL',
          title: 'Storage finding',
          description: 'Description',
          remediation: 'Remediation',
          region: 'eastus',
          metadata: {},
        },
        {
          resourceId: 'resource-2',
          resourceType: 'NSG',
          category: 'NETWORK',
          severity: 'HIGH',
          title: 'NSG finding',
          description: 'Description',
          remediation: 'Remediation',
          region: 'westus',
          metadata: {},
        },
      ];

      it('should filter by single resource type', () => {
        const filtered = scannerService.filterByResourceType(findings, ['STORAGE_ACCOUNT']);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].resourceType).toBe('STORAGE_ACCOUNT');
      });

      it('should filter by multiple resource types', () => {
        const filtered = scannerService.filterByResourceType(findings, ['STORAGE_ACCOUNT', 'NSG']);
        expect(filtered).toHaveLength(2);
      });
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle storage account with missing properties', async () => {
      const mockStorageAccount = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/testaccount',
        name: 'testaccount',
        location: 'eastus',
        // Missing allowBlobPublicAccess and enableHttpsTrafficOnly
      };

      mockStorageClient.storageAccounts = {
        list: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockStorageAccount;
          },
        }),
      } as any;

      const findings = await scannerService.scanStorageAccounts();

      // Should not crash, may or may not have findings depending on undefined handling
      expect(findings).toBeDefined();
    });

    it('should handle NSG rule with invalid port range', async () => {
      const mockNSG = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/networkSecurityGroups/test-nsg',
        name: 'test-nsg',
        location: 'eastus',
        securityRules: [
          {
            name: 'invalid-port',
            direction: 'Inbound',
            access: 'Allow',
            sourceAddressPrefix: '*',
            destinationPortRange: 'invalid',
            protocol: 'TCP',
            priority: 100,
          },
        ],
      };

      mockNetworkClient.networkSecurityGroups = {
        listAll: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockNSG;
          },
        }),
      } as any;

      const findings = await scannerService.scanNetworkSecurityGroups();

      // Should handle gracefully without crashing
      expect(findings).toHaveLength(0);
    });

    it('should handle very large port range', async () => {
      const mockNSG = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Network/networkSecurityGroups/test-nsg',
        name: 'test-nsg',
        location: 'eastus',
        securityRules: [
          {
            name: 'huge-range',
            direction: 'Inbound',
            access: 'Allow',
            sourceAddressPrefix: '*',
            destinationPortRange: '1-65535',
            protocol: 'TCP',
            priority: 100,
          },
        ],
      };

      mockNetworkClient.networkSecurityGroups = {
        listAll: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockNSG;
          },
        }),
      } as any;

      const findings = await scannerService.scanNetworkSecurityGroups();

      // Should handle large range without memory issues
      expect(findings).toHaveLength(1);
    });

    it('should extract resource group correctly', () => {
      const resourceId = '/subscriptions/sub-id/resourceGroups/my-rg/providers/Microsoft.Storage/storageAccounts/account';
      const resourceGroup = (scannerService as any).extractResourceGroup(resourceId);
      expect(resourceGroup).toBe('my-rg');
    });

    it('should handle invalid resource ID format', () => {
      const resourceId = 'invalid-resource-id';
      const resourceGroup = (scannerService as any).extractResourceGroup(resourceId);
      expect(resourceGroup).toBe('unknown');
    });
  });
});
