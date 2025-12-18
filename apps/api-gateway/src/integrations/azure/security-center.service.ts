/**
 * Azure Security Center Service (Microsoft Defender for Cloud)
 *
 * Provides security posture assessment, vulnerability scanning, and compliance
 * evaluation using Microsoft Defender for Cloud (formerly Azure Security Center).
 *
 * Features:
 * - Security score and sub-scores
 * - Security assessments (CIS, PCI-DSS, ISO 27001, etc.)
 * - Security recommendations
 * - Compliance status
 * - Vulnerability findings
 *
 * @module integrations/azure/security-center.service
 */

import { SecurityCenter } from '@azure/arm-security';
import { ClientSecretCredential } from '@azure/identity';
import type {
  SecureScoreItem,
  SecureScoreControlDetails,
  AssessmentStatus,
} from '@azure/arm-security';

// Type alias for assessment (SDK may not export Assessment directly)
type Assessment = any;
import type {
  CloudProviderCredentials,
  SecurityFinding,
  SecuritySeverity,
} from '../cloud-provider.interface';

/**
 * Azure Security Center configuration
 */
interface AzureSecurityCenterConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  subscriptionId: string;
}

/**
 * Security score result
 */
export interface SecurityScoreResult {
  displayName: string;
  score: {
    current: number;
    max: number;
    percentage: number;
  };
  weight: number;
}

/**
 * Security assessment metadata
 */
export interface SecurityAssessment {
  id: string;
  name: string;
  displayName: string;
  description: string;
  severity: SecuritySeverity;
  status: 'Healthy' | 'Unhealthy' | 'NotApplicable';
  resourceId?: string;
  resourceType?: string;
  remediation?: string;
  category: string;
  compliance: string[];
  metadata: {
    assessmentType?: string;
    implementationEffort?: string;
    userImpact?: string;
    threats?: string[];
  };
}

/**
 * Compliance result
 */
export interface ComplianceResult {
  standardName: string;
  passedControls: number;
  failedControls: number;
  skippedControls: number;
  totalControls: number;
  compliancePercentage: number;
}

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

/**
 * Azure Security Center Service
 *
 * @example
 * ```typescript
 * const securityService = new AzureSecurityCenterService({
 *   provider: 'azure',
 *   azureClientId: process.env.AZURE_CLIENT_ID!,
 *   azureClientSecret: process.env.AZURE_CLIENT_SECRET!,
 *   azureTenantId: process.env.AZURE_TENANT_ID!,
 *   azureSubscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
 * });
 *
 * // Get overall security score
 * const score = await securityService.getSecurityScore();
 * console.log(`Security Score: ${score.score.percentage}%`);
 *
 * // Get security assessments
 * const assessments = await securityService.getSecurityAssessments();
 *
 * // Get high-severity findings
 * const findings = await securityService.getSecurityFindings({ severity: ['critical', 'high'] });
 * ```
 */
export class AzureSecurityCenterService {
  private client: SecurityCenter;
  private credential: ClientSecretCredential;
  private config: AzureSecurityCenterConfig;

