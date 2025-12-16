'use client';

/**
 * Security Finding Modal Component (Enhanced with Tabs)
 *
 * Comprehensive modal for viewing and managing security findings
 * Features:
 * - Three tabs: Details, Affected Resources, Remediation
 * - Details tab: Full description, impact, severity, category info
 * - Affected Resources tab: List of all affected resources with export
 * - Remediation tab: Step-by-step remediation guide with links to docs
 * - Action buttons: Acknowledge, Resolve, Dismiss, Export
 * - Loading states
 * - Responsive design
 * - Full accessibility (ARIA, keyboard navigation)
 *
 * @example
 * <SecurityFindingModal
 *   finding={selectedFinding}
 *   onClose={handleClose}
 *   onResolve={handleResolve}
 * />
 */

import * as React from 'react';
import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  Copy,
  Check,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Server,
  AlertOctagon,
  AlertTriangle,
  Info,
  ShieldAlert,
  FileText,
  Download,
  ExternalLink,
  BookOpen,
  ListChecks,
} from 'lucide-react';
import { Finding, FindingSeverity, FindingStatus } from '@/lib/api/security';
import { useResolveFinding, useDismissFinding } from '@/hooks/useSecurity';
import { useToast } from '@/components/ui/toast';

export interface SecurityFindingModalProps {
  finding: Finding | null;
  onClose: () => void;
}

/**
 * Severity Badge
 */
interface SeverityBadgeProps {
  severity: FindingSeverity;
}

const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const config: Record<
    FindingSeverity,
    { className: string; icon: React.ReactNode; label: string }
  > = {
    CRITICAL: {
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200',
      icon: <AlertOctagon className="h-4 w-4" aria-hidden="true" />,
      label: 'Critical',
    },
    HIGH: {
      className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200',
      icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
      label: 'High',
    },
    MEDIUM: {
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200',
      icon: <ShieldAlert className="h-4 w-4" aria-hidden="true" />,
      label: 'Medium',
    },
    LOW: {
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-200',
      icon: <Info className="h-4 w-4" aria-hidden="true" />,
      label: 'Low',
    },
  };

  const { className, icon, label } = config[severity];

  return (
    <Badge className={`${className} flex items-center gap-1 w-fit`}>
      {icon}
      {label}
    </Badge>
  );
};

/**
 * Status Badge
 */
interface StatusBadgeProps {
  status: FindingStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config: Record<FindingStatus, { className: string; label: string }> = {
    open: {
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      label: 'Open',
    },
    resolved: {
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      label: 'Resolved',
    },
    dismissed: {
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      label: 'Dismissed',
    },
  };

  const { className, label } = config[status];

  return <Badge className={className}>{label}</Badge>;
};

/**
 * Copyable text component
 */
interface CopyableTextProps {
  text: string;
}

const CopyableText: React.FC<CopyableTextProps> = ({ text }) => {
  const [copied, setCopied] = useState(false);

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
    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded font-mono text-sm group">
      <span className="flex-1 truncate" title={text}>
        {text}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="flex-shrink-0 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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

/**
 * Details Tab Content
 */
interface DetailsTabProps {
  finding: Finding;
}

const DetailsTab: React.FC<DetailsTabProps> = ({ finding }) => {
  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          Description
        </h4>
        <Card className="p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {finding.description}
          </p>
        </Card>
      </div>

      {/* Impact & Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Severity</h4>
          <SeverityBadge severity={finding.severity} />
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
            {finding.severity === 'CRITICAL' && 'Immediate action required. Critical security risk.'}
            {finding.severity === 'HIGH' && 'High priority. Significant security risk.'}
            {finding.severity === 'MEDIUM' && 'Medium priority. Moderate security risk.'}
            {finding.severity === 'LOW' && 'Low priority. Minor security consideration.'}
          </p>
        </Card>

        <Card className="p-4">
          <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Category</h4>
          <Badge variant="secondary" className="text-sm">
            {finding.category}
          </Badge>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
            Security control category
          </p>
        </Card>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          Timeline
        </h4>
        <Card className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Detected</p>
              <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                {format(new Date(finding.detectedAt), 'PPpp')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatDistanceToNow(new Date(finding.detectedAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          {finding.resolvedAt && (
            <div className="flex items-start justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Resolved</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                  {format(new Date(finding.resolvedAt), 'PPpp')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(finding.resolvedAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Compliance */}
      {finding.cisControl && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
            Compliance
          </h4>
          <Card className="p-4">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">CIS Control</p>
            <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{finding.cisControl}</p>
          </Card>
        </div>
      )}

      {/* Resolution/Dismissal Info */}
      {finding.resolution && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden="true" />
            Resolution
          </h4>
          <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {finding.resolution}
            </p>
          </Card>
        </div>
      )}

      {finding.dismissalReason && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
            Dismissal Reason
          </h4>
          <Card className="p-4 bg-gray-50 dark:bg-gray-800">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {finding.dismissalReason}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};

