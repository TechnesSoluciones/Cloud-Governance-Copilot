/**
 * FinOps Services Barrel Export
 *
 * This file exports all FinOps services for convenient importing.
 *
 * @module FinOps/Services
 */

export { CostCollectionService } from './cost-collection.service';
export type { CollectionResult } from './cost-collection.service';

export { AnomalyDetectionService } from './anomaly-detection.service';
export type { AnalysisResult, AnomalyFilters } from './anomaly-detection.service';

export { RecommendationGeneratorService } from './recommendation-generator.service';
export type { GenerationResult, RecommendationGeneratedEvent } from './recommendation-generator.service';
