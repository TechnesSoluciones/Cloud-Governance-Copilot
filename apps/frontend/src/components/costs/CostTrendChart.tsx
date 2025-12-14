/**
 * Cost Trend Chart Component
 * Visualizes cost trends over time with forecasting
 *
 * Features:
 * - Area chart showing daily costs
 * - Separate AWS and Azure cost visualization
 * - Forecast projection with dotted line
 * - Interactive tooltips with exact amounts
 * - Responsive design
 * - Loading state
 * - Empty state handling
 * - Accessible labels and descriptions
 */

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
  TooltipProps,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatCurrencyCompact } from '@/lib/costs';
import { format, parseISO } from 'date-fns';

export interface CostTrendChartProps {
  dailyCosts: Array<{
    date: string;
    cost: number;
    aws?: number;
    azure?: number;
    total?: number;
  }>;
  forecast?: Array<{
    date: string;
    cost: number;
  }>;
  currency?: string;
  isLoading?: boolean;
  showProviderBreakdown?: boolean;
}

/**
 * Custom tooltip for cost data
 */
const CustomTooltip: React.FC<
  TooltipProps<number, string> & { currency: string; showProviderBreakdown: boolean }
> = ({ active, payload, label, currency, showProviderBreakdown }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const isForecast = payload[0]?.payload?.isForecast;

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg shadow-lg p-3"
      role="tooltip"
    >
      <p className="font-semibold text-gray-900 mb-2">
        {format(parseISO(label), 'MMM dd, yyyy')}
      </p>
      {isForecast && (
        <p className="text-xs text-amber-600 mb-2 font-medium">
          Forecasted
        </p>
      )}
      <div className="space-y-1">
        {showProviderBreakdown ? (
          <>
            {payload.find(p => p.dataKey === 'aws') && (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" aria-hidden="true" />
                  <span className="text-sm text-gray-600">AWS:</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(payload.find(p => p.dataKey === 'aws')?.value as number || 0, currency)}
                </span>
              </div>
            )}
            {payload.find(p => p.dataKey === 'azure') && (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-sky-400" aria-hidden="true" />
                  <span className="text-sm text-gray-600">Azure:</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(payload.find(p => p.dataKey === 'azure')?.value as number || 0, currency)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 pt-1 border-t border-gray-200 mt-1">
              <span className="text-sm font-semibold text-gray-700">Total:</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(payload.find(p => p.dataKey === 'total')?.value as number || 0, currency)}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-600">Cost:</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(payload[0]?.value as number || 0, currency)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Loading skeleton for the chart
 */
const ChartSkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64 mt-2" />
    </CardHeader>
    <CardContent>
      <div className="h-80 w-full animate-pulse bg-gray-100 rounded-lg" />
    </CardContent>
  </Card>
);

/**
 * Empty state when no data is available
 */
const EmptyState: React.FC = () => (
  <Card>
    <CardContent className="flex flex-col items-center justify-center h-80 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        No Cost Data Available
      </h3>
      <p className="text-sm text-gray-600 max-w-sm">
        There is no cost data available for the selected date range. Try selecting a different time period.
      </p>
    </CardContent>
  </Card>
);

/**
 * Cost Trend Chart Component
 *
 * Displays historical cost data with optional forecasting
 */
export const CostTrendChart: React.FC<CostTrendChartProps> = ({
  dailyCosts,
  forecast = [],
  currency = 'USD',
  isLoading = false,
  showProviderBreakdown = true,
}) => {
  // Show loading state
  if (isLoading) {
    return <ChartSkeleton />;
  }

  // Show empty state
  if (!dailyCosts || dailyCosts.length === 0) {
    return <EmptyState />;
  }

  // Prepare chart data
  const chartData = React.useMemo(() => {
    // Historical data
    const historical = dailyCosts.map(point => ({
      date: point.date,
      aws: point.aws || 0,
      azure: point.azure || 0,
      total: point.total || point.cost || 0,
      isForecast: false,
    }));

    // Forecast data
    const forecastData = forecast.map(point => ({
      date: point.date,
      total: point.cost,
      isForecast: true,
    }));

    return [...historical, ...forecastData];
  }, [dailyCosts, forecast]);

  // Calculate Y-axis domain
  const maxValue = React.useMemo(() => {
    const values = chartData.map(d => d.total || 0);
    return Math.max(...values) * 1.1; // Add 10% padding
  }, [chartData]);

  // Format date for X-axis
  const formatXAxis = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM dd');
    } catch {
      return dateStr;
    }
  };

  // Format Y-axis
  const formatYAxis = (value: number) => {
    return formatCurrencyCompact(value, currency);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Trends</CardTitle>
        <CardDescription>
          Daily cloud spending {forecast.length > 0 && 'with forecast projections'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full" role="img" aria-label="Cost trend chart showing daily spending">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorAWS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAzure" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
              />

              <YAxis
                tickFormatter={formatYAxis}
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                domain={[0, maxValue]}
              />

              <Tooltip
                content={
                  <CustomTooltip
                    currency={currency}
                    showProviderBreakdown={showProviderBreakdown}
                  />
                }
              />

              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />

              {showProviderBreakdown ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="aws"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="url(#colorAWS)"
                    strokeWidth={2}
                    name="AWS"
                  />
                  <Area
                    type="monotone"
                    dataKey="azure"
                    stackId="1"
                    stroke="#0ea5e9"
                    fill="url(#colorAzure)"
                    strokeWidth={2}
                    name="Azure"
                  />
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#6366f1"
                  fill="url(#colorTotal)"
                  strokeWidth={2}
                  name="Total Cost"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend for forecast */}
        {forecast.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-gray-600" aria-hidden="true" />
              <span>Historical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-gray-600 border-dashed border-t-2" aria-hidden="true" />
              <span>Forecast</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
