/**
 * Dashboard Controller
 * Handles HTTP requests for dashboard data
 */

import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';

/**
 * Get dashboard overview
 * GET /api/v1/dashboard/overview?accountId=xxx
 */
export const getOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId } = req.query;

    if (!accountId || typeof accountId !== 'string') {
      res.status(400).json({
        error: 'Missing required parameter: accountId',
      });
      return;
    }

    const overview = await DashboardService.getOverview(accountId);

    res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error: any) {
    console.error('Error getting dashboard overview:', error);
    res.status(500).json({
      error: 'Failed to load dashboard overview',
      message: error.message,
    });
  }
};

/**
 * Get health status
 * GET /api/v1/dashboard/health?accountId=xxx
 */
export const getHealthStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId } = req.query;

    if (!accountId || typeof accountId !== 'string') {
      res.status(400).json({
        error: 'Missing required parameter: accountId',
      });
      return;
    }

    const health = await DashboardService.getHealthStatus(accountId);

    res.status(200).json({
      success: true,
      data: health,
    });
  } catch (error: any) {
    console.error('Error getting health status:', error);
    res.status(500).json({
      error: 'Failed to load health status',
      message: error.message,
    });
  }
};
