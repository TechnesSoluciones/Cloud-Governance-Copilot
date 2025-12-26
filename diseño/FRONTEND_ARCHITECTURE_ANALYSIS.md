# Análisis de Arquitectura Frontend - Cloud Governance Copilot

**Fecha de Análisis:** 26 de diciembre de 2025
**Proyecto:** Cloud Governance Copilot - Multi-Cloud SaaS Platform
**Versión Frontend:** 1.2.4
**Ubicación:** `/Users/josegomez/Documents/Code/SaaS/Copilot/apps/frontend`

---

## 1. ARQUITECTURA ACTUAL DEL FRONTEND

### 1.1 Stack Tecnológico Principal

#### Framework y Runtime
- **Next.js 14.2.15** - Framework React con App Router (arquitectura moderna)
- **React 18.2.0** - Librería de UI con Server Components y Client Components
- **TypeScript 5.3.3** - Tipado estático estricto
- **Node.js >= 18.0.0** - Runtime requerido

#### Patrón Arquitectónico
**App Router de Next.js 14** con la siguiente estructura:
- Server Components por defecto
- Client Components marcados con 'use client'
- Route Groups para organización lógica: `(auth)`, `(dashboard)`
- Layouts anidados para composición de UI
- API Routes para endpoints internos

#### Características de Configuración Next.js
```javascript
// next.config.js - Configuraciones clave:
- output: 'standalone' (optimizado para Docker)
- swcMinify: true (compilación optimizada)
- rewrites: Proxy de /api/v1 al backend
- generateBuildId: Basado en GIT_COMMIT_SHA o timestamp
- Cache-Control headers configurados para prevenir ChunkLoadError
```

---

## 2. ESTRUCTURA DE CARPETAS Y ORGANIZACIÓN

### 2.1 Arquitectura de Directorios

```
apps/frontend/
├── src/
│   ├── app/                    # App Router - Rutas y páginas
│   │   ├── (auth)/            # Route Group: Autenticación
│   │   │   ├── verify-email/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/       # Route Group: Dashboard protegido
│   │   │   ├── layout.tsx     # Layout con Sidebar + TopNav
│   │   │   ├── dashboard/     # Página principal
│   │   │   ├── audit-logs/
│   │   │   ├── settings/
│   │   │   ├── costs/
│   │   │   ├── security/
│   │   │   ├── resources/
│   │   │   ├── recommendations/
│   │   │   ├── cloud-accounts/
│   │   │   ├── azure-advisor/
│   │   │   ├── assets/
│   │   │   └── incidents/
│   │   ├── login/
│   │   ├── register/
│   │   ├── api/               # API Routes internas
│   │   │   ├── auth/
│   │   │   ├── health/
│   │   │   └── version/
│   │   ├── layout.tsx         # Root layout
│   │   ├── providers.tsx      # Providers wrapper
│   │   ├── globals.css        # CSS global con design tokens
│   │   └── error.tsx          # Error boundary
│   │
│   ├── components/            # 109 archivos .tsx (componentes)
│   │   ├── ui/                # 26 componentes base (Radix UI + custom)
│   │   ├── layout/            # PageWrapper, Sidebar, TopNav
│   │   ├── dashboard/         # Componentes específicos del dashboard
│   │   │   └── azure/         # Componentes Azure (7 archivos)
│   │   ├── shared/            # Componentes compartidos
│   │   │   └── premium/       # Sistema de diseño premium
│   │   ├── auth/              # Componentes de autenticación
│   │   ├── costs/             # Componentes de costos
│   │   ├── security/          # Componentes de seguridad
│   │   ├── resources/         # Componentes de recursos
│   │   ├── recommendations/   # Componentes de recomendaciones
│   │   ├── cloud-accounts/    # Gestión de cuentas cloud
│   │   ├── azure-advisor/     # Azure Advisor
│   │   ├── assets/            # Gestión de assets
│   │   ├── incidents/         # Gestión de incidentes
│   │   ├── audit/             # Auditoría
│   │   ├── settings/          # Configuración
│   │   ├── providers/         # Context providers
│   │   ├── errors/            # Componentes de error
│   │   ├── icons/             # Iconos personalizados
│   │   └── skeletons/         # Estados de carga
│   │
│   ├── hooks/                 # 10 custom hooks
│   │   ├── useAssets.ts
│   │   ├── useAzureAdvisor.ts
│   │   ├── useCloudAccounts.ts
│   │   ├── useCosts.ts
│   │   ├── useDashboard.ts
│   │   ├── useIncidents.ts
│   │   ├── usePolicy.ts
│   │   ├── useRecommendations.ts
│   │   ├── useResources.ts
│   │   └── useSecurity.ts
│   │
│   ├── lib/                   # Utilidades y lógica de negocio
│   │   ├── api/               # 14 módulos de API client
│   │   │   ├── client.ts      # Cliente base con Circuit Breaker
│   │   │   ├── circuitBreaker.ts
│   │   │   ├── costs/         # 6 archivos para costos
│   │   │   └── [otros módulos específicos]
│   │   ├── errors/            # Manejo de errores
│   │   ├── validation/        # Validación con Zod
│   │   ├── auth.ts            # Configuración NextAuth
│   │   ├── costs.ts           # Lógica de costos
│   │   ├── logger.ts          # Logging
│   │   └── utils.ts           # Utilidades generales
│   │
│   ├── providers/             # React Context Providers
│   │   └── QueryProvider.tsx  # TanStack Query config
│   │
│   ├── stores/                # Estado global (vacío actualmente)
│   │
│   ├── types/                 # Definiciones TypeScript
│   │   ├── azure-advisor.ts
│   │   ├── next-auth.d.ts
│   │   └── resources.ts
│   │
│   ├── utils/                 # Utilidades compartidas
│   │
│   └── middleware.ts          # NextAuth middleware
│
├── public/                    # Assets estáticos
│   └── favicon.svg
│
├── e2e/                       # Tests E2E con Playwright
├── tests/                     # Tests adicionales
├── next.config.js             # Configuración Next.js
├── tailwind.config.ts         # Configuración Tailwind
├── tsconfig.json              # Configuración TypeScript
├── postcss.config.js          # PostCSS
├── playwright.config.ts       # Playwright config
└── package.json               # Dependencies

**Estadísticas:**
- Total de líneas de código: ~42,434 líneas (.ts/.tsx)
- Total de componentes: 109 archivos .tsx
- Componentes UI base: 26 archivos
```

