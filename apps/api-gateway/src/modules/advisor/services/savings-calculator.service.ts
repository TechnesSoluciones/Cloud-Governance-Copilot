/**
 * Savings Calculator Service
 *
 * Aggregates potential savings from multiple sources:
 * 1. Azure Advisor Cost recommendations
 * 2. Idle resources (from Asset Discovery)
 * 3. Rightsizing opportunities (from Resource Graph)
 * 4. Reserved Instances opportunities
 *
 * Provides a comprehensive view of all cost optimization opportunities.
 *
 * @module modules/advisor/services
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';

/**
 * Potential savings breakdown by source
 */
export interface PotentialSavingsDTO {
  totalPotentialSavings: number;
  currency: string;
  byCategory: {
    advisorRecommendations: number;
    idleResources: number;
    rightsizing: number;
    reservedInstances: number;
  };
  breakdown: SavingsBreakdownItem[];
  lastCalculated: Date;
}

/**
 * Individual savings opportunity
 */
export interface SavingsBreakdownItem {
  id: string;
  source: 'advisor' | 'idle' | 'rightsize' | 'reserved_instance';
  category: string;
  resourceId: string;
  resourceType?: string;
  description: string;
  potentialSavings: number;
  confidence: 'high' | 'medium' | 'low';
  priority: 'high' | 'medium' | 'low';
  estimatedImplementationTime?: string;
}

/**
 * Savings Calculator Service
 *
 * Aggregates cost savings opportunities from multiple sources
 */
