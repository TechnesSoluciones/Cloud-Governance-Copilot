/**
 * EC2 Instances Fixtures
 *
 * Mock data for testing EC2 instance discovery and management.
 */

import { Asset } from '@prisma/client';
import { faker } from '@faker-js/faker';

/**
 * Mock EC2 instance as CloudAsset
 */
export const mockEC2Instance: Partial<Asset> = {
  id: 'asset-123',
  tenantId: 'tenant-123',
  cloudAccountId: 'account-123',
  provider: 'aws',
  resourceType: 'ec2-instance',
  resourceId: 'i-1234567890abcdef0',
  name: 'web-server-prod-01',
  region: 'us-east-1',
  status: 'running',
  metadata: {
    instanceType: 't3.medium',
    platform: 'Linux/UNIX',
    vpcId: 'vpc-123456',
    subnetId: 'subnet-123456',
    publicIp: '54.123.45.67',
    privateIp: '10.0.1.100',
    launchTime: '2024-01-01T00:00:00Z',
    tags: [
      { Key: 'Name', Value: 'web-server-prod-01' },
      { Key: 'Environment', Value: 'production' },
      { Key: 'Owner', Value: 'devops-team' },
    ],
  },
  tags: {
    Name: 'web-server-prod-01',
    Environment: 'production',
    Owner: 'devops-team',
  },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
  lastSeenAt: new Date('2024-01-02T00:00:00Z'),
};

/**
 * Multiple EC2 instances with different states
 */
export const mockEC2Instances: Partial<Asset>[] = [
  mockEC2Instance,
  {
    id: 'asset-456',
    tenantId: 'tenant-123',
    cloudAccountId: 'account-123',
    provider: 'aws',
    resourceType: 'ec2-instance',
    resourceId: 'i-abcdef1234567890',
    name: 'db-server-prod-01',
    region: 'us-east-1',
    status: 'running',
    metadata: {
      instanceType: 't3.large',
      platform: 'Linux/UNIX',
      vpcId: 'vpc-123456',
      subnetId: 'subnet-789012',
      publicIp: null,
      privateIp: '10.0.2.50',
      launchTime: '2024-01-01T00:00:00Z',
      tags: [
        { Key: 'Name', Value: 'db-server-prod-01' },
        { Key: 'Environment', Value: 'production' },
        { Key: 'Type', Value: 'database' },
      ],
    },
    tags: {
      Name: 'db-server-prod-01',
      Environment: 'production',
      Type: 'database',
    },
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
    lastSeenAt: new Date('2024-01-02T00:00:00Z'),
  },
  {
    id: 'asset-789',
    tenantId: 'tenant-123',
    cloudAccountId: 'account-123',
    provider: 'aws',
    resourceType: 'ec2-instance',
    resourceId: 'i-0987654321fedcba',
    name: 'test-server-dev-01',
    region: 'us-west-2',
    status: 'stopped',
    metadata: {
      instanceType: 't3.small',
      platform: 'Linux/UNIX',
      vpcId: 'vpc-789012',
      subnetId: 'subnet-345678',
      publicIp: null,
      privateIp: '10.1.1.10',
      launchTime: '2024-01-01T00:00:00Z',
      tags: [
        { Key: 'Name', Value: 'test-server-dev-01' },
        { Key: 'Environment', Value: 'development' },
        { Key: 'AutoStop', Value: 'true' },
      ],
    },
    tags: {
      Name: 'test-server-dev-01',
      Environment: 'development',
      AutoStop: 'true',
    },
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
    lastSeenAt: new Date('2024-01-02T00:00:00Z'),
  },
];

/**
 * Generate random EC2 instances for testing
 */
export function generateMockEC2Instances(count: number = 10): Partial<Asset>[] {
  const instanceTypes = ['t3.micro', 't3.small', 't3.medium', 't3.large', 't3.xlarge'];
  const environments = ['development', 'staging', 'production'];
  const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];
  const statuses = ['running', 'stopped', 'terminated'];

  return Array.from({ length: count }, (_, i) => ({
    id: `asset-${faker.string.uuid()}`,
    tenantId: 'tenant-123',
    cloudAccountId: 'account-123',
    provider: 'aws',
    resourceType: 'ec2-instance',
    resourceId: `i-${faker.string.hexadecimal({ length: 16, casing: 'lower' })}`,
    name: `${faker.word.noun()}-server-${i + 1}`,
    region: faker.helpers.arrayElement(regions),
    status: faker.helpers.arrayElement(statuses),
    metadata: {
      instanceType: faker.helpers.arrayElement(instanceTypes),
      platform: 'Linux/UNIX',
      vpcId: `vpc-${faker.string.hexadecimal({ length: 8, casing: 'lower' })}`,
      subnetId: `subnet-${faker.string.hexadecimal({ length: 8, casing: 'lower' })}`,
      publicIp: faker.datatype.boolean() ? faker.internet.ipv4() : null,
      privateIp: `10.0.${faker.number.int({ min: 1, max: 255 })}.${faker.number.int({ min: 1, max: 255 })}`,
      launchTime: faker.date.recent({ days: 30 }).toISOString(),
    },
    tags: {
      Name: `${faker.word.noun()}-server-${i + 1}`,
      Environment: faker.helpers.arrayElement(environments),
    },
    createdAt: faker.date.recent({ days: 30 }),
    updatedAt: new Date(),
    lastSeenAt: new Date(),
  }));
}

/**
 * Mock AWS EC2 DescribeInstances API response
 */
export const mockDescribeInstancesResponse = {
  Reservations: [
    {
      Instances: [
        {
          InstanceId: 'i-1234567890abcdef0',
          InstanceType: 't3.medium',
          State: { Name: 'running', Code: 16 },
          LaunchTime: new Date('2024-01-01T00:00:00Z'),
          Placement: { AvailabilityZone: 'us-east-1a' },
          VpcId: 'vpc-123456',
          SubnetId: 'subnet-123456',
          PublicIpAddress: '54.123.45.67',
          PrivateIpAddress: '10.0.1.100',
          Tags: [
            { Key: 'Name', Value: 'web-server-prod-01' },
            { Key: 'Environment', Value: 'production' },
          ],
        },
      ],
    },
    {
      Instances: [
        {
          InstanceId: 'i-abcdef1234567890',
          InstanceType: 't3.large',
          State: { Name: 'running', Code: 16 },
          LaunchTime: new Date('2024-01-01T00:00:00Z'),
          Placement: { AvailabilityZone: 'us-east-1b' },
          VpcId: 'vpc-123456',
          SubnetId: 'subnet-789012',
          PrivateIpAddress: '10.0.2.50',
          Tags: [
            { Key: 'Name', Value: 'db-server-prod-01' },
            { Key: 'Environment', Value: 'production' },
          ],
        },
      ],
    },
  ],
};
