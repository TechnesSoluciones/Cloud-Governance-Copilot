/**
 * Azure Advisor Types
 * TypeScript interfaces for Azure Advisor recommendations
 *
 * Based on Azure Advisor API specifications
 */

// Azure Advisor Categories
export type AdvisorCategory =
  | 'Cost'
  | 'Security'
  | 'Reliability'
  | 'Performance'
  | 'OperationalExcellence';

// Impact Levels
export type AdvisorImpact = 'High' | 'Medium' | 'Low';

// Recommendation Status
export type AdvisorStatus = 'Active' | 'Suppressed' | 'Dismissed' | 'Resolved';

// Suppression Duration (in days)
export type SuppressionDuration = 7 | 30 | 90 | -1; // -1 means permanent

/**
 * Potential Savings Information
 */
export interface PotentialSavings {
  amount: number;
  currency: string;
  unit?: 'Monthly' | 'Yearly' | 'OneTime';
}

/**
 * Affected Resource Information
 */
export interface AffectedResource {
  resourceId: string;
  resourceType: string;
  resourceName?: string;
  resourceGroup?: string;
  subscription?: string;
}

/**
 * Remediation Step
 */
export interface RemediationStep {
  stepNumber: number;
  description: string;
  command?: string;
  documentationUrl?: string;
}

/**
 * Extended Properties
 */
export interface ExtendedProperties {
  assessmentKey?: string;
  score?: number;
  [key: string]: any;
}

/**
 * Azure Advisor Recommendation DTO
 * Main recommendation interface matching backend API
 */
export interface AdvisorRecommendationDTO {
  id: string;
  category: AdvisorCategory;
  impact: AdvisorImpact;
  shortDescription: string;
  longDescription: string;
  resourceId: string;
  resourceType: string;
  resourceName?: string;
  potentialSavings?: PotentialSavings;
  remediationSteps: RemediationStep[];
  status: AdvisorStatus;
  suppressedUntil?: string; // ISO date string
  lastUpdated: string; // ISO date string
  extendedProperties?: ExtendedProperties;
}

/**
 * Recommendation Filters
 * Used for filtering recommendations list
 */
export interface RecommendationFilters {
  category?: AdvisorCategory | 'all';
  impact?: AdvisorImpact | 'all';
  status?: AdvisorStatus | 'all';
  searchQuery?: string;
}

/**
 * Recommendation Summary DTO
 * Aggregated statistics for recommendations
 */
export interface RecommendationSummaryDTO {
  totalRecommendations: number;
  byCategory: Record<AdvisorCategory, number>;
  byImpact: Record<AdvisorImpact, number>;
  byStatus: Record<AdvisorStatus, number>;
  totalPotentialSavings: number;
  currency: string;
}

/**
 * Category Breakdown for Savings Dashboard
 */
export interface CategorySavingsBreakdown {
  category: AdvisorCategory;
  count: number;
  totalSavings: number;
  percentage: number;
}

/**
 * Top Opportunity Item
 */
export interface TopOpportunity {
  id: string;
  description: string;
  category: AdvisorCategory;
  impact: AdvisorImpact;
  savings: number;
  resourceName?: string;
}

/**
 * Savings Trend Data Point
 */
export interface SavingsTrendDataPoint {
  date: string; // ISO date string
  totalSavings: number;
  newRecommendations: number;
  resolvedRecommendations: number;
}

/**
 * Potential Savings Dashboard Data
 */
export interface PotentialSavingsDashboardDTO {
  totalPotentialSavings: number;
  currency: string;
  savingsByCategory: CategorySavingsBreakdown[];
  topOpportunities: TopOpportunity[];
  savingsTrend: SavingsTrendDataPoint[];
  lastUpdated: string; // ISO date string
}

/**
 * Suppress Recommendation Request
 */
export interface SuppressRecommendationRequest {
  duration: SuppressionDuration;
  reason?: string;
}

/**
 * Dismiss Recommendation Request
 */
export interface DismissRecommendationRequest {
  reason: string;
  permanent?: boolean;
}

/**
 * Apply Recommendation Request
 */
export interface ApplyRecommendationRequest {
  notes?: string;
  scheduledFor?: string; // ISO date string
  applyAutomatically?: boolean;
}

/**
 * Paginated List Response
 */
