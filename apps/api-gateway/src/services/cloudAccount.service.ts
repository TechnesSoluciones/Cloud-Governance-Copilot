import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt, EncryptedData } from '../utils/encryption';

const prisma = new PrismaClient();

/**
 * Cloud Account credentials structure
 * Provider-specific credential formats
 */
export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  sessionToken?: string;
}

export interface AzureCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
}

export interface GCPCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export type CloudCredentials = AWSCredentials | AzureCredentials | GCPCredentials;

/**
 * Cloud Account creation DTO
 */
export interface CreateCloudAccountDto {
  tenantId: string;
  provider: 'aws' | 'azure' | 'gcp';
  accountName: string;
  accountIdentifier: string;
  credentials: CloudCredentials;
}

/**
 * Cloud Account response (without decrypted credentials)
 */
export interface CloudAccountResponse {
  id: string;
  tenantId: string;
  provider: string;
  accountName: string;
  accountIdentifier: string;
  status: string;
  lastSync: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cloud Account Service
 * Handles secure storage and retrieval of cloud provider credentials
 */
class CloudAccountService {
  /**
   * Create a new cloud account with encrypted credentials
   */
  async create(data: CreateCloudAccountDto): Promise<CloudAccountResponse> {
    const { tenantId, provider, accountName, accountIdentifier, credentials } = data;

    // Check if account already exists
    const existing = await prisma.cloudAccount.findUnique({
      where: {
        tenantId_provider_accountIdentifier: {
          tenantId,
          provider,
          accountIdentifier,
        },
      },
    });

    if (existing) {
      throw new Error(`Cloud account already exists: ${provider} - ${accountIdentifier}`);
    }

    // Validate credentials based on provider
    this.validateCredentials(provider, credentials);

    // Encrypt credentials as JSON
    const credentialsJson = JSON.stringify(credentials);
    const encrypted = encrypt(credentialsJson);

    // Store in database
    const account = await prisma.cloudAccount.create({
      data: {
        tenantId,
        provider,
        accountName,
        accountIdentifier,
        credentialsCiphertext: encrypted.ciphertext,
        credentialsIv: encrypted.iv,
        credentialsAuthTag: encrypted.authTag,
        status: 'active',
      },
    });

    return this.toResponse(account);
  }

  /**
   * Get cloud account by ID (without decrypted credentials)
   */
  async getById(accountId: string, tenantId: string): Promise<CloudAccountResponse | null> {
    const account = await prisma.cloudAccount.findFirst({
      where: {
        id: accountId,
        tenantId,
      },
    });

    if (!account) {
      return null;
    }

    return this.toResponse(account);
  }

  /**
   * Get all cloud accounts for a tenant
   */
  async listByTenant(tenantId: string): Promise<CloudAccountResponse[]> {
    const accounts = await prisma.cloudAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((account: any) => this.toResponse(account));
  }

  /**
   * Get decrypted credentials for a cloud account
   * Should only be called when actually needed (e.g., making API calls)
   */
  async getCredentials(accountId: string, tenantId: string): Promise<CloudCredentials> {
    const account = await prisma.cloudAccount.findFirst({
      where: {
        id: accountId,
        tenantId,
      },
    });

    if (!account) {
      throw new Error('Cloud account not found');
    }

    if (account.status !== 'active') {
      throw new Error(`Cloud account is not active: ${account.status}`);
    }

    // Decrypt credentials
    const encrypted: EncryptedData = {
      ciphertext: account.credentialsCiphertext,
      iv: account.credentialsIv,
      authTag: account.credentialsAuthTag,
    };

    try {
      const decryptedJson = decrypt(encrypted);
      const credentials = JSON.parse(decryptedJson) as CloudCredentials;
      return credentials;
    } catch (error: any) {
      throw new Error(`Failed to decrypt credentials: ${error.message}`);
    }
  }

