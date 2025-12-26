/**
 * Recommendations Table Component
 * Displays top recommendations in a table format
 */

'use client';

import { BadgeV2 } from '../ui/BadgeV2';
import { cn } from '@/lib/utils';

export type RecommendationSeverity = 'critical' | 'high' | 'medium' | 'low';

interface Recommendation {
  id: string;
  severity: RecommendationSeverity;
  title: string;
  resource: string;
  provider: 'AWS' | 'Azure' | 'GCP';
  savings?: string;
}

interface RecommendationsTableProps {
  recommendations?: Recommendation[];
  maxItems?: number;
  className?: string;
}

const defaultRecommendations: Recommendation[] = [
  {
    id: '1',
    severity: 'critical',
    title: 'Unencrypted S3 buckets detected',
    resource: 's3://prod-data-bucket',
    provider: 'AWS',
    savings: '-',
  },
  {
    id: '2',
    severity: 'high',
    title: 'Idle EC2 instances running',
    resource: 'i-0abc123def456',
    provider: 'AWS',
    savings: '$450/mo',
  },
  {
    id: '3',
    severity: 'medium',
    title: 'Unused Azure storage volumes',
    resource: 'vol-prod-backup-01',
    provider: 'Azure',
    savings: '$120/mo',
  },
  {
    id: '4',
    severity: 'high',
    title: 'Public RDS snapshots found',
    resource: 'rds-snapshot-2024',
    provider: 'AWS',
    savings: '-',
  },
  {
    id: '5',
    severity: 'medium',
    title: 'Oversized GCP VM instances',
    resource: 'instance-prod-web-01',
    provider: 'GCP',
    savings: '$280/mo',
  },
];

const severityStyles: Record<RecommendationSeverity, string> = {
  critical: 'border-l-4 border-error',
  high: 'border-l-4 border-warning',
  medium: 'border-l-4 border-info',
  low: 'border-l-4 border-slate-300',
};

export function RecommendationsTable({
  recommendations = defaultRecommendations,
  maxItems = 5,
  className,
}: RecommendationsTableProps) {
  const items = recommendations.slice(0, maxItems);

  return (
    <div className={cn('overflow-hidden', className)}>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Severity
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Recommendation
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Resource
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Savings
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((rec) => (
              <tr
                key={rec.id}
                className={cn(
                  'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer',
                  severityStyles[rec.severity]
                )}
              >
                <td className="py-3 px-4">
                  <BadgeV2 variant={rec.severity} size="sm">
                    {rec.severity}
                  </BadgeV2>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <BadgeV2
                      variant={rec.provider.toLowerCase() as 'aws' | 'azure' | 'gcp'}
                      size="sm"
                    >
                      {rec.provider}
                    </BadgeV2>
                    <span className="text-sm text-slate-900 dark:text-white font-medium">
                      {rec.title}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                    {rec.resource}
                  </code>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm font-semibold text-success">{rec.savings}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
