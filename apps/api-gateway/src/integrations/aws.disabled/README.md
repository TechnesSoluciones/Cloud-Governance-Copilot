# AWS Integration - Temporalmente Deshabilitado

**Fecha de deshabilitación:** 2025-12-31
**Razón:** Transición a Azure-only mode para fase de testing y estabilización

## Contenido de este Directorio

Este directorio contiene todas las integraciones con Amazon Web Services (AWS) que han sido temporalmente deshabilitadas. El código se ha preservado intacto para facilitar su reactivación futura.

### Archivos Incluidos:

- `cost-explorer.service.ts` - Servicio para AWS Cost Explorer API
- `ec2.service.ts` - Servicio para AWS EC2 (Virtual Machines)
- `security-scanner.service.ts` - Escáner de seguridad AWS
- `index.ts` - Exportaciones del módulo AWS
- Archivos adicionales de ejemplo y configuración

## Para Reactivar AWS

Sigue estos pasos en orden:

### 1. Renombrar Directorio
```bash
cd apps/api-gateway/src/integrations
mv aws.disabled aws
```

### 2. Backend - Descomentar Código

#### a) Actualizar `cloud-provider.interface.ts`
```typescript
// Descomentar tipo 'aws' en CloudProviderType
export type CloudProviderType = 'aws' | 'azure';
```

#### b) Actualizar `cloudAccount.service.ts`
- Descomentar validación de credenciales AWS
- Descomentar caso 'aws' en switch statements

#### c) Actualizar Services de Negocio
- `cost-collection.service.ts` - Descomentar `collectAWSCosts()`
- `asset-discovery.service.ts` - Descomentar `discoverAWSAssets()`
- `scan.service.ts` - Descomentar `scanAWSAccount()`

### 3. Reinstalar Dependencias AWS

#### Editar `package.json`:
```json
{
  "dependencies": {
    "@aws-sdk/client-cost-explorer": "^3.946.0",
    "@aws-sdk/client-ec2": "^3.946.0",
    "@aws-sdk/client-iam": "^3.947.0",
    "@aws-sdk/client-rds": "^3.946.0",
    "@aws-sdk/client-s3": "^3.947.0"
  }
}
```

#### Instalar:
```bash
cd apps/api-gateway
npm install
```

### 4. Variables de Entorno

Agregar a `.env`:
```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1
```

Descomentar en `docker-compose.yml`:
```yaml
environment:
  - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
  - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
  - AWS_REGION=${AWS_REGION}
  - ENABLE_AWS=true
```

### 5. Frontend - Descomentar Componentes

#### a) `CloudProviderFilterContext.tsx`
```typescript
// Descomentar tipo multi-cloud
export type CloudProvider = 'all' | 'aws' | 'azure' | 'gcp';
```

#### b) `ProviderForm.tsx`
- Descomentar campos AWS en `ProviderFormData`
- Descomentar constante `awsRegions`
- Descomentar formulario AWS (líneas comentadas)

#### c) `ProviderLogo.tsx`
- Descomentar caso 'aws' en switch
- Descomentar entradas AWS en `providerGradients`, `providerColors`, `providerNames`

#### d) `features.ts`
```typescript
export const FEATURE_FLAGS = {
  ENABLE_AWS: true,  // Cambiar a true
  ENABLE_AZURE: true,
  ENABLE_GCP: false,
} as const;
```

### 6. Tests

#### Renombrar archivos:
```bash
cd apps/api-gateway/src/__tests__
mv __mocks__/aws-sdk.ts.disabled __mocks__/aws-sdk.ts
mv __fixtures__/aws-*.fixture.ts.disabled __fixtures__/aws-*.fixture.ts
```

#### Descomentar tests AWS en archivos de test

#### Ejecutar suite de tests:
```bash
npm run test:unit -- aws
```

### 7. Verificación Final

```bash
# Backend: compilar
cd apps/api-gateway
npm run build

# Frontend: compilar
cd apps/frontend
npm run build

# Verificar integración AWS
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

## Documentación Adicional

- Ver `/docs/REACTIVATION_GUIDE_AWS_GCP.md` para guía completa
- Ver `CHANGELOG.md` para historial de cambios
- Ver plan arquitectónico en `/docs/AZURE_ONLY_MIGRATION_PLAN.md`

## Tiempo Estimado de Reactivación

- Cambios de código: 2-3 horas
- Instalación de dependencias: 30 minutos
- Testing: 2-3 horas
- **Total: 4-6 horas aproximadamente**

## Notas Importantes

1. ⚠️ **NO** eliminar este directorio - contiene código valioso
2. ⚠️ Verificar que todos los tests pasen antes de deployment
3. ⚠️ Actualizar documentación al reactivar
4. ⚠️ Comunicar a equipo cuando AWS esté activo nuevamente

## Contacto

Para preguntas sobre la reactivación de AWS, contactar al equipo de arquitectura.

**Última actualización:** 2025-12-31