### 2.2 Patrones de Organización

#### Feature-Based Organization
Los componentes están organizados por dominio/feature:
- `/components/costs/` - Todo lo relacionado con costos
- `/components/security/` - Todo lo relacionado con seguridad
- `/components/azure-advisor/` - Funcionalidad Azure Advisor

#### Colocation Pattern
- Hooks específicos de dominio junto a sus componentes
- API clients organizados por recurso
- Tipos TypeScript junto a su lógica

#### Separation of Concerns
- `/components/ui/` - Componentes puros reutilizables
- `/components/layout/` - Componentes de estructura
- `/components/shared/` - Lógica compartida entre features

---

## 3. SISTEMA DE ESTILOS

### 3.1 Framework CSS Principal

**Tailwind CSS 3.3.6** con configuración extendida

#### Características Clave:
- **Utility-first approach** - Clases utilitarias en JSX
- **Design System personalizado** - "Cloud Copilot Design System"
- **PostCSS** para procesamiento
- **tailwindcss-animate** plugin para animaciones

### 3.2 Design System - Cloud Copilot

#### Paleta de Colores
```typescript
// tailwind.config.ts - Colores definidos:

// Primary Brand
- brand-orange: #ff6b35 (naranja principal)
  - dark: #e65525
  - light: #ff8556
  - accent: #ff9770

// Secondary Colors
- cloud-blue: #0078d4 (Azure blue)
- success: #34a853 (GCP green)
- error: #dc2626 (rojo)
- warning: #f59e0b (naranja)
- info: #3b82f6 (azul)

// Neutrals
- gray: 50-900 (escala completa)
- AWS dark navy: #232f3e

// CSS Variables (Shadcn/UI compatible)
- --primary, --secondary, --accent, --destructive
- --background, --foreground, --card, --popover
- --border, --input, --ring
```

#### Tipografía
```typescript
fontFamily: {
  sans: ['Segoe UI', '-apple-system', 'BlinkMacSystemFont',
         'Google Sans', 'system-ui', 'sans-serif'],
  mono: ['Consolas', 'Monaco', 'Courier New', 'monospace']
}

fontSize: {
  xs: '12px',
  sm: '14px',
  base/md: '16px',
  lg: '18px',
  xl: '20px',
  2xl-5xl: escala progresiva
}

fontWeight: regular(400), medium(500), semibold(600), bold(700)
```

#### Spacing System
**Base unit: 4px**
```typescript
spacing: {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px'
}
```

#### Border Radius
```typescript
borderRadius: {
  xs: '4px',
  default: '8px',
  card: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px'
}
```

#### Shadows
```typescript
boxShadow: {
  sm, md, lg, xl, 2xl (escala progresiva)
  inner, none
}
```

#### Breakpoints Responsive
```typescript
screens: {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1440px',
  '3xl': '1920px'
}
```

#### Animaciones y Transiciones
```typescript
// Animaciones predefinidas:
- fade-in, scale-in
- slide-in-right, slide-in-left
- accordion-down, accordion-up (Shadcn/UI)

// Timing Functions
- cubic-bezier(0.4, 0, 0.2, 1) - Material standard

// Durations
- fast: 150ms
- normal: 200ms
- slow: 300ms
```

### 3.3 Globals CSS

**Archivo:** `src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* CSS Variables para tema claro y oscuro */
  :root { /* Light theme */ }
  .dark { /* Dark theme */ }
}
```

#### Dark Mode Support
- **Estrategia:** `class` based (no automático)
- Variables CSS personalizadas para temas
- Soporte completo en todos los componentes

### 3.4 Component Styling Pattern

**Patrón predominante:**
```tsx
// Uso de class variance authority (cva) para variantes
import { cn } from '@/lib/utils'; // tailwind-merge + clsx

const Button = ({ className, variant, size }) => {
  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
    />
  );
};
```

**Utilidades:**
- `clsx` - Construcción condicional de clases
- `tailwind-merge` - Merge inteligente de clases Tailwind
- `class-variance-authority` - Sistema de variantes

---

## 4. GESTIÓN DE ESTADO Y DATOS

### 4.1 Server State Management

**TanStack Query v5.17.0** (React Query)

#### Configuración Global
```typescript
// providers/QueryProvider.tsx

QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutos fresh
      gcTime: 10 * 60 * 1000,        // 10 minutos en caché
      retry: 2,                       // 2 reintentos
      retryDelay: exponential,        // Backoff exponencial
      refetchOnWindowFocus: true,     // Refetch al enfocar
      refetchOnMount: false,          // No refetch si fresh
      refetchOnReconnect: true        // Refetch al reconectar
    },
    mutations: {
      retry: 1,
      retryDelay: exponential
    }
  }
})
```

#### Patrón de Custom Hooks
**Todos los datos se manejan via custom hooks:**

