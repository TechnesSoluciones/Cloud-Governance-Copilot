# Instrucciones Paso a Paso - Próxima Sesión de Integración
**Módulo:** Costs/FinOps
**Archivo a Modificar:** CostsPage
**Estimado de Tiempo:** 1-2 horas
**Dificultad:** Media

---

## PRE-SESIÓN: PREPARACIÓN

### Antes de Iniciar
1. Lee `QUICK_REFERENCE_COSTOS_2025_12_27.md`
2. Ten a mano: `BITACORA_SESION_27_DIC_INTEGRACION_COSTS.md`
3. Abre el archivo: `/Users/josegomez/Documents/Code/SaaS/Copilot/apps/frontend/src/app/(dashboard)/costs/page.tsx`
4. Abre devtools del navegador en pestaña Console

---

## PASO 1: Agregar Imports (5 minutos)

### Ubicación: Líneas 1-6 del archivo

**ANTES:**
```tsx
/**
 * Costs V2 Page
 * CloudNexus Design - Complete Cost Analysis Implementation
 */

'use client';

import { useState } from 'react';
import { KPICardV2 } from '@/components/ui/KPICardV2';
```

**DESPUÉS:**
```tsx
/**
 * Costs V2 Page
 * CloudNexus Design - Complete Cost Analysis Implementation
 * Updated with real FinOps data integration
 */

'use client';

import { useState } from 'react';
import { format, subDays } from 'date-fns'; // NEW
import { useCombinedCostData, extractCostData, extractServiceData, extractTrendData } from '@/hooks/useCosts'; // NEW
import { KPICardV2 } from '@/components/ui/KPICardV2';
```

### Verificación
- [ ] Imports agregados sin errores
- [ ] Console no muestra errores

---

## PASO 2: Crear Helper para Rango de Fechas (10 minutos)

### Ubicación: Después de imports, antes del componente

**CÓDIGO A AGREGAR:**
```tsx
// Helper function to calculate date range based on selected range
const getDateRange = (range: '7d' | '30d' | '90d') => {
  const endDate = new Date();
  const daysToSubtract = parseInt(range);
  const startDate = subDays(endDate, daysToSubtract);

  return {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
  };
};

export default function CostsV2Page() {
  // ... resto del código
```

### Verificación
- [ ] Función creada sin errores sintácticos
- [ ] Se puede llamar con ('7d' | '30d' | '90d')

---

## PASO 3: Reemplazar el Estado y Agregar Hook (15 minutos)

### Ubicación: Dentro del componente CostsV2Page, línea ~93

**ANTES:**
```tsx
export default function CostsV2Page() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  return (
    <div className="p-6 space-y-6">
```

**DESPUÉS:**
```tsx
export default function CostsV2Page() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Calculate date range based on selected timeRange
  const dateRange = getDateRange(timeRange);

  // Fetch all cost data
  const { costs, costsByService, trends, anomalies, isLoading, hasError, isSuccess } =
    useCombinedCostData(dateRange);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-400 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading cost data...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (hasError) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h3 className="text-red-900 dark:text-red-200 font-semibold mb-2">Failed to Load Cost Data</h3>
          <p className="text-red-700 dark:text-red-300 text-sm mb-4">
            Unable to fetch cost information. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
```

### Verificación
- [ ] Hook `useCombinedCostData` llamado correctamente
- [ ] Loading UI visible en consola de navegador
- [ ] Error UI visible si agregamos error para test

---

## PASO 4: Reemplazar KPI Cards (20 minutos)

### Ubicación: Líneas 134-172 (sección de KPI Cards)

**ANTES:**
```tsx
{/* KPI Cards */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <KPICardV2
    icon="attach_money"
    label="Total Spend (MTD)"
    value="$10,900"
    variant="blue"
    trend={{
      direction: 'up',
      percentage: 12,
      label: 'vs last month',
    }}
  />
  {/* ... más cards hardcodeados ... */}
</div>
```

**DESPUÉS:**
```tsx
{/* KPI Cards */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Extract data from API response */}
  {isSuccess && (
    <>
      <KPICardV2
        icon="attach_money"
        label="Total Spend (MTD)"
        value={`$${(extractCostData(costs.data)?.total || 0).toLocaleString()}`}
        variant="blue"
        trend={{
          direction: 'up',
          percentage: 12,
          label: 'vs last month',
        }}
      />
      <KPICardV2
        icon="savings"
        label="Potential Savings"
        value="$1,850"
        variant="emerald"
        comparison="From recommendations"
      />
      <KPICardV2
        icon="trending_up"
        label="Forecast (Month End)"
        value={`$${((extractCostData(costs.data)?.total || 0) * 1.14).toLocaleString()}`}
        variant="orange"
        trend={{
          direction: 'up',
          percentage: 8,
        }}
      />
      <KPICardV2
        icon="analytics"
        label="Daily Average"
        value={`$${Math.round((extractCostData(costs.data)?.total || 0) / 30).toLocaleString()}`}
        variant="indigo"
        trend={{
          direction: 'down',
          percentage: 3,
        }}
      />
    </>
  )}
</div>
```

