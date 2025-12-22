/**
 * Azure Credentials Service
 * Manages Azure credentials and authentication for cloud accounts
 */

import { ClientSecretCredential, TokenCredential } from '@azure/identity';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AzureCredentials } from '../../config/azure.config';
import { decrypt, EncryptedData } from '../../utils/encryption';
/**
 * Service for managing Azure credentials
 */
export class AzureCredentialsService {
  private static credentialCache = new Map<string, {
    credential: TokenCredential;
    expiresAt: Date;
  }>();

  /**
   * Get Azure credentials for a cloud account
   * @param accountId - Cloud account ID
   * @returns Azure credentials
   */
  static async getCredentials(accountId: string): Promise<AzureCredentials> {
    const account = await prisma.cloudAccount.findUnique({
      where: { id: accountId },
      include: { tenant: true },
    });

    if (!account) {
      throw new Error(`Cloud account not found: ${accountId}`);
    }

    if (account.provider !== 'azure' && account.provider !== 'AZURE') {
      throw new Error(`Account ${accountId} is not an Azure account`);
    }

    if (account.status !== 'active') {
      throw new Error(`Cloud account is not active: ${account.status}`);
    }

    // Decrypt credentials from encrypted fields
    const encrypted: EncryptedData = {
      ciphertext: account.credentialsCiphertext,
      iv: account.credentialsIv,
      authTag: account.credentialsAuthTag,
    };

    try {
      const decryptedJson = decrypt(encrypted);
      const credentials = JSON.parse(decryptedJson);

      // Validate required Azure fields
      if (!credentials.tenantId || !credentials.clientId || !credentials.clientSecret || !credentials.subscriptionId) {
        throw new Error(`Invalid Azure credentials for account ${accountId}: missing required fields`);
      }

      return {
        tenantId: credentials.tenantId,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        subscriptionId: credentials.subscriptionId,
      };
    } catch (error: any) {
      throw new Error(`Failed to decrypt credentials for account ${accountId}: ${error.message}`);
    }
  }

  /**
   * Get Azure TokenCredential for SDK authentication
   * Caches credentials to avoid re-creating them
   * @param accountId - Cloud account ID
   * @returns TokenCredential for Azure SDK
   */
  static async getTokenCredential(accountId: string): Promise<TokenCredential> {
    // Check cache first (credentials valid for 1 hour)
    const cached = this.credentialCache.get(accountId);
    if (cached && cached.expiresAt > new Date()) {
      return cached.credential;
    }

    // Get fresh credentials
    const creds = await this.getCredentials(accountId);

    const credential = new ClientSecretCredential(
      creds.tenantId,
      creds.clientId,
      creds.clientSecret
    );

    // Cache for 1 hour
    this.credentialCache.set(accountId, {
      credential,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    });

    return credential;
  }

  /**
   * Validate Azure credentials by attempting to authenticate
   * @param credentials - Azure credentials to validate
   * @returns true if credentials are valid
   */
  static async validateCredentials(credentials: AzureCredentials): Promise<boolean> {
    try {
      const credential = new ClientSecretCredential(
        credentials.tenantId,
        credentials.clientId,
        credentials.clientSecret
      );

      // Attempt to get a token to validate credentials
      const token = await credential.getToken('https://management.azure.com/.default');

      return !!token && token.expiresOnTimestamp > Date.now();
    } catch (error) {
      console.error('Azure credential validation failed:', error);
      return false;
    }
  }

  /**
   * Clear cached credential for an account
   * @param accountId - Cloud account ID
   */
  static clearCache(accountId: string): void {
    this.credentialCache.delete(accountId);
  }

  /**
   * Clear all cached credentials
   */
  static clearAllCache(): void {
    this.credentialCache.clear();
  }
}
