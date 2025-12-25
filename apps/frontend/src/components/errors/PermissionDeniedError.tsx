/**
 * Permission Denied Error Component
 *
 * User-friendly error display for permission/access denied errors.
 * Provides clear explanation, required permissions, and steps to resolve.
 */

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldAlert,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { PermissionErrorInfo } from '@/lib/errors/permissions';

export interface PermissionDeniedErrorProps {
  errorInfo: PermissionErrorInfo;
  onRetry?: () => void;
  showRetry?: boolean;
}

/**
 * PermissionDeniedError Component
 *
 * Displays a comprehensive error message for permission issues with:
 * - Clear explanation of the problem
 * - Provider-specific guidance (Azure/AWS)
 * - Required roles/permissions
 * - Step-by-step resolution instructions
 * - Links to documentation
 */
export function PermissionDeniedError({
  errorInfo,
  onRetry,
  showRetry = true,
}: PermissionDeniedErrorProps) {
  const [copiedSubscriptionId, setCopiedSubscriptionId] = React.useState(false);
  const [copiedAccountId, setCopiedAccountId] = React.useState(false);

  const handleCopy = async (text: string, setCopied: (value: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getProviderIcon = () => {
    switch (errorInfo.provider) {
      case 'Azure':
        return '☁️';
      case 'AWS':
        return '🔶';
      default:
        return '🔒';
    }
  };

  const getProviderInstructions = () => {
    switch (errorInfo.provider) {
      case 'Azure':
        return (
          <div className="space-y-3 text-left">
            <p className="text-sm font-medium text-gray-900">To resolve this issue:</p>
            <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
              <li>Sign in to the Azure Portal</li>
              <li>
                Navigate to <strong>Subscriptions</strong> and select your subscription
                {errorInfo.subscriptionId && (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {errorInfo.subscriptionId}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() =>
                        handleCopy(errorInfo.subscriptionId!, setCopiedSubscriptionId)
                      }
                      title="Copy Subscription ID"
                    >
                      {copiedSubscriptionId ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}
              </li>
              <li>
                Go to <strong>Access control (IAM)</strong>
              </li>
              <li>
                Click <strong>Add</strong> → <strong>Add role assignment</strong>
              </li>
              <li>
                Select the <strong>{errorInfo.requiredRole || 'Reader'}</strong> role
              </li>
              <li>Assign it to your Service Principal or user account</li>
              <li>Save changes and wait a few minutes for propagation</li>
              <li>Refresh this page to try again</li>
            </ol>
          </div>
        );

      case 'AWS':
        return (
          <div className="space-y-3 text-left">
            <p className="text-sm font-medium text-gray-900">To resolve this issue:</p>
            <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
              <li>Sign in to the AWS Console</li>
              <li>
                Navigate to <strong>IAM</strong> (Identity and Access Management)
                {errorInfo.accountId && (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      Account: {errorInfo.accountId}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleCopy(errorInfo.accountId!, setCopiedAccountId)}
                      title="Copy Account ID"
                    >
                      {copiedAccountId ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}
              </li>
              <li>
                Find your <strong>IAM User</strong> or <strong>Role</strong>
              </li>
              <li>
                Click <strong>Add permissions</strong>
              </li>
              <li>
                Attach the policy containing required permissions
                {errorInfo.requiredPermissions && errorInfo.requiredPermissions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {errorInfo.requiredPermissions.map((perm, idx) => (
                      <Badge key={idx} variant="secondary" className="font-mono text-xs">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                )}
              </li>
              <li>Save changes</li>
              <li>Refresh this page to try again</li>
            </ol>
          </div>
        );

      default:
        return (
          <div className="space-y-2 text-left">
            <p className="text-sm text-gray-700">
              Contact your system administrator to grant the necessary permissions to access this
              resource.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full border-orange-200 bg-orange-50/30">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-orange-600" aria-hidden="true" />
            </div>
          </div>
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <span>{getProviderIcon()}</span>
            <span>Permission Required</span>
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {errorInfo.userFriendlyMessage}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Required Role/Permissions */}
          {(errorInfo.requiredRole || (errorInfo.requiredPermissions && errorInfo.requiredPermissions.length > 0)) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-blue-900">Required Access:</p>
                  {errorInfo.requiredRole && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-600 hover:bg-blue-700">
                        {errorInfo.requiredRole}
                      </Badge>
                      <span className="text-xs text-blue-700">role</span>
                    </div>
                  )}
                  {errorInfo.requiredPermissions && errorInfo.requiredPermissions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {errorInfo.requiredPermissions.map((perm, idx) => (
                        <Badge key={idx} variant="outline" className="font-mono text-xs">
                          {perm}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Resolution Instructions */}
          <div className="bg-white rounded-lg border p-4">{getProviderInstructions()}</div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {showRetry && onRetry && (
              <Button onClick={onRetry} className="w-full sm:w-auto flex-1">
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Retry
              </Button>
            )}
            {errorInfo.documentationUrl && (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                asChild
              >
                <a
                  href={errorInfo.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center"
                >
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                  View Documentation
                </a>
              </Button>
            )}
          </div>

          {/* Help Text */}
          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 text-center">
              💡 <strong>Tip:</strong> After making permission changes, it may take a few minutes
              for them to take effect. If you continue to see this error after updating
              permissions, try again in 5-10 minutes.
            </p>
          </div>

          {/* Technical Details (Collapsible) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="text-left border-t pt-4">
              <summary className="cursor-pointer text-xs font-medium text-gray-600 hover:text-gray-900">
                Technical Details (Development Mode)
              </summary>
              <div className="mt-2 bg-gray-50 rounded p-3 space-y-2">
                <div className="text-xs">
                  <span className="font-semibold">Provider:</span> {errorInfo.provider}
                </div>
                <div className="text-xs">
                  <span className="font-semibold">Original Error:</span>
                  <pre className="mt-1 text-xs text-gray-700 whitespace-pre-wrap break-words">
                    {errorInfo.originalMessage}
                  </pre>
                </div>
                {errorInfo.resourceType && (
                  <div className="text-xs">
                    <span className="font-semibold">Resource Type:</span> {errorInfo.resourceType}
                  </div>
                )}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Compact version for inline use
 */
export function PermissionDeniedBanner({ errorInfo }: { errorInfo: PermissionErrorInfo }) {
  return (
    <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <ShieldAlert className="h-5 w-5 text-orange-400" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-orange-800">Permission Required</h3>
          <div className="mt-2 text-sm text-orange-700">
            <p>{errorInfo.userFriendlyMessage}</p>
          </div>
          {errorInfo.documentationUrl && (
            <div className="mt-3">
              <a
                href={errorInfo.documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-orange-700 hover:text-orange-600 flex items-center gap-1"
              >
                Learn more
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
