/**
 * AWS Mock Helpers
 *
 * Mock data factories for AWS SDK responses. These helpers generate realistic
 * AWS API responses for testing AWS integration services without making actual API calls.
 */

import type {
  GetCostAndUsageCommandOutput,
  ResultByTime,
  Group,
} from '@aws-sdk/client-cost-explorer';
import type {
  DescribeInstancesCommandOutput,
  Instance,
  Reservation,
  DescribeRegionsCommandOutput,
  Region,
} from '@aws-sdk/client-ec2';

/**
 * Creates a mock AWS Cost Explorer GetCostAndUsage response
 *
 * @example
 * const response = mockAWSCostExplorerResponse({
 *   startDate: '2025-12-01',
 *   endDate: '2025-12-02',
 *   amount: '250.00'
 * });
 */
export const mockAWSCostExplorerResponse = (options: {
  startDate?: string;
  endDate?: string;
  amount?: string;
  service?: string;
} = {}): GetCostAndUsageCommandOutput => {
  const {
    startDate = '2025-12-01',
    endDate = '2025-12-02',
    amount = '123.45',
    service = 'Amazon Elastic Compute Cloud - Compute',
  } = options;

  return {
    $metadata: {
      httpStatusCode: 200,
      requestId: 'mock-request-id',
      attempts: 1,
      totalRetryDelay: 0,
    },
    ResultsByTime: [
      {
        TimePeriod: {
          Start: startDate,
          End: endDate,
        },
        Total: {
          UnblendedCost: {
            Amount: amount,
            Unit: 'USD',
          },
        },
        Groups: [
          {
            Keys: [service],
            Metrics: {
              UnblendedCost: {
                Amount: amount,
                Unit: 'USD',
              },
            },
          },
        ],
        Estimated: false,
      },
    ],
    DimensionValueAttributes: [],
  };
};

/**
 * Creates a mock AWS Cost Explorer response with multiple services
 */
export const mockAWSCostExplorerMultiServiceResponse = (
  services: Array<{ name: string; amount: string }>
): GetCostAndUsageCommandOutput => {
  const groups: Group[] = services.map((svc) => ({
    Keys: [svc.name],
    Metrics: {
      UnblendedCost: {
        Amount: svc.amount,
        Unit: 'USD',
      },
    },
  }));

  const totalAmount = services
    .reduce((sum, svc) => sum + parseFloat(svc.amount), 0)
    .toFixed(2);

  return {
    $metadata: {
      httpStatusCode: 200,
      requestId: 'mock-request-id',
      attempts: 1,
      totalRetryDelay: 0,
    },
    ResultsByTime: [
      {
        TimePeriod: {
          Start: '2025-12-01',
          End: '2025-12-02',
        },
        Total: {
          UnblendedCost: {
            Amount: totalAmount,
            Unit: 'USD',
          },
        },
        Groups: groups,
        Estimated: false,
      },
    ],
  };
};

/**
 * Creates a mock AWS Cost Explorer response with multiple time periods
 */
export const mockAWSCostExplorerTrendResponse = (
  days: number,
  baseAmount: number = 100
): GetCostAndUsageCommandOutput => {
  const resultsByTime: ResultByTime[] = Array.from({ length: days }, (_, i) => {
    const date = new Date('2025-12-01');
    date.setDate(date.getDate() + i);

    const startDate = date.toISOString().split('T')[0];
    date.setDate(date.getDate() + 1);
    const endDate = date.toISOString().split('T')[0];

    const amount = (baseAmount + i * 10).toFixed(2);

    return {
      TimePeriod: {
        Start: startDate,
        End: endDate,
      },
      Total: {
        UnblendedCost: {
          Amount: amount,
          Unit: 'USD',
        },
      },
      Groups: [],
      Estimated: false,
    };
  });

  return {
    $metadata: {
      httpStatusCode: 200,
      requestId: 'mock-request-id',
      attempts: 1,
      totalRetryDelay: 0,
    },
    ResultsByTime: resultsByTime,
  };
};

/**
 * Creates an empty AWS Cost Explorer response (no results)
 */
export const mockAWSCostExplorerEmptyResponse = (): GetCostAndUsageCommandOutput => {
  return {
    $metadata: {
      httpStatusCode: 200,
      requestId: 'mock-request-id',
      attempts: 1,
      totalRetryDelay: 0,
    },
    ResultsByTime: [],
  };
};

/**
 * Creates a mock AWS EC2 Instance
 */