### Verificación
- [ ] KPI cards muestran valores numéricos
- [ ] Valores cambian cuando seleccionas diferente timeRange
- [ ] No hay errores de tipo en console

---

## PASO 5: Reemplazar Array serviceBreakdown (15 minutos)

### Ubicación: Líneas 26-32 (declaración de array)

**ANTES:**
```tsx
const serviceBreakdown = [
  { name: 'EC2 Instances', aws: 2800, azure: 1200, gcp: 800 },
  { name: 'Storage', aws: 600, azure: 900, gcp: 400 },
  { name: 'Networking', aws: 400, azure: 500, gcp: 300 },
  { name: 'Database', aws: 800, azure: 600, gcp: 500 },
  { name: 'Other', aws: 600, azure: 800, gcp: 500 },
];
```

**DESPUÉS:**
```tsx
// Transform API data for chart (computed variable)
const serviceBreakdown = isSuccess && extractServiceData(costsByService.data)?.services
  ? extractServiceData(costsByService.data)!.services.reduce((acc: any[], service) => {
      const existing = acc.find(s => s.name === service.service);
      if (existing) {
        if (service.provider === 'AWS') existing.aws = service.totalCost;
        else if (service.provider === 'AZURE') existing.azure = service.totalCost;
        else if (service.provider === 'GCP') existing.gcp = service.totalCost;
      } else {
        acc.push({
          name: service.service,
          aws: service.provider === 'AWS' ? service.totalCost : 0,
          azure: service.provider === 'AZURE' ? service.totalCost : 0,
          gcp: service.provider === 'GCP' ? service.totalCost : 0,
        });
      }
      return acc;
    }, [])
  : [];
```

### Verificación
- [ ] Array se construye a partir de datos del API
- [ ] Gráfico se renderiza sin errores
- [ ] Valores cambian con timeRange

---

## PASO 6: Reemplazar Array costByProvider (10 minutos)

### Ubicación: Líneas 34-38

**ANTES:**
```tsx
const costByProvider = [
  { name: 'AWS', value: 4800, color: '#FF9900' },
  { name: 'Azure', value: 3600, color: '#0078D4' },
  { name: 'GCP', value: 2500, color: '#34A853' },
];
```

**DESPUÉS:**
```tsx
// Transform API data for provider chart
const costByProvider = isSuccess && extractCostData(costs.data)?.costs
  ? extractCostData(costs.data)!.costs.reduce((acc: any[], cost) => {
      const providerMap: Record<string, { color: string; name: string }> = {
        'AWS': { color: '#FF9900', name: 'AWS' },
        'AZURE': { color: '#0078D4', name: 'Azure' },
        'GCP': { color: '#34A853', name: 'GCP' },
      };

      const existing = acc.find(p => p.name === providerMap[cost.provider]?.name);
      const provider = providerMap[cost.provider];

      if (existing) {
        existing.value += cost.amount;
      } else if (provider) {
        acc.push({
          name: provider.name,
          value: cost.amount,
          color: provider.color,
        });
      }

      return acc;
    }, [])
  : [];
```

### Verificación
- [ ] Gráfico de pastel muestra providers
- [ ] Colores correctos (AWS orange, Azure blue, GCP green)
- [ ] Porcentajes suman 100%

---

## PASO 7: Reemplazar Array topCostResources (15 minutos)

### Ubicación: Líneas 40-91

**ANTES:**
```tsx
const topCostResources = [
  {
    id: '1',
    name: 'prod-web-cluster',
    type: 'EC2 Instance',
    provider: 'AWS',
    region: 'us-east-1',
    cost: '$1,245',
    trend: 8,
    utilizaton: 78,
  },
  // ... 4 más ...
];
```

**DESPUÉS:**
```tsx
// Get top cost resources from API
const topCostResources = isSuccess && extractCostData(costs.data)?.topResources
  ? extractCostData(costs.data)!.topResources.slice(0, 5).map((resource: any) => ({
      id: resource.id,
      name: resource.name,
      type: resource.type,
      provider: resource.provider,
      region: resource.region || 'N/A',
      cost: `$${resource.cost.toLocaleString()}`,
      trend: resource.trend,
      utilization: resource.utilization || 0, // Fixed typo: utilizaton -> utilization
    }))
  : [];
```

