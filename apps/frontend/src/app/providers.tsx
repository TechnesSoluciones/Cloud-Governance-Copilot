'use client';

import { SessionProvider } from '@/components/providers/SessionProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { ToastProviderLazy } from '@/components/providers/ToastProviderLazy';
import { FeatureFlagsProvider } from '@/providers/feature-flags-provider';
import { FeatureFlagsPanel } from '@/components/shared/feature-flags-panel';
import { CloudProviderFilterProvider } from '@/providers/CloudProviderFilterContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <SessionProvider>
        <CloudProviderFilterProvider>
          <FeatureFlagsProvider>
            <ToastProviderLazy>
              {children}
              <FeatureFlagsPanel />
            </ToastProviderLazy>
          </FeatureFlagsProvider>
        </CloudProviderFilterProvider>
      </SessionProvider>
    </QueryProvider>
  );
}