  /**
   * Creates a new Azure Security Center Service instance
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

    // Initialize Security Center client
    this.client = new SecurityCenter(this.credential, this.config.subscriptionId);

    console.log('[AzureSecurityCenterService] Initialized for subscription:', this.config.subscriptionId);
  }

  /**
   * Gets the overall security score for the subscription
   *
   * Security score is a percentage (0-100%) indicating security posture.
   * Higher is better.
   *
   * @returns Overall security score with current, max, and percentage
   *
   * @example
   * ```typescript
   * const score = await securityService.getSecurityScore();
   * console.log(`Security Score: ${score.score.current}/${score.score.max} (${score.score.percentage}%)`);
   * ```
   */
  async getSecurityScore(): Promise<SecurityScoreResult> {
    try {
      const scope = `/subscriptions/${this.config.subscriptionId}`;

      // Get the primary secure score
      const scoresIterator = this.client.secureScores.list(scope as any);
      const scores: SecureScoreItem[] = [];

      for await (const score of scoresIterator) {
        scores.push(score);
      }

      // Typically there's one overall score
      if (scores.length === 0) {
        throw new Error('No security score found for subscription');
      }

      const primaryScore = scores[0];

      const current = (primaryScore as any).properties?.score?.current || 0;
      const max = (primaryScore as any).properties?.score?.max || 0;
      const percentage = max > 0 ? Math.round((current / max) * 100) : 0;

      return {
        displayName: (primaryScore as any).properties?.displayName || 'Overall Security Score',
        score: {
          current,
          max,
          percentage,
        },
        weight: (primaryScore as any).properties?.weight || 0,
      };
    } catch (error) {
      console.error('[AzureSecurityCenterService] Failed to get security score:', error);
      throw new Error(
        `Failed to get Azure security score: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets security score broken down by control categories
   *
   * @returns Array of security scores by category (Network, Data, Identity, etc.)
   *
   * @example
   * ```typescript
   * const controls = await securityService.getSecurityScoreControls();
   * controls.forEach(control => {
   *   console.log(`${control.displayName}: ${control.score.percentage}%`);
   * });
   * ```
   */
  async getSecurityScoreControls(): Promise<SecurityScoreResult[]> {
    try {
      const scope = `/subscriptions/${this.config.subscriptionId}`;
      const controlsIterator = this.client.secureScoreControls.list(scope as any);
      const controls: SecurityScoreResult[] = [];

      for await (const control of controlsIterator) {
        const current = (control as any).properties?.score?.current || 0;
        const max = (control as any).properties?.score?.max || 0;
        const percentage = max > 0 ? Math.round((current / max) * 100) : 0;

        controls.push({
          displayName: (control as any).properties?.displayName || 'Unknown Control',
          score: {
            current,
            max,
            percentage,
          },
          weight: (control as any).properties?.weight || 0,
        });
      }

      return controls;
    } catch (error) {
      console.error('[AzureSecurityCenterService] Failed to get security score controls:', error);
      throw new Error(
        `Failed to get Azure security score controls: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets security assessments for all resources in the subscription
   *
   * @param filters - Optional filters for severity, status, resource type
   * @returns Array of security assessments
   *
   * @example
   * ```typescript
   * // Get all assessments
   * const all = await securityService.getSecurityAssessments();
   *
   * // Get only unhealthy (failing) assessments
   * const failing = await securityService.getSecurityAssessments({ status: 'Unhealthy' });
   *
   * // Get critical severity assessments
   * const critical = await securityService.getSecurityAssessments({ severity: ['critical'] });
   * ```
   */
  async getSecurityAssessments(filters?: {
    severity?: SecuritySeverity[];
    status?: 'Healthy' | 'Unhealthy' | 'NotApplicable';
    resourceType?: string;
  }): Promise<SecurityAssessment[]> {
    try {
      const scope = `/subscriptions/${this.config.subscriptionId}`;
      const assessmentsIterator = this.client.assessments.list(scope);
      const assessments: SecurityAssessment[] = [];

      for await (const assessment of assessmentsIterator) {
        const normalized = this.normalizeAssessment(assessment);

        // Apply filters
        if (this.matchesAssessmentFilters(normalized, filters)) {
          assessments.push(normalized);
        }
      }

      console.log(`[AzureSecurityCenterService] Retrieved ${assessments.length} security assessments`);
      return assessments;
    } catch (error) {
      console.error('[AzureSecurityCenterService] Failed to get security assessments:', error);
      throw new Error(
        `Failed to get Azure security assessments: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Converts security assessments to SecurityFinding format
   *
   * This method is compatible with the CloudProvider interface.
   *
   * @param filters - Optional filters
   * @returns Array of security findings
   */
  async getSecurityFindings(filters?: {
    severity?: SecuritySeverity[];
    resourceType?: string;
  }): Promise<SecurityFinding[]> {
    const assessments = await this.getSecurityAssessments({
      severity: filters?.severity,
      status: 'Unhealthy', // Only return failing assessments
      resourceType: filters?.resourceType,
    });

    return assessments.map((assessment) => this.convertToSecurityFinding(assessment));
  }

  /**
   * Gets security findings for a specific resource
   *
   * @param resourceId - Full Azure resource ID
   * @returns Array of security findings for the resource
   *
   * @example
   * ```typescript
   * const findings = await securityService.getSecurityFindingsForResource(
   *   '/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Compute/virtualMachines/{vm}'
   * );
   * ```
   */
  async getSecurityFindingsForResource(resourceId: string): Promise<SecurityFinding[]> {
    const allAssessments = await this.getSecurityAssessments({ status: 'Unhealthy' });
    const resourceAssessments = allAssessments.filter(
      (assessment) => assessment.resourceId === resourceId
    );

    return resourceAssessments.map((assessment) => this.convertToSecurityFinding(assessment));
  }

  /**
   * Gets compliance results for regulatory standards
   *
   * @returns Array of compliance results (CIS, PCI-DSS, ISO 27001, etc.)
   *
   * @example
   * ```typescript
   * const compliance = await securityService.getComplianceResults();
   * compliance.forEach(result => {
   *   console.log(`${result.standardName}: ${result.compliancePercentage}%`);
   * });
   * ```
   */
  async getComplianceResults(): Promise<ComplianceResult[]> {
    try {
      const scope = `/subscriptions/${this.config.subscriptionId}`;
      const complianceIterator = this.client.regulatoryComplianceStandards.list(scope as any);
      const results: ComplianceResult[] = [];

      for await (const standard of complianceIterator) {
        const passedControls = (standard as any).properties?.passedControls || 0;
        const failedControls = (standard as any).properties?.failedControls || 0;
        const skippedControls = (standard as any).properties?.skippedControls || 0;
        const totalControls = passedControls + failedControls + skippedControls;

        const compliancePercentage =
          totalControls > 0 ? Math.round((passedControls / totalControls) * 100) : 0;

        results.push({
          standardName: (standard as any).properties?.description || standard.name || 'Unknown',
          passedControls,
          failedControls,
          skippedControls,
          totalControls,
          compliancePercentage,
        });
      }

      return results;
    } catch (error) {
      console.error('[AzureSecurityCenterService] Failed to get compliance results:', error);
      throw new Error(
        `Failed to get Azure compliance results: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Normalizes Azure assessment to our format
   *
   * @private
   */
  private normalizeAssessment(assessment: Assessment): SecurityAssessment {
    const metadata = (assessment as any).properties?.metadata;
    const status = this.normalizeAssessmentStatus((assessment as any).properties?.status);

    return {
      id: assessment.id || '',
      name: assessment.name || '',
      displayName: metadata?.displayName || assessment.name || 'Unknown Assessment',
      description: metadata?.description || '',
      severity: this.normalizeSeverity(metadata?.severity),
      status,
      resourceId: (assessment as any).properties?.resourceDetails?.id,
      resourceType: this.extractResourceType((assessment as any).properties?.resourceDetails?.id),
      remediation: metadata?.remediationDescription,
      category: metadata?.category || 'General',
      compliance: metadata?.implementationEffort ? [metadata.implementationEffort] : [],
      metadata: {
        assessmentType: metadata?.assessmentType,
        implementationEffort: metadata?.implementationEffort,
        userImpact: metadata?.userImpact,
        threats: metadata?.threats,
      },
    };
  }

  /**
   * Normalizes assessment status
   *
   * @private
   */
  private normalizeAssessmentStatus(
    status?: AssessmentStatus
  ): 'Healthy' | 'Unhealthy' | 'NotApplicable' {
    const code = status?.code;

    switch (code) {
      case 'Healthy':
        return 'Healthy';
      case 'Unhealthy':
        return 'Unhealthy';
      case 'NotApplicable':
        return 'NotApplicable';
      default:
        return 'NotApplicable';
    }
  }

  /**
   * Normalizes severity to our enum
   *
   * @private
   */
  private normalizeSeverity(severity?: string): SecuritySeverity {
    if (!severity) return 'low';

    const normalized = severity.toLowerCase();
    switch (normalized) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'informational';
    }
  }

  /**
   * Checks if assessment matches filters
   *
   * @private
   */
  private matchesAssessmentFilters(
    assessment: SecurityAssessment,
    filters?: {
      severity?: SecuritySeverity[];
      status?: 'Healthy' | 'Unhealthy' | 'NotApplicable';
      resourceType?: string;
    }
  ): boolean {
    if (!filters) return true;

    if (filters.severity && !filters.severity.includes(assessment.severity)) {
      return false;
    }

    if (filters.status && assessment.status !== filters.status) {
      return false;
    }

    if (filters.resourceType && assessment.resourceType !== filters.resourceType) {
      return false;
    }

    return true;
  }

  /**
   * Converts SecurityAssessment to SecurityFinding
   *
   * @private
   */
  private convertToSecurityFinding(assessment: SecurityAssessment): SecurityFinding {
    return {
      findingId: assessment.id,
      title: assessment.displayName,
      description: assessment.description,
      severity: assessment.severity,
      category: assessment.category,
      resourceId: assessment.resourceId,
      resourceType: assessment.resourceType,
      remediation: assessment.remediation,
      compliance: assessment.compliance,
      metadata: assessment.metadata,
      firstObservedAt: new Date(), // Azure doesn't track first observed
      lastObservedAt: new Date(),
    };
  }

  /**
   * Extracts resource type from resource ID
   *
   * @private
   */
  private extractResourceType(resourceId?: string): string | undefined {
    if (!resourceId) return undefined;

    const match = resourceId.match(/\/providers\/([^\/]+\/[^\/]+)/i);
    return match ? match[1] : undefined;
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
