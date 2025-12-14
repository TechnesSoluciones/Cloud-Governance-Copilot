/**
 * Date Range Selector Component
 * Provides preset and custom date range selection for cost analysis
 *
 * Features:
 * - Preset date ranges (Last 7/30/90 days, This month, Last month)
 * - Custom date range with date picker
 * - Validation for date ranges
 * - Accessible keyboard navigation
 * - Responsive design
 * - Visual feedback for selected range
 */

'use client';

import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Check } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DatePreset {
  label: string;
  getValue: () => { start: Date; end: Date };
}

export interface DateRangeSelectorProps {
  value: { start: Date; end: Date };
  onChange: (range: { start: Date; end: Date }) => void;
  presets?: DatePreset[];
  minDate?: Date;
  maxDate?: Date;
  showCustomRange?: boolean;
}

/**
 * Default preset ranges
 */
const DEFAULT_PRESETS: DatePreset[] = [
  {
    label: 'Last 7 Days',
    getValue: () => ({
      start: subDays(new Date(), 7),
      end: new Date(),
    }),
  },
  {
    label: 'Last 30 Days',
    getValue: () => ({
      start: subDays(new Date(), 30),
      end: new Date(),
    }),
  },
  {
    label: 'Last 90 Days',
    getValue: () => ({
      start: subDays(new Date(), 90),
      end: new Date(),
    }),
  },
  {
    label: 'This Month',
    getValue: () => ({
      start: startOfMonth(new Date()),
      end: new Date(),
    }),
  },
  {
    label: 'Last Month',
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      };
    },
  },
];

/**
 * Check if two date ranges are equal
 */
function isRangeEqual(range1: { start: Date; end: Date }, range2: { start: Date; end: Date }): boolean {
  return (
    format(range1.start, 'yyyy-MM-dd') === format(range2.start, 'yyyy-MM-dd') &&
    format(range1.end, 'yyyy-MM-dd') === format(range2.end, 'yyyy-MM-dd')
  );
}

/**
 * Date Range Selector Component
 */
