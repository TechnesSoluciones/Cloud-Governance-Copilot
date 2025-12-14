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
import { AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { Recommendation, formatSavings } from '@/lib/api/recommendations';

export interface ApplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendation: Recommendation | null;
  onConfirm: (notes?: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export const ApplyModal: React.FC<ApplyModalProps> = ({
  open,
  onOpenChange,
  recommendation,
  onConfirm,
  isLoading = false,
  error = null,
}) => {
  const [notes, setNotes] = React.useState('');

  // Reset notes when modal opens/closes
  React.useEffect(() => {
    if (!open) {
      setNotes('');
    }
  }, [open]);

  if (!recommendation) return null;

  const handleConfirm = () => {
    onConfirm(notes || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="space-y-6">
        <DialogHeader>
          <DialogTitle>Apply Recommendation</DialogTitle>
          <DialogDescription>
            Review the details below and confirm to apply this recommendation.
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

              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600">Resource ID</p>
                <p className="text-sm font-mono text-gray-900 mt-1">
                  {recommendation.resourceId}
                </p>
              </div>
            </div>
          </div>

          {/* Estimated Savings */}
          <div className="p-4 bg-brand-orange/5 border border-brand-orange/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-orange/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-brand-orange" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600">
                  Estimated Savings
                </p>
                <p className="text-2xl font-bold text-brand-orange mt-1">
                  {formatSavings(recommendation.estimatedSavings)}
                  <span className="text-sm font-normal text-gray-600 ml-1">
                    / {recommendation.savingsPeriod}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Impact Notice */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  What will happen?
                </p>
                <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                  <li>This action will be applied to your cloud account</li>
                  <li>Changes may take a few minutes to take effect</li>
                  <li>You can track the status in your audit logs</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label
              htmlFor="apply-notes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Notes (Optional)
            </label>
            <textarea
              id="apply-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this action..."
              rows={3}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-brand-orange disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
              aria-describedby="notes-hint"
            />
            <p id="notes-hint" className="text-xs text-gray-500 mt-1">
              These notes will be saved in the audit log
            </p>
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
            disabled={isLoading}
            className="bg-brand-orange hover:bg-brand-orange-dark text-white"
          >
            {isLoading ? (
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
        </DialogFooter>
      </div>
    </Dialog>
  );
};

export default ApplyModal;
