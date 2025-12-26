import type { Config } from 'tailwindcss';
import { designTokens } from './src/lib/design-tokens';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      // Cloud Copilot Design System V2 - Colors
      colors: {
        // Shadcn/UI compatibility (preserved for existing components)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          ...designTokens.colors.primary,
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Design System V2 - Brand Colors
        'brand-primary': designTokens.colors.primary,

        // Design System V2 - Cloud Provider Colors
        aws: designTokens.colors.aws,
        azure: designTokens.colors.azure,
        gcp: designTokens.colors.gcp,

        // Design System V2 - Status Colors
        success: {
          DEFAULT: designTokens.colors.success,
          foreground: '#ffffff',
        },
        error: {
          DEFAULT: designTokens.colors.error,
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: designTokens.colors.warning,
          foreground: '#ffffff',
        },
        info: {
          DEFAULT: designTokens.colors.info,
          foreground: '#ffffff',
        },

        // Design System V2 - Background & Cards
        'bg-light': designTokens.colors.background.light,
        'bg-dark': designTokens.colors.background.dark,
        'card-light': designTokens.colors.card.light,
        'card-dark': designTokens.colors.card.dark,
        'azure-gray': designTokens.colors.azureGray,

        // Design System V2 - Slate Grays
        slate: designTokens.colors.slate,
      },

      // Cloud Copilot Design System - Spacing Scale (4px base unit)
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        16: '64px',
        20: '80px',
        24: '96px',
      },

      // Cloud Copilot Design System - Border Radius
      borderRadius: {
        // Shadcn/UI compatibility (preserved)
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',

        // Cloud Copilot Design System
        xs: '4px',
        DEFAULT: '8px',
        card: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
        full: '9999px',
      },

      // Cloud Copilot Design System - Shadows
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        none: 'none',
      },

      // Design System V2 - Typography
      fontFamily: {
        display: designTokens.typography.fontFamily.display,
        body: designTokens.typography.fontFamily.body,
        sans: designTokens.typography.fontFamily.display,
        mono: designTokens.typography.fontFamily.mono,
      },

      fontSize: designTokens.typography.fontSize,
      fontWeight: designTokens.typography.fontWeight,
      letterSpacing: designTokens.typography.letterSpacing,

      // Design System V2 - Responsive Breakpoints
      screens: designTokens.screens,

      // Design System V2 - Animation
      transitionTimingFunction: designTokens.transitionTimingFunction,
      transitionDuration: designTokens.transitionDuration,

      // Cloud Copilot Design System - Keyframes
      keyframes: {
        // Shadcn/UI compatibility (preserved)
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },

        // Cloud Copilot Design System animations
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },

      // Cloud Copilot Design System - Animations
      animation: {
        // Shadcn/UI compatibility (preserved)
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',

        // Cloud Copilot Design System
        'fade-in': 'fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-in-right': 'slide-in-right 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-in-left': 'slide-in-left 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      },

      // Cloud Copilot Design System - Max Width
      maxWidth: {
        container: '1440px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
