/**
 * Feature Flags Provider
 *
 * Provides feature flags to the entire application
 * Supports runtime updates and local storage persistence
 */

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  type FeatureFlags,
  type FeatureFlag,
  getFeatureFlags,
  isFeatureEnabled,
} from '@/lib/feature-flags';
import { useSession } from 'next-auth/react';

interface FeatureFlagsContextValue {
  flags: FeatureFlags;
  isEnabled: (flagName: keyof FeatureFlags) => boolean;
  updateFlag: (flagName: keyof FeatureFlags, value: FeatureFlag) => void;
  resetFlags: () => void;
}

export const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

const LOCAL_STORAGE_KEY = 'cloud-copilot-feature-flags';

interface FeatureFlagsProviderProps {
  children: React.ReactNode;
  initialFlags?: Partial<FeatureFlags>;
}

export function FeatureFlagsProvider({ children, initialFlags }: FeatureFlagsProviderProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // Initialize flags from multiple sources (priority order):
  // 1. Initial props (highest)
  // 2. Local storage (for dev/testing)
  // 3. Environment variables
  // 4. Default flags (lowest)
  const [flags, setFlags] = useState<FeatureFlags>(() => {
    const defaultFlags = getFeatureFlags();

    // Try to load from localStorage in browser
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const storedFlags = JSON.parse(stored);
          return { ...defaultFlags, ...storedFlags, ...initialFlags };
        }
      } catch (error) {
        console.warn('Failed to load feature flags from localStorage:', error);
      }
    }

    return { ...defaultFlags, ...initialFlags };
  });

  // Persist flags to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flags));
      } catch (error) {
        console.warn('Failed to save feature flags to localStorage:', error);
      }
    }
  }, [flags]);

  // Check if a feature is enabled (handles percentage-based rollout)
  const isEnabled = useCallback(
    (flagName: keyof FeatureFlags): boolean => {
      const flag = flags[flagName];
      return isFeatureEnabled(flag, userId);
    },
    [flags, userId]
  );

  // Update a single feature flag
  const updateFlag = useCallback((flagName: keyof FeatureFlags, value: FeatureFlag) => {
    setFlags((prev) => ({
      ...prev,
      [flagName]: value,
    }));
  }, []);

  // Reset all flags to default
  const resetFlags = useCallback(() => {
    const defaultFlags = getFeatureFlags();
    setFlags(defaultFlags);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, []);

  const value = useMemo(
    () => ({
      flags,
      isEnabled,
      updateFlag,
      resetFlags,
    }),
    [flags, isEnabled, updateFlag, resetFlags]
  );

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

/**
 * Feature Flag Component
 *
 * Conditionally render children based on feature flag
 *
 * Usage:
 * ```tsx
 * <FeatureFlag name="dashboardV2" fallback={<DashboardLegacy />}>
 *   <DashboardV2 />
 * </FeatureFlag>
 * ```
 */
interface FeatureFlagProps {
  name: keyof FeatureFlags;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureFlag({ name, children, fallback = null }: FeatureFlagProps) {
  const context = useContext(FeatureFlagsContext);

  if (!context) {
    throw new Error('FeatureFlag must be used within FeatureFlagsProvider');
  }

  return context.isEnabled(name) ? <>{children}</> : <>{fallback}</>;
}
