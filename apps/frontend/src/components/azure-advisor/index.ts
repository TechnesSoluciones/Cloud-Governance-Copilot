/**
 * Azure Advisor Components
 * Barrel export for all Azure Advisor recommendation components
 */

export { CategoryBadge, ImpactBadge, StatusBadge } from './CategoryBadge';
export type { CategoryBadgeProps, ImpactBadgeProps, StatusBadgeProps } from './CategoryBadge';

export {
  RecommendationsSummary,
  SummaryCard,
  CategoryBreakdownCard,
  ImpactBreakdownCard,
} from './RecommendationsSummary';
export type { RecommendationsSummaryProps } from './RecommendationsSummary';

export {
  RecommendationsFilters,
  CompactRecommendationsFilters,
} from './RecommendationsFilters';
export type {
  RecommendationsFiltersProps,
  CompactFiltersProps,
} from './RecommendationsFilters';

export { RecommendationsList } from './RecommendationsList';
export type { RecommendationsListProps } from './RecommendationsList';

export { RecommendationDetailModal } from './RecommendationDetailModal';
export type { RecommendationDetailModalProps } from './RecommendationDetailModal';

export { SavingsDashboard } from './SavingsDashboard';
export type { SavingsDashboardProps } from './SavingsDashboard';
