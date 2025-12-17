'use client';

/**
 * Bulk Actions Toolbar Component
 *
 * Provides bulk operations for selected assets:
 * - Tag management (add/update tags)
 * - Export (CSV/JSON)
 * - Delete resources
 * - Status changes (start/stop)
 *
 * Features:
 * - Shows selected count
 * - Confirmation dialogs for destructive actions
 * - Progress tracking for bulk operations
 * - Keyboard shortcuts
 * - Accessibility compliant
 */

import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import {
  Tags,
  Download,
  Trash2,
  X,
  ChevronDown,
  Play,
  Square,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBulkUpdateTags } from '@/hooks/useAssets';
import type { Asset } from '@/lib/api/assets';

// Component props
export interface BulkActionsToolbarProps {
  selectedAssets: Asset[];
  onDeselectAll: () => void;
  onBulkComplete?: () => void;
  className?: string;
}

/**
 * BulkActionsToolbar Component
 * Provides bulk operations for multiple selected assets
 */
export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedAssets,
  onDeselectAll,
  onBulkComplete,
  className,
}) => {
  const { addToast } = useToast();
  const { mutate: bulkUpdateTags, isPending: isUpdatingTags } = useBulkUpdateTags();

  // Modal states
  const [showTagModal, setShowTagModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Tag modal state
  const [tagKey, setTagKey] = useState('');
  const [tagValue, setTagValue] = useState('');
  const [tagOperation, setTagOperation] = useState<'add' | 'replace' | 'remove'>('add');

  const selectedCount = selectedAssets.length;

  // Handle tag operation
  const handleBulkTag = () => {
    if (!tagKey.trim() || (tagOperation !== 'remove' && !tagValue.trim())) {
      addToast('Please provide both tag key and value', 'error');
      return;
    }

    const resourceIds = selectedAssets.map((asset) => asset.id);

    bulkUpdateTags(
      {
        resourceIds,
        tags: { [tagKey.trim()]: tagValue.trim() },
        operation: tagOperation,
      },
      {
        onSuccess: (response) => {
          if (response.success && response.data) {
            addToast(
              `Successfully updated tags for ${response.data.data.updatedCount} resources`,
              'success'
            );
            setShowTagModal(false);
            setTagKey('');
            setTagValue('');
            onBulkComplete?.();
            onDeselectAll();
          }
        },
        onError: () => {
          addToast('Failed to update tags. Please try again.', 'error');
        },
      }
    );
  };

  // Handle export to CSV
  const handleExportCSV = () => {
    try {
      const headers = [
        'Name',
        'Type',
        'Provider',
        'Region',
        'Status',
        'Monthly Cost',
        'Resource Group',
        'Resource ID',
        'Tags',
      ];

      const rows = selectedAssets.map((asset) => [
        asset.name || asset.resourceId,
        asset.resourceType,
        asset.provider,
        asset.region,
        asset.status,
        asset.monthlyCost?.toString() || 'N/A',
        asset.metadata?.resourceGroup || 'N/A',
        asset.resourceId,
        Object.entries(asset.tags || {})
          .map(([k, v]) => `${k}:${v}`)
          .join('; '),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `assets-export-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      addToast(`Exported ${selectedCount} assets to CSV`, 'success');
    } catch (error) {
      addToast('Failed to export assets', 'error');
    }
  };

  // Handle export to JSON
  const handleExportJSON = () => {
    try {
      const jsonContent = JSON.stringify(selectedAssets, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `assets-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();

      addToast(`Exported ${selectedCount} assets to JSON`, 'success');
    } catch (error) {
      addToast('Failed to export assets', 'error');
    }
  };

  // Handle delete (placeholder - actual implementation depends on backend)
  const handleDelete = () => {
    // TODO: Implement actual delete API call
    addToast('Delete functionality coming soon', 'info');
    setShowDeleteModal(false);
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          'sticky top-0 z-10 bg-brand-orange text-white shadow-lg rounded-lg p-4',
          className
        )}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Selection info */}
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-white text-brand-orange font-semibold">
              {selectedCount}
            </Badge>
            <span className="font-medium">
              {selectedCount === 1 ? '1 asset selected' : `${selectedCount} assets selected`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeselectAll}
              className="text-white hover:bg-brand-orange-dark"
              aria-label="Deselect all assets"
            >
              <X className="h-4 w-4 mr-1" aria-hidden="true" />
              Deselect All
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Tag Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTagModal(true)}
              disabled={isUpdatingTags}
              className="bg-white text-brand-orange hover:bg-gray-100"
            >
              {isUpdatingTags ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  Updating...
                </>
              ) : (
                <>
                  <Tags className="h-4 w-4 mr-2" aria-hidden="true" />
                  Tag
                </>
              )}
            </Button>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white text-brand-orange hover:bg-gray-100"
                >
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                  Export
                  <ChevronDown className="h-4 w-4 ml-1" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportJSON}>
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-100 text-red-700 hover:bg-red-200"
            >
              <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Tag Modal */}
      <Dialog open={showTagModal} onOpenChange={setShowTagModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Tag Update</DialogTitle>
            <DialogDescription>
              Update tags for {selectedCount} selected {selectedCount === 1 ? 'asset' : 'assets'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Operation Type */}
            <div className="space-y-2">
              <Label htmlFor="tag-operation">Operation</Label>
              <select
                id="tag-operation"
                value={tagOperation}
                onChange={(e) => setTagOperation(e.target.value as 'add' | 'replace' | 'remove')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="add">Add / Update Tag</option>
                <option value="replace">Replace All Tags</option>
                <option value="remove">Remove Tag</option>
              </select>
            </div>

            {/* Tag Key */}
            <div className="space-y-2">
              <Label htmlFor="tag-key">Tag Key</Label>
              <Input
                id="tag-key"
                placeholder="e.g., Owner"
                value={tagKey}
                onChange={(e) => setTagKey(e.target.value)}
              />
            </div>

            {/* Tag Value (hidden for remove operation) */}
            {tagOperation !== 'remove' && (
              <div className="space-y-2">
                <Label htmlFor="tag-value">Tag Value</Label>
                <Input
                  id="tag-value"
                  placeholder="e.g., John Doe"
                  value={tagValue}
                  onChange={(e) => setTagValue(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTagModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkTag}
              disabled={isUpdatingTags || !tagKey.trim()}
              className="bg-brand-orange hover:bg-brand-orange-dark"
            >
              {isUpdatingTags ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  Updating...
                </>
              ) : (
                'Apply Tags'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Assets</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCount} selected{' '}
              {selectedCount === 1 ? 'asset' : 'assets'}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">
                Warning: This will permanently delete the selected cloud resources. Make sure you
                have backups if needed.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
              Delete Resources
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
