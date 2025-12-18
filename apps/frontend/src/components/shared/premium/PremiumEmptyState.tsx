/**
 * Premium Empty State Component
 *
 * Reusable empty state component with consistent design across all dashboard pages.
 * Supports multiple variants for different scenarios.
 */

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

export interface PremiumEmptyStateProps {
  /** Icon to display */
  icon: LucideIcon;
  /** Main title */
  title: string;
  /** Description text */
  description: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline';
  };
  /** Icon gradient background */
  iconGradient?: string;
  /** Icon color */
  iconColor?: string;
  /** Show as compact version (no card wrapper) */
  compact?: boolean;
}

/**
 * Premium Empty State Component
 *
 * @example
 * ```tsx
 * <PremiumEmptyState
 *   icon={Server}
 *   title="No Cloud Accounts"
 *   description="Connect your first cloud account to start monitoring."
 *   action={{
 *     label: "Add Cloud Account",
 *     onClick: () => router.push('/cloud-accounts/new')
 *   }}
 *   iconGradient="bg-gradient-to-br from-orange-50 to-orange-100"
 *   iconColor="text-orange-600"
 * />
 * ```
 */
export function PremiumEmptyState({
  icon: Icon,
  title,
  description,
  action,
  iconGradient = 'bg-gradient-to-br from-gray-50 to-gray-100',
  iconColor = 'text-gray-400',
  compact = false,
}: PremiumEmptyStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {/* Icon Container */}
      <div
        className={`
          h-24 w-24 rounded-full flex items-center justify-center mb-6
          ${iconGradient}
          transition-transform duration-300 ease-out
          hover:scale-110
        `}
      >
        <Icon className={`h-12 w-12 ${iconColor}`} aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto space-y-3">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <p className="text-base text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>

      {/* Action Button */}
      {action && (
        <Button
          size="lg"
          variant={action.variant || 'default'}
          onClick={action.onClick}
          className="mt-6 shadow-lg"
        >
          {action.label}
        </Button>
      )}
    </div>
  );

  if (compact) {
    return content;
  }

  return (
    <Card className="border-2 border-gray-100 hover:border-gray-200 transition-colors">
      {content}
    </Card>
  );
}

/**
 * Pre-configured empty state variants for common scenarios
 */
export const EmptyStateVariants = {
  /** No cloud accounts connected */
  noCloudAccounts: (onAddAccount: () => void) => ({
    icon: require('lucide-react').Server,
    title: 'No Cloud Accounts Connected',
    description:
      'Connect your first cloud account to start monitoring your cloud infrastructure and resources.',
    action: {
      label: 'Add Cloud Account',
      onClick: onAddAccount,
    },
    iconGradient: 'bg-gradient-to-br from-orange-50 to-orange-100',
    iconColor: 'text-orange-600',
  }),

  /** No data for selected period */
  noData: () => ({
    icon: require('lucide-react').FileText,
    title: 'No Data Available',
    description:
      'There is no data available for the selected period. Try selecting a different date range or filter.',
    iconGradient: 'bg-gradient-to-br from-gray-50 to-gray-100',
    iconColor: 'text-gray-400',
  }),

  /** No resources found */
  noResources: () => ({
    icon: require('lucide-react').Database,
    title: 'No Resources Found',
    description:
      'No resources match your current filters. Try adjusting your search criteria or filters.',
    iconGradient: 'bg-gradient-to-br from-blue-50 to-blue-100',
    iconColor: 'text-blue-600',
  }),

  /** No incidents */
  noIncidents: () => ({
    icon: require('lucide-react').CheckCircle,
    title: 'No Incidents',
    description:
      'Great news! There are no active incidents at the moment. Your infrastructure is running smoothly.',
    iconGradient: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
    iconColor: 'text-emerald-600',
  }),

  /** No recommendations */
  noRecommendations: () => ({
    icon: require('lucide-react').Lightbulb,
    title: 'No Recommendations',
    description:
      'You\'re all caught up! There are no active recommendations at this time.',
    iconGradient: 'bg-gradient-to-br from-amber-50 to-amber-100',
    iconColor: 'text-amber-600',
  }),

  /** Feature coming soon */
  comingSoon: (featureName: string) => ({
    icon: require('lucide-react').Rocket,
    title: `${featureName} Coming Soon`,
    description:
      'This feature is currently under development and will be available in a future update.',
    iconGradient: 'bg-gradient-to-br from-purple-50 to-purple-100',
    iconColor: 'text-purple-600',
  }),
};
