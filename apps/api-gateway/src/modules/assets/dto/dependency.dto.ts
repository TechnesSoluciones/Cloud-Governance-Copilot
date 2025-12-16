/**
 * Resource Dependencies DTOs
 *
 * Data Transfer Objects for resource dependency analysis and graph visualization.
 */

/**
 * Node in the dependency graph representing a resource
 */
export interface DependencyNode {
  id: string;                    // Unique identifier for the node
  resourceId: string;            // Azure resource ID
  name: string;                  // Resource name
  type: string;                  // Resource type (e.g., microsoft.compute/virtualmachines)
  status: string;                // Resource status (running, stopped, etc.)
  cost: number;                  // Monthly cost in USD
  level: number;                 // Depth in the graph (0 = no dependencies)
  isHub: boolean;                // True if resource has > 5 connections
  metadata: Record<string, any>; // Additional resource metadata
}

/**
 * Edge in the dependency graph representing a relationship
 */
export interface DependencyEdge {
  source: string;                // Source resource ID
  target: string;                // Target resource ID
  type: 'depends_on' | 'network' | 'storage' | 'compute' | 'security';
  bidirectional: boolean;        // True for mutual dependencies (e.g., VNet peering)
  strength: 'weak' | 'strong';   // Criticality of the dependency
  metadata?: Record<string, any>;
}

/**
 * Complete dependency graph with nodes and edges
 */
export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    maxDepth: number;
    hasCircularDependencies: boolean;
    computedAt: Date;
  };
}

/**
 * Circular dependency detection result
 */
export interface CircularDependency {
  cycle: string[];               // Array of resourceIds forming the cycle
  severity: 'warning' | 'error';
  description: string;
  resourceNames: string[];       // Human-readable names
}

/**
 * Impact analysis when deleting/modifying a resource
 */
export interface ImpactAnalysis {
  resourceId: string;
  resourceName: string;
  action: 'delete' | 'modify';
  directImpact: {
    resources: DependencyNode[];
    count: number;
  };
  indirectImpact: {
    resources: DependencyNode[];
    count: number;
  };
  servicesAffected: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedDowntime?: string;
  affectedUsers?: number;
  recommendations: string[];
}

/**
 * Dependency metrics for an account
 */
export interface DependencyMetrics {
  totalResources: number;
  resourcesWithDependencies: number;
  resourcesWithoutDependencies: number;
  averageDependenciesPerResource: number;
  maxDependenciesOnResource: number;
  hubResources: Array<{
    resource: DependencyNode;
    connectionCount: number;
  }>;
  leafResources: DependencyNode[];
  circularDependenciesCount: number;
  antiPatterns: AntiPattern[];
  dependencyBreakdown: {
    byType: Record<string, number>;
    byStrength: Record<string, number>;
  };
}

/**
 * Anti-pattern detected in dependencies
 */
export interface AntiPattern {
  type: 'circular_dependency' | 'god_resource' | 'tight_coupling' | 'missing_boundary';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedResources: string[];
  recommendation: string;
}

/**
 * Query parameters for getting resource dependencies
 */
export interface GetDependenciesQueryDto {
  depth?: number;                // 1-3, default: 2
  includeIndirect?: boolean;     // default: true
  types?: string[];              // Filter by resource types
}

/**
 * Query parameters for dependency graph
 */
export interface GetDependencyGraphQueryDto {
  groupBy?: 'type' | 'layer' | 'location'; // default: 'type'
  layout?: 'hierarchical' | 'force' | 'circular'; // default: 'hierarchical'
  includeMetrics?: boolean;      // default: true
}

/**
 * Request body for impact analysis
 */
export interface ImpactAnalysisRequestDto {
  accountId: string;
  resourceId: string;
  action: 'delete' | 'modify';
  scope?: 'direct' | 'full';     // default: 'full'
}

/**
 * Query parameters for circular dependencies
 */
export interface CircularDependenciesQueryDto {
  accountId: string;
  resourceGroupId?: string;
  severity?: 'warning' | 'error';
}

/**
 * Query parameters for dependency metrics
 */
export interface DependencyMetricsQueryDto {
  accountId: string;
  resourceGroupId?: string;
  includeAntiPatterns?: boolean; // default: true
}

/**
 * Response wrapper for all dependency endpoints
 */
export interface DependencyResponse<T> {
  success: boolean;
  data: T;
  metadata?: {
    queryTime: number;           // Time taken in ms
    cached: boolean;
    cacheExpiry?: Date;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Dependency cache entry
 */
export interface DependencyCacheEntry {
  id: string;
  tenantId: string;
  accountId: string;
  resourceId?: string;
  resourceGroupId?: string;
  graphType: 'resource' | 'resource_group' | 'account';
  graphData: DependencyGraph | ImpactAnalysis | DependencyMetrics;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Internal structure for DFS cycle detection
 */
export interface DFSState {
  color: Map<string, 'white' | 'gray' | 'black'>;
  parent: Map<string, string | null>;
  cycles: string[][];
}

/**
 * Network dependency details
 */
export interface NetworkDependency {
  sourceResourceId: string;
  targetResourceId: string;
  connectionType: 'vnet_peering' | 'nsg_rule' | 'private_endpoint' | 'service_endpoint';
  state: string;
  bidirectional: boolean;
}

/**
 * Compute dependency details
 */
export interface ComputeDependency {
  vmId: string;
  diskId?: string;
  nicId?: string;
  nsgId?: string;
  vnetId?: string;
  loadBalancerId?: string;
}

/**
 * Storage dependency details
 */
export interface StorageDependency {
  storageAccountId: string;
  dependentResources: string[];
  accessType: 'blob' | 'file' | 'queue' | 'table';
}

/**
 * Dependency path between two resources
 */
export interface DependencyPath {
  from: string;
  to: string;
  path: string[];
  pathLength: number;
  edgeTypes: string[];
}
