'use client';

import * as React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProviderLogo, providerGradients, providerNames } from './ProviderLogo';
import { StatusBadge } from './StatusBadge';
import { cn } from '@/lib/utils';
import { CloudProvider } from '@/config/features';

/* TEMPORALMENTE DESHABILITADO - Azure-only mode (2025-12-31)
 * Tipo original multi-cloud:
 * export type CloudProvider = 'AWS' | 'AZURE' | 'GCP';
 *
 * Ahora importamos desde features.ts que solo incluye 'azure'
 */

export interface CloudAccount {
  id: string;
  name: string;
  provider: CloudProvider;
  status: 'active' | 'inactive' | 'error';
  region?: string;
  tenantId: string;
  createdAt: string;
  lastSyncAt?: string;
}

export interface AccountCardProps {
  account: CloudAccount;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  onSync?: () => void;
}

/**
 * Format relative time (e.g., "30m ago", "2h ago", "1d ago")
 */
const formatRelativeTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

/**
 * Metric display component for consistent styling
 */
const MetricItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  className?: string;
}> = ({ icon, label, value, className }) => (
  <div className={cn('flex items-center gap-3', className)}>
    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <div className="text-sm font-semibold text-foreground mt-0.5">{value}</div>
    </div>
  </div>
);

/**
 * Premium AccountCard component with enhanced visual design
 * Features:
 * - Large provider logos with gradients
 * - Visual metrics grid
 * - Status badges with icons
 * - Quick action buttons
 * - Smooth hover effects
 * - Accessible markup
 */
export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onEdit,
  onDelete,
  onTest,
  onSync,
}) => {
  return (
    <Card
      className={cn(
        'group relative overflow-hidden',
        'transition-all duration-300 ease-out',
        'hover:shadow-xl hover:-translate-y-1',
        'border-2 hover:border-brand-orange/20'
      )}
    >
      {/* Header with Logo and Actions */}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          {/* Provider Logo with Gradient Background */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div
              className={cn(
                'flex-shrink-0 p-4 rounded-2xl',
                'shadow-sm border border-gray-100',
                'transition-transform duration-300 group-hover:scale-105',
                providerGradients[account.provider]
              )}
            >
              <ProviderLogo provider={account.provider} size={56} />
            </div>

            {/* Account Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-foreground truncate">
                {account.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {providerNames[account.provider]}
              </p>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0 h-9 w-9 p-0 hover:bg-gray-100"
                aria-label="Account actions menu"
              >
                <svg
                  className="h-5 w-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onSync && (
                <DropdownMenuItem onClick={onSync}>
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Sync now
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onTest}>
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Test connection
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Metrics Grid */}
      <CardContent className="space-y-4 pb-4">
        <MetricItem
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
              />
            </svg>
          }
          label="Status"
          value={<StatusBadge status={account.status} />}
        />

        {account.lastSyncAt && (
          <MetricItem
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            label="Last Sync"
            value={
              <time dateTime={account.lastSyncAt} className="text-gray-700">
                {formatRelativeTime(account.lastSyncAt)}
              </time>
            }
          />
        )}
      </CardContent>

      {/* Quick Actions Footer */}
      <CardFooter className="pt-4 border-t bg-gray-50/50">
        <div className="flex gap-2 w-full">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 hover:bg-white hover:border-brand-orange/50"
            onClick={onTest}
          >
            <svg
              className="h-4 w-4 mr-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Test
          </Button>
          {onSync && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 hover:bg-white hover:border-brand-orange/50"
              onClick={onSync}
            >
              <svg
                className="h-4 w-4 mr-1.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Sync
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};