export class SavingsCalculatorService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Calculates total potential savings for a tenant's Azure account
   *
   * @param tenantId - Tenant ID
   * @param cloudAccountId - Cloud account ID (optional)
   * @returns Aggregated potential savings
   */
  async calculatePotentialSavings(
    tenantId: string,
    cloudAccountId?: string
  ): Promise<PotentialSavingsDTO> {
    logger.info('[SavingsCalculatorService] Calculating potential savings', {
      tenantId,
      cloudAccountId,
    });

    try {
      // Initialize result
      const result: PotentialSavingsDTO = {
        totalPotentialSavings: 0,
        currency: 'USD',
        byCategory: {
          advisorRecommendations: 0,
          idleResources: 0,
          rightsizing: 0,
          reservedInstances: 0,
        },
        breakdown: [],
        lastCalculated: new Date(),
      };

      // 1. Get Azure Advisor Cost recommendations
      const advisorSavings = await this.getAdvisorCostSavings(tenantId, cloudAccountId);
      result.byCategory.advisorRecommendations = advisorSavings.total;
      result.breakdown.push(...advisorSavings.items);

      // 2. Get idle resources (orphaned assets)
      const idleSavings = await this.getIdleResourcesSavings(tenantId, cloudAccountId);
      result.byCategory.idleResources = idleSavings.total;
      result.breakdown.push(...idleSavings.items);

      // 3. Get rightsizing opportunities
      const rightsizingSavings = await this.getRightsizingSavings(tenantId, cloudAccountId);
      result.byCategory.rightsizing = rightsizingSavings.total;
      result.breakdown.push(...rightsizingSavings.items);

      // 4. Get Reserved Instances opportunities
      const reservedInstanceSavings = await this.getReservedInstanceSavings(tenantId, cloudAccountId);
      result.byCategory.reservedInstances = reservedInstanceSavings.total;
      result.breakdown.push(...reservedInstanceSavings.items);

      // Calculate total
      result.totalPotentialSavings =
        result.byCategory.advisorRecommendations +
        result.byCategory.idleResources +
        result.byCategory.rightsizing +
        result.byCategory.reservedInstances;

      // Sort breakdown by savings (highest first)
      result.breakdown.sort((a, b) => b.potentialSavings - a.potentialSavings);

      logger.info('[SavingsCalculatorService] Calculation complete', {
        tenantId,
        totalSavings: result.totalPotentialSavings,
        breakdownCount: result.breakdown.length,
      });

      return result;
    } catch (error) {
      logger.error('[SavingsCalculatorService] Failed to calculate savings', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================
  // Private Helper Methods - Savings Sources
  // ============================================================

  /**
   * Gets savings from Azure Advisor Cost recommendations
   *
   * @private
   */
  private async getAdvisorCostSavings(
    tenantId: string,
    cloudAccountId?: string
  ): Promise<{ total: number; items: SavingsBreakdownItem[] }> {
    try {
      const where: any = {
        tenantId,
        category: 'Cost',
        status: 'Active',
      };

      const recommendations = await this.prisma.azureAdvisorRecommendation.findMany({
        where,
      });

      const items: SavingsBreakdownItem[] = recommendations
        .filter((r) => r.potentialSavingsAmount)
        .map((r) => ({
          id: r.azureRecommendationId,
          source: 'advisor' as const,
          category: 'Azure Advisor',
          resourceId: r.resourceId,
          resourceType: r.resourceType || undefined,
          description: r.shortDescription,
          potentialSavings: parseFloat(r.potentialSavingsAmount!.toString()),
          confidence: this.mapImpactToConfidence(r.impact),
          priority: this.mapImpactToPriority(r.impact),
        }));

      const total = items.reduce((sum, item) => sum + item.potentialSavings, 0);

      return { total, items };
    } catch (error) {
      logger.error('[SavingsCalculatorService] Failed to get Advisor savings', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { total: 0, items: [] };
    }
  }

  /**
   * Gets savings from idle/orphaned resources
   *
   * @private
   */
  private async getIdleResourcesSavings(
    tenantId: string,
    cloudAccountId?: string
  ): Promise<{ total: number; items: SavingsBreakdownItem[] }> {
    try {
      const where: any = {
        tenantId,
        provider: 'azure',
        isOrphaned: true,
      };

      if (cloudAccountId) {
        where.cloudAccountId = cloudAccountId;
      }

      const orphanedAssets = await this.prisma.asset.findMany({
        where,
        include: {
          costData: {
            orderBy: {
              date: 'desc',
            },
            take: 30, // Last 30 days
          },
        },
      });

      const items: SavingsBreakdownItem[] = orphanedAssets
        .filter((asset) => asset.costLast30Days && parseFloat(asset.costLast30Days.toString()) > 0)
        .map((asset) => {
          const monthlyCost = parseFloat(asset.costLast30Days!.toString());
          const annualSavings = monthlyCost * 12;

          return {
            id: asset.id,
            source: 'idle' as const,
            category: 'Idle Resource',
            resourceId: asset.resourceId,
            resourceType: asset.resourceType,
            description: `Orphaned ${asset.resourceType} - ${asset.name || 'Unnamed'} has no owner and can be terminated`,
            potentialSavings: annualSavings,
            confidence: 'high' as const,
            priority: annualSavings > 1000 ? ('high' as const) : annualSavings > 100 ? ('medium' as const) : ('low' as const),
            estimatedImplementationTime: '1 hour',
          };
        });

      const total = items.reduce((sum, item) => sum + item.potentialSavings, 0);

      return { total, items };
    } catch (error) {
      logger.error('[SavingsCalculatorService] Failed to get idle resources savings', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { total: 0, items: [] };
    }
  }

  /**
   * Gets savings from rightsizing opportunities
   *
   * This analyzes VMs and other resources that are over-provisioned
   * based on actual utilization metrics.
   *
   * @private
   */
  private async getRightsizingSavings(
    tenantId: string,
    cloudAccountId?: string
  ): Promise<{ total: number; items: SavingsBreakdownItem[] }> {
    try {
      // Query cost recommendations for rightsizing
      const where: any = {
        tenantId,
        type: 'rightsize',
        status: 'open',
        provider: 'AZURE',
      };

      const recommendations = await this.prisma.costRecommendation.findMany({
        where,
      });

      const items: SavingsBreakdownItem[] = recommendations.map((r) => ({
        id: r.id,
        source: 'rightsize' as const,
        category: 'Rightsizing',
        resourceId: r.resourceId || '',
        resourceType: r.service,
        description: r.description,
        potentialSavings: parseFloat(r.estimatedSavings.toString()),
        confidence: r.priority === 'high' ? 'high' : r.priority === 'medium' ? 'medium' : 'low',
        priority: r.priority as 'high' | 'medium' | 'low',
        estimatedImplementationTime: '2-4 hours',
      }));

      const total = items.reduce((sum, item) => sum + item.potentialSavings, 0);

      return { total, items };
    } catch (error) {
      logger.error('[SavingsCalculatorService] Failed to get rightsizing savings', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { total: 0, items: [] };
    }
  }

  /**
   * Gets savings from Reserved Instances opportunities
   *
   * Identifies workloads that would benefit from Reserved Instance purchases.
   *
   * @private
   */
  private async getReservedInstanceSavings(
    tenantId: string,
    cloudAccountId?: string
  ): Promise<{ total: number; items: SavingsBreakdownItem[] }> {
    try {
      // Query cost recommendations for reserved instances
      const where: any = {
        tenantId,
        type: 'reserved_instance',
        status: 'open',
        provider: 'AZURE',
      };

      const recommendations = await this.prisma.costRecommendation.findMany({
        where,
      });

      const items: SavingsBreakdownItem[] = recommendations.map((r) => ({
        id: r.id,
        source: 'reserved_instance' as const,
        category: 'Reserved Instances',
        resourceId: r.resourceId || '',
        resourceType: r.service,
        description: r.description,
        potentialSavings: parseFloat(r.estimatedSavings.toString()),
        confidence: 'high' as const, // RI savings are predictable
        priority: r.priority as 'high' | 'medium' | 'low',
        estimatedImplementationTime: '1-2 days',
      }));

      const total = items.reduce((sum, item) => sum + item.potentialSavings, 0);

      return { total, items };
    } catch (error) {
      logger.error('[SavingsCalculatorService] Failed to get Reserved Instance savings', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { total: 0, items: [] };
    }
  }

  // ============================================================
  // Utility Methods
  // ============================================================

  /**
   * Maps Azure Advisor impact to confidence level
   *
   * @private
   */
  private mapImpactToConfidence(impact: string): 'high' | 'medium' | 'low' {
    switch (impact) {
      case 'High':
        return 'high';
      case 'Medium':
        return 'medium';
      case 'Low':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Maps Azure Advisor impact to priority level
   *
   * @private
   */
  private mapImpactToPriority(impact: string): 'high' | 'medium' | 'low' {
    switch (impact) {
      case 'High':
        return 'high';
      case 'Medium':
        return 'medium';
      case 'Low':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Gets top savings opportunities (highest savings)
   *
   * @param tenantId - Tenant ID
   * @param limit - Number of items to return (default: 10)
   * @returns Top savings opportunities
   */
  async getTopSavingsOpportunities(
    tenantId: string,
    limit: number = 10
  ): Promise<SavingsBreakdownItem[]> {
    const savings = await this.calculatePotentialSavings(tenantId);
    return savings.breakdown.slice(0, limit);
  }

  /**
   * Gets savings by resource type
   *
   * @param tenantId - Tenant ID
   * @returns Savings grouped by resource type
   */
  async getSavingsByResourceType(tenantId: string): Promise<{
    [resourceType: string]: number;
  }> {
    const savings = await this.calculatePotentialSavings(tenantId);

    const byResourceType: { [key: string]: number } = {};

    for (const item of savings.breakdown) {
      const resourceType = item.resourceType || 'Unknown';
      byResourceType[resourceType] = (byResourceType[resourceType] || 0) + item.potentialSavings;
    }

    return byResourceType;
  }

  /**
   * Gets quick wins (high confidence, low effort, high savings)
   *
   * @param tenantId - Tenant ID
   * @param minSavings - Minimum savings threshold (default: 500)
   * @returns Quick win opportunities
   */
  async getQuickWins(
    tenantId: string,
    minSavings: number = 500
  ): Promise<SavingsBreakdownItem[]> {
    const savings = await this.calculatePotentialSavings(tenantId);

    return savings.breakdown.filter(
      (item) =>
        item.confidence === 'high' &&
        item.potentialSavings >= minSavings &&
        (item.source === 'idle' || item.source === 'advisor')
    );
  }
}