export interface PaginatedRecommendationsResponse {
  recommendations: AdvisorRecommendationDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Query Parameters for List Recommendations
 */
export interface ListRecommendationsParams {
  category?: AdvisorCategory | 'all';
  impact?: AdvisorImpact | 'all';
  status?: AdvisorStatus | 'all';
  searchQuery?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'lastUpdated' | 'impact' | 'category' | 'savings';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Utility Types
 */

// Color mapping for categories
export const CATEGORY_COLORS: Record<AdvisorCategory, string> = {
  Cost: 'green',
  Security: 'red',
  Reliability: 'blue',
  Performance: 'yellow',
  OperationalExcellence: 'purple',
};

// Badge styles for categories
export const CATEGORY_BADGE_STYLES: Record<AdvisorCategory, string> = {
  Cost: 'bg-green-100 text-green-800 border-green-300',
  Security: 'bg-red-100 text-red-800 border-red-300',
  Reliability: 'bg-blue-100 text-blue-800 border-blue-300',
  Performance: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  OperationalExcellence: 'bg-purple-100 text-purple-800 border-purple-300',
};

// Impact level styles
export const IMPACT_BADGE_STYLES: Record<AdvisorImpact, string> = {
  High: 'bg-red-100 text-red-800 border-red-300',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Low: 'bg-gray-100 text-gray-800 border-gray-300',
};

// Status badge styles
export const STATUS_BADGE_STYLES: Record<AdvisorStatus, string> = {
  Active: 'bg-blue-100 text-blue-800 border-blue-300',
  Suppressed: 'bg-orange-100 text-orange-800 border-orange-300',
  Dismissed: 'bg-gray-100 text-gray-800 border-gray-300',
  Resolved: 'bg-green-100 text-green-800 border-green-300',
};

// Category icons (Lucide icon names)
export const CATEGORY_ICONS: Record<AdvisorCategory, string> = {
  Cost: 'DollarSign',
  Security: 'Shield',
  Reliability: 'Activity',
  Performance: 'Zap',
  OperationalExcellence: 'Settings',
};

/**
 * Utility Functions
 */

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date relative to now
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
}

/**
 * Get category label
 */
export function getCategoryLabel(category: AdvisorCategory): string {
  const labels: Record<AdvisorCategory, string> = {
    Cost: 'Cost Optimization',
    Security: 'Security',
    Reliability: 'Reliability',
    Performance: 'Performance',
    OperationalExcellence: 'Operational Excellence',
  };
  return labels[category];
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Sort recommendations by priority (impact + category)
 */
export function sortByPriority(
  a: AdvisorRecommendationDTO,
  b: AdvisorRecommendationDTO
): number {
  // Impact weight
  const impactWeight = { High: 3, Medium: 2, Low: 1 };
  const aWeight = impactWeight[a.impact];
  const bWeight = impactWeight[b.impact];

  if (aWeight !== bWeight) return bWeight - aWeight;

  // If same impact, prioritize Cost and Security
  const categoryPriority: Record<AdvisorCategory, number> = {
    Cost: 5,
    Security: 4,
    Reliability: 3,
    Performance: 2,
    OperationalExcellence: 1,
  };

  return categoryPriority[b.category] - categoryPriority[a.category];
}

/**
 * Filter active recommendations
 */
export function filterActiveRecommendations(
  recommendations: AdvisorRecommendationDTO[]
): AdvisorRecommendationDTO[] {
  return recommendations.filter((rec) => rec.status === 'Active');
}

/**
 * Calculate total savings from recommendations
 */
export function calculateTotalSavings(
  recommendations: AdvisorRecommendationDTO[]
): number {
  return recommendations.reduce((sum, rec) => {
    return sum + (rec.potentialSavings?.amount || 0);
  }, 0);
}

/**
 * Group recommendations by category
 */
export function groupByCategory(
  recommendations: AdvisorRecommendationDTO[]
): Record<AdvisorCategory, AdvisorRecommendationDTO[]> {
  const grouped: Record<string, AdvisorRecommendationDTO[]> = {};

  recommendations.forEach((rec) => {
    if (!grouped[rec.category]) {
      grouped[rec.category] = [];
    }
    grouped[rec.category].push(rec);
  });

  return grouped as Record<AdvisorCategory, AdvisorRecommendationDTO[]>;
}
