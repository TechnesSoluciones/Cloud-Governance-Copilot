/**
 * AWS Mock Response Fixtures
 *
 * This file contains realistic mock data for AWS API responses.
 * Used across unit tests, integration tests, and E2E tests.
 */

import type { GetCostAndUsageCommandOutput } from '@aws-sdk/client-cost-explorer';
import type { DescribeInstancesCommandOutput } from '@aws-sdk/client-ec2';

// ============================================================
// AWS Cost Explorer Mock Responses
// ============================================================

/**
 * Mock AWS Cost Explorer response with multiple services
 */
export const mockAWSCostResponse: GetCostAndUsageCommandOutput = {
  $metadata: {
    httpStatusCode: 200,
    requestId: 'mock-request-id',
    attempts: 1,
    totalRetryDelay: 0,
  },
  ResultsByTime: [
    {
      TimePeriod: { Start: '2024-01-01', End: '2024-01-02' },
      Groups: [
        {
          Keys: ['Amazon EC2'],
          Metrics: {
            UnblendedCost: {
              Amount: '150.50',
              Unit: 'USD',
            },
          },
        },
        {
          Keys: ['Amazon RDS'],
          Metrics: {
            UnblendedCost: {
              Amount: '75.25',
              Unit: 'USD',
            },
          },
        },
        {
          Keys: ['Amazon S3'],
          Metrics: {
            UnblendedCost: {
              Amount: '25.10',
              Unit: 'USD',
            },
          },
        },
      ],
      Total: {
        UnblendedCost: {
          Amount: '250.85',
          Unit: 'USD',
        },
      },
    },
    {
      TimePeriod: { Start: '2024-01-02', End: '2024-01-03' },
      Groups: [
        {
          Keys: ['Amazon EC2'],
          Metrics: {
            UnblendedCost: {
              Amount: '155.75',
              Unit: 'USD',
            },
          },
        },
        {
          Keys: ['Amazon RDS'],
          Metrics: {
            UnblendedCost: {
              Amount: '78.50',
              Unit: 'USD',
            },
          },
        },
      ],
      Total: {
        UnblendedCost: {
          Amount: '234.25',
          Unit: 'USD',
        },
      },
    },
  ],
  DimensionValueAttributes: [],
};

/**
 * Mock AWS Cost Explorer response with single day
 */
export const mockAWSSingleDayCostResponse: GetCostAndUsageCommandOutput = {
  $metadata: {
    httpStatusCode: 200,
    requestId: 'mock-request-id',
    attempts: 1,
    totalRetryDelay: 0,
  },
  ResultsByTime: [
    {
      TimePeriod: { Start: '2024-01-15', End: '2024-01-16' },
      Groups: [
        {
          Keys: ['Amazon EC2'],
          Metrics: {
            UnblendedCost: {
              Amount: '125.00',
              Unit: 'USD',
            },
          },
        },
      ],
    },
  ],
};

/**
 * Mock AWS Cost Explorer response with no costs
 */
export const mockAWSNoCostResponse: GetCostAndUsageCommandOutput = {
  $metadata: {
    httpStatusCode: 200,
    requestId: 'mock-request-id',
    attempts: 1,
    totalRetryDelay: 0,
  },
  ResultsByTime: [
    {
      TimePeriod: { Start: '2024-01-01', End: '2024-01-02' },
      Groups: [],
    },
  ],
};

/**
 * Mock AWS Cost Explorer response for trends (monthly)
 */
export const mockAWSMonthlyCostResponse: GetCostAndUsageCommandOutput = {
  $metadata: {
    httpStatusCode: 200,
    requestId: 'mock-request-id',
    attempts: 1,
    totalRetryDelay: 0,
  },
  ResultsByTime: [
    {
      TimePeriod: { Start: '2024-01-01', End: '2024-02-01' },
      Total: {
        UnblendedCost: {
          Amount: '3500.00',
          Unit: 'USD',
        },
      },
    },
    {
      TimePeriod: { Start: '2024-02-01', End: '2024-03-01' },
      Total: {
        UnblendedCost: {
          Amount: '3750.50',
          Unit: 'USD',
        },
      },
    },
    {
      TimePeriod: { Start: '2024-03-01', End: '2024-04-01' },
      Total: {
        UnblendedCost: {
          Amount: '4100.25',
          Unit: 'USD',
        },
      },
    },
  ],
};

// ============================================================
// AWS EC2 Mock Responses
// ============================================================

/**
 * Mock EC2 instance for testing
 */
