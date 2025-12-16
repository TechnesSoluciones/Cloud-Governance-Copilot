/**
 * Azure Alert Rules Service
 *
 * Manages Azure Monitor alert rules including metric alerts, log alerts,
 * and activity log alerts. Provides CRUD operations and pre-built templates
 * for common alerting scenarios.
 *
 * Features:
 * - List all alert rules in subscription
 * - Create new alert rules (metric, log, activity log)
 * - Update existing alert rules
 * - Delete alert rules
 * - Pre-built alert rule templates
 * - Support for action groups
 *
 * @module integrations/azure/alert-rules.service
 */

import { MonitorClient } from '@azure/arm-monitor';
import { ClientSecretCredential } from '@azure/identity';
import type { CloudProviderCredentials } from '../cloud-provider.interface';

/**
 * Azure Alert Rules configuration
 */
interface AzureAlertRulesConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  subscriptionId: string;
}

/**
 * Alert rule severity levels
 * 0 = Critical, 1 = Error, 2 = Warning, 3 = Informational, 4 = Verbose
 */
export type AlertSeverity = 0 | 1 | 2 | 3 | 4;

/**
 * Alert rule types
 */
export type AlertRuleType = 'metric' | 'log' | 'activityLog';

/**
 * Alert rule condition operators
 */
export type AlertOperator = 'GreaterThan' | 'LessThan' | 'GreaterThanOrEqual' | 'LessThanOrEqual' | 'Equals';

/**
 * Metric aggregation types
 */
export type AggregationType = 'Average' | 'Maximum' | 'Minimum' | 'Total' | 'Count';

/**
 * Alert rule configuration
 */
export interface AlertRuleConfig {
  name: string;
  description?: string;
  enabled: boolean;
  severity: AlertSeverity;
  targetResourceId: string; // Resource to monitor
  resourceGroupName: string; // Resource group containing the rule
  condition: AlertCondition;
  actionGroupIds?: string[]; // Action group resource IDs
  evaluationFrequency?: string; // ISO 8601 duration (e.g., 'PT5M' = 5 minutes)
  windowSize?: string; // ISO 8601 duration (e.g., 'PT15M' = 15 minutes)
  autoMitigate?: boolean; // Auto-resolve when condition no longer met
}

/**
 * Alert condition configuration
 */
export interface AlertCondition {
  type: AlertRuleType;
  // For metric alerts
  metricName?: string;
  metricNamespace?: string;
  operator?: AlertOperator;
  threshold?: number;
  aggregation?: AggregationType;
  // For log alerts
  query?: string;
  // For activity log alerts
  category?: string;
  operationName?: string;
  level?: 'Critical' | 'Error' | 'Warning' | 'Informational';
}

/**
 * Alert rule response
 */
