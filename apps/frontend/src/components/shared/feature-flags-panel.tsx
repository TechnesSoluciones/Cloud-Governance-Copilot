/**
 * Feature Flags Admin Panel
 *
 * Development tool to toggle feature flags at runtime
 * Only visible in development mode or for admin users
 */

'use client';

import { useState } from 'react';
import { useAllFeatureFlags, useUpdateFeatureFlag } from '@/hooks/use-feature-flag';
import type { FeatureFlags } from '@/lib/feature-flags';
import { FEATURE_FLAG_PHASES } from '@/lib/feature-flags';

export function FeatureFlagsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const flags = useAllFeatureFlags();
  const updateFlag = useUpdateFeatureFlag();

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const handleToggle = (flagName: keyof FeatureFlags) => {
    const currentValue = flags[flagName];
    const newValue = typeof currentValue === 'boolean' ? !currentValue : true;
    updateFlag(flagName, newValue);
  };

  const applyPhase = (phaseKey: keyof typeof FEATURE_FLAG_PHASES) => {
    const phase = FEATURE_FLAG_PHASES[phaseKey];
    if ('flags' in phase) {
      Object.entries(phase.flags).forEach(([key, value]) => {
        updateFlag(key as keyof FeatureFlags, value);
      });
    }
  };

  return (
    <>
      {/* Toggle Button - Fixed Bottom Right */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-[9999] bg-brand-primary-400 hover:bg-brand-primary-500 text-white rounded-full p-3 shadow-lg transition-all"
        title="Feature Flags Panel (Dev Only)"
      >
        <span className="material-symbols-outlined text-2xl">flag</span>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-[9999] bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl w-96 max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-brand-primary-400">flag</span>
                Feature Flags
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Development Only - Toggle features for testing
            </p>
          </div>

          {/* Phase Quick Actions */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
              Quick Apply Phase:
            </p>
            <div className="flex flex-wrap gap-1">
              {Object.keys(FEATURE_FLAG_PHASES).map((phaseKey) => {
                const phase = FEATURE_FLAG_PHASES[phaseKey as keyof typeof FEATURE_FLAG_PHASES];
                return (
                  <button
                    key={phaseKey}
                    onClick={() => applyPhase(phaseKey as keyof typeof FEATURE_FLAG_PHASES)}
                    className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 hover:bg-brand-primary-400 hover:text-white rounded transition-colors"
                    title={`${phase.name} (Weeks ${phase.weeks})`}
                  >
                    {phaseKey.replace('PHASE_', 'P')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Flags List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
            {Object.entries(flags).map(([key, value]) => {
              const isBoolean = typeof value === 'boolean';
              const isEnabled = isBoolean ? value : value > 0;

              return (
                <div
                  key={key}
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                      {key}
                    </p>
                    {!isBoolean && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Rollout: {Math.round((value as number) * 100)}%
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggle(key as keyof FeatureFlags)}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      ${isEnabled ? 'bg-brand-primary-400' : 'bg-slate-300 dark:bg-slate-600'}
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${isEnabled ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              Changes are saved to localStorage
            </p>
          </div>
        </div>
      )}
    </>
  );
}
