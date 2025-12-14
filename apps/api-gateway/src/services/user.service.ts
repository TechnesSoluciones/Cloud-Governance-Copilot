import { PrismaClient } from '@prisma/client';
import { hashPassword, validatePassword } from '../utils/password';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateOwnProfileDto,
  UserListFilters,
  UserResponse,
  UserListResponse,
  isValidRole,
  isValidStatus,
} from '../types/user.types';
import { logger } from '../utils/logger';
import { emailService } from './email.service';

const prisma = new PrismaClient();

export class UserService {
  /**
   * Convert User model to UserResponse (exclude sensitive fields)
   */
  private toUserResponse(user: any): UserResponse {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
      lastLogin: user.lastLogin,
      preferences: user.preferences as Record<string, any>,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * List users with filters and pagination
   */
  async listUsers(
    tenantId: string,
    filters: UserListFilters
  ): Promise<UserListResponse> {
    const { role, status, search, limit = 50, offset = 0 } = filters;

    // Build where clause
    const where: any = { tenantId };

    if (role && isValidRole(role)) {
      where.role = role;
    }

    if (status && isValidStatus(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users
    const users = await prisma.user.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });

    logger.info(
      `Listed ${users.length} users for tenant ${tenantId} (total: ${total})`
    );

    return {
      users: users.map((user: any) => this.toUserResponse(user)),
      total,
      limit,
      offset,
      hasMore: offset + users.length < total,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string, tenantId: string): Promise<UserResponse> {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return this.toUserResponse(user);
  }

  /**
   * Get user by email (within tenant)
   */
  async getUserByEmail(email: string, tenantId: string): Promise<UserResponse | null> {
    const user = await prisma.user.findFirst({
      where: { email, tenantId },
    });

    return user ? this.toUserResponse(user) : null;
  }

  /**
   * Create new user (admin only)
   */
  async createUser(
    data: CreateUserDto,
    tenantId: string,
    createdByUserId: string
  ): Promise<UserResponse> {
    const { email, password, fullName, role, avatarUrl, preferences } = data;

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.error);
    }

    // Validate role
    if (!isValidRole(role)) {
      throw new Error('Invalid role');
    }

    // Check if user with email already exists in this tenant
    const existingUser = await prisma.user.findFirst({
      where: { email, tenantId },
    });

    if (existingUser) {
      throw new Error('User with this email already exists in your organization');
    }

    // Check tenant's max users limit
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const userCount = await prisma.user.count({ where: { tenantId } });
    if (userCount >= tenant.maxUsers) {
      throw new Error(
        `Maximum user limit reached (${tenant.maxUsers}). Please upgrade your plan.`
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        tenantId,
        role,
        status: 'active',
        avatarUrl: avatarUrl || null,
        preferences: preferences || {},
      },
    });

    logger.info(
      `User created: ${user.email} (${user.id}) by user ${createdByUserId}`
    );

    // Send welcome email (async, don't wait)
    emailService
      .sendWelcomeEmail(user.email, user.fullName || 'User')
      .catch((error) => {
        logger.error('Failed to send welcome email:', error);
      });

    return this.toUserResponse(user);
  }

  /**
   * Update user (admin or self with restrictions)
   */
  async updateUser(
    userId: string,
    tenantId: string,
    data: UpdateUserDto | UpdateOwnProfileDto,
    isAdmin: boolean
  ): Promise<UserResponse> {
    // Get user
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Build update data
    const updateData: any = {};

    // Self update (restricted fields)
    if (!isAdmin) {
      const selfData = data as UpdateOwnProfileDto;
      if (selfData.fullName !== undefined) updateData.fullName = selfData.fullName;
      if (selfData.avatarUrl !== undefined) updateData.avatarUrl = selfData.avatarUrl;
      if (selfData.preferences !== undefined)
        updateData.preferences = selfData.preferences;
    } else {
      // Admin update (all fields except tenantId and passwordHash)
      const adminData = data as UpdateUserDto;
      if (adminData.fullName !== undefined) updateData.fullName = adminData.fullName;
      if (adminData.avatarUrl !== undefined) updateData.avatarUrl = adminData.avatarUrl;
      if (adminData.preferences !== undefined)
        updateData.preferences = adminData.preferences;

      // Admin-only fields
      if (adminData.role !== undefined) {
        if (!isValidRole(adminData.role)) {
          throw new Error('Invalid role');
        }
        updateData.role = adminData.role;
      }

      if (adminData.status !== undefined) {
        if (!isValidStatus(adminData.status)) {
          throw new Error('Invalid status');
        }
        updateData.status = adminData.status;
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    logger.info(`User updated: ${updatedUser.email} (${updatedUser.id})`);

    return this.toUserResponse(updatedUser);
  }

  /**
   * Delete user (soft delete - set status to inactive)
   */
  async deleteUser(
    userId: string,
    tenantId: string,
    deletedByUserId: string
  ): Promise<void> {
    // Get user
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if this is the last admin
    if (user.role === 'admin') {
      const adminCount = await prisma.user.count({
        where: { tenantId, role: 'admin', status: 'active' },
      });

      if (adminCount <= 1) {
        throw new Error(
          'Cannot delete the last admin user. Please assign another admin first.'
        );
      }
    }

    // Soft delete (set status to inactive)
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'inactive' },
    });

    logger.info(
      `User deleted: ${user.email} (${user.id}) by user ${deletedByUserId}`
    );
  }

  /**
   * Check if user can access another user's data
   */
  canAccessUser(
    requestingUserId: string,
    targetUserId: string,
    requestingUserRole: string
  ): boolean {
    // Admin can access anyone
    if (requestingUserRole === 'admin') {
      return true;
    }

    // User can access their own data
    return requestingUserId === targetUserId;
  }
}

export const userService = new UserService();
