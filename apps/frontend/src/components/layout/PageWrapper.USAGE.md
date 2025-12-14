# PageWrapper Component - Complete Usage Guide

## Overview

The `PageWrapper` component is a reusable layout wrapper that provides consistent padding, spacing, and max-width constraints across all pages in the Cloud Copilot application. It ensures visual consistency and maintains accessibility standards throughout the application.

## Features

- **Responsive Padding**: Mobile-first responsive padding (p-4 sm:p-6 lg:p-8)
- **Configurable Spacing**: Vertical spacing between child sections (sm, md, lg)
- **Max-Width Options**: Multiple max-width variants (full, container, 4xl, 2xl)
- **Semantic Breadcrumbs**: Built-in breadcrumb navigation support
- **Accessibility**: WCAG 2.1 AA compliant with proper semantic HTML
- **Performance**: Optimized with React.memo and useMemo
- **TypeScript**: Fully typed with strict types

## API Reference

### Props

```typescript
interface PageWrapperProps {
  // Required
  children: React.ReactNode;

  // Optional
  maxWidth?: 'full' | 'container' | '4xl' | '2xl';  // Default: 'full'
  spacing?: 'sm' | 'md' | 'lg';                      // Default: 'md'
  className?: string;
  breadcrumbs?: React.ReactNode;
  withPadding?: boolean;                             // Default: true
  ariaLabel?: string;                                // Default: 'Main content'
  backgroundColor?: string;
  minHeight?: string;
}
```

### Max-Width Variants

| Variant | Width | Use Case |
|---------|-------|----------|
| `full` | 100% | Full-width pages (dashboards, admin panels) |
| `container` | 1440px | Main content area (default for most pages) |
| `4xl` | 896px | Wide content sections |
| `2xl` | 672px | Centered forms, settings, narrow content |

### Spacing Variants

| Variant | Gap | Use Case |
|---------|-----|----------|
| `sm` | 16px (space-y-4) | Compact layouts with closely related content |
| `md` | 24px (space-y-6) | Default spacing for most pages |
| `lg` | 32px (space-y-8) | Open layouts with distinct sections |

## Usage Examples

### Basic Usage

```tsx
import { PageWrapper } from '@/components/layout';

export default function DashboardPage() {
  return (
    <PageWrapper>
      <h1>Dashboard</h1>
      <p>Welcome to your dashboard</p>
    </PageWrapper>
  );
}
```

### With Breadcrumbs

```tsx
import { PageWrapper } from '@/components/layout';
import { Breadcrumb } from '@/components/ui/breadcrumb';

export default function SettingsPage() {
  return (
    <PageWrapper
      breadcrumbs={
        <Breadcrumb>
          <BreadcrumbItem href="/">Home</BreadcrumbItem>
          <BreadcrumbItem>Settings</BreadcrumbItem>
        </Breadcrumb>
      }
    >
      <h1>Settings</h1>
      <SettingsForm />
    </PageWrapper>
  );
}
```

### Centered Form Layout

```tsx
import { PageWrapper } from '@/components/layout';

export default function LoginPage() {
  return (
    <PageWrapper
      maxWidth="2xl"
      spacing="sm"
      backgroundColor="bg-white"
      className="shadow-lg rounded-lg"
    >
      <LoginForm />
    </PageWrapper>
  );
}
```

### Full Height Layout

```tsx
import { PageWrapper } from '@/components/layout';

export default function SetupWizard() {
  return (
    <PageWrapper
      maxWidth="container"
      minHeight="min-h-screen"
      className="bg-gradient-to-br from-brand-orange to-orange-600"
    >
      <WizardContent />
    </PageWrapper>
  );
}
```

### Dashboard with Stats

```tsx
import { PageWrapper } from '@/components/layout';

export default function CloudAccountsPage() {
  return (
    <PageWrapper
      maxWidth="container"
      spacing="lg"
      breadcrumbs={<Breadcrumbs />}
    >
      <PageHeader
        title="Cloud Accounts"
        description="Manage your connected cloud accounts"
      />
      <StatsGrid />
      <AccountsList />
      <ActivityFeed />
    </PageWrapper>
  );
}
```

### Custom Styling

```tsx
import { PageWrapper } from '@/components/layout';

export default function ReportsPage() {
  return (
    <PageWrapper
      maxWidth="container"
      className="dark:bg-gray-900 dark:text-white"
      backgroundColor="bg-gray-50"
    >
      <ReportFilters />
      <ReportTable />
      <ReportCharts />
    </PageWrapper>
  );
}
```

## Responsive Behavior

### Padding Breakpoints

| Breakpoint | Padding | Screen Size |
|-----------|---------|------------|
| Mobile | p-4 (16px) | < 640px |
| Tablet | sm:p-6 (24px) | 640px - 1024px |
| Desktop | lg:p-8 (32px) | > 1024px |

### Content Alignment

When `maxWidth` is set to anything other than `full`:
- Content is horizontally centered using `mx-auto`
- Padding remains responsive on all sides
- Content adapts to screen size while maintaining max-width constraint

## Accessibility Features

### Semantic HTML

- Uses `<main>` element for primary page content
- Breadcrumbs wrapped in `<nav>` element with proper aria-label
- Maintains proper heading hierarchy

