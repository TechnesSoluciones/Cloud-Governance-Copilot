/**
 * Feature Flags Configuration - Design System V2 Rollout
 *
 * This file contains all feature flags for the incremental rollout
 * of the new CloudNexus design system.
 *
 * Usage:
 * - Set to `true` to enable the new design for a feature
 * - Set to `false` to use the legacy design
 * - Use percentage values for gradual rollout (e.g., 0.1 = 10% of users)
 */

export type FeatureFlag = boolean | number;

export interface FeatureFlags {
  // Design System V2 - Global
  designSystemV2: FeatureFlag;

  // Individual Screens
  dashboardV2: FeatureFlag;
  recommendationsV2: FeatureFlag;
  connectionsV2: FeatureFlag;
  securityV2: FeatureFlag;
  costsV2: FeatureFlag;
  inventoryV2: FeatureFlag;

  // Layout Components
  sidebarV2: FeatureFlag;
  headerV2: FeatureFlag;

  // UI Components
  kpiCardsV2: FeatureFlag;
  chartsV2: FeatureFlag;
  tablesV2: FeatureFlag;

  // Features
  darkMode: FeatureFlag;
  providerFiltering: FeatureFlag;
}

/**
 * Default Feature Flags Configuration
 *
 * Phase 0 (Preparation): All flags are OFF
 * Phase 1-2 (MVP): Dashboard and Recommendations ON for testing
 * Phase 3-7 (Full Rollout): Gradually enable other screens
 */
export const defaultFeatureFlags: FeatureFlags = {
  // Phase 0: Design System V2 Preparation (OFF by default)
  designSystemV2: false,

  // Phase 1-7: Individual Screens (OFF by default, enable gradually)
  dashboardV2: false,           // Phase 2: Enable first
  recommendationsV2: false,     // Phase 3: Enable second
  connectionsV2: false,         // Phase 4
  securityV2: false,            // Phase 5
  costsV2: false,               // Phase 6
  inventoryV2: false,           // Phase 7

  // Layout Components (tied to screens)
  sidebarV2: false,
  headerV2: false,

  // UI Components (tied to screens)
  kpiCardsV2: false,
  chartsV2: false,
  tablesV2: false,

  // Core Features
  darkMode: true,               // Already available
  providerFiltering: false,     // New feature
};

/**
 * Environment-based Feature Flags Override
 * Allows overriding flags via environment variables
 */
export function getFeatureFlagsFromEnv(): Partial<FeatureFlags> {
  const overrides: Partial<FeatureFlags> = {};

  // Example: NEXT_PUBLIC_FF_DASHBOARD_V2=true
  if (typeof window !== 'undefined') {
    const envFlags = Object.keys(defaultFeatureFlags).reduce((acc, key) => {
      const envKey = `NEXT_PUBLIC_FF_${key.toUpperCase()}`;
      const envValue = process.env[envKey];

      if (envValue !== undefined) {
        // Parse boolean or number
        if (envValue === 'true') acc[key as keyof FeatureFlags] = true;
        else if (envValue === 'false') acc[key as keyof FeatureFlags] = false;
        else if (!isNaN(Number(envValue))) acc[key as keyof FeatureFlags] = Number(envValue);
      }

      return acc;
    }, {} as Partial<FeatureFlags>);

    return envFlags;
  }

  return overrides;
}

/**
 * Merge default flags with environment overrides
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    ...defaultFeatureFlags,
    ...getFeatureFlagsFromEnv(),
  };
}

/**
 * Check if a feature is enabled
 * Supports percentage-based rollout (0.0 to 1.0)
 */
export function isFeatureEnabled(flag: FeatureFlag, userId?: string): boolean {
  if (typeof flag === 'boolean') {
    return flag;
  }

  // Percentage-based rollout
  if (typeof flag === 'number') {
    if (flag === 0) return false;
    if (flag === 1) return true;

    // Use userId for consistent rollout (same user always gets same result)
    if (userId) {
      const hash = userId.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
      }, 0);
      const normalized = Math.abs(hash % 100) / 100;
      return normalized < flag;
    }

    // Random rollout if no userId
    return Math.random() < flag;
  }

  return false;
}

/**
 * Feature Flag Phases - for documentation and planning
 */
export const FEATURE_FLAG_PHASES = {
  PHASE_0: {
    name: 'Preparation',
    weeks: '1-2',
    flags: {
      designSystemV2: false,
    },
  },
  PHASE_1: {
    name: 'Components Base',
    weeks: '3-5',
    flags: {
      designSystemV2: true,
      sidebarV2: true,
      headerV2: true,
      kpiCardsV2: true,
    },
  },
  PHASE_2: {
    name: 'Dashboard (MVP)',
    weeks: '6-7',
    flags: {
      dashboardV2: true,
      chartsV2: true,
    },
  },
  PHASE_3: {
    name: 'Recommendations',
    weeks: '8-9',
    flags: {
      recommendationsV2: true,
      providerFiltering: true,
    },
  },
  PHASE_4: {
    name: 'Connections',
    weeks: '10-11',
    flags: {
      connectionsV2: true,
    },
  },
  PHASE_5: {
    name: 'Security',
    weeks: '11-12',
    flags: {
      securityV2: true,
    },
  },
  PHASE_6: {
    name: 'Costs',
    weeks: '12-13',
    flags: {
      costsV2: true,
    },
  },
  PHASE_7: {
    name: 'Inventory',
    weeks: '13-14',
    flags: {
      inventoryV2: true,
      tablesV2: true,
    },
  },
  PHASE_8: {
    name: 'Cleanup & Full Rollout',
    weeks: '14-15',
    flags: {
      // All flags set to true, legacy code removed
    },
  },
} as const;
