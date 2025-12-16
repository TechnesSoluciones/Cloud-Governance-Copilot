'use client';

/**
 * Asset Table View Component (Enhanced)
 *
 * Advanced table view with:
 * - Multi-select with checkboxes
 * - Column sorting
 * - Column visibility toggle
 * - Pagination
 * - Row actions menu
 * - Orphaned resource indicators
 * - Responsive design
 *
 * Accessibility:
 * - ARIA labels
 * - Keyboard navigation
 * - Screen reader support
 */

import * as React from 'react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Server,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Eye,
  Tags,
  ExternalLink,
  Columns,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Asset, AssetProvider, AssetStatus } from '@/lib/api/assets';

// Component props
export interface AssetTableViewProps {
  assets: Asset[];
  selectedAssets: string[];
  onAssetClick: (asset: Asset) => void;
  onSelectionChange: (assetIds: string[]) => void;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  className?: string;
}

// Column definition
interface Column {
  id: string;
  label: string;
  width?: string;
  sortable?: boolean;
  visible?: boolean;
}

// Default columns
const DEFAULT_COLUMNS: Column[] = [
  { id: 'name', label: 'Name', width: '25%', sortable: true, visible: true },
  { id: 'type', label: 'Type', width: '15%', sortable: true, visible: true },
  { id: 'provider', label: 'Provider', width: '10%', sortable: false, visible: true },
  { id: 'region', label: 'Region', width: '12%', sortable: true, visible: true },
  { id: 'status', label: 'Status', width: '10%', sortable: true, visible: true },
  { id: 'tags', label: 'Tags', width: '15%', sortable: false, visible: true },
  { id: 'cost', label: 'Monthly Cost', width: '13%', sortable: true, visible: true },
  { id: 'lastSeen', label: 'Last Seen', width: '15%', sortable: true, visible: false },
];

// Status/Provider configurations (reused from other components)
const StatusConfig: Record<AssetStatus, { variant: 'success' | 'secondary'; label: string }> = {
  active: { variant: 'success', label: 'Active' },
  terminated: { variant: 'secondary', label: 'Terminated' },
};

