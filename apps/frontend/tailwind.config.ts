import type { Config } from 'tailwindcss';

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
      // Cloud Copilot Design System Colors
      colors: {
        // Shadcn/UI compatibility (preserved)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
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

        // Cloud Copilot Design System - Primary Orange
        'brand-orange': {
          DEFAULT: '#ff6b35',
          dark: '#e65525',
          light: '#ff8556',
          accent: '#ff9770',
        },

        // Cloud Copilot Design System - Secondary Blues
        'cloud-blue': {
          DEFAULT: '#0078d4', // Azure blue
          light: '#50e6ff',
        },

        // Cloud Copilot Design System - Status Colors
        success: {
          DEFAULT: '#34a853', // GCP green
          foreground: '#ffffff',
        },
        error: {
          DEFAULT: '#dc2626',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#f59e0b',
          foreground: '#ffffff',
        },
        info: {
          DEFAULT: '#3b82f6',
          foreground: '#ffffff',
        },

        // Cloud Copilot Design System - Neutral Grays
        gray: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#eeeeee',
          300: '#e0e0e0',
          400: '#bdbdbd',
          500: '#9e9e9e',
          600: '#757575',
          700: '#616161',
          800: '#424242',
          900: '#232f3e', // AWS dark
        },
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

      // Cloud Copilot Design System - Typography
      fontFamily: {
        sans: [
          'Segoe UI',
          '-apple-system',
          'BlinkMacSystemFont',
          'Google Sans',
          'system-ui',
          'sans-serif',
        ],
        mono: ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      },

      fontSize: {
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.6' }],
        md: ['16px', { lineHeight: '1.6' }],
        lg: ['18px', { lineHeight: '1.6' }],
        xl: ['20px', { lineHeight: '1.5' }],
        '2xl': ['24px', { lineHeight: '1.4' }],
        '3xl': ['32px', { lineHeight: '1.3' }],
        '4xl': ['40px', { lineHeight: '1.2' }],
        '5xl': ['56px', { lineHeight: '1.1' }],
      },

      fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
      },

      // Cloud Copilot Design System - Letter Spacing
      letterSpacing: {
        tighter: '-0.02em',
        tight: '-0.01em',
        normal: '0',
        wide: '0.05em',
        wider: '0.1em',
        widest: '0.15em',
      },

      // Cloud Copilot Design System - Responsive Breakpoints
      screens: {
        xs: '320px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
        '3xl': '1920px',
      },

      // Cloud Copilot Design System - Animation
      transitionTimingFunction: {
        'default': 'cubic-bezier(0.4, 0, 0.2, 1)', // Material standard
        'in': 'cubic-bezier(0.4, 0, 1, 1)',
        'out': 'cubic-bezier(0, 0, 0.2, 1)',
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
      },

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
