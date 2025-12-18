/**
 * PremiumStatCard Component
 * Premium KPI card with large icons, gradients, and hover effects
 * Used across all dashboard pages for consistent metric display
 */

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PREMIUM_TRANSITIONS } from './design-tokens';

export interface PremiumStatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgGradient: string;
  iconColor?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
  subtitle?: string;
  className?: string;
}

export const PremiumStatCard: React.FC<PremiumStatCardProps> = ({
  title,
  value,
  icon,
  iconBgGradient,
  iconColor = 'text-gray-600',
  trend,
  subtitle,
  className = '',
}) => {
  const getTrendColor = (direction: 'up' | 'down' | 'stable') => {
    if (direction === 'up') return 'text-emerald-600 dark:text-emerald-400';
    if (direction === 'down') return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    if (direction === 'up') return <TrendingUp className="h-4 w-4" aria-hidden="true" />;
    if (direction === 'down') return <TrendingDown className="h-4 w-4" aria-hidden="true" />;
    return <Minus className="h-4 w-4" aria-hidden="true" />;
  };

  return (
    <Card
      className={`border-2 hover:shadow-md ${PREMIUM_TRANSITIONS.card} ${className}`}
    >
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          {/* Premium Icon Container - 56x56px icon in 88x88px container */}
          <div className={`p-4 rounded-2xl ${iconBgGradient} flex-shrink-0`}>
            <div className={`h-14 w-14 ${iconColor}`}>
              {icon}
            </div>
          </div>

          {/* Metric Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight">
              {value}
            </p>

            {/* Trend or Subtitle */}
            {(trend || subtitle) && (
              <div className="mt-1 flex items-center gap-2">
                {trend && (
                  <span
                    className={`inline-flex items-center gap-1 text-sm ${getTrendColor(trend.direction)}`}
                    aria-label={`${trend.direction === 'up' ? 'Increased' : trend.direction === 'down' ? 'Decreased' : 'No change'} by ${Math.abs(trend.value)}%`}
                  >
                    {getTrendIcon(trend.direction)}
                    <span className="font-medium">{Math.abs(trend.value)}%</span>
                  </span>
                )}
                {subtitle && (
                  <span className="text-xs text-muted-foreground">
                    {subtitle}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
