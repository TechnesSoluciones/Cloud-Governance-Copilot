'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { RecommendationsSummary } from '@/lib/api/recommendations';
import { formatSavings } from '@/lib/api/recommendations';

export interface RecommendationsKPIsProps {
  summary?: RecommendationsSummary | null;
  isLoading?: boolean;
}

export const RecommendationsKPIs: React.FC<RecommendationsKPIsProps> = ({
  summary,
  isLoading = false,
}) => {
  // Calculate applied this month (would need to be passed from API or calculated)
  const appliedThisMonth = 0; // Placeholder - would come from a separate query

  const kpis = [
    {
      id: 'total',
      label: 'Total Open',
      value: summary?.totalRecommendations || 0,
      icon: TrendingUp,
      iconBgColor: 'bg-cloud-blue/10',
      iconColor: 'text-cloud-blue',
      description: 'Open recommendations',
    },
    {
      id: 'savings',
      label: 'Potential Savings',
      value: summary?.totalEstimatedSavings
        ? formatSavings(summary.totalEstimatedSavings)
        : '$0',
      icon: DollarSign,
      iconBgColor: 'bg-brand-orange/10',
      iconColor: 'text-brand-orange',
      description: 'Monthly savings',
      isMonetary: true,
    },
    {
      id: 'high-priority',
      label: 'High Priority',
      value: summary?.byPriority.high || 0,
      icon: AlertCircle,
      iconBgColor: 'bg-error/10',
      iconColor: 'text-error',
      description: 'Critical items',
    },
    {
      id: 'applied',
      label: 'Applied This Month',
      value: appliedThisMonth,
      icon: CheckCircle,
      iconBgColor: 'bg-success/10',
      iconColor: 'text-success',
      description: 'Successfully applied',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpis.map((kpi) => (
          <Card key={kpi.id} className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
              <Skeleton className="h-12 w-12 rounded-lg" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
      role="region"
      aria-label="Key performance indicators"
    >
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card
            key={kpi.id}
            className="p-6 transition-all duration-200 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-2">
                  {kpi.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 tracking-tight">
                  {kpi.isMonetary ? kpi.value : kpi.value.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">{kpi.description}</p>
              </div>
              <div className={`p-3 rounded-lg ${kpi.iconBgColor}`}>
                <Icon className={`h-6 w-6 ${kpi.iconColor}`} aria-hidden="true" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default RecommendationsKPIs;
