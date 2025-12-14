'use client';

import * as React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { BarChart3 } from 'lucide-react';
import { CostChartProps } from './types';
import { formatCurrency, formatDate } from './utils';

/**
 * Chart colors matching design system
 */
const CHART_COLORS = {
  aws: '#0078d4', // secondary-blue
  azure: '#50e6ff', // secondary-blue-light
};

/**
 * CostChart Component
 *
 * Displays a stacked area chart showing AWS and Azure costs over time.
 * Features:
 * - Responsive design that adapts to container width
 * - Formatted currency tooltips
 * - Accessible chart with proper ARIA labels
 * - Loading and empty states
 * - Design system compliant styling
 *
 * @example
 * ```tsx
 * <CostChart
 *   data={[
 *     { date: '2025-12-01', aws: 1234.56, azure: 890.12, total: 2124.68 },
 *     { date: '2025-12-02', aws: 1456.78, azure: 920.34, total: 2377.12 },
 *   ]}
 *   isLoading={false}
 * />
 * ```
 */
export const CostChart: React.FC<CostChartProps> = ({ data, isLoading = false }) => {
  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <EmptyState
          icon={<BarChart3 className="h-12 w-12" />}
          title="No cost data available"
          description="Cost trend data will appear here once your cloud accounts are connected and costs are collected."
        />
      </div>
    );
  }

  /**
   * Custom tooltip component for the chart
   */
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const date = payload[0]?.payload?.date;

    return (
      <div className="bg-white border border-neutral-200 rounded-lg shadow-lg p-4">
        <p className="text-sm font-semibold text-neutral-900 mb-2">
          {formatDate(date, 'long')}
        </p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-neutral-600 capitalize">
                  {entry.name}
                </span>
              </div>
              <span className="text-sm font-medium text-neutral-900">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
          {payload[0]?.payload?.total && (
            <>
              <div className="border-t border-neutral-200 my-2" />
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-neutral-700">Total</span>
                <span className="text-sm font-semibold text-neutral-900">
                  {formatCurrency(payload[0].payload.total)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md p-6"
      role="region"
      aria-label="Cost trends chart"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900">Cost Trends</h3>
        <p className="text-sm text-neutral-600 mt-1">
          Daily cost breakdown by cloud provider
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorAws" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.aws} stopOpacity={0.8} />
              <stop offset="95%" stopColor={CHART_COLORS.aws} stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorAzure" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.azure} stopOpacity={0.8} />
              <stop offset="95%" stopColor={CHART_COLORS.azure} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => formatDate(value, 'short')}
            tick={{ fill: '#757575', fontSize: 12 }}
            stroke="#e0e0e0"
          />
          <YAxis
            tickFormatter={(value) => `$${value.toLocaleString()}`}
            tick={{ fill: '#757575', fontSize: 12 }}
            stroke="#e0e0e0"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
            }}
            iconType="circle"
            formatter={(value) => (
              <span className="text-sm font-medium text-neutral-700 capitalize">
                {value}
              </span>
            )}
          />
          <Area
            type="monotone"
            dataKey="aws"
            name="aws"
            stackId="1"
            stroke={CHART_COLORS.aws}
            strokeWidth={2}
            fill="url(#colorAws)"
          />
          <Area
            type="monotone"
            dataKey="azure"
            name="azure"
            stackId="1"
            stroke={CHART_COLORS.azure}
            strokeWidth={2}
            fill="url(#colorAzure)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

CostChart.displayName = 'CostChart';