```typescript
// Ejemplo: hooks/useDashboard.ts

export function useDashboard(accountId: string) {
  // Múltiples queries coordinadas
  const overviewQuery = useQuery({
    queryKey: ['dashboard', 'overview', accountId],
    queryFn: () => dashboardApi.getOverview(accountId, token),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000  // Auto-refresh cada 5 min
  });

  const healthQuery = useQuery({
    queryKey: ['dashboard', 'health', accountId],
    queryFn: () => dashboardApi.getHealth(accountId, token)
  });

  return {
    overview,
    health,
    isLoading,
    error,
    refetch,
    lastUpdated
  };
}
```

**Hooks disponibles (10 total):**
1. `useAssets` - 10,379 bytes
2. `useAzureAdvisor` - 15,404 bytes
3. `useCloudAccounts` - 4,131 bytes
4. `useCosts` - 9,472 bytes
5. `useDashboard` - 6,253 bytes
6. `useIncidents` - 12,823 bytes
7. `usePolicy` - 14,812 bytes
8. `useRecommendations` - 12,333 bytes
9. `useResources` - 7,072 bytes
10. `useSecurity` - 15,803 bytes

#### Características Clave
- **Query Key Factories** - Consistencia en keys
- **Optimistic Updates** - Para mutations
- **Prefetching** - Carga anticipada
- **Stale-While-Revalidate** - Datos instantáneos
- **Auto-refetch** - Intervalos configurables (típicamente 5 min)
- **React Query DevTools** - Solo en desarrollo

### 4.2 Client State Management

**Zustand 4.4.7** - State management ligero

**Estado actual:**
- `/stores/` directorio está vacío
- No se está usando actualmente para estado global
- Preparado para UI state, preferencias, etc.

### 4.3 Session Management

**NextAuth.js 4.24.5**

#### Configuración
```typescript
// middleware.ts
export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token
  }
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/((?!health|auth).*)'  // Protege API excepto health y auth
  ]
};
```

#### Session Provider
```tsx
// components/providers/SessionProvider.tsx
import { SessionProvider } from 'next-auth/react';

// Envuelve toda la app
<SessionProvider>
  {children}
</SessionProvider>
```

#### Uso en Componentes
```tsx
const { data: session, status } = useSession();
const token = session?.accessToken;
const user = session?.user;
```

### 4.4 Form State

**Validación con Zod 3.22.4**

Esquemas de validación en `/lib/validation/`

```typescript
// Ejemplo de schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});
```

---

## 5. ROUTING Y NAVEGACIÓN

### 5.1 App Router (Next.js 14)

#### Estructura de Rutas

**Rutas Públicas:**
- `/` - Landing/Home
- `/login` - Página de login
- `/register` - Registro de usuario
- `/verify-email` - Verificación email
- `/forgot-password` - Recuperar contraseña
- `/reset-password/[token]` - Reset con token

**Rutas Protegidas (Dashboard):**
- `/dashboard` - Dashboard principal (Azure)
- `/audit-logs` - Logs de auditoría
- `/settings/profile` - Perfil de usuario
- `/settings/security` - Configuración de seguridad
- `/costs` - Análisis de costos
- `/security` - Dashboard de seguridad
- `/resources` - Recursos cloud
- `/recommendations` - Recomendaciones
- `/cloud-accounts` - Gestión de cuentas
- `/azure-advisor` - Azure Advisor
- `/assets` - Gestión de assets
- `/incidents` - Incidentes

**API Routes Internas:**
- `/api/auth/[...nextauth]` - NextAuth endpoints
- `/api/health` - Health check
- `/api/version` - Version info

### 5.2 Navigation Pattern

**Componentes de Layout:**

```tsx
// app/(dashboard)/layout.tsx

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ErrorBoundary>
      <div className="flex h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-1 flex-col">
          <TopNav onMenuClick={() => setSidebarOpen(true)} />
          <EmailVerificationBanner />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
```

#### Sidebar Navigation
- **Componente:** `components/layout/Sidebar.tsx` (4,699 bytes)
- Mobile responsive (drawer/overlay en móvil)
- Indicador de ruta activa
- Navegación multi-nivel

#### TopNav
- **Componente:** `components/layout/TopNav.tsx` (4,810 bytes)
- Breadcrumbs
- User menu/dropdown
- Notificaciones
- Mobile menu trigger

### 5.3 Protected Routes

**Middleware de Autenticación:**
```typescript
// src/middleware.ts
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/((?!health|auth).*)'
  ]
};
```

**Patrón:**
- Middleware intercepta requests
- Verifica token de sesión
- Redirect a `/login` si no autenticado
- Permite acceso si autenticado

### 5.4 Programmatic Navigation

**Uso de Next.js Router:**
```tsx
import { useRouter } from 'next/navigation';

const router = useRouter();

// Navigation
router.push('/dashboard');
router.replace('/login');
router.back();
router.refresh();
```

---

## 6. DEPENDENCIAS CRÍTICAS

### 6.1 Core Dependencies

#### Framework y Runtime
```json
{
  "next": "^14.2.15",           // Framework principal
  "react": "^18.2.0",           // UI library
  "react-dom": "^18.2.0",       // DOM renderer
  "typescript": "^5.3.3"        // Type safety
}
```

#### UI Component Libraries
```json
{
  "@radix-ui/react-avatar": "^1.0.4",
  "@radix-ui/react-checkbox": "^1.3.3",
  "@radix-ui/react-dialog": "^1.0.5",
  "@radix-ui/react-dropdown-menu": "^2.0.6",
  "@radix-ui/react-label": "^2.0.2",
  "@radix-ui/react-select": "^2.0.0",
  "@radix-ui/react-slot": "^1.0.2",
  "@radix-ui/react-tabs": "^1.0.4",
  "@radix-ui/react-toast": "^1.1.5",
  "lucide-react": "^0.294.0"    // Icon library
}
```

