'use client';

/**
 * Resource Detail Modal Component
 *
 * Displays comprehensive information about a selected Azure resource
 * Features:
 * - Full resource properties display
 * - All tags shown in organized layout
 * - Collapsible JSON metadata viewer
 * - Copyable resource ID
 * - Link to Azure Portal (optional)
 * - Keyboard accessible (ESC to close)
 * - Focus trap for accessibility
 * - Responsive design
 */

import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Server,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Tag,
  FileJson,
} from 'lucide-react';
import { Resource } from '@/types/resources';
import { cn } from '@/lib/utils';

/**
 * Component Props
 */
export interface ResourceDetailModalProps {
  /** Resource to display (null to close modal) */
  resource: Resource | null;
  /** Callback when modal is closed */
  onClose: () => void;
}

/**
 * Copyable Text Component
 * Displays text with copy-to-clipboard button
 */
interface CopyableTextProps {
  text: string;
  label?: string;
}

const CopyableText: React.FC<CopyableTextProps> = ({ text, label }) => {
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
    <div className="space-y-1">
      {label && (
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-md font-mono text-sm border border-gray-200 dark:border-gray-700">
        <span className="flex-1 truncate" title={text}>
          {text}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="flex-shrink-0 h-7 w-7 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label={copied ? 'Copied' : 'Copy to clipboard'}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  );
};

/**
 * Info Row Component
 * Displays a label-value pair
 */
interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <div className="grid grid-cols-3 gap-4 py-2.5 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</dt>
    <dd className="col-span-2 text-sm text-gray-900 dark:text-gray-100">{value}</dd>
  </div>
);

/**
 * Section Component
 * Groups related information with a title
 */
interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, icon, children }) => (
  <div className="space-y-3">
    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
      {icon}
      {title}
    </h3>
    <div className="space-y-2">{children}</div>
  </div>
);

/**
 * Tags Display Component
 * Shows all resource tags in a grid
 */
interface TagsDisplayProps {
  tags: Record<string, string>;
}

const TagsDisplay: React.FC<TagsDisplayProps> = ({ tags }) => {
  const entries = Object.entries(tags);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
        No tags assigned to this resource
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <Badge
          key={key}
          variant="secondary"
          className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1"
        >
          <span className="font-semibold">{key}:</span> {value}
        </Badge>
      ))}
    </div>
  );
};

/**
 * JSON Viewer Component
 * Collapsible JSON properties viewer
 */
interface JsonViewerProps {
  data: Record<string, any>;
}

const JsonViewer: React.FC<JsonViewerProps> = ({ data }) => {
  const [expanded, setExpanded] = useState(false);

  if (!data || Object.keys(data).length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
        No additional properties available
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-brand-orange dark:hover:text-brand-orange transition-colors"
        aria-expanded={expanded}
        aria-controls="json-content"
      >
        <span className="flex items-center gap-2">
          <FileJson className="h-4 w-4" aria-hidden="true" />
          {expanded ? 'Hide' : 'Show'} Raw Properties
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <Card className="bg-gray-50 dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700" id="json-content">
          <pre className="text-xs overflow-auto max-h-96 text-gray-800 dark:text-gray-200">
            {JSON.stringify(data, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
};

/**
 * Main ResourceDetailModal Component
 */
export const ResourceDetailModal: React.FC<ResourceDetailModalProps> = ({
  resource,
  onClose,
}) => {
  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (resource) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [resource, onClose]);

  if (!resource) return null;

  const hasProperties = resource.properties && Object.keys(resource.properties).length > 0;
  const hasTags = Object.keys(resource.tags).length > 0;

  return (
    <Dialog open={!!resource} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Server className="h-6 w-6 text-gray-600 dark:text-gray-400" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                {resource.name}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {resource.type}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Tabs */}
        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tags">
              Tags
              {hasTags && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {Object.keys(resource.tags).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="properties">
              Properties
              {hasProperties && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {Object.keys(resource.properties || {}).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {/* Basic Information */}
            <Section title="Basic Information" icon={<Server className="h-4 w-4" aria-hidden="true" />}>
              <Card className="p-4 border border-gray-200 dark:border-gray-700">
                <dl className="space-y-0">
                  <InfoRow label="Resource Name" value={resource.name} />
                  <InfoRow label="Resource Type" value={resource.type} />
                  <InfoRow label="Location" value={resource.location} />
                  <InfoRow label="Resource Group" value={resource.resourceGroup} />
                  {resource.provisioningState && (
                    <InfoRow
                      label="Provisioning State"
                      value={
                        <Badge
                          variant={
                            resource.provisioningState === 'Succeeded'
                              ? 'success'
                              : 'secondary'
                          }
                        >
                          {resource.provisioningState}
                        </Badge>
                      }
                    />
                  )}
                </dl>
              </Card>
            </Section>

            {/* Resource ID */}
            <Section title="Identifiers">
              <CopyableText text={resource.id} label="Resource ID" />
            </Section>

            {/* SKU Information (if available) */}
            {resource.sku && (
              <Section title="SKU">
                <Card className="p-4 border border-gray-200 dark:border-gray-700">
                  <dl className="space-y-0">
                    {resource.sku.name && <InfoRow label="Name" value={resource.sku.name} />}
                    {resource.sku.tier && <InfoRow label="Tier" value={resource.sku.tier} />}
                    {resource.sku.size && <InfoRow label="Size" value={resource.sku.size} />}
                    {resource.sku.family && <InfoRow label="Family" value={resource.sku.family} />}
                    {resource.sku.capacity && (
                      <InfoRow label="Capacity" value={resource.sku.capacity} />
                    )}
                  </dl>
                </Card>
              </Section>
            )}

            {/* Timestamps */}
            <Section title="Timestamps">
              <Card className="p-4 border border-gray-200 dark:border-gray-700">
                <dl className="space-y-0">
                  {resource.createdAt && (
                    <InfoRow
                      label="Created"
                      value={new Date(resource.createdAt).toLocaleString()}
                    />
                  )}
                  {resource.updatedAt && (
                    <InfoRow
                      label="Last Updated"
                      value={new Date(resource.updatedAt).toLocaleString()}
                    />
                  )}
                </dl>
              </Card>
            </Section>
          </TabsContent>

          {/* Tags Tab */}
          <TabsContent value="tags" className="space-y-4 mt-4">
            <Section title="Resource Tags" icon={<Tag className="h-4 w-4" aria-hidden="true" />}>
              <Card className="p-4 border border-gray-200 dark:border-gray-700">
                <TagsDisplay tags={resource.tags} />
              </Card>
            </Section>
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" className="space-y-4 mt-4">
            <Section
              title="Additional Properties"
              icon={<FileJson className="h-4 w-4" aria-hidden="true" />}
            >
              <JsonViewer data={resource.properties || {}} />
            </Section>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
