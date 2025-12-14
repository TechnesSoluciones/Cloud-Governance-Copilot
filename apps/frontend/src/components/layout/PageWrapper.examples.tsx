/**
 * PageWrapper Component - Usage Examples
 *
 * This file demonstrates various usage patterns for the PageWrapper component.
 * These examples can be referenced when implementing pages across the application.
 */

import * as React from 'react';
import { PageWrapper } from './PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Example 1: Basic Usage
 * Full-width page with default spacing
 */
export function BasicPageExample() {
  return (
    <PageWrapper>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">Welcome to your dashboard</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Stats cards would go here */}
      </div>
    </PageWrapper>
  );
}

/**
 * Example 2: Centered Container Layout
 * Constrained width for better readability on large screens
 */
export function CenteredContainerExample() {
  return (
    <PageWrapper maxWidth="container">
      <h1 className="text-3xl font-bold">Cost Analysis</h1>
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spend</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Chart component would go here */}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}

/**
 * Example 3: Narrow Content Layout
 * Perfect for forms and settings pages
 */
export function NarrowContentExample() {
  return (
    <PageWrapper maxWidth="2xl" spacing="sm">
      <div>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account preferences and security settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Form fields would go here */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Security options would go here */}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}

/**
 * Example 4: With Breadcrumbs
 * Shows hierarchical navigation
 */
export function WithBreadcrumbsExample() {
  const breadcrumbs = (
    <div className="flex items-center gap-2 text-sm">
      <a href="/dashboard" className="text-muted-foreground hover:text-foreground">
        Dashboard
      </a>
      <span className="text-muted-foreground">/</span>
      <a href="/cloud-accounts" className="text-muted-foreground hover:text-foreground">
        Cloud Accounts
      </a>
      <span className="text-muted-foreground">/</span>
      <span className="text-foreground font-medium">AWS Production</span>
    </div>
  );

  return (
    <PageWrapper breadcrumbs={breadcrumbs} maxWidth="container">
      <h1 className="text-3xl font-bold">AWS Production Account</h1>
      <div className="grid gap-6">
        {/* Account details would go here */}
      </div>
    </PageWrapper>
  );
}

/**
 * Example 5: Large Spacing for Dashboard
 * Generous spacing between major sections
 */
export function DashboardLayoutExample() {
  return (
    <PageWrapper spacing="lg">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, John</h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your cloud infrastructure
        </p>
      </div>

      {/* KPI Cards Section */}
      <section aria-labelledby="kpis-heading">
        <h2 id="kpis-heading" className="sr-only">
          Key Performance Indicators
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* KPI cards would go here */}
        </div>
      </section>

      {/* Charts Section */}
      <section aria-labelledby="charts-heading">
        <h2 id="charts-heading" className="text-2xl font-semibold mb-4">
          Cost Trends
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chart components would go here */}
        </div>
      </section>

      {/* Recent Activity Section */}
      <section aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="text-2xl font-semibold mb-4">
          Recent Activity
        </h2>
        {/* Activity list would go here */}
      </section>
    </PageWrapper>
  );
}

/**
 * Example 6: No Padding (Custom Layout)
 * Useful when you need full control over spacing
 */
export function CustomLayoutExample() {
  return (
    <PageWrapper withPadding={false} className="bg-gray-50">
      {/* Hero section with custom padding */}
      <div className="bg-primary text-primary-foreground px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-container mx-auto">
          <h1 className="text-4xl font-bold">Security Dashboard</h1>
          <p className="mt-2 text-lg opacity-90">
            Monitor and manage your cloud security posture
          </p>
        </div>
      </div>

      {/* Content section with custom padding */}
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-container mx-auto space-y-6">
          {/* Content cards would go here */}
        </div>
      </div>
    </PageWrapper>
  );
}

/**
 * Example 7: Mixed Width Sections
 * Different sections with different max-widths
 */
export function MixedWidthExample() {
  return (
    <>
      {/* Full-width header */}
      <PageWrapper maxWidth="full" spacing="sm" className="border-b bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Recommendations</h1>
            <p className="text-muted-foreground mt-1">
              AI-powered optimization suggestions
            </p>
          </div>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
            Apply All
          </button>
        </div>
      </PageWrapper>

      {/* Constrained content */}
      <PageWrapper maxWidth="container">
        <div className="grid gap-4">
          {/* Recommendation cards would go here */}
        </div>
      </PageWrapper>
    </>
  );
}

/**
 * Example 8: Accessibility-Focused Example
 * Demonstrates proper ARIA labels and semantic structure
 */
export function AccessiblePageExample() {
  return (
    <PageWrapper
      maxWidth="container"
      spacing="lg"
      ariaLabel="Cloud assets inventory page"
    >
      {/* Page header with proper heading hierarchy */}
      <header>
        <h1 className="text-3xl font-bold">Asset Inventory</h1>
        <p className="text-muted-foreground mt-2">
          Discover and manage all your cloud resources in one place
        </p>
      </header>

      {/* Filter controls with proper labeling */}
      <section aria-labelledby="filters-heading">
        <h2 id="filters-heading" className="text-xl font-semibold mb-4">
          Filters
        </h2>
        {/* Filter components would go here */}
      </section>

      {/* Results section */}
      <section aria-labelledby="results-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="results-heading" className="text-xl font-semibold">
            Results
          </h2>
          <div className="text-sm text-muted-foreground" aria-live="polite">
            Showing 1-20 of 145 assets
          </div>
        </div>
        {/* Results table would go here */}
      </section>
    </PageWrapper>
  );
}

/**
 * Example 9: Responsive Grid Layout
 * Shows how PageWrapper works with responsive grids
 */
export function ResponsiveGridExample() {
  return (
    <PageWrapper maxWidth="container" spacing="md">
      <h1 className="text-3xl font-bold">Cloud Accounts</h1>

      {/* Responsive grid that adapts to screen size */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Account cards would go here */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>Account {i}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Account details go here
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}

/**
 * Example 10: Loading and Error States
 * Demonstrates how to handle async states within PageWrapper
 */
export function AsyncStateExample() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  return (
    <PageWrapper maxWidth="container">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div
              className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"
              role="status"
              aria-label="Loading"
            >
              <span className="sr-only">Loading...</span>
            </div>
            <p className="mt-4 text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      ) : error ? (
        <div
          className="rounded-lg border border-error bg-error/10 p-6"
          role="alert"
          aria-live="assertive"
        >
          <h2 className="text-lg font-semibold text-error">Error Loading Data</h2>
          <p className="mt-2 text-sm text-error/80">{error}</p>
          <button
            className="mt-4 rounded-lg bg-error px-4 py-2 text-sm text-error-foreground hover:opacity-90"
            onClick={() => setError(null)}
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Loaded content would go here */}
        </div>
      )}
    </PageWrapper>
  );
}
