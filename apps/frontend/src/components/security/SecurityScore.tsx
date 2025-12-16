'use client';

/**
 * Security Score Component
 *
 * Displays security score with circular gauge and category breakdown
 * Features:
 * - Circular progress gauge (0-100 score)
 * - Color coding by score range (red < 50, yellow 50-79, green >= 80)
 * - Breakdown by categories (Network, Data, Identity, Compute)
 * - Trend indicator (improving/declining/stable)
 * - Loading states
 * - Responsive design
 * - Accessibility features (ARIA labels, keyboard navigation)
 *
 * @example
 * <SecurityScore
 *   score={85}
 *   breakdown={{ network: 90, data: 85, identity: 80, compute: 85 }}
 *   trend="up"
 * />
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface SecurityScoreBreakdown {
  network: number;
  data: number;
  identity: number;
  compute: number;
}

export interface SecurityScoreProps {
  score: number;
  breakdown: SecurityScoreBreakdown;
  trend?: 'up' | 'down' | 'stable';
  isLoading?: boolean;
  className?: string;
}

/**
 * Get color classes based on score
 */
function getScoreColor(score: number): {
  text: string;
  bg: string;
  stroke: string;
  fill: string;
} {
  if (score >= 80) {
    return {
      text: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/30',
      stroke: 'stroke-green-600 dark:stroke-green-400',
      fill: 'fill-green-600 dark:fill-green-400',
    };
  } else if (score >= 50) {
    return {
      text: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      stroke: 'stroke-yellow-600 dark:stroke-yellow-400',
      fill: 'fill-yellow-600 dark:fill-yellow-400',
    };
  } else {
    return {
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
      stroke: 'stroke-red-600 dark:stroke-red-400',
      fill: 'fill-red-600 dark:fill-red-400',
    };
  }
}

/**
 * Circular gauge component
 */
interface CircularGaugeProps {
  score: number;
  size?: number;
}

const CircularGauge: React.FC<CircularGaugeProps> = ({ score, size = 200 }) => {
  const colors = getScoreColor(score);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        aria-hidden="true"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${colors.stroke} transition-all duration-1000 ease-out`}
        />
      </svg>
      {/* Score text */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <span className={`text-5xl font-bold ${colors.text}`}>
          {Math.round(score)}
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Score
        </span>
      </div>
    </div>
  );
};

/**
 * Category breakdown item
 */
interface CategoryItemProps {
  label: string;
  score: number;
  icon?: React.ReactNode;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ label, score, icon }) => {
  const colors = getScoreColor(score);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <div className="text-gray-500 dark:text-gray-400">{icon}</div>}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
        </div>
        <span className={`text-sm font-semibold ${colors.text}`}>
          {Math.round(score)}
        </span>
      </div>
      <Progress
        value={score}
        max={100}
        variant={score >= 80 ? 'success' : score >= 50 ? 'warning' : 'error'}
        className="h-2"
        aria-label={`${label} security score: ${score}%`}
      />
    </div>
  );
};

/**
 * Trend indicator component
 */
interface TrendIndicatorProps {
  trend: 'up' | 'down' | 'stable';
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({ trend }) => {
  const config = {
    up: {
      icon: <TrendingUp className="h-4 w-4" aria-hidden="true" />,
      text: 'Improving',
      className: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
    },
    down: {
      icon: <TrendingDown className="h-4 w-4" aria-hidden="true" />,
      text: 'Declining',
      className: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
    },
    stable: {
      icon: <Minus className="h-4 w-4" aria-hidden="true" />,
      text: 'Stable',
      className: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700',
    },
  };

  const { icon, text, className } = config[trend];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${className}`}
      role="status"
      aria-label={`Security trend: ${text}`}
    >
      {icon}
      <span>{text}</span>
    </div>
  );
};

/**
 * Loading skeleton
 */
const SecurityScoreSkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <CardTitle>Security Score</CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-[200px] w-[200px] rounded-full" />
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

/**
 * Main SecurityScore component
 */
export const SecurityScore: React.FC<SecurityScoreProps> = ({
  score,
  breakdown,
  trend,
  isLoading = false,
  className = '',
}) => {
  if (isLoading) {
    return <SecurityScoreSkeleton />;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
            Security Score
          </CardTitle>
          {trend && <TrendIndicator trend={trend} />}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Circular Gauge */}
        <div className="flex flex-col items-center gap-4">
          <CircularGauge score={score} />
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-xs">
            Your overall security posture based on findings across all categories
          </p>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Category Breakdown
          </h4>
          <div className="space-y-4">
            <CategoryItem label="Network Security" score={breakdown.network} />
            <CategoryItem label="Data Protection" score={breakdown.data} />
            <CategoryItem label="Identity & Access" score={breakdown.identity} />
            <CategoryItem label="Compute Security" score={breakdown.compute} />
          </div>
        </div>

        {/* Score interpretation */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3 text-xs text-gray-600 dark:text-gray-400">
            <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              <span className="font-semibold">Score Guide:</span>{' '}
              <span className="text-green-600 dark:text-green-400">80-100 Excellent</span>
              {', '}
              <span className="text-yellow-600 dark:text-yellow-400">50-79 Fair</span>
              {', '}
              <span className="text-red-600 dark:text-red-400">0-49 Poor</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
