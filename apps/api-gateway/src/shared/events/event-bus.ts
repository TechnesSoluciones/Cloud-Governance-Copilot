import { EventEmitter } from 'events';

// ============================================================
// Event Types
// ============================================================

/**
 * Cost Anomaly Detected Event
 * Emitted when FinOps module detects unusual spending patterns
 */
export interface CostAnomalyDetectedEvent {
  tenantId: string;
  anomalyId: string;
  assetId?: string;
  provider: 'aws' | 'azure' | 'gcp';
  severity: 'low' | 'medium' | 'high' | 'critical';
  expectedCost: number;
  actualCost: number;
  service: string;
  date: Date;
  metadata?: Record<string, any>;
}

/**
 * Cost Recommendation Generated Event
 * Emitted when FinOps module generates a cost optimization recommendation
 */
export interface RecommendationGeneratedEvent {
  tenantId: string;
  recommendationId: string;
  type: string;
  estimatedSavings: number;
  priority: string;
  provider: string;
  service: string;
  resourceId: string;
}

/**
 * Asset Discovered Event
 * Emitted when Assets module discovers a new cloud resource
 */
export interface AssetDiscoveredEvent {
  tenantId: string;
  assetId: string;
  provider: 'aws' | 'azure' | 'gcp';
  resourceType: string;
  resourceId: string;
  region: string;
  metadata?: Record<string, any>;
}

/**
 * Security Finding Created Event
 * Emitted when Security module detects a misconfiguration
 */
export interface SecurityFindingCreatedEvent {
  tenantId: string;
  findingId: string;
  assetId?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  title: string;
  description: string;
  category: string;
  metadata?: Record<string, any>;
}

/**
 * Incident Created Event
 * Emitted when Incidents module creates a new incident
 */
export interface IncidentCreatedEvent {
  tenantId: string;
  incidentId: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  assignedTo?: string;
  metadata?: Record<string, any>;
}

// ============================================================
// Application Event Bus
// ============================================================

/**
 * Centralized Event Bus for cross-module communication
 *
 * Architecture Pattern:
 * - Modules emit events when important actions occur
 * - Other modules subscribe to events they care about
 * - Enables loose coupling between modules
 * - Example: FinOps emits CostAnomalyDetected → Incidents creates incident
 *
 * Usage:
 * ```typescript
 * // Emit an event
 * eventBus.emitCostAnomalyDetected({
 *   tenantId: 'tenant-123',
 *   anomalyId: 'anomaly-456',
 *   provider: 'aws',
 *   severity: 'high',
 *   expectedCost: 100,
 *   actualCost: 500,
 *   service: 'ec2',
 *   date: new Date()
 * });
 *
 * // Subscribe to events
 * eventBus.onCostAnomalyDetected((data) => {
 *   console.log('Anomaly detected:', data);
 *   // Create incident, send alert, etc.
 * });
 * ```
 */
class AppEventBus extends EventEmitter {
  constructor() {
    super();
    // Increase max listeners to prevent warnings
    this.setMaxListeners(100);
  }

  // ============================================================
  // Cost Anomaly Events
  // ============================================================

  /**
   * Emit when a cost anomaly is detected
   */
  emitCostAnomalyDetected(data: CostAnomalyDetectedEvent): void {
    this.emit('cost.anomaly.detected', data);
  }

  /**
   * Subscribe to cost anomaly detection events
   */
  onCostAnomalyDetected(handler: (data: CostAnomalyDetectedEvent) => void | Promise<void>): void {
    this.on('cost.anomaly.detected', handler);
  }

  // ============================================================
  // Cost Recommendation Events
  // ============================================================

  /**
   * Emit when a cost recommendation is generated
   */
  emitRecommendationGenerated(data: RecommendationGeneratedEvent): void {
    this.emit('recommendation.generated', data);
  }

  /**
   * Subscribe to recommendation generation events
   */
  onRecommendationGenerated(handler: (data: RecommendationGeneratedEvent) => void | Promise<void>): void {
    this.on('recommendation.generated', handler);
  }

  // ============================================================
  // Asset Discovery Events
  // ============================================================

  /**
   * Emit when a new asset is discovered
   */
  emitAssetDiscovered(data: AssetDiscoveredEvent): void {
    this.emit('asset.discovered', data);
  }

  /**
   * Subscribe to asset discovery events
   */
  onAssetDiscovered(handler: (data: AssetDiscoveredEvent) => void | Promise<void>): void {
    this.on('asset.discovered', handler);
  }

  // ============================================================
  // Security Finding Events
  // ============================================================

  /**
   * Emit when a security finding is created
   */
  emitSecurityFindingCreated(data: SecurityFindingCreatedEvent): void {
    this.emit('security.finding.created', data);
  }

  /**
   * Subscribe to security finding creation events
   */
  onSecurityFindingCreated(handler: (data: SecurityFindingCreatedEvent) => void | Promise<void>): void {
    this.on('security.finding.created', handler);
  }

  // ============================================================
  // Incident Events
  // ============================================================

  /**
   * Emit when an incident is created
   */
  emitIncidentCreated(data: IncidentCreatedEvent): void {
    this.emit('incident.created', data);
  }

  /**
   * Subscribe to incident creation events
   */
  onIncidentCreated(handler: (data: IncidentCreatedEvent) => void | Promise<void>): void {
    this.on('incident.created', handler);
  }

  // ============================================================
  // Utility Methods
  // ============================================================

  /**
   * Get count of listeners for a specific event
   */
  getListenerCount(eventName: string): number {
    return this.listenerCount(eventName);
  }

  /**
   * Remove all listeners for a specific event
   */
  clearListeners(eventName: string): void {
    this.removeAllListeners(eventName);
  }

  /**
   * Remove all listeners for all events
   */
  clearAllListeners(): void {
    this.removeAllListeners();
  }
}

// ============================================================
// Singleton Instance
// ============================================================

/**
 * Global Event Bus instance
 * Import this in any module that needs to emit or subscribe to events
 */
export const eventBus = new AppEventBus();
