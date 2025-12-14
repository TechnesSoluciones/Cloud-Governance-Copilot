'use client';

/**
 * ErrorBoundary Component
 *
 * React Error Boundary to catch and handle errors in the component tree.
 * Provides a user-friendly fallback UI with retry functionality.
 *
 * Features:
 * - Catches JavaScript errors anywhere in child component tree
 * - Logs error details to console (can be extended to send to monitoring service)
 * - Displays user-friendly error message
 * - Provides retry button to recover from errors
 * - Supports custom fallback UI
 * - Accessible error states with proper ARIA attributes
 * - Responsive design
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * // With custom fallback
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */

import * as React from 'react';
import { Component, ReactNode, ErrorInfo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Default fallback UI component
 */
interface DefaultFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onRetry: () => void;
}

function DefaultFallback({ error, errorInfo, onRetry }: DefaultFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-red-200 dark:border-red-800">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            {/* Error Icon */}
            <div
              className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4"
              aria-hidden="true"
            >
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            {/* Error Heading */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Something went wrong
            </h1>

            {/* Error Description */}
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
              We encountered an unexpected error while rendering this page.
              Please try refreshing, or return to the home page.
            </p>

            {/* Error Details (Development Only) */}
            {isDevelopment && error && (
              <div className="w-full mb-6">
                <details className="text-left">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mb-2">
                    Error Details (Development Mode)
                  </summary>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-red-900 dark:text-red-100 mb-1">
                        Error Message:
                      </p>
                      <pre className="text-xs text-red-800 dark:text-red-200 overflow-x-auto whitespace-pre-wrap break-words">
                        {error.message}
                      </pre>
                    </div>
                    {error.stack && (
                      <div>
                        <p className="text-xs font-semibold text-red-900 dark:text-red-100 mb-1">
                          Stack Trace:
                        </p>
                        <pre className="text-xs text-red-800 dark:text-red-200 overflow-x-auto whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {errorInfo?.componentStack && (
                      <div>
                        <p className="text-xs font-semibold text-red-900 dark:text-red-100 mb-1">
                          Component Stack:
                        </p>
                        <pre className="text-xs text-red-800 dark:text-red-200 overflow-x-auto whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                onClick={onRetry}
                className="w-full sm:w-auto"
                aria-label="Retry loading the page"
              >
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="w-full sm:w-auto"
                aria-label="Return to home page"
              >
                <Home className="mr-2 h-4 w-4" aria-hidden="true" />
                Go to Home
              </Button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-6">
              If this problem persists, please contact support with the error details above.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * ErrorBoundary Class Component
 *
 * Note: Error boundaries must be class components as of React 18.
 * Functional components with hooks cannot catch errors yet.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log error details
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call optional error handler prop
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // TODO: Send error to monitoring service (e.g., Sentry, DataDog, CloudWatch)
    // Example:
    // logErrorToService(error, errorInfo);
  }

  /**
   * Reset error boundary state
   */
  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Use default fallback
      return (
        <DefaultFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
        />
      );
    }

    // Render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
export { ErrorBoundary, DefaultFallback };
