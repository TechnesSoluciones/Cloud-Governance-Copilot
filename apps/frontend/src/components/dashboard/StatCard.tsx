import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  trend,
  variant = 'default',
  className = '',
}) => {
  const variantStyles = {
    default: 'border-border',
    primary: 'border-primary/20 bg-primary/5',
    success: 'border-success/20 bg-success/5',
    warning: 'border-warning/20 bg-warning/5',
    danger: 'border-error/20 bg-error/5',
  };

  return (
    <Card className={`transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1 ${variantStyles[variant]} ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="h-4 w-4 text-muted-foreground" aria-hidden="true">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {trend && (
              <span
                className={`inline-flex items-center gap-1 ${
                  trend.isPositive ? 'text-success' : 'text-error'
                }`}
                aria-label={`${trend.isPositive ? 'Increased' : 'Decreased'} by ${Math.abs(trend.value)}%`}
              >
                {/* Trend icon: hidden from screen readers, aria-label on parent provides context */}
                {trend.isPositive ? (
                  <Icons.trendingUp className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <Icons.trendingDown className="h-3 w-3" aria-hidden="true" />
                )}
                {Math.abs(trend.value)}%
              </span>
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
