/**
 * PremiumSectionHeader Component
 * Consistent page header with gradient text and action buttons
 * Used at the top of every dashboard page
 */

import * as React from 'react';
import { PREMIUM_GRADIENTS } from './design-tokens';

export interface PremiumSectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PremiumSectionHeader: React.FC<PremiumSectionHeaderProps> = ({
  title,
  subtitle,
  actions,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div>
        <h1 className={`text-4xl font-bold tracking-tight ${PREMIUM_GRADIENTS.heading}`}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-base text-muted-foreground mt-2">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-3 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
