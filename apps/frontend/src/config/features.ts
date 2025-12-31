/**
 * Feature Flags Configuration
 *
 * Controla qué proveedores cloud están habilitados en la aplicación
 *
 * HISTORIAL:
 * - 2025-12-31: Transición a Azure-only mode
 *   - AWS y GCP temporalmente deshabilitados
 *   - Para reactivar: cambiar flags a true y seguir guía en /docs/REACTIVATION_GUIDE_AWS_GCP.md
 */

export const FEATURE_FLAGS = {
  ENABLE_AWS: false,
  ENABLE_GCP: false,
  ENABLE_AZURE: true,
  // Para reactivar en el futuro: cambiar a true y descomentar código relacionado
} as const;

/**
 * Tipo de proveedores cloud soportados
 * Solo incluye proveedores actualmente habilitados
 */
export type CloudProvider = 'azure';

/* MULTI-CLOUD SUPPORT - TEMPORALMENTE DESHABILITADO
 * Para reactivar AWS/GCP:
 * 1. Cambiar FEATURE_FLAGS arriba
 * 2. Descomentar línea siguiente:
 * export type CloudProvider = 'azure' | 'aws' | 'gcp';
 * 3. Actualizar componentes relacionados (ProviderForm, ProviderLogo, etc.)
 * 4. Ver /docs/REACTIVATION_GUIDE_AWS_GCP.md
 */

/**
 * Tipo para proveedores habilitados actualmente
 * Este tipo cambia dinámicamente según FEATURE_FLAGS
 */
export type EnabledCloudProvider = 'azure'; // Solo Azure activo

/**
 * Verificar si un proveedor específico está habilitado
 */
export function isProviderEnabled(provider: string): boolean {
  switch (provider.toLowerCase()) {
    case 'azure':
      return FEATURE_FLAGS.ENABLE_AZURE;
    case 'aws':
      return FEATURE_FLAGS.ENABLE_AWS;
    case 'gcp':
      return FEATURE_FLAGS.ENABLE_GCP;
    default:
      return false;
  }
}

/**
 * Obtener lista de proveedores habilitados
 */
export function getEnabledProviders(): CloudProvider[] {
  const providers: CloudProvider[] = [];

  if (FEATURE_FLAGS.ENABLE_AZURE) providers.push('azure');
  /* TEMPORALMENTE DESHABILITADO
  if (FEATURE_FLAGS.ENABLE_AWS) providers.push('aws');
  if (FEATURE_FLAGS.ENABLE_GCP) providers.push('gcp');
  */

  return providers;
}

/**
 * Configuración de nombres de proveedores para UI
 */
export const PROVIDER_LABELS: Record<CloudProvider, string> = {
  azure: 'Microsoft Azure',
  /* TEMPORALMENTE DESHABILITADO
  aws: 'Amazon Web Services',
  gcp: 'Google Cloud Platform',
  */
} as const;
