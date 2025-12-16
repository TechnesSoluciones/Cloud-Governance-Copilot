/**
 * RecommendationsSummary Component
 *
 * Displays summary cards showing aggregated Azure Advisor recommendation statistics.
 *
 * Features:
 * - Total recommendations count
 * - Total potential savings
 * - Breakdown by category
 * - Breakdown by impact level
 * - Loading skeletons
 * - Responsive grid layout
 */

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign,
  AlertCircle,
  TrendingUp,
  Activity,
} from 'lucide-react';
import {
  RecommendationSummaryDTO,
  AdvisorCategory,
  formatCurrency,
} from '@/types/azure-advisor';
import { CategoryBadge } from './CategoryBadge';

export interface RecommendationsSummaryProps {
  data: RecommendationSummaryDTO | undefined | null;
  isLoading?: boolean;
}

/**
 * Summary Card Component
 */
interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  iconColor: string;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  iconColor,
  subtitle,
  trend,
}: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="h-3 w-3 text-green-600" aria-hidden="true" />
            <span className="text-xs text-green-600 font-medium">
              {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Category Breakdown Card
 */
function CategoryBreakdownCard({
  byCategory,
}: {
  byCategory: Record<AdvisorCategory, number>;
}) {
  const categories: AdvisorCategory[] = [
    'Cost',
    'Security',
    'Reliability',
    'Performance',
    'OperationalExcellence',
  ];

  const total = Object.values(byCategory).reduce((sum, count) => sum + count, 0);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Recommendations by Category
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((category) => {
            const count = byCategory[category] || 0;
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div
                key={category}
                className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <CategoryBadge category={category} showIcon size="sm" />
                <div className="text-2xl font-bold text-gray-900 mt-2">
                  {count}
                </div>
                <div className="text-xs text-gray-500">{percentage}%</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Impact Breakdown Card
 */
function ImpactBreakdownCard({
  byImpact,
}: {
  byImpact: Record<'High' | 'Medium' | 'Low', number>;
}) {
  const impacts: Array<'High' | 'Medium' | 'Low'> = ['High', 'Medium', 'Low'];

  const total = Object.values(byImpact).reduce((sum, count) => sum + count, 0);

  const impactColors = {
    High: 'text-red-600 bg-red-50 border-red-200',
    Medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    Low: 'text-gray-600 bg-gray-50 border-gray-200',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          By Impact Level
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {impacts.map((impact) => {
            const count = byImpact[impact] || 0;
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div
                key={impact}
                className={`flex items-center justify-between p-3 rounded-lg border ${impactColors[impact]}`}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <span className="font-medium">{impact}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">{count}</span>
                  <span className="text-sm">({percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Loading Skeleton
 */
function SummarySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-3 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Main RecommendationsSummary Component
 */
export function RecommendationsSummary({
  data,
  isLoading,
}: RecommendationsSummaryProps) {
  // Loading state
  if (isLoading || !data) {
    return <SummarySkeleton />;
  }

  const {
    totalRecommendations,
    totalPotentialSavings,
    byCategory,
    byImpact,
    currency,
  } = data;

  // Calculate high priority count
  const highPriorityCount = byImpact?.High || 0;

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Recommendations"
          value={totalRecommendations}
          icon={Activity}
          iconColor="text-blue-600"
          subtitle="Active recommendations"
        />

        <SummaryCard
          title="Potential Savings"
          value={formatCurrency(totalPotentialSavings, currency)}
          icon={DollarSign}
          iconColor="text-green-600"
          subtitle="Estimated monthly savings"
        />

        <SummaryCard
          title="High Impact"
          value={highPriorityCount}
          icon={AlertCircle}
          iconColor="text-red-600"
          subtitle="Urgent recommendations"
        />

        <SummaryCard
          title="Cost Optimization"
          value={byCategory?.Cost || 0}
          icon={DollarSign}
          iconColor="text-green-600"
          subtitle="Cost-related recommendations"
        />
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CategoryBreakdownCard byCategory={byCategory} />
        <ImpactBreakdownCard byImpact={byImpact} />
      </div>
    </div>
  );
}

/**
 * Export individual card components for custom layouts
 */
export { SummaryCard, CategoryBreakdownCard, ImpactBreakdownCard };
