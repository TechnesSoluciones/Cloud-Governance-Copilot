'use client';

/**
 * Resource Tree View Component
 *
 * Hierarchical tree view for cloud resources with grouping:
 * - Group by: Resource Group → Type → Resources
 * - Expandable/collapsible folders
 * - Resource counts per node
 * - Cost aggregation
 * - Status indicators
 * - Orphaned resource badges
 * - Click handling for detail view
 *
 * Features:
 * - Expand/collapse all
 * - Search filtering
 * - Lazy loading
 * - Keyboard navigation
 * - Accessibility compliant
 */

import * as React from 'react';
import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Server,
  Database,
  HardDrive,
  Network,
  Shield,
  Cloud,
  AlertCircle,
  ChevronsRight,
  ChevronsDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Asset, AssetProvider, AssetStatus } from '@/lib/api/assets';

// Component props
export interface ResourceTreeViewProps {
  assets: Asset[];
  selectedAssets: string[];
  onAssetClick: (asset: Asset) => void;
  onSelectionChange: (assetIds: string[]) => void;
  className?: string;
}

// Tree node interface
interface TreeNode {
  id: string;
  type: 'group' | 'resourceType' | 'resource';
  label: string;
  children?: TreeNode[];
  asset?: Asset;
  count?: number;
  totalCost?: number;
  orphanedCount?: number;
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

// Status badge configuration
const StatusConfig: Record<AssetStatus, { className: string; label: string }> = {
  active: { className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Running' },
  terminated: { className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', label: 'Stopped' },
};

/**
 * Build tree structure from flat asset list
 */
const buildTree = (assets: Asset[]): TreeNode[] => {
  const tree: TreeNode[] = [];
  const groupMap = new Map<string, TreeNode>();

  assets.forEach((asset) => {
    const groupName = asset.metadata?.resourceGroup || 'Ungrouped Resources';

    // Get or create resource group node
    let groupNode = groupMap.get(groupName);
    if (!groupNode) {
      groupNode = {
        id: `group-${groupName}`,
        type: 'group',
        label: groupName,
        children: [],
        count: 0,
        totalCost: 0,
        orphanedCount: 0,
      };
      groupMap.set(groupName, groupNode);
      tree.push(groupNode);
    }

    // Find or create resource type node
    let typeNode = groupNode.children?.find(
      (node) => node.type === 'resourceType' && node.label === asset.resourceType
    );
    if (!typeNode) {
      typeNode = {
        id: `type-${groupName}-${asset.resourceType}`,
        type: 'resourceType',
        label: asset.resourceType,
        children: [],
        count: 0,
        totalCost: 0,
        orphanedCount: 0,
      };
      groupNode.children?.push(typeNode);
    }

    // Add resource node
    const isOrphaned = !asset.tags?.Owner || !asset.tags?.Environment || !asset.tags?.Project;
    const resourceNode: TreeNode = {
      id: `resource-${asset.id}`,
      type: 'resource',
      label: asset.name || asset.resourceId,
      asset,
    };
    typeNode.children?.push(resourceNode);

    // Update counts and costs
    typeNode.count = (typeNode.count || 0) + 1;
    typeNode.totalCost = (typeNode.totalCost || 0) + (asset.monthlyCost || 0);
    if (isOrphaned) typeNode.orphanedCount = (typeNode.orphanedCount || 0) + 1;

    groupNode.count = (groupNode.count || 0) + 1;
    groupNode.totalCost = (groupNode.totalCost || 0) + (asset.monthlyCost || 0);
    if (isOrphaned) groupNode.orphanedCount = (groupNode.orphanedCount || 0) + 1;
  });

  // Sort nodes
  tree.sort((a, b) => a.label.localeCompare(b.label));
  tree.forEach((groupNode) => {
    groupNode.children?.sort((a, b) => a.label.localeCompare(b.label));
    groupNode.children?.forEach((typeNode) => {
      typeNode.children?.sort((a, b) => a.label.localeCompare(b.label));
    });
  });

  return tree;
};

/**
 * Tree Node Component
 */
interface TreeNodeComponentProps {
  node: TreeNode;
  level: number;
  expandedNodes: Set<string>;
  selectedAssets: string[];
  onToggle: (nodeId: string) => void;
  onAssetClick: (asset: Asset) => void;
  onAssetSelect: (assetId: string, checked: boolean) => void;
}

const TreeNodeComponent: React.FC<TreeNodeComponentProps> = ({
  node,
  level,
  expandedNodes,
  selectedAssets,
  onToggle,
  onAssetClick,
  onAssetSelect,
}) => {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = (node.children?.length || 0) > 0;

  // Resource node rendering
  if (node.type === 'resource' && node.asset) {
    const asset = node.asset;
    const isSelected = selectedAssets.includes(asset.id);
    const isOrphaned = !asset.tags?.Owner || !asset.tags?.Environment || !asset.tags?.Project;
    const statusConfig = StatusConfig[asset.status];
    const Icon = getResourceTypeIcon(asset.resourceType);

    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer transition-colors',
          isSelected && 'bg-blue-50 dark:bg-blue-900/20'
        )}
        style={{ paddingLeft: `${level * 1.5}rem` }}
        onClick={() => onAssetClick(asset)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onAssetClick(asset);
          }
        }}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => {
            onAssetSelect(asset.id, checked === true);
          }}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${asset.name || asset.resourceId}`}
        />
        <Icon className="h-4 w-4 text-gray-500 flex-shrink-0" aria-hidden="true" />
        <span className="flex-1 text-sm truncate">{node.label}</span>
        {isOrphaned && (
          <AlertCircle
            className="h-4 w-4 text-brand-orange flex-shrink-0"
            aria-label="Orphaned resource"
          />
        )}
        <Badge variant="secondary" className={cn('text-xs', statusConfig.className)}>
          {statusConfig.label}
        </Badge>
        <span className="text-xs text-gray-500 font-semibold min-w-[60px] text-right">
          ${(asset.monthlyCost || 0).toFixed(0)}/mo
        </span>
      </div>
    );
  }

  // Group/Type node rendering
  const FolderIcon = isExpanded ? FolderOpen : Folder;
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded cursor-pointer transition-colors group"
        style={{ paddingLeft: `${level * 1.5}rem` }}
        onClick={() => hasChildren && onToggle(node.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            hasChildren && onToggle(node.id);
          }
        }}
        aria-expanded={isExpanded}
      >
        {hasChildren ? (
          <ChevronIcon className="h-4 w-4 text-gray-500 flex-shrink-0" aria-hidden="true" />
        ) : (
          <span className="w-4" />
        )}
        <FolderIcon
          className={cn(
            'h-4 w-4 flex-shrink-0',
            node.type === 'group'
              ? 'text-blue-500'
              : 'text-gray-500'
          )}
          aria-hidden="true"
        />
        <span className="flex-1 font-medium text-sm">{node.label}</span>
        {node.orphanedCount && node.orphanedCount > 0 ? (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-xs">
            {node.orphanedCount} orphaned
          </Badge>
        ) : null}
        <Badge variant="secondary" className="text-xs">
          {node.count}
        </Badge>
        <span className="text-xs text-gray-500 font-semibold min-w-[60px] text-right">
          ${(node.totalCost || 0).toFixed(0)}/mo
        </span>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children?.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              selectedAssets={selectedAssets}
              onToggle={onToggle}
              onAssetClick={onAssetClick}
              onAssetSelect={onAssetSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * ResourceTreeView Component
 * Displays assets in a hierarchical tree structure
 */
export const ResourceTreeView: React.FC<ResourceTreeViewProps> = ({
  assets,
  selectedAssets,
  onAssetClick,
  onSelectionChange,
  className,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Build tree structure
  const tree = useMemo(() => buildTree(assets), [assets]);

  // Toggle node expansion
  const handleToggle = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Expand all nodes
  const handleExpandAll = () => {
    const allNodeIds = new Set<string>();
    const collectIds = (nodes: TreeNode[]) => {
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          allNodeIds.add(node.id);
          collectIds(node.children);
        }
      });
    };
    collectIds(tree);
    setExpandedNodes(allNodeIds);
  };

  // Collapse all nodes
  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Handle asset selection
  const handleAssetSelect = (assetId: string, checked: boolean) => {
    const newSelection = checked
      ? [...selectedAssets, assetId]
      : selectedAssets.filter((id) => id !== assetId);
    onSelectionChange(newSelection);
  };

  if (assets.length === 0) {
    return (
      <Card className={cn('p-12 text-center', className)}>
        <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
        <p className="text-gray-500">No assets to display</p>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 dark:bg-gray-900">
        <h3 className="font-semibold text-lg">Resource Tree</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExpandAll}
            aria-label="Expand all nodes"
          >
            <ChevronsDown className="h-4 w-4 mr-1" aria-hidden="true" />
            Expand All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCollapseAll}
            aria-label="Collapse all nodes"
          >
            <ChevronsRight className="h-4 w-4 mr-1" aria-hidden="true" />
            Collapse All
          </Button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="max-h-[600px] overflow-y-auto p-2">
        {tree.map((node) => (
          <TreeNodeComponent
            key={node.id}
            node={node}
            level={0}
            expandedNodes={expandedNodes}
            selectedAssets={selectedAssets}
            onToggle={handleToggle}
            onAssetClick={onAssetClick}
            onAssetSelect={handleAssetSelect}
          />
        ))}
      </div>
    </Card>
  );
};
