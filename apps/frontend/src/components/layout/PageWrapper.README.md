# PageWrapper Component

A production-ready, fully accessible layout wrapper component that provides consistent padding, spacing, and max-width constraints across all pages in the Cloud Copilot application.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Props API](#props-api)
- [Examples](#examples)
- [Accessibility](#accessibility)
- [Responsive Design](#responsive-design)
- [Performance](#performance)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Features

- **Consistent Layout**: Provides standardized padding and spacing across all pages
- **Responsive Design**: Mobile-first approach with breakpoint-specific padding
- **Accessibility**: WCAG 2.1 AA compliant with proper ARIA labels and semantic HTML
- **TypeScript Support**: Fully typed with strict type checking
- **Flexible Constraints**: Multiple max-width options for different page layouts
- **Breadcrumb Support**: Built-in breadcrumb navigation integration
- **Performance Optimized**: Memoized component to prevent unnecessary re-renders
- **Design System Integration**: Uses Tailwind CSS classes from the Cloud Copilot design system

## Installation

The component is already included in the layout components. Import it from the centralized layout export:

```typescript
import { PageWrapper } from '@/components/layout';
```

Or import directly:

```typescript
import { PageWrapper } from '@/components/layout/PageWrapper';
```

## Basic Usage

```tsx
import { PageWrapper } from '@/components/layout';

export default function DashboardPage() {
  return (
    <PageWrapper>
      <h1>Dashboard</h1>
      <div>Your page content here</div>
    </PageWrapper>
  );
}
```

## Props API

### `PageWrapperProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | **Required** | The content to be rendered inside the wrapper |
| `maxWidth` | `'full' \| 'container' \| '4xl' \| '2xl'` | `'full'` | Maximum width constraint for the page content |
| `spacing` | `'sm' \| 'md' \| 'lg'` | `'md'` | Vertical spacing between child sections |
| `className` | `string` | `''` | Additional CSS classes to apply |
| `breadcrumbs` | `React.ReactNode` | `undefined` | Optional breadcrumbs element |
| `withPadding` | `boolean` | `true` | Whether to apply vertical padding |
| `ariaLabel` | `string` | `'Main content'` | Custom aria-label for accessibility |

### Max Width Variants

| Variant | Max Width | Use Case |
|---------|-----------|----------|
| `full` | 100% | Full-width dashboards, tables, charts |
| `container` | 1440px | Main content areas, list views |
| `4xl` | 896px (56rem) | Article-style content |
| `2xl` | 672px (42rem) | Forms, settings pages, centered content |

### Spacing Variants

| Variant | Spacing | Pixels | Use Case |
|---------|---------|--------|----------|
| `sm` | `space-y-4` | 16px | Compact layouts, forms |
| `md` | `space-y-6` | 24px | Standard pages (default) |
| `lg` | `space-y-8` | 32px | Dashboard sections, generous spacing |

### Responsive Padding

| Breakpoint | Padding | Pixels |
|------------|---------|--------|
| Mobile (default) | `p-4` | 16px |
| Tablet (`sm:`) | `p-6` | 24px |
| Desktop (`lg:`) | `p-8` | 32px |

## Examples

### 1. Full-Width Dashboard

```tsx
<PageWrapper spacing="lg">
  <h1 className="text-3xl font-bold">Dashboard</h1>

  <section aria-labelledby="kpis">
    <h2 id="kpis" className="text-2xl font-semibold mb-4">Key Metrics</h2>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* KPI cards */}
    </div>
  </section>

  <section aria-labelledby="charts">
    <h2 id="charts" className="text-2xl font-semibold mb-4">Trends</h2>
    {/* Charts */}
  </section>
</PageWrapper>
```

### 2. Centered Content Page

```tsx
<PageWrapper maxWidth="container">
  <h1 className="text-3xl font-bold">Cost Analysis</h1>
  <Card>
    <CardHeader>
      <CardTitle>Monthly Spend Overview</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Chart or content */}
    </CardContent>
  </Card>
</PageWrapper>
```

### 3. Form Page with Narrow Layout

```tsx
<PageWrapper maxWidth="2xl" spacing="sm">
  <div>
    <h1 className="text-3xl font-bold">Account Settings</h1>
    <p className="text-muted-foreground mt-2">
      Manage your account preferences
    </p>
  </div>

  <Card>
    <CardHeader>
      <CardTitle>Profile Information</CardTitle>
    </CardHeader>
    <CardContent>
      <ProfileForm />
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Security Settings</CardTitle>
    </CardHeader>
    <CardContent>
      <SecuritySettings />
    </CardContent>
  </Card>
</PageWrapper>
```

### 4. Page with Breadcrumbs

```tsx
const breadcrumbs = (
  <div className="flex items-center gap-2 text-sm">
    <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
      Dashboard
    </Link>
    <ChevronRight className="h-4 w-4 text-muted-foreground" />
    <Link href="/cloud-accounts" className="text-muted-foreground hover:text-foreground">
      Cloud Accounts
    </Link>
    <ChevronRight className="h-4 w-4 text-muted-foreground" />
    <span className="text-foreground font-medium">AWS Production</span>
  </div>
);

<PageWrapper breadcrumbs={breadcrumbs} maxWidth="container">
  <h1 className="text-3xl font-bold">AWS Production Account</h1>
  {/* Account details */}
</PageWrapper>
```

### 5. Custom Padding (No Default Padding)

```tsx
<PageWrapper withPadding={false} className="bg-gray-50">
  {/* Hero section with custom padding */}
  <div className="bg-primary text-primary-foreground px-4 py-12 sm:px-6 lg:px-8">
    <div className="max-w-container mx-auto">
      <h1 className="text-4xl font-bold">Security Dashboard</h1>
    </div>
  </div>

  {/* Content section with custom padding */}
  <div className="px-4 py-8 sm:px-6 lg:px-8">
    <div className="max-w-container mx-auto">
      {/* Content */}
    </div>
  </div>
</PageWrapper>
```

### 6. Loading State

```tsx
<PageWrapper maxWidth="container">
  <h1 className="text-3xl font-bold">Dashboard</h1>

  {isLoading ? (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  ) : (
    <div className="grid gap-6">
      {/* Loaded content */}
    </div>
  )}
</PageWrapper>
```

### 7. Error State

```tsx
<PageWrapper maxWidth="container">
  <h1 className="text-3xl font-bold">Dashboard</h1>

  {error ? (
    <div
      className="rounded-lg border border-error bg-error/10 p-6"
      role="alert"
      aria-live="assertive"
    >
      <h2 className="text-lg font-semibold text-error">Error Loading Data</h2>
      <p className="mt-2 text-sm text-error/80">{error.message}</p>
      <button
        onClick={handleRetry}
        className="mt-4 rounded-lg bg-error px-4 py-2 text-sm text-error-foreground"
      >
        Try Again
      </button>
    </div>
  ) : (
    <div>{/* Content */}</div>
  )}
</PageWrapper>
```

## Accessibility

The PageWrapper component follows WCAG 2.1 AA guidelines:

### Semantic HTML

- Uses `<main>` element with `role="main"` for the primary content area
- Uses `<nav>` element with proper `aria-label` for breadcrumbs
- Supports proper heading hierarchy

### ARIA Labels

```tsx
<PageWrapper ariaLabel="Dashboard content">
  {/* Your content maintains proper heading hierarchy */}
  <h1>Dashboard</h1>
  <section>
    <h2>Section Title</h2>
  </section>
</PageWrapper>
```

### Screen Reader Support

- Default `aria-label="Main content"` for the main wrapper
- Breadcrumbs wrapped in `<nav aria-label="Breadcrumb navigation">`
- All interactive elements remain keyboard accessible

### Focus Management

- No focus traps
- Maintains natural tab order
- Does not interfere with keyboard navigation

## Responsive Design

### Mobile-First Approach

The component uses a mobile-first responsive strategy:

```css
/* Mobile: 16px padding */
p-4

/* Tablet (640px+): 24px padding */
sm:p-6

/* Desktop (1024px+): 32px padding */
lg:p-8
```

### Breakpoints

Based on the Cloud Copilot design system:

- **xs**: 320px
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1440px
- **3xl**: 1920px

### Responsive Grid Example

```tsx
<PageWrapper maxWidth="container">
  <h1 className="text-3xl font-bold">Cloud Accounts</h1>

  {/* Responsive grid */}
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {accounts.map(account => (
      <AccountCard key={account.id} account={account} />
    ))}
  </div>
</PageWrapper>
```

## Performance

### Memoization

The component uses `React.memo` to prevent unnecessary re-renders:

```typescript
export const PageWrapper = React.memo<PageWrapperProps>(({ ... }) => {
  // Component implementation
});
```

### Optimized Class Generation

Class names are memoized using `React.useMemo`:

```typescript
const containerClasses = React.useMemo(() => {
  // Only recalculates when dependencies change
}, [maxWidth, spacing, className, withPadding]);
```

### No Side Effects

- No expensive computations
- No DOM manipulations
- No event listeners
- Pure component logic

## Best Practices

### 1. Use Appropriate Max Width

```tsx
// ✅ Good: Full width for dashboards
<PageWrapper maxWidth="full">
  <Dashboard />
</PageWrapper>

// ✅ Good: Constrained for forms
<PageWrapper maxWidth="2xl">
  <SettingsForm />
</PageWrapper>

// ❌ Bad: Narrow width for wide content
<PageWrapper maxWidth="2xl">
  <WideDataTable /> {/* Table will be cramped */}
</PageWrapper>
```

### 2. Maintain Heading Hierarchy

```tsx
// ✅ Good: Proper heading hierarchy
<PageWrapper>
  <h1>Page Title</h1>
  <section>
    <h2>Section Title</h2>
    <h3>Subsection</h3>
  </section>
</PageWrapper>

// ❌ Bad: Skipping heading levels
<PageWrapper>
  <h1>Page Title</h1>
  <h3>Skipped h2!</h3> {/* Skips h2 */}
</PageWrapper>
```

### 3. Use Semantic Sections

```tsx
// ✅ Good: Semantic sections with proper labels
<PageWrapper spacing="lg">
  <section aria-labelledby="overview">
    <h2 id="overview">Overview</h2>
    {/* Content */}
  </section>

  <section aria-labelledby="details">
    <h2 id="details">Details</h2>
    {/* Content */}
  </section>
</PageWrapper>
```

### 4. Choose Appropriate Spacing

```tsx
// ✅ Good: Large spacing for distinct sections
<PageWrapper spacing="lg">
  <KPISection />
  <ChartsSection />
  <ActivitySection />
</PageWrapper>

// ✅ Good: Small spacing for related form fields
<PageWrapper spacing="sm" maxWidth="2xl">
  <FormField name="firstName" />
  <FormField name="lastName" />
  <FormField name="email" />
</PageWrapper>
```

### 5. Handle Loading and Error States

```tsx
// ✅ Good: Proper loading and error handling
<PageWrapper maxWidth="container">
  <h1>Dashboard</h1>

  {isLoading && <LoadingSpinner />}
  {error && <ErrorAlert error={error} onRetry={refetch} />}
  {data && <DashboardContent data={data} />}
</PageWrapper>
```

## Troubleshooting

### Content Not Centered

**Problem**: Content isn't centered even with constrained max-width.

**Solution**: Ensure you're not using `maxWidth="full"`. Use `container`, `4xl`, or `2xl` instead:

```tsx
// ❌ Won't center
<PageWrapper maxWidth="full">

// ✅ Will center
<PageWrapper maxWidth="container">
```

### Too Much/Too Little Spacing

**Problem**: Spacing between sections doesn't look right.

**Solution**: Adjust the `spacing` prop:

```tsx
// Compact
<PageWrapper spacing="sm">

// Balanced (default)
<PageWrapper spacing="md">

// Generous
<PageWrapper spacing="lg">
```

### Custom Padding Not Working

**Problem**: Custom padding classes are being overridden.

**Solution**: Use `withPadding={false}` and apply your own:

```tsx
<PageWrapper withPadding={false} className="px-4 py-12">
  {/* Your content with custom padding */}
</PageWrapper>
```

### Breadcrumbs Not Showing

**Problem**: Breadcrumbs prop is set but not visible.

**Solution**: Ensure you're passing a valid React node:

```tsx
// ✅ Correct
<PageWrapper breadcrumbs={<YourBreadcrumbComponent />}>

// ❌ Won't work
<PageWrapper breadcrumbs="Home / Page">
```

### TypeScript Errors

**Problem**: TypeScript complains about prop types.

**Solution**: Import the type explicitly if needed:

```typescript
import { PageWrapper, type PageWrapperProps } from '@/components/layout';

// Use in props
interface MyPageProps {
  wrapperProps?: Partial<PageWrapperProps>;
}
```

## Related Components

- **Sidebar**: Main navigation sidebar
- **TopNav**: Top navigation bar with breadcrumbs
- **Card**: Content card component for use within pages

## Design System Integration

The PageWrapper component integrates with the Cloud Copilot design system:

- **Colors**: Uses theme colors (background, foreground, muted)
- **Spacing**: Uses design system spacing scale (4px base unit)
- **Typography**: Maintains design system font families and sizes
- **Breakpoints**: Follows responsive breakpoint strategy

## Migration Guide

If you have existing pages without PageWrapper:

### Before

```tsx
export default function MyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1>My Page</h1>
      <div className="space-y-6">
        {/* Content */}
      </div>
    </div>
  );
}
```

### After

```tsx
export default function MyPage() {
  return (
    <PageWrapper maxWidth="container">
      <h1>My Page</h1>
      {/* Content - spacing applied automatically */}
    </PageWrapper>
  );
}
```

## Support

For questions or issues with the PageWrapper component:

1. Check this documentation
2. Review the examples in `PageWrapper.examples.tsx`
3. Check the tests in `PageWrapper.test.tsx`
4. Consult the Cloud Copilot design system documentation

---

**Version**: 1.0.0
**Last Updated**: 2025-12-10
**Maintainer**: Frontend Team
