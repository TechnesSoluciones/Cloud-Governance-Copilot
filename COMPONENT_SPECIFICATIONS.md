# Especificaciones Técnicas de Componentes - Rediseño Frontend

## Índice
1. [Layout Components](#1-layout-components)
2. [UI Core Components](#2-ui-core-components)
3. [Chart Components](#3-chart-components)
4. [Page-Specific Components](#4-page-specific-components)
5. [Utility Components](#5-utility-components)

---

## 1. Layout Components

### 1.1 SidebarLayoutV2

**Ubicación:** `/components/layout-v2/SidebarLayoutV2.tsx`

**Propósito:** Layout principal con sidebar vertical para Dashboard, Recomendaciones, etc.

**Props:**
```typescript
interface SidebarLayoutV2Props {
  children: React.ReactNode;
  showProviderToggle?: boolean;  // Mostrar filtro de proveedores
  sidebarVariant?: 'default' | 'compact';
  className?: string;
}
```

**Estructura:**
```tsx
<div className="flex h-screen overflow-hidden">
  {/* Sidebar */}
  <aside className="w-64 bg-white dark:bg-card-dark border-r">
    {/* Logo */}
    <div className="h-16 flex items-center gap-3 px-6 border-b">
      <CloudIcon />
      <div>
        <h1>CloudNexus</h1>
        <p className="text-xs">Multi-Cloud Admin</p>
      </div>
    </div>

    {/* Navigation */}
    <nav className="flex-1 overflow-y-auto py-6 px-3">
      {navItems.map(item => (
        <NavItem key={item.href} {...item} />
      ))}
    </nav>

    {/* User Profile */}
    <div className="p-4 border-t">
      <UserProfile />
    </div>
  </aside>

  {/* Main Content */}
  <main className="flex-1 flex flex-col overflow-hidden">
    {/* Top Bar */}
    <header className="h-16 bg-white border-b flex items-center justify-between px-6">
      {showProviderToggle && <ProviderToggle />}
      <div className="flex items-center gap-4">
        <SearchBar />
        <NotificationButton />
        <SettingsButton />
      </div>
    </header>

    {/* Scrollable Content */}
    <div className="flex-1 overflow-y-auto p-8">
      {children}
    </div>
  </main>
</div>
```

**Responsive Behavior:**
- Desktop (>1024px): Sidebar visible
- Tablet (768px-1024px): Sidebar colapsable
- Mobile (<768px): Sidebar overlay con backdrop

**Accessibility:**
- Sidebar con `aria-label="Sidebar navigation"`
- Skip to main content link
- Keyboard navigation (Tab, Shift+Tab)
- Focus trap en sidebar mobile

---

### 1.2 TopNavLayoutV2

**Ubicación:** `/components/layout-v2/TopNavLayoutV2.tsx`

**Propósito:** Layout estilo Azure Portal para Connections (sin sidebar permanente)

**Props:**
```typescript
interface TopNavLayoutV2Props {
  children: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  showSidebar?: boolean;  // Sidebar opcional en mobile
  className?: string;
}
```

**Estructura:**
```tsx
<div className="flex flex-col h-screen">
  {/* Top Navigation */}
  <header className="h-14 bg-white border-b flex items-center px-4">
    <div className="flex items-center gap-4">
      <Logo />
      <Divider orientation="vertical" />
      {breadcrumbs && <BreadcrumbNav items={breadcrumbs} />}
    </div>

    <div className="ml-auto flex items-center gap-3">
      <SearchBar />
      <NotificationButton />
      <SettingsButton />
      <UserAvatar />
    </div>
  </header>

  {/* Optional Sidebar + Main */}
  <div className="flex flex-1 overflow-hidden">
    {showSidebar && (
      <aside className="w-64 border-r bg-white">
        {/* Sidebar content */}
      </aside>
    )}

    <main className="flex-1 overflow-auto bg-gray-50 p-6">
      {children}
    </main>
  </div>
</div>
```

**Use Cases:**
- Connections page
- Settings pages
- Configuración de cloud accounts

---

### 1.3 HybridLayout

**Ubicación:** `/components/layout-v2/HybridLayout.tsx`

**Propósito:** Layout flexible con sidebar + drawer lateral (Recomendaciones)

**Props:**
```typescript
interface HybridLayoutProps {
  children: React.ReactNode;
  drawerContent?: React.ReactNode;
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
  drawerWidth?: number;  // Default 400px
  className?: string;
}
```

**Estructura:**
```tsx
<div className="flex h-screen overflow-hidden">
  {/* Sidebar (como SidebarLayoutV2) */}
  <Sidebar />

  {/* Main Content */}
  <main className="flex-1 flex flex-col overflow-hidden">
    <TopBar />
    <div className="flex-1 overflow-y-auto p-8">
      {children}
    </div>
  </main>

  {/* Right Drawer (slide-in) */}
  {drawerOpen && (
    <>
      <Backdrop onClick={onDrawerClose} />
      <aside
        className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-2xl
                   transform transition-transform duration-300 z-50"
      >
        <DrawerHeader onClose={onDrawerClose} />
        <div className="overflow-y-auto p-6">
          {drawerContent}
        </div>
      </aside>
    </>
  )}
</div>
```

**Animation:**
```css
/* Slide-in transition */
.drawer-enter {
  transform: translateX(100%);
}
.drawer-enter-active {
  transform: translateX(0);
  transition: transform 300ms ease-out;
}
.drawer-exit {
  transform: translateX(0);
}
.drawer-exit-active {
  transform: translateX(100%);
  transition: transform 300ms ease-in;
}
```

---

## 2. UI Core Components

### 2.1 KPICard

**Ubicación:** `/components/ui-v2/KPICard.tsx`

**Propósito:** Card de métrica principal con trending indicator

**Props:**
```typescript
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;        // +5.2, -3.1, etc.
    direction: 'up' | 'down' | 'neutral';
    label?: string;       // "vs last month"
  };
  icon?: React.ReactNode;
  iconBgColor?: string;   // "bg-blue-50"
  iconColor?: string;     // "text-blue-600"
  topBorderColor?: string; // "bg-primary", "bg-emerald-500"
  className?: string;
}
```

**Ejemplo de uso:**
```tsx
<KPICard
  title="Total Monthly Cost"
  value="$12,450"
  subtitle="vs $11,800 last month"
  trend={{
    value: 5.2,
    direction: 'up',
    label: '5.2%'
  }}
  icon={<DollarIcon />}
  iconBgColor="bg-blue-50"
  iconColor="text-blue-600"
  topBorderColor="bg-primary"
/>
```

**Rendering:**
```tsx
<div className="bg-white p-5 rounded-xl border shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
  {/* Top border accent */}
  <div className={`absolute top-0 left-0 w-full h-1 ${topBorderColor}`} />

  <div className="flex justify-between items-start mb-4">
    {/* Icon */}
    <div className={`p-2 ${iconBgColor} rounded-lg ${iconColor}`}>
      {icon}
    </div>

    {/* Trend Badge */}
    {trend && (
      <span className={`text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 ${getTrendColor(trend.direction)}`}>
        <TrendIcon direction={trend.direction} />
        {trend.label}
      </span>
    )}
  </div>

  {/* Content */}
  <p className="text-slate-500 text-sm font-medium">{title}</p>
  <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
  {subtitle && <p className="text-xs text-slate-400 mt-2">{subtitle}</p>}
</div>
```

**Helper Functions:**
```typescript
const getTrendColor = (direction: 'up' | 'down' | 'neutral') => {
  switch(direction) {
    case 'up': return 'text-emerald-600 bg-emerald-50';
    case 'down': return 'text-red-600 bg-red-50';
    case 'neutral': return 'text-slate-500 bg-slate-100';
  }
};
```

---

### 2.2 StatusBadge

**Ubicación:** `/components/ui-v2/StatusBadge.tsx`

**Propósito:** Badge de estado con dot animado

**Props:**
```typescript
interface StatusBadgeProps {
  status: 'active' | 'warning' | 'error' | 'idle' | 'syncing';
  label?: string;
  showDot?: boolean;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

**Ejemplo:**
```tsx
<StatusBadge status="active" label="Active" showDot animated />
<StatusBadge status="warning" label="Warning" showDot animated />
<StatusBadge status="syncing" label="Syncing" animated />
```

**Rendering:**
```tsx
<span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusStyles(status)}`}>
  {showDot && (
    <span className={`h-1.5 w-1.5 rounded-full ${getDotColor(status)} ${animated ? 'animate-pulse' : ''}`} />
  )}
  {label || status}
</span>
```

**Styles:**
```typescript
const getStatusStyles = (status: string) => {
  switch(status) {
    case 'active': return 'bg-green-100 text-green-800 border border-green-200';
    case 'warning': return 'bg-orange-100 text-orange-800 border border-orange-200';
    case 'error': return 'bg-red-100 text-red-800 border border-red-200';
    case 'idle': return 'bg-gray-100 text-gray-600 border border-gray-200';
    case 'syncing': return 'bg-blue-100 text-blue-800 border border-blue-200';
  }
};

const getDotColor = (status: string) => {
  switch(status) {
    case 'active': return 'bg-green-500';
    case 'warning': return 'bg-orange-500 animate-pulse';
    case 'error': return 'bg-red-500';
    case 'idle': return 'bg-gray-400';
    case 'syncing': return 'bg-blue-500';
  }
};
```

---

### 2.3 ProviderToggle

**Ubicación:** `/components/ui-v2/ProviderToggle.tsx`

**Propósito:** Filtro global para AWS/Azure/GCP

**Props:**
```typescript
interface ProviderToggleProps {
  selected: 'all' | 'aws' | 'azure' | 'gcp';
  onChange: (provider: 'all' | 'aws' | 'azure' | 'gcp') => void;
  className?: string;
}
```

**Ejemplo:**
```tsx
const [provider, setProvider] = useState<'all' | 'aws' | 'azure' | 'gcp'>('all');

<ProviderToggle selected={provider} onChange={setProvider} />
```

**Rendering:**
```tsx
<div className="flex bg-slate-100 p-1 rounded-lg">
  <button
    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
      selected === 'all'
        ? 'bg-white shadow-sm text-slate-800'
        : 'text-slate-500 hover:text-slate-800'
    }`}
    onClick={() => onChange('all')}
  >
    All Clouds
  </button>

  <button
    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
      selected === 'aws'
        ? 'bg-white shadow-sm text-slate-800'
        : 'text-slate-500 hover:text-slate-800'
    }`}
    onClick={() => onChange('aws')}
  >
    AWS
  </button>

  {/* Similar para Azure y GCP */}
</div>
```

**State Management:**
```typescript
// Usar Zustand store global
interface ProviderStore {
  selectedProvider: 'all' | 'aws' | 'azure' | 'gcp';
  setProvider: (provider: 'all' | 'aws' | 'azure' | 'gcp') => void;
}

export const useProviderStore = create<ProviderStore>((set) => ({
  selectedProvider: 'all',
  setProvider: (provider) => set({ selectedProvider: provider }),
}));
```

---

### 2.4 Drawer

**Ubicación:** `/components/ui-v2/Drawer.tsx`

**Propósito:** Panel lateral slide-in para detalles/configuración

**Props:**
```typescript
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: number;  // Default 400px
  position?: 'left' | 'right';  // Default 'right'
  footer?: React.ReactNode;
  className?: string;
}
```

**Ejemplo:**
```tsx
const [drawerOpen, setDrawerOpen] = useState(false);

<Drawer
  open={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  title="Resource Details"
  subtitle="i-0a1b2c3d4e5f6g7h8 • AWS EC2 • us-east-1"
  footer={
    <>
      <Button variant="secondary">Cancel</Button>
      <Button variant="primary">Apply Fix</Button>
    </>
  }
>
  <ResourceDetails resourceId="..." />
</Drawer>
```

**Rendering:**
```tsx
{open && (
  <>
    {/* Backdrop */}
    <div
      className="fixed inset-0 bg-black/50 z-40 transition-opacity"
      onClick={onClose}
    />

    {/* Drawer Panel */}
    <aside
      className={`
        fixed ${position === 'right' ? 'right-0' : 'left-0'} top-0
        h-full bg-white shadow-2xl z-50 flex flex-col
        transform transition-transform duration-300
        ${open ? 'translate-x-0' : position === 'right' ? 'translate-x-full' : '-translate-x-full'}
      `}
      style={{ width: `${width}px` }}
    >
      {/* Header */}
      <div className="p-6 border-b bg-gray-50 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <XIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          {footer}
        </div>
      )}
    </aside>
  </>
)}
```

**Animation con Framer Motion (opcional):**
```tsx
import { motion, AnimatePresence } from 'framer-motion';

<AnimatePresence>
  {open && (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      <motion.aside
        initial={{ x: position === 'right' ? '100%' : '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: position === 'right' ? '100%' : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed ... z-50"
      >
        {/* content */}
      </motion.aside>
    </>
  )}
</AnimatePresence>
```

---

### 2.5 BreadcrumbNav

**Ubicación:** `/components/ui-v2/BreadcrumbNav.tsx`

**Propósito:** Navegación jerárquica tipo Azure Portal

**Props:**
```typescript
interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;  // Default: ChevronRight
  className?: string;
}
```

**Ejemplo:**
```tsx
<BreadcrumbNav
  items={[
    { label: 'Portal', href: '/' },
    { label: 'Settings', href: '/settings' },
    { label: 'Connections' },
  ]}
/>
```

**Rendering:**
```tsx
<nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
  {items.map((item, index) => (
    <React.Fragment key={index}>
      {index > 0 && (
        <ChevronRightIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
      )}

      {item.href ? (
        <Link href={item.href} className="text-gray-500 hover:text-primary transition-colors">
          {item.icon && <span className="mr-1">{item.icon}</span>}
          {item.label}
        </Link>
      ) : (
        <span className="font-medium text-gray-900">
          {item.icon && <span className="mr-1">{item.icon}</span>}
          {item.label}
        </span>
      )}
    </React.Fragment>
  ))}
</nav>
```

---

### 2.6 FilterToolbar

**Ubicación:** `/components/ui-v2/FilterToolbar.tsx`

**Propósito:** Barra de filtros avanzada con múltiples dropdowns

**Props:**
```typescript
interface FilterOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface Filter {
  id: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

interface FilterToolbarProps {
  filters: Filter[];
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  className?: string;
}
```

**Ejemplo:**
```tsx
<FilterToolbar
  filters={[
    {
      id: 'provider',
      label: 'Proveedor',
      options: [
        { label: 'Todos', value: 'all' },
        { label: 'AWS', value: 'aws' },
        { label: 'Azure', value: 'azure' },
        { label: 'GCP', value: 'gcp' },
      ],
      value: providerFilter,
      onChange: setProviderFilter,
    },
    {
      id: 'severity',
      label: 'Severidad',
      options: [
        { label: 'Todas', value: 'all' },
        { label: 'Alta', value: 'high' },
        { label: 'Media', value: 'medium' },
        { label: 'Baja', value: 'low' },
      ],
      value: severityFilter,
      onChange: setSeverityFilter,
    },
  ]}
  viewMode={viewMode}
  onViewModeChange={setViewMode}
/>
```

**Rendering:**
```tsx
<div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-lg border shadow-sm">
  {/* Filter Label */}
  <div className="flex items-center px-3 border-r">
    <FilterIcon className="text-gray-400" />
    <span className="ml-2 text-sm font-semibold">Filtros:</span>
  </div>

  {/* Filter Dropdowns */}
  <div className="flex gap-2 flex-wrap">
    {filters.map(filter => (
      <Select
        key={filter.id}
        value={filter.value}
        onValueChange={filter.onChange}
      >
        <SelectTrigger className="min-w-[150px]">
          <SelectValue>{filter.label}: {getCurrentLabel(filter)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {filter.options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.icon && option.icon}
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ))}
  </div>

  {/* Spacer */}
  <div className="flex-1" />

  {/* View Mode Toggle */}
  {onViewModeChange && (
    <div className="flex bg-gray-100 rounded-md p-0.5">
      <button
        className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
        onClick={() => onViewModeChange('list')}
      >
        <ListIcon className={viewMode === 'list' ? 'text-primary' : 'text-gray-400'} />
      </button>
      <button
        className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
        onClick={() => onViewModeChange('grid')}
      >
        <GridIcon className={viewMode === 'grid' ? 'text-primary' : 'text-gray-400'} />
      </button>
    </div>
  )}
</div>
```

---

## 3. Chart Components

### 3.1 CostTrendChart

**Ubicación:** `/components/charts-v2/CostTrendChart.tsx`

**Propósito:** Gráfico de líneas multi-provider con gradientes

**Props:**
```typescript
interface DataPoint {
  date: string;
  aws: number;
  azure: number;
  gcp: number;
}

interface CostTrendChartProps {
  data: DataPoint[];
  height?: number;
  showLegend?: boolean;
  className?: string;
}
```

**Implementación con Recharts:**
```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const CostTrendChart: React.FC<CostTrendChartProps> = ({
  data,
  height = 250,
  showLegend = true,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <defs>
          <linearGradient id="awsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f2780d" stopOpacity={0.1} />
            <stop offset="100%" stopColor="#f2780d" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="azureGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.1} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="date"
          stroke="#94a3b8"
          fontSize={12}
          tickLine={false}
        />
        <YAxis
          stroke="#94a3b8"
          fontSize={12}
          tickLine={false}
          tickFormatter={(value) => `$${value}`}
        />

        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: 'none',
            borderRadius: '8px',
            color: 'white'
          }}
          formatter={(value) => [`$${value}`, '']}
        />

        {showLegend && <Legend />}

        <Line
          type="monotone"
          dataKey="aws"
          stroke="#f2780d"
          strokeWidth={3}
          fill="url(#awsGradient)"
          dot={{ fill: '#f2780d', r: 4 }}
          activeDot={{ r: 6 }}
        />

        <Line
          type="monotone"
          dataKey="azure"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#azureGradient)"
          dot={false}
        />

        <Line
          type="monotone"
          dataKey="gcp"
          stroke="#10b981"
          strokeWidth={2}
          strokeOpacity={0.6}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

---

### 3.2 CircularProgress

**Ubicación:** `/components/charts-v2/CircularProgress.tsx`

**Propósito:** Score circular tipo Security Health

**Props:**
```typescript
interface CircularProgressProps {
  value: number;      // 0-100
  size?: number;      // Default 192px
  strokeWidth?: number;  // Default 12px
  color?: string;     // Default primary
  label?: string;
  sublabel?: string;
  className?: string;
}
```

**Implementación:**
```tsx
export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 192,
  strokeWidth = 12,
  color = '#f2780d',
  label,
  sublabel,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s ease-out'
          }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-slate-900">{value}%</span>
        {sublabel && (
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
};
```

---

## 4. Page-Specific Components

### 4.1 RecommendationCard

**Ubicación:** `/components/recommendations/RecommendationCard.tsx`

**Propósito:** Card de recomendación con border-left de severidad

**Props:**
```typescript
interface RecommendationCardProps {
  severity: 'critical' | 'high' | 'medium' | 'low';
  provider: 'aws' | 'azure' | 'gcp';
  region: string;
  title: string;
  description: string;
  resource: string;
  savingsAmount?: string;
  timestamp: string;
  onOptimize?: () => void;
  onViewDetails?: () => void;
  className?: string;
}
```

**Ejemplo:**
```tsx
<RecommendationCard
  severity="high"
  provider="aws"
  region="us-east-1"
  title="Instancias EC2 Subutilizadas"
  description="3 instancias t3.xlarge tienen un uso de CPU < 5% en los últimos 7 días. Se recomienda cambiar a t3.medium."
  resource="i-0a1b2c3d4e5f6g7h8"
  savingsAmount="$145/mes"
  timestamp="Hace 2 horas"
  onOptimize={() => handleOptimize()}
  onViewDetails={() => openDrawer()}
/>
```

**Rendering:**
```tsx
<div className={`
  bg-white rounded-lg shadow-sm hover:shadow-md transition-all
  border-l-4 border-y border-r
  ${getSeverityBorderColor(severity)}
`}>
  <div className="p-5 flex flex-col md:flex-row md:items-center gap-5">
    {/* Icon & Provider */}
    <div className="flex items-center gap-4 min-w-[200px]">
      <div className={`p-2 rounded-full ${getSeverityBgColor(severity)}`}>
        {getSeverityIcon(severity)}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded border ${getProviderStyle(provider)}`}>
            {provider.toUpperCase()}
          </span>
          <span className="text-xs text-gray-500">{region}</span>
        </div>
        <h3 className="font-bold text-slate-900">{title}</h3>
      </div>
    </div>

    {/* Details */}
    <div className="flex-1 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
      <p className="text-sm text-gray-600 mb-2">{description}</p>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1 text-gray-500">
          <ClockIcon className="h-4 w-4" />
          {timestamp}
        </div>
        {savingsAmount && (
          <div className="flex items-center gap-1 font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
            Ahorro: {savingsAmount}
          </div>
        )}
      </div>
    </div>

    {/* Actions */}
    <div className="flex md:flex-col items-center gap-2 mt-2 md:mt-0 min-w-[140px]">
      <button
        onClick={onOptimize}
        className="w-full px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-md transition-colors shadow-sm flex items-center justify-center gap-2"
      >
        <ToolIcon className="h-4 w-4" />
        Optimizar
      </button>
      <button
        onClick={onViewDetails}
        className="w-full px-4 py-2 bg-transparent hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
      >
        Detalles
      </button>
    </div>
  </div>
</div>
```

**Helper Functions:**
```typescript
const getSeverityBorderColor = (severity: string) => {
  switch(severity) {
    case 'critical': return 'border-l-red-500';
    case 'high': return 'border-l-orange-500';
    case 'medium': return 'border-l-yellow-500';
    case 'low': return 'border-l-blue-500';
  }
};

const getSeverityBgColor = (severity: string) => {
  switch(severity) {
    case 'critical': return 'bg-red-50 text-red-500';
    case 'high': return 'bg-orange-50 text-orange-600';
    case 'medium': return 'bg-yellow-50 text-yellow-600';
    case 'low': return 'bg-blue-50 text-blue-600';
  }
};

const getProviderStyle = (provider: string) => {
  switch(provider) {
    case 'aws': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'azure': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'gcp': return 'text-green-600 bg-green-50 border-green-200';
  }
};
```

---

### 4.2 ConnectionCard

**Ubicación:** `/components/connections/ConnectionCard.tsx`

**Propósito:** Card de proveedor cloud con branding

**Props:**
```typescript
interface ConnectionCardProps {
  provider: 'aws' | 'azure' | 'gcp';
  name: string;
  id: string;
  region: string;
  lastSync: string;
  status: 'active' | 'warning' | 'error' | 'idle' | 'syncing';
  progressPercent?: number;  // Para syncing
  alertMessage?: string;
  onConfigure?: () => void;
  onDelete?: () => void;
  className?: string;
}
```

**Ejemplo:**
```tsx
<ConnectionCard
  provider="aws"
  name="Production AWS"
  id="aws-prod-01"
  region="us-east-1"
  lastSync="2 mins ago"
  status="active"
  onConfigure={() => openDrawer('aws-prod-01')}
/>

<ConnectionCard
  provider="azure"
  name="Analytics Tenant"
  id="az-analytics-dev"
  region="West Europe"
  lastSync="4 hours ago"
  status="warning"
  alertMessage="Client secret expires in 3 days. Please rotate credentials."
  onConfigure={() => openDrawer('az-analytics-dev')}
/>
```

**Rendering:**
```tsx
<div className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all border hover:border-gray-200 flex flex-col h-full relative overflow-hidden">
  {/* Provider accent bar */}
  <div className={`absolute top-0 left-0 w-1.5 h-full ${getProviderColor(provider)}`} />

  <div className="p-5 flex-1">
    {/* Header */}
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3">
        {/* Provider logo */}
        <div className={`w-10 h-10 rounded-md flex items-center justify-center ${getProviderBg(provider)}`}>
          <ProviderLogo provider={provider} />
        </div>
        <div>
          <h4 className="font-bold text-slate-900">{name}</h4>
          <p className="text-xs text-gray-500">ID: {id}</p>
        </div>
      </div>

      {/* Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <MoreVerticalIcon className="h-5 w-5 text-gray-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onConfigure}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-red-600">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    {/* Details */}
    <div className="space-y-3 mb-4">
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Region</span>
        <span className="font-medium">{region}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Last Sync</span>
        <span className="font-medium">{lastSync}</span>
      </div>
      <div className="flex justify-between text-sm items-center">
        <span className="text-gray-500">Status</span>
        <StatusBadge status={status} showDot animated />
      </div>
    </div>

    {/* Alert message */}
    {alertMessage && (
      <div className="bg-orange-50 p-2 rounded border border-orange-100 text-xs text-slate-900 flex gap-2 items-start mb-2">
        <InfoIcon className="h-4 w-4 text-orange-600 mt-0.5" />
        <span>{alertMessage}</span>
      </div>
    )}

    {/* Progress bar for syncing */}
    {status === 'syncing' && progressPercent !== undefined && (
      <div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-right text-gray-500">
          Importing schemas ({progressPercent}%)
        </p>
      </div>
    )}
  </div>

  {/* Footer */}
  <div className="px-5 py-3 bg-gray-50 border-t flex justify-between items-center">
    <button
      onClick={onConfigure}
      className="text-sm font-semibold text-primary hover:text-primary-hover flex items-center gap-1"
    >
      <SettingsIcon className="h-4 w-4" />
      Configure
    </button>
    <LockIcon className="h-4 w-4 text-green-500" title="Secure connection" />
  </div>
</div>
```

---

## 5. Utility Components

### 5.1 ProviderLogo

**Ubicación:** `/components/ui-v2/ProviderLogo.tsx`

**Propósito:** Logos consistentes de cloud providers

**Props:**
```typescript
interface ProviderLogoProps {
  provider: 'aws' | 'azure' | 'gcp';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

**Implementación:**
```tsx
export const ProviderLogo: React.FC<ProviderLogoProps> = ({
  provider,
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  // Option 1: SVG logos inline
  if (provider === 'aws') {
    return (
      <svg className={`${sizeClasses[size]} ${className}`} viewBox="0 0 24 24">
        {/* AWS logo SVG path */}
      </svg>
    );
  }

  // Option 2: Image from public folder
  return (
    <img
      src={`/logos/${provider}.svg`}
      alt={`${provider.toUpperCase()} logo`}
      className={`${sizeClasses[size]} object-contain ${className}`}
    />
  );
};
```

---

## Testing Strategy

### Unit Tests Template
```typescript
import { render, screen } from '@testing-library/react';
import { KPICard } from './KPICard';

describe('KPICard', () => {
  it('renders title and value', () => {
    render(
      <KPICard title="Total Cost" value="$12,450" />
    );
    expect(screen.getByText('Total Cost')).toBeInTheDocument();
    expect(screen.getByText('$12,450')).toBeInTheDocument();
  });

  it('shows trend indicator when provided', () => {
    render(
      <KPICard
        title="Cost"
        value="$100"
        trend={{ value: 5.2, direction: 'up', label: '5.2%' }}
      />
    );
    expect(screen.getByText('5.2%')).toBeInTheDocument();
  });

  it('applies correct trend color', () => {
    const { container } = render(
      <KPICard
        title="Cost"
        value="$100"
        trend={{ value: 5.2, direction: 'up' }}
      />
    );
    const trendBadge = container.querySelector('.text-emerald-600');
    expect(trendBadge).toBeInTheDocument();
  });
});
```

### E2E Tests Template
```typescript
import { test, expect } from '@playwright/test';

test.describe('Dashboard V2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display 4 KPI cards', async ({ page }) => {
    const kpiCards = page.locator('[data-testid="kpi-card"]');
    await expect(kpiCards).toHaveCount(4);
  });

  test('should filter by AWS provider', async ({ page }) => {
    await page.click('text=AWS');
    await expect(page).toHaveURL(/.*provider=aws/);
    // Verify filtered data
  });

  test('should open drawer on recommendation click', async ({ page }) => {
    await page.click('text=Detalles >> nth=0');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });
});
```

---

## Performance Considerations

### Code Splitting
```typescript
// Lazy load heavy components
const CostTrendChart = dynamic(() => import('./CostTrendChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

const ConnectionCard = dynamic(() => import('./ConnectionCard'), {
  loading: () => <CardSkeleton />,
});
```

### Memoization
```typescript
// Memoize expensive calculations
const formattedData = useMemo(() => {
  return rawData.map(item => ({
    ...item,
    formatted: formatCurrency(item.value)
  }));
}, [rawData]);

// Memoize callbacks
const handleOptimize = useCallback(() => {
  // logic
}, [dependencies]);
```

### Virtualization
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

// For large lists (Inventory page)
const rowVirtualizer = useVirtualizer({
  count: 10000,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
});
```

---

**Última actualización:** 2025-12-26
**Versión:** 1.0
