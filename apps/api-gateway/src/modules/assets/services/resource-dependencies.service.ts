/**
 * Resource Dependencies Service
 *
 * Analyzes resource dependencies in Azure using Resource Graph queries.
 * Provides graph visualization data and impact analysis.
 *
 * Features:
 * - Dependency graph generation
 * - Circular dependency detection using DFS
 * - Impact analysis for resource changes
 * - Dependency metrics and anti-pattern detection
 * - Hub resource identification
 *
 * @module modules/assets/services/resource-dependencies.service
 */

import { AzureResourceGraphService } from '../../../integrations/azure/resource-graph.service';
import { DependencyQueryTemplates } from '../../../integrations/azure/dependency-queries';
import type { CloudProviderCredentials } from '../../../integrations/cloud-provider.interface';
import type {
  DependencyGraph,
  DependencyNode,
  DependencyEdge,
  CircularDependency,
  ImpactAnalysis,
  DependencyMetrics,
  AntiPattern,
  DFSState,
  NetworkDependency,
  ComputeDependency,
} from '../dto/dependency.dto';

/**
 * Resource Dependencies Service
 */
export class ResourceDependenciesService {
  private resourceGraphService: AzureResourceGraphService;

  constructor(credentials: CloudProviderCredentials) {
    this.resourceGraphService = new AzureResourceGraphService(credentials);
  }

  /**
   * Get resource dependencies (direct and indirect)
   *
   * @param accountId - Azure subscription ID
   * @param resourceId - Azure resource ID
   * @param depth - Maximum depth for traversal (1-3)
   * @returns Dependency graph
   */
  async getResourceDependencies(
    accountId: string,
    resourceId: string,
    depth: number = 2
  ): Promise<DependencyGraph> {
    console.log(`[ResourceDependenciesService] Getting dependencies for resource: ${resourceId}, depth: ${depth}`);

    const nodes = new Map<string, DependencyNode>();
    const edges: DependencyEdge[] = [];
    const visited = new Set<string>();

    // BFS traversal to build dependency graph
    await this.buildDependencyGraph(accountId, resourceId, depth, 0, nodes, edges, visited);

    // Detect circular dependencies
    const hasCircularDeps = this.detectCircularDependencies(nodes, edges).length > 0;

    // Calculate levels (depth from root)
    this.calculateNodeLevels(nodes, edges, resourceId);

    // Identify hub resources (> 5 connections)
    this.identifyHubResources(nodes, edges);

    const nodeArray = Array.from(nodes.values());
    const maxDepth = Math.max(...nodeArray.map(n => n.level), 0);

    return {
      nodes: nodeArray,
      edges,
      metadata: {
        totalNodes: nodeArray.length,
        totalEdges: edges.length,
        maxDepth,
        hasCircularDependencies: hasCircularDeps,
        computedAt: new Date(),
      },
    };
  }

  /**
   * Get complete dependency graph for a Resource Group
   *
   * @param accountId - Azure subscription ID
   * @param resourceGroupId - Resource Group ID or name
   * @returns Complete dependency graph
   */
  async getResourceGroupDependencyGraph(
    accountId: string,
    resourceGroupId: string
  ): Promise<DependencyGraph> {
    console.log(`[ResourceDependenciesService] Getting Resource Group dependency graph: ${resourceGroupId}`);

    // Extract resource group name from ID
    const resourceGroupName = this.extractResourceGroupName(resourceGroupId);

    // Get all resources in the resource group
    const query = DependencyQueryTemplates.RESOURCE_GROUP(resourceGroupName, accountId);
    const result = await this.resourceGraphService.query(query, [accountId]);

    const nodes = new Map<string, DependencyNode>();
    const edges: DependencyEdge[] = [];

    // Create nodes for all resources
    for (const row of result.rows) {
      const resourceId = row[0] as string;
      const name = row[1] as string;
      const type = row[2] as string;
      const location = row[3] as string;

      nodes.set(resourceId, {
        id: resourceId,
        resourceId,
        name,
        type,
        status: 'active',
        cost: 0, // Will be populated separately if needed
        level: 0,
        isHub: false,
        metadata: {
          location,
          resourceGroup: resourceGroupName,
        },
      });
    }

    // Get all dependency types
    await this.enrichWithAllDependencies(accountId, nodes, edges);

    // Detect circular dependencies
    const hasCircularDeps = this.detectCircularDependencies(nodes, edges).length > 0;

    // Calculate levels and identify hubs
    const rootNodes = this.findRootNodes(nodes, edges);
    if (rootNodes.length > 0) {
      this.calculateNodeLevels(nodes, edges, rootNodes[0].resourceId);
    }
    this.identifyHubResources(nodes, edges);

    const nodeArray = Array.from(nodes.values());
    const maxDepth = Math.max(...nodeArray.map(n => n.level), 0);

    return {
      nodes: nodeArray,
      edges,
      metadata: {
        totalNodes: nodeArray.length,
        totalEdges: edges.length,
        maxDepth,
        hasCircularDependencies: hasCircularDeps,
        computedAt: new Date(),
      },
    };
  }

