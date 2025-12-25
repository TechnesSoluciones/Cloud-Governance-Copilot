/**
 * Circuit Breaker Error Component
 *
 * Displays a user-friendly message when the circuit breaker is open
 * and requests are being blocked due to service issues
 */

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { CircuitBreakerError as CircuitBreakerErrorType } from '@/lib/api/circuitBreaker';

export interface CircuitBreakerErrorProps {
  error: CircuitBreakerErrorType;
  onRetry?: () => void;
  showRetry?: boolean;
}

/**
 * Format time remaining until circuit breaker resets
 */
function formatTimeRemaining(nextAttemptTime: number | null): string {
  if (!nextAttemptTime) {
    return 'approximately 1 minute';
  }

  const now = Date.now();
  const remainingMs = Math.max(0, nextAttemptTime - now);
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  if (remainingSeconds < 60) {
    return `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  }

  const remainingMinutes = Math.ceil(remainingSeconds / 60);
  return `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
}

/**
 * Circuit Breaker Error Banner Component
 */
export function CircuitBreakerError({
  error,
  onRetry,
  showRetry = true,
}: CircuitBreakerErrorProps) {
  const timeRemaining = formatTimeRemaining(error.nextAttemptTime);

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-orange-100 flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-orange-600" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-orange-900">
              Service Temporarily Unavailable
            </h3>
            <p className="text-sm text-orange-700 mt-1">
              The Azure API is currently experiencing issues or rate limiting. Requests are
              temporarily paused to prevent overwhelming the service.
            </p>
          </div>
        </div>

        {/* Status Info */}
        <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-100/50 p-3 rounded-lg">
          <Clock className="h-4 w-4" aria-hidden="true" />
          <span>
            Automatic retry in: <strong>{timeRemaining}</strong>
          </span>
        </div>

        {/* What's Happening */}
        <div className="space-y-2 text-sm">
          <h4 className="font-semibold text-gray-900">What's happening?</h4>
          <p className="text-gray-700">
            Our system has detected multiple failed requests to Azure's API (rate limiting,
            timeouts, or service errors). To protect both your account and Azure's services,
            we've temporarily paused requests.
          </p>
        </div>

        {/* What to Do */}
        <div className="space-y-2 text-sm">
          <h4 className="font-semibold text-gray-900">What should I do?</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
            <li>Wait for the automatic retry (recommended)</li>
            <li>
              Check{' '}
              <a
                href="https://status.azure.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 underline"
              >
                Azure's status page
              </a>{' '}
              for any ongoing incidents
            </li>
            <li>If the issue persists, your Azure subscription may have hit API rate limits</li>
          </ul>
        </div>

        {/* Actions */}
        {showRetry && onRetry && (
          <div className="pt-2">
            <Button
              variant="outline"
              onClick={onRetry}
              className="border-orange-300 hover:bg-orange-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Try Again Now
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Note: Retrying immediately may fail if the circuit is still open
            </p>
          </div>
        )}

        {/* Technical Details (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs text-gray-600 mt-4">
            <summary className="cursor-pointer font-medium">Technical Details</summary>
            <div className="mt-2 p-3 bg-gray-100 rounded font-mono whitespace-pre-wrap">
              {JSON.stringify(
                {
                  error: error.message,
                  nextAttemptTime: error.nextAttemptTime,
                  timeRemaining: timeRemaining,
                },
                null,
                2
              )}
            </div>
          </details>
        )}
      </div>
    </Card>
  );
}

/**
 * Inline Circuit Breaker Alert (for compact layouts)
 */
export function CircuitBreakerAlert({
  error,
  onRetry,
}: CircuitBreakerErrorProps) {
  const timeRemaining = formatTimeRemaining(error.nextAttemptTime);

  return (
    <Alert variant="warning" className="flex items-start gap-3">
      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1">
        <h4 className="font-semibold">Service Temporarily Unavailable</h4>
        <p className="text-sm mt-1">
          Azure API is experiencing issues. Requests paused for {timeRemaining}.
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="flex-shrink-0">
          <RefreshCw className="h-4 w-4 mr-1" aria-hidden="true" />
          Retry
        </Button>
      )}
    </Alert>
  );
}
