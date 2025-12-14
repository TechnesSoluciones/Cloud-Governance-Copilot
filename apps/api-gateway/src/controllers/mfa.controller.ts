import { Request, Response } from 'express';
import { mfaService } from '../services/mfa.service';
import { logger } from '../utils/logger';
import auditService from '../services/audit.service';
import { AuditEventType } from '../types/audit.types';

export class MFAController {
  /**
   * Setup MFA - Initialize MFA setup and return QR code
   * POST /api/v1/auth/mfa/setup
   * Requires authentication
   */
  async setupMFA(req: Request, res: Response) {
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

      const result = await mfaService.setupMFA(req.user.userId);

      res.status(200).json({
        success: true,
        data: {
          secret: result.secret,
          qrCode: result.qrCodeUrl,
        },
        message: 'MFA setup initiated. Scan the QR code with your authenticator app.',
      });
    } catch (error: any) {
      logger.error('MFA setup error:', error);

      const statusCode = error.message.includes('already enabled') ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        error: {
          message: error.message || 'Failed to setup MFA',
          code: 'MFA_SETUP_ERROR',
        },
      });
    }
  }

  /**
   * Verify MFA Setup - Confirm MFA setup with a token
   * POST /api/v1/auth/mfa/verify-setup
   * Requires authentication
   * Body: { token: string, secret: string }
   */
  async verifySetup(req: Request, res: Response) {
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

      const { token, secret } = req.body;

      if (!token || !secret) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Token and secret are required',
            code: 'VALIDATION_ERROR',
          },
        });
      }

      const result = await mfaService.verifySetup(req.user.userId, token, secret);

      // Log audit event
      auditService.logAuth(
        AuditEventType.AUTH_MFA_ENABLED,
        req.user.tenantId,
        req.user.userId,
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
        true,
        { email: req.user.email }
      );

      res.status(200).json({
        success: true,
        data: {
          backupCodes: result.backupCodes,
        },
        message: 'MFA enabled successfully. Save your backup codes in a secure location.',
      });
    } catch (error: any) {
      logger.error('MFA verify setup error:', error);

      // Log failed attempt
      if (req.user) {
        auditService.logAuth(
          AuditEventType.AUTH_MFA_ENABLED,
          req.user.tenantId,
          req.user.userId,
          req.ip || 'unknown',
          req.headers['user-agent'] || 'unknown',
          false,
          { email: req.user.email, error: error.message }
        );
      }

      const statusCode = error.message.includes('Invalid') ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        error: {
          message: error.message || 'Failed to verify MFA setup',
          code: 'MFA_VERIFICATION_ERROR',
        },
      });
    }
  }

  /**
   * Verify MFA Token - Verify token during login
   * POST /api/v1/auth/mfa/verify
   * Public (used during login flow)
   * Body: { userId: string, token: string }
   */
  async verifyMFA(req: Request, res: Response) {
    try {
      const { userId, token } = req.body;

      if (!userId || !token) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'User ID and token are required',
            code: 'VALIDATION_ERROR',
          },
        });
      }

      const result = await mfaService.verifyMFA(userId, token);

      if (result.success) {
        // Log success
        auditService.logAuth(
          AuditEventType.AUTH_MFA_VERIFIED,
          'unknown', // Don't have tenant ID yet
          userId,
          req.ip || 'unknown',
          req.headers['user-agent'] || 'unknown',
          true,
          {}
        );

        res.status(200).json({
          success: true,
          message: 'MFA verification successful',
        });
      } else {
        // Log failure
        auditService.logAuth(
          AuditEventType.AUTH_MFA_FAILURE,
          'unknown',
          userId,
          req.ip || 'unknown',
          req.headers['user-agent'] || 'unknown',
          false,
          { error: result.message }
        );

        res.status(401).json({
          success: false,
          error: {
            message: result.message || 'MFA verification failed',
            code: 'MFA_VERIFICATION_FAILED',
          },
        });
      }
    } catch (error: any) {
      logger.error('MFA verify error:', error);

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to verify MFA token',
          code: 'SERVER_ERROR',
        },
      });
    }
  }

  /**
   * Disable MFA
   * POST /api/v1/auth/mfa/disable
   * Requires authentication
   * Body: { password: string, token: string }
   */
  async disableMFA(req: Request, res: Response) {
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

      const { password, token } = req.body;

      if (!password || !token) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Password and MFA token are required',
            code: 'VALIDATION_ERROR',
          },
        });
      }

      await mfaService.disableMFA(req.user.userId, password, token);

      // Log audit event
      auditService.logAuth(
        AuditEventType.AUTH_MFA_DISABLED,
        req.user.tenantId,
        req.user.userId,
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
        true,
        { email: req.user.email }
      );

      res.status(200).json({
        success: true,
        message: 'MFA disabled successfully',
      });
    } catch (error: any) {
      logger.error('MFA disable error:', error);

      // Log failed attempt
      if (req.user) {
        auditService.logAuth(
          AuditEventType.AUTH_MFA_DISABLED,
          req.user.tenantId,
          req.user.userId,
          req.ip || 'unknown',
          req.headers['user-agent'] || 'unknown',
          false,
          { email: req.user.email, error: error.message }
        );
      }

      const statusCode = error.message.includes('Invalid') || error.message.includes('not enabled')
        ? 400
        : 500;

      res.status(statusCode).json({
        success: false,
        error: {
          message: error.message || 'Failed to disable MFA',
          code: 'MFA_DISABLE_ERROR',
        },
      });
    }
  }

  /**
   * Regenerate Backup Codes
   * POST /api/v1/auth/mfa/backup-codes
   * Requires authentication
   * Body: { password: string, token: string }
   */
  async regenerateBackupCodes(req: Request, res: Response) {
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

      const { password, token } = req.body;

      if (!password || !token) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Password and MFA token are required',
            code: 'VALIDATION_ERROR',
          },
        });
      }

      const backupCodes = await mfaService.regenerateBackupCodes(
        req.user.userId,
        password,
        token
      );

      // Log audit event
      auditService.logAuth(
        AuditEventType.AUTH_MFA_ENABLED, // Use MFA_ENABLED for backup code generation
        req.user.tenantId,
        req.user.userId,
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
        true,
        { email: req.user.email, action: 'backup_codes_regenerated' }
      );

      res.status(200).json({
        success: true,
        data: {
          backupCodes,
        },
        message: 'Backup codes regenerated successfully. Save them in a secure location.',
      });
    } catch (error: any) {
      logger.error('MFA regenerate backup codes error:', error);

      const statusCode = error.message.includes('Invalid') || error.message.includes('not enabled')
        ? 400
        : 500;

      res.status(statusCode).json({
        success: false,
        error: {
          message: error.message || 'Failed to regenerate backup codes',
          code: 'MFA_BACKUP_CODES_ERROR',
        },
      });
    }
  }
}

export const mfaController = new MFAController();
