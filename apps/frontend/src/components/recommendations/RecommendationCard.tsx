'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Eye, DollarSign } from 'lucide-react';
import {
  Recommendation,
  formatSavings,
  getPriorityColor,
  getRecommendationTypeLabel,
} from '@/lib/api/recommendations';
import { format } from 'date-fns';

export interface RecommendationCardProps {
  recommendation: Recommendation;
  onApply?: (recommendation: Recommendation) => void;
  onDismiss?: (recommendation: Recommendation) => void;
  onViewDetails?: (recommendation: Recommendation) => void;
  isApplying?: boolean;
  isDismissing?: boolean;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onApply,
  onDismiss,
  onViewDetails,
  isApplying = false,
  isDismissing = false,
}) => {
  const isOpen = recommendation.status === 'open';
  const isApplied = recommendation.status === 'applied';
  const isDismissed = recommendation.status === 'dismissed';
  const isActionable = isOpen && recommendation.actionable;

  // Priority border colors
  const priorityBorderColors = {
    high: 'border-l-error',
    medium: 'border-l-warning',
    low: 'border-l-info',
  };

  // Provider icons (you can replace with actual icons)
  const providerColors = {
    AWS: 'bg-yellow-500',
    AZURE: 'bg-blue-500',
  };

  return (
    <Card
      className={`
        relative overflow-hidden transition-all duration-200
        ${isOpen ? 'hover:shadow-lg hover:-translate-y-1' : 'opacity-60'}
        ${isApplied || isDismissed ? 'bg-gray-50' : 'bg-white'}
        border-l-4 ${priorityBorderColors[recommendation.priority]}
      `}
    >
      <div className="p-5 space-y-4">
        {/* Header: Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={getPriorityColor(recommendation.priority)}>
            {recommendation.priority.toUpperCase()}
          </Badge>
          <Badge variant="info" className="text-xs">
            {recommendation.provider}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {recommendation.service}
          </Badge>
          {isApplied && (
            <Badge variant="success" className="text-xs">
              Applied
            </Badge>
          )}
          {isDismissed && (
            <Badge className="bg-gray-500/10 text-gray-600 text-xs">
              Dismissed
            </Badge>
          )}
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
            {recommendation.title}
          </h3>
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            {recommendation.description}
          </p>
        </div>

        {/* Type Badge */}
        <div>
          <span className="inline-flex items-center px-2.5 py-1 bg-brand-orange/10 text-brand-orange text-xs font-medium rounded-full">
            {getRecommendationTypeLabel(recommendation.type)}
          </span>
        </div>

        {/* Savings Amount */}
        <div className="p-4 bg-brand-orange/5 border border-brand-orange/20 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-orange/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-brand-orange" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-600">
                Estimated Savings
              </p>
              <p className="text-2xl font-bold text-brand-orange mt-0.5">
                {formatSavings(recommendation.estimatedSavings)}
                <span className="text-sm font-normal text-gray-600 ml-1">
                  / {recommendation.savingsPeriod}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Resource ID */}
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">Resource ID</p>
          <p className="text-xs font-mono text-gray-900 mt-1 truncate">
            {recommendation.resourceId}
          </p>
        </div>

        {/* Metadata Preview */}
        {recommendation.metadata && (
          <div className="text-xs text-gray-500">
            Created {format(new Date(recommendation.createdAt), 'MMM dd, yyyy')}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          {isActionable ? (
            <>
              <Button
                onClick={() => onApply?.(recommendation)}
                disabled={isApplying || isDismissing}
                className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white"
                size="sm"
              >
                {isApplying ? (
                  <>
                    <span className="inline-block h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Applying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                    Apply
                  </>
                )}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onDismiss?.(recommendation)}
                  disabled={isApplying || isDismissing}
                  className="flex-1"
                  size="sm"
                >
                  {isDismissing ? (
                    <>
                      <span className="inline-block h-3 w-3 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" />
                      Dismissing...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                      Dismiss
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onViewDetails?.(recommendation)}
                  disabled={isApplying || isDismissing}
                  className="flex-1"
                  size="sm"
                >
                  <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                  Details
                </Button>
              </div>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={() => onViewDetails?.(recommendation)}
              className="w-full"
              size="sm"
            >
              <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
              View Details
            </Button>
          )}
        </div>

        {/* Applied/Dismissed Info */}
        {isApplied && recommendation.appliedAt && (
          <div className="pt-3 border-t border-gray-200">
            <p className="text-xs text-success">
              Applied on {format(new Date(recommendation.appliedAt), 'MMM dd, yyyy')}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default RecommendationCard;
