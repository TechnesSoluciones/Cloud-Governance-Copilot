# CHANGELOG

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.6.0] - 2025-12-31

### 🎯 TRANSICIÓN A AZURE-ONLY MODE

Este release marca la transición temporal del proyecto de multi-cloud (AWS/Azure/GCP) a un modo Azure-only para fase de testing y estabilización. **Todo el código de AWS/GCP ha sido preservado** y puede ser reactivado siguiendo la guía en `REACTIVATION_GUIDE_AWS_GCP.md`.

### Added

#### Frontend
- **Feature Flags System** (`/apps/frontend/src/config/features.ts`)
  - Sistema de flags para controlar proveedores cloud activos
  - `ENABLE_AZURE=true`, `ENABLE_AWS=false`, `ENABLE_GCP=false`
  - Funciones helper: `isProviderEnabled()`, `getEnabledProviders()`

- **Documentación de Reactivación**
  - `REACTIVATION_GUIDE_AWS_GCP.md` - Guía completa paso a paso (500+ líneas)
  - Instrucciones detalladas para reactivar AWS (4-6 horas)
  - Instrucciones detalladas para reactivar GCP (6-8 horas)
  - Checklists de verificación y troubleshooting

- **Referencias de Dependencias**
  - `AWS_DEPENDENCIES_REMOVED.md` - Lista de 5 SDKs de AWS removidos
  - `/integrations/aws.disabled/README.md` - Instrucciones del directorio

- **Plantilla de Configuración**
  - `.env.azure-only.example` - Template completo solo Azure
  - Documentación de permisos Azure requeridos
  - Feature flags de ejemplo

### Changed

#### Frontend

- **CloudProviderFilterContext** (`/apps/frontend/src/providers/CloudProviderFilterContext.tsx`)
  - Tipo `CloudProvider` cambiado de `'all' | 'aws' | 'azure' | 'gcp'` → `'azure'`
  - Estado inicial cambiado de `'all'` → `'azure'`
  - Código multi-cloud comentado con instrucciones de reactivación

- **ProviderForm** (`/apps/frontend/src/components/cloud-accounts/ProviderForm.tsx`)
  - Formularios AWS comentados (líneas 97-161)
  - Formularios GCP comentados (líneas 253-330)
  - Constante `awsRegions` comentada
  - Campos AWS/GCP en `ProviderFormData` comentados

- **ProviderLogo** (`/apps/frontend/src/components/cloud-accounts/ProviderLogo.tsx`)
  - SVG logos AWS/GCP comentados
  - `providerGradients` solo incluye AZURE
  - `providerColors` solo incluye AZURE
  - `providerNames` solo incluye AZURE
  - Tipo normalizado a solo `'azure'`

#### Backend

- **cloud-provider.interface.ts** (`/apps/api-gateway/src/integrations/`)
  - `CloudProviderType` cambiado de `'aws' | 'azure' | 'gcp'` → `'azure'`
  - Campos AWS/GCP en `CloudProviderCredentials` comentados
  - Documentación actualizada con estado actual y fecha

- **cloudAccount.service.ts** (`/apps/api-gateway/src/services/`)
  - Interfaces `AWSCredentials` y `GCPCredentials` comentadas
  - `CloudCredentials` type ahora solo `AzureCredentials`
  - `CreateCloudAccountDto.provider` ahora solo acepta `'azure'`
  - Validaciones AWS/GCP comentadas en `validateCredentials()`
  - Casos AWS/GCP comentados en `testConnection()`
  - Mensajes de error actualizados: "Only 'azure' is currently supported"

- **cost-collection.service.ts** (`/apps/api-gateway/src/modules/finops/services/`)
  - Import `AWSCostExplorerService` comentado
  - Interface `DecryptedAWSCredentials` comentada
  - `DecryptedCredentials` type ahora solo `DecryptedAzureCredentials`
  - Factory method `createCloudProvider()` solo instancia `AzureCostManagementService`
  - Caso AWS en switch comentado con instrucciones de reactivación

### Removed

#### Dependencies

- **AWS SDK Packages** (5 paquetes removidos de `package.json`)
  - `@aws-sdk/client-cost-explorer@^3.946.0`
  - `@aws-sdk/client-ec2@^3.946.0`
  - `@aws-sdk/client-iam@^3.947.0`
  - `@aws-sdk/client-rds@^3.946.0`
  - `@aws-sdk/client-s3@^3.947.0`
  - **Espacio liberado:** ~50MB en `node_modules`
  - **Referencia:** Ver `AWS_DEPENDENCIES_REMOVED.md` para detalles

