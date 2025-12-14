/**
 * KPI Cards Component
 * Displays key cost performance indicators with trends
 */

'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CostMetrics } from '@/lib/api/costs';

export interface KPICardsProps {
  metrics: CostMetrics;
  currency?: string;
  isLoading?: boolean;
}

/**
 * Format currency value
 */
function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage with sign
 */
function formatPercentage(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * KPI Card Item
 */
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'border-gray-200 bg-white',
    primary: 'border-blue-200 bg-blue-50/50',
    success: 'border-green-200 bg-green-50/50',
    warning: 'border-amber-200 bg-amber-50/50',
  };

  return (
    <Card className={`${variantStyles[variant]} transition-all hover:shadow-lg hover:-translate-y-1`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className="h-8 w-8 text-gray-500" aria-hidden="true">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            {trend && (
              <span
                className={`inline-flex items-center gap-1 font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
                aria-label={`${trend.isPositive ? 'Increased' : 'Decreased'} by ${Math.abs(trend.value)}%`}
              >
                {trend.isPositive ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                )}
                {formatPercentage(Math.abs(trend.value))}
              </span>
            )}
            {subtitle && (
              <span className="text-gray-600">{subtitle}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * KPI Cards Grid
 */
export const KPICards: React.FC<KPICardsProps> = ({
  metrics,
  currency = 'USD',
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Loading cost metrics">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-gray-200 rounded" />
              <div className="mt-2 h-3 w-20 bg-gray-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const trendDirection = metrics.percentageChange > 0 ? 'up' : metrics.percentageChange < 0 ? 'down' : 'stable';
  const isCostIncreasing = metrics.percentageChange > 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Current Month Cost */}
      <KPICard
        title="Current Month"
        value={formatCurrency(metrics.currentMonth, currency)}
        subtitle="Total spend this month"
        icon={
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
        variant="primary"
      />

      {/* Last Month Cost */}
      <KPICard
        title="Last Month"
        value={formatCurrency(metrics.lastMonth, currency)}
        subtitle="Previous month total"
        trend={{
          value: metrics.percentageChange,
          isPositive: isCostIncreasing,
        }}
        icon={
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        }
        variant="default"
      />

      {/* Cost Trend */}
      <KPICard
        title="Cost Trend"
        value={formatPercentage(metrics.percentageChange)}
        subtitle={
          trendDirection === 'up'
            ? 'Increased from last month'
            : trendDirection === 'down'
            ? 'Decreased from last month'
            : 'No change from last month'
        }
        icon={
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        }
        variant={isCostIncreasing ? 'warning' : 'success'}
      />

      {/* Top Service */}
      <KPICard
        title="Top Service"
        value={metrics.topService?.serviceName || 'N/A'}
        subtitle={
          metrics.topService
            ? `${formatCurrency(metrics.topService.cost, currency)} (${metrics.topService.percentage.toFixed(1)}%)`
            : 'No data available'
        }
        icon={
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        }
        variant="default"
      />
    </div>
  );
};
