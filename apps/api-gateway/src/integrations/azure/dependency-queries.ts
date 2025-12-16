/**
 * Azure Resource Graph KQL Queries for Dependency Analysis
 *
 * Optimized queries for extracting resource dependencies from Azure.
 */

/**
 * Get direct dependencies from ARM template dependsOn property
 */
export const getDirectDependenciesQuery = (resourceId: string): string => `
Resources
| where id =~ '${resourceId}'
| project
    id,
    name,
    type,
    resourceGroup,
    location,
    dependsOn = tostring(properties.dependsOn)
| extend dependencies = parse_json(dependsOn)
| mv-expand dependency = dependencies
| project
    resourceId = id,
    resourceName = name,
    resourceType = type,
    dependsOn = tostring(dependency)
| where isnotempty(dependsOn)
`;

/**
 * Get VNet peering dependencies
 */
export const getVNetPeeringDependenciesQuery = (subscriptionId?: string): string => {
  const subscriptionFilter = subscriptionId ? `| where subscriptionId == '${subscriptionId}'` : '';

  return `
Resources
| where type == 'microsoft.network/virtualnetworks'
${subscriptionFilter}
| extend peerings = properties.virtualNetworkPeerings
| mv-expand peering = peerings
| where isnotempty(peering)
| project
    sourceVNetId = id,
    sourceVNetName = name,
    targetVNetId = tostring(peering.properties.remoteVirtualNetwork.id),
    peeringState = tostring(peering.properties.peeringState),
    allowForwardedTraffic = tobool(peering.properties.allowForwardedTraffic),
    allowGatewayTransit = tobool(peering.properties.allowGatewayTransit)
| where peeringState == 'Connected'
`;
};

/**
 * Get Load Balancer backend pool dependencies
 */
export const getLoadBalancerDependenciesQuery = (subscriptionId?: string): string => {
  const subscriptionFilter = subscriptionId ? `| where subscriptionId == '${subscriptionId}'` : '';

  return `
Resources
| where type == 'microsoft.network/loadbalancers'
${subscriptionFilter}
| extend backendPools = properties.backendAddressPools
| mv-expand pool = backendPools
| where isnotempty(pool)
| extend backends = pool.properties.backendIPConfigurations
| mv-expand backend = backends
| where isnotempty(backend)
| project
    loadBalancerId = id,
    loadBalancerName = name,
    backendPoolName = tostring(pool.name),
    backendConfigId = tostring(backend.id)
| extend backendResourceId = extract(@'(/subscriptions/[^/]+/resourceGroups/[^/]+/providers/[^/]+/[^/]+/[^/]+)', 1, backendConfigId)
`;
};

/**
 * Get Application Gateway backend dependencies
 */
export const getAppGatewayDependenciesQuery = (subscriptionId?: string): string => {
  const subscriptionFilter = subscriptionId ? `| where subscriptionId == '${subscriptionId}'` : '';

  return `
Resources
| where type == 'microsoft.network/applicationgateways'
${subscriptionFilter}
| extend backendPools = properties.backendAddressPools
| mv-expand pool = backendPools
| where isnotempty(pool)
| extend addresses = pool.properties.backendAddresses
| mv-expand address = addresses
| project
    appGatewayId = id,
    appGatewayName = name,
    backendPoolName = tostring(pool.name),
    backendFqdn = tostring(address.fqdn),
    backendIp = tostring(address.ipAddress)
`;
};

/**
 * Get disk attachment dependencies
 */
export const getDiskDependenciesQuery = (subscriptionId?: string): string => {
  const subscriptionFilter = subscriptionId ? `| where subscriptionId == '${subscriptionId}'` : '';

  return `
Resources
| where type == 'microsoft.compute/disks'
${subscriptionFilter}
| where isnotempty(properties.managedBy)
| project
    diskId = id,
    diskName = name,
    diskSizeGB = toint(properties.diskSizeGB),
    attachedToVMId = tostring(properties.managedBy),
    diskState = tostring(properties.diskState)
| extend attachedToVMName = extract(@'/([^/]+)$', 1, attachedToVMId)
`;
};

/**
 * Get Network Security Group associations
 */
