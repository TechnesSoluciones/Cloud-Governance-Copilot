# Mapeo Detallado: Endpoints vs Hooks vs Páginas
**Fecha:** 27 de Diciembre de 2025
**Propósito:** Guía de integración para reemplazar data mock con datos reales del API

---

## 1. Dashboard Page

### Ubicación
`/Users/josegomez/Documents/Code/SaaS/Copilot/apps/frontend/src/app/(dashboard)/dashboard/page.tsx`

### Data Actualmente Hardcodeada
```tsx
// KPI Cards con valores fijos:
- "Total Monthly Cost": "$12,450"
- "Security Score": "85/100"
- "Active Resources": "1,240"
- "Critical Alerts": "3"

// Gráficos:
- CostTrendChart (sin datos)
- SecurityScoreCircular (sin datos)
- RecommendationsTable (sin datos)
```

### Hook Disponible
```
useDashboard(accountId: string)
ubicación: /apps/frontend/src/hooks/useDashboard.ts
```

### API Endpoint Necesario
```
GET /api/v1/analytics/dashboard?accountId={accountId}
```

### Cambio Requerido
```tsx
// ANTES
const DashboardV2Page = () => {
  return (
    <KPICardV2
      value="$12,450"  // ← Hardcoded
      ...
    />
  )
}

// DESPUÉS
const DashboardV2Page = () => {
  const accountId = useAccountContext(); // Necesita contexto
  const { overview, health, isLoading, error } = useDashboard(accountId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;

  return (
    <KPICardV2
      value={formatCurrency(overview?.totalMonthlyCost)} // ← Del API
      ...
    />
  )
}
```

### Estado
- Complejidad: MEDIA
- Impacto: ALTO
- Prioridad: CRÍTICA

---

## 2. Resources Page

### Ubicación
`/Users/josegomez/Documents/Code/SaaS/Copilot/apps/frontend/src/app/(dashboard)/resources/page.tsx`

### Data Actualmente Hardcodeada
```tsx
const mockResources: Resource[] = [
  {
    id: '1',
    name: 'webapp-prod-001',
    type: 'Microsoft.Web/sites',
    location: 'East US',
    resourceGroup: 'production-rg',
    tags: { environment: 'production', 'cost-center': 'engineering' },
    properties: {},
  },
  // ... 2 más
];
```

### Hook Disponible
```
useResources(params: ResourceListParams)
ubicación: /apps/frontend/src/hooks/useResources.ts
```

### API Endpoint Necesario
```
GET /api/v1/resources?page=1&limit=20&resourceType=...&location=...&search=...
```

### Cambio Requerido
```tsx
// ANTES
const ResourcesPage = () => {
  const [filteredResources, setFilteredResources] = useState(mockResources);
}

// DESPUÉS
const ResourcesPage = () => {
  const [filters, setFilters] = useState<ResourceListParams>({
    page: 1,
    limit: 20,
  });

  const { data, isLoading, error, refetch } = useResources(filters);
  const resources = data?.data?.data || [];
  const pagination = data?.data?.pagination;

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, page: 1, ...newFilters });
  };

  return (
    <>
      <ResourceFilters onFilter={handleFilterChange} />
      <ResourceTable
        resources={resources}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={(page) => setFilters({ ...filters, page })}
      />
    </>
  )
}
```

### Estado
- Complejidad: MEDIA
- Impacto: ALTO
- Prioridad: CRÍTICA

---

## 3. Recommendations Page

### Ubicación
`/Users/josegomez/Documents/Code/SaaS/Copilot/apps/frontend/src/app/(dashboard)/recommendations/page.tsx`

### Data Actualmente Hardcodeada
```tsx
const mockRecommendations: Recommendation[] = [
  {
    id: '1',
    title: 'Downsize VM',
    description: '...',
    severity: 'high',
    impact: '$500/month',
    affectedResources: 12,
    // ...
  },
  // ... más recomendaciones
];
```

### Hook Disponible
```
useRecommendations(params?: RecommendationParams)
ubicación: /apps/frontend/src/hooks/useRecommendations.ts
```

### API Endpoint Necesario
```
GET /api/v1/recommendations?severity=...&category=...&status=...
POST /api/v1/recommendations/{id}/implement
```

