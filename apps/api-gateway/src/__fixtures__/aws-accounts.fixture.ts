/**
 * Test Fixtures: AWS Cloud Accounts
 *
 * Provides reusable AWS account data with encrypted credentials
 * for testing cloud provider integration and tenant isolation.
 */

import { CloudAccount } from '@prisma/client';
import crypto from 'crypto';
import { encrypt } from '../utils/encryption';
import { tenantAData, tenantBData, tenantCData } from './tenants.fixture';

/**
 * Generate encrypted AWS credentials for testing
 * Uses real encryption to test the full encryption/decryption flow
 */
function generateEncryptedAWSCredentials(accessKeyId: string, secretAccessKey: string) {
  // Ensure we have a valid encryption key (32 bytes when decoded from base64)
  if (!process.env.ENCRYPTION_KEY) {
    // Generate a valid 32-byte encryption key for testing
    const testKey = crypto.randomBytes(32);
    process.env.ENCRYPTION_KEY = testKey.toString('base64');
  } else {
    // Validate existing key
    try {
      const keyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'base64');
      if (keyBuffer.length !== 32) {
        console.warn(`[Fixtures] Invalid ENCRYPTION_KEY length: ${keyBuffer.length} bytes, regenerating...`);
        const testKey = crypto.randomBytes(32);
        process.env.ENCRYPTION_KEY = testKey.toString('base64');
      }
    } catch (error) {
      console.warn('[Fixtures] Invalid ENCRYPTION_KEY format, regenerating...');
      const testKey = crypto.randomBytes(32);
      process.env.ENCRYPTION_KEY = testKey.toString('base64');
    }
  }

  const credentials = {
    accessKeyId,
    secretAccessKey,
    region: 'us-east-1',
  };

  const encrypted = encrypt(JSON.stringify(credentials));

  return {
    credentialsCiphertext: encrypted.ciphertext,
    credentialsIv: encrypted.iv,
    credentialsAuthTag: encrypted.authTag,
  };
}

/**
 * AWS Account for Tenant A
 */
export const awsAccountTenantA = {
  id: '20000000-0000-4000-a000-000000000001',
  tenantId: tenantAData.id,
  provider: 'aws',
  accountName: 'Tenant A Production AWS',
  accountIdentifier: '111111111111',
  ...generateEncryptedAWSCredentials(
    'AKIAIOSFODNN7TENANTA1',
    'wJalrXUtnFEMI/K7MDENG/bPxRfiCYTENANTA1KEY'
  ),
  status: 'active',
  lastSync: null,
  metadata: {
    environment: 'production',
    region: 'us-east-1',
  },
} as const;

/**
 * Second AWS Account for Tenant A (multi-account scenario)
 */
export const awsAccountTenantA2 = {
  id: '20000000-0000-4000-a000-000000000002',
  tenantId: tenantAData.id,
  provider: 'aws',
  accountName: 'Tenant A Development AWS',
  accountIdentifier: '111111111112',
  ...generateEncryptedAWSCredentials(
    'AKIAIOSFODNN7TENANTA2',
    'wJalrXUtnFEMI/K7MDENG/bPxRfiCYTENANTA2KEY'
  ),
  status: 'active',
  lastSync: null,
  metadata: {
    environment: 'development',
    region: 'us-west-2',
  },
} as const;

/**
 * AWS Account for Tenant B
 */
export const awsAccountTenantB = {
  id: '20000000-0000-4000-b000-000000000001',
  tenantId: tenantBData.id,
  provider: 'aws',
  accountName: 'Tenant B Production AWS',
  accountIdentifier: '222222222222',
  ...generateEncryptedAWSCredentials(
    'AKIAIOSFODNN7TENANTB1',
    'wJalrXUtnFEMI/K7MDENG/bPxRfiCYTENANTB1KEY'
  ),
  status: 'active',
  lastSync: null,
  metadata: {
    environment: 'production',
    region: 'eu-west-1',
  },
} as const;

/**
 * AWS Account for Tenant C
 */
export const awsAccountTenantC = {
  id: '20000000-0000-4000-c000-000000000001',
  tenantId: tenantCData.id,
  provider: 'aws',
  accountName: 'Tenant C Production AWS',
  accountIdentifier: '333333333333',
  ...generateEncryptedAWSCredentials(
    'AKIAIOSFODNN7TENANTC1',
    'wJalrXUtnFEMI/K7MDENG/bPxRfiCYTENANTC1KEY'
  ),
  status: 'active',
  lastSync: null,
  metadata: {
    environment: 'production',
    region: 'ap-southeast-1',
  },
} as const;

/**
 * Inactive AWS Account for testing edge cases
 */
export const awsAccountInactive = {
  id: '20000000-0000-4000-a000-000000000099',
  tenantId: tenantAData.id,
  provider: 'aws',
  accountName: 'Tenant A Inactive AWS',
  accountIdentifier: '111111111199',
  ...generateEncryptedAWSCredentials(
    'AKIAIOSFODNN7INACTIVE',
    'wJalrXUtnFEMI/K7MDENG/bPxRfiCYINACTIVEKEY'
  ),
  status: 'inactive',
  lastSync: null,
  metadata: {
    environment: 'archived',
    region: 'us-east-1',
  },
} as const;

/**
 * All AWS account fixtures for bulk operations
 */
export const allAWSAccounts = [
  awsAccountTenantA,
  awsAccountTenantA2,
  awsAccountTenantB,
  awsAccountTenantC,
  awsAccountInactive,
] as const;
