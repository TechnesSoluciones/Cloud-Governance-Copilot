'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type CloudProvider = 'all' | 'aws' | 'azure' | 'gcp';

interface CloudProviderFilterContextType {
  selectedProvider: CloudProvider;
  setSelectedProvider: (provider: CloudProvider) => void;
}

const CloudProviderFilterContext = createContext<CloudProviderFilterContextType | undefined>(undefined);

export function CloudProviderFilterProvider({ children }: { children: ReactNode }) {
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider>('all');

  return (
    <CloudProviderFilterContext.Provider value={{ selectedProvider, setSelectedProvider }}>
      {children}
    </CloudProviderFilterContext.Provider>
  );
}

export function useCloudProviderFilter() {
  const context = useContext(CloudProviderFilterContext);
  if (context === undefined) {
    throw new Error('useCloudProviderFilter must be used within a CloudProviderFilterProvider');
  }
  return context;
}
