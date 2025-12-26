/**
 * Dashboard Layout V2 Component
 * CloudNexus Design System
 *
 * Features:
 * - Integrates Sidebar V2 and Header V2
 * - Responsive layout
 * - Scrollable main content area
 * - Feature flag controlled
 */

'use client';

import { ReactNode } from 'react';
import { SidebarV2 } from './SidebarV2';
import { HeaderV2 } from './HeaderV2';
import { cn } from '@/lib/utils';

interface DashboardLayoutV2Props {
  children: ReactNode;
  className?: string;
}

export function DashboardLayoutV2({ children, className }: DashboardLayoutV2Props) {
  return (
    <div className="h-screen flex overflow-hidden bg-bg-light dark:bg-bg-dark">
      {/* Sidebar */}
      <SidebarV2 />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <HeaderV2 />

        {/* Scrollable Content */}
        <main
          className={cn(
            'flex-1 overflow-y-auto custom-scrollbar',
            'bg-bg-light dark:bg-bg-dark',
            className
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
