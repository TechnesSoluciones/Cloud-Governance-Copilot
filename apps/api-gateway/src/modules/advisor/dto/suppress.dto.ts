/**
 * Azure Advisor Suppress/Dismiss DTOs
 *
 * Data Transfer Objects for suppressing and dismissing Azure Advisor recommendations.
 *
 * @module modules/advisor/dto
 */

/**
 * Suppress recommendation request
 *
 * Used when temporarily hiding a recommendation
 */
export interface SuppressRecommendationDTO {
  recommendationId: string;
  durationDays: number; // How long to suppress (7, 30, 90, 365)
  reason?: string;
  notes?: string;
}

/**
 * Dismiss recommendation request
 *
 * Used when permanently dismissing a recommendation
 */
export interface DismissRecommendationDTO {
  recommendationId: string;
  reason: string; // Required for audit trail
  permanentDismiss?: boolean; // If true, don't show again for this resource
}

/**
 * Reactivate recommendation request
 *
 * Used to bring back a suppressed/dismissed recommendation
 */
export interface ReactivateRecommendationDTO {
  recommendationId: string;
  notes?: string;
}

/**
 * Suppress/Dismiss response
 */
export interface SuppressActionResponseDTO {
  success: boolean;
  recommendationId: string;
  actionType: 'suppress' | 'dismiss' | 'reactivate';
  suppressedUntil?: Date;
  message: string;
  actionId: string; // Reference to advisor_actions table
}

/**
 * Bulk suppress request
 */
export interface BulkSuppressDTO {
  recommendationIds: string[];
  durationDays: number;
  reason?: string;
}

/**
 * Bulk suppress response
 */
export interface BulkSuppressResponseDTO {
  successCount: number;
  failureCount: number;
  results: {
    recommendationId: string;
    success: boolean;
    error?: string;
  }[];
}

/**
 * Action history item
 */
export interface ActionHistoryItemDTO {
  actionId: string;
  recommendationId: string;
  actionType: 'suppress' | 'dismiss' | 'apply' | 'resolve';
  userId: string;
  userEmail: string;
  durationDays?: number;
  notes?: string;
  createdAt: Date;
}

/**
 * Action history response
 */
export interface ActionHistoryDTO {
  recommendationId: string;
  actions: ActionHistoryItemDTO[];
  totalActions: number;
}
