# Rediseño Frontend - Guía Rápida de Referencia

## Visión General en 30 Segundos

**Qué:** Rediseño radical de 6 pantallas principales del frontend
**Cuándo:** 13-15 semanas (3-4 meses)
**Cómo:** Migración incremental con feature flags
**Quién:** 2-3 developers + 1 tech lead
**Por qué:** Modernizar UI, mejorar UX, alinearse con estándares enterprise

---

## Roadmap Visual

```
Semanas
  1-2  │ FASE 0: PREPARACIÓN
       │ • Design system V2
       │ • Feature flags setup
       │ • Estructura de carpetas
       │
  3-5  │ FASE 1: COMPONENTES BASE
       │ • Layouts V2
       │ • UI components core
       │ • Charts & visualizations
       │
  6-7  │ FASE 2: DASHBOARD ⭐
       │ • Pantalla principal
       │ • KPI cards, charts
       │ • Testing & rollout
       │
  8-9  │ FASE 3: RECOMENDACIONES ⭐
       │ • Layout híbrido
       │ • Drawer lateral
       │ • Filtros avanzados
       │
 10-11 │ FASE 4: CONNECTIONS
       │ • Top-nav layout
       │ • Configuration drawer
       │
 11-12 │ FASE 5: SECURITY
       │ • Tablas densas
       │ • Compliance scores
       │
 12-13 │ FASE 6: COSTOS
       │ • Charts complejos
       │ • Forecast projections
       │
 13-14 │ FASE 7: INVENTARIO
       │ • Listado virtualizado
       │ • Bulk operations
       │
 14-15 │ FASE 8: CLEANUP
       │ • Code cleanup
       │ • Performance optimization
       │ • Final testing
```

**⭐ = Prioridad máxima (MVP)**

---

## Checklist de Inicio Rápido

### Antes de Empezar
- [ ] Leer `FRONTEND_REDESIGN_MASTER_PLAN.md` completo
- [ ] Validar diseños con stakeholders
- [ ] Confirmar recursos disponibles
- [ ] Setup de proyecto tracking (Jira/Linear)
- [ ] Crear rama `feature/redesign-v2` en Git

### Primera Semana
- [ ] Actualizar `tailwind.config.ts` con colores nuevos
- [ ] Crear carpeta `/components/ui-v2`
- [ ] Implementar sistema de feature flags
- [ ] Setup variable `ENABLE_NEW_DESIGN`
- [ ] Documentar design system V2

### Segunda Semana
- [ ] Crear layouts base (SidebarLayoutV2, TopNavLayoutV2)
- [ ] Implementar primeros componentes (KPICard, StatusBadge)
- [ ] Setup Storybook (opcional)
- [ ] Unit tests para componentes nuevos

---

## Componentes Críticos a Construir

### Layout Components (Fase 1)
```tsx
// components/layout-v2/
├── LayoutProvider.tsx       // Context para tipo de layout
├── SidebarLayoutV2.tsx      // Layout estilo Dashboard
├── TopNavLayoutV2.tsx       // Layout estilo Connections
└── HybridLayout.tsx         // Combinación flexible
```

### UI Components Core (Fase 1)
```tsx
// components/ui-v2/
├── KPICard.tsx              // Cards de métricas con trending
├── StatusBadge.tsx          // Badges con dots animados
├── ProviderToggle.tsx       // Filtro AWS/Azure/GCP
├── Drawer.tsx               // Panel lateral slide-in
├── BreadcrumbNav.tsx        // Navegación jerárquica
├── FilterToolbar.tsx        // Barra de filtros avanzada
├── RecommendationCard.tsx   // Card con border-left coloreado
└── ConnectionCard.tsx       // Card con provider branding
```

### Chart Components (Fase 1)
```tsx
// components/charts-v2/
├── CostTrendChart.tsx       // Gráfico de líneas con gradientes
├── CircularProgress.tsx     // Score circular
├── BarChart.tsx             // Mini gráfico inline
└── ProviderDistribution.tsx // Pie chart
```

---

## Configuración Tailwind Actualizada

### Colores Principales
```javascript
// tailwind.config.ts - Actualizar
colors: {
  primary: {
    DEFAULT: '#f2780d',      // NUEVO (era #ff6b35)
    hover: '#d96a0b',
    light: '#fdecdb',
  },
  'background-light': '#f8f7f5',
  'background-dark': '#221810',
  'surface-light': '#ffffff',
  'surface-dark': '#2d2d2d',
  // ... más colores en el plan maestro
}
```

### Componentes de Ejemplo
```javascript
// Usar en componentes
className="bg-primary hover:bg-primary-hover"
className="bg-background-light dark:bg-background-dark"
className="border-l-4 border-l-primary"  // Para RecommendationCard
```

---

## Feature Flags Reference

