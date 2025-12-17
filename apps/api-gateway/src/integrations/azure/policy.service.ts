/**
 * Azure Policy Service
 *
 * Provides governance and compliance assessment using Azure Policy.
 * Azure Policy helps enforce organizational standards and assess compliance at scale.
 *
 * Features:
 * - Policy assignments management
 * - Compliance state evaluation
 * - Non-compliant resources identification
 * - Policy definitions (built-in and custom)
 * - Resource compliance evaluation
 *
 * @module integrations/azure/policy.service
 */

import { PolicyClient } from '@azure/arm-policy';
import { ClientSecretCredential } from '@azure/identity';
import { AzureResourceGraphService } from './resource-graph.service';
import type {
  PolicyAssignment,
  PolicyDefinition,
} from '@azure/arm-policy';
import type { CloudProviderCredentials } from '../cloud-provider.interface';

/**
 * Azure Policy configuration
 */
interface AzurePolicyConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  subscriptionId: string;
}

/**
 * Policy Assignment with metadata
 */
export interface PolicyAssignmentResult {
  id: string;
  name: string;
  displayName: string;
  description: string;
  policyDefinitionId: string;
  scope: string;
  enforcementMode: 'Default' | 'DoNotEnforce';
  parameters?: Record<string, any>;
  metadata?: {
    category?: string;
    assignedBy?: string;
    createdOn?: string;
  };
}

/**
 * Compliance summary result
 */
export interface ComplianceResult {
  totalResources: number;
  compliantResources: number;
  nonCompliantResources: number;
  compliancePercentage: number;
  policyBreakdown: PolicyComplianceBreakdown[];
  trend?: ComplianceTrend;
  lastEvaluated: Date;
}

/**
 * Compliance breakdown by policy
 */
export interface PolicyComplianceBreakdown {
  policyId: string;
  policyName: string;
  category: string;
  compliantCount: number;
  nonCompliantCount: number;
  compliancePercentage: number;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Compliance trend data
 */
export interface ComplianceTrend {
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  direction: 'improving' | 'declining' | 'stable';
}

/**
 * Non-compliant resource
 */
export interface NonCompliantResource {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  location: string;
  resourceGroup: string;
  policyAssignmentId: string;
  policyDefinitionId: string;
  policyDefinitionName: string;
  complianceState: string;
  reason: string;
  timestamp: Date;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  remediationSteps?: string[];
}

/**
 * Policy Definition details
 */
export interface PolicyDefinitionResult {
  id: string;
  name: string;
  displayName: string;
  description: string;
  policyType: 'BuiltIn' | 'Custom' | 'Static';
  mode: string;
  category: string;
  effect: string;
  parameters?: Record<string, any>;
  metadata?: {
    version?: string;
    category?: string;
    preview?: boolean;
  };
}

/**
 * Policy Evaluation Result for a specific resource
 */
export interface PolicyEvaluationResult {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  overallCompliance: 'Compliant' | 'NonCompliant' | 'Conflict';
  evaluationTimestamp: Date;
  violatedPolicies: ViolatedPolicy[];
  compliantPolicies: CompliantPolicy[];
  remediationSuggestions: RemediationSuggestion[];
}

/**
 * Violated policy details
 */
export interface ViolatedPolicy {
  policyId: string;
  policyName: string;
  description: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  effect: string;
  reason: string;
}

/**
 * Compliant policy details
 */
export interface CompliantPolicy {
  policyId: string;
  policyName: string;
  category: string;
}

/**
 * Remediation suggestion
 */
export interface RemediationSuggestion {
  policyId: string;
  policyName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  steps: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  automatable: boolean;
}

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

/**
 * Azure Policy Service
 *
 * @example
 * ```typescript
 * const policyService = new AzurePolicyService({
 *   provider: 'azure',
 *   azureClientId: process.env.AZURE_CLIENT_ID!,
 *   azureClientSecret: process.env.AZURE_CLIENT_SECRET!,
 *   azureTenantId: process.env.AZURE_TENANT_ID!,
 *   azureSubscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
 * });
 *
 * // Get all policy assignments
 * const assignments = await policyService.getPolicyAssignments('account-id');
 *
 * // Get compliance status
 * const compliance = await policyService.getPolicyCompliance('account-id');
 *
 * // Get non-compliant resources
 * const nonCompliant = await policyService.getNonCompliantResources('account-id');
 * ```
 */
export class AzurePolicyService {
  private client: PolicyClient;
  private credential: ClientSecretCredential;
  private config: AzurePolicyConfig;
  private resourceGraphService: AzureResourceGraphService;

