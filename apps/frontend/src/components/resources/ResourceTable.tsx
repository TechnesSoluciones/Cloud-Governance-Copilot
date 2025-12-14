'use client';

/**
 * Resource Table Component
 *
 * Displays Azure resources in a sortable, interactive table
 * Features:
 * - Sortable columns (click header to sort)
 * - Row selection for bulk actions
 * - Click row to view details
 * - Responsive design with horizontal scroll
 * - Loading skeleton states
 * - Empty state with helpful message
 * - Keyboard navigation support
 * - ARIA labels for accessibility
 */

import * as React from 'react';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowUpDown, Database } from 'lucide-react';
import { Resource } from '@/types/resources';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/skeletons';

/**
 * Table Column Configuration
 */
type SortableColumn = 'name' | 'type' | 'location' | 'resourceGroup';

interface ColumnConfig {
  key: SortableColumn;
  label: string;
  sortable: boolean;
  width?: string;
}

const COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Name', sortable: true, width: 'w-[25%]' },
  { key: 'type', label: 'Type', sortable: true, width: 'w-[30%]' },
  { key: 'location', label: 'Location', sortable: true, width: 'w-[15%]' },
  { key: 'resourceGroup', label: 'Resource Group', sortable: true, width: 'w-[20%]' },
];

/**
 * Component Props
 */
export interface ResourceTableProps {
  /** Array of resources to display */
  resources: Resource[];
  /** Loading state */
  isLoading: boolean;
  /** Click handler for row selection */
  onRowClick?: (resource: Resource) => void;
  /** Selected resource IDs (for row selection) */
  selectedIds?: string[];
  /** Selection change handler */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Current sort configuration */
  sortBy?: SortableColumn;
  sortOrder?: 'asc' | 'desc';
  /** Sort change handler */
  onSortChange?: (column: SortableColumn) => void;
}

/**
 * Loading Skeleton
 * Displays while data is being fetched
 */
const TableLoadingSkeleton: React.FC = () => (
  <TableSkeleton
    rows={10}
    columns={4}
    showCheckbox={true}
    headerLabels={['Name', 'Type', 'Location', 'Resource Group']}
  />
);

/**
 * Empty State
 * Shown when no resources match the current filters
 */
const EmptyState: React.FC = () => (
  <Card className="p-12 text-center">
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
        <Database className="h-12 w-12 text-gray-400" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          No resources found
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md">
          No Azure resources match your current filters. Try adjusting your search
          criteria or clearing filters to see all resources.
        </p>
      </div>
    </div>
  </Card>
);

/**
 * Tag Badge
 * Displays a single tag key-value pair
 */
interface TagBadgeProps {
  tagKey: string;
  tagValue: string;
}

const TagBadge: React.FC<TagBadgeProps> = ({ tagKey, tagValue }) => (
  <Badge
    variant="secondary"
    className="text-xs font-normal bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
  >
    {tagKey}: {tagValue}
  </Badge>
);

/**
 * Tags Cell
 * Displays resource tags with truncation
 */
interface TagsCellProps {
  tags: Record<string, string>;
  maxVisible?: number;
}

