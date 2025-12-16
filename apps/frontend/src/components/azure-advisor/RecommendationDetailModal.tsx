/**
 * RecommendationDetailModal Component
 *
 * Displays detailed information about an Azure Advisor recommendation in a modal.
 *
 * Features:
 * - Three tabs: Details, Remediation, Impact
 * - Action buttons: Apply, Suppress, Dismiss, Export
 * - Responsive design
 * - Accessibility support
 * - Loading states
 */

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  Clock,
  X,
  Download,
  AlertTriangle,
  Info,
  ExternalLink,
} from 'lucide-react';
import {
  AdvisorRecommendationDTO,
  formatCurrency,
  formatRelativeDate,
  SuppressionDuration,
} from '@/types/azure-advisor';
import { CategoryBadge, ImpactBadge, StatusBadge } from './CategoryBadge';

export interface RecommendationDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendation: AdvisorRecommendationDTO | null;
  onApply: (id: string, notes?: string) => void;
  onSuppress: (id: string, duration: SuppressionDuration, reason?: string) => void;
  onDismiss: (id: string, reason: string) => void;
  isApplying?: boolean;
  isSuppressing?: boolean;
  isDismissing?: boolean;
}

/**
 * Suppression Duration Options
 */
const SUPPRESSION_DURATIONS: Array<{
  value: SuppressionDuration;
  label: string;
}> = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: -1, label: 'Permanently' },
];

/**
 * Details Tab Content
 */
