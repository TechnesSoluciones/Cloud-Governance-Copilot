/**
 * useFeatureFlag Hook
 *
 * React hook to check if a feature flag is enabled
 *
 * Usage:
 * ```tsx
 * const isDashboardV2Enabled = useFeatureFlag('dashboardV2');
 *
 * return isDashboardV2Enabled ? <DashboardV2 /> : <DashboardLegacy />;
 * ```
 */

import { useContext } from 'react';
import { FeatureFlagsContext } from '@/providers/feature-flags-provider';
import type { FeatureFlags } from '@/lib/feature-flags';

export function useFeatureFlag(flagName: keyof FeatureFlags): boolean {
  const context = useContext(FeatureFlagsContext);

  if (!context) {
    throw new Error('useFeatureFlag must be used within FeatureFlagsProvider');
  }

  return context.isEnabled(flagName);
}

/**
 * useAllFeatureFlags Hook
 *
 * Returns all feature flags and their current state
 *
 * Usage:
 * ```tsx
 * const flags = useAllFeatureFlags();
 * console.log(flags); // { dashboardV2: true, ... }
 * ```
 */
export function useAllFeatureFlags(): FeatureFlags {
  const context = useContext(FeatureFlagsContext);

  if (!context) {
    throw new Error('useAllFeatureFlags must be used within FeatureFlagsProvider');
  }

  return context.flags;
}

/**
 * useUpdateFeatureFlag Hook
 *
 * Returns a function to update feature flags at runtime (for testing/admin)
 *
 * Usage:
 * ```tsx
 * const updateFlag = useUpdateFeatureFlag();
 * updateFlag('dashboardV2', true); // Enable dashboard V2
 * ```
 */
export function useUpdateFeatureFlag() {
  const context = useContext(FeatureFlagsContext);

  if (!context) {
    throw new Error('useUpdateFeatureFlag must be used within FeatureFlagsProvider');
  }

  return context.updateFlag;
}