/**
 * Affected Resources Tab Content
 */
interface AffectedResourcesTabProps {
  finding: Finding;
}

const AffectedResourcesTab: React.FC<AffectedResourcesTabProps> = ({ finding }) => {
  // In real implementation, this would fetch multiple resources
  // For now, showing the single resource from the finding
  const resources = [
    {
      id: finding.resourceId,
      type: finding.resourceType,
      region: finding.region,
      accountId: finding.cloudAccountId,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Server className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          Affected Resources ({resources.length})
        </h4>
      </div>

      <div className="space-y-3">
        {resources.map((resource, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Resource ID
                </p>
                <CopyableText text={resource.id} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Type</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {resource.type}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Region</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {resource.region}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Account ID
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 truncate" title={resource.accountId}>
                    {resource.accountId}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Info note */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Resource Information
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              These resources have been identified with this security finding. Review and remediate each one according to the recommendations.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

/**
 * Remediation Tab Content
 */
interface RemediationTabProps {
  finding: Finding;
}

const RemediationTab: React.FC<RemediationTabProps> = ({ finding }) => {
  // Parse recommendation into steps (split by newlines or numbered items)
  const steps = finding.recommendation
    .split(/\n+/)
    .filter((step) => step.trim().length > 0)
    .map((step, index) => ({
      number: index + 1,
      text: step.trim(),
    }));

  return (
    <div className="space-y-6">
      {/* Recommendation Overview */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          Remediation Steps
        </h4>
        <Card className="p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            {finding.recommendation}
          </p>
        </Card>
      </div>

      {/* Step-by-step guide */}
      {steps.length > 1 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Step-by-Step Guide
          </h4>
          <div className="space-y-3">
            {steps.map((step) => (
              <Card key={step.number} className="p-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {step.number}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 flex-1 mt-1">
                    {step.text}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Documentation Links */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
          Additional Resources
        </h4>
        <Card className="p-4 space-y-3">
          <a
            href={`https://docs.aws.amazon.com/security/`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  AWS Security Documentation
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Official security best practices
                </p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" aria-hidden="true" />
          </a>

          {finding.cisControl && (
            <a
              href={`https://www.cisecurity.org/controls/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    CIS Controls Documentation
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Learn about {finding.cisControl}
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" aria-hidden="true" />
            </a>
          )}
        </Card>
      </div>

      {/* Warning note */}
      <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Important Notice
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Always test remediation steps in a non-production environment first. Changes to security configurations can impact service availability.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

/**
 * Main SecurityFindingModal component
 */
export const SecurityFindingModal: React.FC<SecurityFindingModalProps> = ({
  finding,
  onClose,
}) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('details');
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [showDismissForm, setShowDismissForm] = useState(false);
  const [resolutionText, setResolutionText] = useState('');
  const [dismissalReason, setDismissalReason] = useState('');

  const { mutate: resolveFinding, isPending: isResolving } = useResolveFinding();
  const { mutate: dismissFinding, isPending: isDismissing } = useDismissFinding();

  // Reset state when finding changes
  React.useEffect(() => {
    if (finding) {
      setActiveTab('details');
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

  const handleExport = () => {
    const data = JSON.stringify(finding, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `security-finding-${finding.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('Finding exported successfully', 'success');
  };

  const isOpen = finding.status === 'open';

  return (
    <Dialog open={!!finding} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <DialogHeader className="border-b p-6 flex-shrink-0">
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

          {/* Tabs */}
          <div className="flex-1 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 pt-4 border-b border-gray-200 dark:border-gray-700">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="resources">Affected Resources</TabsTrigger>
                  <TabsTrigger value="remediation">Remediation</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="details">
                  <DetailsTab finding={finding} />
                </TabsContent>

                <TabsContent value="resources">
                  <AffectedResourcesTab finding={finding} />
                </TabsContent>

                <TabsContent value="remediation">
                  <RemediationTab finding={finding} />
                </TabsContent>
              </div>
            </Tabs>

            {/* Action Forms */}
            {isOpen && (
              <div className="px-6 pb-6">
                {showResolveForm && (
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
                )}

                {showDismissForm && (
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
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {isOpen && !showResolveForm && !showDismissForm && (
            <div className="border-t p-6 bg-gray-50 dark:bg-gray-800 flex gap-3 justify-end flex-shrink-0">
              <Button variant="outline" onClick={handleExport} size="sm">
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                Export
              </Button>
              <Button
                onClick={() => setShowResolveForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Resolve
              </Button>
              <Button variant="outline" onClick={() => setShowDismissForm(true)} size="sm">
                <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};