export const mockAWSEC2Instance = (overrides: Partial<Instance> = {}): Instance => {
  return {
    InstanceId: 'i-1234567890abcdef0',
    InstanceType: 't3.medium',
    State: {
      Code: 16,
      Name: 'running',
    },
    Placement: {
      AvailabilityZone: 'us-east-1a',
    },
    VpcId: 'vpc-12345678',
    SubnetId: 'subnet-12345678',
    SecurityGroups: [
      {
        GroupId: 'sg-12345678',
        GroupName: 'default',
      },
    ],
    PublicIpAddress: '54.123.45.67',
    PrivateIpAddress: '10.0.1.100',
    Monitoring: {
      State: 'disabled',
    },
    Platform: undefined, // undefined means Linux
    ImageId: 'ami-12345678',
    KeyName: 'production-key',
    Architecture: 'x86_64',
    RootDeviceType: 'ebs',
    VirtualizationType: 'hvm',
    Hypervisor: 'xen',
    LaunchTime: new Date('2024-01-15T10:00:00.000Z'),
    Tags: [
      { Key: 'Name', Value: 'web-server-01' },
      { Key: 'Environment', Value: 'production' },
    ],
    ...overrides,
  };
};

/**
 * Creates a mock AWS EC2 DescribeInstances response
 */
export const mockAWSEC2DescribeInstancesResponse = (
  instances: Instance[]
): DescribeInstancesCommandOutput => {
  const reservations: Reservation[] = instances.map((instance) => ({
    Instances: [instance],
    ReservationId: `r-${Math.random().toString(36).substring(7)}`,
    OwnerId: '123456789012',
  }));

  return {
    $metadata: {
      httpStatusCode: 200,
      requestId: 'mock-request-id',
      attempts: 1,
      totalRetryDelay: 0,
    },
    Reservations: reservations,
  };
};

/**
 * Creates an empty AWS EC2 DescribeInstances response
 */
export const mockAWSEC2EmptyResponse = (): DescribeInstancesCommandOutput => {
  return {
    $metadata: {
      httpStatusCode: 200,
      requestId: 'mock-request-id',
      attempts: 1,
      totalRetryDelay: 0,
    },
    Reservations: [],
  };
};

/**
 * Creates a mock AWS EC2 DescribeRegions response
 */
export const mockAWSEC2DescribeRegionsResponse = (
  regions: string[] = ['us-east-1', 'us-west-2', 'eu-west-1']
): DescribeRegionsCommandOutput => {
  const regionObjects: Region[] = regions.map((region) => ({
    RegionName: region,
    Endpoint: `ec2.${region}.amazonaws.com`,
    OptInStatus: 'opted-in',
  }));

  return {
    $metadata: {
      httpStatusCode: 200,
      requestId: 'mock-request-id',
      attempts: 1,
      totalRetryDelay: 0,
    },
    Regions: regionObjects,
  };
};

/**
 * Creates a mock AWS API error
 */
export const mockAWSError = (
  name: string,
  message: string,
  statusCode?: number
): Error & { name: string; $metadata?: { httpStatusCode?: number } } => {
  const error = new Error(message) as Error & {
    name: string;
    $metadata?: { httpStatusCode?: number };
  };
  error.name = name;

  if (statusCode) {
    error.$metadata = {
      httpStatusCode: statusCode,
    };
  }

  return error;
};

/**
 * Common AWS error scenarios
 */
export const AWS_ERRORS = {
  INVALID_CREDENTIALS: mockAWSError(
    'UnrecognizedClientException',
    'The security token included in the request is invalid.'
  ),
  ACCESS_DENIED: mockAWSError(
    'AccessDeniedException',
    'User is not authorized to perform: ce:GetCostAndUsage'
  ),
  THROTTLING: mockAWSError('ThrottlingException', 'Rate exceeded', 429),
  TOO_MANY_REQUESTS: mockAWSError('TooManyRequestsException', 'Too many requests', 429),
  SERVICE_UNAVAILABLE: mockAWSError('ServiceUnavailableException', 'Service temporarily unavailable', 503),
  NETWORK_ERROR: mockAWSError('NetworkingError', 'Network connection failed'),
  INVALID_PARAMETER: mockAWSError('InvalidParameterValue', 'Invalid parameter value'),
  INSTANCE_NOT_FOUND: mockAWSError('InvalidInstanceID.NotFound', 'The instance ID does not exist'),
};