export interface AlertRule {
  id: string;
  name: string;
  type: AlertRuleType;
  description?: string;
  enabled: boolean;
  severity: AlertSeverity;
  targetResourceId: string;
  condition: string; // Serialized condition
  actionGroups: string[];
  evaluationFrequency?: string;
  windowSize?: string;
  autoMitigate: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Alert rule template
 */
export interface AlertRuleTemplate {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'cost' | 'security' | 'availability';
  config: Partial<AlertRuleConfig>;
}

/**
 * Pre-built alert rule templates
 */
const ALERT_RULE_TEMPLATES: AlertRuleTemplate[] = [
  {
    id: 'high-cpu',
    name: 'High CPU Usage',
    description: 'Alert when CPU usage exceeds 80% for 15 minutes',
    category: 'performance',
    config: {
      name: 'High CPU Alert',
      enabled: true,
      severity: 2,
      condition: {
        type: 'metric',
        metricName: 'Percentage CPU',
        metricNamespace: 'Microsoft.Compute/virtualMachines',
        operator: 'GreaterThan',
        threshold: 80,
        aggregation: 'Average',
      },
      evaluationFrequency: 'PT5M',
      windowSize: 'PT15M',
      autoMitigate: true,
    },
  },
  {
    id: 'high-memory',
    name: 'High Memory Usage',
    description: 'Alert when available memory is less than 10% for 10 minutes',
    category: 'performance',
    config: {
      name: 'High Memory Alert',
      enabled: true,
      severity: 2,
      condition: {
        type: 'metric',
        metricName: 'Available Memory Bytes',
        metricNamespace: 'Microsoft.Compute/virtualMachines',
        operator: 'LessThan',
        threshold: 1073741824, // 1GB in bytes
        aggregation: 'Average',
      },
      evaluationFrequency: 'PT5M',
      windowSize: 'PT10M',
      autoMitigate: true,
    },
  },
  {
    id: 'low-disk-space',
    name: 'Low Disk Space',
    description: 'Alert when disk space is less than 10%',
    category: 'performance',
    config: {
      name: 'Low Disk Space Alert',
      enabled: true,
      severity: 1,
      condition: {
        type: 'metric',
        metricName: 'OS Disk Queue Depth',
        metricNamespace: 'Microsoft.Compute/virtualMachines',
        operator: 'GreaterThan',
        threshold: 10,
        aggregation: 'Average',
      },
      evaluationFrequency: 'PT5M',
      windowSize: 'PT15M',
      autoMitigate: true,
    },
  },
  {
    id: 'cost-exceeded',
    name: 'Cost Threshold Exceeded',
    description: 'Alert when monthly cost exceeds specified amount',
    category: 'cost',
    config: {
      name: 'Cost Alert',
      enabled: true,
      severity: 1,
      condition: {
        type: 'log',
        query: `
AzureActivity
| where OperationNameValue contains "Microsoft.Consumption/budgets"
| where ActivityStatusValue == "Success"
        `.trim(),
      },
      evaluationFrequency: 'PT1H',
      windowSize: 'PT6H',
      autoMitigate: false,
    },
  },
  {
    id: 'failed-logins',
    name: 'Multiple Failed Login Attempts',
    description: 'Alert when more than 5 failed login attempts detected',
    category: 'security',
    config: {
      name: 'Failed Login Alert',
      enabled: true,
      severity: 0,
      condition: {
        type: 'log',
        query: `
SecurityEvent
| where EventID == 4625
| where TimeGenerated > ago(15m)
| summarize FailedAttempts = count() by Account
| where FailedAttempts > 5
        `.trim(),
      },
      evaluationFrequency: 'PT5M',
      windowSize: 'PT15M',
      autoMitigate: false,
    },
  },
  {
    id: 'vm-availability',
    name: 'Virtual Machine Unavailable',
    description: 'Alert when VM becomes unavailable',
    category: 'availability',
    config: {
      name: 'VM Availability Alert',
      enabled: true,
      severity: 0,
      condition: {
        type: 'metric',
        metricName: 'VmAvailabilityMetric',
        metricNamespace: 'Microsoft.Compute/virtualMachines',
        operator: 'LessThan',
        threshold: 1,
        aggregation: 'Average',
      },
      evaluationFrequency: 'PT1M',
      windowSize: 'PT5M',
      autoMitigate: true,
    },
  },
];

/**
 * Azure Alert Rules Service
 *
 * @example
 * ```typescript
 * const alertRulesService = new AzureAlertRulesService({
 *   provider: 'azure',
 *   azureClientId: process.env.AZURE_CLIENT_ID!,
 *   azureClientSecret: process.env.AZURE_CLIENT_SECRET!,
 *   azureTenantId: process.env.AZURE_TENANT_ID!,
 *   azureSubscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
 * });
 *
 * // List all alert rules
 * const rules = await alertRulesService.getAlertRules('account-123');
 *
 * // Create alert rule from template
 * const template = await alertRulesService.getAlertRuleTemplates();
 * const newRule = await alertRulesService.createAlertRule('account-123', {
 *   ...template[0].config,
 *   targetResourceId: '/subscriptions/.../virtualMachines/vm1',
 *   resourceGroupName: 'my-rg',
 * });
 * ```
 */
export class AzureAlertRulesService {
  private monitorClient: MonitorClient;
  private credential: ClientSecretCredential;
  private config: AzureAlertRulesConfig;

