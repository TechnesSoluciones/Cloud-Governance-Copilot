/**
 * Resources Controller
 * Handles HTTP requests for resource inventory
 */

import { Request, Response } from 'express';
import { ResourcesService } from '../services/resources.service';
import { logger } from '../../../utils/logger';

/**
 * Parse tags from query string format
 * Expects format: tags[key]=value or tags.key=value
 */
function parseTags(query: any): Record<string, string> | undefined {
  const tags: Record<string, string> = {};
  
  // Handle tags[key]=value format
  if (query.tags && typeof query.tags === 'object') {
    Object.entries(query.tags).forEach(([key, value]) => {
      if (typeof value === 'string') {
        tags[key] = value;
      }
    });
  }
  
  return Object.keys(tags).length > 0 ? tags : undefined;
}

/**
 * Get resource inventory
 * GET /api/v1/resources?accountId=xxx&resourceType=xxx&location=xxx&resourceGroup=xxx&tags[env]=prod&page=1&limit=50
 */
export const getResourceInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      accountId,
      resourceType,
      location,
      resourceGroup,
      page = '1',
      limit = '50',
    } = req.query;

    // Validate required parameters
    if (!accountId || typeof accountId !== 'string') {
      res.status(400).json({
        error: 'Missing required parameter: accountId',
      });
      return;
    }

    // Parse and validate optional filters
    const filters: any = {};
    
    if (resourceType && typeof resourceType === 'string') {
      filters.resourceType = resourceType;
    }
    
    if (location && typeof location === 'string') {
      filters.location = location;
    }
    
    if (resourceGroup && typeof resourceGroup === 'string') {
      filters.resourceGroup = resourceGroup;
    }

    // Parse tags
    const tags = parseTags(req.query);
    if (tags) {
      filters.tags = tags;
    }

    // Parse and validate pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      res.status(400).json({
        error: 'Invalid page parameter: must be a positive integer',
      });
      return;
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      res.status(400).json({
        error: 'Invalid limit parameter: must be between 1 and 100',
      });
      return;
    }

    const pagination = {
      page: pageNum,
      limit: limitNum,
    };

    // Get resource inventory
    const result = await ResourcesService.getResourceInventory(
      accountId,
      filters,
      pagination
    );

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error: any) {
    logger.error('Error getting resource inventory:', {
      error: error.message,
      query: req.query,
    });

    // Handle specific error types
    if (error.message.includes('Rate limit exceeded')) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: error.message,
      });
      return;
    }

    if (error.message.includes('Invalid resource type format')) {
      res.status(400).json({
        error: 'Invalid resource type format',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to load resource inventory',
      message: error.message,
    });
  }
};

/**
 * Get resource metadata (for filter dropdowns)
 * GET /api/v1/resources/metadata?accountId=xxx
 */
export const getResourceMetadata = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId } = req.query;

    if (!accountId || typeof accountId !== 'string') {
      res.status(400).json({
        error: 'Missing required parameter: accountId',
      });
      return;
    }

    const metadata = await ResourcesService.getResourceMetadata(accountId);

    res.status(200).json({
      success: true,
      data: metadata,
    });
  } catch (error: any) {
    logger.error('Error getting resource metadata:', {
      error: error.message,
      query: req.query,
    });

    if (error.message.includes('Rate limit exceeded')) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to load resource metadata',
      message: error.message,
    });
  }
};

/**
 * Search resources
 * GET /api/v1/resources/search?accountId=xxx&q=searchterm&limit=100
 */
export const searchResources = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId, q, limit = '100' } = req.query;

    if (!accountId || typeof accountId !== 'string') {
      res.status(400).json({
        error: 'Missing required parameter: accountId',
      });
      return;
    }

    if (!q || typeof q !== 'string') {
      res.status(400).json({
        error: 'Missing required parameter: q (search term)',
      });
      return;
    }

    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      res.status(400).json({
        error: 'Invalid limit parameter: must be between 1 and 1000',
      });
      return;
    }

    const results = await ResourcesService.searchResources(accountId, q, limitNum);

    res.status(200).json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error: any) {
    logger.error('Error searching resources:', {
      error: error.message,
      query: req.query,
    });

    if (error.message.includes('Rate limit exceeded')) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: error.message,
      });
      return;
    }

    if (
      error.message.includes('Search term cannot be empty') ||
      error.message.includes('Search term too long')
    ) {
      res.status(400).json({
        error: 'Invalid search term',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to search resources',
      message: error.message,
    });
  }
};
