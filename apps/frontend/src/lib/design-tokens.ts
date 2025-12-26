/**
 * Cloud Copilot Design System V2
 * Design Tokens - Single source of truth for all design values
 * Based on the new CloudNexus design (Dec 2025)
 */

export const designTokens = {
  /**
   * Colors
   * Primary brand color: Orange (#f2780d)
   */
  colors: {
    // Primary Brand - Orange
    primary: {
      DEFAULT: '#f2780d',
      50: '#fef6ee',
      100: '#fde9d6',
      200: '#fad0ac',
      300: '#f7ad77',
      400: '#f2780d', // Main
      500: '#ef6b0a',
      600: '#d96a0b',
      700: '#b34e09',
      800: '#903f0e',
      900: '#74360f',
      950: '#3e1904',
    },

    // Cloud Provider Colors
    aws: '#FF9900',
    azure: '#0078D4',
    gcp: '#4285F4',

    // Status Colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Background
    background: {
      light: '#f8f7f5',
      dark: '#221810',
    },

    // Cards
    card: {
      light: '#ffffff',
      dark: '#2d241e',
    },

    // Azure-inspired gray
    azureGray: '#f0f2f5',

    // Neutral Grays (Extended)
    slate: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },
  },

  /**
   * Typography
   * Font Family: Inter (Google Fonts)
   */
  typography: {
    fontFamily: {
      display: ['Inter', 'sans-serif'] as string[],
      body: ['Inter', 'sans-serif'] as string[],
      mono: ['Consolas', 'Monaco', 'Courier New', 'monospace'] as string[],
    },

    fontSize: {
      xs: ['12px', { lineHeight: '16px' }] as [string, { lineHeight: string }],
      sm: ['14px', { lineHeight: '20px' }] as [string, { lineHeight: string }],
      base: ['16px', { lineHeight: '24px' }] as [string, { lineHeight: string }],
      lg: ['18px', { lineHeight: '28px' }] as [string, { lineHeight: string }],
      xl: ['20px', { lineHeight: '28px' }] as [string, { lineHeight: string }],
      '2xl': ['24px', { lineHeight: '32px' }] as [string, { lineHeight: string }],
      '3xl': ['30px', { lineHeight: '36px' }] as [string, { lineHeight: string }],
      '4xl': ['36px', { lineHeight: '40px' }] as [string, { lineHeight: string }],
      '5xl': ['48px', { lineHeight: '1' }] as [string, { lineHeight: string }],
    },

    fontWeight: {
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },

    letterSpacing: {
      tighter: '-0.02em',
      tight: '-0.01em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
  },

  /**
   * Spacing
   * Base unit: 4px
   */
  spacing: {
    0: '0px',
    px: '1px',
    0.5: '2px',
    1: '4px',
    1.5: '6px',
    2: '8px',
    2.5: '10px',
    3: '12px',
    3.5: '14px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '28px',
    8: '32px',
    9: '36px',
    10: '40px',
    11: '44px',
    12: '48px',
    14: '56px',
    16: '64px',
    20: '80px',
    24: '96px',
    28: '112px',
    32: '128px',
  },

  /**
   * Border Radius
   */
  borderRadius: {
    none: '0px',
    sm: '0.125rem', // 2px
    DEFAULT: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
    '2xl': '1rem', // 16px
    '3xl': '1.5rem', // 24px
    full: '9999px',
  },

  /**
   * Shadows
   */
  boxShadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
    none: 'none',
  },

  /**
   * Breakpoints (Responsive)
   */
  screens: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1440px',
    '3xl': '1920px',
  },

  /**
   * Z-Index Scale
   */
  zIndex: {
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50',
    auto: 'auto',
    dropdown: '1000',
    sticky: '1020',
    fixed: '1030',
    modalBackdrop: '1040',
    modal: '1050',
    popover: '1060',
    tooltip: '1070',
  },

  /**
   * Animation Durations
   */
  transitionDuration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  /**
   * Animation Timing Functions
   */
  transitionTimingFunction: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  /**
   * Layout Dimensions
   */
  layout: {
    sidebarWidth: '256px', // 64 * 4px = 256px (w-64)
    headerHeight: '64px', // 16 * 4px = 64px (h-16)
    maxContentWidth: '1440px',
  },
} as const;

/**
 * Type exports for TypeScript
 */
export type DesignTokens = typeof designTokens;
export type ColorTokens = typeof designTokens.colors;
export type TypographyTokens = typeof designTokens.typography;
export type SpacingTokens = typeof designTokens.spacing;