#### Code Organization

- **AWS Integrations Directory** renombrado
  - `/apps/api-gateway/src/integrations/aws/` → `/apps/api-gateway/src/integrations/aws.disabled/`
  - **Archivos preservados:**
    - `cost-explorer.service.ts` (18.8 KB)
    - `ec2.service.ts` (16.5 KB)
    - `security-scanner.service.ts` (40.3 KB)
    - Tests y ejemplos
  - **README.md** agregado con instrucciones de reactivación

### Migration Notes

#### Para Usuarios Existentes

1. **Cuentas Cloud Existentes:**
   - Las cuentas AWS/GCP en base de datos **NO fueron eliminadas**
   - Credenciales siguen encriptadas y seguras
   - Al reactivar AWS/GCP, las cuentas seguirán funcionando

2. **Variables de Entorno:**
   - Actualizar `.env` basado en `.env.azure-only.example`
   - Comentar/remover variables `AWS_*` y `GCP_*`
   - Agregar `ENABLE_AZURE=true`, `ENABLE_AWS=false`, `ENABLE_GCP=false`

3. **Funcionalidad:**
   - ✅ Azure funciona 100% (sin cambios)
   - ❌ AWS temporalmente no disponible
   - ❌ GCP temporalmente no disponible

#### Próximos Pasos

1. **Azure Optimization** (Actual Focus)
   - Completar testing de todas las features Azure
   - Optimizar queries y performance
   - Pulir UX/UI específicas de Azure

2. **AWS Reactivation** (Cuando Azure esté 100%)
   - Seguir guía en `REACTIVATION_GUIDE_AWS_GCP.md`
   - Tiempo estimado: 4-6 horas
   - Testing: 2-3 horas adicionales

3. **GCP Implementation** (Futuro)
   - Requiere desarrollo nuevo (integraciones no implementadas)
   - Tiempo estimado: 6-8 horas
   - Ver sección GCP en guía de reactivación

### Breaking Changes

⚠️ **Cambios que rompen compatibilidad:**

1. **Frontend:**
   - `CloudProvider` type ahora solo acepta `'azure'`
   - Componentes que usen `'aws'` o `'gcp'` fallarán en TypeScript
   - Filtros "All", "AWS", "GCP" no disponibles en UI

2. **Backend:**
   - `POST /api/v1/cloud-accounts` con `provider: 'aws'` o `provider: 'gcp'` retornará error
   - Factory patterns solo instancian servicios Azure
   - Validaciones rechazan credenciales AWS/GCP

3. **Dependencias:**
   - Código que importe `@aws-sdk/*` fallará (paquetes removidos)
   - `AWSCostExplorerService` no disponible (directorio renombrado)

### Security

- ✅ Credenciales AWS/GCP en DB siguen encriptadas (no afectadas)
- ✅ Menor superficie de ataque (menos dependencias externas)
- ✅ Código AWS preservado en `aws.disabled/` (acceso limitado)
- ⚠️ Al reactivar AWS/GCP, revisar actualizaciones de seguridad de SDKs

### Performance

- 📈 Reducción de ~50MB en `node_modules` (AWS SDKs removidos)
- 📈 Tiempo de build reducido (menos dependencias)
- 📈 Menos imports y código cargado en runtime

### Technical Debt

- 📝 Algunos servicios aún tienen código comentado (asset-discovery, security scan)
- 📝 Tests AWS/GCP aún no actualizados (pendiente FASE 5)
- 📝 Algunos componentes frontend con filtros multi-cloud pendientes

---

## [1.5.6] - 2025-12-30

### Fixed
- Correcciones de bugs menores en fase de testing Hetzner
- Estabilización de integraciones Azure

---

## [1.5.0] - 2025-12-22

### Added
- Soporte multi-cloud inicial (AWS, Azure, GCP)
- Integraciones con AWS Cost Explorer
- Integraciones con Azure Cost Management
- Sistema de credenciales encriptadas

---

## Versionado

- **MAJOR**: Cambios incompatibles en API
- **MINOR**: Nuevas funcionalidades compatibles
- **PATCH**: Bug fixes compatibles

---

## Referencias

- [Guía de Reactivación AWS/GCP](./REACTIVATION_GUIDE_AWS_GCP.md)
- [Dependencias AWS Removidas](./apps/api-gateway/AWS_DEPENDENCIES_REMOVED.md)
- [AWS Integrations](./apps/api-gateway/src/integrations/aws.disabled/README.md)
- [Configuración Azure-Only](./.env.azure-only.example)

---

**Última actualización:** 2025-12-31
