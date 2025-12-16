/**
 * Security Assessment DTOs
 * Data Transfer Objects for security assessments endpoints
 */

export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';
export type AssessmentStatus = 'Healthy' | 'Unhealthy' | 'NotApplicable';

/**
 * Security assessment response DTO
 */
export interface SecurityAssessmentDto {
  id: string;
  name: string;
  displayName: string;
  description: string;
  severity: SecuritySeverity;
  status: AssessmentStatus;
  resourceId?: string;
  resourceType?: string;
  remediation?: string;
  category: string;
  compliance: string[];
  metadata: {
    assessmentType?: string;
    implementationEffort?: string;
    userImpact?: string;
    threats?: string[];
  };
  assessedAt?: Date;
}

/**
 * Paginated assessments response DTO
 */
export interface AssessmentsResponseDto {
  assessments: SecurityAssessmentDto[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  filters: {
    severity?: SecuritySeverity[];
    status?: AssessmentStatus;
    resourceType?: string;
  };
}

/**
 * Request query parameters for assessments endpoint
 */
export interface AssessmentsQueryDto {
  accountId: string;
  severity?: SecuritySeverity[]; // Filter by severity (can be multiple)
  status?: AssessmentStatus; // Filter by status
  resourceType?: string; // Filter by resource type
  limit?: number; // Pagination limit (default: 50, max: 500)
  offset?: number; // Pagination offset (default: 0)
  sortBy?: 'severity' | 'displayName' | 'status'; // Sort field
  sortOrder?: 'asc' | 'desc'; // Sort order
}

/**
 * Validate assessments query parameters
 */
export function validateAssessmentsQuery(query: any): {
  valid: boolean;
  errors?: string[];
  data?: AssessmentsQueryDto;
} {
  const errors: string[] = [];

  // Required: accountId
  if (!query.accountId || typeof query.accountId !== 'string') {
    errors.push('accountId is required and must be a string');
  }

  // Optional: severity (can be comma-separated string)
  let severity: SecuritySeverity[] | undefined;
  if (query.severity) {
    const severityValues = typeof query.severity === 'string'
      ? query.severity.split(',').map(s => s.trim().toLowerCase())
      : Array.isArray(query.severity)
      ? query.severity.map(s => String(s).toLowerCase())
      : [];

    const validSeverities: SecuritySeverity[] = ['critical', 'high', 'medium', 'low', 'informational'];
    severity = severityValues.filter(s =>
      validSeverities.includes(s as SecuritySeverity)
    ) as SecuritySeverity[];

    if (severity.length === 0) {
      errors.push('severity must be one or more of: critical, high, medium, low, informational');
    }
  }

  // Optional: status
  let status: AssessmentStatus | undefined;
  if (query.status) {
    const validStatuses: AssessmentStatus[] = ['Healthy', 'Unhealthy', 'NotApplicable'];
    if (!validStatuses.includes(query.status as AssessmentStatus)) {
      errors.push('status must be one of: Healthy, Unhealthy, NotApplicable');
    } else {
      status = query.status as AssessmentStatus;
    }
  }

  // Optional: resourceType
  let resourceType: string | undefined;
  if (query.resourceType && typeof query.resourceType === 'string') {
    resourceType = query.resourceType;
  }

  // Optional: limit (default: 50, max: 500)
  let limit = 50;
  if (query.limit) {
    const parsedLimit = parseInt(query.limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      errors.push('limit must be a positive integer');
    } else if (parsedLimit > 500) {
      errors.push('limit cannot exceed 500');
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
  let sortBy: 'severity' | 'displayName' | 'status' | undefined;
  if (query.sortBy) {
    const validSortFields = ['severity', 'displayName', 'status'];
    if (!validSortFields.includes(query.sortBy)) {
      errors.push('sortBy must be one of: severity, displayName, status');
    } else {
      sortBy = query.sortBy;
    }
  }

  // Optional: sortOrder
  let sortOrder: 'asc' | 'desc' = 'desc'; // Default to descending
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
      status,
      resourceType,
      limit,
      offset,
      sortBy,
      sortOrder,
    },
  };
}

/**
 * Sort assessments by specified field and order
 */
export function sortAssessments(
  assessments: SecurityAssessmentDto[],
  sortBy?: 'severity' | 'displayName' | 'status',
  sortOrder: 'asc' | 'desc' = 'desc'
): SecurityAssessmentDto[] {
  if (!sortBy) return assessments;

  const severityOrder: Record<SecuritySeverity, number> = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    informational: 1,
  };

  return [...assessments].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'severity':
        comparison = severityOrder[a.severity] - severityOrder[b.severity];
        break;
      case 'displayName':
        comparison = a.displayName.localeCompare(b.displayName);
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}
