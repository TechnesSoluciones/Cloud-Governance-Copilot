/**
 * Compliance DTOs
 * Data Transfer Objects for compliance and recommendations endpoints
 */

/**
 * Compliance result response DTO
 * Represents compliance status for a regulatory standard (CIS, ISO, PCI-DSS, etc.)
 */
export interface ComplianceResultDto {
  standardName: string;
  standardId?: string;
  description?: string;
  passedControls: number;
  failedControls: number;
  skippedControls: number;
  totalControls: number;
  compliancePercentage: number;
  lastAssessed?: Date;
}

/**
 * Compliance response with multiple standards
 */
export interface ComplianceResponseDto {
  compliance: ComplianceResultDto[];
  summary: {
    totalStandards: number;
    averageCompliance: number;
    criticalFailures: number;
  };
}

/**
 * Security recommendation DTO
 * Represents actionable security recommendations
 */
export interface SecurityRecommendationDto {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  category: string;
  impact: string;
  remediation: string;
  affectedResources: number;
  estimatedEffort?: 'Low' | 'Medium' | 'High';
  securityImpact?: 'Low' | 'Medium' | 'High';
  complianceStandards?: string[];
  priority: number; // 1-100, higher is more urgent
}

/**
 * Recommendations response DTO
 */
export interface RecommendationsResponseDto {
  recommendations: SecurityRecommendationDto[];
  summary: {
    total: number;
    bySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      informational: number;
    };
    byCategory: Record<string, number>;
  };
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Request query parameters for compliance endpoint
 */
export interface ComplianceQueryDto {
  accountId: string;
}

/**
 * Request query parameters for recommendations endpoint
 */
export interface RecommendationsQueryDto {
  accountId: string;
  severity?: ('critical' | 'high' | 'medium' | 'low' | 'informational')[];
  category?: string;
  limit?: number; // Default: 50, max: 200
  offset?: number; // Default: 0
  sortBy?: 'priority' | 'severity' | 'affectedResources';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Validate compliance query parameters
 */
export function validateComplianceQuery(query: any): {
  valid: boolean;
  errors?: string[];
  data?: ComplianceQueryDto;
} {
  const errors: string[] = [];

  if (!query.accountId || typeof query.accountId !== 'string') {
    errors.push('accountId is required and must be a string');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      accountId: query.accountId,
    },
  };
}

/**
 * Validate recommendations query parameters
 */
export function validateRecommendationsQuery(query: any): {
  valid: boolean;
  errors?: string[];
  data?: RecommendationsQueryDto;
} {
  const errors: string[] = [];

  // Required: accountId
  if (!query.accountId || typeof query.accountId !== 'string') {
    errors.push('accountId is required and must be a string');
  }

  // Optional: severity (can be comma-separated)
  let severity: ('critical' | 'high' | 'medium' | 'low' | 'informational')[] | undefined;
  if (query.severity) {
    const severityValues = typeof query.severity === 'string'
      ? query.severity.split(',').map(s => s.trim().toLowerCase())
      : Array.isArray(query.severity)
      ? query.severity.map(s => String(s).toLowerCase())
      : [];

    const validSeverities = ['critical', 'high', 'medium', 'low', 'informational'];
    severity = severityValues.filter(s =>
      validSeverities.includes(s)
    ) as ('critical' | 'high' | 'medium' | 'low' | 'informational')[];

    if (severity.length === 0) {
      errors.push('severity must be one or more of: critical, high, medium, low, informational');
    }
  }

  // Optional: category
  let category: string | undefined;
  if (query.category && typeof query.category === 'string') {
    category = query.category;
  }

  // Optional: limit (default: 50, max: 200)
  let limit = 50;
  if (query.limit) {
    const parsedLimit = parseInt(query.limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      errors.push('limit must be a positive integer');
    } else if (parsedLimit > 200) {
      errors.push('limit cannot exceed 200');
    } else {
      limit = parsedLimit;
    }
  }

  // Optional: offset (default: 0)
  let offset = 0;
  if (query.offset) {
    const parsedOffset = parseInt(query.offset, 10);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      errors.push('offset must be a non-negative integer');
    } else {
      offset = parsedOffset;
    }
  }

  // Optional: sortBy
  let sortBy: 'priority' | 'severity' | 'affectedResources' | undefined;
  if (query.sortBy) {
    const validSortFields = ['priority', 'severity', 'affectedResources'];
    if (!validSortFields.includes(query.sortBy)) {
      errors.push('sortBy must be one of: priority, severity, affectedResources');
    } else {
      sortBy = query.sortBy as 'priority' | 'severity' | 'affectedResources';
    }
  }

  // Optional: sortOrder
  let sortOrder: 'asc' | 'desc' = 'desc';
  if (query.sortOrder) {
    if (query.sortOrder !== 'asc' && query.sortOrder !== 'desc') {
      errors.push('sortOrder must be either asc or desc');
    } else {
      sortOrder = query.sortOrder;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      accountId: query.accountId,
      severity,
      category,
      limit,
      offset,
      sortBy,
      sortOrder,
    },
  };
}
