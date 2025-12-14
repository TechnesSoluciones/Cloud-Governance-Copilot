/**
 * FinOps Controllers Index
 *
 * This file exports all FinOps controllers for easy importing throughout the application.
 * It provides a centralized location for controller exports.
 *
 * Available Controllers:
 * - CostsController: Handles cost data and anomaly endpoints
 * - RecommendationsController: Handles recommendation generation and management
 *
 * @module FinOps/Controllers
 */

// Export individual controllers
export { CostsController, costsController } from './costs.controller';
export { RecommendationsController, createRecommendationsController } from './recommendations.controller';