export const getNSGDependenciesQuery = (subscriptionId?: string): string => {
  const subscriptionFilter = subscriptionId ? `| where subscriptionId == '${subscriptionId}'` : '';

  return `
Resources
| where type == 'microsoft.network/networkinterfaces'
${subscriptionFilter}
| extend nsg = properties.networkSecurityGroup.id
| where isnotempty(nsg)
| project
    nicId = id,
    nicName = name,
    nsgId = tostring(nsg),
    vmId = tostring(properties.virtualMachine.id)
| extend nsgName = extract(@'/([^/]+)$', 1, nsgId)
| extend vmName = extract(@'/([^/]+)$', 1, vmId)
`;
};

/**
 * Get subnet NSG associations
 */
export const getSubnetNSGDependenciesQuery = (subscriptionId?: string): string => {
  const subscriptionFilter = subscriptionId ? `| where subscriptionId == '${subscriptionId}'` : '';

  return `
Resources
| where type == 'microsoft.network/virtualnetworks'
${subscriptionFilter}
| extend subnets = properties.subnets
| mv-expand subnet = subnets
| extend nsg = subnet.properties.networkSecurityGroup.id
| where isnotempty(nsg)
| project
    vnetId = id,
    vnetName = name,
    subnetName = tostring(subnet.name),
    nsgId = tostring(nsg)
`;
};

/**
 * Get Private Endpoint connections
 */
export const getPrivateEndpointDependenciesQuery = (subscriptionId?: string): string => {
  const subscriptionFilter = subscriptionId ? `| where subscriptionId == '${subscriptionId}'` : '';

  return `
Resources
| where type == 'microsoft.network/privateendpoints'
${subscriptionFilter}
| extend connections = properties.privateLinkServiceConnections
| mv-expand connection = connections
| project
    privateEndpointId = id,
    privateEndpointName = name,
    targetResourceId = tostring(connection.properties.privateLinkServiceId),
    connectionState = tostring(connection.properties.privateLinkServiceConnectionState.status),
    subnetId = tostring(properties.subnet.id)
`;
};

/**
 * Get complete dependency graph for a Resource Group
 */
export const getResourceGroupDependencyGraphQuery = (resourceGroupName: string, subscriptionId?: string): string => {
  const subscriptionFilter = subscriptionId ? `| where subscriptionId == '${subscriptionId}'` : '';

  return `
Resources
| where resourceGroup =~ '${resourceGroupName}'
${subscriptionFilter}
| project
    id,
    name,
    type,
    location,
    kind,
    sku = tostring(sku.name),
    resourceGroup,
    subscriptionId,
    tags,
    properties
| extend dependsOn = parse_json(tostring(properties.dependsOn))
| extend hasProperties = isnotempty(properties)
`;
};

/**
 * Get VM and its related resources
 */
export const getVMDependenciesQuery = (vmId: string): string => `
Resources
| where id =~ '${vmId}' and type == 'microsoft.compute/virtualmachines'
| project
    vmId = id,
    vmName = name,
    vmSize = tostring(properties.hardwareProfile.vmSize),
    osDiskId = tostring(properties.storageProfile.osDisk.managedDisk.id),
    dataDisks = properties.storageProfile.dataDisks,
    networkInterfaces = properties.networkProfile.networkInterfaces,
    availabilitySetId = tostring(properties.availabilitySet.id),
    diagnosticsStorageUri = tostring(properties.diagnosticsProfile.bootDiagnostics.storageUri)
| mv-expand nic = networkInterfaces
| extend nicId = tostring(nic.id)
| mv-expand dataDisk = dataDisks
| extend dataDiskId = tostring(dataDisk.managedDisk.id)
`;

/**
 * Get Storage Account dependencies
 */
export const getStorageAccountDependenciesQuery = (storageAccountId: string): string => `
Resources
| where type == 'microsoft.network/privateendpoints'
| extend connections = properties.privateLinkServiceConnections
| mv-expand connection = connections
| where tostring(connection.properties.privateLinkServiceId) =~ '${storageAccountId}'
| project
    privateEndpointId = id,
    privateEndpointName = name,
    connectionState = tostring(connection.properties.privateLinkServiceConnectionState.status)
| union (
    Resources
    | where type == 'microsoft.compute/virtualmachines'
    | where tostring(properties.diagnosticsProfile.bootDiagnostics.storageUri) contains split('${storageAccountId}', '/')[8]
    | project vmId = id, vmName = name, diagnosticsStorage = tostring(properties.diagnosticsProfile.bootDiagnostics.storageUri)
)
`;

/**
 * Get all resources with their basic dependency info (optimized for large scans)
 */
