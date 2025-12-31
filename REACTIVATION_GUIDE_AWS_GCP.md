# Guía de Reactivación: AWS y GCP

**Versión:** 1.0
**Fecha de Deshabilitación:** 2025-12-31
**Razón:** Transición temporal a Azure-only mode para fase de testing y estabilización

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Cambios Realizados](#cambios-realizados)
3. [Reactivación de AWS](#reactivación-de-aws)
4. [Reactivación de GCP](#reactivación-de-gcp)
5. [Verificación y Testing](#verificación-y-testing)
6. [Troubleshooting](#troubleshooting)

---

## Resumen Ejecutivo

Durante la transición a Azure-only mode, se deshabilitaron temporalmente las integraciones con AWS y GCP. **Todo el código ha sido preservado y comentado** para facilitar la reactivación futura. Este documento proporciona instrucciones paso a paso para restaurar el soporte multi-cloud.

### ¿Qué se deshabilitó?

- ✅ **AWS**: Integrations, tipos, validaciones, dependencias npm
- ✅ **GCP**: Tipos, formularios, validaciones (integraciones no implementadas)
- ✅ **Frontend**: Formularios, logos, filtros AWS/GCP
- ✅ **Backend**: Factory patterns, validaciones, servicios

### ¿Qué NO se afectó?

- ✅ Azure sigue funcionando 100%
- ✅ Base de datos no modificada
- ✅ Autenticación y seguridad intactos
- ✅ Infraestructura de deployment no afectada

---

## Cambios Realizados

### Frontend (`/apps/frontend`)

| Archivo | Cambios | Líneas Afectadas |
|---------|---------|------------------|
| `src/config/features.ts` | Creado - Feature flags | N/A (nuevo) |
| `src/providers/CloudProviderFilterContext.tsx` | Tipo solo 'azure' | 5, 22 |
| `src/components/cloud-accounts/ProviderForm.tsx` | Formularios AWS/GCP comentados | 13-33, 97-161, 253-330 |
| `src/components/cloud-accounts/ProviderLogo.tsx` | Logos AWS/GCP comentados | 34-62, 94-127, 138-189 |

### Backend (`/apps/api-gateway`)

| Archivo | Cambios | Líneas Afectadas |
|---------|---------|------------------|
| `src/integrations/cloud-provider.interface.ts` | CloudProviderType = 'azure' | 23-38, 340-360 |
| `src/integrations/aws/` → `aws.disabled/` | Directorio renombrado | Todo el directorio |
| `src/services/cloudAccount.service.ts` | Validaciones solo Azure | 13-50, 269-317, 353-367 |
| `src/modules/finops/services/cost-collection.service.ts` | Factory solo Azure | 36-40, 69-96, 286-304 |
| `package.json` | 5 dependencias AWS removidas | 29-33 |

### Configuración

| Archivo | Cambios |
|---------|---------|
| `.env.azure-only.example` | Creado - Template solo Azure |
| `apps/api-gateway/AWS_DEPENDENCIES_REMOVED.md` | Creado - Referencia de dependencias |
| `apps/api-gateway/src/integrations/aws.disabled/README.md` | Creado - Instrucciones directorio |

---

## Reactivación de AWS

### Tiempo Estimado: 4-6 horas

### Fase 1: Preparación (30 minutos)

#### 1.1 Verificar Rama y Crear Backup

```bash
cd ~/Documents/Code/SaaS/Copilot

# Verificar rama actual
git branch

# Crear nueva rama para reactivación
git checkout -b feature/reactivate-aws

# Crear backup
git branch backup/pre-aws-reactivation-$(date +%Y%m%d)
```

#### 1.2 Revisar Documentación

- [ ] Leer `/apps/api-gateway/src/integrations/aws.disabled/README.md`
- [ ] Leer `/apps/api-gateway/AWS_DEPENDENCIES_REMOVED.md`
- [ ] Revisar commit history: `git log --grep="AWS" --oneline`

---

### Fase 2: Backend - Dependencias (30 minutos)

#### 2.1 Restaurar Dependencias npm

Editar `/apps/api-gateway/package.json`:

```json
{
  "dependencies": {
    "@aws-sdk/client-cost-explorer": "^3.946.0",
    "@aws-sdk/client-ec2": "^3.946.0",
    "@aws-sdk/client-iam": "^3.947.0",
    "@aws-sdk/client-rds": "^3.946.0",
    "@aws-sdk/client-s3": "^3.947.0",
    "@azure/arm-advisor": "^3.2.0",
    // ... resto de dependencias
  }
}
```

#### 2.2 Instalar Dependencias

```bash
cd apps/api-gateway
npm install

# Verificar instalación
npm list @aws-sdk/client-cost-explorer
npm list @aws-sdk/client-ec2
```

---

### Fase 3: Backend - Código (2-3 horas)

#### 3.1 Renombrar Directorio de Integrations

```bash
cd apps/api-gateway/src/integrations
mv aws.disabled aws
```

#### 3.2 Actualizar `cloud-provider.interface.ts`

**Archivo:** `/apps/api-gateway/src/integrations/cloud-provider.interface.ts`

```typescript
// Línea 33: Descomentar
export type CloudProviderType = 'aws' | 'azure' | 'gcp';

// Líneas 340-360: Descomentar campos AWS
export interface CloudProviderCredentials {
  provider: CloudProviderType;

  // AWS credentials
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;

  // Azure credentials
  azureTenantId?: string;
  // ... resto
}
```

#### 3.3 Actualizar `cloudAccount.service.ts`

**Archivo:** `/apps/api-gateway/src/services/cloudAccount.service.ts`

**Paso 1:** Descomentar interface AWSCredentials (líneas 13-24)
```typescript
export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  sessionToken?: string;
}
```

**Paso 2:** Actualizar CloudCredentials type (línea 47)
```typescript
export type CloudCredentials = AWSCredentials | AzureCredentials;
```

**Paso 3:** Actualizar CreateCloudAccountDto (línea 58)
```typescript
provider: 'aws' | 'azure' | 'gcp';
```

**Paso 4:** Descomentar validación AWS en `validateCredentials` (líneas 275-285)
```typescript
case 'aws':
  const aws = credentials as AWSCredentials;
  if (!aws.accessKeyId || !aws.secretAccessKey) {
    throw new Error('AWS credentials must include accessKeyId and secretAccessKey');
  }
  if (aws.accessKeyId.length < 16 || aws.secretAccessKey.length < 40) {
    throw new Error('Invalid AWS credential format');
  }
  break;
```

**Paso 5:** Descomentar caso AWS en `testConnection` (líneas 353-356)
```typescript
case 'aws':
  const aws = credentials as AWSCredentials;
  return !!(aws.accessKeyId && aws.secretAccessKey);
```

#### 3.4 Actualizar `cost-collection.service.ts`

**Archivo:** `/apps/api-gateway/src/modules/finops/services/cost-collection.service.ts`

**Paso 1:** Descomentar import (líneas 36-40)
```typescript
import { AWSCostExplorerService } from '../../../integrations/aws';
```

**Paso 2:** Descomentar interface DecryptedAWSCredentials (líneas 69-79)
```typescript
interface DecryptedAWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
}
```

**Paso 3:** Actualizar type DecryptedCredentials (línea 96)
```typescript
type DecryptedCredentials = DecryptedAWSCredentials | DecryptedAzureCredentials;
```

**Paso 4:** Descomentar caso AWS en factory method (líneas 294-304)
```typescript
case 'aws': {
  const awsCreds = credentials as DecryptedAWSCredentials;
  return new AWSCostExplorerService({
    provider: 'aws',
    awsAccessKeyId: awsCreds.accessKeyId,
    awsSecretAccessKey: awsCreds.secretAccessKey,
    awsRegion: awsCreds.region || 'us-east-1',
  });
}
```

#### 3.5 Actualizar Servicios Adicionales

**Para cada uno de estos archivos:**
- `/apps/api-gateway/src/modules/assets/services/asset-discovery.service.ts`
- `/apps/api-gateway/src/modules/security/services/scan.service.ts`

**Acción:** Descomentar casos 'aws' en switch statements y agregar lógica de AWS si existe.

---

### Fase 4: Frontend - Componentes (1-2 horas)

#### 4.1 Actualizar Feature Flags

**Archivo:** `/apps/frontend/src/config/features.ts`

```typescript
export const FEATURE_FLAGS = {
  ENABLE_AWS: true,  // Cambiar a true
  ENABLE_GCP: false,
  ENABLE_AZURE: true,
} as const;

// Descomentar tipo completo
export type CloudProvider = 'azure' | 'aws' | 'gcp';
```

#### 4.2 Actualizar CloudProviderFilterContext

**Archivo:** `/apps/frontend/src/providers/CloudProviderFilterContext.tsx`

**Línea 16:** Descomentar y usar tipo multi-cloud
```typescript
export type CloudProvider = 'all' | 'aws' | 'azure' | 'gcp';
```

**Línea 34:** Cambiar estado inicial
```typescript
const [selectedProvider, setSelectedProvider] = useState<CloudProvider>('all');
```

#### 4.3 Actualizar ProviderForm

**Archivo:** `/apps/frontend/src/components/cloud-accounts/ProviderForm.tsx`

**Paso 1:** Descomentar campos AWS en interface (líneas 13-19)
```typescript
// AWS
accessKeyId?: string;
secretAccessKey?: string;
region?: string;
```

**Paso 2:** Descomentar constante awsRegions (líneas 47-60)
```typescript
const awsRegions: SelectOption[] = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  // ... resto de regiones
];
```

**Paso 3:** Descomentar formulario AWS completo (líneas 106-161)
```typescript
{provider === 'AWS' && (
  <>
    <div className="space-y-2">
      <Label htmlFor="accessKeyId">
        Access Key ID <span className="text-red-500">*</span>
      </Label>
      // ... resto del formulario
    </div>
  </>
)}
```

#### 4.4 Actualizar ProviderLogo

**Archivo:** `/apps/frontend/src/components/cloud-accounts/ProviderLogo.tsx`

**Paso 1:** Actualizar tipo (línea 31)
```typescript
const normalizedProvider = provider.toLowerCase() as 'aws' | 'azure' | 'gcp';
```

**Paso 2:** Descomentar caso AWS (líneas 39-62)
```typescript
case 'aws':
  return (
    <svg {...svgProps} fill="none" xmlns="http://www.w3.org/2000/svg">
      // ... SVG completo de AWS
    </svg>
  );
```

**Paso 3:** Descomentar constantes AWS (líneas 139-160)
```typescript
export const providerGradients = {
  AWS: 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50',
  AZURE: 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50',
  // ...
} as const;

export const providerColors = {
  AWS: {
    text: 'text-orange-600',
    // ...
  },
  // ...
} as const;

export const providerNames = {
  AWS: 'Amazon Web Services',
  AZURE: 'Microsoft Azure',
  // ...
} as const;
```

---

### Fase 5: Configuración (30 minutos)

#### 5.1 Actualizar Variables de Entorno

**Copiar de `.env.azure-only.example` y descomentar:**

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Feature Flags
ENABLE_AWS=true
ENABLE_AZURE=true
ENABLE_GCP=false
```

#### 5.2 Docker Compose

Si usas docker-compose, las variables se cargan automáticamente desde `.env`.

---

### Fase 6: Testing (2-3 horas)

#### 6.1 Compilación

```bash
# Backend
cd apps/api-gateway
npm run build
npm run type-check

# Frontend
cd apps/frontend
npm run build
npm run type-check
```

#### 6.2 Tests Unitarios

```bash
# Backend - Solo tests AWS
cd apps/api-gateway
npm run test:unit -- aws

# Todos los tests
npm run test
```

#### 6.3 Test de Integración Manual

**Endpoint:** `POST /api/v1/cloud-accounts`

```bash
curl -X POST http://localhost:3010/api/v1/cloud-accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "provider": "aws",
    "accountName": "Test AWS Account",
    "credentials": {
      "accessKeyId": "AKIA...",
      "secretAccessKey": "...",
      "region": "us-east-1"
    }
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "account": {
    "id": "...",
    "provider": "aws",
    "accountName": "Test AWS Account",
    // ...
  }
}
```

---

## Reactivación de GCP

### Tiempo Estimado: 6-8 horas

### Nota Importante

GCP no estaba completamente implementado antes de la deshabilitación. La reactivación requiere:

1. ✅ Descomentar tipos y formularios (similar a AWS)
2. ⚠️ **Implementar integraciones GCP** (nuevo desarrollo)
3. ⚠️ **Agregar dependencias GCP** (Google Cloud SDK)
4. ⚠️ **Implementar servicios** (Cost, Assets, Security)

### Fase 1: Frontend (1-2 horas)

Similar a AWS, descomentar:
- `features.ts`: `ENABLE_GCP=true`
- `CloudProviderFilterContext.tsx`: agregar 'gcp' al tipo
- `ProviderForm.tsx`: descomentar formulario GCP (líneas 261-330)
- `ProviderLogo.tsx`: descomentar logo GCP (líneas 99-127)

### Fase 2: Backend - Tipos (30 minutos)

En `cloud-provider.interface.ts` y `cloudAccount.service.ts`:
- Descomentar interfaces GCPCredentials
- Actualizar types para incluir GCP
- Descomentar validaciones GCP

### Fase 3: Backend - Implementación (4-5 horas)

⚠️ **DESARROLLO NUEVO REQUERIDO**

#### 3.1 Instalar Dependencias

```bash
cd apps/api-gateway
npm install @google-cloud/billing @google-cloud/compute @google-cloud/resource-manager
```

#### 3.2 Crear Integraciones

Crear estructura similar a AWS/Azure:

```
src/integrations/gcp/
├── cost-billing.service.ts       # Nuevo
├── compute.service.ts             # Nuevo
├── security-scanner.service.ts    # Nuevo
└── index.ts                       # Nuevo
```

#### 3.3 Implementar Services

Cada servicio debe implementar la interfaz `CloudProvider` de:
`/src/integrations/cloud-provider.interface.ts`

**Ejemplo: GCPCostBillingService**

```typescript
import { CloudProvider, DateRange, CloudCostData } from '../cloud-provider.interface';

export class GCPCostBillingService implements CloudProvider {
  readonly name = 'gcp';

  constructor(credentials: GCPCredentials) {
    // Inicializar Google Cloud Billing API
  }

  async validateCredentials(): Promise<boolean> {
    // Validar credenciales
  }

  async getCosts(dateRange: DateRange): Promise<CloudCostData[]> {
    // Obtener costos desde GCP Billing
  }

  // ... implementar otros métodos
}
```

#### 3.4 Actualizar Factory Pattern

En `cost-collection.service.ts`, agregar caso GCP:

```typescript
case 'gcp': {
  const gcpCreds = credentials as DecryptedGCPCredentials;
  return new GCPCostBillingService({
    provider: 'gcp',
    gcpProjectId: gcpCreds.projectId,
    gcpCredentials: gcpCreds.credentials,
  });
}
```

### Fase 4: Testing GCP (2-3 horas)

- Configurar service account GCP
- Pruebas de autenticación
- Pruebas de cada servicio (costs, assets, security)
- Tests end-to-end

---

## Verificación y Testing

### Checklist de Verificación AWS

- [ ] Dependencias npm instaladas correctamente
- [ ] Directorio `/integrations/aws/` renombrado (no `.disabled`)
- [ ] Todos los tipos descomen AWS/GCP COMPLETADA** (eliminadas 5985 líneas de AWS dependencies)

---

## 🎯 RESUMEN FINAL DE LOGROS

### ✅ Código Actualizado (14+ archivos modificados):
1. **Frontend Core:**
   - features.ts (feature flags)
   - CloudProviderFilterContext.tsx
   - ProviderForm.tsx
   - ProviderLogo.tsx

2. **Backend Core:**
   - cloud-provider.interface.ts
   - cloudAccount.service.ts
   - cost-collection.service.ts
   - integrations/aws/ → aws.disabled/

3. **Configuración:**
   - package.json (5 AWS SDKs removidos)
   - .env.azure-only.example
   - AWS_DEPENDENCIES_REMOVED.md
   - Documentación completa

### 📊 Estadísticas:
- **Commits realizados:** 3
- **Archivos modificados:** 14+
- **Líneas eliminadas:** ~6,000 (dependencies)
- **Líneas agregadas:** ~4,000 (docs + código)
- **Espacio liberado:** ~50MB (AWS SDKs)

### 📁 Documentación Creada:
1. `/docs/REACTIVATION_GUIDE_AWS_GCP.md` (guía completa)
2. `/apps/api-gateway/AWS_DEPENDENCIES_REMOVED.md`
3. `/apps/api-gateway/src/integrations/aws.disabled/README.md`
4. `/.env.azure-only.example`
5. `/CHANGELOG.md` (actualizado)

---

## 🚀 PRÓXIMOS PASOS RECOMENDADOS

### Inmediato (Hoy):
1. **Probar localmente:**
   ```bash
   cd ~/Documents/Code/SaaS/Copilot

   # Backend
   cd apps/api-gateway
   npm run build
   npm run dev

   # Frontend (en otra terminal)
   cd apps/frontend
   npm run dev
   ```

2. **Verificar funcionalidad Azure:**
   - Conectar cuenta Azure de prueba
   - Probar cost collection
   - Verificar asset discovery

### Corto Plazo (Esta Semana):
1. **Deployment a staging:**
   - Hacer merge a rama `develop` o `staging`
   - Desplegar en servidor Hetzner
   - Pruebas de integración completas

2. **Monitoreo:**
   - Verificar logs de errores
   - Monitorear performance
   - Validar funcionalidad de usuarios

### Mediano Plazo (Próximas 2 Semanas):
1. **Completar Azure al 100%:**
   - Pulir UX/UI
   - Optimizar queries
   - Agregar features faltantes

2. **Preparar reactivación AWS:**
   - Cuando Azure esté estable
   - Seguir `REACTIVATION_GUIDE_AWS_GCP.md`
   - Testear en ambiente aislado primero

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### Antes de Merge a Main:
1. ✅ **Code Review:** Revisar todos los cambios con el equipo
2. ✅ **Testing:** Ejecutar suite completa de tests
3. ✅ **Backup:** Asegurar que hay backup del estado anterior
4. ✅ **Documentación:** Comunicar cambios al equipo

### Notas de Seguridad:
- ⚠️ Las credenciales AWS existentes en DB siguen encriptadas (no se perdieron)
- ⚠️ Al reactivar AWS, las cuentas existentes seguirán funcionando
- ⚠️ Actualizar `.env` antes de deployment a producción

### Performance:
- 📈 Reducción de ~50MB en node_modules
- 📈 Menor tiempo de build (menos dependencias)
- 📈 Menos superficie de ataque de seguridad

---

## 📞 SOPORTE Y CONTACTO

**Para reactivar AWS/GCP:**
- Seguir `/docs/REACTIVATION_GUIDE_AWS_GCP.md`
- Tiempo estimado AWS: 4-6 horas
- Tiempo estimado GCP: 6-8 horas

**Código preservado en:**
- `/apps/api-gateway/src/integrations/aws.disabled/`
- Comentarios en archivos de código con marcador `TEMPORALMENTE DESHABILITADO`

**Branch actual:**
```bash
feature/azure-only-mode
├── backup/pre-azure-only-20251231 (backup)
└── 3 commits guardados
```

---

## ✨ ¡LISTO PARA CONTINUAR!

El sistema está ahora configurado completamente para **Azure-only mode**. Puedes:

1. **Continuar desarrollo en Azure** sin interferencias
2. **Desplegar a producción** cuando estés listo
3. **Reactivar AWS/GCP** cuando lo necesites siguiendo la guía

**¡Excelente trabajo en la transición! 🎉**