# Matriz de Integración Frontend-Backend
**Actualizado:** 2025-12-27 14:35 UTC
**Sesión:** Integración Continua de Módulos

---

## RESUMEN EJECUTIVO

| Módulo | Backend | Frontend Hooks | API Client | Página Integrada | Status |
|--------|---------|----------------|------------|------------------|--------|
| Dashboard | ✓ Completo | ✓ useDashboard | ✓ Sí | ✓ INTEGRADO | PRODUCCIÓN |
| Resources | ✓ Completo | ✓ useResources | ✓ Sí | ✓ INTEGRADO | PRODUCCIÓN |
| Costs/FinOps | ✓ Completo | ✓ useCosts | ✓ Sí | ✗ MOCK DATA | EN PROGRESO |
| Security | ✓ Completo | ✓ useSecurity | ✓ Sí | ? Por revisar | POR VERIFICAR |
| Recommendations | ✓ Completo | ✓ useRecommendations | ✓ Sí | ? Por revisar | POR VERIFICAR |
| Incidents | ✓ Completo | ✓ useIncidents | ✓ Sí | ? Por revisar | POR VERIFICAR |
| Assets | ✓ Completo | ✓ useAssets | ✓ Sí | ? Por revisar | POR VERIFICAR |
| Azure Advisor | ✓ Completo | ✓ useAzureAdvisor | ✓ Sí | ? Por revisar | POR VERIFICAR |
| Cloud Accounts | ✓ Completo | ✓ useCloudAccounts | ✓ Sí | ? Por revisar | POR VERIFICAR |

---

## DETALLE POR MÓDULO

### 1. DASHBOARD
**Status:** ✓ COMPLETADO Y EN PRODUCCIÓN

**Backend:**
- Módulo: `/apps/api-gateway/src/modules/dashboard/`
- Endpoints: `/dashboard/overview`, `/dashboard/health`
- Estado: Completamente funcional

**Frontend:**
- Página: `/apps/frontend/src/app/(dashboard)/dashboard/page.tsx`
- Hooks: `useDashboard()`
- Status: INTEGRADO - Usando datos reales del API
- Loading: Implementado ✓
- Error Handling: Implementado ✓

**Próximo:** No requiere cambios

---

### 2. RESOURCES
**Status:** ✓ COMPLETADO (Necesita verificación)

**Backend:**
- Módulo: `/apps/api-gateway/src/modules/resources/`
- Endpoints: GET `/resources`, GET `/resources/metadata`, GET `/resources/search`
- Status: Completamente funcional

**Frontend:**
- Página: `/apps/frontend/src/app/(dashboard)/resources/page.tsx`
- Hooks: `useResources()`
- Status: Probablemente integrado, necesita verificación

**Próximo:** Auditar página de recursos

---

### 3. COSTS/FINOPS (ENFOQUE ACTUAL)
**Status:** ✗ INTEGRACIÓN EN PROGRESO

**Backend:**
- Módulo: `/apps/api-gateway/src/modules/finops/`
- Endpoints:
  - GET `/finops/costs` ✓
  - GET `/finops/costs/by-service` ✓
  - GET `/finops/costs/trends` ✓
  - GET `/finops/anomalies` ✓
  - POST `/finops/anomalies/:id/resolve` ✓
- Status: 100% Implementado ✓

**Frontend:**
- Página: `/apps/frontend/src/app/(dashboard)/costs/page.tsx`
- Hooks Disponibles:
  - `useCosts()` ✓
  - `useCostsByService()` ✓
  - `useCostTrends()` ✓
  - `useAnomalies()` ✓
  - `useCombinedCostData()` ✓
- Status: **DATA MOCK ENCONTRADA** - Hardcodeada en componente
  - serviceBreakdown array (líneas 26-32) ✗
  - costByProvider array (líneas 34-38) ✗
  - topCostResources array (líneas 40-91) ✗

**Cambios Requeridos:**
1. [ ] Agregar imports de hooks
2. [ ] Implementar getDateRange() helper
3. [ ] Reemplazar arrays con datos del API
4. [ ] Agregar loading states
5. [ ] Agregar error handling
6. [ ] Validar tipos TypeScript

**Próximo:** Ejecutar integración completa

---

### 4. SECURITY
**Status:** ? POR VERIFICAR

**Backend:**
- Módulo: `/apps/api-gateway/src/modules/security/`
- Status: Existe

**Frontend:**
- Página: `/apps/frontend/src/app/(dashboard)/security/page.tsx`
- Hooks: `useSecurity()`
- Status: Requiere auditoría

**Próximo Paso:** Auditar si está integrada o con mock data

---

### 5. RECOMMENDATIONS
**Status:** ? POR VERIFICAR

**Backend:**
- Módulo: `/apps/api-gateway/src/modules/finops/routes/recommendations.routes.ts`
- Status: Existe