export const getAllResourcesDependenciesQuery = (subscriptionId?: string): string => {
  const subscriptionFilter = subscriptionId ? `| where subscriptionId == '${subscriptionId}'` : '';

  return `
Resources
${subscriptionFilter}
| project
    id,
    name,
    type,
    resourceGroup,
    location,
    subscriptionId,
    properties
| extend dependsOn = tostring(properties.dependsOn)
| extend hasDependencies = isnotempty(dependsOn) and dependsOn != '[]'
`;
};

/**
 * Get resources by type with dependency counts
 */
export const getResourceTypesDependenciesQuery = (subscriptionId?: string): string => {
  const subscriptionFilter = subscriptionId ? `| where subscriptionId == '${subscriptionId}'` : '';

  return `
Resources
${subscriptionFilter}
| project
    type,
    id,
    dependsOn = tostring(properties.dependsOn)
| extend depCount = array_length(parse_json(dependsOn))
| summarize
    resourceCount = count(),
    avgDependencies = avg(depCount),
    maxDependencies = max(depCount),
    resourcesWithDeps = countif(depCount > 0)
    by type
| order by resourceCount desc
`;
};

/**
 * Find potential circular dependencies using join
 */
export const getCircularDependencyCandidatesQuery = (subscriptionId?: string): string => {
  const subscriptionFilter = subscriptionId ? `and subscriptionId == '${subscriptionId}'` : '';

  return `
Resources
| where isnotempty(properties.dependsOn) ${subscriptionFilter}
| project
    resourceId = id,
    resourceName = name,
    dependsOn = parse_json(tostring(properties.dependsOn))
| mv-expand dependency = dependsOn
| extend depId = tostring(dependency)
| where isnotempty(depId)
| join kind=inner (
    Resources
    | where isnotempty(properties.dependsOn)
    | project
        depId = id,
        reverseDeps = parse_json(tostring(properties.dependsOn))
    | mv-expand reverseDep = reverseDeps
    | extend resourceId = tostring(reverseDep)
) on resourceId, depId
| project resourceId, depId
| distinct resourceId, depId
`;
};

/**
 * Get resource costs (requires Cost Management data)
 */
export const getResourceCostsQuery = (subscriptionId: string, days: number = 30): string => `
Resources
| where subscriptionId == '${subscriptionId}'
| project id, name, type, resourceGroup
`;
// Note: Actual cost data requires Cost Management API integration

/**
 * Helper function to build dynamic filters
 */
export const buildResourceFilter = (filters: {
  subscriptionId?: string;
  resourceGroupName?: string;
  location?: string;
  resourceTypes?: string[];
}): string => {
  const conditions: string[] = [];

  if (filters.subscriptionId) {
    conditions.push(`subscriptionId == '${filters.subscriptionId}'`);
  }

  if (filters.resourceGroupName) {
    conditions.push(`resourceGroup =~ '${filters.resourceGroupName}'`);
  }

  if (filters.location) {
    conditions.push(`location =~ '${filters.location}'`);
  }

  if (filters.resourceTypes && filters.resourceTypes.length > 0) {
    const types = filters.resourceTypes.map(t => `'${t.toLowerCase()}'`).join(', ');
    conditions.push(`type in~ (${types})`);
  }

  return conditions.length > 0 ? `| where ${conditions.join(' and ')}` : '';
};

/**
 * Query templates for different dependency types
 */
export const DependencyQueryTemplates = {
  DIRECT: getDirectDependenciesQuery,
  VNET_PEERING: getVNetPeeringDependenciesQuery,
  LOAD_BALANCER: getLoadBalancerDependenciesQuery,
  APP_GATEWAY: getAppGatewayDependenciesQuery,
  DISK: getDiskDependenciesQuery,
  NSG: getNSGDependenciesQuery,
  SUBNET_NSG: getSubnetNSGDependenciesQuery,
  PRIVATE_ENDPOINT: getPrivateEndpointDependenciesQuery,
  VM: getVMDependenciesQuery,
  STORAGE: getStorageAccountDependenciesQuery,
  RESOURCE_GROUP: getResourceGroupDependencyGraphQuery,
  ALL_RESOURCES: getAllResourcesDependenciesQuery,
  RESOURCE_TYPES: getResourceTypesDependenciesQuery,
  CIRCULAR: getCircularDependencyCandidatesQuery,
};
