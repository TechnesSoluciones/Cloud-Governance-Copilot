'use client';

import * as React from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, DollarSign, Info, Code } from 'lucide-react';
import {
  Recommendation,
  formatSavings,
  getPriorityColor,
  getRecommendationTypeLabel,
} from '@/lib/api/recommendations';
import { format } from 'date-fns';

export interface RecommendationDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendation: Recommendation | null;
  onApply?: () => void;
  onDismiss?: () => void;
  isApplying?: boolean;
  isDismissing?: boolean;
}

export const RecommendationDetailModal: React.FC<RecommendationDetailModalProps> = ({
  open,
  onOpenChange,
  recommendation,
  onApply,
  onDismiss,
  isApplying = false,
  isDismissing = false,
}) => {
  if (!recommendation) return null;

  const isActionable = recommendation.status === 'open' && recommendation.actionable;
  const isApplied = recommendation.status === 'applied';
  const isDismissed = recommendation.status === 'dismissed';

  // Calculate annual and 3-year savings
  const monthlySavings = recommendation.estimatedSavings;
  const annualSavings = monthlySavings * 12;
  const threeYearSavings = monthlySavings * 36;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="max-h-[80vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-white z-10 pb-4 border-b border-gray-200">
          <DialogTitle>Recommendation Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* Status Banner */}
          {(isApplied || isDismissed) && (
            <div
              className={`p-4 rounded-lg border ${
                isApplied
                  ? 'bg-success/10 border-success/20'
                  : 'bg-gray-100 border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {isApplied ? (
                  <CheckCircle className="h-5 w-5 text-success" aria-hidden="true" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-600" aria-hidden="true" />
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {isApplied ? 'Applied' : 'Dismissed'}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {isApplied && recommendation.appliedAt
                      ? `Applied on ${format(new Date(recommendation.appliedAt), 'MMM dd, yyyy')}`
                      : 'This recommendation has been dismissed'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Summary</h3>
            <div className="space-y-3">
              <div>
                <h4 className="text-base font-semibold text-gray-900">
                  {recommendation.title}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {recommendation.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge
                  className={getPriorityColor(recommendation.priority)}
                >
                  {recommendation.priority.toUpperCase()}
                </Badge>
                <Badge variant="info">{recommendation.provider}</Badge>
                <Badge variant="secondary">{recommendation.service}</Badge>
                <Badge variant="secondary">
                  {getRecommendationTypeLabel(recommendation.type)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Resource Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Resource Information
            </h3>
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-600">Resource ID</p>
                  <p className="text-sm font-mono text-gray-900 mt-1 break-all">
                    {recommendation.resourceId}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Service</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {recommendation.service}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Provider</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {recommendation.provider}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Created</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {format(new Date(recommendation.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>

              {/* Metadata */}
              {recommendation.metadata &&
                Object.keys(recommendation.metadata).length > 0 && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-2">
                      Additional Details
                    </p>
                    <div className="space-y-2">
                      {Object.entries(recommendation.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between gap-4">
                          <span className="text-xs text-gray-600 capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-gray-900 font-medium">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Savings Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Estimated Savings
            </h3>
            <div className="p-4 bg-brand-orange/5 border border-brand-orange/20 rounded-lg space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-orange/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-brand-orange" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600">
                    Monthly Savings
                  </p>
                  <p className="text-3xl font-bold text-brand-orange mt-1">
                    {formatSavings(monthlySavings)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-brand-orange/20">
                <div>
                  <p className="text-xs font-medium text-gray-600">Annual</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {formatSavings(annualSavings)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">3-Year</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {formatSavings(threeYearSavings)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Script */}
          {recommendation.actionScript && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Recommended Action
              </h3>
              <div className="p-4 bg-gray-900 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Code className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  <span className="text-xs font-medium text-gray-400">
                    Action Script
                  </span>
                </div>
                <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-words">
                  {recommendation.actionScript}
                </pre>
              </div>
            </div>
          )}

          {/* Additional Info */}
          {!isActionable && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Information
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    {isApplied
                      ? 'This recommendation has already been applied.'
                      : isDismissed
                      ? 'This recommendation has been dismissed.'
                      : 'This recommendation cannot be automatically applied. Please review the action script and apply manually.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t border-gray-200">
          {isActionable ? (
            <>
              <Button
                variant="outline"
                onClick={onDismiss}
                disabled={isApplying || isDismissing}
              >
                {isDismissing ? (
                  <>
                    <span className="inline-block h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" />
                    Dismissing...
                  </>
                ) : (
                  'Dismiss'
                )}
              </Button>
              <Button
                onClick={onApply}
                disabled={isApplying || isDismissing}
                className="bg-brand-orange hover:bg-brand-orange-dark text-white"
              >
                {isApplying ? (
                  <>
                    <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Applying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                    Apply Recommendation
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </div>
    </Dialog>
  );
};

export default RecommendationDetailModal;