### Cambio Requerido
```tsx
// ANTES
const RecommendationsPage = () => {
  const [recommendations, setRecommendations] = useState(mockRecommendations);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all');
}

// DESPUÉS
const RecommendationsPage = () => {
  const [filters, setFilters] = useState({ severity: 'all' });
  const { data, isLoading, error } = useRecommendations(filters);
  const recommendations = data?.data?.data || [];

  const handleImplement = async (recommendationId: string) => {
    try {
      await apiPost(`/recommendations/${recommendationId}/implement`);
      // Invalidar query para refetch
    } catch (error) {
      // Mostrar error
    }
  };

  return (
    <RecommendationsList
      recommendations={recommendations}
      onFilter={setFilters}
      onImplement={handleImplement}
    />
  )
}
```

### Estado
- Complejidad: MEDIA
- Impacto: ALTO
- Prioridad: ALTA

---

## 4. Audit Logs Page

### Ubicación
`/Users/josegomez/Documents/Code/SaaS/Copilot/apps/frontend/src/app/(dashboard)/audit-logs/page.tsx`

### Data Actualmente Hardcodeada
```tsx
const mockLogs: AuditLog[] = [
  {
    id: '1',
    user: 'john.doe@example.com',
    action: 'RESOURCE_CREATED',
    resourceId: 'res-123',
    timestamp: new Date(),
    status: 'success',
  },
  // ... más logs
];
```

### Hook Disponible
```
useAuditLogs(params?: AuditLogParams)
ubicación: Necesita ser creado
```

### API Endpoint Necesario
```
GET /api/v1/audit-logs?page=1&limit=50&userId=...&action=...&dateRange=...
```

### Cambio Requerido
```tsx
// ANTES
const AuditLogsPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>(mockLogs);
  const [filters, setFilters] = useState({ dateRange: '7d' });
}

// DESPUÉS
const AuditLogsPage = () => {
  const [filters, setFilters] = useState<AuditLogParams>({
    page: 1,
    limit: 50,
    dateRange: '7d',
  });

  const { data, isLoading } = useAuditLogs(filters);
  const logs = data?.data?.data || [];
  const pagination = data?.data?.pagination;

  return (
    <AuditLogsTable
      logs={logs}
      pagination={pagination}
      isLoading={isLoading}
      onFilterChange={(newFilters) => setFilters({ ...filters, ...newFilters, page: 1 })}
    />
  )
}
```

### Estado
- Complejidad: BAJA
- Impacto: MEDIO
- Prioridad: MEDIA
- **Nota:** Hook useAuditLogs no existe, necesita crearse

---

## 5. Cloud Accounts Page

### Ubicación
`/Users/josegomez/Documents/Code/SaaS/Copilot/apps/frontend/src/app/(dashboard)/cloud-accounts/page.tsx`

### Data Actualmente Hardcodeada
```tsx
const mockAccounts: CloudAccount[] = [
  {
    id: '1',
    name: 'Production Account',
    provider: 'azure',
    subscriptionId: 'sub-123',
    status: 'connected',
    resourceCount: 245,
    // ...
  },
  // ...
];
```

### Hook Disponible
```
useCloudAccounts()
ubicación: /apps/frontend/src/hooks/useCloudAccounts.ts
```

### API Endpoint Necesario
```
GET /api/v1/cloud-accounts
POST /api/v1/cloud-accounts
DELETE /api/v1/cloud-accounts/{id}
```

### Cambio Requerido
```tsx
// ANTES
const CloudAccountsPage = () => {
  const [accounts, setAccounts] = useState<CloudAccount[]>(mockAccounts);
}

// DESPUÉS
const CloudAccountsPage = () => {
  const { data, isLoading, error, refetch } = useCloudAccounts();
  const accounts = data?.data?.data || [];

  const handleDeleteAccount = async (accountId: string) => {
    if (confirm('¿Estás seguro?')) {
      await apiDelete(`/cloud-accounts/${accountId}`);
      refetch();
    }
  };

  return (
    <CloudAccountsList
      accounts={accounts}
      isLoading={isLoading}
      onDelete={handleDeleteAccount}
    />
  )
}
```

### Estado
- Complejidad: BAJA
- Impacto: MEDIO
- Prioridad: MEDIA

---

## 6. Azure Advisor Page

### Ubicación
`/Users/josegomez/Documents/Code/SaaS/Copilot/apps/frontend/src/app/(dashboard)/azure-advisor/page.tsx`

### Data Actualmente Hardcodeada
```tsx
const mockRecommendations: Recommendation[] = [
  // Similar a recommendations pero específico de Azure Advisor
];
```

### Hook Disponible
```
useAzureAdvisor()
ubicación: /apps/frontend/src/hooks/useAzureAdvisor.ts
```

### API Endpoint Necesario
```
GET /api/v1/azure-advisor/recommendations
```

