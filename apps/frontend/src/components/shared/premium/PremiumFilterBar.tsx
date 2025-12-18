/**
 * PremiumFilterBar Component
 * Unified filter UI with search and custom filter elements
 * Provides consistent filter experience across all pages
 */

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export interface PremiumFilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  className?: string;
}

export const PremiumFilterBar: React.FC<PremiumFilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  className = '',
}) => {
  return (
    <Card className={`border-2 shadow-sm ${className}`}>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Search Input */}
          {onSearchChange && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 h-11 focus:border-brand-orange/50"
              />
            </div>
          )}

          {/* Custom Filters */}
          {filters && (
            <div className="flex items-center gap-3 flex-wrap">
              {filters}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
