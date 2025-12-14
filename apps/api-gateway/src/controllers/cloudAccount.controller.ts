import { Request, Response } from 'express';
import cloudAccountService from '../services/cloudAccount.service';
import { logger } from '../utils/logger';
import auditService from '../services/audit.service';
import { AuditEventType, AuditResourceType } from '../types/audit.types';

/**
 * Cloud Account Controller
 * Handles HTTP requests for cloud account management
 */
class CloudAccountController {
  /**
   * Create a new cloud account
   * POST /api/v1/cloud-accounts
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { provider, accountName, accountIdentifier, credentials } = req.body;
      const tenantId = req.user!.tenantId;

      // Validation
      if (!provider || !accountName || !accountIdentifier || !credentials) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Missing required fields: provider, accountName, accountIdentifier, credentials',
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      if (!['aws', 'azure', 'gcp'].includes(provider)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid provider. Must be one of: aws, azure, gcp',
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const account = await cloudAccountService.create({
        tenantId,
        provider,
        accountName,
        accountIdentifier,
        credentials,
      });

      // Log cloud account creation
      await auditService.logResourceOperation(
        AuditEventType.CLOUD_ACCOUNT_CREATED,
        tenantId,
        req.user!.userId,
        AuditResourceType.CLOUD_ACCOUNT,
        account.id,
        req.ip || 'unknown',
        { provider, accountName, accountIdentifier }
      );

      logger.info('Cloud account created', {
        accountId: account.id,
        provider: account.provider,
        tenantId,
        userId: req.user!.userId,
      });

      res.status(201).json({
        success: true,
        data: account,
      });
    } catch (error: any) {
      logger.error('Cloud account creation error', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.userId,
      });

      res.status(400).json({
        success: false,
        error: {
          message: error.message || 'Failed to create cloud account',
          code: 'CREATION_ERROR',
        },
      });
    }
  }

  /**
   * Get all cloud accounts for current tenant
   * GET /api/v1/cloud-accounts
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;

      const accounts = await cloudAccountService.listByTenant(tenantId);

      res.status(200).json({
        success: true,
        data: accounts,
      });
    } catch (error: any) {
      logger.error('Cloud account list error', {
        error: error.message,
        userId: req.user?.userId,
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve cloud accounts',
          code: 'RETRIEVAL_ERROR',
        },
      });
    }
  }

  /**
   * Get cloud account by ID
   * GET /api/v1/cloud-accounts/:id
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;

      const account = await cloudAccountService.getById(id, tenantId);

      if (!account) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Cloud account not found',
            code: 'NOT_FOUND',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: account,
      });
    } catch (error: any) {
      logger.error('Cloud account retrieval error', {
        error: error.message,
        accountId: req.params.id,
        userId: req.user?.userId,
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve cloud account',
          code: 'RETRIEVAL_ERROR',
        },
      });
    }
  }

  /**
   * Update cloud account credentials
   * PUT /api/v1/cloud-accounts/:id/credentials
   */
  async updateCredentials(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { credentials } = req.body;
      const tenantId = req.user!.tenantId;

      if (!credentials) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Missing credentials',
            code: 'VALIDATION_ERROR',
          },
        });
        return;
      }

      const account = await cloudAccountService.updateCredentials(id, tenantId, credentials);

      logger.info('Cloud account credentials updated', {
        accountId: id,
        tenantId,
        userId: req.user!.userId,
      });

      res.status(200).json({
        success: true,
        data: account,
      });
    } catch (error: any) {
      logger.error('Cloud account credential update error', {
        error: error.message,
        accountId: req.params.id,
        userId: req.user?.userId,
      });

      res.status(400).json({
        success: false,
        error: {
          message: error.message || 'Failed to update credentials',
          code: 'UPDATE_ERROR',
        },
      });
    }
  }

  /**
   * Delete cloud account
   * DELETE /api/v1/cloud-accounts/:id
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;

      await cloudAccountService.delete(id, tenantId);

      logger.info('Cloud account deleted', {
        accountId: id,
        tenantId,
        userId: req.user!.userId,
      });

      res.status(200).json({
        success: true,
        message: 'Cloud account deleted successfully',
      });
    } catch (error: any) {
      logger.error('Cloud account deletion error', {
        error: error.message,
        accountId: req.params.id,
        userId: req.user?.userId,
      });

      res.status(400).json({
        success: false,
        error: {
          message: error.message || 'Failed to delete cloud account',
          code: 'DELETION_ERROR',
        },
      });
    }
  }

  /**
   * Test cloud account connection
   * POST /api/v1/cloud-accounts/:id/test
   */
  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.user!.tenantId;

      const isValid = await cloudAccountService.testConnection(id, tenantId);

      logger.info('Cloud account connection tested', {
        accountId: id,
        isValid,
        tenantId,
        userId: req.user!.userId,
      });

      if (isValid) {
        res.status(200).json({
          success: true,
          data: {
            status: 'connected',
            message: 'Cloud account connection successful',
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            message: 'Cloud account connection failed',
            code: 'CONNECTION_FAILED',
          },
        });
      }
    } catch (error: any) {
      logger.error('Cloud account connection test error', {
        error: error.message,
        accountId: req.params.id,
        userId: req.user?.userId,
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to test connection',
          code: 'TEST_ERROR',
        },
      });
    }
  }
}

export const cloudAccountController = new CloudAccountController();