### Verificación
- [ ] Tabla muestra recursos reales
- [ ] Typo `utilizaton` es corregido a `utilization`
- [ ] Tabla se actualiza cuando cambias timeRange

---

## PASO 8: Verificar y Arreglar Rendering de Tabla (5 minutos)

### Ubicación: Línea ~395 en tabla

**BUSCA:**
```tsx
{resource.utilizaton}%
```

**REEMPLAZA CON:**
```tsx
{resource.utilization}%
```

### Verificación
- [ ] No hay errores en console
- [ ] Porcentaje de utilización muestra correctamente

---

## PASO 9: Testing en Navegador (20 minutos)

### Prueba 1: Carga Inicial
- [ ] Página carga sin errores
- [ ] Ves loading spinner brevemente
- [ ] Datos aparecen después de que loading termina
- [ ] Console no muestra errores

### Prueba 2: Cambio de TimeRange
- [ ] Click en "7 Days"
- [ ] Datos se actualizan
- [ ] Gráficos cambian
- [ ] KPI cards tienen nuevos valores
- [ ] Tabla se actualiza
- [ ] No hay parpadeo innecesario

### Prueba 3: Cambio de 30 Days
- [ ] Click en "30 Days"
- [ ] Los valores aumentan significativamente
- [ ] Toda la página se actualiza correctamente

### Prueba 4: Cambio de 90 Days
- [ ] Click en "90 Days"
- [ ] Los valores son mayores aún
- [ ] Todo funciona suavemente

### Prueba 5: Datos Razonables
- [ ] Los valores mostrados son razonables
- [ ] No hay $0 en todas partes
- [ ] Los trends (up/down) tienen sentido

### Prueba 6: Dark Mode (si tienes tema oscuro habilitado)
- [ ] Página se ve bien en dark mode
- [ ] Colores de gráficos visibles
- [ ] Texto legible

---

## PASO 10: Documentación Final (10 minutos)

### Actualizar Bitácora
1. Abre `BITACORA_SESION_27_DIC_INTEGRACION_COSTS.md`
2. Ve a sección "Cronología Detallada"
3. Agrega entrada como:

```markdown
### [HH:MM] UTC - Integración CostsPage Completada
**Acción Realizada:**
- Agregados imports de hooks
- Implementado helper getDateRange()
- Reemplazados arrays hardcodeados con datos del API
- Agregado loading state
- Agregado error handling
- Corregido typo utilizaton → utilization

**Código Modificado:**
- Archivo: /apps/frontend/src/app/(dashboard)/costs/page.tsx
- Cambios: 7 (imports, hook call, KPI cards, arrays, table fix)

**Validación:**
- [x] Carga sin errores
- [x] Cambio de timeRange actualiza datos
- [x] Dark mode funciona
- [x] No hay errores en console

**Próximo Paso:** Testing E2E y deployment
```

---

## SI ALGO SALE MAL...

### Error: "useCombinedCostData is not defined"
**Solución:** Verifica que agregaste el import correcto:
```tsx
import { useCombinedCostData, extractCostData, extractServiceData } from '@/hooks/useCosts';
```

### Error: "extractCostData is not a function"
**Solución:** Asegúrate que está en el import anterior

### Error: "format is not a function"
**Solución:** Verifica que importaste de 'date-fns':
```tsx
import { format, subDays } from 'date-fns';
```

### Datos no se actualizan cuando cambio timeRange
**Solución:** Verifica que dateRange está siendo pasado al hook:
```tsx
const dateRange = getDateRange(timeRange);
const { ... } = useCombinedCostData(dateRange); // dateRange debe estar aquí
```

### Valores de KPI están undefined
**Solución:** Revisa que estés usando extractCostData correctamente:
```tsx
extractCostData(costs.data)?.total || 0
```

---

## RESUMEN RÁPIDO

**Si haces estos 10 pasos exactamente como están, la página de costos estará completamente integrada con datos reales del API.**

**Tiempo total:** 1.5-2 horas
**Dificultad:** Media
**Soporte:** Consulta QUICK_REFERENCE_COSTOS si tienes dudas

**Después de esto:**
- [ ] Commit cambios a git
- [ ] Crear PR con descripción clara
- [ ] Solicitar code review
- [ ] Merge a main/develop

---

**Generado:** 2025-12-27 14:45 UTC
**Sesión:** Integración Frontend-Backend Costos
**Propósito:** Guía paso a paso para próxima sesión de desarrollo
