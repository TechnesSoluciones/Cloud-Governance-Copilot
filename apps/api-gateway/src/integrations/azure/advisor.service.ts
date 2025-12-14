/**
 * Azure Advisor Service
 *
 * Provides access to Azure Advisor recommendations for cost optimization,
 * security, reliability, performance, and operational excellence.
 *
 * Features:
 * - Fetch recommendations by category (Cost, Security, Reliability, etc.)
 * - Filter by impact level (High, Medium, Low)
 * - Estimate cost savings
 * - Suppress/activate recommendations
 *
 * @module integrations/azure/advisor.service
 */

import { AdvisorManagementClient } from '@azure/arm-advisor';
import { ClientSecretCredential } from '@azure/identity';
import type {
  ResourceRecommendationBase,
  RecommendationCategory,
  Impact,
} from '@azure/arm-advisor';
import type { CloudProviderCredentials } from '../cloud-provider.interface';

/**
 * Azure Advisor configuration
 */
interface AzureAdvisorConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  subscriptionId: string;
}

/**
 * Normalized Azure Advisor recommendation
 */
export interface AdvisorRecommendation {
  id: string;
  name: string;
  category: 'Cost' | 'Security' | 'Reliability' | 'Performance' | 'OperationalExcellence';
  impact: 'High' | 'Medium' | 'Low';
  shortDescription: string;
  longDescription?: string;
  potentialBenefits?: string;
  impactedField?: string;
  impactedValue?: string;
  lastUpdated?: Date;
  metadata: {
    resourceId?: string;
    resourceType?: string;
    resourceGroup?: string;
    region?: string;
    estimatedSavings?: {
      amount: number;
      currency: string;
    };
    recommendedActions?: string[];
  };
}

/**
 * Recommendation filters
 */
export interface RecommendationFilters {
  category?: RecommendationCategory;
  impact?: Impact[];
  resourceType?: string;
}

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

/**
 * Azure Advisor Service
 *
 * @example
 * ```typescript
 * const advisorService = new AzureAdvisorService({
 *   provider: 'azure',
 *   azureClientId: process.env.AZURE_CLIENT_ID!,
 *   azureClientSecret: process.env.AZURE_CLIENT_SECRET!,
 *   azureTenantId: process.env.AZURE_TENANT_ID!,
 *   azureSubscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
 * });
 *
 * // Get all cost recommendations
 * const costRecs = await advisorService.getRecommendations({ category: 'Cost' });
 *
 * // Get high-impact security recommendations
 * const securityRecs = await advisorService.getRecommendations({
 *   category: 'Security',
 *   impact: ['High'],
 * });
 *
 * // Generate new recommendations
 * await advisorService.generateRecommendations();
 * ```
 */
export class AzureAdvisorService {
  private client: AdvisorManagementClient;
  private credential: ClientSecretCredential;
  private config: AzureAdvisorConfig;

