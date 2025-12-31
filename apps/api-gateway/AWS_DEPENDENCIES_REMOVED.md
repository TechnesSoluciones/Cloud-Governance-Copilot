# AWS Dependencies - Removidas Temporalmente

**Fecha:** 2025-12-31
**Razón:** Transición a Azure-only mode

## Dependencias Removidas

Las siguientes dependencias de AWS fueron removidas de `package.json`:

```json
"@aws-sdk/client-cost-explorer": "^3.946.0",
"@aws-sdk/client-ec2": "^3.946.0",
"@aws-sdk/client-iam": "^3.947.0",
"@aws-sdk/client-rds": "^3.946.0",
"@aws-sdk/client-s3": "^3.947.0"
```

## Para Reactivar

### 1. Restaurar dependencias en package.json

Agregar de nuevo en la sección `dependencies`:

```json
{
  "dependencies": {
    "@aws-sdk/client-cost-explorer": "^3.946.0",
    "@aws-sdk/client-ec2": "^3.946.0",
    "@aws-sdk/client-iam": "^3.947.0",
    "@aws-sdk/client-rds": "^3.946.0",
    "@aws-sdk/client-s3": "^3.947.0",
    // ... resto de dependencias
  }
}
```

### 2. Reinstalar dependencias

```bash
cd apps/api-gateway
npm install
```

### 3. Verificar versiones

Revisar si hay versiones más recientes disponibles:

```bash
npm outdated @aws-sdk/client-cost-explorer
npm outdated @aws-sdk/client-ec2
npm outdated @aws-sdk/client-iam
npm outdated @aws-sdk/client-rds
npm outdated @aws-sdk/client-s3
```

### 4. Actualizar imports

Descomentar imports en:
- `/src/modules/finops/services/cost-collection.service.ts`
- Otros servicios que usen AWS SDKs

### 5. Verificar compilación

```bash
npm run build
npm run type-check
```

## Notas

- Estas dependencias eran necesarias para:
  - **client-cost-explorer**: Obtención de datos de costos de AWS
  - **client-ec2**: Gestión de instancias EC2
  - **client-iam**: Gestión de permisos IAM
  - **client-rds**: Gestión de bases de datos RDS
  - **client-s3**: Gestión de buckets S3

- Total de espacio liberado: ~50MB aproximadamente

## Referencias

- Ver `/integrations/aws.disabled/README.md` para código de integración
- Ver `/docs/REACTIVATION_GUIDE_AWS_GCP.md` para guía completa
- AWS SDK v3 docs: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/

---

**Última actualización:** 2025-12-31
