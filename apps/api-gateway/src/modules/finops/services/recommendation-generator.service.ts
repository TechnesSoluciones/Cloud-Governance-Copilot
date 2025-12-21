/**
 * FinOps Recommendation Generator Service
 *
 * This service analyzes cloud cost data to generate actionable cost optimization recommendations.
 * It examines spending patterns across AWS and Azure to identify opportunities for savings.
 *
 * Workflow:
 * 1. Retrieve cloud accounts for the tenant
 * 2. For each account, analyze cost data from the last 30 days
 * 3. Run provider-specific detection algorithms
 * 4. Calculate estimated savings and priority
 * 5. Deduplicate recommendations (avoid creating duplicates)
 * 6. Save recommendations to database
 * 7. Emit events for downstream processing
 *
 * Recommendation Types:
 * - IDLE_RESOURCE: Resources with consistently low utilization (<5% expected cost, 25+ days)
 * - RIGHTSIZE: Instances that can be downsized (consistent low usage)
 * - UNUSED_RESOURCE: Unattached volumes, unused elastic IPs
 * - DELETE_SNAPSHOT: Snapshots older than 90 days
 * - RESERVED_INSTANCE: Predictable 24/7 workloads suitable for RI pricing
 *
 * Architecture Patterns:
 * - Strategy Pattern: Provider-specific analyzers
 * - Template Method: Standardized recommendation generation flow
 * - Event-Driven: Emits events for generated recommendations
 * - Statistical Analysis: Pattern detection in historical cost data
 * - Deduplication: Prevents duplicate recommendations
 *
 * @module FinOps/RecommendationGenerator
 */

import { PrismaClient, CloudAccount, CostRecommendation } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { EventEmitter } from 'events';

// ============================================================
// Types and Interfaces
// ============================================================

/**
 * Result of a recommendation generation operation
 */
export interface GenerationResult {
  /** Indicates if the generation was successful */
  success: boolean;

  /** Total number of recommendations generated */
  recommendationsGenerated: number;

  /** Breakdown by recommendation type */
  breakdown: {
    idle_resource: number;
    rightsize: number;
    unused_resource: number;
    delete_snapshot: number;
    reserved_instance: number;
  };

  /** Total estimated monthly savings across all recommendations */
  totalEstimatedSavings: number;

  /** Total execution time in milliseconds */
  executionTimeMs: number;

  /** Error messages if any occurred */
  errors?: string[];
}

/**
 * Internal recommendation data structure before database persistence
 */
interface Recommendation {
  tenantId: string;
  type: 'idle_resource' | 'rightsize' | 'unused_resource' | 'delete_snapshot' | 'reserved_instance';
  priority: 'high' | 'medium' | 'low';
  provider: 'AWS' | 'AZURE';
  service: string;
  resourceId: string;
  title: string;
  description: string;
  estimatedSavings: number;
  savingsPeriod: 'monthly' | 'yearly';
  status: 'open';
  actionable: boolean;
  actionScript?: string;
  metadata?: Record<string, any>;
}

/**
 * Resource cost statistics for analysis
 */
interface ResourceStats {
  resourceId: string;
  service: string;
  provider: string;
  totalCost: number;
  days: number;
  avgDailyCost: number;
  metadata?: Record<string, any>;
}

/**
 * Service-level cost statistics
 */
interface ServiceStats {
  service: string;
  provider: string;
  totalCost: number;
  days: number;
  avgDailyCost: number;
  resourceCount: number;
}

/**
 * Event emitted when a recommendation is generated
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

// ============================================================
// Recommendation Generator Service
// ============================================================

/**
 * Service for generating cost optimization recommendations
 *
 * @example
 * ```typescript
 * const prisma = new PrismaClient();
 * const service = new RecommendationGeneratorService(prisma, eventBus);
 *
 * // Generate recommendations for a tenant
 * const result = await service.generateRecommendations('tenant-id-123');
 *
 * console.log(`Generated ${result.recommendationsGenerated} recommendations`);
 * console.log(`Total estimated savings: $${result.totalEstimatedSavings}/month`);
 * ```
 */
export class RecommendationGeneratorService {
  /** Analysis window for cost patterns (days) */
  private static readonly ANALYSIS_WINDOW_DAYS = 30;

  /** Threshold for idle resource detection (percent of expected cost) */
  private static readonly IDLE_THRESHOLD_PERCENT = 0.05;

  /** Minimum days of data required for idle detection */
  private static readonly IDLE_MIN_DAYS = 25;

  /** Age threshold for snapshot deletion recommendations (days) */
  private static readonly SNAPSHOT_AGE_THRESHOLD_DAYS = 90;

  /** Minimum days of consistent usage for RI recommendations */
  private static readonly RI_MIN_CONSISTENT_DAYS = 28;

  /** Reserved Instance typical savings percentage */
  private static readonly RI_SAVINGS_PERCENT = 0.35;

  /** AWS pricing estimates ($/GB-month for storage) */
  private static readonly AWS_EBS_GP3_PRICE = 0.08;
  private static readonly AWS_SNAPSHOT_PRICE = 0.05;

  /** Azure pricing estimates ($/GB-month for storage) */
  private static readonly AZURE_DISK_PRICE = 0.10;
  private static readonly AZURE_SNAPSHOT_PRICE = 0.05;

