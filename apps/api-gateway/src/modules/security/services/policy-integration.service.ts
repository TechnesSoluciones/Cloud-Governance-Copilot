/**
 * Policy Integration Service
 *
 * Bridges Azure Policy compliance data with the Security module.
 * Integrates policy compliance into security scoring and recommendations.
 *
 * Features:
 * - Policy-based security scoring
 * - Compliance-driven security recommendations
 * - Risk assessment based on policy violations
 * - Automated remediation suggestions
 *
 * @module modules/security/services/policy-integration.service
 */

import { AzurePolicyService } from '../../../integrations/azure/policy.service';
import type {
  ComplianceResult,
  NonCompliantResource,
  PolicyEvaluationResult,
} from '../../../integrations/azure/policy.service';
import type { CloudProviderCredentials } from '../../../integrations/cloud-provider.interface';

/**
 * Policy-based security score
 */
export interface PolicySecurityScore {
  overallScore: number; // 0-100
  maxScore: number;
  compliancePercentage: number;
  categoryScores: CategoryScore[];
  trend: ScoreTrend;
  impactSummary: ImpactSummary;
  lastCalculated: Date;
}

/**
 * Category-specific score
 */
export interface CategoryScore {
  category: string;
  score: number;
  maxScore: number;
  percentage: number;
  weight: number;
  policyCount: number;
  violationCount: number;
}

/**
 * Score trend over time
 */
export interface ScoreTrend {
  current: number;
  previousWeek: number;
  change: number;
  direction: 'improving' | 'declining' | 'stable';
}

/**
 * Impact summary
 */
export interface ImpactSummary {
  criticalViolations: number;
  highViolations: number;
  mediumViolations: number;
  lowViolations: number;
  totalViolations: number;
}

/**
 * Security recommendation based on policy compliance
 */
export interface PolicyRecommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  priority: number; // 1-100, higher is more urgent
  affectedResources: AffectedResource[];
  remediationSteps: RemediationStep[];
  estimatedEffort: 'low' | 'medium' | 'high';
  estimatedImpact: 'low' | 'medium' | 'high';
  costImplication: 'none' | 'low' | 'medium' | 'high';
  automatable: boolean;
  relatedPolicies: string[];
  complianceFrameworks: string[];
  metadata: {
    policyId: string;
    policyName: string;
    violationCount: number;
    firstDetected: Date;
    lastUpdated: Date;
  };
}

/**
 * Affected resource
 */
export interface AffectedResource {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  location: string;
  resourceGroup: string;
  violationReason: string;
}

/**
 * Remediation step
 */
export interface RemediationStep {
  order: number;
  description: string;
  type: 'manual' | 'automated' | 'semi-automated';
  estimatedTime: string;
  riskLevel: 'low' | 'medium' | 'high';
  prerequisites?: string[];
  azureCliCommand?: string;
  portalLink?: string;
}

/**
 * Score weights for different policy categories
 */
const CATEGORY_WEIGHTS = {
  Security: 30,
  Compliance: 25,
  Network: 20,
  Storage: 10,
  Compute: 10,
  Monitoring: 5,
};

/**
 * Severity weights for scoring
 */
const SEVERITY_WEIGHTS = {
  critical: 10,
  high: 5,
  medium: 2,
  low: 1,
};

/**
 * Policy Integration Service
 *
 * @example
 * ```typescript
 * const service = new PolicyIntegrationService(credentials);
 *
 * // Get policy security score
 * const score = await service.getPolicySecurityScore('account-id');
 * console.log(`Policy Security Score: ${score.overallScore}/100`);
 *
 * // Get policy-based recommendations
 * const recommendations = await service.getPolicyRecommendations('account-id');
 * console.log(`${recommendations.length} recommendations generated`);
 * ```
 */
export class PolicyIntegrationService {
  private policyService: AzurePolicyService;

  /**
   * Creates a new Policy Integration Service instance
   *
   * @param credentials - Cloud provider credentials
   */
  constructor(credentials: CloudProviderCredentials) {
    this.policyService = new AzurePolicyService(credentials);
  }