### Estado
- Complejidad: BAJA
- Impacto: BAJO
- Prioridad: BAJA
- **Nota:** Similar a Recommendations, puede usar mismo patrón

---

## 7. Assets Page

### Ubicación
`/Users/josegomez/Documents/Code/SaaS/Copilot/apps/frontend/src/app/(dashboard)/assets/page.tsx`

### Data Actualmente Hardcodeada
```tsx
const mockResources: Resource[] = [
  // Similar a resources page
];
```

### Hook Disponible
```
useAssets()
ubicación: /apps/frontend/src/hooks/useAssets.ts
```

### API Endpoint Necesario
```
GET /api/v1/assets
```

### Estado
- Complejidad: MEDIA
- Impacto: BAJO
- Prioridad: BAJA

---

## 8. Incidents Page

### Ubicación
`/Users/josegomez/Documents/Code/SaaS/Copilot/apps/frontend/src/app/(dashboard)/incidents/page.tsx`

### Data Actualmente Hardcodeada
```tsx
const mockIncidents: Incident[] = [
  {
    id: '1',
    title: 'High CPU Usage',
    severity: 'critical',
    affectedResources: ['res-1', 'res-2'],
    createdAt: new Date(),
    status: 'open',
  },
  // ...
];
```

### Hook Disponible
```
useIncidents()
ubicación: /apps/frontend/src/hooks/useIncidents.ts
```

### API Endpoint Necesario
```
GET /api/v1/incidents?status=...&severity=...
GET /api/v1/incidents/{id}
PUT /api/v1/incidents/{id}
```

### Estado
- Complejidad: MEDIA
- Impacto: BAJO
- Prioridad: BAJA

---

## Plan de Implementación Prioritizado

### Fase 1: CRÍTICA (Hacer Primero)
1. **Dashboard Page** - La página más importante
2. **Resources Page** - Base para otras funcionalidades

Estimado: 2-3 horas

### Fase 2: ALTA (Hacer Segundo)
1. **Recommendations Page**
2. **Audit Logs Page** (crear hook)
3. **Cloud Accounts Page**

Estimado: 3-4 horas

### Fase 3: MEDIA (Hacer Después)
1. **Azure Advisor Page**
2. **Assets Page**
3. **Incidents Page**

Estimado: 2-3 horas

---

## Validación de Endpoints en Backend

### Checklist de Verificación
Para cada endpoint, verificar que existe en `/apps/api-gateway/src/routes/`:

```bash
# Dashboard
GET /api/v1/analytics/dashboard - ¿Existe?

# Resources
GET /api/v1/resources - ¿Existe?

# Recommendations
GET /api/v1/recommendations - ¿Existe?
POST /api/v1/recommendations/{id}/implement - ¿Existe?

# Audit Logs
GET /api/v1/audit-logs - ¿Existe?

# Cloud Accounts
GET /api/v1/cloud-accounts - ¿Existe?
POST /api/v1/cloud-accounts - ¿Existe?
DELETE /api/v1/cloud-accounts/{id} - ¿Existe?

# Azure Advisor
GET /api/v1/azure-advisor/recommendations - ¿Existe?

# Incidents
GET /api/v1/incidents - ¿Existe?
GET /api/v1/incidents/{id} - ¿Existe?
PUT /api/v1/incidents/{id} - ¿Existe?
```

---

## Implementación: Paso a Paso

### Patrón Estándar para Cada Página

```tsx
// 1. Imports
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiGet } from '@/lib/api/client';
import { use<Feature>Hook } from '@/hooks/use<Feature>';

// 2. State Management
const [filters, setFilters] = useState<FilterType>(defaultFilters);
const [pagination, setPagination] = useState({ page: 1, limit: 20 });

// 3. Data Fetching
const { data, isLoading, error, refetch } = use<Feature>Hook({
  ...filters,
  ...pagination,
});

// 4. Extract Data
const items = data?.data?.data || [];
const paginationInfo = data?.data?.pagination || defaultPagination;

// 5. Error Handling
if (error) {
  return <ErrorAlert message={error.message} onRetry={refetch} />;
}

// 6. Render
return (
  <>
    <FilterComponent onFilter={setFilters} />
    <Table
      data={items}
      isLoading={isLoading}
      pagination={paginationInfo}
      onPageChange={(page) => setPagination({ ...pagination, page })}
    />
  </>
);
```

---

**Documento Actualizado:** 2025-12-27 13:15 UTC
**Próxima Revisión:** Después de completar Fase 1

🤖 Generado con Claude Code