  /** Instance type pricing map (simplified - hourly rates in USD) */
  private static readonly INSTANCE_PRICING: { [key: string]: number } = {
    // AWS EC2 pricing (us-east-1)
    't3.nano': 0.0052,
    't3.micro': 0.0104,
    't3.small': 0.0208,
    't3.medium': 0.0416,
    't3.large': 0.0832,
    't3.xlarge': 0.1664,
    't3.2xlarge': 0.3328,
    'm5.large': 0.096,
    'm5.xlarge': 0.192,
    'm5.2xlarge': 0.384,
    'm5.4xlarge': 0.768,
    // Azure VM pricing (East US)
    'Standard_B1s': 0.0104,
    'Standard_B2s': 0.0416,
    'Standard_B2ms': 0.0832,
    'Standard_D2s_v3': 0.096,
    'Standard_D4s_v3': 0.192,
    'Standard_D8s_v3': 0.384,
  };

  constructor(
    private prisma: PrismaClient,
    private eventBus: EventEmitter
  ) {}

  // ============================================================
  // Main Entry Point
  // ============================================================

  /**
   * Generate cost optimization recommendations for a tenant
   *
   * This method orchestrates the entire recommendation generation workflow:
   * - Retrieves cloud accounts for the tenant
   * - Analyzes each account using provider-specific strategies
   * - Calculates savings and priority for each recommendation
   * - Deduplicates recommendations to avoid duplicates
   * - Saves recommendations to database
   * - Emits events for downstream processing
   *
   * @param tenantId - UUID of the tenant to analyze
   * @param cloudAccountId - Optional specific cloud account to analyze
   * @returns Generation result with statistics
   */
  async generateRecommendations(
    tenantId: string,
    cloudAccountId?: string
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const breakdown = {
      idle_resource: 0,
      rightsize: 0,
      unused_resource: 0,
      delete_snapshot: 0,
      reserved_instance: 0,
    };

    try {
      console.log(`[RecommendationGenerator] Starting recommendation generation for tenant: ${tenantId}`);

      // Retrieve cloud accounts to analyze
      const accounts = await this.getCloudAccounts(tenantId, cloudAccountId);

      if (accounts.length === 0) {
        console.log(`[RecommendationGenerator] No cloud accounts found for tenant: ${tenantId}`);
        return {
          success: true,
          recommendationsGenerated: 0,
          breakdown,
          totalEstimatedSavings: 0,
          executionTimeMs: Date.now() - startTime,
        };
      }

      console.log(`[RecommendationGenerator] Analyzing ${accounts.length} cloud account(s)`);

      // Analyze each cloud account
      let allRecommendations: Recommendation[] = [];

      for (const account of accounts) {
        try {
          console.log(`[RecommendationGenerator] Analyzing account: ${account.accountName} (${account.provider})`);

          let recommendations: Recommendation[] = [];

          // Use provider-specific analyzer
          if (account.provider === 'aws') {
            recommendations = await this.analyzeAWSAccount(account);
          } else if (account.provider === 'azure') {
            recommendations = await this.analyzeAzureAccount(account);
          } else {
            console.warn(`[RecommendationGenerator] Unsupported provider: ${account.provider}`);
            continue;
          }

          console.log(`[RecommendationGenerator] Found ${recommendations.length} recommendations for ${account.accountName}`);
          allRecommendations = allRecommendations.concat(recommendations);

        } catch (error) {
          const errorMsg = `Failed to analyze account ${account.accountName}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`[RecommendationGenerator] ${errorMsg}`);
          errors.push(errorMsg);
          // Continue processing other accounts
        }
      }

      // Deduplicate and save recommendations
      const savedCount = await this.deduplicateAndSaveRecommendations(tenantId, allRecommendations);

      // Calculate breakdown by type
      for (const rec of allRecommendations) {
        breakdown[rec.type]++;
      }

      // Calculate total estimated savings
      const totalEstimatedSavings = allRecommendations.reduce(
        (sum, rec) => sum + rec.estimatedSavings,
        0
      );

      const executionTimeMs = Date.now() - startTime;

      console.log(`[RecommendationGenerator] Generation complete: ${savedCount} recommendations, $${totalEstimatedSavings.toFixed(2)} estimated monthly savings, ${executionTimeMs}ms`);

      return {
        success: true,
        recommendationsGenerated: savedCount,
        breakdown,
        totalEstimatedSavings,
        executionTimeMs,
        errors: errors.length > 0 ? errors : undefined,
      };

    } catch (error) {
      const errorMsg = `Recommendation generation failed: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`[RecommendationGenerator] ${errorMsg}`);
      errors.push(errorMsg);

      return {
        success: false,
        recommendationsGenerated: 0,
        breakdown,
        totalEstimatedSavings: 0,
        executionTimeMs: Date.now() - startTime,
        errors,
      };
    }
  }

  // ============================================================
  // Cloud Account Retrieval
  // ============================================================

  /**
   * Retrieve cloud accounts for analysis
   */
  private async getCloudAccounts(
    tenantId: string,
    cloudAccountId?: string
  ): Promise<CloudAccount[]> {
    const where: any = {
      tenantId,
      status: 'active',
    };

    if (cloudAccountId) {
      where.id = cloudAccountId;
    }

    return this.prisma.cloudAccount.findMany({
      where,
    });
  }

  // ============================================================
  // Provider-Specific Analyzers
  // ============================================================

  /**
   * Analyze AWS cloud account for cost optimization opportunities
   */
  private async analyzeAWSAccount(account: CloudAccount): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Get cost data for the last 30 days
      const costData = await this.getAccountCostData(account.id, account.tenantId);

      // Run all AWS-specific detection algorithms
      const [idle, unused, snapshots, rightsize, reservedInstance] = await Promise.all([
        this.detectAWSIdleEC2(account, costData),
        this.detectAWSUnusedEBS(account, costData),
        this.detectAWSOldSnapshots(account, costData),
        this.detectAWSRightsizing(account, costData),
        this.detectAWSReservedInstanceOpportunities(account, costData),
      ]);

      recommendations.push(...idle, ...unused, ...snapshots, ...rightsize, ...reservedInstance);

    } catch (error) {
      console.error(`[RecommendationGenerator] Error analyzing AWS account ${account.accountName}:`, error);
      throw error;
    }

