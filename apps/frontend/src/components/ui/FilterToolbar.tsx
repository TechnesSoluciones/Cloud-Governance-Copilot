/**
 * Filter Toolbar Component
 * Flexible filter bar for multi-criteria filtering
 */

'use client';

import { useState } from 'react';
import { BadgeV2 } from './BadgeV2';
import { cn } from '@/lib/utils';

export interface FilterOption {
  id: string;
  label: string;
  value: string;
  count?: number;
}

export interface FilterGroup {
  id: string;
  label: string;
  icon?: string;
  options: FilterOption[];
  multiSelect?: boolean;
}

interface FilterToolbarProps {
  filters: FilterGroup[];
  onFilterChange?: (filterId: string, selectedValues: string[]) => void;
  className?: string;
}

export function FilterToolbar({ filters, onFilterChange, className }: FilterToolbarProps) {
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const handleFilterSelect = (filterId: string, optionValue: string, multiSelect: boolean) => {
    setSelectedFilters((prev) => {
      const currentSelected = prev[filterId] || [];
      let newSelected: string[];

      if (multiSelect) {
        // Toggle selection for multi-select
        newSelected = currentSelected.includes(optionValue)
          ? currentSelected.filter((v) => v !== optionValue)
          : [...currentSelected, optionValue];
      } else {
        // Single select
        newSelected = currentSelected.includes(optionValue) ? [] : [optionValue];
        setOpenDropdown(null);
      }

      const result = { ...prev, [filterId]: newSelected };
      onFilterChange?.(filterId, newSelected);
      return result;
    });
  };

  const clearFilter = (filterId: string) => {
    setSelectedFilters((prev) => {
      const result = { ...prev, [filterId]: [] };
      onFilterChange?.(filterId, []);
      return result;
    });
  };

  const clearAllFilters = () => {
    setSelectedFilters({});
    filters.forEach((filter) => {
      onFilterChange?.(filter.id, []);
    });
  };

  const totalActiveFilters = Object.values(selectedFilters).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  return (
    <div className={cn('flex items-center gap-3 flex-wrap', className)}>
      {filters.map((filter) => {
        const isOpen = openDropdown === filter.id;
        const activeCount = selectedFilters[filter.id]?.length || 0;

        return (
          <div key={filter.id} className="relative">
            <button
              onClick={() => setOpenDropdown(isOpen ? null : filter.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                activeCount > 0
                  ? 'bg-brand-primary-400 text-white hover:bg-brand-primary-500'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              {filter.icon && (
                <span className="material-symbols-outlined text-lg">{filter.icon}</span>
              )}
              <span>{filter.label}</span>
              {activeCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs font-bold">
                  {activeCount}
                </span>
              )}
              <span className="material-symbols-outlined text-lg">
                {isOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {/* Dropdown */}
            {isOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setOpenDropdown(null)}
                />
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-card-dark rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 z-20 overflow-hidden">
                  <div className="p-2 space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
                    {filter.options.map((option) => {
                      const isSelected = selectedFilters[filter.id]?.includes(option.value);

                      return (
                        <button
                          key={option.id}
                          onClick={() =>
                            handleFilterSelect(filter.id, option.value, filter.multiSelect || false)
                          }
                          className={cn(
                            'w-full px-3 py-2 rounded-md text-sm text-left transition-colors flex items-center justify-between',
                            isSelected
                              ? 'bg-brand-primary-400/10 text-brand-primary-400 font-medium'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          )}
                        >
                          <span className="flex items-center gap-2">
                            {isSelected && (
                              <span className="material-symbols-outlined text-lg">check</span>
                            )}
                            <span>{option.label}</span>
                          </span>
                          {option.count !== undefined && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {option.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {activeCount > 0 && (
                    <div className="p-2 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => clearFilter(filter.id)}
                        className="w-full px-3 py-2 text-sm text-error hover:bg-error/10 rounded-md transition-colors font-medium"
                      >
                        Clear {filter.label}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Clear All Button */}
      {totalActiveFilters > 0 && (
        <button
          onClick={clearAllFilters}
          className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-error transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-lg">close</span>
          Clear All ({totalActiveFilters})
        </button>
      )}

      {/* Active Filter Pills */}
      {totalActiveFilters > 0 && (
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {Object.entries(selectedFilters).map(([filterId, values]) =>
            values.map((value) => {
              const filter = filters.find((f) => f.id === filterId);
              const option = filter?.options.find((o) => o.value === value);
              if (!option) return null;

              return (
                <button
                  key={`${filterId}-${value}`}
                  onClick={() => handleFilterSelect(filterId, value, filter?.multiSelect || false)}
                  className="inline-flex"
                >
                  <BadgeV2
                    variant="default"
                    size="sm"
                    className="cursor-pointer"
                  >
                    <span className="flex items-center gap-1">
                      {option.label}
                      <span className="material-symbols-outlined text-sm">close</span>
                    </span>
                  </BadgeV2>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
