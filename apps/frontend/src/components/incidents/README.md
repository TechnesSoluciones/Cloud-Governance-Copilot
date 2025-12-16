# Incidents Components

Reusable UI components for incident management in Cloud Governance Copilot.

## Components Overview

### IncidentStatusBadge
Color-coded badge displaying incident status.

```tsx
import { IncidentStatusBadge } from '@/components/incidents';

<IncidentStatusBadge status="critical" />
```

### SeverityIndicator
Visual indicator with icon and optional text for severity levels.

```tsx
import { SeverityIndicator } from '@/components/incidents';

<SeverityIndicator severity="critical" showText={true} size="md" />
```

### IncidentTimeline
Vertical timeline visualization for incident events.

```tsx
import { IncidentTimeline } from '@/components/incidents';

<IncidentTimeline events={incident.timeline} />
```

### IncidentFilters
Comprehensive filtering interface with multi-select and date range.

```tsx
import { IncidentFilters } from '@/components/incidents';

const [filters, setFilters] = useState<IncidentFiltersState>({
  severity: [],
  status: [],
});

<IncidentFilters
  filters={filters}
  onFiltersChange={setFilters}
/>
```

### IncidentsList
Responsive table with sorting, pagination, and navigation.

```tsx
import { IncidentsList } from '@/components/incidents';

<IncidentsList
  incidents={incidents}
  isLoading={isLoading}
  pagination={pagination}
  onPageChange={setPage}
  onSort={handleSort}
/>
```

### AlertDetailModal
Slide-in modal for detailed alert information.

```tsx
import { AlertDetailModal } from '@/components/incidents';

<AlertDetailModal
  alert={selectedAlert}
  isOpen={!!selectedAlertId}
  onClose={() => setSelectedAlertId(null)}
/>
```

## Usage

Import individual components:

```tsx
import { IncidentStatusBadge, SeverityIndicator } from '@/components/incidents';
```

Or import all:

```tsx
import * as IncidentComponents from '@/components/incidents';
```

## Component Styling

All components use:
- Tailwind CSS for styling
- Shadcn/ui base components
- Lucide React icons
- Dark mode support
- Responsive design

## Accessibility

All components include:
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Semantic HTML structure

## Documentation

See [Incident Dashboard UI Guide](/docs/INCIDENT_DASHBOARD_UI_GUIDE.md) for complete documentation.
