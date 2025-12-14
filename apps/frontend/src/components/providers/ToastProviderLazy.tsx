'use client';

import dynamic from 'next/dynamic';
import { ReactNode, createContext, useContext } from 'react';
import type { ToastVariant } from '@/components/ui/toast';

// Stub context for SSR - provides no-op functions during server rendering
interface ToastContextValue {
  toasts: any[];
  addToast: (message: string, variant: ToastVariant, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContextStub = createContext<ToastContextValue | null>(null);

export const useToastLazy = () => {
  const context = useContext(ToastContextStub);
  // Return stub during SSR, real context after hydration
  return context || {
    addToast: () => {},
    removeToast: () => {},
    toasts: [],
  };
};

// Lazy load real provider - ssr: false prevents prerendering errors
const ToastProviderDynamic = dynamic(
  () => import('@/components/ui/toast').then((mod) => mod.ToastProvider),
  {
    ssr: false,
    loading: () => null,
  }
);

export function ToastProviderLazy({ children }: { children: ReactNode }) {
  return <ToastProviderDynamic>{children}</ToastProviderDynamic>;
}