**Radix UI:**
- Componentes headless (sin estilo)
- Accesibilidad completa (WAI-ARIA)
- Totalmente composables
- Base para shadcn/ui components

#### State Management
```json
{
  "@tanstack/react-query": "^5.17.0",
  "@tanstack/react-query-devtools": "^5.17.0",
  "zustand": "^4.4.7",
  "next-auth": "^4.24.5"
}
```

#### Styling
```json
{
  "tailwindcss": "^3.3.6",
  "tailwindcss-animate": "^1.0.7",
  "tailwind-merge": "^2.1.0",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.0.0",
  "postcss": "^8.4.32",
  "autoprefixer": "^10.4.16"
}
```

#### Data Fetching & Validation
```json
{
  "axios": "^1.6.2",
  "zod": "^3.22.4"
}
```

#### Data Visualization
```json
{
  "recharts": "^2.10.3",        // Charts library
  "date-fns": "^3.0.0"          // Date manipulation
}
```

#### Testing
```json
{
  "@playwright/test": "^1.57.0"  // E2E testing
}
```

### 6.2 Dependency Graph Analysis

#### Critical Path Dependencies
```
Next.js 14.2.15
├── React 18.2.0 (peer dependency)
├── React-DOM 18.2.0
└── Server Components support

TanStack Query 5.17.0
└── React 18.2.0 (peer dependency)

NextAuth 4.24.5
├── Next.js (tightly coupled)
└── JWT handling

Tailwind CSS 3.3.6
├── PostCSS
└── Autoprefixer
```

#### Version Constraints
- **Next.js:** Requiere React 18.2+
- **Radix UI:** Requiere React 18+
- **TanStack Query v5:** Breaking changes vs v4
- **NextAuth v4:** Específico para Next.js App Router

### 6.3 Bundle Size Impact

**Librerías más pesadas:**
1. Recharts (~2.10.3) - Visualización de datos
2. Next.js runtime
3. Radix UI (múltiples paquetes)
4. TanStack Query
5. Axios

**Optimizaciones presentes:**
- SWC Minify habilitado
- Tree-shaking de Tailwind
- Dynamic imports para lazy loading
- Component code splitting

---

## 7. PUNTOS DE ACOPLAMIENTO Y ÁREAS CRÍTICAS

### 7.1 Tight Coupling Areas

#### 1. Next.js App Router Dependencies
**Acoplamiento:** ALTO

**Componentes afectados:**
- Toda la estructura de rutas en `/app`
- Layouts anidados
- Server/Client Components
- Middleware de autenticación
- API Routes internas

**Impacto del cambio:**
- Migración completa de arquitectura de routing
- Reescritura de todos los layouts
- Ajuste de SSR/CSR boundaries
- Modificación de middleware

**Riesgo:** 🔴 CRÍTICO

#### 2. NextAuth.js Integration
**Acoplamiento:** ALTO

**Componentes afectados:**
- `/middleware.ts` - Protección de rutas
- `/app/api/auth/[...nextauth]`
- SessionProvider en providers
- Todos los hooks que usan `useSession()`
- API client (token management)

**Impacto del cambio:**
- Reemplazo completo de autenticación
- Refactor de protected routes
- Nuevo manejo de tokens
- Ajuste de session state

**Riesgo:** 🔴 CRÍTICO

#### 3. TanStack Query + Custom Hooks Pattern
**Acoplamiento:** MEDIO-ALTO

**Componentes afectados:**
- 10 custom hooks en `/hooks`
- QueryProvider configuration
- Todos los componentes que consumen datos
- Cache invalidation logic

**Impacto del cambio:**
- Refactor de todos los data hooks
- Nueva estrategia de caching
- Ajuste de loading/error states
- Pérdida de DevTools

**Riesgo:** 🟡 ALTO

#### 4. Tailwind + Design System
**Acoplamiento:** ALTO

**Componentes afectados:**
- 109 archivos .tsx con clases Tailwind
- `tailwind.config.ts` - Design tokens
- `globals.css` - CSS variables
- Todos los componentes UI

**Impacto del cambio:**
- Reescritura de todos los estilos
- Nueva configuración de design tokens
- Migración de utilidades (cn, clsx)
- Pérdida de responsividad configurada

**Riesgo:** 🟡 ALTO

#### 5. Radix UI Component Library
**Acoplamiento:** MEDIO

**Componentes afectados:**
- 26 componentes en `/components/ui`
- Todos los componentes que usan Radix primitives
- Accesibilidad features

**Impacto del cambio:**
- Reemplazo de componentes base
- Nueva librería de primitives
- Re-implementación de accesibilidad
- Pérdida de composabilidad

**Riesgo:** 🟡 MEDIO-ALTO

### 7.2 Areas de Bajo Acoplamiento

#### 1. Business Logic
**Acoplamiento:** BAJO

**Ubicación:**
- `/lib/api/` - API clients
- `/lib/costs.ts` - Lógica de costos
- `/lib/errors/` - Error handling
- `/lib/validation/` - Schemas Zod

**Facilidad de migración:** ✅ FÁCIL
- Lógica independiente del framework
- Reutilizable en cualquier arquitectura

#### 2. Type Definitions
**Acoplamiento:** BAJO

**Ubicación:**
- `/types/` - TypeScript interfaces
- API response types
- Domain models

**Facilidad de migración:** ✅ FÁCIL
- Totalmente portable
- No depende de UI framework

