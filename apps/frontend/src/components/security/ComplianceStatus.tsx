'use client';

/**
 * Compliance Status Component
 *
 * Displays compliance status across different standards
 * Features:
 * - Cards for each compliance standard (CIS, ISO 27001, PCI-DSS, SOC 2, etc.)
 * - Progress bars showing compliance percentage
 * - Compliant/non-compliant count indicators
 * - Click to drill down to non-compliant resources
 * - Loading skeletons
 * - Responsive grid layout
 * - Accessibility features
 *
 * @example
 * <ComplianceStatus
 *   results={[
 *     { standard: 'CIS', compliantCount: 45, nonCompliantCount: 5, percentage: 90 },
 *     { standard: 'ISO 27001', compliantCount: 38, nonCompliantCount: 12, percentage: 76 }
 *   ]}
 *   onStandardClick={handleClick}
 * />
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  ChevronRight,
} from 'lucide-react';

export interface ComplianceResult {
  standard: string;
  compliantCount: number;
  nonCompliantCount: number;
  percentage: number;
  description?: string;
  lastAssessment?: string;
}

export interface ComplianceStatusProps {
  results: ComplianceResult[];
  isLoading?: boolean;
  onStandardClick?: (standard: string) => void;
  className?: string;
}

/**
 * Get compliance color based on percentage
 */
function getComplianceColor(percentage: number): {
  text: string;
  bg: string;
  progress: 'success' | 'warning' | 'error';
} {
  if (percentage >= 90) {
    return {
      text: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/30',
      progress: 'success',
    };
  } else if (percentage >= 70) {
    return {
      text: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      progress: 'warning',
    };
  } else {
    return {
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
      progress: 'error',
    };
  }
}

/**
 * Standard icon mapping
 */
function getStandardIcon(standard: string): React.ReactNode {
  const iconClass = 'h-5 w-5';

  if (standard.includes('CIS')) {
    return <Shield className={iconClass} aria-hidden="true" />;
  } else if (standard.includes('ISO')) {
    return <FileText className={iconClass} aria-hidden="true" />;
  } else if (standard.includes('PCI')) {
    return <Shield className={iconClass} aria-hidden="true" />;
  } else if (standard.includes('SOC')) {
    return <FileText className={iconClass} aria-hidden="true" />;
  }

  return <Shield className={iconClass} aria-hidden="true" />;
}

/**
 * Compliance card for a single standard
 */
interface ComplianceCardProps {
  result: ComplianceResult;
  onClick?: (standard: string) => void;
}

const ComplianceCard: React.FC<ComplianceCardProps> = ({ result, onClick }) => {
  const { standard, compliantCount, nonCompliantCount, percentage, description } = result;
  const colors = getComplianceColor(percentage);
  const totalCount = compliantCount + nonCompliantCount;
  const icon = getStandardIcon(standard);

  const handleClick = () => {
    if (onClick) {
      onClick(standard);
    }
  };

  const isClickable = !!onClick && nonCompliantCount > 0;

  return (
    <Card
      className={`transition-all ${
        isClickable
          ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]'
          : ''
      }`}
      onClick={isClickable ? handleClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
      aria-label={
        isClickable
          ? `View ${standard} non-compliant resources`
          : `${standard} compliance status`
      }
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${colors.bg}`}>
              <div className={colors.text}>{icon}</div>
            </div>
            <div>
              <CardTitle className="text-lg">{standard}</CardTitle>
              {description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {description}
                </p>
              )}
            </div>
          </div>
          {isClickable && (
            <ChevronRight className="h-5 w-5 text-gray-400" aria-hidden="true" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Percentage Score */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Compliance Rate
            </p>
            <p className={`text-3xl font-bold ${colors.text}`}>
              {Math.round(percentage)}%
            </p>
          </div>
          <Badge
            className={`${colors.bg} ${colors.text} border-0`}
            aria-label={`Compliance status: ${
              percentage >= 90 ? 'Excellent' : percentage >= 70 ? 'Fair' : 'Needs Improvement'
            }`}
          >
            {percentage >= 90 ? 'Excellent' : percentage >= 70 ? 'Fair' : 'Poor'}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress
            value={percentage}
            max={100}
            variant={colors.progress}
            aria-label={`${standard} compliance: ${percentage}%`}
          />
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>{compliantCount} of {totalCount} controls</span>
          </div>
        </div>

        {/* Compliant/Non-compliant Counts */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <CheckCircle2
              className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Compliant</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {compliantCount}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <XCircle
              className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Non-compliant</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {nonCompliantCount}
              </p>
            </div>
          </div>
        </div>

        {/* View Details Button (if non-compliant items exist) */}
        {isClickable && nonCompliantCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            aria-label={`View ${nonCompliantCount} non-compliant resources for ${standard}`}
          >
            View Non-compliant Resources
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Loading skeleton
 */
const ComplianceStatusSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: 3 }).map((_, i) => (
      <Card key={i}>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-2 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
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
        <Shield className="h-12 w-12 text-gray-400" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          No compliance data available
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md">
          Run a compliance assessment to see your adherence to security standards.
        </p>
      </div>
    </div>
  </Card>
);

/**
 * Main ComplianceStatus component
 */
export const ComplianceStatus: React.FC<ComplianceStatusProps> = ({
  results,
  isLoading = false,
  onStandardClick,
  className = '',
}) => {
  if (isLoading) {
    return <ComplianceStatusSkeleton />;
  }

  if (results.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          Compliance Standards
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Track your compliance across industry security standards
        </p>
      </div>

      {/* Compliance Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((result) => (
          <ComplianceCard
            key={result.standard}
            result={result}
            onClick={onStandardClick}
          />
        ))}
      </div>

      {/* Overall Summary */}
      {results.length > 0 && (
        <Card className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Compliance Overview
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {results.filter((r) => r.percentage >= 90).length} of {results.length} standards
                meet excellent compliance (90%+). Focus on improving standards below 70% to reduce
                security risks.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