  /**
   * Creates a new Azure Policy Service instance
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

    // Initialize Policy Client
    this.client = new PolicyClient(this.credential, this.config.subscriptionId);

    // Initialize Resource Graph Service for KQL queries
    this.resourceGraphService = new AzureResourceGraphService(credentials);

    console.log('[AzurePolicyService] Initialized for subscription:', this.config.subscriptionId);
  }

  /**
   * Gets all policy assignments for the subscription
   *
   * @param accountId - Account identifier (subscription ID)
   * @returns Array of policy assignments
   *
   * @example
   * ```typescript
   * const assignments = await policyService.getPolicyAssignments('sub-123');
   * console.log(`Found ${assignments.length} policy assignments`);
   * ```
   */
  async getPolicyAssignments(accountId: string): Promise<PolicyAssignmentResult[]> {
    try {
      const scope = `/subscriptions/${accountId}`;
      const assignmentsIterator = this.client.policyAssignments.list();
      const assignments: PolicyAssignmentResult[] = [];

      for await (const assignment of assignmentsIterator) {
        // Filter by scope (subscription or resource group level)
        if (assignment.id?.includes(accountId)) {
          assignments.push(this.normalizePolicyAssignment(assignment));
        }
      }

      console.log(`[AzurePolicyService] Retrieved ${assignments.length} policy assignments`);
      return assignments;
    } catch (error) {
      console.error('[AzurePolicyService] Failed to get policy assignments:', error);
      throw new Error(
        `Failed to get Azure policy assignments: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets overall policy compliance state
   *
   * Uses Resource Graph for efficient compliance state queries.
   *
   * @param accountId - Account identifier (subscription ID)
   * @returns Compliance summary with percentages and breakdown
   *
   * @example
   * ```typescript
   * const compliance = await policyService.getPolicyCompliance('sub-123');
   * console.log(`Compliance: ${compliance.compliancePercentage}%`);
   * console.log(`Non-compliant: ${compliance.nonCompliantResources} resources`);
   * ```
   */
  async getPolicyCompliance(accountId: string): Promise<ComplianceResult> {
    try {
      // Use Resource Graph for fast compliance queries
      const query = `
        PolicyResources
        | where type == "microsoft.policyinsights/policystates"
        | where subscriptionId == "${accountId}"
        | summarize
            TotalResources = dcount(tostring(properties.resourceId)),
            CompliantResources = dcountif(tostring(properties.resourceId), properties.complianceState == "Compliant"),
            NonCompliantResources = dcountif(tostring(properties.resourceId), properties.complianceState == "NonCompliant")
        | extend CompliancePercentage = round((todouble(CompliantResources) / todouble(TotalResources)) * 100, 2)
        | project TotalResources, CompliantResources, NonCompliantResources, CompliancePercentage
      `;

      const result = await this.resourceGraphService.query(query);

      if (result.rows.length === 0) {
        return {
          totalResources: 0,
          compliantResources: 0,
          nonCompliantResources: 0,
          compliancePercentage: 100,
          policyBreakdown: [],
          lastEvaluated: new Date(),
        };
      }

      const row = result.rows[0];
      const totalResources = Number(row[0]) || 0;
      const compliantResources = Number(row[1]) || 0;
      const nonCompliantResources = Number(row[2]) || 0;
      const compliancePercentage = Number(row[3]) || 0;

      // Get breakdown by policy
      const breakdown = await this.getPolicyComplianceBreakdown(accountId);

      return {
        totalResources,
        compliantResources,
        nonCompliantResources,
        compliancePercentage,
        policyBreakdown: breakdown,
        lastEvaluated: new Date(),
      };
    } catch (error) {
      console.error('[AzurePolicyService] Failed to get policy compliance:', error);
      throw new Error(
        `Failed to get Azure policy compliance: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets non-compliant resources
   *
   * @param accountId - Account identifier (subscription ID)
   * @param policyId - Optional policy ID to filter by specific policy
   * @returns Array of non-compliant resources with details
   *
   * @example
   * ```typescript
   * // Get all non-compliant resources
   * const allNonCompliant = await policyService.getNonCompliantResources('sub-123');
   *
   * // Get non-compliant resources for specific policy
   * const policyNonCompliant = await policyService.getNonCompliantResources(
   *   'sub-123',
   *   '/providers/Microsoft.Authorization/policyDefinitions/policy-id'
   * );
   * ```
   */
  async getNonCompliantResources(
    accountId: string,
    policyId?: string
  ): Promise<NonCompliantResource[]> {
    try {
      const policyFilter = policyId
        ? `| where properties.policyDefinitionId == "${policyId}"`
        : '';

      const query = `
        PolicyResources
        | where type == "microsoft.policyinsights/policystates"
        | where subscriptionId == "${accountId}"
        | where properties.complianceState == "NonCompliant"
        ${policyFilter}
        | join kind=inner (
            Resources
            | project resourceId = id, resourceName = name, resourceType = type, location, resourceGroup
        ) on \$left.properties.resourceId == \$right.resourceId
        | project
            resourceId = properties.resourceId,
            resourceName,
            resourceType,
            location,
            resourceGroup,
            policyAssignmentId = properties.policyAssignmentId,
            policyDefinitionId = properties.policyDefinitionId,
            policyDefinitionName = properties.policyDefinitionName,
            complianceState = properties.complianceState,
            timestamp = properties.timestamp
        | order by timestamp desc
        | limit 1000
      `;

      const result = await this.resourceGraphService.query(query);

      const resources: NonCompliantResource[] = result.rows.map((row) => ({
        resourceId: String(row[0]),
        resourceName: String(row[1]),
        resourceType: String(row[2]),
        location: String(row[3]),
        resourceGroup: String(row[4]),
        policyAssignmentId: String(row[5]),
        policyDefinitionId: String(row[6]),
        policyDefinitionName: String(row[7]),
        complianceState: String(row[8]),
        reason: 'Resource does not comply with policy requirements',
        timestamp: new Date(String(row[9])),
        severity: this.determinePolicySeverity(String(row[7])),
        remediationSteps: this.getRemediationSteps(String(row[6])),
      }));

      // Sort by severity (critical first)
      resources.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const aSeverity = severityOrder[a.severity || 'low'];
        const bSeverity = severityOrder[b.severity || 'low'];
        return aSeverity - bSeverity;
      });

      console.log(`[AzurePolicyService] Retrieved ${resources.length} non-compliant resources`);
      return resources;
    } catch (error) {
      console.error('[AzurePolicyService] Failed to get non-compliant resources:', error);
      throw new Error(
        `Failed to get non-compliant resources: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets available policy definitions (built-in and custom)
   *
   * @param accountId - Account identifier (subscription ID)
   * @returns Array of policy definitions
   *
   * @example
   * ```typescript
   * const definitions = await policyService.getPolicyDefinitions('sub-123');
   * const builtIn = definitions.filter(d => d.policyType === 'BuiltIn');
   * const custom = definitions.filter(d => d.policyType === 'Custom');
   * ```
   */
  async getPolicyDefinitions(accountId: string): Promise<PolicyDefinitionResult[]> {
    try {
      const definitionsIterator = this.client.policyDefinitions.list();
      const definitions: PolicyDefinitionResult[] = [];

      for await (const definition of definitionsIterator) {
        definitions.push(this.normalizePolicyDefinition(definition));
      }

      // Also get subscription-level custom policies
      try {
        const customDefinitionsIterator = this.client.policyDefinitions.listByManagementGroup(
          accountId
        );

        for await (const definition of customDefinitionsIterator) {
          definitions.push(this.normalizePolicyDefinition(definition));
        }
      } catch (error) {
        // Management group policies might not be accessible, continue
        console.log('[AzurePolicyService] Could not fetch management group policies:', error);
      }

      console.log(`[AzurePolicyService] Retrieved ${definitions.length} policy definitions`);
      return definitions;
    } catch (error) {
      console.error('[AzurePolicyService] Failed to get policy definitions:', error);
      throw new Error(
        `Failed to get policy definitions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Evaluates a specific resource against all applicable policies
   *
   * @param accountId - Account identifier (subscription ID)
   * @param resourceId - Full Azure resource ID
   * @returns Evaluation result with violated and compliant policies
   *
   * @example
   * ```typescript
   * const result = await policyService.evaluatePolicyCompliance(
   *   'sub-123',
   *   '/subscriptions/sub-123/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/vm1'
   * );
   *
   * console.log(`Overall: ${result.overallCompliance}`);
   * console.log(`Violated policies: ${result.violatedPolicies.length}`);
   * ```
   */
  async evaluatePolicyCompliance(
    accountId: string,
    resourceId: string
  ): Promise<PolicyEvaluationResult> {
    try {
      // Query policy states for this specific resource
      const query = `
        PolicyResources
        | where type == "microsoft.policyinsights/policystates"
        | where subscriptionId == "${accountId}"
        | where properties.resourceId == "${resourceId}"
        | join kind=inner (
            Resources
            | where id == "${resourceId}"
            | project resourceId = id, resourceName = name, resourceType = type
        ) on \$left.properties.resourceId == \$right.resourceId
        | project
            resourceId = properties.resourceId,
            resourceName,
            resourceType,
            policyDefinitionId = properties.policyDefinitionId,
            policyDefinitionName = properties.policyDefinitionName,
            complianceState = properties.complianceState,
            timestamp = properties.timestamp
        | order by timestamp desc
      `;

      const result = await this.resourceGraphService.query(query);

      if (result.rows.length === 0) {
        throw new Error(`Resource not found or no policy evaluations available: ${resourceId}`);
      }

      const firstRow = result.rows[0];
      const resourceName = String(firstRow[1]);
      const resourceType = String(firstRow[2]);

      const violatedPolicies: ViolatedPolicy[] = [];
      const compliantPolicies: CompliantPolicy[] = [];

      for (const row of result.rows) {
        const policyDefinitionId = String(row[3]);
        const policyDefinitionName = String(row[4]);
        const complianceState = String(row[5]);

        if (complianceState === 'NonCompliant') {
          violatedPolicies.push({
            policyId: policyDefinitionId,
            policyName: policyDefinitionName,
            description: `Resource does not comply with ${policyDefinitionName}`,
            category: 'Compliance',
            severity: this.determinePolicySeverity(policyDefinitionName),
            effect: 'Audit',
            reason: 'Policy evaluation returned non-compliant state',
          });
        } else if (complianceState === 'Compliant') {
          compliantPolicies.push({
            policyId: policyDefinitionId,
            policyName: policyDefinitionName,
            category: 'Compliance',
          });
        }
      }

      // Determine overall compliance
      const overallCompliance: 'Compliant' | 'NonCompliant' | 'Conflict' =
        violatedPolicies.length === 0 ? 'Compliant' : 'NonCompliant';

      // Generate remediation suggestions
      const remediationSuggestions = violatedPolicies.map((policy) => ({
        policyId: policy.policyId,
        policyName: policy.policyName,
        severity: policy.severity,
        description: `Remediate ${policy.policyName} violation`,
        steps: this.getRemediationSteps(policy.policyId),
        estimatedEffort: this.estimateRemediationEffort(policy.policyId),
        automatable: this.isPolicyAutomatable(policy.policyId),
      }));

      return {
        resourceId,
        resourceName,
        resourceType,
        overallCompliance,
        evaluationTimestamp: new Date(),
        violatedPolicies,
        compliantPolicies,
        remediationSuggestions,
      };
    } catch (error) {
      console.error('[AzurePolicyService] Failed to evaluate policy compliance:', error);
      throw new Error(
        `Failed to evaluate policy compliance: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Gets policy compliance breakdown by policy
   *
   * @private
   */
  private async getPolicyComplianceBreakdown(
    accountId: string
  ): Promise<PolicyComplianceBreakdown[]> {
    try {
      const query = `
        PolicyResources
        | where type == "microsoft.policyinsights/policystates"
        | where subscriptionId == "${accountId}"
        | summarize
            CompliantCount = dcountif(tostring(properties.resourceId), properties.complianceState == "Compliant"),
            NonCompliantCount = dcountif(tostring(properties.resourceId), properties.complianceState == "NonCompliant")
            by policyDefinitionId = tostring(properties.policyDefinitionId),
               policyDefinitionName = tostring(properties.policyDefinitionName)
        | extend CompliancePercentage = round((todouble(CompliantCount) / todouble(CompliantCount + NonCompliantCount)) * 100, 2)
        | project policyDefinitionId, policyDefinitionName, CompliantCount, NonCompliantCount, CompliancePercentage
        | order by NonCompliantCount desc
        | limit 50
      `;

      const result = await this.resourceGraphService.query(query);

      return result.rows.map((row) => ({
        policyId: String(row[0]),
        policyName: String(row[1]),
        category: this.extractPolicyCategory(String(row[1])),
        compliantCount: Number(row[2]) || 0,
        nonCompliantCount: Number(row[3]) || 0,
        compliancePercentage: Number(row[4]) || 0,
        severity: this.determinePolicySeverity(String(row[1])),
      }));
    } catch (error) {
      console.error('[AzurePolicyService] Failed to get compliance breakdown:', error);
      return [];
    }
  }

  /**
   * Normalizes policy assignment to our format
   *
   * @private
   */
  private normalizePolicyAssignment(assignment: PolicyAssignment): PolicyAssignmentResult {
    return {
      id: assignment.id || '',
      name: assignment.name || '',
      displayName: assignment.properties?.displayName || assignment.name || 'Unknown Policy',
      description: assignment.properties?.description || '',
      policyDefinitionId: assignment.properties?.policyDefinitionId || '',
      scope: assignment.properties?.scope || '',
      enforcementMode: assignment.properties?.enforcementMode === 'DoNotEnforce' ? 'DoNotEnforce' : 'Default',
      parameters: assignment.properties?.parameters,
      metadata: assignment.properties?.metadata,
    };
  }

  /**
   * Normalizes policy definition to our format
   *
   * @private
   */
  private normalizePolicyDefinition(definition: PolicyDefinition): PolicyDefinitionResult {
    return {
      id: definition.id || '',
      name: definition.name || '',
      displayName: definition.properties?.displayName || definition.name || 'Unknown Policy',
      description: definition.properties?.description || '',
      policyType: definition.properties?.policyType || 'BuiltIn',
      mode: definition.properties?.mode || 'All',
      category: definition.properties?.metadata?.category || 'General',
      effect: this.extractPolicyEffect(definition),
      parameters: definition.properties?.parameters,
      metadata: definition.properties?.metadata,
    };
  }

  /**
   * Extracts policy effect from definition
   *
   * @private
   */
  private extractPolicyEffect(definition: PolicyDefinition): string {
    const policyRule = definition.properties?.policyRule as any;
    return policyRule?.then?.effect || 'Audit';
  }

  /**
   * Extracts policy category from name
   *
   * @private
   */
  private extractPolicyCategory(policyName: string): string {
    const categories = [
      'Security',
      'Compliance',
      'Network',
      'Storage',
      'Compute',
      'Monitoring',
      'Backup',
      'Cost',
    ];

    for (const category of categories) {
      if (policyName.toLowerCase().includes(category.toLowerCase())) {
        return category;
      }
    }

    return 'General';
  }

  /**
   * Determines policy severity based on name/category
   *
   * @private
   */
  private determinePolicySeverity(
    policyName: string
  ): 'critical' | 'high' | 'medium' | 'low' {
    const name = policyName.toLowerCase();

    if (
      name.includes('encryption') ||
      name.includes('security') ||
      name.includes('vulnerability')
    ) {
      return 'critical';
    }

    if (name.includes('network') || name.includes('firewall') || name.includes('access')) {
      return 'high';
    }

    if (name.includes('monitoring') || name.includes('backup') || name.includes('tag')) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Gets remediation steps for a policy
   *
   * @private
   */
  private getRemediationSteps(policyId: string): string[] {
    // This is a simplified version. In production, you would have a mapping
    // of policy IDs to detailed remediation steps.
    return [
      'Review the policy requirements and resource configuration',
      'Identify the specific non-compliant settings',
      'Update the resource configuration to meet policy requirements',
      'Re-evaluate compliance after changes',
    ];
  }

  /**
   * Estimates remediation effort
   *
   * @private
   */
  private estimateRemediationEffort(policyId: string): 'low' | 'medium' | 'high' {
    // Simplified estimation logic
    return 'medium';
  }

  /**
   * Checks if policy remediation can be automated
   *
   * @private
   */
  private isPolicyAutomatable(policyId: string): boolean {
    // Check if policy has DeployIfNotExists or Modify effect
    return policyId.includes('deployifnotexists') || policyId.includes('modify');
  }

  /**
   * Sleep utility
   *
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
