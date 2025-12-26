'use client';

import { SessionProvider } from '@/components/providers/SessionProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { ToastProviderLazy } from '@/components/providers/ToastProviderLazy';
import { FeatureFlagsProvider } from '@/providers/feature-flags-provider';
import { FeatureFlagsPanel } from '@/components/shared/feature-flags-panel';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <SessionProvider>
        <FeatureFlagsProvider>
          <ToastProviderLazy>
            {children}
            <FeatureFlagsPanel />
          </ToastProviderLazy>
        </FeatureFlagsProvider>
      </SessionProvider>
    </QueryProvider>
  );
}
