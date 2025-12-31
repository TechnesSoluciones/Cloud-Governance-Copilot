'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

/* ========================================
 * MULTI-CLOUD SUPPORT - TEMPORALMENTE DESHABILITADO
 * Fecha: 2025-12-31
 * Razón: Transición a Azure-only mode
 *
 * Para reactivar AWS/GCP:
 * 1. Descomentar línea siguiente
 * 2. Actualizar FEATURE_FLAGS en /config/features.ts
 * 3. Revisar ProviderForm, ProviderLogo, AccountCard
 * 4. Ver /docs/REACTIVATION_GUIDE_AWS_GCP.md
 * ======================================== */
// export type CloudProvider = 'all' | 'aws' | 'azure' | 'gcp';

/**
 * CloudProvider type - Solo Azure activo
 * Cuando se reactive multi-cloud, usar tipo comentado arriba
 */
export type CloudProvider = 'azure'; // Solo Azure activo

interface CloudProviderFilterContextType {
  selectedProvider: CloudProvider;
  setSelectedProvider: (provider: CloudProvider) => void;
}

const CloudProviderFilterContext = createContext<CloudProviderFilterContextType | undefined>(undefined);

export function CloudProviderFilterProvider({ children }: { children: ReactNode }) {
  // Cambio temporal: 'all' → 'azure' (solo Azure activo)
  // Cuando se reactive multi-cloud, restaurar a 'all'
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider>('azure');

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
