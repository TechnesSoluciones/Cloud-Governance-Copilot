'use client';

/**
 * Finding Detail Modal Component
 *
 * Displays comprehensive information about a security finding
 * Features:
 * - Full finding information (title, description, severity, category, recommendation)
 * - CIS benchmark reference if available
 * - Affected resource details
 * - Detected and resolved dates
 * - Current status with color badge
 * - Action buttons: Resolve (opens form with resolution text), Dismiss (opens form with dismissal reason)
 * - Resolution/dismissal history display
 * - Copyable resource ID
 * - Responsive layout
 * - Accessibility features
 */

import * as React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Shield,
  Copy,
  Check,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Tag,
  Server,
  AlertOctagon,
  AlertTriangle,
  Info,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import { Finding, FindingSeverity, FindingStatus } from '@/lib/api/security';
import { useResolveFinding, useDismissFinding } from '@/hooks/useSecurity';
import { useToast } from '@/components/ui/toast';

// Severity Badge Component
interface SeverityBadgeProps {
  severity: FindingSeverity;
}

const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const variants: Record<
    FindingSeverity,
    { className: string; icon: React.ReactNode; label: string }
  > = {
    CRITICAL: {
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200',
      icon: <AlertOctagon className="h-4 w-4" aria-hidden="true" />,
      label: 'Critical',
    },
    HIGH: {
      className:
        'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200',
      icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
      label: 'High',
    },
    MEDIUM: {
      className:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200',
      icon: <ShieldAlert className="h-4 w-4" aria-hidden="true" />,
      label: 'Medium',
    },
    LOW: {
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-200',
      icon: <Info className="h-4 w-4" aria-hidden="true" />,
      label: 'Low',
    },
  };

  const config = variants[severity];

  return (
    <Badge variant="default" className={`${config.className} flex items-center gap-1 w-fit`}>
      {config.icon}
      {config.label}
    </Badge>
  );
};

// Status Badge Component
interface StatusBadgeProps {
  status: FindingStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const variants: Record<
    FindingStatus,
    { variant: 'default' | 'success' | 'secondary'; label: string; className?: string }
  > = {
    open: {
      variant: 'default',
      label: 'Open',
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    },
    resolved: {
      variant: 'success',
      label: 'Resolved',
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
    dismissed: {
      variant: 'secondary',
      label: 'Dismissed',
    },
  };

  const config = variants[status];

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
};

// Copyable Text Component
interface CopyableTextProps {
  text: string;
}

const CopyableText: React.FC<CopyableTextProps> = ({ text }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded font-mono text-sm">
      <span className="flex-1 truncate" title={text}>
        {text}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="flex-shrink-0 h-8 w-8 p-0"
        aria-label={copied ? 'Copied' : 'Copy to clipboard'}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
};

// Info Row Component
interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <div className="grid grid-cols-3 gap-4 py-3 border-b last:border-b-0">
    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</dt>
    <dd className="col-span-2 text-sm text-gray-900 dark:text-gray-100">{value}</dd>
  </div>
);

// Section Component
interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, icon, children }) => (
  <div className="space-y-3">
    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
      {icon}
      {title}
    </h3>
    <Card className="p-4">
      <dl className="divide-y divide-gray-200 dark:divide-gray-700">{children}</dl>
    </Card>
  </div>
);

// Main Component Props
export interface FindingDetailModalProps {
  finding: Finding | null;
  onClose: () => void;
}

/**
 * Finding Detail Modal
 * Comprehensive view of a single security finding with action buttons
 */