  /**
   * Creates a new Azure Advisor Service instance
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

    // Initialize Advisor client
    this.client = new AdvisorManagementClient(this.credential, this.config.subscriptionId);

    console.log('[AzureAdvisorService] Initialized for subscription:', this.config.subscriptionId);
  }

  /**
   * Fetches Azure Advisor recommendations with optional filtering
   *
   * @param filters - Optional filters for category, impact, resource type
   * @returns Array of normalized recommendations
   *
   * @example
   * ```typescript
   * // Get all recommendations
   * const all = await advisorService.getRecommendations();
   *
   * // Get only cost recommendations
   * const cost = await advisorService.getRecommendations({ category: 'Cost' });
   *
   * // Get high-impact reliability recommendations
   * const reliability = await advisorService.getRecommendations({
   *   category: 'Reliability',
   *   impact: ['High'],
   * });
   * ```
   */
  async getRecommendations(
    filters?: RecommendationFilters
  ): Promise<AdvisorRecommendation[]> {
    try {
      const recommendations: AdvisorRecommendation[] = [];

      // List all recommendations
      const recsIterator = this.client.recommendations.list({
        filter: this.buildFilter(filters),
      });

      for await (const rec of recsIterator) {
        const normalized = this.normalizeRecommendation(rec);

        // Apply additional client-side filters if needed
        if (this.matchesFilters(normalized, filters)) {
          recommendations.push(normalized);
        }
      }

      console.log(`[AzureAdvisorService] Retrieved ${recommendations.length} recommendations`);
      return recommendations;
    } catch (error) {
      console.error('[AzureAdvisorService] Failed to fetch recommendations:', error);
      throw new Error(
        `Failed to fetch Azure Advisor recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Fetches cost-specific recommendations with estimated savings
   *
   * @returns Array of cost optimization recommendations
   *
   * @example
   * ```typescript
   * const costRecs = await advisorService.getCostRecommendations();
   *
   * costRecs.forEach(rec => {
   *   console.log(rec.shortDescription);
   *   if (rec.metadata.estimatedSavings) {
   *     console.log(`Potential savings: $${rec.metadata.estimatedSavings.amount}/year`);
   *   }
   * });
   * ```
   */
  async getCostRecommendations(): Promise<AdvisorRecommendation[]> {
    return this.getRecommendations({ category: 'Cost' });
  }

  /**
   * Fetches security-specific recommendations
   *
   * @returns Array of security recommendations
   */
  async getSecurityRecommendations(): Promise<AdvisorRecommendation[]> {
    return this.getRecommendations({ category: 'Security' });
  }

  /**
   * Fetches reliability-specific recommendations
   *
   * @returns Array of reliability recommendations
   */
  async getReliabilityRecommendations(): Promise<AdvisorRecommendation[]> {
    return this.getRecommendations({ category: 'HighAvailability' });
  }

  /**
   * Fetches performance-specific recommendations
   *
   * @returns Array of performance recommendations
   */
  async getPerformanceRecommendations(): Promise<AdvisorRecommendation[]> {
    return this.getRecommendations({ category: 'Performance' });
  }

  /**
   * Fetches operational excellence recommendations
   *
   * @returns Array of operational excellence recommendations
   */
  async getOperationalExcellenceRecommendations(): Promise<AdvisorRecommendation[]> {
    return this.getRecommendations({ category: 'OperationalExcellence' });
  }

  /**
   * Triggers generation of new recommendations
   *
   * Azure Advisor recommendations are typically updated daily.
   * This method triggers an immediate re-evaluation.
   *
   * Note: This is an async operation on Azure's side. New recommendations
   * may not appear immediately.
   *
   * @returns void
   *
   * @example
   * ```typescript
   * await advisorService.generateRecommendations();
   * console.log('Recommendation generation triggered');
   *
   * // Wait a few minutes, then fetch new recommendations
   * await new Promise(resolve => setTimeout(resolve, 300000)); // 5 min
   * const newRecs = await advisorService.getRecommendations();
   * ```
   */
  async generateRecommendations(): Promise<void> {
    try {
      await this.client.recommendations.generate();
      console.log('[AzureAdvisorService] Recommendation generation triggered');
    } catch (error) {
      console.error('[AzureAdvisorService] Failed to generate recommendations:', error);
      throw new Error(
        `Failed to generate Azure Advisor recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets recommendation metadata for a specific resource
   *
   * @param resourceId - Full Azure resource ID
   * @returns Array of recommendations for the resource
   *
   * @example
   * ```typescript
   * const vmRecs = await advisorService.getRecommendationsForResource(
   *   '/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Compute/virtualMachines/{vm}'
   * );
   * ```
   */
  async getRecommendationsForResource(resourceId: string): Promise<AdvisorRecommendation[]> {
    const allRecs = await this.getRecommendations();
    return allRecs.filter((rec) => rec.metadata.resourceId === resourceId);
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Normalizes Azure Advisor recommendation to our format
   *
   * @private
   */
  private normalizeRecommendation(rec: ResourceRecommendationBase): AdvisorRecommendation {
    const shortDescription = rec.shortDescription?.problem || 'No description';
    const longDescription = rec.extendedProperties?.description;
    const potentialBenefits = rec.shortDescription?.solution;

    // Extract resource metadata
    const resourceId = rec.id || '';
    const resourceGroup = this.extractResourceGroup(resourceId);
    const resourceType = rec.impactedField;

    // Parse estimated savings for cost recommendations
    let estimatedSavings: { amount: number; currency: string } | undefined;
    if (rec.category === 'Cost' && rec.extendedProperties) {
      const annualSavings = rec.extendedProperties.savingsAmount;
      const currency = rec.extendedProperties.savingsCurrency || 'USD';

      if (annualSavings) {
        estimatedSavings = {
          amount: parseFloat(String(annualSavings)),
          currency,
        };
      }
    }

    // Extract recommended actions
    const recommendedActions: string[] = [];
    if (rec.recommendedActions) {
      rec.recommendedActions.forEach((action) => {
        if (action && typeof action === 'object' && 'actionText' in action) {
          recommendedActions.push(String(action.actionText));
        }
      });
    }

    return {
      id: rec.id || '',
      name: rec.name || '',
      category: this.normalizeCategory(rec.category),
      impact: this.normalizeImpact(rec.impact),
      shortDescription,
      longDescription,
      potentialBenefits,
      impactedField: rec.impactedField,
      impactedValue: rec.impactedValue,
      lastUpdated: rec.lastUpdated,
      metadata: {
        resourceId: rec.resourceMetadata?.resourceId,
        resourceType,
        resourceGroup,
        region: rec.resourceMetadata?.location,
        estimatedSavings,
        recommendedActions,
      },
    };
  }

  /**
   * Normalizes category to our enum
   *
   * @private
   */
  private normalizeCategory(
    category?: string
  ): 'Cost' | 'Security' | 'Reliability' | 'Performance' | 'OperationalExcellence' {
    if (!category) return 'OperationalExcellence';

    switch (category) {
      case 'Cost':
        return 'Cost';
      case 'Security':
        return 'Security';
      case 'HighAvailability':
        return 'Reliability';
      case 'Performance':
        return 'Performance';
      case 'OperationalExcellence':
        return 'OperationalExcellence';
      default:
        return 'OperationalExcellence';
    }
  }

  /**
   * Normalizes impact to our enum
   *
   * @private
   */
  private normalizeImpact(impact?: string): 'High' | 'Medium' | 'Low' {
    if (!impact) return 'Low';

    switch (impact) {
      case 'High':
        return 'High';
      case 'Medium':
        return 'Medium';
      case 'Low':
        return 'Low';
      default:
        return 'Low';
    }
  }

  /**
   * Builds OData filter string for API request
   *
   * @private
   */
  private buildFilter(filters?: RecommendationFilters): string | undefined {
    const conditions: string[] = [];

    if (filters?.category) {
      conditions.push(`Category eq '${filters.category}'`);
    }

    if (filters?.resourceType) {
      conditions.push(`ImpactedField eq '${filters.resourceType}'`);
    }

    // Note: Impact filtering done client-side as API filter is unreliable

    return conditions.length > 0 ? conditions.join(' and ') : undefined;
  }

  /**
   * Checks if recommendation matches client-side filters
   *
   * @private
   */
  private matchesFilters(
    rec: AdvisorRecommendation,
    filters?: RecommendationFilters
  ): boolean {
    if (!filters) return true;

    // Impact filter
    if (filters.impact && filters.impact.length > 0) {
      if (!filters.impact.includes(rec.impact)) {
        return false;
      }
    }

    // Resource type filter
    if (filters.resourceType) {
      if (rec.metadata.resourceType !== filters.resourceType) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extracts resource group from Azure resource ID
   *
   * @private
   */
  private extractResourceGroup(resourceId: string): string | undefined {
    const match = resourceId.match(/\/resourceGroups\/([^\/]+)/i);
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
