'use client';

import * as React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import ErrorBoundary from '@/components/ErrorBoundary';

export function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopNav onMenuClick={() => setSidebarOpen(true)} />
          <EmailVerificationBanner />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
