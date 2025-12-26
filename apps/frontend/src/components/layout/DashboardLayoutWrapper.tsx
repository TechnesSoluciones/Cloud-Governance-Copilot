'use client';

import * as React from 'react';
import { SidebarV2 } from '@/components/layout/SidebarV2';
import { HeaderV2 } from '@/components/layout/HeaderV2';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import ErrorBoundary from '@/components/ErrorBoundary';

export function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <div className="h-screen flex overflow-hidden bg-bg-light dark:bg-bg-dark">
        {/* Sidebar V2 - CloudNexus Design System */}
        <SidebarV2 />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header V2 with Cloud Filters and Search */}
          <HeaderV2 />

          {/* Email Verification Banner (if needed) */}
          <EmailVerificationBanner />

          {/* Scrollable Content Area - No padding, pages handle their own layout */}
          <main className="flex-1 overflow-y-auto custom-scrollbar bg-bg-light dark:bg-bg-dark">
            {children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
