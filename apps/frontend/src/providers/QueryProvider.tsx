'use client';

/**
 * React Query Provider
 * Wraps the application with QueryClient for data fetching, caching, and synchronization
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, ReactNode } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create QueryClient instance with default options
  // Use useState to ensure client is created only once per component mount
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data remains fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Cached data persists for 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry failed requests twice
            retry: 2,
            // Exponential backoff for retries
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Refetch on window focus (good for cost data that changes frequently)
            refetchOnWindowFocus: true,
            // Don't refetch on mount if data is still fresh
            refetchOnMount: false,
            // Refetch on reconnect
            refetchOnReconnect: true,
          },
          mutations: {
            // Retry mutations once
            retry: 1,
            // Exponential backoff
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query DevTools - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom"
        />
      )}
    </QueryClientProvider>
  );
}