  /**
   * Calculates security score based on policy compliance
   *
   * The score is weighted by policy category and severity:
   * - Security policies have the highest weight (30%)
   * - Compliance policies have 25% weight
   * - Network policies have 20% weight
   * - Other categories have lower weights
   *
   * @param accountId - Account identifier (subscription ID)
   * @returns Policy security score with breakdown
   *
   * @example
   * ```typescript
   * const score = await service.getPolicySecurityScore('sub-123');
   *
   * console.log(`Overall Score: ${score.overallScore}/100`);
   * console.log(`Compliance: ${score.compliancePercentage}%`);
   * console.log(`Critical Violations: ${score.impactSummary.criticalViolations}`);
   * ```
   */
  async getPolicySecurityScore(accountId: string): Promise<PolicySecurityScore> {
    try {
      // Get overall compliance
      const compliance = await this.policyService.getPolicyCompliance(accountId);

      // Calculate category scores
      const categoryScores = this.calculateCategoryScores(compliance);

      // Calculate weighted overall score
      const overallScore = this.calculateWeightedScore(categoryScores);

      // Calculate impact summary
      const impactSummary = this.calculateImpactSummary(compliance);

      // Calculate trend (simplified - would need historical data in production)
      const trend: ScoreTrend = {
        current: overallScore,
        previousWeek: overallScore, // Would come from historical data
        change: 0,
        direction: 'stable',
      };

      return {
        overallScore,
        maxScore: 100,
        compliancePercentage: compliance.compliancePercentage,
        categoryScores,
        trend,
        impactSummary,
        lastCalculated: new Date(),
      };
    } catch (error) {
      console.error('[PolicyIntegrationService] Failed to calculate security score:', error);
      throw new Error(
        `Failed to calculate policy security score: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generates security recommendations based on policy non-compliance
   *
   * Recommendations are prioritized by:
   * 1. Severity (critical > high > medium > low)
   * 2. Number of affected resources
   * 3. Estimated impact on security posture
   * 4. Ease of remediation
   *
   * @param accountId - Account identifier (subscription ID)
   * @returns Array of prioritized security recommendations
   *
   * @example
   * ```typescript
   * const recommendations = await service.getPolicyRecommendations('sub-123');
   *
   * // Get critical recommendations
   * const critical = recommendations.filter(r => r.severity === 'critical');
   *
   * // Get automatable recommendations
   * const automatable = recommendations.filter(r => r.automatable);
   * ```
   */
  async getPolicyRecommendations(accountId: string): Promise<PolicyRecommendation[]> {
    try {
      // Get non-compliant resources
      const nonCompliantResources = await this.policyService.getNonCompliantResources(accountId);

      // Group by policy
      const resourcesByPolicy = this.groupResourcesByPolicy(nonCompliantResources);

      // Generate recommendations
      const recommendations: PolicyRecommendation[] = [];

      for (const [policyId, resources] of resourcesByPolicy.entries()) {
        const recommendation = await this.createRecommendation(
          policyId,
          resources,
          accountId
        );
        recommendations.push(recommendation);
      }

      // Sort by priority (highest first)
      recommendations.sort((a, b) => b.priority - a.priority);

      console.log(
        `[PolicyIntegrationService] Generated ${recommendations.length} policy-based recommendations`
      );
      return recommendations;
    } catch (error) {
      console.error('[PolicyIntegrationService] Failed to generate recommendations:', error);
      throw new Error(
        `Failed to generate policy recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets compliance gap analysis
   *
   * Identifies areas where compliance is weak and provides
   * actionable insights for improvement.
   *
   * @param accountId - Account identifier (subscription ID)
   * @returns Compliance gap analysis
   */
  async getComplianceGapAnalysis(accountId: string): Promise<{
    criticalGaps: string[];
    highPriorityGaps: string[];
    recommendations: string[];
    estimatedRemediationTime: string;
  }> {
    try {
      const compliance = await this.policyService.getPolicyCompliance(accountId);
      const recommendations = await this.getPolicyRecommendations(accountId);

      const criticalGaps: string[] = [];
      const highPriorityGaps: string[] = [];

      for (const policy of compliance.policyBreakdown) {
        if (policy.compliancePercentage < 50) {
          if (policy.severity === 'critical') {
            criticalGaps.push(
              `${policy.policyName}: ${policy.compliancePercentage}% compliant`
            );
          } else if (policy.severity === 'high') {
            highPriorityGaps.push(
              `${policy.policyName}: ${policy.compliancePercentage}% compliant`
            );
          }
        }
      }

      const topRecommendations = recommendations
        .slice(0, 5)
        .map((r) => r.title);

      // Estimate total remediation time
      const totalEffortHours = recommendations.reduce((sum, r) => {
        const effortMap = { low: 1, medium: 4, high: 8 };
        return sum + effortMap[r.estimatedEffort] * r.affectedResources.length;
      }, 0);

      const estimatedRemediationTime =
        totalEffortHours < 8
          ? 'Less than 1 day'
          : totalEffortHours < 40
            ? `${Math.ceil(totalEffortHours / 8)} days`
            : `${Math.ceil(totalEffortHours / 40)} weeks`;

      return {
        criticalGaps,
        highPriorityGaps,
        recommendations: topRecommendations,
        estimatedRemediationTime,
      };
    } catch (error) {
      console.error('[PolicyIntegrationService] Failed to analyze compliance gaps:', error);
      throw error;
    }
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Calculates category scores from compliance data
   *
   * @private
   */
  private calculateCategoryScores(compliance: ComplianceResult): CategoryScore[] {
    const categoryMap = new Map<string, CategoryScore>();

    for (const policy of compliance.policyBreakdown) {
      const category = policy.category;

      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          score: 0,
          maxScore: 0,
          percentage: 0,
          weight: CATEGORY_WEIGHTS[category as keyof typeof CATEGORY_WEIGHTS] || 5,
          policyCount: 0,
          violationCount: 0,
        });
      }

      const categoryScore = categoryMap.get(category)!;
      categoryScore.policyCount++;
      categoryScore.violationCount += policy.nonCompliantCount;

      // Add to score based on compliance percentage
      const policyScore = policy.compliancePercentage;
      categoryScore.score += policyScore;
      categoryScore.maxScore += 100;
    }

    // Calculate percentages
    const scores = Array.from(categoryMap.values());
    scores.forEach((score) => {
      score.percentage = score.maxScore > 0 ? (score.score / score.maxScore) * 100 : 100;
    });

    return scores;
  }

  /**
   * Calculates weighted overall score
   *
   * @private
   */
  private calculateWeightedScore(categoryScores: CategoryScore[]): number {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const category of categoryScores) {
      totalWeightedScore += category.percentage * category.weight;
      totalWeight += category.weight;
    }

    return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 100;
  }

