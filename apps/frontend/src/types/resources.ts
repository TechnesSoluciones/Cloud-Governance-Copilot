/**
 * TypeScript Interfaces for Azure Resource Inventory
 *
 * Defines types for Azure resources, filters, and API responses
 * Used across the Resource Inventory (Assets) page
 */

/**
 * Azure Resource
 * Represents a single Azure resource discovered in the inventory
 */
export interface Resource {
  /** Unique identifier for the resource */
  id: string;
  /** Resource name */
  name: string;
  /** Azure resource type (e.g., "Microsoft.Compute/virtualMachines") */
  type: string;
  /** Azure region/location (e.g., "eastus", "westeurope") */
  location: string;
  /** Resource group name */
  resourceGroup: string;
  /** Resource tags as key-value pairs */
  tags: Record<string, string>;
  /** Additional resource properties (optional) */
  properties?: Record<string, any>;
  /** Resource SKU information (optional) */
  sku?: {
    name: string;
    tier?: string;
    size?: string;
    family?: string;
    capacity?: number;
  };
  /** Creation timestamp */
  createdAt?: string;
  /** Last modified timestamp */
  updatedAt?: string;
  /** Provisioning state */
  provisioningState?: string;
}

/**
 * Resource Filters
 * Used to filter resources in the inventory table
 */
export interface ResourceFilters {
  /** Filter by resource type */
  resourceType?: string;
  /** Filter by Azure location */
  location?: string;
  /** Filter by resource group */
  resourceGroup?: string;
  /** Search query across name, type, and location */
  search?: string;
}

/**
 * Pagination Metadata
 * Contains information about the current page and total results
 */
export interface PaginationMetadata {
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items across all pages */
  total: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Resources API Response
 * Response structure from GET /api/v1/resources endpoint
 */
export interface ResourcesResponse {
  /** Array of resources */
  data: Resource[];
  /** Pagination information */
  pagination: PaginationMetadata;
}

/**
 * Resource List Parameters
 * Query parameters for fetching resources
 */
export interface ResourceListParams extends ResourceFilters {
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Sort field */
  sortBy?: 'name' | 'type' | 'location' | 'resourceGroup' | 'createdAt';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Common Azure Resource Types
 * Predefined list of common Azure resource types for filtering
 */
export const COMMON_RESOURCE_TYPES = [
  { value: 'Microsoft.Compute/virtualMachines', label: 'Virtual Machines' },
  { value: 'Microsoft.Storage/storageAccounts', label: 'Storage Accounts' },
  { value: 'Microsoft.Network/virtualNetworks', label: 'Virtual Networks' },
  { value: 'Microsoft.Network/networkSecurityGroups', label: 'Network Security Groups' },
  { value: 'Microsoft.Sql/servers', label: 'SQL Servers' },
  { value: 'Microsoft.Web/sites', label: 'App Services' },
  { value: 'Microsoft.KeyVault/vaults', label: 'Key Vaults' },
  { value: 'Microsoft.ContainerService/managedClusters', label: 'AKS Clusters' },
  { value: 'Microsoft.Network/loadBalancers', label: 'Load Balancers' },
  { value: 'Microsoft.Network/publicIPAddresses', label: 'Public IP Addresses' },
] as const;

/**
 * Common Azure Locations
 * Predefined list of common Azure regions
 */
export const COMMON_LOCATIONS = [
  { value: 'eastus', label: 'East US' },
  { value: 'eastus2', label: 'East US 2' },
  { value: 'westus', label: 'West US' },
  { value: 'westus2', label: 'West US 2' },
  { value: 'centralus', label: 'Central US' },
  { value: 'northeurope', label: 'North Europe' },
  { value: 'westeurope', label: 'West Europe' },
  { value: 'uksouth', label: 'UK South' },
  { value: 'ukwest', label: 'UK West' },
  { value: 'southeastasia', label: 'Southeast Asia' },
  { value: 'eastasia', label: 'East Asia' },
  { value: 'australiaeast', label: 'Australia East' },
  { value: 'australiasoutheast', label: 'Australia Southeast' },
  { value: 'japaneast', label: 'Japan East' },
  { value: 'japanwest', label: 'Japan West' },
] as const;

/**
 * Type guard to check if a value is a valid Resource
 */
export function isResource(value: any): value is Resource {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.type === 'string' &&
    typeof value.location === 'string' &&
    typeof value.resourceGroup === 'string' &&
    typeof value.tags === 'object'
  );
}

/**
 * Type guard to check if a value is a valid ResourcesResponse
 */
export function isResourcesResponse(value: any): value is ResourcesResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray(value.data) &&
    typeof value.pagination === 'object' &&
    typeof value.pagination.page === 'number' &&
    typeof value.pagination.limit === 'number' &&
    typeof value.pagination.total === 'number' &&
    typeof value.pagination.totalPages === 'number'
  );
}