#### 3. Utils & Helpers
**Acoplamiento:** BAJO

**Ubicación:**
- `/utils/`
- `/lib/utils.ts`
- `/lib/logger.ts`

**Facilidad de migración:** ✅ FÁCIL

### 7.3 Critical Integration Points

#### API Client Layer
**Archivo:** `/lib/api/client.ts`

```typescript
// Circuit Breaker Integration
export async function apiRequest(endpoint, options) {
  // 1. Circuit Breaker check
  if (!azureApiCircuitBreaker.canRequest()) {
    throw new CircuitBreakerError();
  }

  // 2. Token from NextAuth session
  const token = options.token;

  // 3. Fetch with Next.js rewrites
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // 4. Circuit Breaker failure tracking
  if (response.status === 429 || response.status >= 500) {
    azureApiCircuitBreaker.recordFailure(response.status);
  }

  return response;
}
```

**Puntos de integración:**
1. NextAuth (token management)
2. Next.js rewrites (/api/v1 proxy)
3. Circuit Breaker pattern
4. TanStack Query (via hooks)

#### Page Component Pattern
**Ejemplo:** `/app/(dashboard)/dashboard/page.tsx`

```typescript
'use client'; // Next.js directive

export default function DashboardPage() {
  // 1. NextAuth session
  const { data: session, status } = useSession();

  // 2. TanStack Query hook
  const { overview, health, isLoading, error } = useDashboard(accountId);

  // 3. Next.js router
  const router = useRouter();

  // 4. Radix UI components
  return (
    <Card>
      <Button onClick={() => router.push('/costs')}>
        View Costs
      </Button>
    </Card>
  );
}
```

**Dependencias simultáneas:**
- Next.js (routing, directives)
- NextAuth (session)
- TanStack Query (data)
- Radix UI (components)
- Tailwind (styling)

