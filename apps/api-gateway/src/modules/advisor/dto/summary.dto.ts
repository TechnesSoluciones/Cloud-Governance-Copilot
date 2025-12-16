/**
 * Azure Advisor Summary DTOs
 *
 * Data Transfer Objects for Azure Advisor recommendation summaries.
 * Used for dashboard views and analytics.
 *
 * @module modules/advisor/dto
 */

import {
  RecommendationCategory,
  RecommendationImpact,
  RecommendationStatus,
} from './recommendation.dto';

/**
 * Category summary with count and potential savings
 */
export interface CategorySummaryDTO {
  category: RecommendationCategory;
  count: number;
  potentialSavings: number;
  highImpactCount: number;
  mediumImpactCount: number;
  lowImpactCount: number;
}

/**
 * Impact level summary
 */
export interface ImpactSummaryDTO {
  high: number;
  medium: number;
  low: number;
}

/**
 * Status summary
 */
export interface StatusSummaryDTO {
  active: number;
  suppressed: number;
  dismissed: number;
  resolved: number;
}

/**
 * Complete recommendation summary
 *
 * Aggregated statistics for all Azure Advisor recommendations
 */
export interface RecommendationSummaryDTO {
  totalRecommendations: number;
  byCategory: {
    cost: number;
    security: number;
    reliability: number;
    performance: number;
    operationalExcellence: number;
  };
  byImpact: ImpactSummaryDTO;
  byStatus: StatusSummaryDTO;
  totalPotentialSavings: number;
  currency: string;
  categoryDetails: CategorySummaryDTO[];
  lastUpdated: Date;
}

/**
 * Trend data point
 */
export interface TrendDataPointDTO {
  date: Date;
  count: number;
  savings?: number;
}

/**
 * Recommendation trends over time
 */
export interface RecommendationTrendsDTO {
  period: 'week' | 'month' | 'quarter';
  startDate: Date;
  endDate: Date;
  data: {
    byCategory: {
      [key in RecommendationCategory]?: TrendDataPointDTO[];
    };
    byImpact: {
      [key in RecommendationImpact]?: TrendDataPointDTO[];
    };
    totalRecommendations: TrendDataPointDTO[];
    totalSavings: TrendDataPointDTO[];
  };
}

/**
 * Top recommendation (highest impact or savings)
 */
export interface TopRecommendationDTO {
  id: string;
  category: RecommendationCategory;
  impact: RecommendationImpact;
  shortDescription: string;
  resourceId: string;
  potentialSavings?: number;
  rank: number;
}

/**
 * Executive summary for dashboard
 */
export interface ExecutiveSummaryDTO {
  summary: RecommendationSummaryDTO;
  topRecommendations: TopRecommendationDTO[];
  trends?: RecommendationTrendsDTO;
  insights: {
    mostCommonCategory: RecommendationCategory;
    averageSavingsPerRecommendation: number;
    implementationRate: number; // Percentage of resolved recommendations
    suppressionRate: number; // Percentage of suppressed recommendations
  };
}