const ProviderConfig: Record<AssetProvider, { className: string }> = {
  AWS: { className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  AZURE: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
};

/**
 * AssetTableView Component
 * Enhanced table view with multi-select and advanced features
 */
export const AssetTableView: React.FC<AssetTableViewProps> = ({
  assets,
  selectedAssets,
  onAssetClick,
  onSelectionChange,
  pagination,
  className,
}) => {
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Check if all assets are selected
  const allSelected = assets.length > 0 && assets.every((asset) => selectedAssets.includes(asset.id));
  const someSelected = selectedAssets.length > 0 && !allSelected;

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(assets.map((asset) => asset.id));
    } else {
      onSelectionChange([]);
    }
  };

  // Handle asset selection
  const handleAssetSelect = (assetId: string, checked: boolean) => {
    const newSelection = checked
      ? [...selectedAssets, assetId]
      : selectedAssets.filter((id) => id !== assetId);
    onSelectionChange(newSelection);
  };

  // Handle column visibility toggle
  const handleColumnToggle = (columnId: string) => {
    setColumns(
      columns.map((col) =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  };

  // Handle sort
  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  // Sort assets
  const sortedAssets = React.useMemo(() => {
    const sorted = [...assets].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'name':
          aValue = a.name || a.resourceId;
          bValue = b.name || b.resourceId;
          break;
        case 'type':
          aValue = a.resourceType;
          bValue = b.resourceType;
          break;
        case 'region':
          aValue = a.region;
          bValue = b.region;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'cost':
          aValue = a.monthlyCost || 0;
          bValue = b.monthlyCost || 0;
          break;
        case 'lastSeen':
          aValue = new Date(a.lastSeenAt).getTime();
          bValue = new Date(b.lastSeenAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [assets, sortColumn, sortDirection]);

  // Visible columns
  const visibleColumns = columns.filter((col) => col.visible);

  if (assets.length === 0) {
    return (
      <Card className={cn('p-12 text-center', className)}>
        <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
        <p className="text-gray-500">No assets to display</p>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {selectedAssets.length > 0 ? (
            <span className="font-semibold text-brand-orange">
              {selectedAssets.length} selected
            </span>
          ) : (
            <span>
              Showing {assets.length} asset{assets.length !== 1 ? 's' : ''}
            </span>
          )}
        </p>

        {/* Column Visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns className="h-4 w-4 mr-2" aria-hidden="true" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.visible}
                onCheckedChange={() => handleColumnToggle(column.id)}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Select All Checkbox */}
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all assets"
                    {...(someSelected && { checked: 'indeterminate' as any })}
                  />
                </TableHead>

                {/* Column Headers */}
                {visibleColumns.map((column) => (
                  <TableHead
                    key={column.id}
                    className={cn(
                      column.width && `w-[${column.width}]`,
                      column.sortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                    onClick={() => column.sortable && handleSort(column.id)}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {column.sortable && sortColumn === column.id && (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        )
                      )}
                    </div>
                  </TableHead>
                ))}

                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedAssets.map((asset) => {
                const isSelected = selectedAssets.includes(asset.id);
                const isOrphaned = !asset.tags?.Owner || !asset.tags?.Environment || !asset.tags?.Project;
                const statusConfig = StatusConfig[asset.status];
                const providerConfig = ProviderConfig[asset.provider];

                return (
                  <TableRow
                    key={asset.id}
                    className={cn(
                      'cursor-pointer',
                      isSelected && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                    onClick={() => onAssetClick(asset)}
                  >
                    {/* Checkbox */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleAssetSelect(asset.id, checked === true)}
                        aria-label={`Select ${asset.name || asset.resourceId}`}
                      />
                    </TableCell>

                    {/* Name */}
                    {visibleColumns.find((col) => col.id === 'name') && (
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
                          <span className="truncate" title={asset.name || asset.resourceId}>
                            {asset.name || asset.resourceId}
                          </span>
                          {isOrphaned && (
                            <AlertCircle
                              className="h-4 w-4 text-brand-orange flex-shrink-0"
                              aria-label="Orphaned resource"
                            />
                          )}
                        </div>
                      </TableCell>
                    )}

                    {/* Type */}
                    {visibleColumns.find((col) => col.id === 'type') && (
                      <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                        {asset.resourceType}
                      </TableCell>
                    )}

                    {/* Provider */}
                    {visibleColumns.find((col) => col.id === 'provider') && (
                      <TableCell>
                        <Badge className={providerConfig.className}>{asset.provider}</Badge>
                      </TableCell>
                    )}

                    {/* Region */}
                    {visibleColumns.find((col) => col.id === 'region') && (
                      <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                        {asset.region}
                      </TableCell>
                    )}

                    {/* Status */}
                    {visibleColumns.find((col) => col.id === 'status') && (
                      <TableCell>
                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                      </TableCell>
                    )}

                    {/* Tags */}
                    {visibleColumns.find((col) => col.id === 'tags') && (
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(asset.tags || {}).slice(0, 2).map(([key, value]) => (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {key}: {value}
                            </Badge>
                          ))}
                          {Object.keys(asset.tags || {}).length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{Object.keys(asset.tags || {}).length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    )}

                    {/* Cost */}
                    {visibleColumns.find((col) => col.id === 'cost') && (
                      <TableCell className="text-right font-semibold">
                        {asset.monthlyCost !== undefined ? (
                          `$${asset.monthlyCost.toFixed(2)}`
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                    )}

                    {/* Last Seen */}
                    {visibleColumns.find((col) => col.id === 'lastSeen') && (
                      <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                        {formatDistanceToNow(new Date(asset.lastSeenAt), { addSuffix: true })}
                      </TableCell>
                    )}

                    {/* Actions */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onAssetClick(asset)}>
                            <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Tags className="h-4 w-4 mr-2" aria-hidden="true" />
                            Edit Tags
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
                            Open in {asset.provider}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