    return recommendations;
  }

  /**
   * Analyze Azure cloud account for cost optimization opportunities
   */
  private async analyzeAzureAccount(account: CloudAccount): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Get cost data for the last 30 days
      const costData = await this.getAccountCostData(account.id, account.tenantId);

      // Run all Azure-specific detection algorithms
      const [idle, unused, snapshots, rightsize] = await Promise.all([
        this.detectAzureIdleVMs(account, costData),
        this.detectAzureUnusedDisks(account, costData),
        this.detectAzureOldSnapshots(account, costData),
        this.detectAzureRightsizing(account, costData),
      ]);

      recommendations.push(...idle, ...unused, ...snapshots, ...rightsize);

    } catch (error) {
      console.error(`[RecommendationGenerator] Error analyzing Azure account ${account.accountName}:`, error);
      throw error;
    }

    return recommendations;
  }

  // ============================================================
  // Cost Data Retrieval
  // ============================================================

  /**
   * Retrieve cost data for an account within the analysis window
   */
  private async getAccountCostData(cloudAccountId: string, tenantId: string) {
    const analysisStartDate = new Date();
    analysisStartDate.setDate(analysisStartDate.getDate() - RecommendationGeneratorService.ANALYSIS_WINDOW_DAYS);

    return this.prisma.costData.findMany({
      where: {
        tenantId,
        cloudAccountId,
        date: { gte: analysisStartDate },
      },
      select: {
        id: true,
        date: true,
        amount: true,
        service: true,
        usageType: true,
        provider: true,
        assetId: true,
        metadata: true,
      },
      orderBy: { date: 'asc' },
    });
  }

  // ============================================================
  // AWS Recommendation Generators
  // ============================================================

  /**
   * Detect idle EC2 instances (consistently low costs for 25+ days)
   */
  private async detectAWSIdleEC2(account: CloudAccount, costData: any[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Filter for EC2 compute costs
      const ec2Data = costData.filter(d =>
        d.service.toLowerCase().includes('ec2') &&
        d.usageType &&
        d.usageType.toLowerCase().includes('instance')
      );

      if (ec2Data.length === 0) {
        return recommendations;
      }

      // Group by assetId (resource)
      const resourceMap = new Map<string, ResourceStats>();

      for (const data of ec2Data) {
        const resourceId = data.assetId || data.metadata?.resourceId || 'unknown';

        if (!resourceMap.has(resourceId)) {
          resourceMap.set(resourceId, {
            resourceId,
            service: data.service,
            provider: data.provider,
            totalCost: 0,
            days: 0,
            avgDailyCost: 0,
            metadata: data.metadata,
          });
        }

        const stats = resourceMap.get(resourceId)!;
        stats.totalCost += parseFloat(data.amount.toString());
        stats.days++;
      }

      // Calculate average and detect idle instances
      for (const [resourceId, stats] of Array.from(resourceMap.entries())) {
        stats.avgDailyCost = stats.totalCost / stats.days;

        // Expected minimum daily cost for smallest EC2 instance (t3.nano at $0.0052/hr * 24hr = $0.125/day)
        const expectedMinDailyCost = 0.125;
        const costRatio = stats.avgDailyCost / expectedMinDailyCost;

        // If cost is less than 5% of expected AND we have 25+ days of data
        if (
          costRatio < RecommendationGeneratorService.IDLE_THRESHOLD_PERCENT &&
          stats.days >= RecommendationGeneratorService.IDLE_MIN_DAYS &&
          resourceId !== 'unknown'
        ) {
          const monthlySavings = stats.avgDailyCost * 30 * 0.95; // 95% savings from termination

          recommendations.push({
            tenantId: account.tenantId,
            type: 'idle_resource',
            priority: this.calculatePriority(monthlySavings),
            provider: 'AWS',
            service: stats.service,
            resourceId,
            title: `Idle EC2 Instance: ${resourceId}`,
            description: `This EC2 instance has consistently low utilization (${costRatio.toFixed(1)}% of expected cost) over ${stats.days} days. Average daily cost: $${stats.avgDailyCost.toFixed(2)}. Consider terminating if no longer needed.`,
            estimatedSavings: monthlySavings,
            savingsPeriod: 'monthly',
            status: 'open',
            actionable: false, // Manual verification required
            metadata: {
              avgDailyCost: stats.avgDailyCost,
              daysAnalyzed: stats.days,
              totalCost: stats.totalCost,
              costRatio,
            },
          });
        }
      }

    } catch (error) {
      console.error('[RecommendationGenerator] Error detecting idle EC2:', error);
    }

    return recommendations;
  }

  /**
   * Detect unused EBS volumes (storage costs without attached instances)
   */
  private async detectAWSUnusedEBS(account: CloudAccount, costData: any[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Filter for EBS volume costs
      const ebsData = costData.filter(d =>
        d.service.toLowerCase().includes('ebs') ||
        (d.usageType && d.usageType.toLowerCase().includes('volume'))
      );

      if (ebsData.length === 0) {
        return recommendations;
      }

      // Group by resource and check if there's corresponding compute cost
      const volumeMap = new Map<string, ResourceStats>();

      for (const data of ebsData) {
        const resourceId = data.assetId || data.metadata?.volumeId || 'unknown';

        if (!volumeMap.has(resourceId)) {
          volumeMap.set(resourceId, {
            resourceId,
            service: data.service,
            provider: data.provider,
            totalCost: 0,
            days: 0,
            avgDailyCost: 0,
            metadata: data.metadata,
          });
        }

        const stats = volumeMap.get(resourceId)!;
        stats.totalCost += parseFloat(data.amount.toString());
        stats.days++;
      }

      // Check for volumes without attached instances (simplified: look for consistent low-cost storage)
      for (const [resourceId, stats] of Array.from(volumeMap.entries())) {
        stats.avgDailyCost = stats.totalCost / stats.days;

        // If we have consistent storage costs and resource ID is valid
        if (stats.days >= 20 && resourceId !== 'unknown') {
          const monthlySavings = stats.avgDailyCost * 30;

          // Only recommend if savings are meaningful (>$5/month)
          if (monthlySavings > 5) {
            recommendations.push({
              tenantId: account.tenantId,
              type: 'unused_resource',
              priority: this.calculatePriority(monthlySavings),
              provider: 'AWS',
              service: 'EBS',
              resourceId,
              title: `Unused EBS Volume: ${resourceId}`,
              description: `This EBS volume appears to be unattached or unused. Average daily cost: $${stats.avgDailyCost.toFixed(2)}. Consider deleting after creating a snapshot if data needs to be retained.`,
              estimatedSavings: monthlySavings,
              savingsPeriod: 'monthly',
              status: 'open',
              actionable: false,
              actionScript: `# Delete EBS volume after creating snapshot\naws ec2 create-snapshot --volume-id ${resourceId} --description "Backup before deletion"\naws ec2 delete-volume --volume-id ${resourceId}`,
              metadata: {
                avgDailyCost: stats.avgDailyCost,
                daysAnalyzed: stats.days,
                totalCost: stats.totalCost,
              },
            });
          }
        }
      }

    } catch (error) {
      console.error('[RecommendationGenerator] Error detecting unused EBS:', error);
    }

    return recommendations;
  }

  /**
   * Detect old EBS snapshots (>90 days old)
   */
  private async detectAWSOldSnapshots(account: CloudAccount, costData: any[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Filter for snapshot costs
      const snapshotData = costData.filter(d =>
        d.service.toLowerCase().includes('snapshot') ||
        (d.usageType && d.usageType.toLowerCase().includes('snapshot'))
      );

      if (snapshotData.length === 0) {
        return recommendations;
      }

      // Group by snapshot ID
      const snapshotMap = new Map<string, ResourceStats>();

      for (const data of snapshotData) {
        const resourceId = data.metadata?.snapshotId || data.assetId || 'unknown';

        if (!snapshotMap.has(resourceId)) {
          snapshotMap.set(resourceId, {
            resourceId,
            service: data.service,
            provider: data.provider,
            totalCost: 0,
            days: 0,
            avgDailyCost: 0,
            metadata: data.metadata,
          });
        }

        const stats = snapshotMap.get(resourceId)!;
        stats.totalCost += parseFloat(data.amount.toString());
        stats.days++;
      }

      // Identify old snapshots (present for full 30-day window suggests >90 days old)
      for (const [resourceId, stats] of Array.from(snapshotMap.entries())) {
        stats.avgDailyCost = stats.totalCost / stats.days;

        // If snapshot has been around for entire analysis window, it's likely old
        if (stats.days >= 28 && resourceId !== 'unknown') {
          const monthlySavings = stats.avgDailyCost * 30;

          // Only recommend if savings are meaningful (>$2/month)
          if (monthlySavings > 2) {
            recommendations.push({
              tenantId: account.tenantId,
              type: 'delete_snapshot',
              priority: this.calculatePriority(monthlySavings),
              provider: 'AWS',
              service: 'EBS Snapshot',
              resourceId,
              title: `Old EBS Snapshot: ${resourceId}`,
              description: `This snapshot has been retained for an extended period (${stats.days}+ days in analysis window). Average daily cost: $${stats.avgDailyCost.toFixed(2)}. Consider deleting if no longer needed for compliance or recovery.`,
              estimatedSavings: monthlySavings,
              savingsPeriod: 'monthly',
              status: 'open',
              actionable: false,
              actionScript: `# Delete old snapshot\naws ec2 delete-snapshot --snapshot-id ${resourceId}`,
              metadata: {
                avgDailyCost: stats.avgDailyCost,
                daysAnalyzed: stats.days,
                totalCost: stats.totalCost,
              },
            });
          }
        }
      }

    } catch (error) {
      console.error('[RecommendationGenerator] Error detecting old snapshots:', error);
    }

    return recommendations;
  }

  /**
   * Detect rightsizing opportunities (instances that can be downsized)
   */
  private async detectAWSRightsizing(account: CloudAccount, costData: any[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Filter for EC2 instance costs
      const ec2Data = costData.filter(d =>
        d.service.toLowerCase().includes('ec2') &&
        d.usageType &&
        d.usageType.toLowerCase().includes('instance')
      );

      if (ec2Data.length === 0) {
        return recommendations;
      }

      // Group by instance and analyze usage patterns
      const instanceMap = new Map<string, ResourceStats>();

      for (const data of ec2Data) {
        const resourceId = data.assetId || data.metadata?.instanceId || 'unknown';

        if (!instanceMap.has(resourceId)) {
          instanceMap.set(resourceId, {
            resourceId,
            service: data.service,
            provider: data.provider,
            totalCost: 0,
            days: 0,
            avgDailyCost: 0,
            metadata: data.metadata,
          });
        }

        const stats = instanceMap.get(resourceId)!;
        stats.totalCost += parseFloat(data.amount.toString());
        stats.days++;
      }

      // Identify instances with consistent costs that could be rightsized
      for (const [resourceId, stats] of Array.from(instanceMap.entries())) {
        stats.avgDailyCost = stats.totalCost / stats.days;

        // Simplified rightsizing: if instance costs are consistent but not at idle levels
        // and the instance type can be inferred
        const instanceType = stats.metadata?.instanceType;

        if (
          stats.days >= 25 &&
          resourceId !== 'unknown' &&
          instanceType &&
          stats.avgDailyCost > 1 // Above idle threshold but could be smaller
        ) {
          // Find a smaller instance type
          const targetType = this.getDownsizedInstanceType(instanceType);

          if (targetType) {
            const currentHourlyRate = RecommendationGeneratorService.INSTANCE_PRICING[instanceType] || stats.avgDailyCost / 24;
            const targetHourlyRate = RecommendationGeneratorService.INSTANCE_PRICING[targetType];

            if (targetHourlyRate && targetHourlyRate < currentHourlyRate) {
              const monthlySavings = (currentHourlyRate - targetHourlyRate) * 24 * 30;

              recommendations.push({
                tenantId: account.tenantId,
                type: 'rightsize',
                priority: this.calculatePriority(monthlySavings),
                provider: 'AWS',
                service: 'EC2',
                resourceId,
                title: `Rightsize EC2 Instance: ${resourceId}`,
                description: `This ${instanceType} instance could be downsized to ${targetType} based on usage patterns. Current monthly cost: $${(stats.avgDailyCost * 30).toFixed(2)}. Estimated cost after rightsizing: $${((stats.avgDailyCost * 30) - monthlySavings).toFixed(2)}.`,
                estimatedSavings: monthlySavings,
                savingsPeriod: 'monthly',
                status: 'open',
                actionable: false,
                metadata: {
                  currentInstanceType: instanceType,
                  recommendedInstanceType: targetType,
                  currentHourlyRate,
                  targetHourlyRate,
                  avgDailyCost: stats.avgDailyCost,
                  daysAnalyzed: stats.days,
                },
              });
            }
          }
        }
      }

    } catch (error) {
      console.error('[RecommendationGenerator] Error detecting rightsizing:', error);
    }

    return recommendations;
  }

  /**
   * Detect Reserved Instance opportunities (consistent 24/7 usage)
   */
  private async detectAWSReservedInstanceOpportunities(account: CloudAccount, costData: any[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Filter for EC2 on-demand costs
      const ec2Data = costData.filter(d =>
        d.service.toLowerCase().includes('ec2') &&
        d.usageType &&
        d.usageType.toLowerCase().includes('instance') &&
        !d.usageType.toLowerCase().includes('reserved')
      );

      if (ec2Data.length === 0) {
        return recommendations;
      }

      // Group by instance and check for consistent usage
      const instanceMap = new Map<string, ResourceStats>();

      for (const data of ec2Data) {
        const resourceId = data.assetId || data.metadata?.instanceId || 'unknown';

        if (!instanceMap.has(resourceId)) {
          instanceMap.set(resourceId, {
            resourceId,
            service: data.service,
            provider: data.provider,
            totalCost: 0,
            days: 0,
            avgDailyCost: 0,
            metadata: data.metadata,
          });
        }

        const stats = instanceMap.get(resourceId)!;
        stats.totalCost += parseFloat(data.amount.toString());
        stats.days++;
      }

      // Identify instances with consistent 24/7 usage (28+ days of data)
      for (const [resourceId, stats] of Array.from(instanceMap.entries())) {
        stats.avgDailyCost = stats.totalCost / stats.days;

        // If instance has been running consistently for 28+ days
        if (
          stats.days >= RecommendationGeneratorService.RI_MIN_CONSISTENT_DAYS &&
          resourceId !== 'unknown' &&
          stats.avgDailyCost > 1 // Meaningful workload
        ) {
          // Calculate RI savings (typically 35% for 1-year RI)
          const onDemandMonthlyCost = stats.avgDailyCost * 30;
          const riMonthlySavings = onDemandMonthlyCost * RecommendationGeneratorService.RI_SAVINGS_PERCENT;

          recommendations.push({
            tenantId: account.tenantId,
            type: 'reserved_instance',
            priority: this.calculatePriority(riMonthlySavings),
            provider: 'AWS',
            service: 'EC2',
            resourceId,
            title: `Reserved Instance Opportunity: ${resourceId}`,
            description: `This EC2 instance has run consistently for ${stats.days} days with average daily cost of $${stats.avgDailyCost.toFixed(2)}. Consider purchasing a 1-year Reserved Instance to save approximately 35%. Monthly on-demand cost: $${onDemandMonthlyCost.toFixed(2)}.`,
            estimatedSavings: riMonthlySavings,
            savingsPeriod: 'monthly',
            status: 'open',
            actionable: false,
            metadata: {
              instanceType: stats.metadata?.instanceType,
              avgDailyCost: stats.avgDailyCost,
              daysAnalyzed: stats.days,
              onDemandMonthlyCost,
              estimatedRIMonthlyCost: onDemandMonthlyCost - riMonthlySavings,
              recommendedCommitment: '1-year',
            },
          });
        }
      }

    } catch (error) {
      console.error('[RecommendationGenerator] Error detecting RI opportunities:', error);
    }

    return recommendations;
  }

  // ============================================================
  // Azure Recommendation Generators
  // ============================================================

  /**
   * Detect idle Azure VMs
   */
  private async detectAzureIdleVMs(account: CloudAccount, costData: any[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Filter for VM compute costs
      const vmData = costData.filter(d =>
        d.service.toLowerCase().includes('virtual machines') ||
        d.service.toLowerCase().includes('compute')
      );

      if (vmData.length === 0) {
        return recommendations;
      }

      // Group by resource
      const resourceMap = new Map<string, ResourceStats>();

      for (const data of vmData) {
        const resourceId = data.assetId || data.metadata?.resourceId || 'unknown';

        if (!resourceMap.has(resourceId)) {
          resourceMap.set(resourceId, {
            resourceId,
            service: data.service,
            provider: data.provider,
            totalCost: 0,
            days: 0,
            avgDailyCost: 0,
            metadata: data.metadata,
          });
        }

        const stats = resourceMap.get(resourceId)!;
        stats.totalCost += parseFloat(data.amount.toString());
        stats.days++;
      }

      // Calculate average and detect idle VMs
      for (const [resourceId, stats] of Array.from(resourceMap.entries())) {
        stats.avgDailyCost = stats.totalCost / stats.days;

        // Expected minimum daily cost for smallest Azure VM (B1s at $0.0104/hr * 24hr = $0.25/day)
        const expectedMinDailyCost = 0.25;
        const costRatio = stats.avgDailyCost / expectedMinDailyCost;

        // If cost is less than 5% of expected AND we have 25+ days of data
        if (
          costRatio < RecommendationGeneratorService.IDLE_THRESHOLD_PERCENT &&
          stats.days >= RecommendationGeneratorService.IDLE_MIN_DAYS &&
          resourceId !== 'unknown'
        ) {
          const monthlySavings = stats.avgDailyCost * 30 * 0.95;

          recommendations.push({
            tenantId: account.tenantId,
            type: 'idle_resource',
            priority: this.calculatePriority(monthlySavings),
            provider: 'AZURE',
            service: stats.service,
            resourceId,
            title: `Idle Azure VM: ${resourceId}`,
            description: `This virtual machine has consistently low utilization (${costRatio.toFixed(1)}% of expected cost) over ${stats.days} days. Average daily cost: $${stats.avgDailyCost.toFixed(2)}. Consider stopping or deleting if no longer needed.`,
            estimatedSavings: monthlySavings,
            savingsPeriod: 'monthly',
            status: 'open',
            actionable: false,
            metadata: {
              avgDailyCost: stats.avgDailyCost,
              daysAnalyzed: stats.days,
              totalCost: stats.totalCost,
              costRatio,
            },
          });
        }
      }

    } catch (error) {
      console.error('[RecommendationGenerator] Error detecting idle Azure VMs:', error);
    }

    return recommendations;
  }

  /**
   * Detect unused Azure managed disks
   */
  private async detectAzureUnusedDisks(account: CloudAccount, costData: any[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Filter for disk storage costs
      const diskData = costData.filter(d =>
        d.service.toLowerCase().includes('disk') ||
        d.service.toLowerCase().includes('storage')
      );

      if (diskData.length === 0) {
        return recommendations;
      }

      // Group by disk
      const diskMap = new Map<string, ResourceStats>();

      for (const data of diskData) {
        const resourceId = data.assetId || data.metadata?.diskId || 'unknown';

        if (!diskMap.has(resourceId)) {
          diskMap.set(resourceId, {
            resourceId,
            service: data.service,
            provider: data.provider,
            totalCost: 0,
            days: 0,
            avgDailyCost: 0,
            metadata: data.metadata,
          });
        }

        const stats = diskMap.get(resourceId)!;
        stats.totalCost += parseFloat(data.amount.toString());
        stats.days++;
      }

      // Check for unattached disks
      for (const [resourceId, stats] of Array.from(diskMap.entries())) {
        stats.avgDailyCost = stats.totalCost / stats.days;

        if (stats.days >= 20 && resourceId !== 'unknown') {
          const monthlySavings = stats.avgDailyCost * 30;

          if (monthlySavings > 5) {
            recommendations.push({
              tenantId: account.tenantId,
              type: 'unused_resource',
              priority: this.calculatePriority(monthlySavings),
              provider: 'AZURE',
              service: 'Managed Disk',
              resourceId,
              title: `Unused Azure Disk: ${resourceId}`,
              description: `This managed disk appears to be unattached or unused. Average daily cost: $${stats.avgDailyCost.toFixed(2)}. Consider deleting after creating a snapshot if data needs to be retained.`,
              estimatedSavings: monthlySavings,
              savingsPeriod: 'monthly',
              status: 'open',
              actionable: false,
              actionScript: `# Delete managed disk after creating snapshot\naz snapshot create --resource-group <rg-name> --source ${resourceId} --name backup-snapshot\naz disk delete --name ${resourceId} --resource-group <rg-name> --yes`,
              metadata: {
                avgDailyCost: stats.avgDailyCost,
                daysAnalyzed: stats.days,
                totalCost: stats.totalCost,
              },
            });
          }
        }
      }

    } catch (error) {
      console.error('[RecommendationGenerator] Error detecting unused Azure disks:', error);
    }

    return recommendations;
  }

  /**
   * Detect old Azure snapshots
   */
  private async detectAzureOldSnapshots(account: CloudAccount, costData: any[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Filter for snapshot costs
      const snapshotData = costData.filter(d =>
        d.service.toLowerCase().includes('snapshot')
      );

      if (snapshotData.length === 0) {
        return recommendations;
      }

      // Group by snapshot
      const snapshotMap = new Map<string, ResourceStats>();

      for (const data of snapshotData) {
        const resourceId = data.metadata?.snapshotId || data.assetId || 'unknown';

        if (!snapshotMap.has(resourceId)) {
          snapshotMap.set(resourceId, {
            resourceId,
            service: data.service,
            provider: data.provider,
            totalCost: 0,
            days: 0,
            avgDailyCost: 0,
            metadata: data.metadata,
          });
        }

        const stats = snapshotMap.get(resourceId)!;
        stats.totalCost += parseFloat(data.amount.toString());
        stats.days++;
      }

      // Identify old snapshots
      for (const [resourceId, stats] of Array.from(snapshotMap.entries())) {
        stats.avgDailyCost = stats.totalCost / stats.days;

        if (stats.days >= 28 && resourceId !== 'unknown') {
          const monthlySavings = stats.avgDailyCost * 30;

          if (monthlySavings > 2) {
            recommendations.push({
              tenantId: account.tenantId,
              type: 'delete_snapshot',
              priority: this.calculatePriority(monthlySavings),
              provider: 'AZURE',
              service: 'Snapshot',
              resourceId,
              title: `Old Azure Snapshot: ${resourceId}`,
              description: `This snapshot has been retained for an extended period (${stats.days}+ days in analysis window). Average daily cost: $${stats.avgDailyCost.toFixed(2)}. Consider deleting if no longer needed.`,
              estimatedSavings: monthlySavings,
              savingsPeriod: 'monthly',
              status: 'open',
              actionable: false,
              actionScript: `# Delete old snapshot\naz snapshot delete --name ${resourceId} --resource-group <rg-name> --yes`,
              metadata: {
                avgDailyCost: stats.avgDailyCost,
                daysAnalyzed: stats.days,
                totalCost: stats.totalCost,
              },
            });
          }
        }
      }

    } catch (error) {
      console.error('[RecommendationGenerator] Error detecting old Azure snapshots:', error);
    }

    return recommendations;
  }

  /**
   * Detect Azure VM rightsizing opportunities
   */
  private async detectAzureRightsizing(account: CloudAccount, costData: any[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Filter for VM costs
      const vmData = costData.filter(d =>
        d.service.toLowerCase().includes('virtual machines') ||
        d.service.toLowerCase().includes('compute')
      );

      if (vmData.length === 0) {
        return recommendations;
      }

      // Group by VM
      const vmMap = new Map<string, ResourceStats>();

      for (const data of vmData) {
        const resourceId = data.assetId || data.metadata?.vmId || 'unknown';

        if (!vmMap.has(resourceId)) {
          vmMap.set(resourceId, {
            resourceId,
            service: data.service,
            provider: data.provider,
            totalCost: 0,
            days: 0,
            avgDailyCost: 0,
            metadata: data.metadata,
          });
        }

        const stats = vmMap.get(resourceId)!;
        stats.totalCost += parseFloat(data.amount.toString());
        stats.days++;
      }

      // Identify VMs that could be downsized
      for (const [resourceId, stats] of Array.from(vmMap.entries())) {
        stats.avgDailyCost = stats.totalCost / stats.days;

        const vmSize = stats.metadata?.vmSize || stats.metadata?.instanceType;

        if (
          stats.days >= 25 &&
          resourceId !== 'unknown' &&
          vmSize &&
          stats.avgDailyCost > 1
        ) {
          const targetSize = this.getDownsizedInstanceType(vmSize);

          if (targetSize) {
            const currentHourlyRate = RecommendationGeneratorService.INSTANCE_PRICING[vmSize] || stats.avgDailyCost / 24;
            const targetHourlyRate = RecommendationGeneratorService.INSTANCE_PRICING[targetSize];

            if (targetHourlyRate && targetHourlyRate < currentHourlyRate) {
              const monthlySavings = (currentHourlyRate - targetHourlyRate) * 24 * 30;

              recommendations.push({
                tenantId: account.tenantId,
                type: 'rightsize',
                priority: this.calculatePriority(monthlySavings),
                provider: 'AZURE',
                service: 'Virtual Machines',
                resourceId,
                title: `Rightsize Azure VM: ${resourceId}`,
                description: `This ${vmSize} VM could be downsized to ${targetSize} based on usage patterns. Current monthly cost: $${(stats.avgDailyCost * 30).toFixed(2)}. Estimated cost after rightsizing: $${((stats.avgDailyCost * 30) - monthlySavings).toFixed(2)}.`,
                estimatedSavings: monthlySavings,
                savingsPeriod: 'monthly',
                status: 'open',
                actionable: false,
                metadata: {
                  currentVMSize: vmSize,
                  recommendedVMSize: targetSize,
                  currentHourlyRate,
                  targetHourlyRate,
                  avgDailyCost: stats.avgDailyCost,
                  daysAnalyzed: stats.days,
                },
              });
            }
          }
        }
      }

    } catch (error) {
      console.error('[RecommendationGenerator] Error detecting Azure rightsizing:', error);
    }

    return recommendations;
  }

  // ============================================================
  // Utility Methods
  // ============================================================

  /**
   * Calculate priority based on estimated monthly savings
   */
  private calculatePriority(estimatedSavings: number): 'high' | 'medium' | 'low' {
    if (estimatedSavings >= 500) return 'high';
    if (estimatedSavings >= 100) return 'medium';
    return 'low';
  }

  /**
   * Get a downsized instance type (one step down)
   */
  private getDownsizedInstanceType(currentType: string): string | null {
    // AWS instance downsizing map
    const awsDownsizeMap: Record<string, string> = {
      't3.2xlarge': 't3.xlarge',
      't3.xlarge': 't3.large',
      't3.large': 't3.medium',
      't3.medium': 't3.small',
      't3.small': 't3.micro',
      'm5.4xlarge': 'm5.2xlarge',
      'm5.2xlarge': 'm5.xlarge',
      'm5.xlarge': 'm5.large',
    };

    // Azure VM downsizing map
    const azureDownsizeMap: Record<string, string> = {
      'Standard_D8s_v3': 'Standard_D4s_v3',
      'Standard_D4s_v3': 'Standard_D2s_v3',
      'Standard_D2s_v3': 'Standard_B2ms',
      'Standard_B2ms': 'Standard_B2s',
      'Standard_B2s': 'Standard_B1s',
    };

    return awsDownsizeMap[currentType] || azureDownsizeMap[currentType] || null;
  }

  /**
   * Deduplicate and save recommendations to database
   */
  private async deduplicateAndSaveRecommendations(
    tenantId: string,
    recommendations: Recommendation[]
  ): Promise<number> {
    let savedCount = 0;

    for (const recommendation of recommendations) {
      try {
        // Check if recommendation already exists
        const existing = await this.prisma.costRecommendation.findFirst({
          where: {
            tenantId,
            resourceId: recommendation.resourceId,
            type: recommendation.type,
            status: 'open',
          },
        });

        if (existing) {
          // Update if savings changed significantly (>10%)
          const savingsDiff = Math.abs(
            existing.estimatedSavings.toNumber() - recommendation.estimatedSavings
          );
          const savingsChangePercent = savingsDiff / existing.estimatedSavings.toNumber();

          if (savingsChangePercent > 0.1) {
            await this.prisma.costRecommendation.update({
              where: { id: existing.id },
              data: {
                estimatedSavings: new Decimal(recommendation.estimatedSavings),
                description: recommendation.description,
                priority: recommendation.priority,
              },
            });
            console.log(`[RecommendationGenerator] Updated recommendation: ${existing.id}`);
          }
        } else {
          // Create new recommendation
          const created = await this.prisma.costRecommendation.create({
            data: {
              tenantId: recommendation.tenantId,
              type: recommendation.type,
              priority: recommendation.priority,
              provider: recommendation.provider,
              service: recommendation.service,
              resourceId: recommendation.resourceId,
              title: recommendation.title,
              description: recommendation.description,
              estimatedSavings: new Decimal(recommendation.estimatedSavings),
              savingsPeriod: recommendation.savingsPeriod,
              status: recommendation.status,
              actionable: recommendation.actionable,
              actionScript: recommendation.actionScript,
            },
          });

          savedCount++;

          // Emit event for downstream processing
          this.emitRecommendationGenerated(created);

          console.log(`[RecommendationGenerator] Created recommendation: ${created.id} (${recommendation.type}, $${recommendation.estimatedSavings.toFixed(2)}/month)`);
        }

      } catch (error) {
        console.error(`[RecommendationGenerator] Error saving recommendation for ${recommendation.resourceId}:`, error);
      }
    }

    return savedCount;
  }

  /**
   * Emit recommendation generated event
   */
  private emitRecommendationGenerated(recommendation: CostRecommendation): void {
    try {
      const event: RecommendationGeneratedEvent = {
        tenantId: recommendation.tenantId,
        recommendationId: recommendation.id,
        type: recommendation.type,
        estimatedSavings: recommendation.estimatedSavings.toNumber(),
        priority: recommendation.priority,
        provider: recommendation.provider,
        service: recommendation.service,
        resourceId: recommendation.resourceId || 'unknown',
      };

      this.eventBus.emit('recommendation.generated', event);
    } catch (error) {
      console.error('[RecommendationGenerator] Error emitting recommendation event:', error);
    }
  }

  // ============================================================
  // Query Methods
  // ============================================================

  /**
   * Get recommendations for a tenant with optional filtering
   */
  async getRecommendations(
    tenantId: string,
    filters?: {
      status?: string;
      priority?: string;
      provider?: string;
      type?: string;
    }
  ): Promise<CostRecommendation[]> {
    const where: any = { tenantId };

    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.provider) where.provider = filters.provider;
    if (filters?.type) where.type = filters.type;

    return this.prisma.costRecommendation.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { estimatedSavings: 'desc' },
      ],
    });
  }

  /**
   * Get total estimated savings for a tenant
   */
  async getTotalEstimatedSavings(tenantId: string): Promise<number> {
    const result = await this.prisma.costRecommendation.aggregate({
      where: {
        tenantId,
        status: 'open',
      },
      _sum: {
        estimatedSavings: true,
      },
    });

    return result._sum.estimatedSavings?.toNumber() || 0;
  }

  /**
   * Update recommendation status
   */
  async updateRecommendationStatus(
    recommendationId: string,
    status: 'open' | 'applied' | 'dismissed',
    appliedAt?: Date
  ): Promise<CostRecommendation> {
    return this.prisma.costRecommendation.update({
      where: { id: recommendationId },
      data: {
        status,
        appliedAt: status === 'applied' ? appliedAt || new Date() : null,
      },
    });
  }
}
