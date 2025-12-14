# PageWrapper Integration Guide

Complete guide to integrating the PageWrapper component into existing and new pages in the Cloud Copilot application.

## Table of Contents

1. [File Organization](#file-organization)
2. [Import Patterns](#import-patterns)
3. [Page-Level Integration](#page-level-integration)
4. [Component Integration](#component-integration)
5. [Best Practices](#best-practices)
6. [Common Patterns](#common-patterns)
7. [Troubleshooting](#troubleshooting)

## File Organization

### Recommended Directory Structure

```
apps/frontend/src/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx              # Page component
│   │   └── layout.tsx            # Optional layout wrapper
│   ├── settings/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   └── (auth)/
│       ├── login/
│       │   └── page.tsx
│       └── signup/
│           └── page.tsx
└── components/
    ├── layout/
    │   ├── PageWrapper.tsx       # PageWrapper component
    │   ├── Sidebar.tsx
    │   ├── TopNav.tsx
    │   └── index.tsx
    ├── dashboard/
    │   ├── StatsGrid.tsx
    │   ├── ChartsSection.tsx
    │   └── ActivityFeed.tsx
    └── forms/
        ├── LoginForm.tsx
        ├── SettingsForm.tsx
        └── AccountForm.tsx
```

## Import Patterns

### Standard Import

```tsx
import { PageWrapper } from '@/components/layout';
```

### Type-Safe Import

```tsx
import {
  PageWrapper,
  type PageWrapperProps,
  type MaxWidthVariant,
  type SpacingVariant,
} from '@/components/layout';
```

### Selective Import

```tsx
import { PageWrapper, type PageWrapperProps } from '@/components/layout';
```

## Page-Level Integration

### Example 1: Dashboard Page (Full-Width)

**File**: `apps/frontend/src/app/dashboard/page.tsx`

```tsx
'use client';

import { PageWrapper } from '@/components/layout';
import { DashboardHeader } from '@/components/dashboard/Header';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { ChartsSection } from '@/components/dashboard/ChartsSection';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';

export default function DashboardPage() {
  return (
    <PageWrapper maxWidth="full" spacing="lg">
      <DashboardHeader
        title="Dashboard"
        description="Overview of your cloud infrastructure and costs"
      />

      <StatsGrid />

      <ChartsSection />

      <ActivityFeed />
    </PageWrapper>
  );
}
```

### Example 2: Settings Page (Container Width)

**File**: `apps/frontend/src/app/settings/page.tsx`

```tsx
'use client';

import { PageWrapper } from '@/components/layout';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/ui/breadcrumbs';
import { SettingsForm } from '@/components/forms/SettingsForm';

const breadcrumbItems: BreadcrumbItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Settings', href: '/settings' },
];

export default function SettingsPage() {
  return (
    <PageWrapper
      maxWidth="container"
      spacing="md"
      breadcrumbs={<Breadcrumbs items={breadcrumbItems} />}
    >
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      <SettingsForm />
    </PageWrapper>
  );
}
```

### Example 3: Authentication Page (Centered)

**File**: `apps/frontend/src/app/(auth)/login/page.tsx`

```tsx
'use client';

import { PageWrapper } from '@/components/layout';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <PageWrapper
      maxWidth="2xl"
      spacing="sm"
      minHeight="min-h-screen"
      className="flex items-center justify-center"
    >
      <div className="w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Cloud Copilot</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        <LoginForm />

        <p className="text-center text-gray-600 mt-6">
          Don't have an account?{' '}
          <a href="/signup" className="text-brand-orange hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </PageWrapper>
  );
}
```

### Example 4: Cloud Accounts Page (Full Width with Breadcrumbs)

**File**: `apps/frontend/src/app/accounts/page.tsx`

```tsx
'use client';

import { PageWrapper } from '@/components/layout';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { PageHeader } from '@/components/common/PageHeader';
import { AccountsGrid } from '@/components/accounts/AccountsGrid';
import { AccountsTable } from '@/components/accounts/AccountsTable';

export default function AccountsPage() {
  return (
    <PageWrapper
      maxWidth="full"
      spacing="lg"
      breadcrumbs={
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Cloud Accounts', href: '/accounts' },
          ]}
        />
      }
    >
      <PageHeader
        title="Cloud Accounts"
        description="Manage and monitor your connected cloud accounts"
        action={{
          label: 'Add Account',
          href: '/accounts/new',
        }}
      />

      <AccountsGrid />

      <AccountsTable />
    </PageWrapper>
  );
}
```

## Component Integration

### Creating Reusable Page Components

Instead of repeating PageWrapper configuration, create reusable page layout components:

**File**: `apps/frontend/src/components/layout/DashboardLayout.tsx`

```tsx
'use client';

import { PageWrapper, type PageWrapperProps } from '@/components/layout';
import { TopNav } from '@/components/layout/TopNav';
import { Sidebar } from '@/components/layout/Sidebar';

interface DashboardLayoutProps extends Omit<PageWrapperProps, 'maxWidth' | 'spacing'> {
  showSidebar?: boolean;
  showTopNav?: boolean;
}

export function DashboardLayout({
  children,
  showSidebar = true,
  showTopNav = true,
  ...pageWrapperProps
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen">
      {showSidebar && <Sidebar />}

      <div className="flex-1 flex flex-col">
        {showTopNav && <TopNav />}

        <PageWrapper maxWidth="full" spacing="lg" {...pageWrapperProps}>
          {children}
        </PageWrapper>
      </div>
    </div>
  );
}
```

### Usage of Custom Layout

```tsx
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <h1>Dashboard</h1>
      <DashboardContent />
    </DashboardLayout>
  );
}
```

### Creating Centered Layout Component

**File**: `apps/frontend/src/components/layout/CenteredLayout.tsx`

```tsx
'use client';

import { PageWrapper, type PageWrapperProps } from '@/components/layout';

interface CenteredLayoutProps extends Omit<PageWrapperProps, 'maxWidth' | 'spacing'> {
  maxWidth?: '4xl' | '2xl';
  spacing?: 'sm' | 'md';
}

export function CenteredLayout({
  children,
  maxWidth = '2xl',
  spacing = 'sm',
  ...props
}: CenteredLayoutProps) {
  return (
    <PageWrapper
      maxWidth={maxWidth}
      spacing={spacing}
      minHeight="min-h-screen"
      className="flex items-center justify-center"
      {...props}
    >
      {children}
    </PageWrapper>
  );
}
```

## Best Practices

### 1. Use Semantic Breadcrumbs

Good:
```tsx
<PageWrapper
  breadcrumbs={
    <Breadcrumbs items={[
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Settings', href: '/settings' },
    ]} />
  }
>
  Content
</PageWrapper>
```

Bad:
```tsx
<PageWrapper breadcrumbs={<div>Dashboard / Settings</div>}>
  Content
</PageWrapper>
```

### 2. Consistent Spacing Strategy

- **Full-width dashboards**: `spacing="lg"` (32px gaps)
- **Container layouts**: `spacing="md"` (24px gaps, default)
- **Forms/centered content**: `spacing="sm"` (16px gaps)

### 3. Proper Max-Width Usage

```tsx
// Dashboard and admin panels
<PageWrapper maxWidth="full">

// Content pages and most features
<PageWrapper maxWidth="container">

// Wide single-column content
<PageWrapper maxWidth="4xl">

// Forms and centered pages
<PageWrapper maxWidth="2xl">
```

### 4. Responsive Considerations

Always test on:
- Mobile: 320px, 375px, 425px
- Tablet: 768px, 834px
- Desktop: 1024px, 1280px, 1440px+

Example:
```tsx
<PageWrapper
  maxWidth="container"
  spacing="md"
  // Automatically responsive - no additional breakpoint classes needed
>
  Content
</PageWrapper>
```

### 5. Breadcrumbs Best Practices

Always include breadcrumbs on:
- Settings pages
- Sub-pages of features
- Admin pages
- Any page beyond first level

Skip breadcrumbs on:
- Home/Dashboard
- Auth pages
- Pages accessed directly

```tsx
// Good - breadcrumbs on sub-page
<PageWrapper
  breadcrumbs={<Breadcrumbs items={[...]} />}
>
  Content
</PageWrapper>

// Not needed - dashboard is home
<PageWrapper>
  Dashboard content
</PageWrapper>
```

### 6. Custom Styling Guidelines

Keep custom styling minimal and specific:

```tsx
// Good - minimal, specific styling
<PageWrapper
  maxWidth="container"
  className="bg-gradient-to-br from-blue-50 to-indigo-50"
>
  Content
</PageWrapper>

// Avoid - overriding PageWrapper styles
<PageWrapper className="p-0 w-1/2">
  Content
</PageWrapper>
```

## Common Patterns

### Pattern 1: Admin Dashboard

```tsx
export default function AdminDashboard() {
  return (
    <PageWrapper
      maxWidth="full"
      spacing="lg"
      breadcrumbs={<AdminBreadcrumbs />}
      className="bg-gray-50"
    >
      <AdminHeader />
      <AdminControls />
      <AdminDataGrid />
      <AdminMetrics />
    </PageWrapper>
  );
}
```

### Pattern 2: Settings Hub

```tsx
export default function SettingsHub() {
  return (
    <PageWrapper
      maxWidth="container"
      spacing="md"
      breadcrumbs={<Breadcrumbs />}
    >
      <SettingsNavigation />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <SettingsSidebar />
        </aside>

        <main className="lg:col-span-3">
          <SettingsContent />
        </main>
      </div>
    </PageWrapper>
  );
}
```

### Pattern 3: Form Submission

```tsx
export default function FormPage() {
  return (
    <PageWrapper
      maxWidth="2xl"
      spacing="sm"
      backgroundColor="bg-white"
      className="shadow-lg rounded-lg"
      minHeight="min-h-screen"
    >
      <FormHeader />
      <Form />
      <FormFooter />
    </PageWrapper>
  );
}
```

### Pattern 4: Report Page

```tsx
export default function ReportPage() {
  return (
    <PageWrapper
      maxWidth="container"
      spacing="lg"
      breadcrumbs={<ReportBreadcrumbs />}
      className="bg-white"
    >
      <ReportHeader />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ReportFilters />
        <div className="lg:col-span-2">
          <ReportCharts />
          <ReportTable />
        </div>
      </div>
    </PageWrapper>
  );
}
```

## Dark Mode Support

PageWrapper works seamlessly with dark mode:

```tsx
<PageWrapper
  maxWidth="container"
  backgroundColor="bg-white dark:bg-gray-900"
  className="dark:text-white"
>
  Content with automatic dark mode support
</PageWrapper>
```

The design system's Tailwind colors automatically support dark mode through CSS custom properties.

## Troubleshooting

### Issue: Content Not Responsive

**Problem**: Content doesn't adapt to different screen sizes

**Solution**: Ensure you're using Tailwind responsive classes in child components

```tsx
// Good
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// Bad
<div className="grid grid-cols-3">
```

### Issue: Breadcrumbs Don't Align

**Problem**: Breadcrumbs not aligned with main content

**Solution**: This is handled automatically by PageWrapper. Verify breadcrumbs are provided as a component

```tsx
// Good
<PageWrapper breadcrumbs={<Breadcrumbs items={...} />}>

// Avoid
<PageWrapper breadcrumbs={<div>Home / Settings</div>}>
```

### Issue: Too Much Padding on Mobile

**Problem**: Excessive padding on small screens

**Solution**: Either adjust spacing or set `withPadding={false}` for custom padding

```tsx
<PageWrapper spacing="sm">  // Reduces vertical spacing
  Content
</PageWrapper>
```

### Issue: Custom Classes Not Working

**Problem**: Custom Tailwind classes not applied

**Solution**: Ensure classes are included in Tailwind's content purge configuration

```tsx
// In tailwind.config.ts
content: [
  './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
  './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  './src/app/**/*.{js,ts,jsx,tsx,mdx}',
]
```

### Issue: TypeScript Errors

**Problem**: TypeScript complains about maxWidth or spacing values

**Solution**: Use the exported type definitions

```tsx
import { PageWrapper, type PageWrapperProps } from '@/components/layout';

// TypeScript now knows valid values
const props: PageWrapperProps = {
  maxWidth: 'container', // Type-safe
};
```

## Performance Considerations

### Memoization Benefit

PageWrapper is wrapped with React.memo to prevent unnecessary re-renders:

```tsx
// Good - stable props
const breadcrumbs = useMemo(() => <Breadcrumbs items={items} />, [items]);
<PageWrapper breadcrumbs={breadcrumbs}>

// Avoid - recreates on every render
<PageWrapper breadcrumbs={<Breadcrumbs items={items} />}>
```

### Class Computation

Class names are computed with useMemo internally, so no additional optimization needed:

```tsx
// Efficient - no additional memoization needed
<PageWrapper maxWidth="container" spacing="md">
  Content
</PageWrapper>
```

## Testing Pages with PageWrapper

### Unit Test Example

```tsx
import { render, screen } from '@testing-library/react';
import DashboardPage from './page';

describe('Dashboard Page', () => {
  it('should render with PageWrapper', () => {
    render(<DashboardPage />);

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass('max-w-full', 'space-y-8');
  });
});
```

## Resources

- **Component**: `/apps/frontend/src/components/layout/PageWrapper.tsx`
- **Documentation**: `/apps/frontend/src/components/layout/PAGEWRAPPER_SUMMARY.md`
- **Usage Guide**: `/apps/frontend/src/components/layout/PageWrapper.USAGE.md`
- **Examples**: `/apps/frontend/src/components/layout/PageWrapper.examples.tsx`
- **Tests**: `/apps/frontend/src/components/layout/PageWrapper.test.tsx`

## Summary

The PageWrapper component provides a solid foundation for consistent page layouts across Cloud Copilot. By following these integration patterns and best practices, you'll ensure:

- Consistent spacing and padding
- Responsive behavior across devices
- Proper semantic HTML
- WCAG 2.1 AA accessibility
- Performance optimizations
- Type safety with TypeScript
