import { Request, Response } from 'express';
import { emailVerificationService } from '../services/emailVerification.service';
import { logger } from '../utils/logger';
import auditService from '../services/audit.service';
import { AuditEventType } from '../types/audit.types';

export class EmailVerificationController {
  /**
   * Send email verification
   * POST /api/v1/auth/send-verification
   * Requires authentication
   */
  async sendVerification(req: Request, res: Response) {
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

      const userId = req.user.userId;

      await emailVerificationService.sendVerificationEmail(userId);

      // Log audit event
      auditService.logAuth(
        AuditEventType.AUTH_EMAIL_VERIFICATION_SENT,
        req.user.tenantId,
        userId,
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
        true,
        { email: req.user.email }
      );

      res.status(200).json({
        success: true,
        message: 'Verification email sent successfully',
      });
    } catch (error: any) {
      logger.error('Send verification email error:', error);

      // Log failed attempt
      if (req.user) {
        auditService.logAuth(
          AuditEventType.AUTH_EMAIL_VERIFICATION_SENT,
          req.user.tenantId,
          req.user.userId,
          req.ip || 'unknown',
          req.headers['user-agent'] || 'unknown',
          false,
          { email: req.user.email, error: error.message }
        );
      }

      const statusCode = error.message.includes('already verified') ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        error: {
          message: error.message || 'Failed to send verification email',
          code: 'EMAIL_VERIFICATION_ERROR',
        },
      });
    }
  }

  /**
   * Verify email with token
   * GET /api/v1/auth/verify-email/:token
   * Public endpoint
   */
  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Verification token is required',
            code: 'VALIDATION_ERROR',
          },
        });
      }

      const result = await emailVerificationService.verifyEmail(token);

      if (result.success) {
        // Log success
        auditService.logAuth(
          AuditEventType.AUTH_EMAIL_VERIFICATION_SUCCESS,
          'unknown', // Don't have tenant ID from token
          undefined,
          req.ip || 'unknown',
          req.headers['user-agent'] || 'unknown',
          true,
          { email: result.email }
        );

        res.status(200).json({
          success: true,
          message: 'Email verified successfully',
          data: {
            email: result.email,
          },
        });
      } else {
        // Log failure
        auditService.logAuth(
          AuditEventType.AUTH_EMAIL_VERIFICATION_FAILURE,
          'unknown',
          undefined,
          req.ip || 'unknown',
          req.headers['user-agent'] || 'unknown',
          false,
          { token: token.substring(0, 8) + '...' }
        );

        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid or expired verification token',
            code: 'INVALID_TOKEN',
          },
        });
      }
    } catch (error: any) {
      logger.error('Verify email error:', error);

      auditService.logAuth(
        AuditEventType.AUTH_EMAIL_VERIFICATION_FAILURE,
        'unknown',
        undefined,
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
        false,
        { error: error.message }
      );

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to verify email',
          code: 'SERVER_ERROR',
        },
      });
    }
  }

  /**
   * Resend verification email
   * POST /api/v1/auth/resend-verification
   * Requires authentication
   */
  async resendVerification(req: Request, res: Response) {
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

      const userId = req.user.userId;

      await emailVerificationService.resendVerificationEmail(userId);

      // Log audit event
      auditService.logAuth(
        AuditEventType.AUTH_EMAIL_VERIFICATION_SENT,
        req.user.tenantId,
        userId,
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
        true,
        { email: req.user.email, resend: true }
      );

      res.status(200).json({
        success: true,
        message: 'Verification email resent successfully',
      });
    } catch (error: any) {
      logger.error('Resend verification email error:', error);

      // Log failed attempt
      if (req.user) {
        auditService.logAuth(
          AuditEventType.AUTH_EMAIL_VERIFICATION_SENT,
          req.user.tenantId,
          req.user.userId,
          req.ip || 'unknown',
          req.headers['user-agent'] || 'unknown',
          false,
          { email: req.user.email, resend: true, error: error.message }
        );
      }

      const statusCode = error.message.includes('already verified') ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        error: {
          message: error.message || 'Failed to resend verification email',
          code: 'EMAIL_VERIFICATION_ERROR',
        },
      });
    }
  }
}

export const emailVerificationController = new EmailVerificationController();
