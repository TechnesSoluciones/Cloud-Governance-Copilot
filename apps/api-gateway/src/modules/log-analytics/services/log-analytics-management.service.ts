/**
 * Log Analytics Management Service
 *
 * High-level service that orchestrates log analytics operations across
 * cloud providers. Manages credentials, query history, and provides
 * a unified interface for KQL query execution.
 *
 * @module log-analytics/services
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import {
  AzureLogAnalyticsService,
  QueryResult,
  SavedQuery,
  Timespan,
  PreBuiltQueryName
} from '../../../integrations/azure/log-analytics.service';
import type { CloudProviderCredentials } from '../../../integrations/cloud-provider.interface';

/**
 * Log Analytics Management Service
 *
 * @example
 * ```typescript
 * const service = new LogAnalyticsManagementService();
 *
 * // Execute custom query
 * const result = await service.executeQuery(
 *   'account-id',
 *   'tenant-id',
 *   'workspace-id',
 *   'AzureActivity | summarize count()',
 *   { type: '24h' }
 * );
 * ```
 */
export class LogAnalyticsManagementService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Executes a custom KQL query
   *
   * @param accountId - Cloud account ID
   * @param tenantId - Tenant ID (for authorization)
   * @param workspaceId - Log Analytics workspace ID
   * @param query - KQL query string
   * @param timespan - Time range
   * @param options - Query execution options
   * @returns Query result
   */
  async executeQuery(
    accountId: string,
    tenantId: string,
    workspaceId: string,
    query: string,
    timespan: Timespan,
    options?: { timeout?: number; maxRows?: number }
  ): Promise<QueryResult> {
    try {
      // Fetch and verify account
      const account = await this.getAndVerifyAccount(accountId, tenantId);

      // Get credentials
      const credentials = await this.getAccountCredentials(accountId);

      // Initialize service
      if (account.provider === 'azure') {
        const service = new AzureLogAnalyticsService(credentials);
        return await service.executeKQLQuery(accountId, workspaceId, query, timespan, options);
      } else {
        throw new Error(`Provider ${account.provider} not supported for log analytics`);
      }
    } catch (error) {
      console.error('[LogAnalyticsManagementService] Failed to execute query:', error);
      throw error;
    }
  }

  /**
   * Executes a pre-built query
   *
   * @param accountId - Cloud account ID
   * @param tenantId - Tenant ID (for authorization)
   * @param workspaceId - Log Analytics workspace ID
   * @param queryName - Pre-built query name
   * @param params - Query parameters
   * @returns Query result
   */
  async executePreBuiltQuery(
    accountId: string,
    tenantId: string,
    workspaceId: string,
    queryName: PreBuiltQueryName,
    params?: Record<string, any>
  ): Promise<QueryResult> {
    try {
      // Fetch and verify account
      const account = await this.getAndVerifyAccount(accountId, tenantId);

      // Get credentials
      const credentials = await this.getAccountCredentials(accountId);

      // Initialize service
      if (account.provider === 'azure') {
        const service = new AzureLogAnalyticsService(credentials);
        return await service.getPreBuiltQuery(accountId, workspaceId, queryName, params);
      } else {
        throw new Error(`Provider ${account.provider} not supported for log analytics`);
      }
    } catch (error) {
      console.error('[LogAnalyticsManagementService] Failed to execute pre-built query:', error);
      throw error;
    }
  }

  /**
   * Gets query history for an account
   *
   * @param accountId - Cloud account ID
   * @param tenantId - Tenant ID (for authorization)
   * @returns Array of saved queries
   */
  async getQueryHistory(accountId: string, tenantId: string): Promise<SavedQuery[]> {
    try {
      // Verify account ownership
      await this.getAndVerifyAccount(accountId, tenantId);

      // Fetch query history
      const queries = await this.prisma.logAnalyticsQuery.findMany({
        where: {
          tenantId,
          accountId,
        },
        orderBy: {
          lastExecuted: 'desc',
        },
      });

      return queries.map((q) => ({
        id: q.id,
        tenantId: q.tenantId,
        accountId: q.accountId,
        name: q.name,
        query: q.query,
        description: q.description || undefined,
        createdBy: q.createdBy || undefined,
        lastExecuted: q.lastExecuted || undefined,
        executionCount: q.executionCount,
        createdAt: q.createdAt,
      }));
    } catch (error) {
      console.error('[LogAnalyticsManagementService] Failed to get query history:', error);
      throw error;
    }
  }

  /**
   * Saves a query for future use
   *
   * @param accountId - Cloud account ID
   * @param tenantId - Tenant ID (for authorization)
   * @param userId - User ID (who created the query)
   * @param name - Query name
   * @param query - KQL query string
   * @param description - Optional description
   * @returns Saved query
   */
  async saveQuery(
    accountId: string,
    tenantId: string,
    userId: string,
    name: string,
    query: string,
    description?: string
  ): Promise<SavedQuery> {
    try {
      // Verify account ownership
      await this.getAndVerifyAccount(accountId, tenantId);

      // Check if query with same name exists
      const existing = await this.prisma.logAnalyticsQuery.findFirst({
        where: {
          tenantId,
          accountId,
          name,
        },
      });

      if (existing) {
        throw new Error(`Query with name "${name}" already exists for this account`);
      }

      // Save query
      const savedQuery = await this.prisma.logAnalyticsQuery.create({
        data: {
          tenantId,
          accountId,
          name,
          query,
          description,
          createdBy: userId,
          executionCount: 0,
        },
      });

      console.log(`[LogAnalyticsManagementService] Saved query: ${name} (ID: ${savedQuery.id})`);

      return {
        id: savedQuery.id,
        tenantId: savedQuery.tenantId,
        accountId: savedQuery.accountId,
        name: savedQuery.name,
        query: savedQuery.query,
        description: savedQuery.description || undefined,
        createdBy: savedQuery.createdBy || undefined,
        lastExecuted: savedQuery.lastExecuted || undefined,
        executionCount: savedQuery.executionCount,
        createdAt: savedQuery.createdAt,
      };
    } catch (error) {
      console.error('[LogAnalyticsManagementService] Failed to save query:', error);
      throw error;
    }
  }

  /**
   * Deletes a saved query
   *
   * @param queryId - Query ID
   * @param tenantId - Tenant ID (for authorization)
   */
  async deleteQuery(queryId: string, tenantId: string): Promise<void> {
    try {
      const query = await this.prisma.logAnalyticsQuery.findUnique({
        where: { id: queryId },
      });

      if (!query) {
        throw new Error('Query not found');
      }

      if (query.tenantId !== tenantId) {
        throw new Error('Unauthorized: Query does not belong to tenant');
      }

      await this.prisma.logAnalyticsQuery.delete({
        where: { id: queryId },
      });

      console.log(`[LogAnalyticsManagementService] Deleted query: ${queryId}`);
    } catch (error) {
      console.error('[LogAnalyticsManagementService] Failed to delete query:', error);
      throw error;
    }
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Gets and verifies cloud account ownership
   *
   * @param accountId - Cloud account ID
   * @param tenantId - Tenant ID
   * @returns Cloud account
   * @private
   */
  private async getAndVerifyAccount(accountId: string, tenantId: string) {
    const account = await this.prisma.cloudAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Cloud account not found');
    }

    if (account.tenantId !== tenantId) {
      throw new Error('Unauthorized: Account does not belong to tenant');
    }

    return account;
  }

  /**
   * Gets cloud account credentials
   *
   * @param accountId - Cloud account ID
   * @returns Cloud provider credentials
   * @private
   */
  private async getAccountCredentials(accountId: string): Promise<CloudProviderCredentials> {
    const account = await this.prisma.cloudAccount.findUnique({
      where: { id: accountId },
      select: {
        provider: true,
        credentialsCiphertext: true,
        credentialsIv: true,
        credentialsAuthTag: true,
      },
    });

    if (!account) {
      throw new Error('Cloud account not found');
    }

    // NOTE: In production, decrypt credentials here
    // For now, assuming credentials are stored in a mock format
    const credentials: any = JSON.parse(account.credentialsCiphertext || '{}');

    if (account.provider === 'azure') {
      return {
        provider: 'azure',
        azureClientId: credentials.clientId,
        azureClientSecret: credentials.clientSecret,
        azureTenantId: credentials.tenantId,
        azureSubscriptionId: credentials.subscriptionId,
      };
    } /* AWS TEMPORALMENTE DESHABILITADO - Azure-only mode (v1.6.0)
    else if (account.provider === 'aws') {
      return {
        provider: 'aws',
        awsAccessKeyId: credentials.accessKeyId,
        awsSecretAccessKey: credentials.secretAccessKey,
        awsRegion: credentials.region,
      };
    } */ else {
      throw new Error(`Only 'azure' is currently supported. Provider: ${account.provider}`);
    }
  }

  /**
   * Cleanup resources
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
