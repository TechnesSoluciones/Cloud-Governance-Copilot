'use client';

/**
 * Asset Grid View Component
 *
 * Card-based grid view for cloud resources
 * Features:
 * - Responsive grid layout
 * - Resource cards with key info
 * - Multi-select with checkboxes
 * - Status and cost display
 * - Orphaned resource indicators
 * - Quick actions
 *
 * Accessibility:
 * - Keyboard navigation
 * - ARIA labels
 * - Focus management
 */

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Server,
  Database,
  HardDrive,
  Network,
  Shield,
  Cloud,
  DollarSign,
  MapPin,
  AlertCircle,
  MoreVertical,
  Eye,
  Tags as TagsIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Asset, AssetProvider, AssetStatus } from '@/lib/api/assets';

// Component props
export interface AssetGridViewProps {
  assets: Asset[];
  selectedAssets: string[];
  onAssetClick: (asset: Asset) => void;
  onSelectionChange: (assetIds: string[]) => void;
  className?: string;
}

// Resource type icon mapping
const ResourceTypeIcons: Record<string, React.ComponentType<any>> = {
  VirtualMachine: Server,
  'Virtual Machine': Server,
  VM: Server,
  Database: Database,
  Storage: HardDrive,
  'Storage Account': HardDrive,
  Network: Network,
  VirtualNetwork: Network,
  Security: Shield,
  Default: Cloud,
};

// Get icon for resource type
const getResourceTypeIcon = (type: string): React.ComponentType<any> => {
  for (const [key, Icon] of Object.entries(ResourceTypeIcons)) {
    if (type.toLowerCase().includes(key.toLowerCase())) {
      return Icon;
    }
  }
  return ResourceTypeIcons.Default;
};

// Status configuration
const StatusConfig: Record<AssetStatus, { className: string; label: string }> = {
  active: {
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    label: 'Active',
  },
  terminated: {
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    label: 'Stopped',
  },
};

// Provider configuration
const ProviderConfig: Record<AssetProvider, { className: string; bgGradient: string }> = {
  AWS: {
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    bgGradient: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20',
  },
  AZURE: {
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
  },
};

/**
 * AssetGridView Component
 * Displays assets in a card-based grid layout
 */
export const AssetGridView: React.FC<AssetGridViewProps> = ({
  assets,
  selectedAssets,
  onAssetClick,
  onSelectionChange,
  className,
}) => {
  // Handle asset selection
  const handleAssetSelect = (assetId: string, checked: boolean, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelection = checked
      ? [...selectedAssets, assetId]
      : selectedAssets.filter((id) => id !== assetId);
    onSelectionChange(newSelection);
  };

  if (assets.length === 0) {
    return (
      <Card className={cn('p-12 text-center', className)}>
        <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
        <p className="text-gray-500">No assets to display</p>
      </Card>
    );
  }

  return (
    <div
      className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}
    >
      {assets.map((asset) => {
        const isSelected = selectedAssets.includes(asset.id);
        const isOrphaned = !asset.tags?.Owner || !asset.tags?.Environment || !asset.tags?.Project;
        const Icon = getResourceTypeIcon(asset.resourceType);
        const statusConfig = StatusConfig[asset.status];
        const providerConfig = ProviderConfig[asset.provider];

        return (
          <Card
            key={asset.id}
            className={cn(
              'relative overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer group',
              isSelected && 'ring-2 ring-brand-orange'
            )}
            onClick={() => onAssetClick(asset)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onAssetClick(asset);
              }
            }}
            aria-label={`Asset ${asset.name || asset.resourceId}`}
          >
            {/* Header with gradient background */}
            <div className={cn('p-4 pb-3 bg-gradient-to-br', providerConfig.bgGradient)}>
              <div className="flex items-start justify-between gap-2">
                {/* Icon and Title */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <Icon className="h-6 w-6 text-gray-700 dark:text-gray-300" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-semibold text-sm truncate"
                      title={asset.name || asset.resourceId}
                    >
                      {asset.name || asset.resourceId}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {asset.resourceType}
                    </p>
                  </div>
                </div>

                {/* Checkbox and Menu */}
                <div className="flex items-center gap-1">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleAssetSelect(asset.id, checked === true, event as any)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${asset.name || asset.resourceId}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssetClick(asset); }}>
                        <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                        <TagsIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                        Edit Tags
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 pt-3 space-y-3">
              {/* Status and Provider */}
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className={statusConfig.className}>
                  {statusConfig.label}
                </Badge>
                <Badge className={providerConfig.className}>{asset.provider}</Badge>
              </div>

              {/* Region */}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{asset.region}</span>
              </div>

              {/* Cost */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <DollarSign className="h-4 w-4" aria-hidden="true" />
                  <span>Monthly Cost</span>
                </div>
                <span className="font-semibold text-sm">
                  {asset.monthlyCost !== undefined ? (
                    `$${asset.monthlyCost.toFixed(2)}`
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </span>
              </div>

              {/* Tags Preview */}
              {Object.keys(asset.tags || {}).length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {Object.entries(asset.tags || {})
                    .slice(0, 2)
                    .map(([key, value]) => (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {key}: {value.length > 8 ? `${value.substring(0, 8)}...` : value}
                      </Badge>
                    ))}
                  {Object.keys(asset.tags || {}).length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{Object.keys(asset.tags || {}).length - 2}
                    </Badge>
                  )}
                </div>
              )}

              {/* Orphaned Warning */}
              {isOrphaned && (
                <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-xs text-brand-orange">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>Orphaned Resource</span>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