### 7.4 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interaction                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              React Component (Client)                    │
│  - useSession() → NextAuth                               │
│  - useDashboard() → TanStack Query                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            Custom Hook (e.g., useDashboard)              │
│  - useQuery() → TanStack Query                           │
│  - queryFn: () => dashboardApi.getOverview()             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              API Client Module                           │
│  - lib/api/dashboard.ts                                  │
│  - export function getOverview(accountId, token)         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Base API Client (with Circuit Breaker)         │
│  - lib/api/client.ts                                     │
│  - apiRequest(endpoint, { token })                       │
│  - Circuit Breaker checks                                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 Next.js Rewrites                         │
│  - /api/v1/* → http://api-gateway:3010/api/v1/*         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API Gateway                         │
│  - apps/api-gateway (NestJS)                            │
└─────────────────────────────────────────────────────────┘
```

### 7.5 Error Handling Chain

```
Component Error
    │
    ▼
ErrorBoundary (React)
    │
    ├─→ Circuit Breaker Error → CircuitBreakerError component
    │
    ├─→ Permission Error → PermissionDeniedError component
    │
    ├─→ API Error → Alert component with retry
    │
    └─→ Unknown Error → Generic error fallback
```

### 7.6 State Synchronization Points

**Critical sync points:**

1. **Session State**
   - NextAuth SessionProvider
   - Sync across tabs (session storage)
   - Token refresh logic

2. **Query Cache**
   - TanStack Query cache
   - Auto-refresh intervals (5 min)
   - Optimistic updates

3. **Route State**
   - Next.js router state
   - URL parameters
   - Navigation history

4. **UI State**
   - Sidebar open/close (local state)
   - Modal dialogs (local state)
   - Form state (local/Zod)

---

## 8. PATRONES Y ARQUITECTURA AVANZADA

### 8.1 Circuit Breaker Pattern

**Implementación:** `/lib/api/circuitBreaker.ts` (226 líneas)

**Estados del Circuit:**
```typescript
enum CircuitState {
  CLOSED = 'CLOSED',      // Normal operation
  OPEN = 'OPEN',          // Blocking requests
  HALF_OPEN = 'HALF_OPEN' // Testing recovery
}
```

**Configuración:**
```typescript
const azureApiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,           // 3 fallos consecutivos
  resetTimeout: 60000,           // 1 minuto de espera
  errorCodes: [429, 500, 502, 503, 504]
});
```

**Flujo:**
1. 3 fallos consecutivos → Circuit OPEN
2. Espera 1 minuto → Transición a HALF_OPEN
3. Siguiente request exitosa → Circuit CLOSED
4. Request falla en HALF_OPEN → Vuelve a OPEN

**Integración:**
- Todos los API requests pasan por el circuit breaker
- UI muestra errores específicos de circuit breaker
- Retry automático después del timeout

### 8.2 Component Patterns

#### PageWrapper Pattern
**Componente:** `/components/layout/PageWrapper.tsx` (296 líneas)

**Características:**
- Layout wrapper reutilizable
- Props configurables (maxWidth, spacing, padding)
- Breadcrumbs support
- Accesibilidad completa
- React.memo para performance

```tsx
<PageWrapper
  maxWidth="container"
  spacing="md"
  breadcrumbs={<Breadcrumbs items={items} />}
>
  {children}
</PageWrapper>
```

#### Loading States Pattern
```tsx
if (isLoading) {
  return <StatCardGridSkeleton count={4} />;
}

if (error) {
  return <ErrorComponent error={error} onRetry={refetch} />;
}

return <DataComponent data={data} />;
```

#### Premium Design Components
**Ubicación:** `/components/shared/premium/`

- `PremiumSectionHeader`
- `PremiumStatsBar`
- Gradientes predefinidos
- Transiciones suaves
- Iconos con background

### 8.3 Error Handling Architecture

#### Error Boundary
```tsx
// app/(dashboard)/layout.tsx
<ErrorBoundary>
  <DashboardLayout>
    {children}
  </DashboardLayout>
</ErrorBoundary>
```

#### Specialized Error Components
1. **CircuitBreakerError** - Circuit breaker activado
2. **PermissionDeniedError** - Falta de permisos
3. **GenericError** - Errores inesperados

#### Error Analysis
```typescript
// lib/errors/
export function analyzePermissionError(error) {
  return {
    isPermissionError: boolean,
    errorCode: string,
    missingPermissions: string[],
    actionableMessage: string
  };
}
```

### 8.4 Performance Optimizations

#### Code Splitting
- Dynamic imports con `next/dynamic`
- Route-based splitting automático (Next.js)
- Component lazy loading

#### Memoization
```tsx
// Componentes con React.memo
export const PageWrapper = React.memo(({ ... }) => { ... });

// Hooks con useMemo
const containerClasses = React.useMemo(() => {
  return classes.filter(Boolean).join(' ');
}, [maxWidth, spacing, className]);
```

#### Query Optimization
```typescript
// Stale-while-revalidate
staleTime: 5 * 60 * 1000,  // Datos frescos por 5 min
gcTime: 10 * 60 * 1000,     // Cache por 10 min

// Auto-refresh inteligente
refetchInterval: 5 * 60 * 1000,  // Cada 5 min
refetchOnWindowFocus: true,       // Al volver a la tab
```

#### Build Optimizations
```javascript
// next.config.js
swcMinify: true,                  // SWC compiler
output: 'standalone',             // Docker optimized
generateBuildId: () => GIT_SHA,   // Predictable builds
```

---

## 9. TESTING INFRASTRUCTURE

### 9.1 E2E Testing (Playwright)

**Configuración:** `/playwright.config.ts`

```typescript
{
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
}
```

**Tests críticos:**
- `/playwright.critical-flows.config.ts` - Flujos críticos
- `/e2e/` - Tests completos

**Scripts:**
```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:debug": "playwright test --debug",
  "test:e2e:critical": "playwright test --config=playwright.critical-flows.config.ts"
}
```

### 9.2 Testing Directories

```
apps/frontend/
├── e2e/                          # 14 archivos E2E
├── tests/                        # Tests unitarios
├── test-results/                 # Resultados de tests
├── playwright-report/            # Reportes HTML
└── playwright-report-critical/   # Reportes críticos
```

---

## 10. BUILD Y DEPLOYMENT

### 10.1 Build Configuration

**TypeScript Config:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "strict": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Next.js Build:**
```bash
npm run build
# Genera:
# - .next/ directorio con build
# - standalone/ para Docker
# - static/ assets optimizados
```

### 10.2 Docker Configuration

**Dockerfile** (3,696 bytes):
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
# ... build steps ...

FROM node:18-alpine AS runner
# Standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

CMD ["node", "server.js"]
```

**Optimizaciones:**
- Multi-stage build (reduce tamaño)
- Standalone output (solo dependencias necesarias)
- Alpine Linux (imagen ligera)

### 10.3 Environment Variables

**Variables críticas:**
```bash
NEXT_PUBLIC_API_URL           # API endpoint
NEXT_PUBLIC_BUILD_ID          # Build identifier
INTERNAL_API_URL              # Docker internal API
NODE_ENV                       # Environment
GIT_COMMIT_SHA               # Git commit
```

### 10.4 Deployment Scripts

```bash
./deploy-frontend.sh          # Deploy script
./fix-frontend-now.sh         # Hotfix script
```

---

## 11. RESUMEN EJECUTIVO - ÁREAS CRÍTICAS PARA REDISEÑO

### 11.1 Prioridad CRÍTICA (Bloquean rediseño radical)

#### 1. Next.js App Router Migration
**Esfuerzo:** 🔴 ALTO (80-120 horas)
**Riesgo:** 🔴 CRÍTICO

**Componentes afectados:**
- Toda la estructura `/app` (14 directorios de rutas)
- Layouts anidados (3 archivos)
- Middleware de autenticación
- API routes internas (3 endpoints)
- SSR/CSR boundaries (100+ componentes)

**Estrategia recomendada:**
- Migración incremental por feature
- Mantener estructura de carpetas similar
- Nuevo framework debe soportar file-based routing o similar

#### 2. NextAuth.js Replacement
**Esfuerzo:** 🔴 ALTO (40-60 horas)
**Riesgo:** 🔴 CRÍTICO

**Componentes afectados:**
- Middleware (16 líneas)
- SessionProvider
- 10+ hooks que usan useSession()
- API client (token management)
- Protected routes (20+ páginas)

**Estrategia recomendada:**
- Elegir solución de autenticación compatible con nuevo framework
- Mantener misma estrategia de tokens
- Migrar protected routes pattern

#### 3. Styling System Overhaul
**Esfuerzo:** 🟡 MEDIO-ALTO (60-80 horas)
**Riesgo:** 🟡 ALTO

**Componentes afectados:**
- 109 archivos .tsx con clases Tailwind
- tailwind.config.ts (271 líneas de design system)
- globals.css (102 líneas de CSS variables)
- 26 componentes UI base

**Estrategia recomendada:**
- Decidir si mantener Tailwind o cambiar a CSS-in-JS/Modules
- Preservar design tokens y valores del design system
- Migración automática con codemods si es posible

### 11.2 Prioridad ALTA (Requieren refactor significativo)

#### 4. TanStack Query + Data Hooks
**Esfuerzo:** 🟡 MEDIO (40-50 horas)
**Riesgo:** 🟡 ALTO

**Componentes afectados:**
- 10 custom hooks (108,481 bytes total)
- QueryProvider configuration
- 50+ componentes que consumen datos
- Cache invalidation logic

**Estrategia recomendada:**
- Evaluar si nuevo framework tiene data fetching built-in
- Mantener pattern de custom hooks
- Preservar query keys y cache strategies

#### 5. Radix UI Component Migration
**Esfuerzo:** 🟡 MEDIO (30-40 horas)
**Riesgo:** 🟡 MEDIO

**Componentes afectados:**
- 26 componentes UI base
- 9 paquetes @radix-ui
- Accesibilidad features (WAI-ARIA)

**Estrategia recomendada:**
- Buscar alternativa headless similar (Headless UI, Ark UI)
- Mantener composabilidad y accesibilidad
- Refactor incremental por componente

### 11.3 Prioridad MEDIA (Migración moderada)

#### 6. Routing y Navigation
**Esfuerzo:** 🟢 BAJO-MEDIO (20-30 horas)
**Riesgo:** 🟡 MEDIO

**Estrategia:**
- Abstracción de router (useNavigate custom hook)
- Mapeo de rutas a nuevo sistema
- Mantener protección de rutas

#### 7. Build y Deployment
**Esfuerzo:** 🟢 BAJO-MEDIO (15-25 horas)
**Riesgo:** 🟢 BAJO

**Estrategia:**
- Nuevo Dockerfile
- Ajuste de scripts de build
- Configuración de bundler

### 11.4 Prioridad BAJA (Migración fácil)

#### 8. Business Logic y Utils
**Esfuerzo:** 🟢 BAJO (5-10 horas)
**Riesgo:** 🟢 BAJO

**Portabilidad:** ✅ ALTA
- `/lib/api/` - API clients (independientes)
- `/lib/costs.ts` - Lógica de negocio
- `/lib/errors/` - Error handling
- `/lib/validation/` - Schemas Zod
- `/utils/` - Utilidades

**Estrategia:** Copy-paste con ajustes mínimos

#### 9. Type Definitions
**Esfuerzo:** 🟢 MÍNIMO (2-5 horas)
**Riesgo:** 🟢 BAJO

**Portabilidad:** ✅ MUY ALTA
- `/types/` - Interfaces TypeScript
- API response types
- Domain models

**Estrategia:** Copy-paste directo

---

## 12. MÉTRICAS Y ESTADÍSTICAS

### 12.1 Tamaño del Codebase

```
Código Frontend:
- Total líneas .ts/.tsx: ~42,434 líneas
- Total archivos componentes: 109 .tsx
- Total hooks personalizados: 10 archivos
- Total API clients: 14 módulos
- Componentes UI base: 26 archivos
- Líneas en tailwind.config: 271
- Líneas en next.config: 100
```

### 12.2 Complejidad por Área

| Área | Archivos | LOC | Complejidad | Riesgo Migración |
|------|----------|-----|-------------|------------------|
| Components | 109 | ~25,000 | ALTA | 🔴 CRÍTICO |
| Hooks | 10 | ~6,500 | MEDIA | 🟡 ALTO |
| API Clients | 14 | ~5,000 | BAJA | 🟢 BAJO |
| Lib/Utils | 8 | ~3,000 | BAJA | 🟢 BAJO |
| Types | 3 | ~500 | MÍNIMA | 🟢 BAJO |
| Config | 5 | ~600 | MEDIA | 🟡 MEDIO |

### 12.3 Dependencies Count

```
Total dependencies: 25
- UI components: 9 (@radix-ui packages)
- State management: 3 (react-query, zustand, next-auth)
- Styling: 6 (tailwind ecosystem)
- Data: 3 (axios, recharts, date-fns)
- Validation: 1 (zod)
- Testing: 1 (playwright)
- Framework: 2 (next, react)
```

---

## 13. RECOMENDACIONES PARA EL REDISEÑO

### 13.1 Estrategia de Migración Incremental

#### Fase 1: Preparación (2-3 semanas)
1. **Análisis de alternativas**
   - Evaluar frameworks candidatos (Remix, SvelteKit, Astro, etc.)
   - Análisis de compatibilidad con requisitos
   - POC con componente crítico

2. **Abstracción de dependencias**
   - Crear wrappers para router
   - Abstraer autenticación
   - Aislar lógica de negocio

3. **Preparar design tokens**
   - Extraer design system a formato portable
   - Documentar componentes críticos
   - Crear guía de estilos

#### Fase 2: Core Infrastructure (3-4 semanas)
1. **Setup del nuevo proyecto**
   - Configuración de build
   - Setup de linting/formatting
   - Configuración de TypeScript

2. **Migrar utilidades y tipos**
   - `/lib/` (excepto framework-specific)
   - `/types/`
   - `/utils/`

3. **Implementar autenticación**
   - Nuevo auth provider
   - Protected routes
   - Session management

#### Fase 3: UI Foundation (4-5 semanas)
1. **Design system**
   - Migrar design tokens
   - Setup de styling solution
   - Configurar temas

2. **Componentes base UI**
   - Migrar 26 componentes de /ui
   - Testing de accesibilidad
   - Storybook (opcional)

3. **Layout components**
   - PageWrapper
   - Sidebar
   - TopNav

#### Fase 4: Features Migration (8-10 semanas)
1. **Por prioridad de negocio:**
   - Dashboard principal
   - Costs
   - Security
   - Resources
   - [otros features]

2. **Por cada feature:**
   - Migrar hooks de datos
   - Migrar componentes
   - Migrar rutas
   - Testing E2E

#### Fase 5: Testing y Optimización (2-3 semanas)
1. **Testing completo**
   - E2E tests
   - Performance testing
   - Accessibility audit

2. **Optimización**
   - Bundle size
   - Loading performance
   - SEO

3. **Documentation**
   - Documentar nuevos patterns
   - Guías de contribución
   - Migration guide

### 13.2 Consideraciones de Framework

#### Si se elige Remix:
**Pros:**
- Routing similar a Next.js App Router
- Mejor gestión de forms
- Nested routing nativo
- Progressive enhancement

**Cons:**
- Menor ecosistema que Next.js
- Requiere ajustes en SSR patterns

#### Si se elige SvelteKit:
**Pros:**
- Performance superior
- Menor bundle size
- Mejor developer experience
- File-based routing

**Cons:**
- Diferente paradigma (Svelte vs React)
- Migración completa de componentes
- Menos librerías disponibles

#### Si se elige Astro:
**Pros:**
- Multi-framework support
- Excelente performance
- Islands architecture

**Cons:**
- Menos adecuado para aplicaciones dinámicas
- Routing diferente

### 13.3 Preservar lo que Funciona

**Mantener:**
1. ✅ Circuit Breaker pattern
2. ✅ Error handling architecture
3. ✅ API client layer
4. ✅ Design tokens y valores
5. ✅ Component organization (feature-based)
6. ✅ TypeScript strict mode
7. ✅ Accessibility patterns
8. ✅ Testing infrastructure (Playwright)

**Replantear:**
1. 🔄 Framework de UI
2. 🔄 Routing strategy
3. 🔄 Auth provider
4. 🔄 State management (evaluar si necesita Zustand)
5. 🔄 Styling approach (Tailwind vs CSS-in-JS)
6. 🔄 Build tooling

### 13.4 Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Pérdida de features durante migración | MEDIA | ALTO | Feature parity checklist, Testing exhaustivo |
| Regresiones de UI | ALTA | MEDIO | Screenshot testing, Visual regression |
| Performance degradation | MEDIA | ALTO | Performance budgets, Monitoring |
| Breaking changes en producción | BAJA | CRÍTICO | Blue-green deployment, Rollback plan |
| Extensión de timeline | ALTA | MEDIO | Buffer time (30%), Priorización clara |
| Team learning curve | MEDIA | MEDIO | Training sessions, Pair programming |

---

## 14. CONCLUSIONES

### 14.1 Estado Actual

El frontend de Cloud Governance Copilot es una aplicación **moderna, bien estructurada y production-ready** con las siguientes fortalezas:

**Fortalezas:**
- Arquitectura clara y organizada (feature-based)
- TypeScript estricto (type safety)
- Design system coherente y bien documentado
- Manejo robusto de errores (Circuit Breaker, Error Boundaries)
- Performance optimizations (React.memo, query caching)
- Accesibilidad implementada (Radix UI, ARIA)
- Testing infrastructure (Playwright E2E)

**Debilidades para un cambio radical:**
- Alto acoplamiento con Next.js App Router
- Dependencia fuerte de NextAuth.js
- 100+ componentes con Tailwind classes
- Radix UI profundamente integrado
- TanStack Query como única fuente de data fetching

### 14.2 Esfuerzo Estimado de Migración

**Estimación conservadora:**
- **Mínimo:** 400-500 horas (2.5-3 meses con 1 desarrollador full-time)
- **Realista:** 600-800 horas (4-5 meses con 1 desarrollador)
- **Con contingencias:** 800-1000 horas (5-6 meses)

**Con equipo de 2-3 desarrolladores:**
- 2-3 meses de trabajo paralelo
- Requiere coordinación cuidadosa

### 14.3 Recomendación Final

**Pregunta clave antes de proceder:**
¿Cuál es el driver del rediseño?

**Si el driver es:**

1. **Performance:**
   - Considerar optimizaciones en el stack actual antes de migrar
   - Next.js 14 ya es altamente performante

2. **Developer Experience:**
   - Evaluar si el problema es framework o patterns
   - Considerar refactors incrementales

3. **Requisitos técnicos específicos:**
   - Migración justificada si el nuevo framework resuelve problemas específicos
   - Hacer POC antes de comprometerse

4. **Rediseño visual completo:**
   - Podría hacerse en el stack actual
   - Migración de framework no necesariamente requerida

**Recomendación:**
- Si la migración es necesaria: Seguir estrategia incremental (Fase 1-5)
- Considerar seriamente mantener stack actual con mejoras incrementales
- Si se migra: Priorizar Remix o similar con menor diferencia arquitectónica

---

## ANEXO A: Archivos Clave para Revisión

### Configuración
- `/apps/frontend/next.config.js`
- `/apps/frontend/tailwind.config.ts`
- `/apps/frontend/tsconfig.json`
- `/apps/frontend/package.json`

### Core Architecture
- `/apps/frontend/src/app/layout.tsx`
- `/apps/frontend/src/app/providers.tsx`
- `/apps/frontend/src/middleware.ts`
- `/apps/frontend/src/lib/api/client.ts`
- `/apps/frontend/src/lib/api/circuitBreaker.ts`

### Key Components
- `/apps/frontend/src/components/layout/PageWrapper.tsx`
- `/apps/frontend/src/app/(dashboard)/layout.tsx`
- `/apps/frontend/src/app/(dashboard)/dashboard/page.tsx`

### Hooks
- `/apps/frontend/src/hooks/useDashboard.ts`
- `/apps/frontend/src/hooks/useCosts.ts`
- `/apps/frontend/src/hooks/useAzureAdvisor.ts`

---

**Informe generado:** 26 de diciembre de 2025
**Próximo paso recomendado:** Definir drivers de negocio para el rediseño y evaluar alternativas de framework
