'use client';

/**
 * Security Trends Component
 *
 * Visualizes security trends over time using charts
 * Features:
 * - Line chart for security score over last 30 days
 * - Bar chart for findings by severity
 * - Area chart for findings resolution rate
 * - Uses Recharts library
 * - Responsive design
 * - Loading states
 * - Empty states
 * - Accessibility features
 *
 * @example
 * <SecurityTrends
 *   scoreHistory={scoreData}
 *   findingsBySeverity={severityData}
 * />
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, BarChart3, Activity } from 'lucide-react';

export interface ScoreDataPoint {
  date: string;
  score: number;
}

export interface SeverityDataPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface SecurityTrendsProps {
  scoreHistory?: ScoreDataPoint[];
  findingsBySeverity?: SeverityDataPoint[];
  isLoading?: boolean;
  className?: string;
}

/**
 * Custom tooltip for charts
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {label}
      </p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-400">
              {entry.name}:
            </span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Score trend line chart
 */
interface ScoreTrendChartProps {
  data: ScoreDataPoint[];
}

const ScoreTrendChart: React.FC<ScoreTrendChartProps> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          Security Score Trend (Last 30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-gray-200 dark:stroke-gray-700"
            />
            <XAxis
              dataKey="date"
              className="text-xs text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              className="text-xs text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                fontSize: '12px',
                paddingTop: '10px',
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              name="Security Score"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

/**
 * Findings by severity bar chart
 */
interface FindingsBySeverityChartProps {
  data: SeverityDataPoint[];
}

const FindingsBySeverityChart: React.FC<FindingsBySeverityChartProps> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          Findings by Severity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-gray-200 dark:stroke-gray-700"
            />
            <XAxis
              dataKey="date"
              className="text-xs text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              className="text-xs text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                fontSize: '12px',
                paddingTop: '10px',
              }}
            />
            <Bar
              dataKey="critical"
              name="Critical"
              fill="#dc2626"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="high"
              name="High"
              fill="#ea580c"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="medium"
              name="Medium"
              fill="#ca8a04"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="low"
              name="Low"
              fill="#6b7280"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

/**
 * Findings resolution area chart
 */
interface FindingsResolutionChartProps {
  data: SeverityDataPoint[];
}

const FindingsResolutionChart: React.FC<FindingsResolutionChartProps> = ({ data }) => {
  // Calculate total findings per day
  const chartData = data.map((point) => ({
    date: point.date,
    total: point.critical + point.high + point.medium + point.low,
    critical: point.critical,
    high: point.high,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          Total Findings Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-gray-200 dark:stroke-gray-700"
            />
            <XAxis
              dataKey="date"
              className="text-xs text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              className="text-xs text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                fontSize: '12px',
                paddingTop: '10px',
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              name="Total Findings"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorTotal)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

/**
 * Loading skeleton
 */
const SecurityTrendsSkeleton: React.FC = () => (
  <div className="space-y-6">
    {Array.from({ length: 2 }).map((_, i) => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);

/**
 * Empty state
 */
const EmptyState: React.FC = () => (
  <Card className="p-12 text-center">
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
        <TrendingUp className="h-12 w-12 text-gray-400" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          No trend data available
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md">
          Security trends will appear here after running multiple scans over time.
        </p>
      </div>
    </div>
  </Card>
);

/**
 * Main SecurityTrends component
 */
export const SecurityTrends: React.FC<SecurityTrendsProps> = ({
  scoreHistory = [],
  findingsBySeverity = [],
  isLoading = false,
  className = '',
}) => {
  if (isLoading) {
    return <SecurityTrendsSkeleton />;
  }

  if (scoreHistory.length === 0 && findingsBySeverity.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Score Trend */}
      {scoreHistory.length > 0 && <ScoreTrendChart data={scoreHistory} />}

      {/* Grid for side-by-side charts */}
      {findingsBySeverity.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Findings by Severity */}
          <FindingsBySeverityChart data={findingsBySeverity} />

          {/* Findings Resolution */}
          <FindingsResolutionChart data={findingsBySeverity} />
        </div>
      )}

      {/* Info message */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Trend Analysis
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              These charts help you visualize security improvements over time. Regular scans
              provide more accurate trend data for informed decision-making.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