### ARIA Attributes

- `role="main"` - Explicitly identifies the main content area
- `aria-label` - Customizable description for screen readers
- Breadcrumb `aria-label="Breadcrumb navigation"` - Identifies navigation purpose

### Keyboard Navigation

- Fully keyboard accessible
- Compatible with skip-to-content navigation patterns
- Focus management friendly for nested components

### Color Contrast

- Design system colors meet WCAG AA standards
- Dark mode support through Tailwind
- Optional custom background colors

## Performance Considerations

### Optimization Techniques

1. **React.memo**: Component is memoized to prevent unnecessary re-renders
2. **useMemo**: Class name computation is memoized
3. **Minimal Dependencies**: useMemo dependencies are optimized
4. **Lightweight DOM**: Minimal DOM structure without unnecessary wrappers

### Best Practices

```tsx
// Good: Stable component references
const breadcrumbs = useMemo(() => <Breadcrumb />, []);
<PageWrapper breadcrumbs={breadcrumbs} />

// Avoid: Creating breadcrumbs inline on every render
<PageWrapper breadcrumbs={<Breadcrumb />} />
```

## Common Patterns

### Full-Width Dashboard

```tsx
export default function DashboardPage() {
  return (
    <PageWrapper maxWidth="full" spacing="lg">
      <DashboardHeader />
      <MetricsGrid columns={4} />
      <ChartsSection />
      <DetailsTable />
    </PageWrapper>
  );
}
```

### Single Column Content

```tsx
export default function ArticlePage() {
  return (
    <PageWrapper maxWidth="4xl" spacing="md">
      <ArticleHeader />
      <ArticleContent />
      <RelatedArticles />
    </PageWrapper>
  );
}
```

### Modal-like Form

```tsx
export default function ModalForm() {
  return (
    <PageWrapper maxWidth="2xl" spacing="sm" className="fixed inset-0 bg-black/50">
      <div className="bg-white rounded-lg">
        <FormHeader />
        <FormContent />
        <FormActions />
      </div>
    </PageWrapper>
  );
}
```

### Dark Mode Support

```tsx
export default function DarkModePage() {
  return (
    <PageWrapper
      maxWidth="container"
      backgroundColor="dark:bg-gray-900 bg-white"
      className="dark:text-white text-gray-900"
    >
      <DarkModeContent />
    </PageWrapper>
  );
}
```

## Troubleshooting

### Content Not Centered

**Problem**: Content with `maxWidth="container"` is not centered

**Solution**: Ensure parent elements don't have conflicting width or margin:
```tsx
// Bad
<div className="w-1/2">
  <PageWrapper maxWidth="container">...</PageWrapper>
</div>

// Good
<PageWrapper maxWidth="container">...</PageWrapper>
```

### Breadcrumbs Not Aligned

**Problem**: Breadcrumbs don't align with main content

**Solution**: This is handled automatically by the component. If custom styling is needed, ensure it doesn't conflict with the breadcrumbs wrapper classes.

### Excessive Padding

**Problem**: Too much padding on mobile devices

**Solution**: Either reduce spacing or use `withPadding={false}`:
```tsx
<PageWrapper spacing="sm" withPadding={false}>
  <div className="p-2">Mobile-optimized content</div>
</PageWrapper>
```

### Custom Styles Not Applied

**Problem**: Custom className props not being applied

**Solution**: Ensure Tailwind classes are included in your build. Classes provided via props must be in the purge/content configuration.

## TypeScript Support

### Type Safety

```tsx
import { PageWrapper, type PageWrapperProps, type MaxWidthVariant, type SpacingVariant } from '@/components/layout';

// Type-safe props
const pageProps: PageWrapperProps = {
  children: <div>Content</div>,
  maxWidth: 'container',
  spacing: 'md',
};

// Type-safe variants
const width: MaxWidthVariant = 'container';
const spacing: SpacingVariant = 'lg';
```

## Migration Guide

### From Custom Wrapper Components

If you have custom wrapper components, you can replace them:

```tsx
// Before
export default function Page() {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {content}
    </div>
  );
}

// After
export default function Page() {
  return (
    <PageWrapper maxWidth="4xl" spacing="md">
      {content}
    </PageWrapper>
  );
}
```

## Browser Support

- Modern browsers (ES2020+)
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers (iOS Safari, Chrome Android)
- Server-side rendering compatible (Next.js, Remix)

## Design System Integration

The PageWrapper component integrates with the Cloud Copilot Design System:

- **Colors**: Supports all design system colors via `backgroundColor` prop
- **Spacing**: Uses the 4px base unit spacing scale
- **Typography**: Inherits from font family definitions
- **Responsive**: Built on the design system breakpoints (xs, sm, md, lg, xl, 2xl, 3xl)

## Contributing

When modifying the PageWrapper component:

1. Maintain backward compatibility with existing props
2. Update JSDoc comments for any new props
3. Add usage examples for new features
4. Test responsive behavior on multiple screen sizes
5. Verify accessibility with screen readers
6. Update this documentation

## Related Components

- `TopNav` - Top navigation bar
- `Sidebar` - Left sidebar navigation
- `Breadcrumb` - Breadcrumb navigation component (use with `breadcrumbs` prop)
