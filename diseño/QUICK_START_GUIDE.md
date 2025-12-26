# Quick Start Guide - Implementación del Nuevo Diseño

**Objetivo:** Comenzar desarrollo en menos de 1 día

---

## Setup Inicial (2 horas)

### 1. Crear Proyecto Base

```bash
# Crear proyecto con Vite + React + TypeScript
npm create vite@latest copilot-frontend -- --template react-ts

cd copilot-frontend

# Instalar dependencias base
npm install

# Instalar Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 2. Configurar Tailwind CSS

**tailwind.config.js:**
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#f2780d',
          hover: '#d96a0b',
          light: '#fff5eb',
        },
        aws: '#FF9900',
        azure: '#0078D4',
        gcp: '#4285F4',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```

**src/index.css:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply font-display antialiased;
  }
}

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
```

### 3. Instalar Dependencias Esenciales

```bash
# Routing
npm install react-router-dom

# State management
npm install zustand @tanstack/react-query

# Forms
npm install react-hook-form zod @hookform/resolvers

# Utils
npm install clsx tailwind-merge date-fns

# Dev dependencies
npm install -D @types/node
```

### 4. Estructura de Carpetas

```bash
mkdir -p src/{components/{atoms,molecules,organisms},pages,hooks,services,stores,types,utils}
```

---

## Primer Componente: Button (30 minutos)

**src/components/atoms/Button/Button.tsx:**
```typescript
import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm',
      secondary: 'bg-white border border-gray-200 hover:bg-gray-50',
      outline: 'border border-primary text-primary hover:bg-primary/10',
      ghost: 'hover:bg-gray-100',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-9 px-4 text-sm',
      lg: 'h-10 px-5 text-base',
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <span className="material-symbols-outlined animate-spin mr-2 text-[18px]">
            refresh
          </span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

**src/utils/cn.ts:**
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Test en App.tsx:**
```typescript
import { Button } from './components/atoms/Button/Button';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold">Button Component Test</h1>

        <div className="space-x-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </div>

        <div className="space-x-2">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>

        <Button isLoading>Loading...</Button>
      </div>
    </div>
  );
}

export default App;
```

---

## Layout Base (1 hora)

**src/components/organisms/Sidebar/Sidebar.tsx:**
```typescript
import { Link } from 'react-router-dom';

const navItems = [
  { icon: 'dashboard', label: 'Overview', path: '/', active: true },
  { icon: 'attach_money', label: 'Cost Management', path: '/costs' },
  { icon: 'security', label: 'Security', path: '/security' },
  { icon: 'dns', label: 'Resources', path: '/inventory' },
  { icon: 'analytics', label: 'Analytics', path: '/analytics' },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-100">
        <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
          <span className="material-symbols-outlined text-3xl">cloud_queue</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold tracking-tight">CloudNexus</h1>
          <p className="text-xs text-gray-500 font-medium">Multi-Cloud</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors
              ${item.active
                ? 'bg-primary/10 text-primary border-l-4 border-primary'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }
            `}
          >
            <span className={`material-symbols-outlined ${item.active ? 'fill-1' : ''}`}>
              {item.icon}
            </span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
            AM
          </div>
          <div className="flex flex-col overflow-hidden">
            <p className="text-sm font-bold truncate">Alex Morgan</p>
            <p className="text-xs text-gray-500 truncate">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
```

**src/components/organisms/Header/Header.tsx:**
```typescript
export const Header = () => {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="relative w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
            search
          </span>
          <input
            className="pl-10 pr-4 py-2 w-full bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            placeholder="Search resources, services..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border border-white"></span>
        </button>
        <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>
    </header>
  );
};
```

**src/components/templates/DashboardLayout/DashboardLayout.tsx:**
```typescript
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/organisms/Sidebar/Sidebar';
import { Header } from '@/components/organisms/Header/Header';

export const DashboardLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
```

---

## Routing Setup (30 minutos)

**src/main.tsx:**
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
```

**src/App.tsx:**
```typescript
import { Routes, Route } from 'react-router-dom';
import { DashboardLayout } from '@/components/templates/DashboardLayout/DashboardLayout';
import { DashboardPage } from '@/pages/Dashboard/DashboardPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} />
        {/* Agregar más rutas aquí */}
      </Route>
    </Routes>
  );
}

export default App;
```

