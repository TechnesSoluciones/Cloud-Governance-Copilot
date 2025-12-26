/**
 * Recommendation Card Component
 * Detailed card view for individual recommendations
 */

'use client';

import { BadgeV2 } from '../ui/BadgeV2';
import { cn } from '@/lib/utils';

export type RecommendationSeverity = 'critical' | 'high' | 'medium' | 'low';
export type RecommendationCategory = 'security' | 'cost' | 'performance' | 'reliability';

export interface Recommendation {
  id: string;
  severity: RecommendationSeverity;
  category: RecommendationCategory;
  title: string;
  description: string;
  resource: string;
  provider: 'AWS' | 'Azure' | 'GCP';
  region?: string;
  savings?: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  affectedResources: number;
  steps?: string[];
  tags?: string[];
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

const severityConfig: Record<
  RecommendationSeverity,
  { color: string; icon: string; borderColor: string }
> = {
  critical: {
    color: 'text-error',
    icon: 'error',
    borderColor: 'border-l-error',
  },
  high: {
    color: 'text-warning',
    icon: 'warning',
    borderColor: 'border-l-warning',
  },
  medium: {
    color: 'text-info',
    icon: 'info',
    borderColor: 'border-l-info',
  },
  low: {
    color: 'text-slate-500',
    icon: 'check_circle',
    borderColor: 'border-l-slate-300',
  },
};

const categoryConfig: Record<RecommendationCategory, { icon: string; label: string }> = {
  security: { icon: 'security', label: 'Security' },
  cost: { icon: 'attach_money', label: 'Cost Optimization' },
  performance: { icon: 'speed', label: 'Performance' },
  reliability: { icon: 'verified', label: 'Reliability' },
};

const effortConfig: Record<'low' | 'medium' | 'high', { label: string; color: string }> = {
  low: { label: 'Low Effort', color: 'text-success' },
  medium: { label: 'Medium Effort', color: 'text-warning' },
  high: { label: 'High Effort', color: 'text-error' },
};

export function RecommendationCard({
  recommendation,
  onClick,
  selected = false,
  className,
}: RecommendationCardProps) {
  const severityInfo = severityConfig[recommendation.severity];
  const categoryInfo = categoryConfig[recommendation.category];
  const effortInfo = effortConfig[recommendation.effort];

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 p-5 transition-all cursor-pointer border-l-4',
        severityInfo.borderColor,
        selected
          ? 'ring-2 ring-brand-primary-400 shadow-lg'
          : 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1">
          <span
            className={cn(
              'material-symbols-outlined text-2xl mt-0.5',
              severityInfo.color
            )}
          >
            {severityInfo.icon}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1 leading-tight">
              {recommendation.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              {recommendation.description}
            </p>
          </div>
        </div>

        {recommendation.savings && (
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-500 dark:text-slate-400">Savings</span>
            <span className="text-lg font-bold text-success">{recommendation.savings}</span>
          </div>
        )}
      </div>

      {/* Badges Row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <BadgeV2 variant={recommendation.severity} size="sm">
          {recommendation.severity}
        </BadgeV2>
        <BadgeV2
          variant={recommendation.provider.toLowerCase() as 'aws' | 'azure' | 'gcp'}
          size="sm"
        >
          {recommendation.provider}
        </BadgeV2>
        <BadgeV2 variant="default" size="sm" icon={categoryInfo.icon}>
          {categoryInfo.label}
        </BadgeV2>
        {recommendation.region && (
          <BadgeV2 variant="default" size="sm" icon="public">
            {recommendation.region}
          </BadgeV2>
        )}
      </div>

      {/* Resource Info */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Resource</span>
          <span className={cn('font-semibold', effortInfo.color)}>{effortInfo.label}</span>
        </div>
        <code className="text-xs bg-white dark:bg-slate-900 px-2 py-1 rounded text-slate-700 dark:text-slate-300 block overflow-x-auto custom-scrollbar">
          {recommendation.resource}
        </code>
      </div>

      {/* Impact & Affected Resources */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
            Impact
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {recommendation.impact}
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
            Affected Resources
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {recommendation.affectedResources}
          </span>
        </div>
      </div>

      {/* Tags */}
      {recommendation.tags && recommendation.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-slate-200 dark:border-slate-800">
          {recommendation.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action Button */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 mt-3">
        <button className="text-sm font-medium text-brand-primary-400 hover:text-brand-primary-500 transition-colors flex items-center gap-1">
          View Details
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </button>
        <button className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-lg">bookmark_add</span>
          Save
        </button>
      </div>
    </div>
  );
}