### Implementación Básica
```typescript
// lib/feature-flags.ts
export const featureFlags = {
  enable_dashboard_v2: process.env.NEXT_PUBLIC_ENABLE_DASHBOARD_V2 === 'true',
  enable_recommendations_v2: process.env.NEXT_PUBLIC_ENABLE_RECOMMENDATIONS_V2 === 'true',
  enable_connections_v2: process.env.NEXT_PUBLIC_ENABLE_CONNECTIONS_V2 === 'true',
  enable_security_v2: process.env.NEXT_PUBLIC_ENABLE_SECURITY_V2 === 'true',
  enable_costs_v2: process.env.NEXT_PUBLIC_ENABLE_COSTS_V2 === 'true',
  enable_inventory_v2: process.env.NEXT_PUBLIC_ENABLE_INVENTORY_V2 === 'true',
};
```

### Uso en Componentes
```typescript
import { featureFlags } from '@/lib/feature-flags';

export default function DashboardPage() {
  if (featureFlags.enable_dashboard_v2) {
    return <DashboardV2 />;
  }
  return <DashboardLegacy />;
}
```

### .env.local
```bash
# Feature Flags - Desarrollo
NEXT_PUBLIC_ENABLE_DASHBOARD_V2=true
NEXT_PUBLIC_ENABLE_RECOMMENDATIONS_V2=false
NEXT_PUBLIC_ENABLE_CONNECTIONS_V2=false
NEXT_PUBLIC_ENABLE_SECURITY_V2=false
NEXT_PUBLIC_ENABLE_COSTS_V2=false
NEXT_PUBLIC_ENABLE_INVENTORY_V2=false
```

---

## Testing Checklist por Fase

### Unit Tests
```bash
npm run test:unit -- --coverage
# Target: > 80% coverage
```

**Qué testear:**
- [ ] Props rendering correctamente
- [ ] Event handlers funcionan
- [ ] Conditional rendering
- [ ] Edge cases (data vacía, errors)

### E2E Tests
```bash
npm run test:e2e
npm run test:e2e:ui  # Para debugging
```

**Flows críticos:**
- [ ] Login → Dashboard → Ver KPIs
- [ ] Dashboard → Filtrar por provider
- [ ] Recommendations → Abrir drawer → Ver detalles
- [ ] Connections → Configurar provider → Guardar

### Accessibility Tests
```bash
npm run test:a11y  # (a crear)
```

**Checks manuales:**
- [ ] Navegación completa con keyboard (Tab, Enter, Esc)
- [ ] Screen reader friendly (usar NVDA/JAWS)
- [ ] Contraste de colores WCAG AA
- [ ] Focus visible en todos los elementos interactivos

### Performance Tests
```bash
npm run lighthouse
npm run bundle-analyzer
```

**Métricas objetivo:**
- [ ] Lighthouse score > 90
- [ ] FCP < 1.5s
- [ ] TTI < 3s
- [ ] Bundle size < 500KB (gzipped)

---

## Git Workflow

### Estructura de Ramas
```
main
  └── feature/redesign-v2
        ├── feature/redesign-v2-phase0
        ├── feature/redesign-v2-phase1
        ├── feature/redesign-v2-dashboard
        ├── feature/redesign-v2-recommendations
        └── ...
```

### Commit Message Convention
```bash
# Formato
<type>(<scope>): <subject>

# Ejemplos
feat(ui-v2): add KPICard component
fix(dashboard-v2): correct KPI trending calculation
refactor(layout-v2): extract common sidebar logic
test(components): add unit tests for StatusBadge
docs(redesign): update component documentation
```

**Types:** feat, fix, refactor, test, docs, style, chore

### Pull Request Template
```markdown
## Descripción
[Descripción breve del cambio]

## Fase del Proyecto
- [ ] Fase 0 - Preparación
- [x] Fase 1 - Componentes Base
- [ ] Fase 2 - Dashboard
- [ ] ...

## Checklist
- [x] Tests agregados/actualizados
- [x] Documentación actualizada
- [x] Lighthouse score verificado
- [x] Accessibility checklist completado
- [ ] Feature flag configurado (si aplica)

## Screenshots
[Agregar screenshots del componente/pantalla]

## Testing Notes
[Cómo testear manualmente este PR]
```

---

## Comandos Útiles

### Desarrollo
```bash
# Iniciar dev server
npm run dev

# Build y verificar
npm run build
npm run start

# Linting
npm run lint
npm run lint:fix
```

### Testing
```bash
# Unit tests
npm run test
npm run test:watch
npm run test:coverage

# E2E tests
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:debug
npm run test:e2e:report

# Accessibility
npx @axe-core/cli http://localhost:3000/dashboard
```

