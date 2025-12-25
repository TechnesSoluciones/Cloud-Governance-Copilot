/**
 * Error handling utilities
 *
 * Centralized exports for error detection and handling
 */

export {
  isPermissionError,
  analyzePermissionError,
  getErrorFromQueryError,
  type PermissionErrorInfo,
  type ProviderErrorDetails,
} from './permissions';
