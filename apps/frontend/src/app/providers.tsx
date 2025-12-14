'use client';

import { SessionProvider } from '@/components/providers/SessionProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { ToastProviderLazy } from '@/components/providers/ToastProviderLazy';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <SessionProvider>
        <ToastProviderLazy>{children}</ToastProviderLazy>
      </SessionProvider>
    </QueryProvider>
  );
}