  /**
   * Update cloud account credentials
   */
  async updateCredentials(
    accountId: string,
    tenantId: string,
    newCredentials: CloudCredentials
  ): Promise<CloudAccountResponse> {
    const account = await prisma.cloudAccount.findFirst({
      where: {
        id: accountId,
        tenantId,
      },
    });

    if (!account) {
      throw new Error('Cloud account not found');
    }

    // Validate new credentials
    this.validateCredentials(account.provider, newCredentials);

    // Encrypt new credentials
    const credentialsJson = JSON.stringify(newCredentials);
    const encrypted = encrypt(credentialsJson);

    // Update in database
    const updated = await prisma.cloudAccount.update({
      where: { id: accountId },
      data: {
        credentialsCiphertext: encrypted.ciphertext,
        credentialsIv: encrypted.iv,
        credentialsAuthTag: encrypted.authTag,
        updatedAt: new Date(),
      },
    });

    return this.toResponse(updated);
  }

  /**
   * Delete cloud account
   */
  async delete(accountId: string, tenantId: string): Promise<void> {
    const account = await prisma.cloudAccount.findFirst({
      where: {
        id: accountId,
        tenantId,
      },
    });

    if (!account) {
      throw new Error('Cloud account not found');
    }

    await prisma.cloudAccount.delete({
      where: { id: accountId },
    });
  }

  /**
   * Update last sync timestamp
   */
  async updateLastSync(accountId: string): Promise<void> {
    await prisma.cloudAccount.update({
      where: { id: accountId },
      data: { lastSync: new Date() },
    });
  }

  /**
   * Validate credentials based on provider
   */
  private validateCredentials(provider: string, credentials: CloudCredentials): void {
    switch (provider) {
      case 'aws':
        const aws = credentials as AWSCredentials;
        if (!aws.accessKeyId || !aws.secretAccessKey) {
          throw new Error('AWS credentials must include accessKeyId and secretAccessKey');
        }
        if (aws.accessKeyId.length < 16 || aws.secretAccessKey.length < 40) {
          throw new Error('Invalid AWS credential format');
        }
        break;

      case 'azure':
        const azure = credentials as AzureCredentials;
        if (!azure.tenantId || !azure.clientId || !azure.clientSecret || !azure.subscriptionId) {
          throw new Error(
            'Azure credentials must include tenantId, clientId, clientSecret, and subscriptionId'
          );
        }
        break;

      case 'gcp':
        const gcp = credentials as GCPCredentials;
        if (!gcp.projectId || !gcp.clientEmail || !gcp.privateKey) {
          throw new Error('GCP credentials must include projectId, clientEmail, and privateKey');
        }
        if (!gcp.clientEmail.includes('@') || !gcp.privateKey.includes('BEGIN PRIVATE KEY')) {
          throw new Error('Invalid GCP credential format');
        }
        break;

      default:
        throw new Error(`Unsupported cloud provider: ${provider}`);
    }
  }

  /**
   * Convert database model to response DTO (excludes encrypted fields)
   */
  private toResponse(account: any): CloudAccountResponse {
    return {
      id: account.id,
      tenantId: account.tenantId,
      provider: account.provider,
      accountName: account.accountName,
      accountIdentifier: account.accountIdentifier,
      status: account.status,
      lastSync: account.lastSync,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  /**
   * Test cloud account connection
   * Returns true if credentials are valid
   */
  async testConnection(accountId: string, tenantId: string): Promise<boolean> {
    try {
      const credentials = await this.getCredentials(accountId, tenantId);
      const account = await this.getById(accountId, tenantId);

      if (!account) {
        return false;
      }

      // TODO: Implement actual cloud provider SDK calls
      // For now, just verify we can decrypt credentials
      switch (account.provider) {
        case 'aws':
          const aws = credentials as AWSCredentials;
          return !!(aws.accessKeyId && aws.secretAccessKey);

        case 'azure':
          const azure = credentials as AzureCredentials;
          return !!(azure.tenantId && azure.clientId && azure.clientSecret);

        case 'gcp':
          const gcp = credentials as GCPCredentials;
          return !!(gcp.projectId && gcp.clientEmail && gcp.privateKey);

        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }
}

export default new CloudAccountService();