  /**
   * Find circular dependencies using DFS
   *
   * @param accountId - Azure subscription ID
   * @returns List of circular dependencies
   */
  async findCircularDependencies(accountId: string): Promise<CircularDependency[]> {
    console.log(`[ResourceDependenciesService] Finding circular dependencies for account: ${accountId}`);

    // Get all resources with dependencies
    const query = DependencyQueryTemplates.ALL_RESOURCES(accountId);
    const result = await this.resourceGraphService.query(query, [accountId]);

    const nodes = new Map<string, DependencyNode>();
    const edges: DependencyEdge[] = [];

    // Build graph
    for (const row of result.rows) {
      const resourceId = row[0] as string;
      const name = row[1] as string;
      const type = row[2] as string;

      nodes.set(resourceId, {
        id: resourceId,
        resourceId,
        name,
        type,
        status: 'active',
        cost: 0,
        level: 0,
        isHub: false,
        metadata: {},
      });
    }

    // Enrich with dependencies
    await this.enrichWithAllDependencies(accountId, nodes, edges);

    // Detect cycles
    return this.detectCircularDependencies(nodes, edges);
  }

  /**
   * Perform impact analysis for deleting/modifying a resource
   *
   * @param accountId - Azure subscription ID
   * @param resourceId - Resource to analyze
   * @param action - delete or modify
   * @returns Impact analysis result
   */
  async getImpactAnalysis(
    accountId: string,
    resourceId: string,
    action: 'delete' | 'modify' = 'delete'
  ): Promise<ImpactAnalysis> {
    console.log(`[ResourceDependenciesService] Impact analysis for ${action} on: ${resourceId}`);

    // Get full dependency graph
    const graph = await this.getResourceDependencies(accountId, resourceId, 3);

    // Find the target resource node
    const targetNode = graph.nodes.find(n => n.resourceId === resourceId);
    if (!targetNode) {
      throw new Error(`Resource not found: ${resourceId}`);
    }

    // Reverse BFS to find resources that depend on this one
    const directImpact: DependencyNode[] = [];
    const indirectImpact: DependencyNode[] = [];

    for (const edge of graph.edges) {
      if (edge.target === resourceId) {
        const dependentNode = graph.nodes.find(n => n.resourceId === edge.source);
        if (dependentNode) {
          directImpact.push(dependentNode);
        }
      }
    }

    // Find indirect dependencies (dependencies of dependencies)
    const directIds = new Set(directImpact.map(n => n.resourceId));
    for (const directNode of directImpact) {
      for (const edge of graph.edges) {
        if (edge.target === directNode.resourceId && !directIds.has(edge.source)) {
          const indirectNode = graph.nodes.find(n => n.resourceId === edge.source);
          if (indirectNode && indirectNode.resourceId !== resourceId) {
            indirectImpact.push(indirectNode);
          }
        }
      }
    }

    // Calculate risk level
    const totalImpact = directImpact.length + indirectImpact.length;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';

    if (targetNode.isHub || totalImpact > 10) {
      riskLevel = 'critical';
    } else if (totalImpact > 5) {
      riskLevel = 'high';
    } else if (totalImpact > 2) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Identify affected services
    const servicesAffected = this.identifyAffectedServices(directImpact, indirectImpact);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      action,
      riskLevel,
      directImpact,
      indirectImpact,
      targetNode
    );

