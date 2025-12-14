/**
 * User API functions
 */

import { apiGet, apiPatch, apiPost, ApiResponse } from './client';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  tenantId: string;
  isEmailVerified: boolean;
  isMFAEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserDto {
  fullName?: string;
  email?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export const userApi = {
  /**
   * Get current user profile
   */
  getProfile: async (accessToken: string): Promise<ApiResponse<User>> => {
    return apiGet('/api/v1/users/me', accessToken);
  },

  /**
   * Update user profile
   */
  updateProfile: async (
    data: UpdateUserDto,
    accessToken: string
  ): Promise<ApiResponse<User>> => {
    return apiPatch('/api/v1/users/me', data, accessToken);
  },

  /**
   * Change password
   */
  changePassword: async (
    data: ChangePasswordDto,
    accessToken: string
  ): Promise<ApiResponse> => {
    return apiPost('/api/v1/users/me/change-password', data, accessToken);
  },

  /**
   * Upload avatar (placeholder for future implementation)
   */
  uploadAvatar: async (file: File, accessToken: string): Promise<ApiResponse<{ url: string }>> => {
    // TODO: Implement multipart/form-data upload
    throw new Error('Avatar upload not yet implemented');
  },
};
