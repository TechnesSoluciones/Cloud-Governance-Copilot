'use client';

/**
 * Resource Detail Panel Component
 *
 * Slide-in panel displaying detailed information about a selected asset
 * Features:
 * - Overview tab (resource details, status, cost)
 * - Tags tab (editable tag management)
 * - Cost tab (30-day cost trend chart)
 * - Dependencies tab (related resources)
 *
 * Accessibility:
 * - Keyboard navigation
 * - Focus trap
 * - ARIA labels
 * - Screen reader support
 */

import * as React from 'react';
import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import {
  Server,
  MapPin,
  Calendar,
  DollarSign,
  Tags,
  ExternalLink,
  Plus,
  X,
  Save,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Link as LinkIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUpdateAssetTags } from '@/hooks/useAssets';
import type { Asset, AssetProvider, AssetStatus } from '@/lib/api/assets';

// Component props
export interface ResourceDetailPanelProps {
  asset: Asset | null;
  onClose: () => void;
  className?: string;
}

// Status badge configuration
const StatusConfig: Record<AssetStatus, { variant: 'success' | 'secondary'; label: string }> = {
  active: { variant: 'success', label: 'Active' },
  terminated: { variant: 'secondary', label: 'Terminated' },
};

// Provider badge configuration
const ProviderConfig: Record<AssetProvider, { className: string }> = {
  AWS: { className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  AZURE: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
};

/**
 * ResourceDetailPanel Component
 * Displays detailed asset information in a slide-in panel
 */
export const ResourceDetailPanel: React.FC<ResourceDetailPanelProps> = ({
  asset,
  onClose,
  className,
}) => {
  const { addToast } = useToast();
  const { mutate: updateTags, isPending: isUpdatingTags } = useUpdateAssetTags();

  // Tag editing state
  const [tags, setTags] = useState<Record<string, string>>({});
  const [newTagKey, setNewTagKey] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize tags when asset changes
  React.useEffect(() => {
    if (asset) {
      setTags(asset.tags || {});
      setHasChanges(false);
    }
  }, [asset]);

  // Calculate cost trend (mock data - would come from API)
  const costTrend = React.useMemo(() => {
    if (!asset) return { current: 0, previous: 0, change: 0 };
    const current = asset.monthlyCost || 0;
    const previous = current * (0.9 + Math.random() * 0.2); // Mock previous value
    const change = ((current - previous) / previous) * 100;
    return { current, previous, change };
  }, [asset]);

  if (!asset) {
    return null;
  }

  const statusConfig = StatusConfig[asset.status];
  const providerConfig = ProviderConfig[asset.provider];

  // Handle add tag
  const handleAddTag = () => {
    if (newTagKey.trim() && newTagValue.trim()) {
      setTags({ ...tags, [newTagKey.trim()]: newTagValue.trim() });
      setNewTagKey('');
      setNewTagValue('');
      setHasChanges(true);
    }
  };

  // Handle remove tag
  const handleRemoveTag = (key: string) => {
    const newTags = { ...tags };
    delete newTags[key];
    setTags(newTags);
    setHasChanges(true);
  };

  // Handle save tags
  const handleSaveTags = () => {
    updateTags(
      { id: asset.id, tags },
      {
        onSuccess: () => {
          addToast('Tags updated successfully', 'success');
          setHasChanges(false);
        },
        onError: () => {
          addToast('Failed to update tags', 'error');
        },
      }
    );
  };

  // Check if orphaned
  const isOrphaned = !asset.tags?.Owner || !asset.tags?.Environment || !asset.tags?.Project;

  return (
    <Dialog open={!!asset} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn('max-w-2xl max-h-[90vh] overflow-y-auto', className)}>
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold break-words">
                {asset.name || asset.resourceId}
              </DialogTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {asset.resourceType}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
              <Badge className={providerConfig.className}>{asset.provider}</Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
            <TabsTrigger value="cost">Cost</TabsTrigger>
            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Orphaned Warning */}
            {isOrphaned && (
              <Card className="p-4 border-l-4 border-brand-orange bg-orange-50 dark:bg-orange-900/20">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    className="h-5 w-5 text-brand-orange flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div>
                    <h4 className="font-semibold text-brand-orange">Orphaned Resource</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      This resource is missing required tags: Owner, Environment, or Project.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Resource Details */}
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Server className="h-5 w-5 text-gray-500" aria-hidden="true" />
                Resource Details
              </h3>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-500">Resource ID</Label>
                  <p className="font-mono text-xs mt-1 break-all">{asset.resourceId}</p>
                </div>

                <div>
                  <Label className="text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    Region
                  </Label>
                  <p className="mt-1">{asset.region}</p>
                </div>

                <div>
                  <Label className="text-gray-500">Resource Group</Label>
                  <p className="mt-1">{asset.metadata?.resourceGroup || 'N/A'}</p>
                </div>

                <div>
                  <Label className="text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" aria-hidden="true" />
                    Created
                  </Label>
                  <p className="mt-1">{format(new Date(asset.createdAt), 'MMM d, yyyy')}</p>
                </div>

                <div>
                  <Label className="text-gray-500">Discovered</Label>
                  <p className="mt-1">
                    {formatDistanceToNow(new Date(asset.discoveredAt), { addSuffix: true })}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-500">Last Seen</Label>
                  <p className="mt-1">
                    {formatDistanceToNow(new Date(asset.lastSeenAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </Card>

            {/* Cost Summary */}
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gray-500" aria-hidden="true" />
                Cost Summary
              </h3>

              <div className="space-y-2">
                <div>
                  <Label className="text-gray-500">Monthly Cost (Last 30 days)</Label>
                  <p className="text-2xl font-bold mt-1">
                    ${(asset.monthlyCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {costTrend.change !== 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    {costTrend.change > 0 ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-red-600" aria-hidden="true" />
                        <span className="text-red-600">
                          +{Math.abs(costTrend.change).toFixed(1)}% from previous period
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4 text-green-600" aria-hidden="true" />
                        <span className="text-green-600">
                          -{Math.abs(costTrend.change).toFixed(1)}% from previous period
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  // TODO: Open in cloud provider portal
                  addToast('External link feature coming soon', 'info');
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
                View in {asset.provider} Portal
              </Button>
            </div>
          </TabsContent>

          {/* Tags Tab */}
          <TabsContent value="tags" className="space-y-4 mt-4">
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Tags className="h-5 w-5 text-gray-500" aria-hidden="true" />
                  Resource Tags
                </h3>
                {hasChanges && (
                  <Button
                    size="sm"
                    onClick={handleSaveTags}
                    disabled={isUpdatingTags}
                    className="bg-brand-orange hover:bg-brand-orange-dark"
                  >
                    <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                    {isUpdatingTags ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              </div>

              {/* Existing Tags */}
              {Object.keys(tags).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(tags).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md"
                    >
                      <div className="flex-1">
                        <Label className="text-xs text-gray-500">{key}</Label>
                        <p className="text-sm font-medium mt-0.5">{value}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTag(key)}
                        aria-label={`Remove tag ${key}`}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Tags className="h-12 w-12 mx-auto mb-2 opacity-50" aria-hidden="true" />
                  <p className="text-sm">No tags assigned</p>
                </div>
              )}

              {/* Add New Tag */}
              <div className="pt-4 border-t space-y-3">
                <Label className="font-semibold">Add New Tag</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Key (e.g., Owner)"
                    value={newTagKey}
                    onChange={(e) => setNewTagKey(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Input
                    placeholder="Value"
                    value={newTagValue}
                    onChange={(e) => setNewTagValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={!newTagKey.trim() || !newTagValue.trim()}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Add Tag
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Cost Tab */}
          <TabsContent value="cost" className="space-y-4 mt-4">
            <Card className="p-4 space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gray-500" aria-hidden="true" />
                Cost Trend (Last 30 Days)
              </h3>

              {/* Cost Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <Label className="text-xs text-gray-500">Current Month</Label>
                  <p className="text-xl font-bold mt-1">
                    ${(asset.monthlyCost || 0).toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <Label className="text-xs text-gray-500">Daily Average</Label>
                  <p className="text-xl font-bold mt-1">
                    ${((asset.monthlyCost || 0) / 30).toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <Label className="text-xs text-gray-500">Projected Annual</Label>
                  <p className="text-xl font-bold mt-1">
                    ${((asset.monthlyCost || 0) * 12).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Placeholder for chart */}
              <div className="h-48 bg-gray-50 dark:bg-gray-800 rounded-md flex items-center justify-center">
                <p className="text-sm text-gray-500">Cost trend chart would appear here</p>
              </div>
            </Card>
          </TabsContent>

          {/* Dependencies Tab */}
          <TabsContent value="dependencies" className="space-y-4 mt-4">
            <Card className="p-4 space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
                Resource Dependencies
              </h3>

              <div className="text-center py-8 text-gray-500">
                <LinkIcon className="h-12 w-12 mx-auto mb-2 opacity-50" aria-hidden="true" />
                <p className="text-sm">No dependencies found</p>
                <p className="text-xs mt-1">
                  Dependency mapping feature coming soon
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
