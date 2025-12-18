/**
 * Premium Design System Tokens
 * Centralized design tokens for consistent premium UI across the dashboard
 */

export const PREMIUM_GRADIENTS = {
  // Page backgrounds
  page: 'bg-gradient-to-br from-gray-50 via-orange-50/20 to-gray-50',

  // Provider-specific gradients
  aws: 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50',
  azure: 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50',
  gcp: 'bg-gradient-to-br from-emerald-50 via-blue-50 to-yellow-50',

  // Semantic gradients for status/severity
  success: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
  warning: 'bg-gradient-to-br from-amber-50 to-amber-100',
  error: 'bg-gradient-to-br from-red-50 to-red-100',
  info: 'bg-gradient-to-br from-blue-50 to-blue-100',

  // Text gradients
  heading: 'bg-gradient-to-r from-gray-900 via-orange-800 to-gray-900 bg-clip-text text-transparent',
  brandAccent: 'bg-gradient-to-r from-brand-orange to-brand-orange-dark bg-clip-text text-transparent',
} as const;

export const PREMIUM_SHADOWS = {
  card: 'shadow-sm hover:shadow-xl',
  cardResting: 'shadow-sm',
  cardHover: 'shadow-xl',
  modal: 'shadow-2xl',
  dropdown: 'shadow-lg',
} as const;

export const PREMIUM_TRANSITIONS = {
  card: 'transition-all duration-300 ease-out',
  fast: 'transition-colors duration-200',
  normal: 'transition-all duration-200',
  slow: 'transition-all duration-500',
} as const;

export const PREMIUM_HOVER_EFFECTS = {
  card: 'hover:shadow-xl hover:-translate-y-1 hover:border-orange-400/20',
  button: 'hover:scale-105 transition-transform duration-200',
  interactive: 'hover:bg-gray-50 transition-colors duration-200',
} as const;

export const PREMIUM_ICON_COLORS = {
  aws: 'text-orange-600',
  azure: 'text-blue-600',
  gcp: 'text-blue-600',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  error: 'text-red-600',
  info: 'text-blue-600',
  default: 'text-gray-600',
} as const;

export const PREMIUM_ICON_BACKGROUNDS = {
  aws: 'bg-orange-100',
  azure: 'bg-blue-100',
  gcp: 'bg-blue-100',
  success: 'bg-emerald-100',
  warning: 'bg-amber-100',
  error: 'bg-red-100',
  info: 'bg-blue-100',
  default: 'bg-gray-100',
} as const;
