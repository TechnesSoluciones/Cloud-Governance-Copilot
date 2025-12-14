import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from '../types/auth.types';
import { verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import auditService from '../services/audit.service';
import { AuditEventType } from '../types/audit.types';

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const data: RegisterDto = req.body;

      // Validate required fields
      if (!data.email || !data.password || !data.fullName) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Email, password, and full name are required',
            code: 'VALIDATION_ERROR',
          },
        });
      }

      const result = await authService.register(data);

      // Log successful registration
      auditService.logAuth(
        AuditEventType.AUTH_REGISTER,
        result.user.tenantId,
        result.user.id,
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
        true,
        { email: data.email }
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Registration error:', error);

      // Log failed registration
      auditService.logAuth(
        AuditEventType.AUTH_REGISTER,
        'unknown',
        undefined,
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
        false,
        { email: req.body.email, error: error.message }
      );

      const statusCode = error.message.includes('already exists') ? 409 : 400;

      res.status(statusCode).json({
        success: false,
        error: {
          message: error.message || 'Registration failed',
          code: 'REGISTRATION_ERROR',
        },
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const data: LoginDto = req.body;

      // Validate required fields
      if (!data.email || !data.password) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Email and password are required',
            code: 'VALIDATION_ERROR',
          },
        });
      }

      const result = await authService.login(data);

      // Log successful login
      auditService.logAuth(
        AuditEventType.AUTH_LOGIN_SUCCESS,
        result.user.tenantId,
        result.user.id,
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
        true,
        { email: data.email }
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Login error:', error);

      // Log failed login
      auditService.logAuth(
        AuditEventType.AUTH_LOGIN_FAILURE,
        'unknown',
        undefined,
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
        false,
        { email: req.body.email, error: error.message }
      );

      const statusCode = error.message.includes('Invalid credentials') ? 401 : 400;

      res.status(statusCode).json({
        success: false,
        error: {
          message: error.message || 'Login failed',
          code: 'LOGIN_ERROR',
        },
      });
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken }: RefreshTokenDto = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Refresh token is required',
            code: 'VALIDATION_ERROR',
          },
        });
      }

      // Verify refresh token
      const decoded = verifyToken(refreshToken);

      const result = await authService.refreshToken(decoded.userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Token refresh error:', error);

      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or expired refresh token',
          code: 'TOKEN_REFRESH_ERROR',
        },
      });
    }
  }

  async me(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Not authenticated',
            code: 'UNAUTHORIZED',
          },
        });
      }

      res.status(200).json({
        success: true,
        data: {
          user: req.user,
        },
      });
    } catch (error: any) {
      logger.error('Get current user error:', error);

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get user info',
          code: 'SERVER_ERROR',
        },
      });
    }
  }

  /**
   * Request password reset
   * POST /api/v1/auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Email is required',
            code: 'VALIDATION_ERROR',
          },
        });
      }

      // Request password reset (always returns success)
      await authService.requestPasswordReset(email);

      // Log audit event
      auditService.logAuth(
        AuditEventType.AUTH_PASSWORD_RESET_REQUEST,
        'unknown', // Don't reveal tenant
        undefined,
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
        true,
        { email } // Only log email for audit
      );

      // Always return success (security best practice)
      res.status(200).json({
        success: true,
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (error: any) {
      logger.error('Forgot password error:', error);

      // Still return success (don't reveal errors)
      res.status(200).json({
        success: true,
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });
    }
  }

  /**
   * Verify password reset token
   * GET /api/v1/auth/verify-reset-token/:token
   */
  async verifyResetToken(req: Request, res: Response) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Token is required',
            code: 'VALIDATION_ERROR',
          },
        });
      }

      const result = await authService.verifyResetToken(token);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Verify reset token error:', error);

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to verify token',
          code: 'SERVER_ERROR',
        },
      });
    }
  }

  /**
   * Reset password with token
   * POST /api/v1/auth/reset-password
   */
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Token and new password are required',
            code: 'VALIDATION_ERROR',
          },
        });
      }

      const result = await authService.resetPassword(token, newPassword);

      // Log audit event
      auditService.logAuth(
        AuditEventType.AUTH_PASSWORD_RESET_COMPLETE,
        result.user.tenantId,
        result.user.id,
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
        true,
        { email: result.user.email }
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Password reset successful. You are now logged in.',
      });
    } catch (error: any) {
      logger.error('Reset password error:', error);

      // Log failed attempt
      auditService.logAuth(
        AuditEventType.AUTH_PASSWORD_RESET_COMPLETE,
        'unknown',
        undefined,
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
        false,
        { error: error.message }
      );

      const statusCode = error.message.includes('Invalid or expired') ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        error: {
          message: error.message || 'Failed to reset password',
          code: 'RESET_PASSWORD_ERROR',
        },
      });
    }
  }
}

export const authController = new AuthController();