  /**
   * Calculates impact summary from compliance data
   *
   * @private
   */
  private calculateImpactSummary(compliance: ComplianceResult): ImpactSummary {
    let criticalViolations = 0;
    let highViolations = 0;
    let mediumViolations = 0;
    let lowViolations = 0;

    for (const policy of compliance.policyBreakdown) {
      const count = policy.nonCompliantCount;

      switch (policy.severity) {
        case 'critical':
          criticalViolations += count;
          break;
        case 'high':
          highViolations += count;
          break;
        case 'medium':
          mediumViolations += count;
          break;
        case 'low':
          lowViolations += count;
          break;
      }
    }

    return {
      criticalViolations,
      highViolations,
      mediumViolations,
      lowViolations,
      totalViolations:
        criticalViolations + highViolations + mediumViolations + lowViolations,
    };
  }

  /**
   * Groups non-compliant resources by policy
   *
   * @private
   */
  private groupResourcesByPolicy(
    resources: NonCompliantResource[]
  ): Map<string, NonCompliantResource[]> {
    const map = new Map<string, NonCompliantResource[]>();

    for (const resource of resources) {
      const policyId = resource.policyDefinitionId;

      if (!map.has(policyId)) {
        map.set(policyId, []);
      }

      map.get(policyId)!.push(resource);
    }

    return map;
  }

