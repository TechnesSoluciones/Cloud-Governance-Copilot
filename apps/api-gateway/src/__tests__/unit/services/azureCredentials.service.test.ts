/**
 * Azure Credentials Service Unit Tests
 *
 * Comprehensive test suite for Azure Credentials Service.
 * Tests credential retrieval, caching, validation, and error handling.
 *
 * Test Coverage:
 * - Credential retrieval with valid accountId
 * - Credential retrieval with invalid accountId
 * - Credential retrieval with non-Azure account
 * - Token credential caching behavior
 * - Credential validation (valid/invalid)
 * - Cache clearing operations
 * - Error handling for missing credentials
 * - Edge cases (missing fields, malformed metadata)
 *
 * @module __tests__/unit/services/azureCredentials.service.test
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { AzureCredentialsService } from '../../../services/azure/azureCredentials.service';
import { PrismaClient } from '@prisma/client';

// Mock Azure SDK - must be done before importing the service
jest.mock('@azure/identity', () => {
  const mockGetToken = jest.fn().mockResolvedValue({
    token: 'mock-access-token',
    expiresOnTimestamp: Date.now() + 3600000,
  });

  return {
    ClientSecretCredential: jest.fn().mockImplementation((tenantId, clientId, clientSecret) => ({
      tenantId,
      clientId,
      clientSecret,
      getToken: mockGetToken,
    })),
  };
});

jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    cloudAccount: {
      findUnique: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

describe('AzureCredentialsService', () => {
  let mockPrisma: any;
  const { ClientSecretCredential } = require('@azure/identity');

  const VALID_ACCOUNT_ID = 'test-account-id';
  const VALID_TENANT_ID = 'test-tenant-id';

  const mockAzureAccount = {
    id: VALID_ACCOUNT_ID,
    provider: 'azure',
    tenantId: VALID_TENANT_ID,
    name: 'Test Azure Account',
    metadata: {
      credentials: {
        tenant_id: 'tenant-123',
        client_id: 'client-456',
        client_secret: 'secret-789',
        subscription_id: 'sub-abc',
      },
    },
    tenant: {
      id: VALID_TENANT_ID,
      name: 'Test Tenant',
    },
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Get mock Prisma instance
    mockPrisma = new PrismaClient();

    // Clear credential cache
    AzureCredentialsService.clearAllCache();
  });

  afterEach(() => {
    // Clean up after each test
    AzureCredentialsService.clearAllCache();
  });

  describe('getCredentials', () => {
    it('should successfully retrieve credentials for valid Azure account', async () => {
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(mockAzureAccount);

      const credentials = await AzureCredentialsService.getCredentials(VALID_ACCOUNT_ID);

      expect(credentials).toEqual({
        tenantId: 'tenant-123',
        clientId: 'client-456',
        clientSecret: 'secret-789',
        subscriptionId: 'sub-abc',
      });

      expect(mockPrisma.cloudAccount.findUnique).toHaveBeenCalledWith({
        where: { id: VALID_ACCOUNT_ID },
        include: { tenant: true },
      });
    });

    it('should handle provider case insensitivity (AZURE uppercase)', async () => {
      const accountWithUppercase = {
        ...mockAzureAccount,
        provider: 'AZURE',
      };
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(accountWithUppercase);

      const credentials = await AzureCredentialsService.getCredentials(VALID_ACCOUNT_ID);

      expect(credentials).toBeDefined();
      expect(credentials.tenantId).toBe('tenant-123');
    });

    it('should throw error when account not found', async () => {
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(null);

      await expect(
        AzureCredentialsService.getCredentials('non-existent-account')
      ).rejects.toThrow('Cloud account not found: non-existent-account');
    });

    it('should throw error for non-Azure account', async () => {
      const awsAccount = {
        ...mockAzureAccount,
        provider: 'aws',
      };
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(awsAccount);

      await expect(
        AzureCredentialsService.getCredentials(VALID_ACCOUNT_ID)
      ).rejects.toThrow(`Account ${VALID_ACCOUNT_ID} is not an Azure account`);
    });

    it('should throw error when metadata is missing', async () => {
      const accountWithoutMetadata = {
        ...mockAzureAccount,
        metadata: null,
      };
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(accountWithoutMetadata);

      await expect(
        AzureCredentialsService.getCredentials(VALID_ACCOUNT_ID)
      ).rejects.toThrow(`No credentials found for account ${VALID_ACCOUNT_ID}`);
    });

    it('should throw error when credentials object is missing in metadata', async () => {
      const accountWithoutCredentials = {
        ...mockAzureAccount,
        metadata: {
          someOtherField: 'value',
        },
      };
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(accountWithoutCredentials);

      await expect(
        AzureCredentialsService.getCredentials(VALID_ACCOUNT_ID)
      ).rejects.toThrow(`No credentials found for account ${VALID_ACCOUNT_ID}`);
    });

    it('should throw error when tenant_id is missing', async () => {
      const accountWithMissingTenantId = {
        ...mockAzureAccount,
        metadata: {
          credentials: {
            client_id: 'client-456',
            client_secret: 'secret-789',
            subscription_id: 'sub-abc',
          },
        },
      };
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(accountWithMissingTenantId);

      await expect(
        AzureCredentialsService.getCredentials(VALID_ACCOUNT_ID)
      ).rejects.toThrow(`Invalid Azure credentials for account ${VALID_ACCOUNT_ID}`);
    });

    it('should throw error when client_id is missing', async () => {
      const accountWithMissingClientId = {
        ...mockAzureAccount,
        metadata: {
          credentials: {
            tenant_id: 'tenant-123',
            client_secret: 'secret-789',
            subscription_id: 'sub-abc',
          },
        },
      };
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(accountWithMissingClientId);

      await expect(
        AzureCredentialsService.getCredentials(VALID_ACCOUNT_ID)
      ).rejects.toThrow(`Invalid Azure credentials for account ${VALID_ACCOUNT_ID}`);
    });

    it('should throw error when client_secret is missing', async () => {
      const accountWithMissingSecret = {
        ...mockAzureAccount,
        metadata: {
          credentials: {
            tenant_id: 'tenant-123',
            client_id: 'client-456',
            subscription_id: 'sub-abc',
          },
        },
      };
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(accountWithMissingSecret);

      await expect(
        AzureCredentialsService.getCredentials(VALID_ACCOUNT_ID)
      ).rejects.toThrow(`Invalid Azure credentials for account ${VALID_ACCOUNT_ID}`);
    });

    it('should throw error when subscription_id is missing', async () => {
      const accountWithMissingSubscription = {
        ...mockAzureAccount,
        metadata: {
          credentials: {
            tenant_id: 'tenant-123',
            client_id: 'client-456',
            client_secret: 'secret-789',
          },
        },
      };
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(accountWithMissingSubscription);

      await expect(
        AzureCredentialsService.getCredentials(VALID_ACCOUNT_ID)
      ).rejects.toThrow(`Invalid Azure credentials for account ${VALID_ACCOUNT_ID}`);
    });
  });

  describe('getTokenCredential', () => {
    it('should create and return TokenCredential for valid account', async () => {
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(mockAzureAccount);

      const credential = await AzureCredentialsService.getTokenCredential(VALID_ACCOUNT_ID);

      expect(credential).toBeDefined();
      expect(ClientSecretCredential).toHaveBeenCalledWith(
        'tenant-123',
        'client-456',
        'secret-789'
      );
    });

    it('should cache credential and return cached version on subsequent calls', async () => {
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(mockAzureAccount);

      // First call - should create credential
      const credential1 = await AzureCredentialsService.getTokenCredential(VALID_ACCOUNT_ID);
      const firstCallCount = ClientSecretCredential.mock.calls.length;

      // Second call - should return cached credential
      const credential2 = await AzureCredentialsService.getTokenCredential(VALID_ACCOUNT_ID);
      const secondCallCount = ClientSecretCredential.mock.calls.length;

      expect(credential1).toBe(credential2);
      expect(firstCallCount).toBe(secondCallCount); // No new credential created
      expect(mockPrisma.cloudAccount.findUnique).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should create new credential when cache expires', async () => {
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(mockAzureAccount);

      // First call
      await AzureCredentialsService.getTokenCredential(VALID_ACCOUNT_ID);

      // Manually expire the cache by manipulating time
      const cache = (AzureCredentialsService as any).credentialCache;
      const cachedEntry = cache.get(VALID_ACCOUNT_ID);
      if (cachedEntry) {
        cachedEntry.expiresAt = new Date(Date.now() - 1000); // Set to expired
      }

      // Second call after expiration
      await AzureCredentialsService.getTokenCredential(VALID_ACCOUNT_ID);

      // Should have created a new credential
      expect(mockPrisma.cloudAccount.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should cache credential for 1 hour', async () => {
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(mockAzureAccount);

      const beforeTime = Date.now();
      await AzureCredentialsService.getTokenCredential(VALID_ACCOUNT_ID);
      const afterTime = Date.now();

      const cache = (AzureCredentialsService as any).credentialCache;
      const cachedEntry = cache.get(VALID_ACCOUNT_ID);

      expect(cachedEntry).toBeDefined();

      const expectedExpiry = beforeTime + 3600000; // 1 hour
      const actualExpiry = cachedEntry.expiresAt.getTime();

      // Allow 100ms variance for test execution time
      expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - 100);
      expect(actualExpiry).toBeLessThanOrEqual(afterTime + 3600000 + 100);
    });

    it('should handle multiple different accounts in cache', async () => {
      const account2 = {
        ...mockAzureAccount,
        id: 'account-2',
        metadata: {
          credentials: {
            tenant_id: 'tenant-999',
            client_id: 'client-999',
            client_secret: 'secret-999',
            subscription_id: 'sub-999',
          },
        },
      };

      mockPrisma.cloudAccount.findUnique
        .mockResolvedValueOnce(mockAzureAccount)
        .mockResolvedValueOnce(account2);

      // Get credentials for two different accounts
      await AzureCredentialsService.getTokenCredential(VALID_ACCOUNT_ID);
      await AzureCredentialsService.getTokenCredential('account-2');

      const cache = (AzureCredentialsService as any).credentialCache;
      expect(cache.size).toBe(2);
      expect(cache.has(VALID_ACCOUNT_ID)).toBe(true);
      expect(cache.has('account-2')).toBe(true);
    });

    it('should propagate errors from getCredentials', async () => {
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(null);

      await expect(
        AzureCredentialsService.getTokenCredential('non-existent')
      ).rejects.toThrow('Cloud account not found');
    });
  });

  describe('validateCredentials', () => {
    it('should return true for valid credentials', async () => {
      const validCredentials = {
        tenantId: 'tenant-123',
        clientId: 'client-456',
        clientSecret: 'secret-789',
        subscriptionId: 'sub-abc',
      };

      const isValid = await AzureCredentialsService.validateCredentials(validCredentials);

      expect(isValid).toBe(true);
      expect(ClientSecretCredential).toHaveBeenCalledWith(
        'tenant-123',
        'client-456',
        'secret-789'
      );
    });

    it('should return false when token is expired', async () => {
      // Temporarily replace the mock to return expired token
      const { ClientSecretCredential: OriginalMock } = require('@azure/identity');
      OriginalMock.mockImplementationOnce((tenantId: string, clientId: string, clientSecret: string) => ({
        tenantId,
        clientId,
        clientSecret,
        getToken: jest.fn().mockResolvedValue({
          token: 'expired-token',
          expiresOnTimestamp: Date.now() - 1000, // Already expired
        }),
      }));

      const validCredentials = {
        tenantId: 'tenant-123',
        clientId: 'client-456',
        clientSecret: 'secret-789',
        subscriptionId: 'sub-abc',
      };

      const isValid = await AzureCredentialsService.validateCredentials(validCredentials);

      expect(isValid).toBe(false);
    });

    it('should return false when token is null', async () => {
      const { ClientSecretCredential: OriginalMock } = require('@azure/identity');
      OriginalMock.mockImplementationOnce((tenantId: string, clientId: string, clientSecret: string) => ({
        tenantId,
        clientId,
        clientSecret,
        getToken: jest.fn().mockResolvedValue(null),
      }));

      const validCredentials = {
        tenantId: 'tenant-123',
        clientId: 'client-456',
        clientSecret: 'secret-789',
        subscriptionId: 'sub-abc',
      };

      const isValid = await AzureCredentialsService.validateCredentials(validCredentials);

      expect(isValid).toBe(false);
    });

    it('should return false when authentication fails', async () => {
      const { ClientSecretCredential: OriginalMock } = require('@azure/identity');
      OriginalMock.mockImplementationOnce((tenantId: string, clientId: string, clientSecret: string) => ({
        tenantId,
        clientId,
        clientSecret,
        getToken: jest.fn().mockRejectedValue(new Error('Authentication failed')),
      }));

      const invalidCredentials = {
        tenantId: 'invalid-tenant',
        clientId: 'invalid-client',
        clientSecret: 'invalid-secret',
        subscriptionId: 'sub-abc',
      };

      const isValid = await AzureCredentialsService.validateCredentials(invalidCredentials);

      expect(isValid).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      const { ClientSecretCredential: OriginalMock } = require('@azure/identity');
      OriginalMock.mockImplementationOnce((tenantId: string, clientId: string, clientSecret: string) => ({
        tenantId,
        clientId,
        clientSecret,
        getToken: jest.fn().mockRejectedValue(new Error('Network timeout')),
      }));

      const credentials = {
        tenantId: 'tenant-123',
        clientId: 'client-456',
        clientSecret: 'secret-789',
        subscriptionId: 'sub-abc',
      };

      const isValid = await AzureCredentialsService.validateCredentials(credentials);

      expect(isValid).toBe(false);
    });

    it('should handle Azure SDK errors gracefully', async () => {
      const { ClientSecretCredential: OriginalMock } = require('@azure/identity');
      const azureError = new Error('AADSTS70011: Invalid scope');
      (azureError as any).statusCode = 400;

      OriginalMock.mockImplementationOnce((tenantId: string, clientId: string, clientSecret: string) => ({
        tenantId,
        clientId,
        clientSecret,
        getToken: jest.fn().mockRejectedValue(azureError),
      }));

      const credentials = {
        tenantId: 'tenant-123',
        clientId: 'client-456',
        clientSecret: 'secret-789',
        subscriptionId: 'sub-abc',
      };

      const isValid = await AzureCredentialsService.validateCredentials(credentials);

      expect(isValid).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear cache for specific account', async () => {
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(mockAzureAccount);

      // Create cached credential
      await AzureCredentialsService.getTokenCredential(VALID_ACCOUNT_ID);

      const cache = (AzureCredentialsService as any).credentialCache;
      expect(cache.has(VALID_ACCOUNT_ID)).toBe(true);

      // Clear cache
      AzureCredentialsService.clearCache(VALID_ACCOUNT_ID);

      expect(cache.has(VALID_ACCOUNT_ID)).toBe(false);
    });

    it('should only clear specified account, not others', async () => {
      const account2 = {
        ...mockAzureAccount,
        id: 'account-2',
        metadata: {
          credentials: {
            tenant_id: 'tenant-999',
            client_id: 'client-999',
            client_secret: 'secret-999',
            subscription_id: 'sub-999',
          },
        },
      };

      mockPrisma.cloudAccount.findUnique
        .mockResolvedValueOnce(mockAzureAccount)
        .mockResolvedValueOnce(account2);

      // Create cached credentials for two accounts
      await AzureCredentialsService.getTokenCredential(VALID_ACCOUNT_ID);
      await AzureCredentialsService.getTokenCredential('account-2');

      const cache = (AzureCredentialsService as any).credentialCache;
      expect(cache.size).toBe(2);

      // Clear only one account
      AzureCredentialsService.clearCache(VALID_ACCOUNT_ID);

      expect(cache.has(VALID_ACCOUNT_ID)).toBe(false);
      expect(cache.has('account-2')).toBe(true);
      expect(cache.size).toBe(1);
    });

    it('should handle clearing non-existent cache entry gracefully', () => {
      expect(() => {
        AzureCredentialsService.clearCache('non-existent-account');
      }).not.toThrow();
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cached credentials', async () => {
      const account2 = {
        ...mockAzureAccount,
        id: 'account-2',
        metadata: {
          credentials: {
            tenant_id: 'tenant-999',
            client_id: 'client-999',
            client_secret: 'secret-999',
            subscription_id: 'sub-999',
          },
        },
      };

      const account3 = {
        ...mockAzureAccount,
        id: 'account-3',
        metadata: {
          credentials: {
            tenant_id: 'tenant-888',
            client_id: 'client-888',
            client_secret: 'secret-888',
            subscription_id: 'sub-888',
          },
        },
      };

      mockPrisma.cloudAccount.findUnique
        .mockResolvedValueOnce(mockAzureAccount)
        .mockResolvedValueOnce(account2)
        .mockResolvedValueOnce(account3);

      // Create cached credentials for multiple accounts
      await AzureCredentialsService.getTokenCredential(VALID_ACCOUNT_ID);
      await AzureCredentialsService.getTokenCredential('account-2');
      await AzureCredentialsService.getTokenCredential('account-3');

      const cache = (AzureCredentialsService as any).credentialCache;
      expect(cache.size).toBe(3);

      // Clear all cache
      AzureCredentialsService.clearAllCache();

      expect(cache.size).toBe(0);
      expect(cache.has(VALID_ACCOUNT_ID)).toBe(false);
      expect(cache.has('account-2')).toBe(false);
      expect(cache.has('account-3')).toBe(false);
    });

    it('should handle clearing empty cache gracefully', () => {
      const cache = (AzureCredentialsService as any).credentialCache;
      expect(cache.size).toBe(0);

      expect(() => {
        AzureCredentialsService.clearAllCache();
      }).not.toThrow();

      expect(cache.size).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle database connection errors', async () => {
      mockPrisma.cloudAccount.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        AzureCredentialsService.getCredentials(VALID_ACCOUNT_ID)
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle malformed metadata JSON', async () => {
      const accountWithMalformedMetadata = {
        ...mockAzureAccount,
        metadata: 'not-an-object',
      };
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(accountWithMalformedMetadata);

      await expect(
        AzureCredentialsService.getCredentials(VALID_ACCOUNT_ID)
      ).rejects.toThrow(`No credentials found for account ${VALID_ACCOUNT_ID}`);
    });

    it('should handle empty string credentials', async () => {
      const accountWithEmptyCredentials = {
        ...mockAzureAccount,
        metadata: {
          credentials: {
            tenant_id: '',
            client_id: 'client-456',
            client_secret: 'secret-789',
            subscription_id: 'sub-abc',
          },
        },
      };
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(accountWithEmptyCredentials);

      await expect(
        AzureCredentialsService.getCredentials(VALID_ACCOUNT_ID)
      ).rejects.toThrow(`Invalid Azure credentials for account ${VALID_ACCOUNT_ID}`);
    });

    it('should handle credentials with extra fields', async () => {
      const accountWithExtraFields = {
        ...mockAzureAccount,
        metadata: {
          credentials: {
            tenant_id: 'tenant-123',
            client_id: 'client-456',
            client_secret: 'secret-789',
            subscription_id: 'sub-abc',
            extra_field: 'should-be-ignored',
          },
        },
      };
      mockPrisma.cloudAccount.findUnique.mockResolvedValue(accountWithExtraFields);

      const credentials = await AzureCredentialsService.getCredentials(VALID_ACCOUNT_ID);

      expect(credentials).toEqual({
        tenantId: 'tenant-123',
        clientId: 'client-456',
        clientSecret: 'secret-789',
        subscriptionId: 'sub-abc',
      });
    });
  });
});
