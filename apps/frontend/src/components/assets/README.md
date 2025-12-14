# Assets Components

Asset Discovery and Inventory Management Components for Cloud Copilot.

## Overview

This directory contains all components related to the Asset Discovery feature (Phase 5b). These components provide a comprehensive UI for viewing, filtering, and managing cloud infrastructure assets discovered from AWS and Azure.

## Components

### 1. AssetInventoryTable

**File:** `AssetInventoryTable.tsx` (312 lines)

**Purpose:** Main table component for displaying asset inventory.

**Features:**
- Sortable columns
- Provider badges (AWS: orange, Azure: blue)
- Status badges (Active: green, Terminated: gray)
- Cost formatting with currency
- Relative time display (e.g., "2 hours ago")
- Row click to view details
- Loading skeleton states
- Empty state with helpful message
- Pagination controls
- Keyboard accessible (Enter/Space to select)
- Responsive design with horizontal scroll

**Props:**
```typescript
interface AssetInventoryTableProps {
  assets: Asset[];
  isLoading: boolean;
  onAssetClick: (asset: Asset) => void;
  pagination: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}
```

**Usage:**
```tsx
<AssetInventoryTable
  assets={assets}
  isLoading={isLoading}
  onAssetClick={handleAssetClick}
  pagination={{
    page: currentPage,
    totalPages: 10,
    onPageChange: setCurrentPage,
  }}
/>
```

### 2. AssetFilters

**File:** `AssetFilters.tsx` (306 lines)

**Purpose:** Filter controls for the asset inventory.

**Features:**
- Search by name/resource ID (300ms debounced)
- Provider filter (All, AWS, Azure)
- Status filter (Active, Terminated, All)
- Resource type dropdown (contextual)
- Region dropdown (contextual)
- Clear filters button
- Active filters summary chips
- Responsive grid layout
- Accessibility labels

**Props:**
```typescript
interface AssetFiltersProps {
  filters: AssetFiltersState;
  onFiltersChange: (filters: AssetFiltersState) => void;
}

interface AssetFiltersState {
  provider?: AssetProvider;
  resourceType?: string;
  region?: string;
  status?: AssetStatus;
  search?: string;
}
```

**Usage:**
```tsx
<AssetFilters
  filters={filters}
  onFiltersChange={setFilters}
/>
```

### 3. AssetDetailModal

**File:** `AssetDetailModal.tsx` (334 lines)

**Purpose:** Modal for displaying detailed asset information.

**Features:**
- Complete asset metadata
- Copyable resource ID and asset ID
- Provider and status badges
- Region information
- Tags display (key-value badges)
- Monthly cost with link to cost page
- Discovery timeline
- Collapsible JSON metadata viewer
- Responsive modal layout
- Keyboard accessible (Esc to close)

**Props:**
```typescript
interface AssetDetailModalProps {
  asset: Asset | null;
  onClose: () => void;
}
```

**Usage:**
```tsx
<AssetDetailModal
  asset={selectedAsset}
  onClose={() => setSelectedAsset(null)}
/>
```

## Data Flow

```
Assets Page
    │
    ├─→ useAssets() hook
    │   └─→ assetsApi.list()
    │       └─→ GET /api/v1/assets
    │
    ├─→ AssetFilters
    │   └─→ Filter state management
    │
    ├─→ AssetInventoryTable
    │   ├─→ Display assets
    │   └─→ Handle row click
    │
    └─→ AssetDetailModal
        ├─→ Display asset details
        └─→ Copy to clipboard
```

## Styling

All components follow the Cloud Copilot Design System:

