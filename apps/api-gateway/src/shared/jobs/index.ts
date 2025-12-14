/**
 * Shared Jobs Barrel Export
 *
 * This file exports all background job modules for convenient importing.
 *
 * @module Shared/Jobs
 */

// Cost Collection Job Exports
export {
  queue as costCollectionQueue,
  worker as costCollectionWorker,
  connection as redisConnection,
  scheduleDailyCostCollection,
  triggerManualCostCollection,
  shutdownCostCollectionJob,
} from './cost-collection.job';

// Recommendations Generation Job Exports
export {
  queue as recommendationsQueue,
  worker as recommendationsWorker,
  scheduleDailyRecommendationGeneration,
  triggerManualRecommendationGeneration,
  shutdownRecommendationGenerationJob,
} from './recommendations-generation.job';

// Asset Discovery Job Exports
export {
  assetDiscoveryQueue,
  assetDiscoveryWorker,
  scheduleDailyAssetDiscovery,
  triggerManualAssetDiscovery,
  shutdownAssetDiscoveryWorker,
} from './asset-discovery.job';

// Security Scan Job Exports
export {
  securityScanQueue,
  securityScanWorker,
  setupSecurityScanSchedule,
  triggerSecurityScan,
  shutdownSecurityScanWorker,
} from './security-scan.job';
