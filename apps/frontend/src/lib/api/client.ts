/**
 * API Client with error handling and token management
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  message?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
  skipAuth?: boolean;
}

/**
 * Base API request function with error handling
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { token, skipAuth, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Add authorization header if token is provided
  if (token && !skipAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error?.message || data.message || 'Request failed',
        data.error?.code || 'UNKNOWN_ERROR',
        response.status,
        data.error?.details
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error occurred',
      'NETWORK_ERROR'
    );
  }
}

/**
 * GET request helper
 */
export function apiGet<T = any>(endpoint: string, token?: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'GET', token });
}

/**
 * POST request helper
 */
export function apiPost<T = any>(
  endpoint: string,
  body: any,
  token?: string
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}

/**
 * PUT request helper
 */
export function apiPut<T = any>(
  endpoint: string,
  body: any,
  token?: string
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
    token,
  });
}

/**
 * PATCH request helper
 */
export function apiPatch<T = any>(
  endpoint: string,
  body: any,
  token?: string
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
    token,
  });
}

/**
 * DELETE request helper
 */
export function apiDelete<T = any>(endpoint: string, token?: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'DELETE', token });
}