### Colors
- **Brand Orange:** `#ff6b35` (primary actions)
- **AWS Orange:** Orange badges for AWS resources
- **Azure Blue:** Blue badges for Azure resources
- **Status Colors:**
  - Active: Green (#34a853)
  - Terminated: Gray
  - Error: Red (#dc2626)

### Responsive Breakpoints
- **xs:** 320px (mobile)
- **sm:** 640px (mobile landscape)
- **md:** 768px (tablet)
- **lg:** 1024px (desktop)
- **xl:** 1280px (large desktop)

### Typography
- **Font Family:** Segoe UI, system-ui, sans-serif
- **Base Size:** 16px
- **Line Height:** 1.6

## Accessibility

All components meet WCAG 2.1 AA standards:

### Keyboard Navigation
- **Tab:** Navigate between elements
- **Enter/Space:** Activate buttons and rows
- **Escape:** Close modals

### Screen Readers
- ARIA labels on all interactive elements
- Semantic HTML (table, button, heading tags)
- Status announcements for loading states
- Error messages properly associated

### Visual
- Color contrast ratios meet AA standards
- Focus indicators on all interactive elements
- No information conveyed by color alone

## Performance

### Optimizations
- React Query caching (30s stale time)
- Debounced search input (300ms)
- Skeleton loading states
- Virtualization ready (can add for large lists)
- Memoized components where appropriate

### Bundle Size
- Total: ~35KB gzipped
- Tree-shakeable exports
- No unnecessary dependencies

## Testing

### Unit Tests
```bash
npm test -- AssetInventoryTable
npm test -- AssetFilters
npm test -- AssetDetailModal
```

### E2E Tests
```bash
npm run test:e2e -- assets
```

### Accessibility Tests
```bash
npm run test:a11y -- assets
```

## Common Use Cases

### 1. Basic Asset Listing
```tsx
const { data } = useAssets({ status: 'active' });
const assets = extractAssetsData(data);

<AssetInventoryTable
  assets={assets?.data || []}
  isLoading={isLoading}
  onAssetClick={handleClick}
  pagination={...}
/>
```

### 2. Filtered Asset Search
```tsx
const [filters, setFilters] = useState({
  provider: 'AWS',
  status: 'active',
  search: 'prod',
});

<AssetFilters filters={filters} onFiltersChange={setFilters} />
```

### 3. Asset Discovery
```tsx
const { triggerDiscovery, isPending } = useAssetDiscovery();

<Button onClick={() => triggerDiscovery()}>
  {isPending ? 'Discovering...' : 'Discover Assets'}
</Button>
```

### 4. Real-time Updates
```tsx
const { data } = useAssets(filters, {
  refetchInterval: isDiscoveryActive ? 30000 : false,
});
```

## Dependencies

### Required
- `@tanstack/react-query` - Data fetching and caching
- `next-auth/react` - Authentication
- `date-fns` - Date formatting
- `lucide-react` - Icons
- `@radix-ui/*` - UI primitives

### UI Components
- Card, Button, Input, Badge
- Table components
- Dialog/Modal
- Select dropdowns
- Skeleton loaders

## Related Files

### API Layer
- `/apps/frontend/src/lib/api/assets.ts` - API client
- `/apps/frontend/src/hooks/useAssets.ts` - React Query hooks

### Pages
- `/apps/frontend/src/app/(dashboard)/assets/page.tsx` - Main page

### Backend
- `/apps/api-gateway/src/modules/assets/controllers/assets.controller.ts`
- `/apps/api-gateway/src/modules/assets/routes/assets.routes.ts`

## Troubleshooting

### Issue: Assets not loading
**Solution:** Check API endpoint configuration in `.env`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Issue: Discovery not working
**Solution:** Ensure cloud accounts are configured and credentials are valid.

### Issue: Filters not applying
**Solution:** Check that filter state is properly passed to `useAssets()` hook.

### Issue: Modal not closing
**Solution:** Ensure `onClose` prop is properly connected to state setter.

## Contributing

When adding new features:

1. Follow existing component patterns
2. Maintain TypeScript strict mode
3. Add proper ARIA labels
4. Include loading and error states
5. Write unit tests
6. Update this README

## License

Proprietary - Cloud Copilot Platform
