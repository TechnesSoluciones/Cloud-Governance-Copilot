# Referencia Rápida: Integración Costos Frontend-Backend
**Generado:** 2025-12-27 14:30 UTC
**Propósito:** Consulta rápida durante integración en tiempo real

---

## STATUS DE INFRA ACTUAL

✓ Backend endpoints completos y funcionando
✓ Hooks React Query listos en frontend
✓ Cliente API configurado
✓ Tipos TypeScript completos

---

## ARCHIVOS CLAVE

### Frontend
```
/apps/frontend/src/app/(dashboard)/costs/page.tsx ← EDITAR AQUÍ
/apps/frontend/src/hooks/useCosts.ts ← Hooks listos
/apps/frontend/src/lib/api/finops.ts ← Cliente API
```

### Backend
```
/apps/api-gateway/src/modules/finops/routes/index.ts ← Endpoints
/apps/api-gateway/src/modules/finops/controllers/costs.controller.ts ← Lógica
```

---

## HOOKS DISPONIBLES

### Hook Principal
```typescript
const { costs, costsByService, trends, anomalies, isLoading, hasError } =
  useCombinedCostData({ startDate: '2024-01-01', endDate: '2024-01-31' });
```

### Hooks Específicos
```typescript
const { data: costs } = useCosts(params);
const { data: byService } = useCostsByService(params);
const { data: trends } = useCostTrends(params);
const { data: anomalies } = useAnomalies(params);
```

### Utility Functions
```typescript
const data = extractCostData(costs.data); // Extrae respuesta
const services = extractServiceData(costsByService.data);
const trendData = extractTrendData(trends.data);
```

---

## PARÁMETROS REQUERIDOS

### DateRangeParams
```typescript
{
  startDate: 'YYYY-MM-DD', // Requerido
  endDate: 'YYYY-MM-DD'    // Requerido
}
```

### Ejemplo de Uso en CostsPage
```typescript
const getDateRange = (range: '7d' | '30d' | '90d') => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(range));

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
};
```

---

## CAMBIOS EN CostsPage

### 1. Imports a Agregar
```tsx
import { useCombinedCostData, extractCostData } from '@/hooks/useCosts';
```

### 2. Estado
```tsx
const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
const dateRange = getDateRange(timeRange);
const { costs, costsByService, trends, isLoading, hasError } = useCombinedCostData(dateRange);
```

### 3. KPI Cards - Reemplazar
```tsx
// ANTES:
<KPICardV2 value="$10,900" ... />

// DESPUÉS:
<KPICardV2
  value={`$${extractCostData(costs.data)?.total?.toLocaleString() || '0'}`}
  ...
/>
```

### 4. Arrays de Datos - Reemplazar
```tsx
// ANTES:
const serviceBreakdown = [ { name: 'EC2 Instances', aws: 2800, ... }, ... ];

// DESPUÉS:
const serviceBreakdown =
  extractServiceData(costsByService.data)?.byService?.map(s => ({
    name: s.service,
    aws: s.provider === 'AWS' ? s.totalCost : 0,
    // ...
  })) || [];
```

---

## ESTRUCTURA DE RESPUESTA DEL API

### CostsResponse
```json
{
  "costs": [
    {
      "id": "string",
      "provider": "AWS|AZURE|GCP",
      "date": "YYYY-MM-DD",
      "amount": 1234.56,
      "service": "EC2"
    }
  ],
  "total": 12450,
  "previousMonthTotal": 11100,
  "topResources": [
    {
      "id": "res-1",
      "name": "prod-web-cluster",
      "type": "EC2",
      "cost": 1245,
      "trend": 8,
      "utilization": 78
    }
  ]
}
```

### CostsByServiceResponse
```json
{
  "byService": [
    {
      "service": "EC2 Instances",
      "provider": "AWS",
      "totalCost": 2800,
      "percentage": 25.6,
      "itemCount": 12
    }
  ]
}
```

---

## TROUBLESHOOTING RÁPIDO

### Problema: "Hook is missing dateRange"
**Solución:** Asegúrate de pasar `{ startDate, endDate }` al hook

### Problema: "data is undefined"
**Solución:** Usa funciones `extractCostData()` que manejan undefined

### Problema: Datos no actualizan cuando cambia timeRange
**Solución:** El hook debe depender de `dateRange`, incluye en useEffect si es necesario

### Problema: "isLoading siempre true"
**Solución:** Verifica que `startDate` y `endDate` estén correctamente formateados

---

## VALIDACIONES

### Formato de Fecha DEBE ser:
```
YYYY-MM-DD
✓ 2024-01-31
✗ 01/31/2024
✗ 2024-1-31
```

### Provider VALUES:
```
'AWS' (no 'aws')
'AZURE' (no 'azure')
'GCP' (no 'gcp')
'ALL' (para todos)
```

---

## CHECKLIST DE INTEGRACIÓN

- [ ] Imports de hooks agregados
- [ ] Función getDateRange() implementada
- [ ] Hook useCombinedCostData() integrado
- [ ] KPI cards reemplazadas con datos del API
- [ ] Arrays reemplazados con datos del API
- [ ] Loading state implementado
- [ ] Error handling implementado
- [ ] Cambio de timeRange actualiza datos
- [ ] Verificar en navegador sin errores de consola
- [ ] Validar que datos mostrados son razonables
- [ ] Probar con diferentes timeRanges

---

**Última actualización:** 2025-12-27 14:30 UTC
**Sesión:** Integración Costos Frontend-Backend