    return {
      resourceId,
      resourceName: targetNode.name,
      action,
      directImpact: {
        resources: directImpact,
        count: directImpact.length,
      },
      indirectImpact: {
        resources: indirectImpact,
        count: indirectImpact.length,
      },
      servicesAffected,
      riskLevel,
      recommendations,
    };
  }

  /**
   * Get dependency metrics for an account
   *
   * @param accountId - Azure subscription ID
   * @returns Dependency metrics
   */
  async getDependencyMetrics(accountId: string): Promise<DependencyMetrics> {
    console.log(`[ResourceDependenciesService] Getting dependency metrics for account: ${accountId}`);

    // Get all resources
    const query = DependencyQueryTemplates.ALL_RESOURCES(accountId);
    const result = await this.resourceGraphService.query(query, [accountId]);

    const nodes = new Map<string, DependencyNode>();
    const edges: DependencyEdge[] = [];

    // Build graph
    for (const row of result.rows) {
      const resourceId = row[0] as string;
      const name = row[1] as string;
      const type = row[2] as string;
      const hasDeps = row[6] as boolean;

      nodes.set(resourceId, {
        id: resourceId,
        resourceId,
        name,
        type,
        status: 'active',
        cost: 0,
        level: 0,
        isHub: false,
        metadata: { hasDependencies: hasDeps },
      });
    }

    // Enrich with dependencies
    await this.enrichWithAllDependencies(accountId, nodes, edges);

    // Calculate metrics
    const totalResources = nodes.size;
    const resourcesWithDependencies = edges.length > 0 ? new Set(edges.map(e => e.source)).size : 0;
    const resourcesWithoutDependencies = totalResources - resourcesWithDependencies;

    const averageDependenciesPerResource = totalResources > 0
      ? edges.length / totalResources
      : 0;

    // Find hub resources (> 5 connections)
    this.identifyHubResources(nodes, edges);
    const hubNodes = Array.from(nodes.values()).filter(n => n.isHub);

    const hubResources = hubNodes.map(node => ({
      resource: node,
      connectionCount: this.getConnectionCount(node.resourceId, edges),
    })).sort((a, b) => b.connectionCount - a.connectionCount);

    const maxDependenciesOnResource = Math.max(
      ...hubResources.map(h => h.connectionCount),
      0
    );

    // Find leaf resources (no dependencies)
    const leafResources = Array.from(nodes.values()).filter(node => {
      const hasOutgoing = edges.some(e => e.source === node.resourceId);
      return !hasOutgoing;
    });

    // Detect circular dependencies
    const circularDeps = this.detectCircularDependencies(nodes, edges);

    // Detect anti-patterns
    const antiPatterns = this.detectAntiPatterns(nodes, edges, circularDeps);

    // Dependency breakdown
    const byType: Record<string, number> = {};
    const byStrength: Record<string, number> = { weak: 0, strong: 0 };

    for (const edge of edges) {
      byType[edge.type] = (byType[edge.type] || 0) + 1;
      byStrength[edge.strength] = (byStrength[edge.strength] || 0) + 1;
    }

    return {
      totalResources,
      resourcesWithDependencies,
      resourcesWithoutDependencies,
      averageDependenciesPerResource,
      maxDependenciesOnResource,
      hubResources: hubResources.slice(0, 10), // Top 10
      leafResources,
      circularDependenciesCount: circularDeps.length,
      antiPatterns,
      dependencyBreakdown: {
        byType,
        byStrength,
      },
    };
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * Build dependency graph using BFS
   */
  private async buildDependencyGraph(
    accountId: string,
    resourceId: string,
    maxDepth: number,
    currentDepth: number,
    nodes: Map<string, DependencyNode>,
    edges: DependencyEdge[],
    visited: Set<string>
  ): Promise<void> {
    if (currentDepth >= maxDepth || visited.has(resourceId)) {
      return;
    }

    visited.add(resourceId);

    // Add current resource node if not exists
    if (!nodes.has(resourceId)) {
      const resourceName = this.extractResourceName(resourceId);
      const resourceType = this.extractResourceType(resourceId);

      nodes.set(resourceId, {
        id: resourceId,
        resourceId,
        name: resourceName,
        type: resourceType,
        status: 'active',
        cost: 0,
        level: currentDepth,
        isHub: false,
        metadata: {},
      });
    }

    // Get direct dependencies
    const dependencies = await this.getDirectDependencies(accountId, resourceId);

    for (const dep of dependencies) {
      // Add edge
      edges.push({
        source: resourceId,
        target: dep.target,
        type: dep.type,
        bidirectional: dep.bidirectional,
        strength: dep.strength,
      });

      // Recursively process dependencies
      await this.buildDependencyGraph(
        accountId,
        dep.target,
        maxDepth,
        currentDepth + 1,
        nodes,
        edges,
        visited
      );
    }
  }

  /**
   * Get direct dependencies for a resource
   */
  private async getDirectDependencies(
    accountId: string,
    resourceId: string
  ): Promise<DependencyEdge[]> {
    const edges: DependencyEdge[] = [];

    try {
      // Query ARM template dependencies
      const query = DependencyQueryTemplates.DIRECT(resourceId);
      const result = await this.resourceGraphService.query(query, [accountId]);

      for (const row of result.rows) {
        const dependsOn = row[3] as string;
        if (dependsOn) {
          edges.push({
            source: resourceId,
            target: dependsOn,
            type: 'depends_on',
            bidirectional: false,
            strength: 'strong',
          });
        }
      }
    } catch (error) {
      console.warn(`[ResourceDependenciesService] Failed to get direct dependencies: ${error}`);
    }

    return edges;
  }

  /**
   * Enrich graph with all dependency types (network, compute, storage, etc.)
   */
  private async enrichWithAllDependencies(
    accountId: string,
    nodes: Map<string, DependencyNode>,
    edges: DependencyEdge[]
  ): Promise<void> {
    // VNet Peering
    await this.addVNetPeeringDependencies(accountId, nodes, edges);

    // Load Balancer
    await this.addLoadBalancerDependencies(accountId, nodes, edges);

    // Disk attachments
    await this.addDiskDependencies(accountId, nodes, edges);

    // NSG associations
    await this.addNSGDependencies(accountId, nodes, edges);

    // Private Endpoints
    await this.addPrivateEndpointDependencies(accountId, nodes, edges);
  }

  /**
   * Add VNet peering dependencies
   */
  private async addVNetPeeringDependencies(
    accountId: string,
    nodes: Map<string, DependencyNode>,
    edges: DependencyEdge[]
  ): Promise<void> {
    try {
      const query = DependencyQueryTemplates.VNET_PEERING(accountId);
      const result = await this.resourceGraphService.query(query, [accountId]);

      for (const row of result.rows) {
        const sourceId = row[0] as string;
        const targetId = row[2] as string;
        const state = row[3] as string;

        if (state === 'Connected' && nodes.has(sourceId)) {
          edges.push({
            source: sourceId,
            target: targetId,
            type: 'network',
            bidirectional: true,
            strength: 'strong',
          });
        }
      }
    } catch (error) {
      console.warn(`[ResourceDependenciesService] Failed to get VNet peering: ${error}`);
    }
  }

  /**
   * Add Load Balancer dependencies
   */
  private async addLoadBalancerDependencies(
    accountId: string,
    nodes: Map<string, DependencyNode>,
    edges: DependencyEdge[]
  ): Promise<void> {
    try {
      const query = DependencyQueryTemplates.LOAD_BALANCER(accountId);
      const result = await this.resourceGraphService.query(query, [accountId]);

      for (const row of result.rows) {
        const lbId = row[0] as string;
        const backendId = row[3] as string;

        if (nodes.has(lbId) && backendId) {
          edges.push({
            source: lbId,
            target: backendId,
            type: 'network',
            bidirectional: false,
            strength: 'strong',
          });
        }
      }
    } catch (error) {
      console.warn(`[ResourceDependenciesService] Failed to get LB dependencies: ${error}`);
    }
  }

  /**
   * Add disk attachment dependencies
   */
  private async addDiskDependencies(
    accountId: string,
    nodes: Map<string, DependencyNode>,
    edges: DependencyEdge[]
  ): Promise<void> {
    try {
      const query = DependencyQueryTemplates.DISK(accountId);
      const result = await this.resourceGraphService.query(query, [accountId]);

      for (const row of result.rows) {
        const diskId = row[0] as string;
        const vmId = row[2] as string;

        if (nodes.has(diskId) && vmId) {
          edges.push({
            source: vmId,
            target: diskId,
            type: 'storage',
            bidirectional: false,
            strength: 'strong',
          });
        }
      }
    } catch (error) {
      console.warn(`[ResourceDependenciesService] Failed to get disk dependencies: ${error}`);
    }
  }

  /**
   * Add NSG dependencies
   */
  private async addNSGDependencies(
    accountId: string,
    nodes: Map<string, DependencyNode>,
    edges: DependencyEdge[]
  ): Promise<void> {
    try {
      const query = DependencyQueryTemplates.NSG(accountId);
      const result = await this.resourceGraphService.query(query, [accountId]);

      for (const row of result.rows) {
        const nicId = row[0] as string;
        const nsgId = row[2] as string;

        if (nodes.has(nicId) && nsgId) {
          edges.push({
            source: nicId,
            target: nsgId,
            type: 'security',
            bidirectional: false,
            strength: 'strong',
          });
        }
      }
    } catch (error) {
      console.warn(`[ResourceDependenciesService] Failed to get NSG dependencies: ${error}`);
    }
  }

  /**
   * Add Private Endpoint dependencies
   */
  private async addPrivateEndpointDependencies(
    accountId: string,
    nodes: Map<string, DependencyNode>,
    edges: DependencyEdge[]
  ): Promise<void> {
    try {
      const query = DependencyQueryTemplates.PRIVATE_ENDPOINT(accountId);
      const result = await this.resourceGraphService.query(query, [accountId]);

      for (const row of result.rows) {
        const peId = row[0] as string;
        const targetId = row[2] as string;

        if (nodes.has(peId) && targetId) {
          edges.push({
            source: peId,
            target: targetId,
            type: 'network',
            bidirectional: false,
            strength: 'strong',
          });
        }
      }
    } catch (error) {
      console.warn(`[ResourceDependenciesService] Failed to get private endpoint dependencies: ${error}`);
    }
  }

  /**
   * Detect circular dependencies using DFS with colors
   */
  private detectCircularDependencies(
    nodes: Map<string, DependencyNode>,
    edges: DependencyEdge[]
  ): CircularDependency[] {
    const state: DFSState = {
      color: new Map(),
      parent: new Map(),
      cycles: [],
    };

    // Initialize all nodes as white (unvisited)
    for (const [nodeId] of nodes) {
      state.color.set(nodeId, 'white');
      state.parent.set(nodeId, null);
    }

    // Build adjacency list
    const adjList = new Map<string, string[]>();
    for (const edge of edges) {
      if (!adjList.has(edge.source)) {
        adjList.set(edge.source, []);
      }
      adjList.get(edge.source)!.push(edge.target);
    }

    // Run DFS from each unvisited node
    for (const [nodeId] of nodes) {
      if (state.color.get(nodeId) === 'white') {
        this.dfsVisit(nodeId, adjList, state, nodes);
      }
    }

    // Convert cycles to CircularDependency objects
    return state.cycles.map(cycle => ({
      cycle,
      severity: 'warning',
      description: `Circular dependency detected: ${cycle.length} resources involved`,
      resourceNames: cycle.map(id => nodes.get(id)?.name || id),
    }));
  }

  /**
   * DFS visit for cycle detection
   */
  private dfsVisit(
    nodeId: string,
    adjList: Map<string, string[]>,
    state: DFSState,
    nodes: Map<string, DependencyNode>
  ): void {
    state.color.set(nodeId, 'gray'); // Mark as being processed

    const neighbors = adjList.get(nodeId) || [];

    for (const neighborId of neighbors) {
      if (!nodes.has(neighborId)) continue;

      const neighborColor = state.color.get(neighborId);

      if (neighborColor === 'white') {
        state.parent.set(neighborId, nodeId);
        this.dfsVisit(neighborId, adjList, state, nodes);
      } else if (neighborColor === 'gray') {
        // Back edge found - cycle detected
        const cycle = this.extractCycle(nodeId, neighborId, state.parent);
        state.cycles.push(cycle);
      }
    }

    state.color.set(nodeId, 'black'); // Mark as fully processed
  }

  /**
   * Extract cycle path from parent map
   */
  private extractCycle(start: string, end: string, parent: Map<string, string | null>): string[] {
    const cycle: string[] = [end];
    let current: string | null = start;

    while (current !== end && current !== null) {
      cycle.unshift(current);
      current = parent.get(current) || null;

      // Safety check to prevent infinite loops
      if (cycle.length > 100) break;
    }

    cycle.push(end); // Close the cycle
    return cycle;
  }

  /**
   * Calculate node levels (depth from root)
   */
  private calculateNodeLevels(
    nodes: Map<string, DependencyNode>,
    edges: DependencyEdge[],
    rootId: string
  ): void {
    const queue: Array<{ id: string; level: number }> = [{ id: rootId, level: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;

      if (visited.has(id)) continue;
      visited.add(id);

      const node = nodes.get(id);
      if (node) {
        node.level = level;
      }

      // Add children to queue
      for (const edge of edges) {
        if (edge.source === id && !visited.has(edge.target)) {
          queue.push({ id: edge.target, level: level + 1 });
        }
      }
    }
  }

  /**
   * Identify hub resources (> 5 connections)
   */
  private identifyHubResources(
    nodes: Map<string, DependencyNode>,
    edges: DependencyEdge[]
  ): void {
    for (const [nodeId, node] of nodes) {
      const connectionCount = this.getConnectionCount(nodeId, edges);
      node.isHub = connectionCount > 5;
    }
  }

  /**
   * Get total connection count for a node
   */
  private getConnectionCount(nodeId: string, edges: DependencyEdge[]): number {
    let count = 0;

    for (const edge of edges) {
      if (edge.source === nodeId || edge.target === nodeId) {
        count++;
      }
    }

    return count;
  }

  /**
   * Find root nodes (no incoming edges)
   */
  private findRootNodes(
    nodes: Map<string, DependencyNode>,
    edges: DependencyEdge[]
  ): DependencyNode[] {
    const nodesWithIncoming = new Set(edges.map(e => e.target));
    return Array.from(nodes.values()).filter(node => !nodesWithIncoming.has(node.resourceId));
  }

  /**
   * Identify affected services from impact
   */
  private identifyAffectedServices(
    directImpact: DependencyNode[],
    indirectImpact: DependencyNode[]
  ): string[] {
    const services = new Set<string>();

    for (const node of [...directImpact, ...indirectImpact]) {
      const serviceType = node.type.split('/')[0]; // e.g., microsoft.compute
      services.add(serviceType);
    }

    return Array.from(services);
  }

  /**
   * Generate recommendations for impact analysis
   */
  private generateRecommendations(
    action: 'delete' | 'modify',
    riskLevel: string,
    directImpact: DependencyNode[],
    indirectImpact: DependencyNode[],
    targetNode: DependencyNode
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push('Schedule maintenance window - high impact expected');
      recommendations.push('Create backups of all dependent resources');
      recommendations.push('Notify stakeholders of planned changes');
    }

    if (directImpact.length > 0) {
      recommendations.push(`Update ${directImpact.length} directly dependent resources before ${action}`);
    }

    if (targetNode.isHub) {
      recommendations.push('This is a hub resource - consider redesigning dependencies');
    }

    if (action === 'delete') {
      recommendations.push('Consider soft delete or disable instead of permanent deletion');
      recommendations.push('Export resource configuration for potential recreation');
    }

    if (indirectImpact.length > 5) {
      recommendations.push('Perform staged rollout to minimize blast radius');
    }

    return recommendations;
  }

  /**
   * Detect anti-patterns in dependencies
   */
  private detectAntiPatterns(
    nodes: Map<string, DependencyNode>,
    edges: DependencyEdge[],
    circularDeps: CircularDependency[]
  ): AntiPattern[] {
    const antiPatterns: AntiPattern[] = [];

    // Circular dependencies
    if (circularDeps.length > 0) {
      antiPatterns.push({
        type: 'circular_dependency',
        severity: 'high',
        description: `Found ${circularDeps.length} circular dependencies`,
        affectedResources: circularDeps.flatMap(c => c.cycle),
        recommendation: 'Refactor architecture to remove circular dependencies',
      });
    }

    // God resources (> 10 connections)
    const godResources = Array.from(nodes.values()).filter(node => {
      const count = this.getConnectionCount(node.resourceId, edges);
      return count > 10;
    });

    if (godResources.length > 0) {
      antiPatterns.push({
        type: 'god_resource',
        severity: 'medium',
        description: `Found ${godResources.length} resources with > 10 dependencies`,
        affectedResources: godResources.map(r => r.resourceId),
        recommendation: 'Consider splitting responsibilities across multiple resources',
      });
    }

    return antiPatterns;
  }

  /**
   * Extract resource group name from ID
   */
  private extractResourceGroupName(resourceGroupId: string): string {
    const match = resourceGroupId.match(/resourceGroups\/([^/]+)/i);
    return match ? match[1] : resourceGroupId;
  }

  /**
   * Extract resource name from ID
   */
  private extractResourceName(resourceId: string): string {
    const parts = resourceId.split('/');
    return parts[parts.length - 1] || resourceId;
  }

  /**
   * Extract resource type from ID
   */
  private extractResourceType(resourceId: string): string {
    const match = resourceId.match(/providers\/([^/]+\/[^/]+)/i);
    return match ? match[1].toLowerCase() : 'unknown';
  }
}