### Performance
```bash
# Bundle analysis
npm run analyze

# Lighthouse
npm run lighthouse -- --url=http://localhost:3000/dashboard

# Performance profiling
npm run build
npm run start
# Open Chrome DevTools → Performance → Record
```

---

## Troubleshooting Common Issues

### Bundle Size Explosion
**Síntoma:** Build size > 1MB
**Solución:**
```bash
# Analizar bundle
npm run analyze

# Identificar culpables (usualmente)
# - Lodash sin tree-shaking
# - Moment.js (usar date-fns)
# - Recharts completo (import específico)

# Fix example
# ❌ import _ from 'lodash'
# ✅ import debounce from 'lodash/debounce'
```

### Slow Build Times
**Síntoma:** Build > 2 minutos
**Solución:**
```bash
# Usar SWC (ya configurado en Next.js 14)
# Verificar .next/cache no corrupta
rm -rf .next
npm run build

# Paralelizar si posible
# next.config.js
module.exports = {
  experimental: {
    cpus: 4  // Ajustar según tu CPU
  }
}
```

### Hydration Errors
**Síntoma:** "Hydration failed" en console
**Solución:**
```tsx
// Evitar renderizado diferente cliente/servidor
// ❌ Mal
<div>{new Date().toString()}</div>

// ✅ Bien
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;
```

### Accessibility Issues
**Síntoma:** axe-core reporta errores
**Solución:**
```tsx
// Asegurar ARIA labels
<button aria-label="Close dialog">
  <X className="h-4 w-4" aria-hidden="true" />
</button>

// Keyboard navigation
<div role="button" tabIndex={0} onKeyDown={handleKeyDown}>
  {content}
</div>

// Color contrast
// Verificar en https://webaim.org/resources/contrastchecker/
```

---

## Recursos y Referencias

### Documentación
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/)
- [React Query](https://tanstack.com/query/latest)
- [Playwright](https://playwright.dev/)

### Design References
- Archivos HTML: `/diseño/HTML/`
- Screenshots: `/diseño/Fotos/`
- Design System: (a documentar en Fase 0)

### Internal Docs
- Plan Maestro: `/FRONTEND_REDESIGN_MASTER_PLAN.md`
- Component Library: (a crear en Storybook)
- API Docs: `/docs/api/`

### Tools
- Figma: (link a diseños)
- Jira/Linear: (link a proyecto)
- Slack: #frontend-redesign
- Feature Flags: (LaunchDarkly dashboard o custom)

---

## FAQ

### ¿Por qué migración incremental y no big bang?
- **Menor riesgo:** Rollback fácil con feature flags
- **Feedback temprano:** Usuarios beta dan input
- **Desarrollo paralelo:** No bloquea otras features
- **Testing mejor:** Más tiempo por pantalla

### ¿Qué pasa con el código legacy?
- Se mantiene hasta Fase 8
- Feature flags permiten switch fácil
- Cleanup final al terminar todas las pantallas
- No se elimina hasta confirmar que V2 es estable

### ¿Cómo manejar cambios de diseño mid-project?
- **Design freeze** después de Fase 0
- Change request process formal
- Evaluar impacto en timeline
- Solo cambios críticos aceptados

### ¿Qué hacer si nos atrasamos?
1. Identificar bottleneck (daily standup)
2. Re-priorizar tareas
3. Considerar reducir scope (MVP first)
4. Pedir recursos adicionales si necesario
5. Comunicar a stakeholders ASAP

### ¿Cómo garantizar calidad con timeline ajustado?
- **Quality gates:** Tests obligatorios en cada PR
- **Code reviews:** 2 approvals mínimo
- **Lighthouse CI:** Automático en cada deploy
- **Beta testing:** Usuarios reales antes de full rollout
- **Monitoring:** Sentry + analytics en producción

---

## Contactos y Escalación

### Equipo Core
- **Tech Lead:** [Nombre] - @handle
- **Frontend Dev 1:** [Nombre] - @handle
- **Frontend Dev 2:** [Nombre] - @handle
- **QA Engineer:** [Nombre] - @handle

### Stakeholders
- **Product Owner:** [Nombre] - @handle
- **UI/UX Lead:** [Nombre] - @handle
- **Engineering Manager:** [Nombre] - @handle

### Escalación
1. **Blocker técnico:** Tech Lead
2. **Decisión de producto:** Product Owner
3. **Decisión de diseño:** UI/UX Lead
4. **Recursos/timeline:** Engineering Manager

### Canales
- Slack: #frontend-redesign (general)
- Slack: #frontend-redesign-urgent (blocker)
- Email: team@company.com
- Stand-up: Daily 10:00 AM
- Planning: Lunes 2:00 PM
- Demo: Viernes 4:00 PM

---

**Última actualización:** 2025-12-26
**Próxima revisión:** Post-Fase 1
