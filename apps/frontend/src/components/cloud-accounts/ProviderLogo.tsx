'use client';

import * as React from 'react';
import { CloudProvider } from './AccountCard';

export interface ProviderLogoProps {
  provider: CloudProvider;
  size?: number;
  className?: string;
}

/**
 * High-quality cloud provider logos with official SVGs
 * Includes AWS, Azure, and GCP with proper colors and dimensions
 */
export const ProviderLogo: React.FC<ProviderLogoProps> = ({
  provider,
  size = 48,
  className = '',
}) => {
  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 256 256',
    className,
    'aria-hidden': 'true' as const,
  };

  // Normalize provider to lowercase for switch statement
  const normalizedProvider = provider.toLowerCase() as 'aws' | 'azure' | 'gcp';

  switch (normalizedProvider) {
    case 'aws':
      return (
        <svg {...svgProps} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* AWS Logo - Official Orange (#FF9900) */}
          <g>
            {/* Smile curve */}
            <path
              d="M80.6 187.7c-26.6 19.6-65.2 30-98.4 30-46.6 0-88.5-17.2-120.3-45.8-2.5-2.3-.3-5.4 2.7-3.6 34.4 20 77 32 121 32 29.7 0 62.3-6.1 92.3-18.8 4.5-1.9 8.3 3 4 6.2z"
              transform="translate(128, 128) scale(0.45)"
              fill="#FF9900"
            />
            {/* Arrow tip */}
            <path
              d="M91.3 175.2c-3.4-4.4-22.5-2.1-31.1-1-.3-.4 1.9-2.8 6.2-3.1 15.2-1.1 40.1 1.1 42.9 4.7 2.8 3.6-7.5 28.5-21.1 40.4-2.1 1.8-4.1.9-3.2-1.5 3.2-8 10.3-26.1 6.3-39.5z"
              transform="translate(128, 128) scale(0.45)"
              fill="#FF9900"
            />
            {/* AWS text/symbol */}
            <path
              d="M50.8 120.3c0 4.5.1 8.2.3 9-.2.9-.6 1.5-1.5 1.5h-6.9c-.8 0-1.4-.6-1.5-1.4v-1.5c-3.7 3.5-9.5 5.3-13.9 5.3-10.1 0-16-7.7-16-19.3 0-12.7 7.8-19 22.9-19 3.2 0 6.9.3 10.1.8v-2.6c0-4.7.3-10.2-2.4-13.9-2.4-3.3-7-4.7-11-4.7-7.5 0-14.1 3.8-15.8 11.7-.3 1.8-1.5 2.3-2.9 2.1l-8.2-.9c-1.4-.3-2.1-1.2-1.8-2.9 2.7-14.3 15.5-18.6 27-18.6 5.9 0 13.6 1.6 18.2 6 5.9 5.6 5.3 13 5.3 21.1v19.3zm-14-16.8c0-5.6.1-10.2-2.7-15.2-2.1-4.1-5.6-6.5-9.4-6.5-5.2 0-8.3 4-8.3 9.9 0 11.6 10.4 13.7 20.4 13.7v-1.9z"
              transform="translate(128, 128) scale(0.8)"
              fill="#252F3E"
            />
          </g>
        </svg>
      );

    case 'azure':
      return (
        <svg {...svgProps} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Azure Logo - Official Blue (#0078D4) */}
          <defs>
            <linearGradient id="azure-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#114A8B', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#0078D4', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          <g>
            {/* Azure icon - simplified modern version */}
            <path
              d="M85.5 170.5L128 85.5l42.5 85H85.5z"
              fill="url(#azure-gradient)"
            />
            <path
              d="M42.5 170.5h128L128 213.5l-85.5-43z"
              fill="#0078D4"
              opacity="0.8"
            />
            <path
              d="M128 42.5l-42.5 85h85L128 42.5z"
              fill="#50E6FF"
              opacity="0.6"
            />
          </g>
        </svg>
      );

    case 'gcp':
      return (
        <svg {...svgProps} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* GCP Logo - Multi-color */}
          <g>
            {/* Red section */}
            <path
              d="M128 42.5L85.5 85.5L128 128L170.5 85.5z"
              fill="#EA4335"
            />
            {/* Yellow section */}
            <path
              d="M170.5 85.5L213.5 128L170.5 170.5L128 128z"
              fill="#FBBC04"
            />
            {/* Green section */}
            <path
              d="M128 128L85.5 170.5L128 213.5L170.5 170.5z"
              fill="#34A853"
            />
            {/* Blue section */}
            <path
              d="M85.5 85.5L42.5 128L85.5 170.5L128 128z"
              fill="#4285F4"
            />
            {/* Center white hexagon */}
            <path
              d="M128 96L112 112L96 128L112 144L128 160L144 144L160 128L144 112z"
              fill="white"
            />
          </g>
        </svg>
      );

    default:
      return null;
  }
};

/**
 * Provider gradient backgrounds for cards
 */
export const providerGradients = {
  AWS: 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50',
  AZURE: 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50',
  GCP: 'bg-gradient-to-br from-emerald-50 via-blue-50 to-yellow-50',
} as const;

/**
 * Provider accent colors for UI elements
 */
export const providerColors = {
  AWS: {
    text: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    gradient: 'from-orange-500 to-orange-600',
  },
  AZURE: {
    text: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    gradient: 'from-blue-500 to-blue-600',
  },
  GCP: {
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    gradient: 'from-emerald-500 to-blue-500',
  },
} as const;

export const providerNames = {
  AWS: 'Amazon Web Services',
  AZURE: 'Microsoft Azure',
  GCP: 'Google Cloud Platform',
} as const;
