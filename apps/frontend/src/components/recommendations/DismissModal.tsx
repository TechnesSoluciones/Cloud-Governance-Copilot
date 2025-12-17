'use client';

import * as React from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, XCircle } from 'lucide-react';
import { Recommendation } from '@/lib/api/recommendations';

export interface DismissModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendation: Recommendation | null;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

const MIN_REASON_LENGTH = 10;

export const DismissModal: React.FC<DismissModalProps> = ({
  open,
  onOpenChange,
  recommendation,
  onConfirm,
  isLoading = false,
  error = null,
}) => {
  const [reason, setReason] = React.useState('');
  const [touched, setTouched] = React.useState(false);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setReason('');
      setTouched(false);
    }
  }, [open]);

  if (!recommendation) return null;

  const isValid = reason.trim().length >= MIN_REASON_LENGTH;
  const showError = touched && !isValid;
  const characterCount = reason.length;

  const handleConfirm = () => {
    setTouched(true);
    if (isValid) {
      onConfirm(reason.trim());
    }
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
    if (!touched) {
      setTouched(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="space-y-6">
        <DialogHeader>
          <DialogTitle>Dismiss Recommendation</DialogTitle>
          <DialogDescription>
            Please provide a reason for dismissing this recommendation. This will be
            recorded in the audit log.
          </DialogDescription>
        </DialogHeader>

        {/* Error Message */}
        {error && (
          <div
            className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-start gap-3"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-error">Error</p>
              <p className="text-sm text-error/90 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Recommendation Summary */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Recommendation Details
            </h4>
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {recommendation.title}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {recommendation.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="info" className="text-xs">
                  {recommendation.provider}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {recommendation.service}
                </Badge>
              </div>
            </div>
          </div>

          {/* Dismissal Reason */}
          <div>
            <label
              htmlFor="dismiss-reason"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Reason for Dismissal <span className="text-error">*</span>
            </label>
            <textarea
              id="dismiss-reason"
              value={reason}
              onChange={handleReasonChange}
              placeholder="Please explain why you are dismissing this recommendation (minimum 10 characters)..."
              rows={4}
              disabled={isLoading}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 resize-none ${
                showError
                  ? 'border-error focus:ring-error focus:border-error'
                  : 'border-gray-300 focus:ring-brand-orange focus:border-brand-orange'
              } disabled:bg-gray-100 disabled:cursor-not-allowed`}
              aria-describedby="reason-hint reason-error"
              aria-invalid={showError}
              aria-required="true"
            />
            <div className="flex items-center justify-between mt-1">
              <p
                id="reason-hint"
                className={`text-xs ${
                  characterCount < MIN_REASON_LENGTH ? 'text-error' : 'text-gray-500'
                }`}
              >
                {characterCount} / {MIN_REASON_LENGTH} characters minimum
              </p>
              {showError && (
                <p id="reason-error" className="text-xs text-error" role="alert">
                  Please provide at least {MIN_REASON_LENGTH} characters
                </p>
              )}
            </div>
          </div>

          {/* Common Dismissal Reasons - Quick Select */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">
              Common reasons (click to use):
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                'Already being addressed through other means',
                'False positive - resource is actively used',
                'Planned for future implementation',
                'Acceptable risk/cost tradeoff for our use case',
                'Will revisit at a later date',
              ].map((quickReason) => (
                <button
                  key={quickReason}
                  type="button"
                  onClick={() => setReason(quickReason)}
                  disabled={isLoading}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {quickReason}
                </button>
              ))}
            </div>
          </div>

          {/* Warning Notice */}
          <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-warning-foreground">
                  Please Note
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  Dismissing this recommendation will remove it from your active list. You
                  can still view it in the dismissed recommendations section.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !isValid}
            variant="error"
            className="bg-error hover:bg-error/90"
          >
            {isLoading ? (
              <>
                <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Dismissing...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Dismiss Recommendation
              </>
            )}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
};

export default DismissModal;
