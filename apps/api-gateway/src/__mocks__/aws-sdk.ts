/**
 * AWS SDK Mock
 *
 * This mock provides reusable AWS SDK mocks for testing.
 * Prevents actual AWS API calls during tests.
 */

import { mockDeep, mockReset } from 'jest-mock-extended';
import type { CostExplorerClient } from '@aws-sdk/client-cost-explorer';
import type { EC2Client } from '@aws-sdk/client-ec2';
import type { RDSClient } from '@aws-sdk/client-rds';

/**
 * Mock AWS Cost Explorer Client
 */
export const mockCostExplorerClient = mockDeep<CostExplorerClient>();

/**
 * Mock AWS EC2 Client
 */
export const mockEC2Client = mockDeep<EC2Client>();

/**
 * Mock AWS RDS Client
 */
export const mockRDSClient = mockDeep<RDSClient>();

/**
 * Reset all AWS SDK mocks before each test
 */
beforeEach(() => {
  mockReset(mockCostExplorerClient);
  mockReset(mockEC2Client);
  mockReset(mockRDSClient);
});

/**
 * Mock AWS Cost Explorer Response
 */
export const mockCostExplorerResponse = {
  ResultsByTime: [
    {
      TimePeriod: {
        Start: '2024-01-01',
        End: '2024-01-02',
      },
      Total: {
        UnblendedCost: {
          Amount: '100.50',
          Unit: 'USD',
        },
      },
      Groups: [],
    },
  ],
};

/**
 * Mock EC2 Instances Response
 */
export const mockEC2InstancesResponse = {
  Reservations: [
    {
      Instances: [
        {
          InstanceId: 'i-1234567890abcdef0',
          InstanceType: 't3.medium',
          State: { Name: 'running' },
          LaunchTime: new Date('2024-01-01'),
          Tags: [
            { Key: 'Name', Value: 'test-instance' },
            { Key: 'Environment', Value: 'production' },
          ],
        },
      ],
    },
  ],
};

/**
 * Mock RDS Instances Response
 */
export const mockRDSInstancesResponse = {
  DBInstances: [
    {
      DBInstanceIdentifier: 'test-db-instance',
      DBInstanceClass: 'db.t3.medium',
      Engine: 'postgres',
      DBInstanceStatus: 'available',
      InstanceCreateTime: new Date('2024-01-01'),
    },
  ],
};

export default {
  mockCostExplorerClient,
  mockEC2Client,
  mockRDSClient,
  mockCostExplorerResponse,
  mockEC2InstancesResponse,
  mockRDSInstancesResponse,
};
