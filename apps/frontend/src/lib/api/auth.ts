/**
 * Authentication API functions
 */

import { apiPost, ApiResponse } from './client';

export interface MFASetupResponse {
  qrCode: string;
  secret: string;
}

export interface BackupCodesResponse {
  codes: string[];
}

export const authApi = {
  /**
   * Request password reset email
   */
  forgotPassword: async (email: string): Promise<ApiResponse> => {
    return apiPost('/api/v1/auth/forgot-password', { email });
  },

  /**
   * Reset password using token
   */
  resetPassword: async (token: string, newPassword: string): Promise<ApiResponse> => {
    return apiPost('/api/v1/auth/reset-password', { token, newPassword });
  },

  /**
   * Verify email using token
   */
  verifyEmail: async (token: string): Promise<ApiResponse> => {
    return apiPost('/api/v1/auth/verify-email', { token });
  },

  /**
   * Resend verification email
   */
  resendVerification: async (accessToken: string): Promise<ApiResponse> => {
    return apiPost('/api/v1/auth/resend-verification', {}, accessToken);
  },

  /**
   * Setup MFA - get QR code and secret
   */
  setupMFA: async (accessToken: string): Promise<ApiResponse<MFASetupResponse>> => {
    return apiPost('/api/v1/auth/mfa/setup', {}, accessToken);
  },

  /**
   * Verify MFA setup with token
   */
  verifyMFASetup: async (token: string, accessToken: string): Promise<ApiResponse> => {
    return apiPost('/api/v1/auth/mfa/verify-setup', { token }, accessToken);
  },

  /**
   * Disable MFA with password and token confirmation
   */
  disableMFA: async (
    password: string,
    token: string,
    accessToken: string
  ): Promise<ApiResponse> => {
    return apiPost('/api/v1/auth/mfa/disable', { password, token }, accessToken);
  },

  /**
   * Generate new backup codes
   */
  generateBackupCodes: async (
    accessToken: string
  ): Promise<ApiResponse<BackupCodesResponse>> => {
    return apiPost('/api/v1/auth/mfa/backup-codes', {}, accessToken);
  },

  /**
   * Verify MFA token during login
   */
  verifyMFAToken: async (token: string, sessionId: string): Promise<ApiResponse> => {
    return apiPost('/api/v1/auth/mfa/verify', { token, sessionId });
  },
};
