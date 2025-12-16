/**
 * Security Score DTOs
 * Data Transfer Objects for security score endpoints
 */

/**
 * Security score response DTO
 * Represents the overall security posture score
 */
export interface SecurityScoreDto {
  displayName: string;
  score: {
    current: number;
    max: number;
    percentage: number;
  };
  weight: number;
  breakdown?: SecurityScoreControlDto[];
}

/**
 * Security score control breakdown DTO
 * Represents individual control categories (Network, Data, Identity, etc.)
 */
export interface SecurityScoreControlDto {
  displayName: string;
  score: {
    current: number;
    max: number;
    percentage: number;
  };
  weight: number;
  category?: string;
}

/**
 * Request query parameters for security score endpoint
 */
export interface SecurityScoreQueryDto {
  accountId: string;
  includeBreakdown?: boolean; // Whether to include control-level breakdown
}

/**
 * Validate security score query parameters
 */
export function validateSecurityScoreQuery(query: any): {
  valid: boolean;
  errors?: string[];
  data?: SecurityScoreQueryDto;
} {
  const errors: string[] = [];

  if (!query.accountId || typeof query.accountId !== 'string') {
    errors.push('accountId is required and must be a string');
  }

  if (query.includeBreakdown !== undefined && typeof query.includeBreakdown !== 'boolean') {
    if (query.includeBreakdown !== 'true' && query.includeBreakdown !== 'false') {
      errors.push('includeBreakdown must be a boolean');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      accountId: query.accountId,
      includeBreakdown: query.includeBreakdown === 'true' || query.includeBreakdown === true,
    },
  };
}