export const mockEC2Instance = {
  InstanceId: 'i-1234567890abcdef0',
  InstanceType: 't2.micro',
  State: { Name: 'running', Code: 16 },
  LaunchTime: new Date('2024-01-01T10:00:00Z'),
  Placement: {
    AvailabilityZone: 'us-east-1a',
    GroupName: '',
    Tenancy: 'default',
  },
  VpcId: 'vpc-12345678',
  SubnetId: 'subnet-12345678',
  SecurityGroups: [
    {
      GroupId: 'sg-11111111',
      GroupName: 'web-server-sg',
    },
    {
      GroupId: 'sg-22222222',
      GroupName: 'ssh-access-sg',
    },
  ],
  PublicIpAddress: '54.123.45.67',
  PrivateIpAddress: '10.0.1.100',
  Monitoring: { State: 'enabled' },
  Platform: undefined, // Linux instance
  ImageId: 'ami-0abcdef1234567890',
  KeyName: 'production-keypair',
  Architecture: 'x86_64',
  RootDeviceType: 'ebs',
  VirtualizationType: 'hvm',
  Hypervisor: 'xen',
  Tags: [
    { Key: 'Name', Value: 'Production Web Server' },
    { Key: 'Environment', Value: 'production' },
    { Key: 'Owner', Value: 'devops-team' },
    { Key: 'Cost-Center', Value: 'Engineering' },
  ],
};

/**
 * Mock EC2 DescribeInstances response with multiple instances
 */
export const mockEC2DescribeInstancesResponse: DescribeInstancesCommandOutput = {
  $metadata: {
    httpStatusCode: 200,
    requestId: 'mock-request-id',
    attempts: 1,
    totalRetryDelay: 0,
  },
  Reservations: [
    {
      ReservationId: 'r-123456',
      OwnerId: '123456789012',
      Instances: [mockEC2Instance],
    },
    {
      ReservationId: 'r-789012',
      OwnerId: '123456789012',
      Instances: [
        {
          InstanceId: 'i-0987654321fedcba0',
          InstanceType: 't3.large',
          State: { Name: 'running', Code: 16 },
          LaunchTime: new Date('2024-01-05T14:30:00Z'),
          Placement: {
            AvailabilityZone: 'us-east-1b',
            GroupName: '',
            Tenancy: 'default',
          },
          VpcId: 'vpc-12345678',
          SubnetId: 'subnet-87654321',
          SecurityGroups: [
            {
              GroupId: 'sg-33333333',
              GroupName: 'database-sg',
            },
          ],
          PublicIpAddress: undefined,
          PrivateIpAddress: '10.0.2.50',
          Monitoring: { State: 'disabled' },
          Platform: undefined,
          ImageId: 'ami-0987654321fedcba0',
          KeyName: 'production-keypair',
          Architecture: 'x86_64',
          RootDeviceType: 'ebs',
          VirtualizationType: 'hvm',
          Hypervisor: 'xen',
          Tags: [
            { Key: 'Name', Value: 'Database Server' },
            { Key: 'Environment', Value: 'production' },
            { Key: 'Type', Value: 'database' },
          ],
        },
      ],
    },
  ],
};

/**
 * Mock EC2 DescribeInstances response with no instances
 */
export const mockEC2NoInstancesResponse: DescribeInstancesCommandOutput = {
  $metadata: {
    httpStatusCode: 200,
    requestId: 'mock-request-id',
    attempts: 1,
    totalRetryDelay: 0,
  },
  Reservations: [],
};

/**
 * Mock EC2 DescribeInstances response with stopped instance
 */
export const mockEC2StoppedInstanceResponse: DescribeInstancesCommandOutput = {
  $metadata: {
    httpStatusCode: 200,
    requestId: 'mock-request-id',
    attempts: 1,
    totalRetryDelay: 0,
  },
  Reservations: [
    {
      ReservationId: 'r-stopped',
      OwnerId: '123456789012',
      Instances: [
        {
          InstanceId: 'i-stopped123456789',
          InstanceType: 't2.small',
          State: { Name: 'stopped', Code: 80 },
          LaunchTime: new Date('2024-01-01T10:00:00Z'),
          Placement: {
            AvailabilityZone: 'us-east-1a',
            GroupName: '',
            Tenancy: 'default',
          },
          VpcId: 'vpc-12345678',
          SubnetId: 'subnet-12345678',
          Tags: [
            { Key: 'Name', Value: 'Stopped Instance' },
            { Key: 'Environment', Value: 'development' },
          ],
        },
      ],
    },
  ],
};

// ============================================================
// Database Mock Data (Prisma)
// ============================================================

/**
 * Mock cloud account for testing
 */
