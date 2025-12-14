/**
 * User Management Types and DTOs
 */

/**
 * User roles enum
 */
export enum UserRole {
  ADMIN = 'admin',
  VIEWER = 'viewer',
  FINOPS = 'finops',
  SECOPS = 'secops',
  DEVOPS = 'devops',
}

/**
 * User status enum
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

/**
 * Create user DTO
 */
export interface CreateUserDto {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  preferences?: Record<string, any>;
}

/**
 * Update user DTO
 */
export interface UpdateUserDto {
  fullName?: string;
  role?: UserRole;
  status?: UserStatus;
  avatarUrl?: string;
  preferences?: Record<string, any>;
}

/**
 * Update own profile DTO (restricted fields)
 */
export interface UpdateOwnProfileDto {
  fullName?: string;
  avatarUrl?: string;
  preferences?: Record<string, any>;
}

/**
 * User list filters
 */
export interface UserListFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string; // Search in email or fullName
  limit?: number;
  offset?: number;
}

/**
 * User response (excludes sensitive data)
 */
export interface UserResponse {
  id: string;
  tenantId: string;
  email: string;
  fullName: string | null;
  role: string;
  status: string;
  avatarUrl: string | null;
  lastLogin: Date | null;
  preferences: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User list response with pagination
 */
export interface UserListResponse {
  users: UserResponse[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Validate if role is valid
 */
export const isValidRole = (role: string): role is UserRole => {
  return Object.values(UserRole).includes(role as UserRole);
};

/**
 * Validate if status is valid
 */
export const isValidStatus = (status: string): status is UserStatus => {
  return Object.values(UserStatus).includes(status as UserStatus);
};
