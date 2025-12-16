/**
 * CategoryBadge Component
 *
 * Displays an Azure Advisor recommendation category as a styled badge
 * with consistent color coding and optional icon.
 *
 * Features:
 * - Color-coded badges (Cost=Green, Security=Red, etc.)
 * - Optional icon display
 * - Accessible with proper ARIA labels
 * - Responsive design
 */

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Shield, Activity, Zap, Settings } from 'lucide-react';
import {
  AdvisorCategory,
  CATEGORY_BADGE_STYLES,
  getCategoryLabel,
} from '@/types/azure-advisor';

export interface CategoryBadgeProps {
  category: AdvisorCategory;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Get icon component for category
 */
function getCategoryIcon(category: AdvisorCategory): React.ComponentType<any> {
  const icons: Record<AdvisorCategory, React.ComponentType<any>> = {
    Cost: DollarSign,
    Security: Shield,
    Reliability: Activity,
    Performance: Zap,
    OperationalExcellence: Settings,
  };
  return icons[category];
}

/**
 * Get size classes for badge and icon
 */
function getSizeClasses(size: 'sm' | 'md' | 'lg') {
  const sizes = {
    sm: {
      badge: 'text-xs px-2 py-0.5',
      icon: 'h-3 w-3',
    },
    md: {
      badge: 'text-sm px-2.5 py-1',
      icon: 'h-3.5 w-3.5',
    },
    lg: {
      badge: 'text-base px-3 py-1.5',
      icon: 'h-4 w-4',
    },
  };
  return sizes[size];
}

export function CategoryBadge({
  category,
  showIcon = false,
  size = 'md',
  className = '',
}: CategoryBadgeProps) {
  const Icon = getCategoryIcon(category);
  const label = getCategoryLabel(category);
  const sizeClasses = getSizeClasses(size);
  const badgeStyles = CATEGORY_BADGE_STYLES[category];

  return (
    <Badge
      className={`${badgeStyles} ${sizeClasses.badge} ${className} inline-flex items-center gap-1.5 font-medium border`}
      aria-label={`Category: ${label}`}
    >
      {showIcon && (
        <Icon
          className={sizeClasses.icon}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </Badge>
  );
}

/**
 * Impact Badge Component
 * Similar styling for impact levels
 */
export interface ImpactBadgeProps {
  impact: 'High' | 'Medium' | 'Low';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ImpactBadge({
  impact,
  size = 'md',
  className = '',
}: ImpactBadgeProps) {
  const sizeClasses = getSizeClasses(size);

  const styles: Record<'High' | 'Medium' | 'Low', string> = {
    High: 'bg-red-100 text-red-800 border-red-300',
    Medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    Low: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  return (
    <Badge
      className={`${styles[impact]} ${sizeClasses.badge} ${className} inline-flex items-center font-medium border`}
      aria-label={`Impact: ${impact}`}
    >
      {impact}
    </Badge>
  );
}

/**
 * Status Badge Component
 * For recommendation status display
 */
export interface StatusBadgeProps {
  status: 'Active' | 'Suppressed' | 'Dismissed' | 'Resolved';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusBadge({
  status,
  size = 'md',
  className = '',
}: StatusBadgeProps) {
  const sizeClasses = getSizeClasses(size);

  const styles: Record<'Active' | 'Suppressed' | 'Dismissed' | 'Resolved', string> = {
    Active: 'bg-blue-100 text-blue-800 border-blue-300',
    Suppressed: 'bg-orange-100 text-orange-800 border-orange-300',
    Dismissed: 'bg-gray-100 text-gray-800 border-gray-300',
    Resolved: 'bg-green-100 text-green-800 border-green-300',
  };

  return (
    <Badge
      className={`${styles[status]} ${sizeClasses.badge} ${className} inline-flex items-center font-medium border`}
      aria-label={`Status: ${status}`}
    >
      {status}
    </Badge>
  );
}