  /**
   * Creates a recommendation from policy violations
   *
   * @private
   */
  private async createRecommendation(
    policyId: string,
    resources: NonCompliantResource[],
    accountId: string
  ): Promise<PolicyRecommendation> {
    const firstResource = resources[0];
    const severity = firstResource.severity || 'medium';
    const policyName = firstResource.policyDefinitionName;

    // Calculate priority
    const priority = this.calculatePriority(severity, resources.length);

    // Map resources to affected resources
    const affectedResources: AffectedResource[] = resources.map((r) => ({
      resourceId: r.resourceId,
      resourceName: r.resourceName,
      resourceType: r.resourceType,
      location: r.location,
      resourceGroup: r.resourceGroup,
      violationReason: r.reason,
    }));

    // Generate remediation steps
    const remediationSteps = this.generateRemediationSteps(policyName, severity);

    // Determine if automatable
    const automatable = policyId.toLowerCase().includes('deployifnotexists') ||
                       policyId.toLowerCase().includes('modify');

    // Estimate effort and impact
    const estimatedEffort = this.estimateEffort(resources.length, automatable);
    const estimatedImpact = this.estimateImpact(severity, resources.length);

    return {
      id: `policy-rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `Remediate ${policyName} Policy Violations`,
      description: `${resources.length} resource(s) are not compliant with ${policyName}. Immediate action recommended to improve security posture.`,
      category: this.extractCategory(policyName),
      severity,
      priority,
      affectedResources,
      remediationSteps,
      estimatedEffort,
      estimatedImpact,
      costImplication: this.estimateCostImplication(policyName),
      automatable,
      relatedPolicies: [policyId],
      complianceFrameworks: this.identifyComplianceFrameworks(policyName),
      metadata: {
        policyId,
        policyName,
        violationCount: resources.length,
        firstDetected: new Date(Math.min(...resources.map((r) => r.timestamp.getTime()))),
        lastUpdated: new Date(),
      },
    };
  }

  /**
   * Calculates recommendation priority
   *
   * @private
   */
  private calculatePriority(
    severity: 'critical' | 'high' | 'medium' | 'low',
    resourceCount: number
  ): number {
    const severityScore = SEVERITY_WEIGHTS[severity];
    const volumeScore = Math.min(resourceCount / 10, 10); // Cap at 10

    return Math.min(Math.round((severityScore + volumeScore) * 5), 100);
  }

  /**
   * Generates remediation steps for a policy
   *
   * @private
   */
  private generateRemediationSteps(
    policyName: string,
    severity: 'critical' | 'high' | 'medium' | 'low'
  ): RemediationStep[] {
    const steps: RemediationStep[] = [
      {
        order: 1,
        description: 'Review policy requirements and affected resources',
        type: 'manual',
        estimatedTime: '15 minutes',
        riskLevel: 'low',
        portalLink: 'https://portal.azure.com/#blade/Microsoft_Azure_Policy/PolicyMenuBlade',
      },
      {
        order: 2,
        description: 'Identify root cause of non-compliance',
        type: 'manual',
        estimatedTime: '30 minutes',
        riskLevel: 'low',
      },
      {
        order: 3,
        description: 'Update resource configurations to meet policy requirements',
        type: 'manual',
        estimatedTime: '1-2 hours',
        riskLevel: 'medium',
      },
      {
        order: 4,
        description: 'Re-evaluate compliance and verify remediation',
        type: 'automated',
        estimatedTime: '5 minutes',
        riskLevel: 'low',
        azureCliCommand: 'az policy state trigger-scan --no-wait',
      },
    ];

    return steps;
  }

  /**
   * Estimates remediation effort
   *
   * @private
   */
  private estimateEffort(
    resourceCount: number,
    automatable: boolean
  ): 'low' | 'medium' | 'high' {
    if (automatable) return 'low';
    if (resourceCount <= 5) return 'low';
    if (resourceCount <= 20) return 'medium';
    return 'high';
  }

  /**
   * Estimates security impact
   *
   * @private
   */
  private estimateImpact(
    severity: 'critical' | 'high' | 'medium' | 'low',
    resourceCount: number
  ): 'low' | 'medium' | 'high' {
    if (severity === 'critical') return 'high';
    if (severity === 'high' && resourceCount > 10) return 'high';
    if (severity === 'high' || resourceCount > 20) return 'medium';
    return 'low';
  }

  /**
   * Estimates cost implication
   *
   * @private
   */
  private estimateCostImplication(policyName: string): 'none' | 'low' | 'medium' | 'high' {
    const name = policyName.toLowerCase();

    if (name.includes('encryption') || name.includes('backup')) return 'medium';
    if (name.includes('storage') || name.includes('tier')) return 'low';

    return 'none';
  }

  /**
   * Extracts category from policy name
   *
   * @private
   */
  private extractCategory(policyName: string): string {
    const categories = ['Security', 'Compliance', 'Network', 'Storage', 'Compute', 'Monitoring'];

    for (const category of categories) {
      if (policyName.toLowerCase().includes(category.toLowerCase())) {
        return category;
      }
    }

    return 'General';
  }

  /**
   * Identifies applicable compliance frameworks
   *
   * @private
   */
  private identifyComplianceFrameworks(policyName: string): string[] {
    const frameworks: string[] = [];
    const name = policyName.toLowerCase();

    if (name.includes('cis')) frameworks.push('CIS');
    if (name.includes('pci')) frameworks.push('PCI-DSS');
    if (name.includes('hipaa')) frameworks.push('HIPAA');
    if (name.includes('iso')) frameworks.push('ISO 27001');
    if (name.includes('nist')) frameworks.push('NIST');

    return frameworks.length > 0 ? frameworks : ['General'];
  }
}