function DetailsTab({ recommendation }: { recommendation: AdvisorRecommendationDTO }) {
  return (
    <div className="space-y-6">
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={recommendation.category} showIcon />
        <ImpactBadge impact={recommendation.impact} />
        <StatusBadge status={recommendation.status} />
      </div>

      {/* Description */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
        <p className="text-sm text-gray-700 leading-relaxed">
          {recommendation.longDescription}
        </p>
      </div>

      {/* Resource Details */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Affected Resource
        </h4>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">
              Resource Name
            </dt>
            <dd className="mt-1 text-sm text-gray-900 font-medium">
              {recommendation.resourceName || 'N/A'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">
              Resource Type
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {recommendation.resourceType}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-gray-500 uppercase">
              Resource ID
            </dt>
            <dd className="mt-1 text-xs text-gray-600 font-mono break-all">
              {recommendation.resourceId}
            </dd>
          </div>
        </dl>
      </div>

      {/* Last Updated */}
      <div className="text-xs text-gray-500">
        Last updated {formatRelativeDate(recommendation.lastUpdated)}
      </div>
    </div>
  );
}

/**
 * Remediation Tab Content
 */
function RemediationTab({ recommendation }: { recommendation: AdvisorRecommendationDTO }) {
  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-yellow-900 mb-1">
            Important
          </h4>
          <p className="text-sm text-yellow-800">
            Please review these steps carefully before applying. Test in a non-production
            environment first if possible.
          </p>
        </div>
      </div>

      {/* Remediation Steps */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Remediation Steps
        </h4>
        {recommendation.remediationSteps.length > 0 ? (
          <ol className="space-y-4">
            {recommendation.remediationSteps.map((step) => (
              <li key={step.stepNumber} className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                  {step.stepNumber}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm text-gray-700">{step.description}</p>
                  {step.command && (
                    <div className="mt-2 p-3 bg-gray-900 rounded-lg">
                      <code className="text-xs text-gray-100 font-mono">
                        {step.command}
                      </code>
                    </div>
                  )}
                  {step.documentationUrl && (
                    <a
                      href={step.documentationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      View documentation
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="flex items-start gap-2 p-4 bg-gray-50 rounded-lg">
            <Info className="h-5 w-5 text-gray-400" />
            <p className="text-sm text-gray-600">
              No detailed remediation steps available. Please refer to Azure
              documentation or contact support.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Impact Tab Content
 */
function ImpactTab({ recommendation }: { recommendation: AdvisorRecommendationDTO }) {
  return (
    <div className="space-y-6">
      {/* Potential Savings */}
      {recommendation.potentialSavings && (
        <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-green-900 mb-1">
                Potential Savings
              </h4>
              <div className="text-3xl font-bold text-green-700">
                {formatCurrency(
                  recommendation.potentialSavings.amount,
                  recommendation.potentialSavings.currency
                )}
              </div>
              <p className="text-sm text-green-600 mt-1">
                {recommendation.potentialSavings.unit || 'Monthly'}
              </p>
            </div>
            <div className="p-4 bg-green-100 rounded-full">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>
      )}

      {/* Impact Level Details */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Impact Assessment
        </h4>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <ImpactBadge impact={recommendation.impact} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                This recommendation has a{' '}
                <strong>{recommendation.impact.toLowerCase()}</strong> impact on your
                infrastructure. {recommendation.impact === 'High' &&
                  'We recommend addressing this as soon as possible.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Extended Properties */}
      {recommendation.extendedProperties &&
        Object.keys(recommendation.extendedProperties).length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Additional Details
            </h4>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(recommendation.extendedProperties).map(
                ([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs font-medium text-gray-500 uppercase">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value)}
                    </dd>
                  </div>
                )
              )}
            </dl>
          </div>
        )}
    </div>
  );
}

/**
 * Main RecommendationDetailModal Component
 */
export function RecommendationDetailModal({
  open,
  onOpenChange,
  recommendation,
  onApply,
  onSuppress,
  onDismiss,
  isApplying,
  isSuppressing,
  isDismissing,
}: RecommendationDetailModalProps) {
  const [activeTab, setActiveTab] = React.useState('details');
  const [applyNotes, setApplyNotes] = React.useState('');
  const [suppressDuration, setSuppressDuration] = React.useState<SuppressionDuration>(30);
  const [suppressReason, setSuppressReason] = React.useState('');
  const [dismissReason, setDismissReason] = React.useState('');
  const [showApplyForm, setShowApplyForm] = React.useState(false);
  const [showSuppressForm, setShowSuppressForm] = React.useState(false);
  const [showDismissForm, setShowDismissForm] = React.useState(false);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      setActiveTab('details');
      setApplyNotes('');
      setSuppressDuration(30);
      setSuppressReason('');
      setDismissReason('');
      setShowApplyForm(false);
      setShowSuppressForm(false);
      setShowDismissForm(false);
    }
  }, [open]);

  if (!recommendation) return null;

  const handleApply = () => {
    onApply(recommendation.id, applyNotes || undefined);
    setShowApplyForm(false);
  };

  const handleSuppress = () => {
    onSuppress(recommendation.id, suppressDuration, suppressReason || undefined);
    setShowSuppressForm(false);
  };

  const handleDismiss = () => {
    if (!dismissReason.trim()) {
      alert('Please provide a reason for dismissing this recommendation.');
      return;
    }
    onDismiss(recommendation.id, dismissReason);
    setShowDismissForm(false);
  };

  const handleExport = () => {
    // Simple PDF export (can be enhanced with a proper PDF library)
    const content = `
Azure Advisor Recommendation
============================

Category: ${recommendation.category}
Impact: ${recommendation.impact}
Status: ${recommendation.status}

Description:
${recommendation.longDescription}

Resource:
- Name: ${recommendation.resourceName || 'N/A'}
- Type: ${recommendation.resourceType}
- ID: ${recommendation.resourceId}

${recommendation.potentialSavings ? `
Potential Savings: ${formatCurrency(recommendation.potentialSavings.amount, recommendation.potentialSavings.currency)}
` : ''}

Remediation Steps:
${recommendation.remediationSteps.map((step) => `${step.stepNumber}. ${step.description}`).join('\n')}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recommendation-${recommendation.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {recommendation.shortDescription}
          </DialogTitle>
          <DialogDescription>
            Review the details and take action on this recommendation
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="remediation">Remediation</TabsTrigger>
            <TabsTrigger value="impact">Impact</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6">
            <DetailsTab recommendation={recommendation} />
          </TabsContent>

          <TabsContent value="remediation" className="mt-6">
            <RemediationTab recommendation={recommendation} />
          </TabsContent>

          <TabsContent value="impact" className="mt-6">
            <ImpactTab recommendation={recommendation} />
          </TabsContent>
        </Tabs>

        {/* Action Forms */}
        {showApplyForm && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <Label htmlFor="apply-notes">Notes (optional)</Label>
            <Textarea
              id="apply-notes"
              placeholder="Add any notes about applying this recommendation..."
              value={applyNotes}
              onChange={(e) => setApplyNotes(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button onClick={handleApply} disabled={isApplying}>
                {isApplying ? 'Applying...' : 'Confirm Apply'}
              </Button>
              <Button variant="outline" onClick={() => setShowApplyForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {showSuppressForm && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
            <div>
              <Label htmlFor="suppress-duration">Suppression Duration</Label>
              <Select
                value={String(suppressDuration)}
                onValueChange={(value) => setSuppressDuration(Number(value) as SuppressionDuration)}
              >
                <SelectTrigger id="suppress-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPRESSION_DURATIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="suppress-reason">Reason (optional)</Label>
              <Textarea
                id="suppress-reason"
                placeholder="Why are you suppressing this recommendation?"
                value={suppressReason}
                onChange={(e) => setSuppressReason(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSuppress} disabled={isSuppressing}>
                {isSuppressing ? 'Suppressing...' : 'Confirm Suppress'}
              </Button>
              <Button variant="outline" onClick={() => setShowSuppressForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {showDismissForm && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
            <div>
              <Label htmlFor="dismiss-reason">Reason (required)</Label>
              <Textarea
                id="dismiss-reason"
                placeholder="Why are you dismissing this recommendation?"
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                rows={3}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleDismiss} disabled={isDismissing}>
                {isDismissing ? 'Dismissing...' : 'Confirm Dismiss'}
              </Button>
              <Button variant="outline" onClick={() => setShowDismissForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {recommendation.status === 'Active' && !showApplyForm && !showSuppressForm && !showDismissForm && (
            <>
              <Button
                onClick={() => setShowApplyForm(true)}
                disabled={isApplying}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Apply
              </Button>
              <Button
                onClick={() => setShowSuppressForm(true)}
                disabled={isSuppressing}
                variant="outline"
              >
                <Clock className="h-4 w-4 mr-2" />
                Suppress
              </Button>
              <Button
                onClick={() => setShowDismissForm(true)}
                disabled={isDismissing}
                variant="outline"
              >
                <X className="h-4 w-4 mr-2" />
                Dismiss
              </Button>
            </>
          )}
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
