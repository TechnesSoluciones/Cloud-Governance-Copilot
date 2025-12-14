'use client';

/**
 * Asset Detail Modal Component
 *
 * Displays comprehensive information about a selected asset
 * Features:
 * - Complete asset metadata
 * - Copyable resource ID
 * - Provider and region info
 * - Tags display
 * - Cost information with link to cost analysis
 * - Discovery timeline
 * - Collapsible JSON metadata viewer
 * - Responsive layout
 * - Accessibility features
 */

import * as React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Server,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Clock,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { Asset, AssetProvider, AssetStatus } from '@/lib/api/assets';

// Provider Badge Component
interface ProviderBadgeProps {
  provider: AssetProvider;
}

const ProviderBadge: React.FC<ProviderBadgeProps> = ({ provider }) => {
  const variants: Record<AssetProvider, { className: string }> = {
    AWS: {
      className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    },
    AZURE: {
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    },
  };

  const config = variants[provider];

  return (
    <Badge variant="default" className={config.className}>
      {provider}
    </Badge>
  );
};

// Status Badge Component
interface StatusBadgeProps {
  status: AssetStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const variants: Record<AssetStatus, { variant: 'success' | 'secondary'; label: string }> = {
    active: { variant: 'success', label: 'Active' },
    terminated: { variant: 'secondary', label: 'Terminated' },
  };

  const config = variants[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
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
export interface AssetDetailModalProps {
  asset: Asset | null;
  onClose: () => void;
}

/**
 * Asset Detail Modal
 * Comprehensive view of a single asset's information
 */
export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ asset, onClose }) => {
  const [metadataExpanded, setMetadataExpanded] = React.useState(false);

  if (!asset) return null;

  const hasMetadata = asset.metadata && Object.keys(asset.metadata).length > 0;
  const hasTags = asset.tags && Object.keys(asset.tags).length > 0;

  return (
    <Dialog open={!!asset} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <DialogHeader className="border-b p-6">
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                <Server className="h-6 w-6 text-gray-600 dark:text-gray-400" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {asset.name || asset.resourceId}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {asset.resourceType}
                </p>
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
            {/* Overview Section */}
            <Section title="Overview" icon={<Server className="h-5 w-5" aria-hidden="true" />}>
              <InfoRow label="Provider" value={<ProviderBadge provider={asset.provider} />} />
              <InfoRow label="Region" value={asset.region} />
              <InfoRow label="Status" value={<StatusBadge status={asset.status} />} />
              {asset.name && asset.name !== asset.resourceId && (
                <InfoRow label="Display Name" value={asset.name} />
              )}
            </Section>

            {/* Identifiers Section */}
            <Section title="Identifiers" icon={<Tag className="h-5 w-5" aria-hidden="true" />}>
              <InfoRow label="Resource ID" value={<CopyableText text={asset.resourceId} />} />
              <InfoRow label="Cloud Account ID" value={asset.cloudAccountId} />
              <InfoRow label="Asset ID" value={<CopyableText text={asset.id} />} />
            </Section>

            {/* Tags Section */}
            {hasTags && (
              <Section title="Tags" icon={<Tag className="h-5 w-5" aria-hidden="true" />}>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(asset.tags).map(([key, value]) => (
                    <Badge key={key} variant="secondary" className="text-xs">
                      <span className="font-semibold">{key}</span>: {value}
                    </Badge>
                  ))}
                </div>
              </Section>
            )}

            {/* Cost Section */}
            {asset.monthlyCost !== undefined && asset.monthlyCost !== null && (
              <Section
                title="Cost Information"
                icon={<DollarSign className="h-5 w-5" aria-hidden="true" />}
              >
                <InfoRow
                  label="Monthly Cost"
                  value={
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      ${asset.monthlyCost.toFixed(2)}
                    </span>
                  }
                />
                <div className="pt-3">
                  <Link
                    href={`/cost?resourceId=${encodeURIComponent(asset.resourceId)}`}
                    className="inline-flex items-center gap-2 text-sm text-brand-orange hover:text-brand-orange-dark font-medium"
                  >
                    View detailed cost analysis
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </Section>
            )}

            {/* Timeline Section */}
            <Section title="Timeline" icon={<Clock className="h-5 w-5" aria-hidden="true" />}>
              <InfoRow
                label="First Discovered"
                value={
                  <div>
                    <div>{format(new Date(asset.discoveredAt), 'PPpp')}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(asset.discoveredAt), { addSuffix: true })}
                    </div>
                  </div>
                }
              />
              <InfoRow
                label="Last Seen"
                value={
                  <div>
                    <div>{format(new Date(asset.lastSeenAt), 'PPpp')}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(asset.lastSeenAt), { addSuffix: true })}
                    </div>
                  </div>
                }
              />
            </Section>

            {/* Metadata Section */}
            {hasMetadata && (
              <div className="space-y-3">
                <button
                  onClick={() => setMetadataExpanded(!metadataExpanded)}
                  className="w-full flex items-center justify-between text-base font-semibold text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  aria-expanded={metadataExpanded}
                  aria-controls="metadata-content"
                >
                  <span className="flex items-center gap-2">
                    <Server className="h-5 w-5" aria-hidden="true" />
                    Raw Metadata (JSON)
                  </span>
                  {metadataExpanded ? (
                    <ChevronUp className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>

                {metadataExpanded && (
                  <Card className="p-4" id="metadata-content">
                    <pre className="text-xs overflow-auto max-h-96 bg-gray-50 dark:bg-gray-900 p-4 rounded">
                      {JSON.stringify(asset.metadata, null, 2)}
                    </pre>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
};
