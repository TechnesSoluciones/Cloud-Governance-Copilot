/**
 * Alert Rules Management Service
 *
 * High-level service that orchestrates alert rule operations across
 * multiple cloud providers. Manages credentials, caching, and provides
 * a unified interface for alert rule management.
 *
 * @module alert-rules/services
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { AzureAlertRulesService, AlertRule, AlertRuleConfig, AlertRuleTemplate } from '../../../integrations/azure/alert-rules.service';
import type { CloudProviderCredentials } from '../../../integrations/cloud-provider.interface';

/**
 * Alert Rules Management Service
 *
 * Provides high-level operations for managing alert rules across cloud providers.
 *
 * @example
 * ```typescript
 * const service = new AlertRulesManagementService();
 *
 * // Get all alert rules for an account
 * const rules = await service.getAlertRules('account-id', 'tenant-id');
 *
 * // Create new alert rule
 * const newRule = await service.createAlertRule('account-id', 'tenant-id', config);
 * ```
 */
export class AlertRulesManagementService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Gets all alert rules for a cloud account
   *
   * @param accountId - Cloud account ID
   * @param tenantId - Tenant ID (for authorization)
   * @returns Array of alert rules
   */
  async getAlertRules(accountId: string, tenantId: string): Promise<AlertRule[]> {
    try {
      // Fetch cloud account with credentials
      const account = await this.prisma.cloudAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error('Cloud account not found');
      }

      // Verify tenant ownership
      if (account.tenantId !== tenantId) {
        throw new Error('Unauthorized: Account does not belong to tenant');
      }

      // Get credentials
      const credentials = await this.getAccountCredentials(accountId);

      // Initialize provider-specific service
      if (account.provider === 'azure') {
        const alertRulesService = new AzureAlertRulesService(credentials);
        return await alertRulesService.getAlertRules(accountId);
      } else {
        throw new Error(`Provider ${account.provider} not supported for alert rules`);
      }
    } catch (error) {
      console.error('[AlertRulesManagementService] Failed to get alert rules:', error);
      throw error;
    }
  }

  /**
   * Creates a new alert rule
   *
   * @param accountId - Cloud account ID
   * @param tenantId - Tenant ID (for authorization)
   * @param config - Alert rule configuration
   * @returns Created alert rule
   */
  async createAlertRule(
    accountId: string,
    tenantId: string,
    config: AlertRuleConfig
  ): Promise<AlertRule> {
    try {
      // Fetch cloud account
      const account = await this.prisma.cloudAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error('Cloud account not found');
      }

      // Verify tenant ownership
      if (account.tenantId !== tenantId) {
        throw new Error('Unauthorized: Account does not belong to tenant');
      }

      // Get credentials
      const credentials = await this.getAccountCredentials(accountId);

      // Initialize provider-specific service
      if (account.provider === 'azure') {
        const alertRulesService = new AzureAlertRulesService(credentials);
        return await alertRulesService.createAlertRule(accountId, config);
      } else {
        throw new Error(`Provider ${account.provider} not supported for alert rules`);
      }
    } catch (error) {
      console.error('[AlertRulesManagementService] Failed to create alert rule:', error);
      throw error;
    }
  }

  /**
   * Updates an existing alert rule
   *
   * @param ruleId - Alert rule ID
   * @param accountId - Cloud account ID
   * @param tenantId - Tenant ID (for authorization)
   * @param config - Partial alert rule configuration
   * @returns Updated alert rule
   */
  async updateAlertRule(
    ruleId: string,
    accountId: string,
    tenantId: string,
    config: Partial<AlertRuleConfig>
  ): Promise<AlertRule> {
    try {
      // Fetch cloud account
      const account = await this.prisma.cloudAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error('Cloud account not found');
      }

      // Verify tenant ownership
      if (account.tenantId !== tenantId) {
        throw new Error('Unauthorized: Account does not belong to tenant');
      }

      // Get credentials
      const credentials = await this.getAccountCredentials(accountId);

      // Initialize provider-specific service
      if (account.provider === 'azure') {
        const alertRulesService = new AzureAlertRulesService(credentials);
        return await alertRulesService.updateAlertRule(ruleId, config);
      } else {
        throw new Error(`Provider ${account.provider} not supported for alert rules`);
      }
    } catch (error) {
      console.error('[AlertRulesManagementService] Failed to update alert rule:', error);
      throw error;
    }
  }

  /**
   * Deletes an alert rule
   *
   * @param ruleId - Alert rule ID
   * @param accountId - Cloud account ID
   * @param tenantId - Tenant ID (for authorization)
   */
  async deleteAlertRule(ruleId: string, accountId: string, tenantId: string): Promise<void> {
    try {
      // Fetch cloud account
      const account = await this.prisma.cloudAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error('Cloud account not found');
      }

      // Verify tenant ownership
      if (account.tenantId !== tenantId) {
        throw new Error('Unauthorized: Account does not belong to tenant');
      }

      // Get credentials
      const credentials = await this.getAccountCredentials(accountId);

      // Initialize provider-specific service
      if (account.provider === 'azure') {
        const alertRulesService = new AzureAlertRulesService(credentials);
        await alertRulesService.deleteAlertRule(ruleId);
      } else {
        throw new Error(`Provider ${account.provider} not supported for alert rules`);
      }
    } catch (error) {
      console.error('[AlertRulesManagementService] Failed to delete alert rule:', error);
      throw error;
    }
  }

  /**
   * Gets alert rule templates
   *
   * @param provider - Cloud provider (optional, defaults to 'azure')
   * @returns Array of alert rule templates
   */
  async getAlertRuleTemplates(provider: string = 'azure'): Promise<AlertRuleTemplate[]> {
    try {
      if (provider === 'azure') {
        // Note: This doesn't require credentials, so we create a dummy instance
        const credentials: CloudProviderCredentials = {
          provider: 'azure',
          azureClientId: 'dummy',
          azureClientSecret: 'dummy',
          azureTenantId: 'dummy',
          azureSubscriptionId: 'dummy',
        };
        const alertRulesService = new AzureAlertRulesService(credentials);
        return await alertRulesService.getAlertRuleTemplates();
      } else {
        throw new Error(`Provider ${provider} not supported for alert rule templates`);
      }
    } catch (error) {
      console.error('[AlertRulesManagementService] Failed to get alert rule templates:', error);
      throw error;
    }
  }

  /**
   * Gets a specific alert rule template
   *
   * @param templateId - Template ID
   * @param provider - Cloud provider (optional)
   * @returns Alert rule template or null
   */
  async getAlertRuleTemplate(
    templateId: string,
    provider: string = 'azure'
  ): Promise<AlertRuleTemplate | null> {
    try {
      if (provider === 'azure') {
        const credentials: CloudProviderCredentials = {
          provider: 'azure',
          azureClientId: 'dummy',
          azureClientSecret: 'dummy',
          azureTenantId: 'dummy',
          azureSubscriptionId: 'dummy',
        };
        const alertRulesService = new AzureAlertRulesService(credentials);
        return await alertRulesService.getAlertRuleTemplate(templateId);
      } else {
        throw new Error(`Provider ${provider} not supported for alert rule templates`);
      }
    } catch (error) {
      console.error('[AlertRulesManagementService] Failed to get alert rule template:', error);
      throw error;
    }
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

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
    });

    if (!account) {
      throw new Error('Cloud account not found');
    }

    const credentials = account as any;

    if (account.provider === 'azure') {
      return {
        provider: 'azure',
        azureClientId: credentials.clientId,
        azureClientSecret: credentials.clientSecret,
        azureTenantId: credentials.tenantId,
        azureSubscriptionId: credentials.subscriptionId,
      };
    } else if (account.provider === 'aws') {
      return {
        provider: 'aws',
        awsAccessKeyId: credentials.accessKeyId,
        awsSecretAccessKey: credentials.secretAccessKey,
        awsRegion: credentials.region,
      };
    } else {
      throw new Error(`Unsupported provider: ${account.provider}`);
    }
  }

  /**
   * Cleanup resources
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