export const FindingDetailModal: React.FC<FindingDetailModalProps> = ({ finding, onClose }) => {
  const { addToast } = useToast();
  const [showResolveForm, setShowResolveForm] = React.useState(false);
  const [showDismissForm, setShowDismissForm] = React.useState(false);
  const [resolutionText, setResolutionText] = React.useState('');
  const [dismissalReason, setDismissalReason] = React.useState('');

  const { mutate: resolveFinding, isPending: isResolving } = useResolveFinding();
  const { mutate: dismissFinding, isPending: isDismissing } = useDismissFinding();

  // Reset form state when finding changes
  React.useEffect(() => {
    if (finding) {
      setShowResolveForm(false);
      setShowDismissForm(false);
      setResolutionText('');
      setDismissalReason('');
    }
  }, [finding?.id]);

  if (!finding) return null;

  const handleResolve = () => {
    if (!resolutionText.trim()) {
      addToast('Please provide a resolution description', 'error');
      return;
    }

    resolveFinding(
      { id: finding.id, resolution: resolutionText },
      {
        onSuccess: () => {
          addToast('Finding resolved successfully', 'success');
          setShowResolveForm(false);
          setResolutionText('');
          onClose();
        },
        onError: () => {
          addToast('Failed to resolve finding. Please try again.', 'error');
        },
      }
    );
  };

  const handleDismiss = () => {
    if (!dismissalReason.trim()) {
      addToast('Please provide a dismissal reason', 'error');
      return;
    }

    dismissFinding(
      { id: finding.id, dismissalReason },
      {
        onSuccess: () => {
          addToast('Finding dismissed successfully', 'success');
          setShowDismissForm(false);
          setDismissalReason('');
          onClose();
        },
        onError: () => {
          addToast('Failed to dismiss finding. Please try again.', 'error');
        },
      }
    );
  };

  const isOpen = finding.status === 'open';

  return (
    <Dialog open={!!finding} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <DialogHeader className="border-b p-6">
            <DialogTitle className="flex items-start gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                <Shield className="h-6 w-6 text-gray-600 dark:text-gray-400" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {finding.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={finding.severity} />
                  <StatusBadge status={finding.status} />
                  <Badge variant="secondary" className="text-xs">
                    {finding.category}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="flex-shrink-0"
                aria-label="Close dialog"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Description */}
            <Section title="Description" icon={<FileText className="h-5 w-5" aria-hidden="true" />}>
              <div className="py-3">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {finding.description}
                </p>
              </div>
            </Section>

            {/* Recommendation */}
            <Section
              title="Recommendation"
              icon={<AlertCircle className="h-5 w-5" aria-hidden="true" />}
            >
              <div className="py-3">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {finding.recommendation}
                </p>
              </div>
            </Section>

            {/* CIS Control */}
            {finding.cisControl && (
              <Section title="Compliance" icon={<Shield className="h-5 w-5" aria-hidden="true" />}>
                <InfoRow label="CIS Control" value={finding.cisControl} />
              </Section>
            )}

            {/* Resource Information */}
            <Section title="Affected Resource" icon={<Server className="h-5 w-5" aria-hidden="true" />}>
              <InfoRow label="Resource ID" value={<CopyableText text={finding.resourceId} />} />
              <InfoRow label="Resource Type" value={finding.resourceType} />
              <InfoRow label="Region" value={finding.region} />
              <InfoRow label="Cloud Account" value={finding.cloudAccountId} />
            </Section>

            {/* Timeline */}
            <Section title="Timeline" icon={<Clock className="h-5 w-5" aria-hidden="true" />}>
              <InfoRow
                label="Detected"
                value={
                  <div>
                    <div>{format(new Date(finding.detectedAt), 'PPpp')}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(finding.detectedAt), { addSuffix: true })}
                    </div>
                  </div>
                }
              />
              {finding.resolvedAt && (
                <InfoRow
                  label="Resolved"
                  value={
                    <div>
                      <div>{format(new Date(finding.resolvedAt), 'PPpp')}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(finding.resolvedAt), { addSuffix: true })}
                      </div>
                    </div>
                  }
                />
              )}
              {finding.dismissedAt && (
                <InfoRow
                  label="Dismissed"
                  value={
                    <div>
                      <div>{format(new Date(finding.dismissedAt), 'PPpp')}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(finding.dismissedAt), { addSuffix: true })}
                      </div>
                    </div>
                  }
                />
              )}
            </Section>

            {/* Resolution/Dismissal Information */}
            {finding.resolution && (
              <Section title="Resolution" icon={<CheckCircle className="h-5 w-5" aria-hidden="true" />}>
                <div className="py-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {finding.resolution}
                  </p>
                </div>
              </Section>
            )}

            {finding.dismissalReason && (
              <Section title="Dismissal Reason" icon={<XCircle className="h-5 w-5" aria-hidden="true" />}>
                <div className="py-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {finding.dismissalReason}
                  </p>
                </div>
              </Section>
            )}

            {/* Action Forms */}
            {isOpen && (
              <div className="space-y-4">
                {/* Resolve Form */}
                {showResolveForm ? (
                  <Card className="p-4 border-green-200 bg-green-50 dark:bg-green-900/20">
                    <div className="space-y-3">
                      <Label htmlFor="resolution" className="text-sm font-medium">
                        Resolution Description
                      </Label>
                      <Textarea
                        id="resolution"
                        placeholder="Describe how this finding was resolved..."
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleResolve}
                          disabled={isResolving || !resolutionText.trim()}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {isResolving ? 'Resolving...' : 'Confirm Resolution'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowResolveForm(false);
                            setResolutionText('');
                          }}
                          disabled={isResolving}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  /* Dismiss Form */
                  showDismissForm && (
                    <Card className="p-4 border-gray-200 bg-gray-50 dark:bg-gray-800">
                      <div className="space-y-3">
                        <Label htmlFor="dismissalReason" className="text-sm font-medium">
                          Dismissal Reason
                        </Label>
                        <Textarea
                          id="dismissalReason"
                          placeholder="Explain why this finding is being dismissed..."
                          value={dismissalReason}
                          onChange={(e) => setDismissalReason(e.target.value)}
                          rows={4}
                          className="resize-none"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={handleDismiss}
                            disabled={isDismissing || !dismissalReason.trim()}
                            variant="outline"
                          >
                            {isDismissing ? 'Dismissing...' : 'Confirm Dismissal'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowDismissForm(false);
                              setDismissalReason('');
                            }}
                            disabled={isDismissing}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {isOpen && !showResolveForm && !showDismissForm && (
            <div className="border-t p-6 bg-gray-50 dark:bg-gray-800 flex gap-3 justify-end">
              <Button
                onClick={() => setShowResolveForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Resolve Finding
              </Button>
              <Button variant="outline" onClick={() => setShowDismissForm(true)}>
                <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Dismiss Finding
              </Button>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};