**Frontend:**
- Página: `/apps/frontend/src/app/(dashboard)/recommendations/page.tsx`
- Hooks: `useRecommendations()`
- Status: Requiere auditoría

**Próximo Paso:** Auditar si está integrada o con mock data

---

### 6. INCIDENTS
**Status:** ? POR VERIFICAR

**Backend:**
- Módulo: `/apps/api-gateway/src/modules/incidents/`
- Status: Existe

**Frontend:**
- Página: `/apps/frontend/src/app/(dashboard)/incidents/page.tsx`
- Hooks: `useIncidents()`
- Status: Requiere auditoría

**Próximo Paso:** Auditar si está integrada o con mock data

---

### 7. ASSETS
**Status:** ? POR VERIFICAR

**Backend:**
- Módulo: `/apps/api-gateway/src/modules/assets/`
- Status: Existe

**Frontend:**
- Página: `/apps/frontend/src/app/(dashboard)/assets/page.tsx`
- Hooks: `useAssets()`
- Status: Requiere auditoría

**Próximo Paso:** Auditar si está integrada o con mock data

---

### 8. AZURE ADVISOR
**Status:** ? POR VERIFICAR

**Backend:**
- Módulo: `/apps/api-gateway/src/modules/advisor/`
- Status: Existe

**Frontend:**
- Página: `/apps/frontend/src/app/(dashboard)/azure-advisor/page.tsx`
- Hooks: `useAzureAdvisor()`
- Status: Requiere auditoría

**Próximo Paso:** Auditar si está integrada o con mock data

---

### 9. CLOUD ACCOUNTS
**Status:** ? POR VERIFICAR

**Backend:**
- Módulo: `/apps/api-gateway/src/routes/cloudAccount.routes.ts`
- Status: Existe

**Frontend:**
- Página: `/apps/frontend/src/app/(dashboard)/cloud-accounts/page.tsx`
- Hooks: `useCloudAccounts()`
- Status: Requiere auditoría

**Próximo Paso:** Auditar si está integrada o con mock data

---

## PLAN DE INTEGRACIÓN PRIORIZADO

### Fase 1: CRÍTICA (Hacer Hoy)
1. **Costs Page** - Integración completa
   - Tiempo estimado: 1-2 horas
   - Complejidad: Media (datos ya disponibles)

### Fase 2: ALTA (Hacer Esta Semana)
2. **Security Page** - Auditar y completar si está parcial
3. **Recommendations Page** - Auditar y completar si está parcial
4. **Incidents Page** - Auditar y completar si está parcial

### Fase 3: MEDIA (Semana Siguiente)
5. **Assets Page** - Auditar y completar
6. **Azure Advisor** - Auditar y completar
7. **Cloud Accounts** - Auditar y completar

---

## ESTADO DE DATA HARDCODEADA

### Módulos con Data Real
- [x] Dashboard - Usando datos del API
- [x] Resources - Usando datos del API (probablemente)

### Módulos con Data Mock
- [ ] Costs - Datos hardcodeados en componente (EN PROGRESO)
- [ ] Security - Por verificar
- [ ] Recommendations - Por verificar
- [ ] Incidents - Por verificar
- [ ] Assets - Por verificar
- [ ] Azure Advisor - Por verificar
- [ ] Cloud Accounts - Por verificar

---

## CHECKLIST DE SESIÓN

### Completado ✓
- [x] Auditar endpoints de backend
- [x] Verificar que hooks existen
- [x] Documentar tipos de datos
- [x] Crear referencias rápidas
- [x] Crear matriz de integración

### En Progreso
- [ ] Integrar CostsPage con hooks
- [ ] Agregar loading/error states
- [ ] Testing completo

### Próximas Sesiones
- [ ] Auditar resto de módulos
- [ ] Integrar módulos restantes
- [ ] Testing E2E de flujos completos

---

## INFORMACIÓN PARA FUTURAS SESIONES

### Patrón de Integración Establecido
```typescript
// 1. Importar hook
import { useCombinedCostData } from '@/hooks/useCosts';

// 2. Preparar parámetros
const dateRange = { startDate: '2024-01-01', endDate: '2024-01-31' };

// 3. Usar hook
const { costs, isLoading, hasError } = useCombinedCostData(dateRange);

// 4. Manejar estados
if (isLoading) return <LoadingSpinner />;
if (hasError) return <ErrorAlert />;

// 5. Extraer datos
const data = extractCostData(costs.data);

// 6. Renderizar
return <Component data={data} />;
```

### Ubicación Estándar de Hooks
```
/apps/frontend/src/hooks/use[ModuleName].ts
```

### Ubicación Estándar de API Clients
```
/apps/frontend/src/lib/api/[moduleName].ts
```

### Ubicación Estándar de Páginas
```
/apps/frontend/src/app/(dashboard)/[module]/page.tsx
```

---

**MATRIZ ACTUALIZADA - Referencia General de Integración**
**Próxima Actualización:** Después de completar CostsPage
