'use client';

/**
 * Security Summary Component
 *
 * Displays high-level security metrics and statistics
 * Features:
 * - Total findings count
 * - Critical/High/Medium/Low severity breakdown
 * - Recent scans information
 * - Trend indicators
 * - Color-coded severity levels
 * - Loading states
 * - Responsive grid layout
 * - Accessibility features
 */

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  AlertTriangle,
  AlertOctagon,
  Info,
  Activity,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Summary } from '@/lib/api/security';

// Summary Card Component
interface SummaryCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  subtitle,
  trend,
  trendValue,
}) => (
  <Card className="p-6 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
        {trend && trendValue && (
          <div className="mt-2 flex items-center gap-1">
            {trend === 'up' && (
              <TrendingUp className="h-4 w-4 text-red-600" aria-hidden="true" />
            )}
            {trend === 'down' && (
              <TrendingDown className="h-4 w-4 text-green-600" aria-hidden="true" />
            )}
            <span
              className={`text-xs font-medium ${
                trend === 'up' ? 'text-red-600' : trend === 'down' ? 'text-green-600' : 'text-gray-600'
              }`}
            >
              {trendValue}
            </span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-lg ${iconBgColor}`}>
        <div className={iconColor}>{icon}</div>
      </div>
    </div>
  </Card>
);

// Loading Skeleton Component
const SummarySkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {Array.from({ length: 4 }).map((_, i) => (
      <Card key={i} className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </Card>
    ))}
  </div>
);

// Main Component Props
export interface SecuritySummaryProps {
  summary: Summary | null;
  isLoading: boolean;
}

/**
 * Security Summary Dashboard
 * Displays key security metrics in card format
 */
export const SecuritySummary: React.FC<SecuritySummaryProps> = ({ summary, isLoading }) => {
  // Loading State
  if (isLoading) {
    return <SummarySkeleton />;
  }

  // No Data State
  if (!summary) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
            <Shield className="h-12 w-12 text-gray-400" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              No security data available
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Run a security scan to view your security posture.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const {
    totalFindings,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    openCount,
    resolvedCount,
    dismissedCount,
    lastScanDate,
  } = summary;

  // Calculate severity percentage for context
  const criticalPercentage = totalFindings > 0 ? (criticalCount / totalFindings) * 100 : 0;
  const highPercentage = totalFindings > 0 ? (highCount / totalFindings) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Findings */}
        <SummaryCard
          title="Total Findings"
          value={totalFindings}
          icon={<Shield className="h-6 w-6" aria-hidden="true" />}
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
          subtitle={`${openCount} open, ${resolvedCount} resolved`}
        />

        {/* Critical Findings */}
        <SummaryCard
          title="Critical"
          value={criticalCount}
          icon={<AlertOctagon className="h-6 w-6" aria-hidden="true" />}
          iconBgColor="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-600 dark:text-red-400"
          subtitle={
            criticalPercentage > 0 ? `${criticalPercentage.toFixed(1)}% of total` : 'None found'
          }
        />

        {/* High Findings */}
        <SummaryCard
          title="High Severity"
          value={highCount}
          icon={<AlertTriangle className="h-6 w-6" aria-hidden="true" />}
          iconBgColor="bg-orange-100 dark:bg-orange-900/30"
          iconColor="text-orange-600 dark:text-orange-400"
          subtitle={
            highPercentage > 0 ? `${highPercentage.toFixed(1)}% of total` : 'None found'
          }
        />

        {/* Last Scan */}
        <SummaryCard
          title="Last Scan"
          value={
            lastScanDate
              ? formatDistanceToNow(new Date(lastScanDate), { addSuffix: true })
              : 'Never'
          }
          icon={<Activity className="h-6 w-6" aria-hidden="true" />}
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-600 dark:text-purple-400"
          subtitle={lastScanDate ? 'Scan completed' : 'No scans yet'}
        />
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Medium Findings */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Medium Severity
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {mediumCount}
              </p>
            </div>
            <div className="p-2 rounded bg-yellow-100 dark:bg-yellow-900/30">
              <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
            </div>
          </div>
        </Card>

        {/* Low Findings */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Severity</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {lowCount}
              </p>
            </div>
            <div className="p-2 rounded bg-gray-100 dark:bg-gray-700">
              <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
            </div>
          </div>
        </Card>

        {/* Dismissed Findings */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Dismissed</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {dismissedCount}
              </p>
            </div>
            <div className="p-2 rounded bg-gray-100 dark:bg-gray-700">
              <Info className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