**src/pages/Dashboard/DashboardPage.tsx:**
```typescript
export const DashboardPage = () => {
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-gray-500 mt-1">Real-time insights across your multi-cloud infrastructure.</p>
      </div>

      {/* KPI Grid placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Metric {i}</p>
            <h3 className="text-2xl font-bold mt-1">$12,450</h3>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Mock Data Service (30 minutos)

**src/services/mockData.ts:**
```typescript
export interface Resource {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'stopped' | 'warning';
  provider: 'aws' | 'azure' | 'gcp';
  location: string;
  cost: number;
}

export const mockResources: Resource[] = [
  {
    id: '1',
    name: 'app-server-prod-01',
    type: 'Virtual Machine',
    status: 'running',
    provider: 'azure',
    location: 'East US 2',
    cost: 145.20,
  },
  {
    id: '2',
    name: 'db-cluster-main',
    type: 'SQL Database',
    status: 'running',
    provider: 'aws',
    location: 'us-east-1',
    cost: 850.00,
  },
  // Agregar más...
];

export const mockKPIs = {
  totalCost: 12450,
  securityScore: 85,
  activeResources: 1240,
  criticalAlerts: 3,
};
```

**src/hooks/useResources.ts:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { mockResources } from '@/services/mockData';

export const useResources = () => {
  return useQuery({
    queryKey: ['resources'],
    queryFn: async () => {
      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockResources;
    },
  });
};
```

---

## Dark Mode Setup (20 minutos)

**src/stores/themeStore.ts:**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeStore {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => {
        set({ theme });

        // Apply to document
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          root.classList.add(systemTheme);
        } else {
          root.classList.add(theme);
        }
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);
```

**src/components/atoms/ThemeToggle/ThemeToggle.tsx:**
```typescript
import { useThemeStore } from '@/stores/themeStore';

export const ThemeToggle = () => {
  const { theme, setTheme } = useThemeStore();

  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      <span className="material-symbols-outlined">
        {theme === 'dark' ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  );
};
```

---

## Testing el Setup (10 minutos)

```bash
# Ejecutar dev server
npm run dev

# Visitar http://localhost:5173

# Verificar:
# ✅ Layout se ve correcto
# ✅ Sidebar navegación funciona
# ✅ Búsqueda y botones responden
# ✅ Dark mode toggle funciona
# ✅ Responsive en mobile
```

---

## Próximos Pasos

### Hoy
- [x] Setup proyecto completo
- [x] Button component
- [x] Layout base
- [ ] Badge component
- [ ] Icon component wrapper

### Mañana
- [ ] KPI Card component
- [ ] Data Table básica
- [ ] Chart widget básico
- [ ] Connections page estructura

### Esta Semana
- [ ] Completar 5 componentes atómicos más
- [ ] Sidebar con todos los items
- [ ] Dashboard con KPIs reales
- [ ] Mock API completo

---

## Recursos Útiles

### Documentación
- React: https://react.dev/
- TypeScript: https://www.typescriptlang.org/
- Tailwind: https://tailwindcss.com/
- React Query: https://tanstack.com/query/latest

### Herramientas
- VS Code Extensions:
  - Tailwind CSS IntelliSense
  - ES7+ React/Redux snippets
  - Prettier
  - ESLint

### Inspiración
- Tailwind UI: https://tailwindui.com/
- shadcn/ui: https://ui.shadcn.com/
- Radix UI: https://www.radix-ui.com/

---

## Checklist de Hoy

- [ ] Proyecto creado con Vite
- [ ] Tailwind configurado con theme custom
- [ ] Material Icons integrado
- [ ] Button component implementado
- [ ] Sidebar component funcional
- [ ] Header component funcional
- [ ] DashboardLayout template
- [ ] Routing configurado
- [ ] React Query setup
- [ ] Dark mode funcional
- [ ] Mock data service creado
- [ ] Primera página (Dashboard) renderizando

---

**Tiempo total estimado:** 4-5 horas para setup completo funcional

**Resultado:** Base sólida para comenzar desarrollo de features