export const mockCloudAccount = {
  id: 'cloud-account-123',
  tenantId: 'tenant-456',
  provider: 'aws' as const,
  accountName: 'Production AWS Account',
  accountIdentifier: '123456789012',
  status: 'active' as const,
  credentialsCiphertext: Buffer.from(
    JSON.stringify({
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      region: 'us-east-1',
    })
  ).toString('hex'),
  credentialsIv: '00000000000000000000000000000000',
  credentialsAuthTag: '00000000000000000000000000000000',
  lastSync: new Date('2024-01-30T00:00:00Z'),
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-30T00:00:00Z'),
  tenant: {
    id: 'tenant-456',
    name: 'Acme Corporation',
    slug: 'acme-corp',
    status: 'active' as const,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
};

/**
 * Mock cost data records
 */
export const mockCostDataRecords = [
  {
    id: 'cost-1',
    tenantId: 'tenant-456',
    cloudAccountId: 'cloud-account-123',
    assetId: null,
    date: new Date('2024-01-15'),
    amount: 150.5,
    currency: 'USD',
    provider: 'aws' as const,
    service: 'Amazon EC2',
    usageType: 't2.micro',
    operation: 'RunInstances',
    tags: { Environment: 'production' },
    metadata: { region: 'us-east-1' },
    createdAt: new Date('2024-01-16T02:00:00Z'),
  },
  {
    id: 'cost-2',
    tenantId: 'tenant-456',
    cloudAccountId: 'cloud-account-123',
    assetId: null,
    date: new Date('2024-01-15'),
    amount: 75.25,
    currency: 'USD',
    provider: 'aws' as const,
    service: 'Amazon RDS',
    usageType: 'db.t3.small',
    operation: null,
    tags: {},
    metadata: {},
    createdAt: new Date('2024-01-16T02:00:00Z'),
  },
  {
    id: 'cost-3',
    tenantId: 'tenant-456',
    cloudAccountId: 'cloud-account-123',
    assetId: null,
    date: new Date('2024-01-16'),
    amount: 155.0,
    currency: 'USD',
    provider: 'aws' as const,
    service: 'Amazon EC2',
    usageType: 't2.micro',
    operation: 'RunInstances',
    tags: { Environment: 'production' },
    metadata: { region: 'us-east-1' },
    createdAt: new Date('2024-01-17T02:00:00Z'),
  },
];

/**
 * Mock cost anomaly records
 */
export const mockCostAnomalies = [
  {
    id: 'anomaly-1',
    tenantId: 'tenant-456',
    date: new Date('2024-01-20'),
    service: 'Amazon EC2',
    provider: 'aws' as const,
    resourceId: null,
    expectedCost: 150.0,
    actualCost: 450.0,
    deviation: 200.0,
    severity: 'high' as const,
    status: 'open' as const,
    rootCause: null,
    detectedAt: new Date('2024-01-21T02:00:00Z'),
    resolvedAt: null,
    resolvedBy: null,
  },
  {
    id: 'anomaly-2',
    tenantId: 'tenant-456',
    date: new Date('2024-01-19'),
    service: 'Amazon RDS',
    provider: 'aws' as const,
    resourceId: null,
    expectedCost: 75.0,
    actualCost: 190.0,
    deviation: 153.33,
    severity: 'medium' as const,
    status: 'investigating' as const,
    rootCause: null,
    detectedAt: new Date('2024-01-20T02:00:00Z'),
    resolvedAt: null,
    resolvedBy: null,
  },
  {
    id: 'anomaly-3',
    tenantId: 'tenant-456',
    date: new Date('2024-01-18'),
    service: 'Amazon S3',
    provider: 'aws' as const,
    resourceId: null,
    expectedCost: 25.0,
    actualCost: 40.0,
    deviation: 60.0,
    severity: 'low' as const,
    status: 'resolved' as const,
    rootCause: {
      type: 'manual_resolution',
      description: 'Planned data migration',
      resolvedBy: 'user-123',
      timestamp: '2024-01-19T10:00:00Z',
    },
    detectedAt: new Date('2024-01-19T02:00:00Z'),
    resolvedAt: new Date('2024-01-19T10:00:00Z'),
    resolvedBy: 'user-123',
  },
];

/**
 * Mock user for authentication
 */
export const mockUser = {
  id: 'user-123',
  tenantId: 'tenant-456',
  email: 'admin@acme-corp.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin' as const,
  status: 'active' as const,
  emailVerified: true,
  twoFactorEnabled: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Mock JWT token for authentication
 */
export const mockJWTToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsInRlbmFudElkIjoidGVuYW50LTQ1NiIsImVtYWlsIjoiYWRtaW5AYWNtZS1jb3JwLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcwNDEwMDAwMCwiZXhwIjoxNzA0MTAzNjAwfQ.signature';
