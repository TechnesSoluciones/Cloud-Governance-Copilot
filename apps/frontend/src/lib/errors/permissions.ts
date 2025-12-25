/**
 * Permission Error Detection Utilities
 *
 * Detects and categorizes permission-related errors from cloud providers
 * to provide user-friendly error messages and recovery instructions.
 */

import { ApiError } from '../api/client';

/**
 * Error codes that indicate permission/access denied issues
 */
const PERMISSION_ERROR_CODES = [
  'FORBIDDEN',
  'ACCESS_DENIED',
  'AUTHORIZATION_FAILED',
  'INSUFFICIENT_PERMISSIONS',
  'UNAUTHORIZED',
  'AuthorizationFailure',
  'AccessDenied',
  'Forbidden',
  'InvalidAuthenticationToken',
  'InvalidClientTokenId',
  'UnrecognizedClientException',
] as const;

/**
 * Error messages that indicate permission issues
 */
const PERMISSION_ERROR_PATTERNS = [
  /access.*denied/i,
  /permission.*denied/i,
  /not.*authorized/i,
  /insufficient.*permissions/i,
  /forbidden/i,
  /unauthorized/i,
  /authorization.*failed/i,
  /does not have.*permission/i,
  /missing.*role/i,
  /requires.*role/i,
  /scope.*required/i,
] as const;

/**
 * Provider-specific error details
 */
export interface ProviderErrorDetails {
  provider: 'Azure' | 'AWS' | 'Unknown';
  requiredPermissions?: string[];
  requiredRole?: string;
  resourceType?: string;
  subscriptionId?: string;
  accountId?: string;
}

/**
 * Permission error information
 */
export interface PermissionErrorInfo {
  isPermissionError: boolean;
  provider: 'Azure' | 'AWS' | 'Unknown';
  originalMessage: string;
  userFriendlyMessage: string;
  requiredPermissions?: string[];
  requiredRole?: string;
  subscriptionId?: string;
  accountId?: string;
  resourceType?: string;
  documentationUrl?: string;
}

/**
 * Check if an error is a permission/access denied error
 */
export function isPermissionError(error: any): boolean {
  if (!error) return false;

  // Check ApiError code
  if (error instanceof ApiError) {
    // Check status code (403 Forbidden)
    if (error.statusCode === 403) return true;

    // Check error code
    if (error.code && PERMISSION_ERROR_CODES.includes(error.code as any)) {
      return true;
    }
  }

  // Check error message patterns
  const message = error?.message || error?.toString() || '';
  return PERMISSION_ERROR_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Extract provider-specific details from error
 */
function extractProviderDetails(error: any): ProviderErrorDetails {
  const message = error?.message || '';
  const details = error?.details || {};

  // Detect Azure errors
  if (
    message.includes('Azure') ||
    message.includes('azure') ||
    details?.subscriptionId ||
    error?.code?.includes('Azure')
  ) {
    return {
      provider: 'Azure',
      subscriptionId: details?.subscriptionId,
      requiredRole: extractAzureRole(message, details),
      resourceType: details?.resourceType,
    };
  }

  // Detect AWS errors
  if (
    message.includes('AWS') ||
    message.includes('aws') ||
    details?.accountId ||
    error?.code?.startsWith('AWS')
  ) {
    return {
      provider: 'AWS',
      accountId: details?.accountId,
      requiredPermissions: extractAWSPermissions(message, details),
    };
  }

  return {
    provider: 'Unknown',
  };
}

/**
 * Extract required Azure role from error message
 */
function extractAzureRole(message: string, details: any): string | undefined {
  // Check if message mentions specific role
  const roleMatch = message.match(/requires?\s+['"]?(\w+)['"]?\s+role/i);
  if (roleMatch) return roleMatch[1];

  // Common Azure roles that might be missing
  if (message.includes('read')) return 'Reader';
  if (message.includes('cost')) return 'Cost Management Reader';
  if (message.includes('security')) return 'Security Reader';

  // Default to Reader role for Azure
  return 'Reader';
}

/**
 * Extract required AWS permissions from error message
 */
function extractAWSPermissions(message: string, details: any): string[] | undefined {
  const permissions: string[] = [];

  // Check details for specific permissions
  if (details?.requiredPermissions) {
    return Array.isArray(details.requiredPermissions)
      ? details.requiredPermissions
      : [details.requiredPermissions];
  }

  // Extract from message patterns
  const permMatch = message.match(/([a-z]+:[A-Z][a-zA-Z]+)/g);
  if (permMatch) {
    permissions.push(...permMatch);
  }

  return permissions.length > 0 ? permissions : undefined;
}

/**
 * Get documentation URL for permission errors
 */
function getDocumentationUrl(provider: 'Azure' | 'AWS' | 'Unknown'): string {
  switch (provider) {
    case 'Azure':
      return 'https://learn.microsoft.com/azure/role-based-access-control/';
    case 'AWS':
      return 'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html';
    default:
      return '/docs/permissions';
  }
}

/**
 * Get user-friendly message for permission error
 */
function getUserFriendlyMessage(providerDetails: ProviderErrorDetails): string {
  const { provider, requiredRole, requiredPermissions } = providerDetails;

  switch (provider) {
    case 'Azure':
      if (requiredRole) {
        return `Your Azure Service Principal needs the "${requiredRole}" role to access this data. Please contact your Azure administrator to grant the necessary permissions.`;
      }
      return 'Your Azure account lacks the necessary permissions to access this resource. Please contact your administrator to grant access.';

    case 'AWS':
      if (requiredPermissions && requiredPermissions.length > 0) {
        return `Your AWS account needs the following permissions: ${requiredPermissions.join(', ')}. Please update your IAM policy to include these permissions.`;
      }
      return 'Your AWS account lacks the necessary IAM permissions to access this resource. Please update your IAM policy.';

    default:
      return 'You do not have permission to access this resource. Please contact your administrator for access.';
  }
}

/**
 * Analyze permission error and return detailed information
 */
export function analyzePermissionError(error: any): PermissionErrorInfo {
  const isPermError = isPermissionError(error);

  if (!isPermError) {
    return {
      isPermissionError: false,
      provider: 'Unknown',
      originalMessage: error?.message || 'Unknown error',
      userFriendlyMessage: error?.message || 'An unexpected error occurred',
    };
  }

  const providerDetails = extractProviderDetails(error);
  const userFriendlyMessage = getUserFriendlyMessage(providerDetails);
  const documentationUrl = getDocumentationUrl(providerDetails.provider);

  return {
    isPermissionError: true,
    provider: providerDetails.provider,
    originalMessage: error?.message || 'Permission denied',
    userFriendlyMessage,
    requiredPermissions: providerDetails.requiredPermissions,
    requiredRole: providerDetails.requiredRole,
    subscriptionId: providerDetails.subscriptionId,
    accountId: providerDetails.accountId,
    resourceType: providerDetails.resourceType,
    documentationUrl,
  };
}

/**
 * Get error from React Query error
 */
export function getErrorFromQueryError(queryError: any): any {
  // React Query wraps errors, extract the actual error
  if (queryError?.cause) return queryError.cause;
  if (queryError?.error) return queryError.error;
  return queryError;
}
