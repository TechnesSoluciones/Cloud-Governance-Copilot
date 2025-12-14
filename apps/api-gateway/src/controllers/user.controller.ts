import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import auditService from '../services/audit.service';
import { AuditEventType, AuditResourceType } from '../types/audit.types';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateOwnProfileDto,
  UserListFilters,
} from '../types/user.types';
import { logger } from '../utils/logger';

export class UserController {
  /**
   * GET /api/v1/users
   * List users with filters and pagination
   */
  async listUsers(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Not authenticated', code: 'UNAUTHORIZED' },
        });
      }

      const filters: UserListFilters = {
        role: req.query.role as any,
        status: req.query.status as any,
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      const result = await userService.listUsers(req.user.tenantId, filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('List users error:', error);
      res.status(500).json({
        success: false,
        error: { message: error.message || 'Failed to list users', code: 'SERVER_ERROR' },
      });
    }
  }

  /**
   * GET /api/v1/users/:id
   * Get user by ID
   */
  async getUserById(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Not authenticated', code: 'UNAUTHORIZED' },
        });
      }

      const { id } = req.params;

      // Check if user can access this user's data
      if (
        !userService.canAccessUser(req.user.userId, id, req.user.role)
      ) {
        return res.status(403).json({
          success: false,
          error: { message: 'Insufficient permissions', code: 'FORBIDDEN' },
        });
      }

      const user = await userService.getUserById(id, req.user.tenantId);

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error: any) {
      logger.error('Get user by ID error:', error);

      const statusCode = error.message.includes('not found') ? 404 : 500;

      res.status(statusCode).json({
        success: false,
        error: {
          message: error.message || 'Failed to get user',
          code: statusCode === 404 ? 'NOT_FOUND' : 'SERVER_ERROR',
        },
      });
    }
  }

  /**
   * GET /api/v1/users/me
   * Get current user profile
   */
  async getCurrentUser(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Not authenticated', code: 'UNAUTHORIZED' },
        });
      }

      const user = await userService.getUserById(
        req.user.userId,
        req.user.tenantId
      );

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error: any) {
      logger.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get user profile', code: 'SERVER_ERROR' },
      });
    }
  }

  /**
   * POST /api/v1/users
   * Create new user (admin only)
   */
  async createUser(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Not authenticated', code: 'UNAUTHORIZED' },
        });
      }

      const data: CreateUserDto = req.body;

      // Validate required fields
      if (!data.email || !data.password || !data.fullName || !data.role) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Email, password, full name, and role are required',
            code: 'VALIDATION_ERROR',
          },
        });
      }

      const user = await userService.createUser(
        data,
        req.user.tenantId,
        req.user.userId
      );

      // Log audit event
      auditService.log({
        tenantId: req.user.tenantId,
        userId: req.user.userId,
        action: AuditEventType.USER_CREATED,
        resourceType: AuditResourceType.USER,
        resourceId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { email: user.email, role: user.role },
        success: true,
      });

      res.status(201).json({
        success: true,
        data: { user },
      });
    } catch (error: any) {
      logger.error('Create user error:', error);

      // Log failed attempt
      if (req.user) {
        auditService.log({
          tenantId: req.user.tenantId,
          userId: req.user.userId,
          action: AuditEventType.USER_CREATED,
          resourceType: AuditResourceType.USER,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: { email: req.body.email, error: error.message },
          success: false,
          errorMessage: error.message,
        });
      }

      const statusCode = error.message.includes('already exists')
        ? 409
        : error.message.includes('limit reached')
        ? 403
        : 400;

      res.status(statusCode).json({
        success: false,
        error: { message: error.message || 'Failed to create user', code: 'CREATE_ERROR' },
      });
    }
  }

  /**
   * PATCH /api/v1/users/:id
   * Update user
   */
  async updateUser(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Not authenticated', code: 'UNAUTHORIZED' },
        });
      }

      const { id } = req.params;
      const data: UpdateUserDto | UpdateOwnProfileDto = req.body;

      // Validate if body is empty
      if (Object.keys(data).length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'No update data provided', code: 'VALIDATION_ERROR' },
        });
      }

      // Check permissions
      const isAdmin = req.user.role === 'admin';
      const isSelf = req.user.userId === id;

      if (!isAdmin && !isSelf) {
        return res.status(403).json({
          success: false,
          error: { message: 'Insufficient permissions', code: 'FORBIDDEN' },
        });
      }

      // Track if role changed
      const oldUser = await userService.getUserById(id, req.user.tenantId);
      const oldRole = oldUser.role;

      const user = await userService.updateUser(
        id,
        req.user.tenantId,
        data,
        isAdmin
      );

      // Log audit event
      const auditEvent =
        oldRole !== user.role
          ? AuditEventType.USER_ROLE_CHANGED
          : AuditEventType.USER_UPDATED;

      auditService.log({
        tenantId: req.user.tenantId,
        userId: req.user.userId,
        action: auditEvent,
        resourceType: AuditResourceType.USER,
        resourceId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          updatedFields: Object.keys(data),
          oldRole: oldRole !== user.role ? oldRole : undefined,
          newRole: oldRole !== user.role ? user.role : undefined,
        },
        success: true,
      });

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error: any) {
      logger.error('Update user error:', error);

      const statusCode = error.message.includes('not found') ? 404 : 400;

      res.status(statusCode).json({
        success: false,
        error: { message: error.message || 'Failed to update user', code: 'UPDATE_ERROR' },
      });
    }
  }

  /**
   * DELETE /api/v1/users/:id
   * Delete user (soft delete)
   */
  async deleteUser(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Not authenticated', code: 'UNAUTHORIZED' },
        });
      }

      const { id } = req.params;

      await userService.deleteUser(id, req.user.tenantId, req.user.userId);

      // Log audit event
      auditService.log({
        tenantId: req.user.tenantId,
        userId: req.user.userId,
        action: AuditEventType.USER_DELETED,
        resourceType: AuditResourceType.USER,
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {},
        success: true,
      });

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error: any) {
      logger.error('Delete user error:', error);

      // Log failed attempt
      if (req.user) {
        auditService.log({
          tenantId: req.user.tenantId,
          userId: req.user.userId,
          action: AuditEventType.USER_DELETED,
          resourceType: AuditResourceType.USER,
          resourceId: req.params.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: { error: error.message },
          success: false,
          errorMessage: error.message,
        });
      }

      const statusCode = error.message.includes('not found')
        ? 404
        : error.message.includes('last admin')
        ? 403
        : 500;

      res.status(statusCode).json({
        success: false,
        error: { message: error.message || 'Failed to delete user', code: 'DELETE_ERROR' },
      });
    }
  }
}

export const userController = new UserController();
