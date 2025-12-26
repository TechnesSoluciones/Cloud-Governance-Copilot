# Plan Maestro de Rediseño Frontend - Cloud Copilot
**Proyecto:** Rediseño Radical del Frontend
**Líder de Proyecto:** Orquestador Principal
**Fecha:** 2025-12-26
**Versión:** 1.0

---

## 1. RESUMEN EJECUTIVO

### 1.1 Contexto del Proyecto
Se requiere un rediseño radical del frontend de Cloud Copilot para modernizar la interfaz, mejorar la experiencia de usuario y alinearla con diseños enterprise-grade similares a Azure Portal, AWS Console y GCP Console.

### 1.2 Alcance del Rediseño
El proyecto abarca **6 pantallas principales** con diseños completamente nuevos:
1. **Dashboard** - Vista general multi-cloud
2. **Recomendaciones** - Insights accionables de optimización
3. **Connections** - Gestión de conectores cloud
4. **Inventario** - Gestión de recursos
5. **Costos** - Análisis financiero
6. **Security** - Alertas y compliance

### 1.3 Estado Actual vs. Diseño Objetivo

#### ESTADO ACTUAL
- **Framework:** Next.js 14.2.15 (App Router)
- **UI Library:** Radix UI + shadcn/ui
- **Styling:** Tailwind CSS con design system propio
- **Arquitectura:** Component-based con separación clara
- **Layout:** Sidebar + TopNav tradicional
- **Color primario:** Orange (#ff6b35)
- **Testing:** Playwright E2E configurado

#### DISEÑO OBJETIVO
- **Estilo visual:** Enterprise-grade (Azure/AWS-inspired)
- **Color primario:** Orange (#f2780d) - levemente ajustado
- **Layout:** Múltiples variantes por pantalla (sidebar/top-nav híbrido)
- **Componentes:** Cards modernos, tablas densas, visualizaciones avanzadas
- **Interactividad:** Drawers laterales, filtros avanzados, estados en tiempo real
- **Responsividad:** Mobile-first mejorado

---

## 2. ANÁLISIS ARQUITECTÓNICO

### 2.1 Estructura Actual del Frontend

```
apps/frontend/
├── src/
│   ├── app/
│   │   └── (dashboard)/          # Rutas protegidas
│   │       ├── layout.tsx         # Layout principal
│   │       ├── dashboard/
│   │       ├── costs/
│   │       ├── security/
│   │       ├── resources/
│   │       ├── recommendations/
│   │       ├── cloud-accounts/
│   │       ├── assets/
│   │       ├── incidents/
│   │       ├── audit-logs/
│   │       ├── settings/
│   │       └── azure-advisor/
│   │
│   ├── components/
│   │   ├── layout/               # Sidebar, TopNav, PageWrapper
│   │   ├── ui/                   # shadcn/ui base components
│   │   ├── dashboard/            # Dashboard-specific
│   │   ├── costs/                # Cost-specific
│   │   ├── security/             # Security-specific
│   │   ├── recommendations/      # Recommendations-specific
│   │   ├── resources/            # Resources-specific
│   │   └── shared/               # Shared components
│   │
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utilities y API clients
│   ├── types/                    # TypeScript definitions
│   └── stores/                   # Zustand stores
│
├── tailwind.config.ts            # Design system config
└── package.json
```

### 2.2 Análisis del Nuevo Diseño

#### Dashboard (Dashboard.html)
**Características clave:**
- Sidebar vertical con logo prominente
- Top bar con filtros de proveedor (AWS/Azure/GCP)
- KPI cards (4 métricas principales)
- Chart principal de costos multi-provider
- Security health widget circular
- Tabla de recomendaciones
- Service status widget con mapa

**Componentes necesarios:**
- `CloudProviderToggle` - Filtro de proveedores
- `KPICard` - Cards de métricas con trending
- `CostChart` - Gráfico de líneas con gradientes
- `CircularProgress` - Score circular
- `RecommendationsTable` - Tabla con acciones
- `ServiceHealthWidget` - Status con indicadores

#### Recomendaciones (Recomendacion.html)
**Características clave:**
- Layout diferente: sidebar izquierdo + panel derecho (drawer)
- KPI stats (3 cards: Ahorro, Riesgos, Total)
- Toolbar de filtros avanzado
- Cards de recomendación con borders de severidad
- Panel lateral con detalles del recurso seleccionado
- Métricas visuales (gráficos de barras inline)
- Botones de acción contextuales

**Componentes necesarios:**
- `RecommendationCard` - Card con border-left coloreado
- `FilterToolbar` - Barra de filtros con dropdowns
- `ResourceDetailDrawer` - Panel lateral slide-in
- `MetricChart` - Mini gráfico de barras
- `ActionButton` - Botones primarios/secundarios

#### Connections (Connections.html)
**Características clave:**
- Top navigation bar (sin sidebar permanente)
- Breadcrumbs
- Stats cards (3 métricas)
- Grid de cards de proveedores
- Cards con estado visual (border coloreado)
- Blade/Drawer lateral para configuración
- Forms complejos con validación
- Toggles para opciones

**Componentes necesarios:**
- `BreadcrumbNav` - Navegación jerárquica
- `ConnectionCard` - Card con provider branding
- `ConfigurationDrawer` - Panel lateral full-height
- `ProviderLogo` - Componente para logos cloud
- `StatusBadge` - Badge de estado con dot animado
- `FormGroup` - Grupos de inputs enterprise

#### Security (Security.html)
**Características clave:**
- Múltiples vistas de datos densos
- Tablas con muchas columnas
- Filtros y búsqueda avanzada
- Severity badges
- Timeline de eventos
- Compliance score cards

#### Costos (Costo.html)
**Características clave:**
- Charts complejos (barras, líneas, pie)
- Breakdown por servicio/región
- Trending indicators
- Budget alerts
- Forecast projections

#### Inventario (Inventario.html)
**Características clave:**
- Listado denso de recursos
- Filtros multi-dimensionales
- Agrupación por tipo/región/tag
- Quick actions
- Bulk operations

### 2.3 Gaps Identificados

| Área | Actual | Requerido | Gap |
|------|--------|-----------|-----|
| **Layout System** | Single (Sidebar+TopNav) | Múltiple (Sidebar, TopNav, Hybrid) | ALTO |
| **Provider Filtering** | No existe | Global provider toggle | ALTO |
| **Charts** | Básicos (recharts) | Avanzados SVG custom | MEDIO |
| **Drawers/Panels** | Modal básico | Slide-in panels | ALTO |
| **Cards** | Genéricos | Con borders de estado | BAJO |
| **Tables** | Básicas | Enterprise-grade densas | MEDIO |
| **Filters** | Simples | Toolbar complejo | MEDIO |
| **Badges** | Básicos | Con dots animados | BAJO |
| **Forms** | Simples | Enterprise con prefijos | MEDIO |
| **Breadcrumbs** | No existe | Navegación jerárquica | BAJO |
| **Color System** | #ff6b35 | #f2780d | BAJO |

---

## 3. ESTRATEGIA DE MIGRACIÓN

### 3.1 Enfoque Recomendado: **INCREMENTAL CON FEATURE FLAGS**

**Justificación:**
- Proyecto en producción - riesgo alto con big bang
- Permite testing A/B
- Rollback sencillo si hay problemas
- Desarrollo paralelo sin bloqueos
- Feedback temprano de usuarios

**Alternativa descartada (Big Bang):**
- Alto riesgo de regresiones
- Bloquea todo el desarrollo durante migración
- Testing más difícil
- Mayor probabilidad de downtime

### 3.2 Fases del Proyecto

#### FASE 0: PREPARACIÓN (1-2 semanas)
**Objetivo:** Establecer fundamentos del nuevo design system

**Tareas:**
1. Crear nuevo design system base
   - Actualizar `tailwind.config.ts` con nuevos colores
   - Definir nuevos componentes base en `/components/ui-v2`
   - Crear documentación Storybook (opcional)

2. Setup de feature flags
   - Implementar sistema de feature flags (LaunchDarkly o custom)
   - Crear variable de entorno `ENABLE_NEW_DESIGN`
   - Setup de rutas alternativas

3. Estructura de componentes nuevos
   ```
   components/
   ├── ui/              # Existente (shadcn)
   ├── ui-v2/           # NUEVO - Componentes nuevos
   ├── layout-v2/       # NUEVO - Layouts nuevos
   └── ...
   ```

**Entregables:**
- Design system V2 documentado
- Feature flags funcionales
- Estructura de carpetas preparada

**Riesgos:**
- Decisiones de diseño no finalizadas → Validar con stakeholders
- Conflictos con código existente → Namespace separado (v2)

---

#### FASE 1: FUNDAMENTOS Y COMPONENTES BASE (2-3 semanas)
**Objetivo:** Construir los building blocks del nuevo diseño

**Tareas Prioritarias:**

1. **Layout System V2**
   - [ ] `LayoutProvider` - Context para tipo de layout
   - [ ] `SidebarLayoutV2` - Sidebar estilo Dashboard.html
   - [ ] `TopNavLayoutV2` - TopNav estilo Connections.html
   - [ ] `HybridLayout` - Combinación flexible
   - [ ] Responsive behavior mejorado

2. **Componentes UI Core**
   - [ ] `KPICard` - Cards de métricas con trending
   - [ ] `StatusBadge` - Badges con dots animados
   - [ ] `ProviderToggle` - Filtro AWS/Azure/GCP
   - [ ] `Drawer` - Panel lateral slide-in
   - [ ] `BreadcrumbNav` - Navegación jerárquica
   - [ ] `FilterToolbar` - Barra de filtros avanzada

3. **Charts & Visualizations**
   - [ ] `CostTrendChart` - Gráfico de líneas con gradientes
   - [ ] `CircularProgress` - Score circular
   - [ ] `BarChart` - Mini gráfico inline
   - [ ] `ProviderDistributionChart` - Pie chart

**Dependencias:**
- Ninguna (primera fase)

**Testing:**
- Unit tests para cada componente
- Storybook stories (opcional)
- Visual regression tests con Playwright

**Estimación:** 2-3 semanas (1-2 developers)

**Riesgos:**
- Complejidad de charts personalizados → Considerar librería (recharts mejorado)
- Responsive behavior complejo → Mobile-first TDD

---

#### FASE 2: MIGRACIÓN DASHBOARD (2 semanas)
**Objetivo:** Rediseñar la pantalla más visible y crítica

**Tareas:**

1. **Dashboard Page V2**
   - [ ] Crear `/app/(dashboard-v2)/dashboard/page.tsx`
   - [ ] Implementar layout con sidebar nuevo
   - [ ] Integrar `CloudProviderToggle` global
   - [ ] Implementar 4 KPI cards principales
   - [ ] Integrar `CostTrendChart`
   - [ ] Crear `SecurityHealthWidget`
   - [ ] Implementar tabla de recomendaciones
   - [ ] Crear `ServiceHealthWidget`

2. **Data Integration**
   - [ ] Conectar con APIs existentes
   - [ ] Implementar polling para "live updates"
   - [ ] Manejar estados de loading/error
   - [ ] Cache strategy con React Query

3. **Testing**
   - [ ] E2E tests con Playwright
   - [ ] Performance testing (Core Web Vitals)
   - [ ] Accessibility audit

**Feature Flag:** `enable_dashboard_v2`

**Criterios de Éxito:**
- Load time < 2s
- Lighthouse score > 90
- Zero critical a11y issues
- Parity funcional con dashboard actual

**Rollout:**
- Week 1: Internal testing
- Week 2: Beta users (10%)
- Week 3: Gradual rollout (50%)
- Week 4: Full rollout (100%)

**Riesgos:**
- Performance con muchos widgets → Lazy loading, code splitting
- Datos en tiempo real → WebSocket optimizado

---

#### FASE 3: MIGRACIÓN RECOMENDACIONES (2 semanas)
**Objetivo:** Pantalla crítica para business value

**Tareas:**

1. **Recommendations Page V2**
   - [ ] Layout híbrido (sidebar + drawer)
   - [ ] KPI stats (3 cards)
   - [ ] `FilterToolbar` completo
   - [ ] `RecommendationCard` con borders de severidad
   - [ ] `ResourceDetailDrawer` lateral
   - [ ] Métricas inline
   - [ ] Botones de acción contextuales

2. **Features Avanzados**
   - [ ] Filtros persistentes (URL state)
   - [ ] Sorting multi-columna
   - [ ] Export a CSV/PDF
   - [ ] Bulk actions

**Feature Flag:** `enable_recommendations_v2`

**Dependencias:**
- Drawer component (Fase 1)
- FilterToolbar (Fase 1)

**Riesgos:**
- Drawer performance con datos grandes → Virtualización
- Filtros complejos → Usar librería (React Hook Form)

---

#### FASE 4: MIGRACIÓN CONNECTIONS (1.5 semanas)
**Objetivo:** Pantalla de configuración crítica

**Tareas:**

1. **Connections Page V2**
   - [ ] Top-nav layout (sin sidebar)
   - [ ] Breadcrumbs
   - [ ] Stats cards
   - [ ] Grid de `ConnectionCard`
   - [ ] `ConfigurationDrawer` con forms
   - [ ] Provider logos dinámicos
   - [ ] Status indicators

2. **Form Handling**
   - [ ] Validación compleja
   - [ ] Error handling
   - [ ] Success notifications
   - [ ] Auto-save drafts

**Feature Flag:** `enable_connections_v2`

**Riesgos:**
- Forms complejos → React Hook Form + Zod validation
- Secrets management → Enmascaramiento adecuado

---

#### FASE 5: MIGRACIÓN SECURITY (1.5 semanas)
**Objetivo:** Pantalla de compliance crítica

**Tareas:**

1. **Security Page V2**
   - [ ] Tablas densas enterprise
   - [ ] Severity badges
   - [ ] Timeline de eventos
   - [ ] Compliance score cards
   - [ ] Exportación de reportes

**Feature Flag:** `enable_security_v2`

**Riesgos:**
- Tablas con muchos datos → Virtualización (react-virtual)
- Compliance real-time → Optimizar polling

---

#### FASE 6: MIGRACIÓN COSTOS (1.5 semanas)
**Objetivo:** Analytics financiero avanzado

**Tareas:**

1. **Costs Page V2**
   - [ ] Charts complejos (multi-series)
   - [ ] Breakdown por dimensiones
   - [ ] Forecast projections
   - [ ] Budget alerts
   - [ ] Export financiero

**Feature Flag:** `enable_costs_v2`

**Dependencias:**
- Charts avanzados (Fase 1)

**Riesgos:**
- Charts pesados → Code splitting, lazy load
- Cálculos complejos → Web Workers

---

#### FASE 7: MIGRACIÓN INVENTARIO (1.5 semanas)
**Objetivo:** Gestión de recursos masiva

**Tareas:**

1. **Inventory Page V2**
   - [ ] Listado virtualizado
   - [ ] Filtros multi-dimensionales
   - [ ] Agrupación dinámica
   - [ ] Bulk operations
   - [ ] Export masivo

**Feature Flag:** `enable_inventory_v2`

**Riesgos:**
- Miles de recursos → Virtualización obligatoria
- Bulk operations → Background jobs

---

#### FASE 8: CLEANUP Y OPTIMIZACIÓN (1 semana)
**Objetivo:** Eliminar código legacy y optimizar

**Tareas:**

1. **Code Cleanup**
   - [ ] Remover componentes antiguos
   - [ ] Consolidar design system
   - [ ] Eliminar feature flags
   - [ ] Actualizar documentación

2. **Performance Optimization**
   - [ ] Bundle size analysis
   - [ ] Code splitting optimization
   - [ ] Image optimization
   - [ ] Caching strategy refinement

3. **Final Testing**
   - [ ] Full E2E suite
   - [ ] Load testing
   - [ ] Security audit
   - [ ] Accessibility final audit

**Entregables:**
- Código limpio sin legacy
- Documentación actualizada
- Performance report
- Post-mortem document

---

## 4. DEPENDENCIAS Y ORDEN DE IMPLEMENTACIÓN

### 4.1 Grafo de Dependencias

```
FASE 0 (Preparación)
  |
  ├─→ FASE 1 (Componentes Base)
  |     |
  |     ├─→ FASE 2 (Dashboard)
  |     ├─→ FASE 3 (Recomendaciones)
  |     ├─→ FASE 4 (Connections)
  |     ├─→ FASE 5 (Security)
  |     ├─→ FASE 6 (Costos)
  |     └─→ FASE 7 (Inventario)
  |
  └─→ FASE 8 (Cleanup)
```

**Nota:** Fases 2-7 pueden ejecutarse en paralelo después de Fase 1, pero recomendado secuencial para aprendizajes.

### 4.2 Camino Crítico

**Ruta crítica (mínimo viable):**
FASE 0 → FASE 1 → FASE 2 → FASE 8

**Tiempo mínimo:** 6-7 semanas

**Ruta completa (todas las pantallas):**
FASE 0 → FASE 1 → FASE 2-7 (secuencial) → FASE 8

**Tiempo completo:** 13-15 semanas

---

## 5. ESTRATEGIA DE TESTING

### 5.1 Niveles de Testing

1. **Unit Tests**
   - Todos los componentes nuevos
   - Cobertura mínima: 80%
   - Framework: Jest + React Testing Library

2. **Integration Tests**
   - Interacciones entre componentes
   - API integration
   - State management

3. **E2E Tests**
   - Playwright (ya existente)
   - Critical user flows
   - Visual regression tests

4. **Performance Tests**
   - Lighthouse CI
   - Core Web Vitals monitoring
   - Bundle size tracking

5. **Accessibility Tests**
   - axe-core integration
   - Manual keyboard navigation
   - Screen reader testing

### 5.2 Testing Strategy por Fase

| Fase | Unit | Integration | E2E | Visual | A11y |
|------|------|-------------|-----|--------|------|
| 0    | N/A  | N/A         | N/A | N/A    | N/A  |
| 1    | ✓✓✓  | ✓✓          | ✓   | ✓✓     | ✓✓✓  |
| 2-7  | ✓✓   | ✓✓✓         | ✓✓✓ | ✓✓✓    | ✓✓   |
| 8    | ✓    | ✓           | ✓✓✓ | ✓      | ✓✓✓  |

---

## 6. GESTIÓN DE RIESGOS

### 6.1 Riesgos Técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Performance degradation** | ALTA | ALTO | - Lazy loading obligatorio<br>- Code splitting agresivo<br>- Performance budget CI check |
| **Regresiones funcionales** | MEDIA | ALTO | - Feature flags granulares<br>- E2E tests comprehensivos<br>- Gradual rollout |
| **Inconsistencias de diseño** | MEDIA | MEDIO | - Design system estricto<br>- Component library centralizada<br>- Design QA en cada PR |
| **Problemas de accesibilidad** | MEDIA | ALTO | - A11y testing automatizado<br>- Manual testing con keyboard<br>- Audit en cada fase |
| **Bundle size explosion** | ALTA | MEDIO | - Bundle analyzer en CI<br>- Dynamic imports<br>- Tree shaking optimization |
| **State management complexity** | MEDIA | MEDIO | - Mantener Zustand simple<br>- React Query para server state<br>- Clear separation of concerns |
| **Browser compatibility** | BAJA | MEDIO | - Browserslist config<br>- Polyfills cuando necesario<br>- Cross-browser E2E tests |

### 6.2 Riesgos de Proyecto

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Scope creep** | ALTA | ALTO | - Strict scope definition<br>- Change request process<br>- Regular scope reviews |
| **Recursos insuficientes** | MEDIA | ALTO | - Priorización clara<br>- MVP definido<br>- Parallel workstreams si posible |
| **Cambios de diseño mid-project** | ALTA | ALTO | - Design freeze después Fase 0<br>- Change control board<br>- Design iterations pre-approved |
| **User adoption resistance** | MEDIA | MEDIO | - Early beta program<br>- Gradual rollout<br>- Training materials |
| **Technical debt accumulation** | MEDIA | MEDIO | - Code reviews estrictos<br>- Refactoring time allocated<br>- Quality gates |

### 6.3 Plan de Contingencia

**Si surgen problemas críticos:**
1. **Rollback inmediato** via feature flags
2. **Root cause analysis** en < 24h
3. **Fix rápido** o diferir feature
4. **Post-mortem** documentado

---

## 7. RECURSOS Y ESTIMACIONES

### 7.1 Equipo Recomendado

**Core Team:**
- 1 Tech Lead (Arquitecto)
- 2-3 Frontend Developers (React/TypeScript experts)
- 1 UI/UX Designer (Part-time, validación)
- 1 QA Engineer (Testing strategy)

**Support:**
- Backend team (API changes si necesario)
- DevOps (CI/CD, feature flags)
- Product Owner (decisiones de negocio)

### 7.2 Estimación de Esfuerzo

| Fase | Duración | Developer-weeks | Riesgo |
|------|----------|-----------------|--------|
| 0    | 1-2 sem  | 2-4 weeks       | BAJO   |
| 1    | 2-3 sem  | 6-9 weeks       | MEDIO  |
| 2    | 2 sem    | 6-8 weeks       | ALTO   |
| 3    | 2 sem    | 6-8 weeks       | MEDIO  |
| 4    | 1.5 sem  | 4-6 weeks       | BAJO   |
| 5    | 1.5 sem  | 4-6 weeks       | MEDIO  |
| 6    | 1.5 sem  | 4-6 weeks       | MEDIO  |
| 7    | 1.5 sem  | 4-6 weeks       | MEDIO  |
| 8    | 1 sem    | 2-3 weeks       | BAJO   |
| **TOTAL** | **13-15 sem** | **38-56 weeks** | - |

**Con 2 developers:** ~4-5 meses
**Con 3 developers:** ~3-4 meses

### 7.3 Costos Estimados

**Desarrollo:**
- 2 Senior Frontend Devs × 4 meses = 8 dev-months
- 1 Tech Lead × 4 meses (50% time) = 2 dev-months
- **Total:** ~10 dev-months

**Herramientas:**
- Feature flag service (LaunchDarkly): $100-200/month
- Design tools (Figma Pro): $50/month
- Testing tools (ya existentes): $0
- **Total:** ~$200/month × 4 = $800

**Total estimado:** Depende de rates internos + $800 tooling

---

## 8. CRITERIOS DE ÉXITO

### 8.1 Métricas de Calidad

**Performance:**
- [ ] Lighthouse score > 90 en todas las páginas
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Bundle size < 500KB (gzipped)

**Accessibility:**
- [ ] WCAG 2.1 AA compliance
- [ ] Zero critical a11y issues
- [ ] Keyboard navigation completa
- [ ] Screen reader friendly

**Testing:**
- [ ] Code coverage > 80%
- [ ] E2E test coverage > 70% critical paths
- [ ] Zero critical bugs en producción

**UX:**
- [ ] User satisfaction score > 4/5
- [ ] Task completion rate > 95%
- [ ] Reducción de clicks en flujos principales

### 8.2 Métricas de Negocio

- [ ] Adopción del nuevo diseño > 90% en 2 semanas
- [ ] Reducción de tickets de soporte relacionados con UI
- [ ] Mejora en engagement metrics (time on page, pages per session)
- [ ] Zero downtime durante migración

---

## 9. PLAN DE COMUNICACIÓN

### 9.1 Stakeholders

**Internos:**
- Equipo de desarrollo
- Product team
- Management
- QA team

**Externos (si aplica):**
- Beta users
- Clientes enterprise
- Support team

### 9.2 Cadencia de Updates

**Daily:**
- Standup con equipo de desarrollo (15 min)
- Slack updates en canal de proyecto

**Weekly:**
- Demo de progreso (viernes, 30 min)
- Retrospectiva/planning (lunes, 1 hora)
- Status report a stakeholders

**Monthly:**
- Executive summary
- Roadmap adjustment si necesario
- User feedback review

---

## 10. SIGUIENTE PASOS INMEDIATOS

### 10.1 Pre-kickoff (Esta semana)
- [ ] Presentar este plan a stakeholders
- [ ] Obtener approval de budget/recursos
- [ ] Confirmar prioridades de pantallas
- [ ] Validar diseños con UI/UX team
- [ ] Setup de proyecto tracking (Jira/Linear)

### 10.2 Kickoff (Próxima semana)
- [ ] Kick-off meeting con equipo completo
- [ ] Asignación de roles
- [ ] Setup de entorno de desarrollo
- [ ] Crear feature flag infrastructure
- [ ] Primera spike: Validar charts library

### 10.3 Sprint 1 (Semana 3-4)
- [ ] FASE 0 completa
- [ ] Iniciar FASE 1
- [ ] Design system V2 documentado
- [ ] Primeros componentes base

---

## 11. APÉNDICES

### A. Stack Tecnológico Detallado

**Core:**
- Next.js 14.2.15 (App Router)
- React 18.2.0
- TypeScript 5.3.3

**UI/Styling:**
- Tailwind CSS 3.3.6
- Radix UI (headless components)
- shadcn/ui (component library base)

**State Management:**
- Zustand 4.4.7 (client state)
- React Query 5.17.0 (server state)

**Charts/Visualizations:**
- Recharts 2.10.3 (considerar upgrade o alternativa)
- Custom SVG (para casos específicos)

**Forms:**
- React Hook Form (a agregar)
- Zod 3.22.4 (validación)

**Testing:**
- Playwright 1.57.0 (E2E)
- Jest + React Testing Library (unit)
- axe-core (a11y)

**Tooling:**
- ESLint 8.56.0
- Prettier (código style)
- Husky (git hooks)

### B. Naming Conventions

**Componentes nuevos:**
```
components/ui-v2/KPICard.tsx
components/layout-v2/SidebarLayoutV2.tsx
```

**Feature flags:**
```
enable_dashboard_v2
enable_recommendations_v2
enable_connections_v2
```

**Rutas:**
```
/app/(dashboard-v2)/dashboard/page.tsx  # Nueva versión
/app/(dashboard)/dashboard/page.tsx     # Versión actual
```

### C. Referencias de Diseño

**Archivos HTML de referencia:**
- `/diseño/HTML/Dashboard.html` - Vista general
- `/diseño/HTML/Recomendacion.html` - Recomendaciones
- `/diseño/HTML/Connections.html` - Conectores
- `/diseño/HTML/Security.html` - Seguridad
- `/diseño/HTML/Costo.html` - Análisis financiero
- `/diseño/HTML/Inventario.html` - Gestión de recursos

**Screenshots:**
- `/diseño/Fotos/Dashboard.png`
- `/diseño/Fotos/Recomendacion.png`
- `/diseño/Fotos/Connections.png`
- `/diseño/Fotos/Security.png`
- `/diseño/Fotos/Costo.png`
- `/diseño/Fotos/Inventario.png`

### D. Glosario

**KPI Card:** Card de métrica con valor principal, trending y comparación
**Drawer:** Panel lateral que se desliza desde el borde
**Provider Toggle:** Filtro global para AWS/Azure/GCP
**Feature Flag:** Switch para habilitar/deshabilitar features
**Design System:** Conjunto de componentes, colores, spacing reutilizables
**Critical Path:** Secuencia mínima de tareas para completar proyecto
**Rollout:** Despliegue gradual a producción

---

## 12. CONCLUSIONES Y RECOMENDACIONES

### 12.1 Recomendación Final

**Enfoque recomendado:** Migración incremental con feature flags, priorizando Dashboard y Recomendaciones.

**Justificación:**
1. **Riesgo controlado:** Rollback fácil si surgen problemas
2. **Feedback temprano:** Usuarios beta dan input antes de completar todo
3. **Desarrollo sostenible:** No bloquea otras funcionalidades
4. **Calidad mantenida:** Testing exhaustivo en cada fase

### 12.2 Priorización de Pantallas

**Must-have (MVP):**
1. Dashboard (pantalla principal, más visible)
2. Recomendaciones (alto valor de negocio)

**High priority:**
3. Connections (configuración crítica)
4. Security (compliance requirement)

**Medium priority:**
5. Costos (analytics importante)
6. Inventario (gestión operativa)

### 12.3 Quick Wins

**Implementar primero (semanas 1-2):**
- Actualizar color primario a #f2780d (cambio simple)
- Mejorar responsive mobile en layout actual (low-hanging fruit)
- Agregar provider logos a UI existente (visual impact)

### 12.4 Alertas Tempranas

**Red flags a monitorear:**
- Bundle size creciendo > 10% por semana
- E2E tests fallando > 5%
- User complaints sobre performance
- Scope creep sin justificación

**Si detectas un red flag:**
1. Pausa nueva funcionalidad
2. Investiga root cause
3. Replantea approach
4. Comunica a stakeholders

---

## FIRMA Y APROBACIÓN

**Preparado por:**
Orquestador de Proyecto - AI Lead
Fecha: 2025-12-26

**Pendiente de aprobación:**
- [ ] Tech Lead / CTO
- [ ] Product Owner
- [ ] UI/UX Lead
- [ ] Engineering Manager

**Siguiente revisión:** Después de Fase 1 (semana 4-5)

---

**Versión del documento:** 1.0
**Última actualización:** 2025-12-26
**Próxima revisión:** Post-Fase 1

