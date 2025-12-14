/**
 * Cloud Provider Integration Interface
 *
 * This interface defines the contract that all cloud provider integrations must implement.
 * It ensures consistent APIs across AWS, Azure, and GCP integrations.
 *
 * Architecture Pattern:
 * - Interface-driven design for multi-cloud support
 * - Each provider (AWS, Azure, GCP) implements this interface
 * - Modules (FinOps, Assets, Security) consume providers through this interface
 * - Easy to add new providers without changing module code
 */

// ============================================================
// Common Types
// ============================================================

/**
 * Supported cloud providers
 */
export type CloudProviderType = 'aws' | 'azure' | 'gcp';

/**
 * Date range for queries
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Common resource tags
 */
export type ResourceTags = Record<string, string>;

// ============================================================
// Cost Management Types
// ============================================================

/**
 * Normalized cost data across all cloud providers
 */
export interface CloudCostData {
  /** Date of the cost data */
  date: Date;

  /** Cloud service name (e.g., "EC2", "S3", "Virtual Machines") */
  service: string;

  /** Cost amount */
  amount: number;

  /** Currency code (e.g., "USD", "EUR") */
  currency: string;

  /** Usage type (e.g., "BoxUsage:t2.micro", "Data Transfer") */
  usageType?: string;

  /** Operation (e.g., "RunInstances", "CreateBucket") */
  operation?: string;

  /** Region (e.g., "us-east-1", "eastus") */
  region?: string;

  /** Resource ID if available */
  resourceId?: string;

  /** Resource tags */
  tags?: ResourceTags;

  /** Provider-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Cost summary by service
 */
export interface CostByService {
  service: string;
  totalCost: number;
  currency: string;
  percentage: number;
}

/**
 * Cost trends over time
 */
export interface CostTrend {
  date: Date;
  totalCost: number;
  currency: string;
}

// ============================================================
// Asset Discovery Types
// ============================================================

/**
 * Normalized cloud asset/resource
 */
export interface CloudAsset {
  /** Unique resource identifier (ARN for AWS, Resource URI for Azure) */
  resourceId: string;

  /** Resource type (e.g., "ec2:instance", "vm") */
  resourceType: string;

  /** Resource name */
  name?: string;

  /** Region */
  region: string;

  /** Availability zone */
  zone?: string;

  /** Resource status (e.g., "running", "stopped") */
  status: string;

  /** Resource tags */
  tags: ResourceTags;

  /** Provider-specific metadata */
  metadata: Record<string, any>;

  /** Creation date */
  createdAt?: Date;

  /** Last modified date */
  lastModifiedAt?: Date;
}

/**
 * Asset filters for discovery
 */
export interface AssetFilters {
  /** Filter by resource type */
  resourceType?: string;

  /** Filter by region */
  region?: string;

  /** Filter by tags */
  tags?: ResourceTags;

  /** Filter by status */
  status?: string;
}

// ============================================================
// Security Scanning Types
// ============================================================

/**
 * Security finding severity
 */
export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

/**
 * Security finding
 */
export interface SecurityFinding {
  /** Finding ID */
  findingId: string;

  /** Finding title */
  title: string;

  /** Finding description */
  description: string;

  /** Severity level */
  severity: SecuritySeverity;

  /** Category (e.g., "Access Control", "Encryption", "Network") */
  category: string;

  /** Affected resource ID */
  resourceId?: string;

  /** Affected resource type */
  resourceType?: string;

  /** Region */
  region?: string;

  /** Remediation recommendation */
  remediation?: string;

  /** Compliance frameworks (e.g., ["CIS", "PCI-DSS"]) */
  compliance?: string[];

  /** Provider-specific metadata */
  metadata?: Record<string, any>;

  /** First observed date */
  firstObservedAt: Date;

  /** Last observed date */
  lastObservedAt: Date;
}

// ============================================================
// Cloud Provider Interface
// ============================================================

/**
 * Main Cloud Provider Interface
 *
 * All cloud provider integrations (AWS, Azure, GCP) must implement this interface.
 *
 * Usage example:
 * ```typescript
 * const awsProvider = new AWSProvider(credentials);
 * const costs = await awsProvider.getCosts({ start: new Date('2024-01-01'), end: new Date('2024-01-31') });
 * const assets = await awsProvider.discoverAssets({ region: 'us-east-1' });
 * ```
 */
export interface CloudProvider {
  /**
   * Provider identifier
   */
  readonly name: CloudProviderType;

  /**
   * Check if provider credentials are valid
   */
  validateCredentials(): Promise<boolean>;

  // ============================================================
  // Cost Management Methods
  // ============================================================

  /**
   * Get cost data for a date range
   *
   * @param dateRange - Date range to query
   * @param filters - Optional filters (service, region, tags)
   * @returns Array of cost data points
   */
  getCosts(dateRange: DateRange, filters?: {
    service?: string;
    region?: string;
    tags?: ResourceTags;
  }): Promise<CloudCostData[]>;

  /**
   * Get cost breakdown by service
   *
   * @param dateRange - Date range to query
   * @returns Array of costs grouped by service
   */
  getCostsByService(dateRange: DateRange): Promise<CostByService[]>;

  /**
   * Get cost trends over time
   *
   * @param dateRange - Date range to query
   * @param granularity - Time granularity ('daily' | 'weekly' | 'monthly')
   * @returns Array of cost trends
   */
  getCostTrends(
    dateRange: DateRange,
    granularity: 'daily' | 'weekly' | 'monthly'
  ): Promise<CostTrend[]>;

  // ============================================================
  // Asset Discovery Methods
  // ============================================================

  /**
   * Discover cloud assets/resources
   *
   * @param filters - Optional filters for asset discovery
   * @returns Array of discovered assets
   */
  discoverAssets(filters?: AssetFilters): Promise<CloudAsset[]>;

  /**
   * Get details for a specific asset
   *
   * @param resourceId - Resource identifier (ARN for AWS, URI for Azure)
   * @returns Asset details
   */
  getAssetDetails(resourceId: string): Promise<CloudAsset | null>;

  // ============================================================
  // Security Scanning Methods
  // ============================================================

  /**
   * Run security scan for misconfigurations
   *
   * @param filters - Optional filters for scanning
   * @returns Array of security findings
   */
  scanForMisconfigurations(filters?: {
    resourceType?: string;
    region?: string;
    severity?: SecuritySeverity[];
  }): Promise<SecurityFinding[]>;

  /**
   * Get security findings for a specific resource
   *
   * @param resourceId - Resource identifier
   * @returns Array of security findings
   */
  getSecurityFindings(resourceId: string): Promise<SecurityFinding[]>;
}

// ============================================================
// Provider Factory Type
// ============================================================

/**
 * Credentials for cloud providers
 */
export interface CloudProviderCredentials {
  provider: CloudProviderType;

  // AWS credentials
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;

  // Azure credentials
  azureTenantId?: string;
  azureClientId?: string;
  azureClientSecret?: string;
  azureSubscriptionId?: string;

  // GCP credentials
  gcpProjectId?: string;
  gcpCredentials?: string; // JSON string
}

/**
 * Factory function type for creating cloud provider instances
 */
export type CloudProviderFactory = (credentials: CloudProviderCredentials) => CloudProvider;
