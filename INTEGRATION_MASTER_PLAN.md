# PLAN MAESTRO DE INTEGRACION FRONTEND-BACKEND
## Cloud Governance Copilot - Proyecto de Integracion Completa

**Fecha:** 27 de Diciembre, 2025
**Version:** 1.0.0
**Responsable:** Orquestador de Proyecto

---

## TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Mapeo Completo de Integracion](#mapeo-completo-de-integracion)
4. [Analisis de Estado Actual](#analisis-de-estado-actual)
5. [Plan de Ejecucion por Fases](#plan-de-ejecucion-por-fases)
6. [Endpoints Faltantes Identificados](#endpoints-faltantes-identificados)
7. [Estrategia de Implementacion](#estrategia-de-implementacion)
8. [Criterios de Validacion](#criterios-de-validacion)
9. [Cronograma Estimado](#cronograma-estimado)

---

## RESUMEN EJECUTIVO

### Objetivo Principal
Integrar completamente el frontend Next.js con el backend API Gateway, reemplazando todos los datos mock con llamadas reales a endpoints del backend y asegurando que cada componente, boton y grafico funcione con data real de los proveedores cloud (AWS, Azure, GCP).

### Alcance del Proyecto
- **Frontend:** Next.js 15.1.3 + React 19
- **Backend:** Node.js + Express + TypeScript API Gateway
- **Base de Datos:** PostgreSQL con Prisma ORM
- **Proveedores Cloud:** AWS, Azure, GCP

### Estado Actual
- **Infraestructura API:** Cliente base implementado con circuit breaker
- **Servicios Frontend:** ~70% de servicios API ya creados
- **Endpoints Backend:** ~80% de endpoints implementados
- **Datos Mock:** Presentes en ~15 componentes principales

### Resultado Esperado
Sistema completamente funcional con:
- 0% datos mock en frontend
- 100% componentes conectados a backend real
- Loading states y error handling implementados
- Sistema robusto y listo para produccion

---

## ARQUITECTURA DEL SISTEMA

### Frontend (apps/frontend/)
```
apps/frontend/
├── src/
│   ├── app/
│   │   └── (dashboard)/          # Paginas del dashboard
│   │       ├── dashboard/         # Dashboard principal
│   │       ├── costs/             # Modulo de costos
│   │       ├── security/          # Modulo de seguridad
│   │       ├── resources/         # Modulo de recursos
│   │       ├── incidents/         # Modulo de incidentes
│   │       ├── recommendations/   # Modulo de recomendaciones
│   │       ├── assets/            # Modulo de assets
│   │       └── cloud-accounts/    # Gestion de cuentas cloud
│   ├── components/                # Componentes reutilizables
│   └── lib/
│       └── api/                   # Servicios API del frontend
│           ├── client.ts          # Cliente base (COMPLETO)
│           ├── dashboard.ts       # Dashboard API (COMPLETO)
│           ├── costs/             # Costs API (MODULARIZADO)
│           ├── security.ts        # Security API
│           ├── resources.ts       # Resources API
│           ├── incidents.ts       # Incidents API
│           ├── recommendations.ts # Recommendations API
│           ├── assets.ts          # Assets API
│           ├── cloud-accounts.ts  # Cloud Accounts API
│           └── auth.ts            # Auth API (COMPLETO)
```

### Backend (apps/api-gateway/)
```
apps/api-gateway/
├── src/
│   ├── routes/                    # Rutas principales
│   │   ├── auth.routes.ts         # Autenticacion (COMPLETO)
│   │   ├── dashboard.routes.ts    # Dashboard (COMPLETO)
│   │   ├── resources.routes.ts    # Recursos (COMPLETO)
│   │   ├── cloudAccount.routes.ts # Cuentas cloud (COMPLETO)
│   │   └── health.routes.ts       # Health checks (COMPLETO)
│   └── modules/                   # Modulos especializados
│       ├── finops/                # FinOps module
│       │   ├── routes/            # Rutas de costos y recomendaciones
│       │   ├── controllers/       # Controladores
│       │   └── services/          # Logica de negocio
│       ├── security/              # Security module
│       │   ├── routes/            # Rutas de seguridad
│       │   ├── controllers/       # Controladores
│       │   └── services/          # Servicios de escaneo
│       ├── assets/                # Assets module
│       │   ├── routes/            # Rutas de assets
│       │   ├── controllers/       # Controladores
│       │   └── services/          # Servicios de discovery
│       ├── incidents/             # Incidents module
│       │   ├── routes/            # Rutas de incidentes
│       │   ├── controllers/       # Controladores
│       │   └── services/          # Servicios de alertas
│       └── advisor/               # Azure Advisor module
│           ├── routes/            # Rutas de advisor
│           └── controllers/       # Controladores
```

---

## MAPEO COMPLETO DE INTEGRACION

### 1. DASHBOARD PRINCIPAL

#### Frontend Component
- **File:** `/apps/frontend/src/app/(dashboard)/dashboard/page.tsx`
- **Estado Actual:** Usa datos hardcoded
- **Datos Mock:**
  - KPI Cards: `$12,450`, `85/100`, `1,240`, `3`
  - CostTrendChart: No data
  - SecurityScoreCircular: `score={85}` hardcoded
  - RecommendationsTable: No data
  - Service Health: Hardcoded status indicators

#### Backend Endpoints (DISPONIBLES)
```typescript
GET /api/v1/dashboard/overview?accountId={id}
Response: {
  resources: { total, byType[], byLocation[] },
  costs: { currentMonth, previousMonth, trend, percentageChange, topServices[] },
  security: { score, criticalIssues, highIssues, mediumIssues },
  alerts: { active, recent[] }
}

GET /api/v1/dashboard/health?accountId={id}
Response: {
  virtualMachines: { total, running, stopped, deallocated },
  resourcesByLocation: [],
  recentActivity: []
}
```

#### API Service (DISPONIBLE)
- **File:** `/apps/frontend/src/lib/api/dashboard.ts`
- **Status:** COMPLETO - Listo para usar
- **Funciones:**
  - `dashboardApi.getOverview(accountId, token)`
  - `dashboardApi.getHealth(accountId, token)`

#### Integracion Requerida
1. Importar `dashboardApi` en el componente
2. Usar React Query o useState para manejar loading/error
3. Llamar `getOverview()` y `getHealth()` al montar
4. Reemplazar datos hardcoded con data del API
5. Agregar loading skeletons
6. Implementar error states

---

### 2. MODULO DE COSTOS (COSTS/FINOPS)

#### Frontend Component
- **File:** `/apps/frontend/src/app/(dashboard)/costs/page.tsx`
- **Estado Actual:** Usa arrays hardcoded
- **Datos Mock:**
  - `serviceBreakdown`: Array de 5 items
  - `costByProvider`: Array de 3 items (AWS, Azure, GCP)
  - `topCostResources`: Array de 5 recursos
  - KPIs: `$10,900`, `$1,850`, `$12,450`, `$415`

#### Backend Endpoints (DISPONIBLES)
```typescript
GET /api/v1/finops/costs?startDate={iso}&endDate={iso}&provider={aws|azure|gcp}
Response: { costs: [], total, currency }

GET /api/v1/finops/costs/by-service?startDate={iso}&endDate={iso}&provider={provider}
Response: { serviceBreakdown: [{ service, cost, provider }] }

GET /api/v1/finops/costs/trends?startDate={iso}&endDate={iso}&granularity={daily|weekly|monthly}
Response: { trends: [{ date, cost, provider }] }

GET /api/v1/finops/anomalies?status={status}&severity={severity}
Response: { anomalies: [] }
```

#### API Service (DISPONIBLE)
- **File:** `/apps/frontend/src/lib/api/costs/client.ts`
- **Status:** MODULARIZADO - Estructura completa
- **Funciones:**
  - `costsApi.getCosts(params, token)`
  - `costsApi.getCostsByService(params, token)`
  - `costsApi.getCostTrends(params, token)`
  - `costsApi.getAnomalies(params, token)`

#### Integracion Requerida
1. Importar `costsApi` en el componente
2. Implementar useQuery hooks para cada endpoint
3. Calcular KPIs desde datos reales
4. Generar `serviceBreakdown` desde API
5. Generar `costByProvider` desde API
6. Generar `topCostResources` desde API
7. Agregar date range picker funcional
8. Implementar filtros por proveedor

---

### 3. MODULO DE SEGURIDAD

#### Frontend Component
- **File:** `/apps/frontend/src/app/(dashboard)/security/page.tsx`
- **Estado Actual:** Usa arrays hardcoded
- **Datos Mock:**
  - `securityFindings`: Array de 6 findings
  - `complianceFrameworks`: Array de 5 frameworks
  - `securityCategories`: Array de 5 categorias
  - KPIs: `85/100`, `5`, `88%`, `35`

#### Backend Endpoints (DISPONIBLES)
```typescript
GET /api/v1/security/findings?page={n}&limit={n}&severity={severity}&status={status}
Response: {
  data: [{ id, severity, title, resource, provider, category, status, detectedAt }],
  meta: { page, limit, total, totalPages }
}

GET /api/v1/security/scans?page={n}&limit={n}&status={status}
Response: {
  data: [{ id, status, findingsCount, criticalCount, highCount, mediumCount, lowCount }],
  meta: { page, limit, total }
}

GET /api/v1/security/summary
Response: {
  scansLast30Days,
  openFindingsBySeverity: { critical, high, medium, low },
  findingsByCategory: [],
  recentScans: [],
  trendData: []
}

POST /api/v1/security/scans
Response: { jobId, status, message }

PATCH /api/v1/security/findings/:id/resolve
PATCH /api/v1/security/findings/:id/dismiss
```

#### API Service (NECESITA ACTUALIZACION)
- **File:** `/apps/frontend/src/lib/api/security.ts`
- **Status:** PARCIAL - Necesita expansion
- **Funciones Faltantes:**
  - `securityApi.getFindings(params, token)`
  - `securityApi.getScans(params, token)`
  - `securityApi.getSummary(token)`
  - `securityApi.triggerScan(cloudAccountId, token)`
  - `securityApi.resolveFinding(id, notes, token)`
  - `securityApi.dismissFinding(id, reason, token)`

#### Integracion Requerida
1. **PRIMERO:** Actualizar `/apps/frontend/src/lib/api/security.ts` con nuevas funciones
2. Importar `securityApi` en el componente
3. Usar `getSummary()` para KPIs y estadisticas
4. Usar `getFindings()` para tabla de findings
5. Implementar boton "Run Security Scan" con `triggerScan()`
6. Agregar modales para resolve/dismiss findings
7. Generar `securityCategories` desde datos del summary
8. Implementar filtros y paginacion

---

### 4. MODULO DE RECURSOS

#### Frontend Component
- **File:** `/apps/frontend/src/app/(dashboard)/resources/page.tsx`
- **Estado Actual:** Desconocido (no leido aun)

#### Backend Endpoints (DISPONIBLES)
```typescript
GET /api/v1/resources?accountId={id}&resourceType={type}&location={loc}&page={n}&limit={n}
Response: {
  resources: [{ id, name, type, location, resourceGroup, tags, properties }],
  total,
  page,
  limit
}

GET /api/v1/resources/metadata?accountId={id}
Response: {
  resourceTypes: [],
  locations: [],
  resourceGroups: []
}

GET /api/v1/resources/search?accountId={id}&q={query}&limit={n}
Response: { resources: [] }
```

#### API Service (DISPONIBLE)
- **File:** `/apps/frontend/src/lib/api/resources.ts`
- **Status:** Necesita verificacion

---

### 5. MODULO DE ASSETS

#### Frontend Component
- **File:** `/apps/frontend/src/app/(dashboard)/assets/page.tsx`
- **Estado Actual:** Usa datos mock

#### Backend Endpoints (DISPONIBLES)
```typescript
GET /api/v1/assets?page={n}&limit={n}&provider={provider}&resourceType={type}&status={status}
Response: {
  data: [{ id, provider, resourceType, resourceId, name, region, status, tags, metadata }],
  meta: { page, limit, total, totalPages }
}

GET /api/v1/assets/:id
Response: { data: { ...asset details } }

POST /api/v1/assets/discover
Body: { cloudAccountId?: string }
Response: { assetsDiscovered, accountsProcessed, errors }

GET /api/v1/assets/orphaned?accountId={id}
GET /api/v1/assets/by-type/:type?accountId={id}
GET /api/v1/assets/cost-allocation?accountId={id}&groupBy={tag}
PATCH /api/v1/assets/:id/tags
POST /api/v1/assets/bulk-tag
```

#### API Service (DISPONIBLE)
- **File:** `/apps/frontend/src/lib/api/assets.ts`
- **Status:** Necesita verificacion

---

### 6. MODULO DE INCIDENTES

#### Frontend Component
- **File:** `/apps/frontend/src/app/(dashboard)/incidents/page.tsx`
- **Estado Actual:** Usa datos mock

#### Backend Endpoints (DISPONIBLES)
```typescript
GET /api/v1/incidents?accountId={id}&status={status}&severity={severity}&page={n}
Response: {
  incidents: [],
  total,
  page,
  pageSize,
  hasMore
}

GET /api/v1/incidents/:id
Response: { incident with full details, alerts, comments, timeline }

GET /api/v1/incidents/alerts?accountId={id}&severity={severity}&status={status}
Response: { alerts: [], total, page, pageSize, hasMore }

GET /api/v1/incidents/activity-logs?accountId={id}&startDate={iso}&endDate={iso}
Response: { logs: [], total, page, pageSize }

PATCH /api/v1/incidents/:id/status
Body: { status, notes, assignedTo }

POST /api/v1/incidents/:id/comments
Body: { comment }

GET /api/v1/incidents/metrics/:resourceId?accountId={id}&metricNames={names}&startDate={iso}&endDate={iso}
Response: { metrics: [] }
```

#### API Service (DISPONIBLE)
- **File:** `/apps/frontend/src/lib/api/incidents.ts`
- **Status:** Necesita verificacion

---

### 7. MODULO DE RECOMENDACIONES

#### Frontend Component
- **File:** `/apps/frontend/src/app/(dashboard)/recommendations/page.tsx`
- **Estado Actual:** Usa datos mock

#### Backend Endpoints (DISPONIBLES)
```typescript
GET /api/v1/finops/recommendations?status={status}&type={type}&provider={provider}&page={n}
Response: {
  data: [{ id, type, title, description, potentialSavings, priority, status, provider }],
  meta: { page, limit, total, totalPages }
}

GET /api/v1/finops/recommendations/summary?status={status}&provider={provider}
Response: {
  totalRecommendations,
  totalPotentialSavings,
  byStatus: { open, applied, dismissed },
  byPriority: { high, medium, low },
  byType: []
}

GET /api/v1/finops/recommendations/:id
Response: { data: { ...full recommendation details } }

POST /api/v1/finops/recommendations/generate
Body: { cloudAccountId?: string }
Response: { jobId, status, message }

POST /api/v1/finops/recommendations/:id/apply
Body: { notes?: string }
Response: { success, data }

POST /api/v1/finops/recommendations/:id/dismiss
Body: { reason: string }
Response: { success, data }
```

#### API Service (DISPONIBLE)
- **File:** `/apps/frontend/src/lib/api/recommendations.ts`
- **Status:** Necesita verificacion y posible expansion

---

### 8. MODULO DE CLOUD ACCOUNTS

#### Frontend Component
- **File:** `/apps/frontend/src/app/(dashboard)/cloud-accounts/page.tsx`
- **Estado Actual:** Funcional con backend

#### Backend Endpoints (DISPONIBLES)
```typescript
GET /api/v1/cloud-accounts
POST /api/v1/cloud-accounts
PUT /api/v1/cloud-accounts/:id
DELETE /api/v1/cloud-accounts/:id
POST /api/v1/cloud-accounts/:id/test-connection
```

#### API Service (DISPONIBLE)
- **File:** `/apps/frontend/src/lib/api/cloud-accounts.ts`
- **Status:** COMPLETO

---

## ANALISIS DE ESTADO ACTUAL

### Servicios API Frontend - Estado

| Servicio | Archivo | Estado | Acciones Requeridas |
|----------|---------|--------|---------------------|
| Client Base | `client.ts` | COMPLETO | Ninguna |
| Auth | `auth.ts` | COMPLETO | Ninguna |
| Dashboard | `dashboard.ts` | COMPLETO | Ninguna |
| Cloud Accounts | `cloud-accounts.ts` | COMPLETO | Ninguna |
| Costs | `costs/client.ts` | COMPLETO | Ninguna |
| Security | `security.ts` | PARCIAL | Agregar: getFindings, getScans, getSummary, triggerScan, resolveFinding, dismissFinding |
| Resources | `resources.ts` | VERIFICAR | Revisar completitud |
| Assets | `assets.ts` | VERIFICAR | Revisar completitud |
| Incidents | `incidents.ts` | VERIFICAR | Revisar completitud |
| Recommendations | `recommendations.ts` | VERIFICAR | Revisar completitud, agregar apply/dismiss |

### Componentes con Datos Mock

| Componente | Archivo | Mock Data | Prioridad |
|------------|---------|-----------|-----------|
| Dashboard | `dashboard/page.tsx` | KPIs, Charts | ALTA |
| Costs | `costs/page.tsx` | Arrays completos | ALTA |
| Security | `security/page.tsx` | Findings, Compliance | ALTA |
| Resources | `resources/page.tsx` | Por verificar | MEDIA |
| Assets | `assets/page.tsx` | Por verificar | MEDIA |
| Incidents | `incidents/page.tsx` | Por verificar | MEDIA |
| Recommendations | `recommendations/page.tsx` | Por verificar | MEDIA |

---

## ENDPOINTS FALTANTES IDENTIFICADOS

### 1. Backend Endpoints Faltantes
- **NINGUNO IDENTIFICADO** - Backend esta bien estructurado

### 2. Frontend API Services Incompletos
- **Security Service:** Falta implementar 6 funciones
- **Otros Services:** Requieren verificacion

---

## PLAN DE EJECUCION POR FASES

### FASE 1: PREPARACION Y VERIFICACION (1-2 horas)

#### Tareas
1. Leer y verificar todos los servicios API del frontend
2. Documentar completitud de cada servicio
3. Identificar funciones faltantes exactas
4. Crear lista de componentes con mock data

#### Entregables
- Inventario completo de servicios
- Lista de funciones faltantes
- Mapa de componentes mock

---

### FASE 2: ACTUALIZACION DE SERVICIOS API (2-3 horas)

#### Tareas
1. Actualizar `/lib/api/security.ts` con funciones faltantes
2. Verificar y completar `/lib/api/resources.ts`
3. Verificar y completar `/lib/api/assets.ts`
4. Verificar y completar `/lib/api/incidents.ts`
5. Verificar y completar `/lib/api/recommendations.ts`

#### Entregables
- Todos los servicios API completos
- Tests de integracion basicos
- Documentacion de uso

---

### FASE 3: INTEGRACION DASHBOARD PRINCIPAL (2-3 horas)

#### Componente: `/app/(dashboard)/dashboard/page.tsx`

#### Subtareas
1. Crear custom hooks para data fetching
   - `useDashboardOverview(accountId)`
   - `useDashboardHealth(accountId)`
2. Implementar loading states
3. Implementar error handling
4. Conectar KPI cards con data real
5. Conectar CostTrendChart con data real
6. Conectar SecurityScoreCircular con data real
7. Conectar RecommendationsTable con data real
8. Conectar Service Health con data real
9. Agregar refresh functionality
10. Testing y validacion

#### Codigo Ejemplo
```typescript
// hooks/useDashboardData.ts
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboard';

export function useDashboardOverview(accountId: string) {
  return useQuery({
    queryKey: ['dashboard', 'overview', accountId],
    queryFn: async () => {
      const response = await dashboardApi.getOverview(accountId);
      return response.data;
    },
    enabled: !!accountId,
    refetchInterval: 60000, // Refresh every minute
  });
}
```

---

### FASE 4: INTEGRACION MODULO DE COSTOS (3-4 horas)

#### Componente: `/app/(dashboard)/costs/page.tsx`

#### Subtareas
1. Crear custom hooks
   - `useCosts(params)`
   - `useCostsByService(params)`
   - `useCostTrends(params)`
   - `useAnomalies(params)`
2. Implementar date range selector
3. Implementar filtros por proveedor
4. Conectar KPIs con calculos reales
5. Generar serviceBreakdown chart
6. Generar costByProvider pie chart
7. Generar topCostResources table
8. Agregar export functionality
9. Testing y validacion

---

### FASE 5: INTEGRACION MODULO DE SEGURIDAD (3-4 horas)

#### Componente: `/app/(dashboard)/security/page.tsx`

#### Subtareas
1. Actualizar service primero (FASE 2)
2. Crear custom hooks
   - `useSecurityFindings(params)`
   - `useSecurityScans(params)`
   - `useSecuritySummary()`
3. Conectar KPIs con summary data
4. Generar security score visualization
5. Generar findings by category
6. Generar compliance frameworks display
7. Generar security findings table
8. Implementar "Run Security Scan" button
9. Implementar resolve/dismiss modals
10. Testing y validacion

---

### FASE 6: INTEGRACION MODULOS ADICIONALES (4-6 horas)

#### Modulos
- Resources
- Assets
- Incidents
- Recommendations

#### Para cada modulo:
1. Verificar/completar service API
2. Crear custom hooks
3. Conectar componente con data real
4. Implementar loading/error states
5. Agregar funcionalidad interactiva
6. Testing

---

### FASE 7: LOADING STATES Y ERROR HANDLING (2-3 horas)

#### Tareas Globales
1. Crear componentes de loading uniformes
   - Skeleton loaders para cada tipo de dato
   - Loading spinners
   - Progress indicators
2. Crear componentes de error uniformes
   - Error boundaries
   - Error messages
   - Retry buttons
3. Implementar error handling en todos los hooks
4. Agregar toast notifications
5. Implementar offline detection
6. Testing de casos edge

---

### FASE 8: LIMPIEZA DE DATOS MOCK (1-2 horas)

#### Tareas
1. Buscar y eliminar todos los arrays hardcoded
2. Buscar y eliminar valores mock
3. Limpiar imports no usados
4. Limpiar comentarios obsoletos
5. Code review completo
6. Verificacion final

#### Script de busqueda
```bash
# Buscar datos mock en el codigo
grep -r "mockData\|MOCK\|dummy\|fake\|placeholder" apps/frontend/src --include="*.tsx" --include="*.ts"
```

---

### FASE 9: VALIDACION Y TESTING (2-3 horas)

#### Checklist de Validacion

**Dashboard**
- [ ] KPIs cargan correctamente
- [ ] Charts muestran data real
- [ ] Refresh funciona
- [ ] Loading states aparecen
- [ ] Errores se manejan correctamente
- [ ] Responsive design funciona

**Costs**
- [ ] Data carga por rango de fechas
- [ ] Filtros funcionan
- [ ] Charts actualizan correctamente
- [ ] Export funciona
- [ ] KPIs calculan correctamente

**Security**
- [ ] Findings cargan con paginacion
- [ ] Scans se pueden ejecutar
- [ ] Resolve/dismiss funcionan
- [ ] Filtros funcionan
- [ ] Summary stats correctos

**Resources/Assets/Incidents/Recommendations**
- [ ] Data carga correctamente
- [ ] Filtros funcionan
- [ ] Acciones (CRUD) funcionan
- [ ] Paginacion funciona
- [ ] Search funciona

**Global**
- [ ] No hay errores en consola
- [ ] No hay warnings de React
- [ ] Performance aceptable
- [ ] Responsive funciona
- [ ] Dark mode funciona
- [ ] Autenticacion funciona
- [ ] Circuit breaker funciona

---

### FASE 10: DOCUMENTACION (1-2 horas)

#### Documentos a Crear/Actualizar
1. **INTEGRATION_GUIDE.md**
   - Como funcionan las integraciones
   - Estructura de hooks
   - Manejo de errores
   - Best practices
2. **API_REFERENCE.md**
   - Todos los endpoints
   - Request/Response types
   - Ejemplos de uso
3. **TESTING_GUIDE.md**
   - Como probar cada modulo
   - Test cases criticos
   - Troubleshooting
4. **CHANGELOG.md**
   - Que cambio en esta integracion
   - Breaking changes
   - Migration guide

---

## ESTRATEGIA DE IMPLEMENTACION

### Patron de Desarrollo
1. **Service First:** Asegurar que el servicio API este completo
2. **Hooks Layer:** Crear custom hooks con React Query
3. **Component Integration:** Conectar componente con hooks
4. **UI Polish:** Agregar loading/error states
5. **Testing:** Validar funcionalidad
6. **Cleanup:** Remover mock data

### Estructura de Custom Hooks
```typescript
// Patron estandar para todos los hooks

export function useModuleData(params: QueryParams) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['module', 'data', params],
    queryFn: async () => {
      const response = await moduleApi.getData(params);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch data');
      }
      return response.data;
    },
    enabled: !!params.requiredField,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    data,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
```

### Patron de Error Handling
```typescript
// Component level error handling

function Component() {
  const { data, isLoading, error } = useModuleData(params);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load data"
        message={error.message}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  return <DataDisplay data={data} />;
}
```

---

## CRITERIOS DE VALIDACION

### Criterios de Exito
1. **Funcionalidad**
   - Todos los botones funcionan
   - Todos los graficos muestran data real
   - Todas las tablas cargan data real
   - Todos los filtros funcionan
   - Toda la paginacion funciona
   - Todas las acciones CRUD funcionan

2. **Calidad**
   - 0 datos mock en el codigo
   - 0 errores en consola
   - 0 warnings criticos
   - Loading states en todas las operaciones async
   - Error handling en todos los endpoints
   - Performance aceptable (<3s first load)

3. **UX**
   - Feedback visual en todas las acciones
   - Estados vacios bien manejados
   - Errores informativos para el usuario
   - Responsive en mobile/tablet/desktop
   - Accesibilidad basica (keyboard nav, ARIA labels)

---

## CRONOGRAMA ESTIMADO

### Timeline Total: 20-30 horas de desarrollo

#### Semana 1 (10-15 horas)
- **Dia 1-2:** FASE 1-2 (Preparacion y servicios)
- **Dia 3-4:** FASE 3 (Dashboard)
- **Dia 5:** FASE 4 (Costs)

#### Semana 2 (10-15 horas)
- **Dia 1-2:** FASE 5 (Security)
- **Dia 3-4:** FASE 6 (Modulos adicionales)
- **Dia 5:** FASE 7-10 (Polish y documentacion)

---

## PROXIMOS PASOS INMEDIATOS

### Accion Inmediata #1
Leer y verificar el estado de los siguientes archivos de servicio API:
1. `/apps/frontend/src/lib/api/security.ts`
2. `/apps/frontend/src/lib/api/resources.ts`
3. `/apps/frontend/src/lib/api/assets.ts`
4. `/apps/frontend/src/lib/api/incidents.ts`
5. `/apps/frontend/src/lib/api/recommendations.ts`

### Accion Inmediata #2
Leer los componentes que aun no hemos analizado:
1. `/apps/frontend/src/app/(dashboard)/resources/page.tsx`
2. `/apps/frontend/src/app/(dashboard)/assets/page.tsx`
3. `/apps/frontend/src/app/(dashboard)/incidents/page.tsx`
4. `/apps/frontend/src/app/(dashboard)/recommendations/page.tsx`

### Accion Inmediata #3
Comenzar FASE 2 - Actualizacion del servicio de seguridad

---

## NOTAS FINALES

### Consideraciones Importantes
1. **Autenticacion:** Todos los endpoints requieren token JWT
2. **Tenant Isolation:** Backend maneja aislamiento de tenants
3. **Rate Limiting:** Backend tiene rate limits (100-20 req/15min)
4. **Circuit Breaker:** Ya implementado en cliente base
5. **Cloud Account ID:** La mayoria de endpoints lo requieren

### Riesgos Identificados
1. **Data Format Mismatch:** Backend puede retornar formato diferente al esperado
2. **Missing Fields:** Algunos campos del mock pueden no existir en backend
3. **Performance:** Queries grandes pueden ser lentos
4. **Error States:** Necesitamos handle de casos edge (no data, timeouts, etc)

### Mitigaciones
1. Validar tipos con TypeScript
2. Transformar data si es necesario
3. Implementar paginacion en frontend
4. Agregar timeouts y retries
5. Testing exhaustivo

---

**Documento creado:** 2025-12-27
**Ultima actualizacion:** 2025-12-27
**Version:** 1.0.0
**Proximo review:** Despues de completar FASE 2
