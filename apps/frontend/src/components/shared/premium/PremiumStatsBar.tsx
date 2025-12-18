/**
 * PremiumStatsBar Component
 * Horizontal bar displaying 3-4 key metrics
 * Uses PremiumStatCard for consistent card styling
 */

import * as React from 'react';
import { PremiumStatCard } from './PremiumStatCard';

export interface StatConfig {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string; // Tailwind class like "bg-orange-100"
  iconColor: string; // Tailwind class like "text-orange-600"
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
  subtitle?: string;
}

export interface PremiumStatsBarProps {
  stats: StatConfig[];
  className?: string;
}

export const PremiumStatsBar: React.FC<PremiumStatsBarProps> = ({
  stats,
  className = '',
}) => {
  // Determine grid columns based on number of stats
  const getGridCols = () => {
    if (stats.length === 2) return 'md:grid-cols-2';
    if (stats.length === 3) return 'md:grid-cols-3';
    if (stats.length === 4) return 'md:grid-cols-2 lg:grid-cols-4';
    return 'md:grid-cols-3'; // default
  };

  return (
    <div className={`grid gap-6 grid-cols-1 ${getGridCols()} ${className}`}>
      {stats.map((stat, index) => (
        <PremiumStatCard
          key={`${stat.label}-${index}`}
          title={stat.label}
          value={stat.value}
          icon={stat.icon}
          iconBgGradient={stat.iconBg}
          iconColor={stat.iconColor}
          trend={stat.trend}
          subtitle={stat.subtitle}
        />
      ))}
    </div>
  );
};
