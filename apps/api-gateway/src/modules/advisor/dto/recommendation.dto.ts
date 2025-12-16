/**
 * Azure Advisor Recommendation DTOs
 *
 * Data Transfer Objects for Azure Advisor recommendations API.
 * These DTOs are used for request validation and response formatting.
 *
 * @module modules/advisor/dto
 */

/**
 * Recommendation category enum
 */
export enum RecommendationCategory {
  COST = 'Cost',
  SECURITY = 'Security',
  RELIABILITY = 'Reliability',
  PERFORMANCE = 'Performance',
  OPERATIONAL_EXCELLENCE = 'OperationalExcellence',
}

/**
 * Recommendation impact level
 */
export enum RecommendationImpact {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

/**
 * Recommendation status
 */
export enum RecommendationStatus {
  ACTIVE = 'Active',
  SUPPRESSED = 'Suppressed',
  DISMISSED = 'Dismissed',
  RESOLVED = 'Resolved',
}

/**
 * Potential savings information for cost recommendations
 */
export interface PotentialSavingsDTO {
  amount: number;
  currency: string;
  period?: 'monthly' | 'yearly';
}

/**
 * Remediation step
 */
export interface RemediationStepDTO {
  order: number;
  description: string;
  actionUrl?: string;
}

/**
 * Azure Advisor Recommendation DTO
 *
 * Complete representation of an Azure Advisor recommendation
 */
export interface AdvisorRecommendationDTO {
  id: string;
  category: RecommendationCategory;
  impact: RecommendationImpact;
  shortDescription: string;
  longDescription?: string;
  potentialBenefits?: string;
  resourceId: string;
  resourceType?: string;
  resourceGroup?: string;
  region?: string;
  potentialSavings?: PotentialSavingsDTO;
  remediationSteps: string[];
  status: RecommendationStatus;
  lastUpdated: Date;
  suppressedUntil?: Date;
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Simplified recommendation for list responses
 */
export interface RecommendationListItemDTO {
  id: string;
  category: RecommendationCategory;
  impact: RecommendationImpact;
  shortDescription: string;
  resourceId: string;
  resourceType?: string;
  potentialSavings?: PotentialSavingsDTO;
  status: RecommendationStatus;
  lastUpdated: Date;
}

/**
 * Recommendation filters for GET requests
 */
export interface RecommendationFiltersDTO {
  category?: RecommendationCategory;
  impact?: RecommendationImpact[];
  status?: RecommendationStatus;
  resourceType?: string;
  resourceGroup?: string;
  region?: string;
  minSavings?: number;
  page?: number;
  limit?: number;
  sortBy?: 'impact' | 'savings' | 'lastUpdated';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated recommendations response
 */
export interface PaginatedRecommendationsDTO {
  data: RecommendationListItemDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalSavings: number;
    byCategory: {
      [key in RecommendationCategory]?: number;
    };
    byImpact: {
      [key in RecommendationImpact]?: number;
    };
  };
}

/**
 * Recommendation details response (single recommendation)
 */
export interface RecommendationDetailsDTO extends AdvisorRecommendationDTO {
  relatedResources?: string[];
  complianceImpact?: string;
  estimatedImplementationTime?: string;
}