export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  minDate,
  maxDate = new Date(),
  showCustomRange = true,
}) => {
  const [isCustom, setIsCustom] = useState(false);
  const [customStart, setCustomStart] = useState(format(value.start, 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(value.end, 'yyyy-MM-dd'));
  const [error, setError] = useState<string | null>(null);

  // Find active preset
  const activePreset = presets.find((preset) => {
    const presetRange = preset.getValue();
    return isRangeEqual(value, presetRange);
  });

  /**
   * Handle preset selection
   */
  const handlePresetClick = (preset: DatePreset) => {
    const range = preset.getValue();
    onChange(range);
    setIsCustom(false);
    setError(null);
  };

  /**
   * Handle custom range toggle
   */
  const handleCustomToggle = () => {
    setIsCustom(!isCustom);
    setError(null);
  };

  /**
   * Validate and apply custom range
   */
  const handleApplyCustomRange = () => {
    const start = new Date(customStart);
    const end = new Date(customEnd);

    // Validation
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Invalid date format');
      return;
    }

    if (start > end) {
      setError('Start date must be before end date');
      return;
    }

    if (minDate && start < minDate) {
      setError(`Start date must be after ${format(minDate, 'MMM dd, yyyy')}`);
      return;
    }

    if (maxDate && end > maxDate) {
      setError(`End date must be before ${format(maxDate, 'MMM dd, yyyy')}`);
      return;
    }

    // Apply range
    onChange({ start, end });
    setError(null);
  };

  /**
   * Handle custom date input change
   */
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomStart(e.target.value);
    setError(null);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomEnd(e.target.value);
    setError(null);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-gray-900">Date Range</h3>
          </div>

          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const presetRange = preset.getValue();
              const isActive = activePreset?.label === preset.label;

              return (
                <Button
                  key={preset.label}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetClick(preset)}
                  className="relative"
                  aria-pressed={isActive}
                  aria-label={`Select ${preset.label}`}
                >
                  {isActive && (
                    <Check className="h-4 w-4 mr-1" aria-hidden="true" />
                  )}
                  {preset.label}
                </Button>
              );
            })}

            {/* Custom range toggle */}
            {showCustomRange && (
              <Button
                variant={isCustom ? 'default' : 'outline'}
                size="sm"
                onClick={handleCustomToggle}
                aria-pressed={isCustom}
                aria-label="Select custom date range"
              >
                {isCustom && <Check className="h-4 w-4 mr-1" aria-hidden="true" />}
                Custom
              </Button>
            )}
          </div>

          {/* Custom date range inputs */}
          {isCustom && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Start date */}
                <div className="space-y-1">
                  <label
                    htmlFor="start-date"
                    className="text-sm font-medium text-gray-700"
                  >
                    Start Date
                  </label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customStart}
                    onChange={handleStartDateChange}
                    min={minDate ? format(minDate, 'yyyy-MM-dd') : undefined}
                    max={format(maxDate, 'yyyy-MM-dd')}
                    aria-describedby={error ? 'date-error' : undefined}
                    aria-invalid={error ? 'true' : 'false'}
                  />
                </div>

                {/* End date */}
                <div className="space-y-1">
                  <label
                    htmlFor="end-date"
                    className="text-sm font-medium text-gray-700"
                  >
                    End Date
                  </label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customEnd}
                    onChange={handleEndDateChange}
                    min={customStart}
                    max={format(maxDate, 'yyyy-MM-dd')}
                    aria-describedby={error ? 'date-error' : undefined}
                    aria-invalid={error ? 'true' : 'false'}
                  />
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div
                  id="date-error"
                  className="text-sm text-red-600 flex items-center gap-2"
                  role="alert"
                >
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </div>
              )}

              {/* Apply button */}
              <Button
                onClick={handleApplyCustomRange}
                size="sm"
                className="w-full md:w-auto"
                aria-label="Apply custom date range"
              >
                Apply Custom Range
              </Button>
            </div>
          )}

          {/* Current selection display */}
          <div className="pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">Selected range:</span>{' '}
              {format(value.start, 'MMM dd, yyyy')} - {format(value.end, 'MMM dd, yyyy')}
              {' '}
              <span className="text-gray-500">
                ({Math.ceil((value.end.getTime() - value.start.getTime()) / (1000 * 60 * 60 * 24))} days)
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Compact Date Range Selector (for toolbars)
 */
export interface CompactDateRangeSelectorProps {
  value: { start: Date; end: Date };
  onChange: (range: { start: Date; end: Date }) => void;
  presets?: DatePreset[];
}

export const CompactDateRangeSelector: React.FC<CompactDateRangeSelectorProps> = ({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
}) => {
  const activePreset = presets.find((preset) => {
    const presetRange = preset.getValue();
    return isRangeEqual(value, presetRange);
  });

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar className="h-4 w-4 text-gray-500" aria-hidden="true" />
      <span className="text-sm font-medium text-gray-700">Date Range:</span>
      <div className="flex gap-2">
        {presets.map((preset) => {
          const isActive = activePreset?.label === preset.label;
          return (
            <Button
              key={preset.label}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange(preset.getValue())}
              aria-pressed={isActive}
              aria-label={`Select ${preset.label}`}
            >
              {preset.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Export preset generators for convenience
 */
export const dateRangePresets = {
  last7Days: () => ({ start: subDays(new Date(), 7), end: new Date() }),
  last30Days: () => ({ start: subDays(new Date(), 30), end: new Date() }),
  last90Days: () => ({ start: subDays(new Date(), 90), end: new Date() }),
  thisMonth: () => ({ start: startOfMonth(new Date()), end: new Date() }),
  lastMonth: () => {
    const lastMonth = subMonths(new Date(), 1);
    return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
  },
};