  /**
   * Creates a new Azure Alert Rules Service instance
   *
   * @param credentials - Cloud provider credentials
   * @throws {Error} If Azure credentials are missing
   */
  constructor(credentials: CloudProviderCredentials) {
    if (
      !credentials.azureClientId ||
      !credentials.azureClientSecret ||
      !credentials.azureTenantId ||
      !credentials.azureSubscriptionId
    ) {
      throw new Error(
        'Azure credentials (tenantId, clientId, clientSecret, subscriptionId) are required'
      );
    }

    this.config = {
      clientId: credentials.azureClientId,
      clientSecret: credentials.azureClientSecret,
      tenantId: credentials.azureTenantId,
      subscriptionId: credentials.azureSubscriptionId,
    };

    // Initialize Azure credential
    this.credential = new ClientSecretCredential(
      this.config.tenantId,
      this.config.clientId,
      this.config.clientSecret
    );

    // Initialize Monitor client
    this.monitorClient = new MonitorClient(this.credential, this.config.subscriptionId);

    console.log(
      '[AzureAlertRulesService] Initialized for subscription:',
      this.config.subscriptionId
    );
  }

  /**
   * Gets all alert rules in the subscription
   *
   * Returns metric alerts, log alerts, and activity log alerts.
   *
   * @param accountId - Cloud account ID (for logging)
   * @returns Array of alert rules
   *
   * @example
   * ```typescript
   * const rules = await service.getAlertRules('account-123');
   * console.log(`Found ${rules.length} alert rules`);
   *
   * rules.forEach(rule => {
   *   console.log(`${rule.name}: ${rule.enabled ? 'Enabled' : 'Disabled'}`);
   * });
   * ```
   */
  async getAlertRules(accountId: string): Promise<AlertRule[]> {
    try {
      console.log(`[AzureAlertRulesService] Fetching alert rules for account: ${accountId}`);

      const rules: AlertRule[] = [];

      // Fetch metric alerts
      try {
        const metricAlertsIterator = this.monitorClient.metricAlerts.listBySubscription();

        for await (const alert of metricAlertsIterator) {
          rules.push({
            id: alert.id || '',
            name: alert.name || 'Unknown',
            type: 'metric',
            description: alert.description,
            enabled: alert.enabled || false,
            severity: (alert.severity as AlertSeverity) || 3,
            targetResourceId: alert.scopes?.[0] || '',
            condition: JSON.stringify(alert.criteria),
            actionGroups: alert.actions?.map((a: any) => a.actionGroupId || '') || [],
            evaluationFrequency: alert.evaluationFrequency,
            windowSize: alert.windowSize,
            autoMitigate: alert.autoMitigate || false,
          });
        }
      } catch (error) {
        console.warn('[AzureAlertRulesService] Failed to fetch metric alerts:', error);
      }

      // Fetch activity log alerts
      try {
        const activityAlertsIterator = this.monitorClient.activityLogAlerts.listBySubscriptionId();

        for await (const alert of activityAlertsIterator) {
          rules.push({
            id: alert.id || '',
            name: alert.name || 'Unknown',
            type: 'activityLog',
            description: alert.description,
            enabled: alert.enabled || false,
            severity: 2, // Activity log alerts don't have severity
            targetResourceId: alert.scopes?.[0] || '',
            condition: JSON.stringify(alert.condition),
            actionGroups: alert.actions?.actionGroups?.map((ag) => ag.actionGroupId || '') || [],
            evaluationFrequency: 'PT1M', // Default for activity log
            windowSize: 'PT5M', // Default for activity log
            autoMitigate: false,
          });
        }
      } catch (error) {
        console.warn('[AzureAlertRulesService] Failed to fetch activity log alerts:', error);
      }

      console.log(`[AzureAlertRulesService] Retrieved ${rules.length} alert rules`);
      return rules;
    } catch (error) {
      console.error('[AzureAlertRulesService] Failed to get alert rules:', error);
      throw new Error(
        `Failed to get alert rules: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Creates a new alert rule
   *
   * @param accountId - Cloud account ID (for logging)
   * @param config - Alert rule configuration
   * @returns Created alert rule
   *
   * @example
   * ```typescript
   * const rule = await service.createAlertRule('account-123', {
   *   name: 'High CPU Alert',
   *   description: 'Alert when CPU exceeds 80%',
   *   enabled: true,
   *   severity: 2,
   *   targetResourceId: '/subscriptions/.../virtualMachines/vm1',
   *   resourceGroupName: 'my-rg',
   *   condition: {
   *     type: 'metric',
   *     metricName: 'Percentage CPU',
   *     operator: 'GreaterThan',
   *     threshold: 80,
   *     aggregation: 'Average',
   *   },
   *   evaluationFrequency: 'PT5M',
   *   windowSize: 'PT15M',
   * });
   * ```
   */
  async createAlertRule(accountId: string, config: AlertRuleConfig): Promise<AlertRule> {
    try {
      console.log(`[AzureAlertRulesService] Creating alert rule: ${config.name}`);

      // Validate configuration
      this.validateAlertRuleConfig(config);

      let createdAlert: any;

      if (config.condition.type === 'metric') {
        // Create metric alert
        const metricAlertParams = {
          location: 'global',
          description: config.description || '',
          severity: config.severity,
          enabled: config.enabled,
          scopes: [config.targetResourceId],
          evaluationFrequency: config.evaluationFrequency || 'PT5M',
          windowSize: config.windowSize || 'PT15M',
          criteria: {
            odataType: 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria',
            allOf: [
              {
                name: 'metric1',
                metricName: config.condition.metricName!,
                metricNamespace: config.condition.metricNamespace,
                operator: config.condition.operator!,
                threshold: config.condition.threshold!,
                timeAggregation: config.condition.aggregation!,
              },
            ],
          },
          autoMitigate: config.autoMitigate !== undefined ? config.autoMitigate : true,
          actions: config.actionGroupIds?.map((id) => ({ actionGroupId: id })) || [],
        };

        createdAlert = await this.monitorClient.metricAlerts.createOrUpdate(
          config.resourceGroupName,
          config.name,
          metricAlertParams
        );
      } else if (config.condition.type === 'activityLog') {
        // Create activity log alert
        const activityAlertParams = {
          location: 'global',
          scopes: [config.targetResourceId],
          condition: {
            allOf: [
              {
                field: 'category',
                equals: config.condition.category || 'Administrative',
              },
              {
                field: 'operationName',
                equals: config.condition.operationName || '',
              },
            ],
          },
          actions: {
            actionGroups: config.actionGroupIds?.map((id) => ({ actionGroupId: id })) || [],
          },
          enabled: config.enabled,
          description: config.description || '',
        };

        createdAlert = await this.monitorClient.activityLogAlerts.createOrUpdate(
          config.resourceGroupName,
          config.name,
          activityAlertParams
        );
      } else {
        throw new Error(`Unsupported alert type: ${config.condition.type}`);
      }

      console.log(`[AzureAlertRulesService] Created alert rule: ${createdAlert.name}`);

      return {
        id: createdAlert.id || '',
        name: createdAlert.name || config.name,
        type: config.condition.type,
        description: createdAlert.description,
        enabled: createdAlert.enabled || config.enabled,
        severity: createdAlert.severity || config.severity,
        targetResourceId: config.targetResourceId,
        condition: JSON.stringify(config.condition),
        actionGroups: config.actionGroupIds || [],
        evaluationFrequency: config.evaluationFrequency,
        windowSize: config.windowSize,
        autoMitigate: config.autoMitigate !== undefined ? config.autoMitigate : true,
      };
    } catch (error) {
      console.error('[AzureAlertRulesService] Failed to create alert rule:', error);
      throw new Error(
        `Failed to create alert rule: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Updates an existing alert rule
   *
   * @param ruleId - Alert rule ID (full resource ID)
   * @param config - Partial alert rule configuration to update
   * @returns Updated alert rule
   *
   * @example
   * ```typescript
   * const updated = await service.updateAlertRule(
   *   '/subscriptions/.../alertrules/my-alert',
   *   {
   *     enabled: false,
   *     severity: 1,
   *   }
   * );
   * ```
   */
  async updateAlertRule(
    ruleId: string,
    config: Partial<AlertRuleConfig>
  ): Promise<AlertRule> {
    try {
      console.log(`[AzureAlertRulesService] Updating alert rule: ${ruleId}`);

      // Parse resource ID to extract resource group and rule name
      const { resourceGroupName, ruleName } = this.parseAlertRuleId(ruleId);

      // Fetch existing rule to determine type
      const existing = await this.getAlertRuleById(ruleId);

      if (existing.type === 'metric') {
        // Get current metric alert
        const currentAlert = await this.monitorClient.metricAlerts.get(
          resourceGroupName,
          ruleName
        );

        // Merge with updates
        const updatedParams = {
          ...currentAlert,
          enabled: config.enabled !== undefined ? config.enabled : currentAlert.enabled,
          severity: config.severity !== undefined ? config.severity : currentAlert.severity,
          description:
            config.description !== undefined ? config.description : currentAlert.description,
          evaluationFrequency:
            config.evaluationFrequency !== undefined
              ? config.evaluationFrequency
              : currentAlert.evaluationFrequency,
          windowSize:
            config.windowSize !== undefined ? config.windowSize : currentAlert.windowSize,
          autoMitigate:
            config.autoMitigate !== undefined ? config.autoMitigate : currentAlert.autoMitigate,
        };

        const updated = await this.monitorClient.metricAlerts.createOrUpdate(
          resourceGroupName,
          ruleName,
          updatedParams
        );

        console.log(`[AzureAlertRulesService] Updated metric alert: ${ruleName}`);

        return {
          id: updated.id || ruleId,
          name: updated.name || ruleName,
          type: 'metric',
          description: updated.description,
          enabled: updated.enabled || false,
          severity: (updated.severity as AlertSeverity) || 3,
          targetResourceId: updated.scopes?.[0] || '',
          condition: JSON.stringify(updated.criteria),
          actionGroups: updated.actions?.map((a: any) => a.actionGroupId || '') || [],
          evaluationFrequency: updated.evaluationFrequency,
          windowSize: updated.windowSize,
          autoMitigate: updated.autoMitigate || false,
        };
      } else if (existing.type === 'activityLog') {
        // Get current activity log alert
        const currentAlert = await this.monitorClient.activityLogAlerts.get(
          resourceGroupName,
          ruleName
        );

        // Merge with updates
        const updatedParams = {
          ...currentAlert,
          enabled: config.enabled !== undefined ? config.enabled : currentAlert.enabled,
          description:
            config.description !== undefined ? config.description : currentAlert.description,
        };

        const updated = await this.monitorClient.activityLogAlerts.createOrUpdate(
          resourceGroupName,
          ruleName,
          updatedParams
        );

        console.log(`[AzureAlertRulesService] Updated activity log alert: ${ruleName}`);

        return {
          id: updated.id || ruleId,
          name: updated.name || ruleName,
          type: 'activityLog',
          description: updated.description,
          enabled: updated.enabled || false,
          severity: 2,
          targetResourceId: updated.scopes?.[0] || '',
          condition: JSON.stringify(updated.condition),
          actionGroups: updated.actions?.actionGroups?.map((ag) => ag.actionGroupId || '') || [],
          evaluationFrequency: 'PT1M',
          windowSize: 'PT5M',
          autoMitigate: false,
        };
      }

      throw new Error(`Unsupported alert type: ${existing.type}`);
    } catch (error) {
      console.error('[AzureAlertRulesService] Failed to update alert rule:', error);
      throw new Error(
        `Failed to update alert rule: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Deletes an alert rule
   *
   * @param ruleId - Alert rule ID (full resource ID)
   *
   * @example
   * ```typescript
   * await service.deleteAlertRule('/subscriptions/.../alertrules/my-alert');
   * console.log('Alert rule deleted');
   * ```
   */
  async deleteAlertRule(ruleId: string): Promise<void> {
    try {
      console.log(`[AzureAlertRulesService] Deleting alert rule: ${ruleId}`);

      // Parse resource ID
      const { resourceGroupName, ruleName } = this.parseAlertRuleId(ruleId);

      // Fetch existing rule to determine type
      const existing = await this.getAlertRuleById(ruleId);

      if (existing.type === 'metric') {
        await this.monitorClient.metricAlerts.delete(resourceGroupName, ruleName);
      } else if (existing.type === 'activityLog') {
        await this.monitorClient.activityLogAlerts.delete(resourceGroupName, ruleName);
      } else {
        throw new Error(`Unsupported alert type: ${existing.type}`);
      }

      console.log(`[AzureAlertRulesService] Deleted alert rule: ${ruleName}`);
    } catch (error) {
      console.error('[AzureAlertRulesService] Failed to delete alert rule:', error);
      throw new Error(
        `Failed to delete alert rule: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets pre-built alert rule templates
   *
   * Returns a collection of ready-to-use alert rule templates for common scenarios.
   *
   * @returns Array of alert rule templates
   *
   * @example
   * ```typescript
   * const templates = await service.getAlertRuleTemplates();
   * templates.forEach(template => {
   *   console.log(`${template.name}: ${template.description}`);
   * });
   * ```
   */
  async getAlertRuleTemplates(): Promise<AlertRuleTemplate[]> {
    console.log('[AzureAlertRulesService] Returning alert rule templates');
    return ALERT_RULE_TEMPLATES;
  }

  /**
   * Gets a specific alert rule template by ID
   *
   * @param templateId - Template ID
   * @returns Alert rule template
   */
  async getAlertRuleTemplate(templateId: string): Promise<AlertRuleTemplate | null> {
    const template = ALERT_RULE_TEMPLATES.find((t) => t.id === templateId);
    return template || null;
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Gets an alert rule by ID
   *
   * @param ruleId - Alert rule ID
   * @returns Alert rule
   * @private
   */
  private async getAlertRuleById(ruleId: string): Promise<AlertRule> {
    const { resourceGroupName, ruleName } = this.parseAlertRuleId(ruleId);

    // Try to fetch as metric alert
    try {
      const metricAlert = await this.monitorClient.metricAlerts.get(resourceGroupName, ruleName);
      return {
        id: metricAlert.id || ruleId,
        name: metricAlert.name || ruleName,
        type: 'metric',
        description: metricAlert.description,
        enabled: metricAlert.enabled || false,
        severity: (metricAlert.severity as AlertSeverity) || 3,
        targetResourceId: metricAlert.scopes?.[0] || '',
        condition: JSON.stringify(metricAlert.criteria),
        actionGroups: metricAlert.actions?.map((a: any) => a.actionGroupId || '') || [],
        evaluationFrequency: metricAlert.evaluationFrequency,
        windowSize: metricAlert.windowSize,
        autoMitigate: metricAlert.autoMitigate || false,
      };
    } catch (error) {
      // Not a metric alert, try activity log
    }

    // Try to fetch as activity log alert
    try {
      const activityAlert = await this.monitorClient.activityLogAlerts.get(
        resourceGroupName,
        ruleName
      );
      return {
        id: activityAlert.id || ruleId,
        name: activityAlert.name || ruleName,
        type: 'activityLog',
        description: activityAlert.description,
        enabled: activityAlert.enabled || false,
        severity: 2,
        targetResourceId: activityAlert.scopes?.[0] || '',
        condition: JSON.stringify(activityAlert.condition),
        actionGroups: activityAlert.actions?.actionGroups?.map((ag) => ag.actionGroupId || '') || [],
        evaluationFrequency: 'PT1M',
        windowSize: 'PT5M',
        autoMitigate: false,
      };
    } catch (error) {
      throw new Error(`Alert rule not found: ${ruleId}`);
    }
  }

  /**
   * Parses alert rule ID to extract resource group and rule name
   *
   * @param ruleId - Alert rule ID
   * @returns Resource group name and rule name
   * @private
   */
  private parseAlertRuleId(ruleId: string): { resourceGroupName: string; ruleName: string } {
    // Format: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Insights/{type}/{name}
    const parts = ruleId.split('/');
    const rgIndex = parts.indexOf('resourceGroups');
    const nameIndex = parts.length - 1;

    if (rgIndex === -1 || rgIndex + 1 >= parts.length) {
      throw new Error(`Invalid alert rule ID format: ${ruleId}`);
    }

    return {
      resourceGroupName: parts[rgIndex + 1],
      ruleName: parts[nameIndex],
    };
  }

  /**
   * Validates alert rule configuration
   *
   * @param config - Alert rule configuration
   * @throws {Error} If configuration is invalid
   * @private
   */
  private validateAlertRuleConfig(config: AlertRuleConfig): void {
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Alert rule name is required');
    }

    if (!config.targetResourceId || config.targetResourceId.trim().length === 0) {
      throw new Error('Target resource ID is required');
    }

    if (!config.resourceGroupName || config.resourceGroupName.trim().length === 0) {
      throw new Error('Resource group name is required');
    }

    if (!config.condition || !config.condition.type) {
      throw new Error('Alert condition is required');
    }

    if (config.condition.type === 'metric') {
      if (!config.condition.metricName) {
        throw new Error('Metric name is required for metric alerts');
      }
      if (!config.condition.operator) {
        throw new Error('Operator is required for metric alerts');
      }
      if (config.condition.threshold === undefined) {
        throw new Error('Threshold is required for metric alerts');
      }
      if (!config.condition.aggregation) {
        throw new Error('Aggregation is required for metric alerts');
      }
    }

    if (config.condition.type === 'log') {
      if (!config.condition.query) {
        throw new Error('Query is required for log alerts');
      }
    }
  }
}
