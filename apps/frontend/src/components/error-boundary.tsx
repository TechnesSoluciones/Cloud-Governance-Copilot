'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icons } from '@/components/icons';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 *
 * This prevents the entire application from crashing when a component fails.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} reset={this.reset} />;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <Icons.alertTriangle className="h-8 w-8 text-red-600" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Something went wrong</h2>
                <p className="text-muted-foreground">
                  We encountered an unexpected error. Please try again.
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="w-full text-left">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Error details (development only)
                  </summary>
                  <pre className="mt-2 p-4 bg-slate-100 dark:bg-slate-900 rounded text-xs overflow-auto max-h-48">
                    {this.state.error.toString()}
                    {this.state.error.stack && `\n\n${this.state.error.stack}`}
                  </pre>
                </details>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => window.location.href = '/'}>
                  <Icons.home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
                <Button onClick={this.reset}>
                  <Icons.refresh className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * DashboardErrorFallback
 * Custom error fallback specifically for dashboard components
 */
export const DashboardErrorFallback: React.FC<{ error: Error; reset: () => void }> = ({
  error,
  reset,
}) => {
  return (
    <Card className="p-8">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
          <Icons.alertTriangle className="h-6 w-6 text-red-600" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Failed to load dashboard component</h3>
          <p className="text-sm text-muted-foreground">
            This component encountered an error. Other parts of the dashboard may still work.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="w-full text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Error details
            </summary>
            <pre className="mt-2 p-3 bg-slate-100 dark:bg-slate-900 rounded text-xs overflow-auto max-h-32">
              {error.toString()}
            </pre>
          </details>
        )}

        <Button onClick={reset} size="sm">
          <Icons.refresh className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    </Card>
  );
};
