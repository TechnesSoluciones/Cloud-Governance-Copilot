/**
 * Cost Overview Cards Component
 * Displays key cost metrics in an accessible card grid
 *
 * Features:
 * - Current month spend with trend indicator
 * - Comparison to previous month
 * - End-of-month forecast with confidence level
 * - Top cost service highlight
 * - Responsive grid layout
 * - Loading skeletons
 * - Accessible ARIA labels
 */

'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Server,
  Target,
} from 'lucide-react';
import { formatCurrency, formatPercentage, getTrendColor, getTrendBgColor } from '@/lib/costs';

export interface CostOverviewCardsProps {
  currentMonth: number;
  previousMonth: number;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
  forecast: number;
  topService: string;
  topServiceCost?: number;
  currency?: string;
  isLoading?: boolean;
}

/**
 * Individual metric card component
 */
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  trend?: {
    direction: 'up' | 'down' | 'stable';
    value: number;
  };
  badge?: {
    text: string;
    variant?: 'default' | 'success' | 'warning' | 'danger';
  };
  ariaLabel?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  trend,
  badge,
  ariaLabel,
}) => {
  const variantStyles = {
    default: 'border-gray-200 bg-white hover:border-gray-300',
    primary: 'border-blue-200 bg-blue-50/30 hover:border-blue-300',
    success: 'border-green-200 bg-green-50/30 hover:border-green-300',
    warning: 'border-amber-200 bg-amber-50/30 hover:border-amber-300',
    danger: 'border-red-200 bg-red-50/30 hover:border-red-300',
  };

  const iconBgStyles = {
    default: 'bg-gray-100 text-gray-600',
    primary: 'bg-blue-100 text-blue-600',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-amber-100 text-amber-600',
    danger: 'bg-red-100 text-red-600',
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4" aria-hidden="true" />;
      case 'down':
        return <TrendingDown className="h-4 w-4" aria-hidden="true" />;
      default:
        return <Minus className="h-4 w-4" aria-hidden="true" />;
    }
  };

  return (
    <Card
      className={`${variantStyles[variant]} transition-all duration-200 hover:shadow-md`}
      role="article"
      aria-label={ariaLabel || title}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${iconBgStyles[variant]}`} aria-hidden="true">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-gray-900" aria-live="polite">
            {value}
          </div>

          {subtitle && (
            <p className="text-xs text-gray-600">{subtitle}</p>
          )}

          {trend && (
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 text-sm font-medium ${getTrendColor(trend.direction)}`}
                role="status"
                aria-label={`Cost ${trend.direction === 'up' ? 'increased' : trend.direction === 'down' ? 'decreased' : 'remained stable'} by ${Math.abs(trend.value).toFixed(1)}%`}
              >
                {getTrendIcon(trend.direction)}
                <span>{formatPercentage(Math.abs(trend.value))}</span>
              </span>
              <span className="text-xs text-gray-500">
                vs last month
              </span>
            </div>
          )}

          {badge && (
            <Badge
              variant={badge.variant as any}
              className="text-xs"
            >
              {badge.text}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Loading skeleton for metric cards
 */
const MetricCardSkeleton: React.FC = () => (
  <Card className="animate-pulse">
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-8 w-8 bg-gray-200 rounded-lg" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <div className="h-8 w-32 bg-gray-200 rounded" />
        <div className="h-3 w-20 bg-gray-200 rounded" />
      </div>
    </CardContent>
  </Card>
);

/**
 * Cost Overview Cards Grid
 *
 * Displays a comprehensive overview of cost metrics in a responsive grid
 */
export const CostOverviewCards: React.FC<CostOverviewCardsProps> = ({
  currentMonth,
  previousMonth,
  trend,
  percentageChange,
  forecast,
  topService,
  topServiceCost,
  currency = 'USD',
  isLoading = false,
}) => {
  // Show loading skeleton
  if (isLoading) {
    return (
      <div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        role="status"
        aria-label="Loading cost overview"
      >
        {[1, 2, 3, 4].map((i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Calculate forecast confidence (simplified)
  const forecastDiff = Math.abs(forecast - currentMonth);
  const forecastConfidence = forecastDiff / currentMonth < 0.1 ? 'high' : forecastDiff / currentMonth < 0.2 ? 'medium' : 'low';

  // Determine if cost is increasing (negative for budgets)
  const isCostIncreasing = trend === 'up';
  const isCostDecreasing = trend === 'down';

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Current Month Spend */}
      <MetricCard
        title="Current Month Spend"
        value={formatCurrency(currentMonth, currency)}
        subtitle="Total cloud costs this month"
        icon={<DollarSign className="h-5 w-5" />}
        variant="primary"
        ariaLabel={`Current month spend: ${formatCurrency(currentMonth, currency)}`}
      />

      {/* Comparison to Last Month */}
      <MetricCard
        title="Previous Month"
        value={formatCurrency(previousMonth, currency)}
        subtitle="Last month's total spend"
        icon={<TrendingUp className="h-5 w-5" />}
        variant={isCostIncreasing ? 'danger' : isCostDecreasing ? 'success' : 'default'}
        trend={{
          direction: trend,
          value: percentageChange,
        }}
        ariaLabel={`Previous month: ${formatCurrency(previousMonth, currency)}, ${trend === 'up' ? 'increased' : trend === 'down' ? 'decreased' : 'no change'} by ${Math.abs(percentageChange).toFixed(1)}%`}
      />

      {/* Forecast for Month End */}
      <MetricCard
        title="Month-End Forecast"
        value={formatCurrency(forecast, currency)}
        subtitle={`${forecastConfidence} confidence prediction`}
        icon={<Target className="h-5 w-5" />}
        variant={forecast > currentMonth * 1.1 ? 'warning' : 'default'}
        badge={
          forecast > currentMonth * 1.2
            ? { text: 'Above Target', variant: 'warning' }
            : undefined
        }
        ariaLabel={`Forecasted month-end spend: ${formatCurrency(forecast, currency)} with ${forecastConfidence} confidence`}
      />

      {/* Top Cost Service */}
      <MetricCard
        title="Top Cost Service"
        value={topService || 'N/A'}
        subtitle={
          topServiceCost
            ? `${formatCurrency(topServiceCost, currency)} spent`
            : 'No data available'
        }
        icon={<Server className="h-5 w-5" />}
        variant="default"
        ariaLabel={`Top cost service: ${topService}${topServiceCost ? `, ${formatCurrency(topServiceCost, currency)}` : ''}`}
      />
    </div>
  );
};

/**
 * Alert card for budget warnings
 */
interface BudgetAlertProps {
  currentSpend: number;
  budget: number;
  currency?: string;
}

export const BudgetAlert: React.FC<BudgetAlertProps> = ({
  currentSpend,
  budget,
  currency = 'USD',
}) => {
  const percentUsed = (currentSpend / budget) * 100;
  const isOverBudget = currentSpend > budget;
  const isNearBudget = percentUsed >= 80 && !isOverBudget;

  if (!isOverBudget && !isNearBudget) return null;

  return (
    <Card
      className={`border-l-4 ${
        isOverBudget ? 'border-red-500 bg-red-50/50' : 'border-amber-500 bg-amber-50/50'
      }`}
      role="alert"
      aria-live="polite"
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <AlertCircle
              className={`h-5 w-5 ${isOverBudget ? 'text-red-600' : 'text-amber-600'}`}
              aria-hidden="true"
            />
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold ${isOverBudget ? 'text-red-900' : 'text-amber-900'}`}>
              {isOverBudget ? 'Budget Exceeded' : 'Budget Warning'}
            </h3>
            <p className={`text-sm mt-1 ${isOverBudget ? 'text-red-800' : 'text-amber-800'}`}>
              You have used {formatPercentage(percentUsed, 0)} of your monthly budget.
              {isOverBudget
                ? ` You are ${formatCurrency(currentSpend - budget, currency)} over budget.`
                : ` You are ${formatCurrency(budget - currentSpend, currency)} away from your limit.`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