const TagsCell: React.FC<TagsCellProps> = ({ tags, maxVisible = 2 }) => {
  const entries = Object.entries(tags);

  if (entries.length === 0) {
    return (
      <span className="text-sm text-gray-400 dark:text-gray-500">No tags</span>
    );
  }

  const visibleTags = entries.slice(0, maxVisible);
  const remainingCount = entries.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1">
      {visibleTags.map(([key, value]) => (
        <TagBadge key={key} tagKey={key} tagValue={value} />
      ))}
      {remainingCount > 0 && (
        <Badge
          variant="secondary"
          className="text-xs font-normal bg-gray-200 dark:bg-gray-700"
        >
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
};

/**
 * Sortable Table Header
 * Column header with sort indicator
 */
interface SortableHeaderProps {
  column: ColumnConfig;
  currentSort?: SortableColumn;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: SortableColumn) => void;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  column,
  currentSort,
  sortOrder,
  onSort,
}) => {
  const isActive = currentSort === column.key;

  if (!column.sortable || !onSort) {
    return <TableHead className={column.width}>{column.label}</TableHead>;
  }

  return (
    <TableHead className={column.width}>
      <button
        onClick={() => onSort(column.key)}
        className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        aria-label={`Sort by ${column.label}`}
      >
        {column.label}
        <ArrowUpDown
          className={cn(
            'h-4 w-4',
            isActive
              ? 'text-gray-900 dark:text-gray-100'
              : 'text-gray-400 dark:text-gray-600'
          )}
          aria-hidden="true"
        />
      </button>
    </TableHead>
  );
};

/**
 * Main ResourceTable Component
 */
export const ResourceTable: React.FC<ResourceTableProps> = ({
  resources,
  isLoading,
  onRowClick,
  selectedIds = [],
  onSelectionChange,
  sortBy,
  sortOrder,
  onSortChange,
}) => {
  // Local selection state if not controlled
  const [localSelection, setLocalSelection] = useState<string[]>([]);
  const selection = selectedIds.length > 0 ? selectedIds : localSelection;
  const setSelection = onSelectionChange || setLocalSelection;

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelection(resources.map((r) => r.id));
    } else {
      setSelection([]);
    }
  };

  // Handle individual row selection
  const handleSelectRow = (resourceId: string, checked: boolean) => {
    if (checked) {
      setSelection([...selection, resourceId]);
    } else {
      setSelection(selection.filter((id) => id !== resourceId));
    }
  };

  // Check if all visible rows are selected
  const allSelected = resources.length > 0 && selection.length === resources.length;
  const someSelected = selection.length > 0 && selection.length < resources.length;

  // Loading state
  if (isLoading) {
    return <TableLoadingSkeleton />;
  }

  // Empty state
  if (resources.length === 0) {
    return <EmptyState />;
  }

  // Main table
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Selection column */}
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all resources"
                  className={someSelected ? 'data-[state=checked]:bg-gray-400' : ''}
                />
              </TableHead>
              {/* Data columns */}
              {COLUMNS.map((column) => (
                <SortableHeader
                  key={column.key}
                  column={column}
                  currentSort={sortBy}
                  sortOrder={sortOrder}
                  onSort={onSortChange}
                />
              ))}
              <TableHead className="w-[10%]">Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources.map((resource) => {
              const isSelected = selection.includes(resource.id);

              return (
                <TableRow
                  key={resource.id}
                  className={cn(
                    'cursor-pointer transition-colors',
                    isSelected && 'bg-gray-50 dark:bg-gray-800'
                  )}
                  onClick={() => onRowClick?.(resource)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRowClick?.(resource);
                    }
                  }}
                  aria-label={`View details for ${resource.name}`}
                  data-state={isSelected ? 'selected' : undefined}
                >
                  {/* Selection checkbox */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleSelectRow(resource.id, checked as boolean)
                      }
                      aria-label={`Select ${resource.name}`}
                    />
                  </TableCell>

                  {/* Name */}
                  <TableCell className="font-medium">
                    <span
                      className="truncate block max-w-[300px]"
                      title={resource.name}
                    >
                      {resource.name}
                    </span>
                  </TableCell>

                  {/* Type */}
                  <TableCell>
                    <span
                      className="text-sm text-gray-600 dark:text-gray-300 truncate block max-w-[300px]"
                      title={resource.type}
                    >
                      {resource.type}
                    </span>
                  </TableCell>

                  {/* Location */}
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {resource.location}
                    </span>
                  </TableCell>

                  {/* Resource Group */}
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {resource.resourceGroup}
                    </span>
                  </TableCell>

                  {/* Tags */}
                  <TableCell>
                    <TagsCell tags={resource.tags} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
