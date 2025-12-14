/**
 * Unit Tests: AWS Cost Explorer Service
 *
 * This test suite verifies the AWSCostExplorerService functionality with mocked AWS SDK.
 * Tests cover credential validation, cost data retrieval, filtering, aggregation, and error handling.
 */

import { AWSCostExplorerService } from '../cost-explorer.service';
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';

// Mock AWS SDK
jest.mock('@aws-sdk/client-cost-explorer');

describe('AWSCostExplorerService', () => {
  let service: AWSCostExplorerService;
  let mockSend: jest.Mock;

  beforeEach(() => {
    // Create mock send function
    mockSend = jest.fn();

    // Mock CostExplorerClient constructor
    (CostExplorerClient as jest.MockedClass<typeof CostExplorerClient>).mockImplementation(() => ({
      send: mockSend,
    } as any));

    // Create service instance with test credentials
    service = new AWSCostExplorerService({
      provider: 'aws',
      awsAccessKeyId: 'test-access-key-id',
      awsSecretAccessKey: 'test-secret-access-key',
      awsRegion: 'us-east-1',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // Constructor Tests
  // ============================================================

  describe('Constructor', () => {
    it('should initialize client correctly with valid credentials', () => {
      expect(CostExplorerClient).toHaveBeenCalledWith({
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-access-key-id',
          secretAccessKey: 'test-secret-access-key',
        },
      });
    });

    it('should throw error if accessKeyId is missing', () => {
      expect(() => {
        new AWSCostExplorerService({
          provider: 'aws',
          awsAccessKeyId: '',
          awsSecretAccessKey: 'test-secret',
          awsRegion: 'us-east-1',
        });
      }).toThrow('AWS credentials (accessKeyId, secretAccessKey) are required');
    });

    it('should throw error if secretAccessKey is missing', () => {
      expect(() => {
        new AWSCostExplorerService({
          provider: 'aws',
          awsAccessKeyId: 'test-key',
          awsSecretAccessKey: '',
          awsRegion: 'us-east-1',
        });
      }).toThrow('AWS credentials (accessKeyId, secretAccessKey) are required');
    });

    it('should use default region if not provided', () => {
      new AWSCostExplorerService({
        provider: 'aws',
        awsAccessKeyId: 'test-key',
        awsSecretAccessKey: 'test-secret',
      });

      expect(CostExplorerClient).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'us-east-1', // Default region
        })
      );
    });
  });

  // ============================================================
  // Credential Validation Tests
  // ============================================================

  describe('validateCredentials', () => {
    it('should return true with valid credentials', async () => {
      // Arrange
      mockSend.mockResolvedValue({
        ResultsByTime: [],
      });

      // Act
      const result = await service.validateCredentials();

      // Assert
      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(expect.any(GetCostAndUsageCommand));
    });

    it('should return false with invalid credentials', async () => {
      // Arrange
      mockSend.mockRejectedValue({
        name: 'UnrecognizedClientException',
        message: 'The security token included in the request is invalid',
      });

      // Act
      const result = await service.validateCredentials();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false with InvalidClientTokenId error', async () => {
      // Arrange
      mockSend.mockRejectedValue({
        name: 'InvalidClientTokenId',
        message: 'The security token included in the request is invalid',
      });

      // Act
      const result = await service.validateCredentials();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false with AccessDeniedException', async () => {
      // Arrange
      mockSend.mockRejectedValue({
        name: 'AccessDeniedException',
        message: 'User is not authorized to perform: ce:GetCostAndUsage',
      });

      // Act
      const result = await service.validateCredentials();

      // Assert
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // getCosts Tests
  // ============================================================

  describe('getCosts', () => {
    it('should transform AWS response to CloudCostData[]', async () => {
      // Arrange
      const mockAWSResponse = {
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
            ],
          },
        ],
      };
      mockSend.mockResolvedValue(mockAWSResponse);

      // Act
      const result = await service.getCosts({
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        service: 'Amazon EC2',
        amount: 150.50,
        currency: 'USD',
      });
      expect(result[1]).toMatchObject({
        service: 'Amazon RDS',
        amount: 75.25,
        currency: 'USD',
      });
      expect(mockSend).toHaveBeenCalledWith(expect.any(GetCostAndUsageCommand));
    });

    it('should filter by service correctly', async () => {
      // Arrange
      const mockAWSResponse = {
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
            ],
          },
        ],
      };
      mockSend.mockResolvedValue(mockAWSResponse);

      // Act
      const result = await service.getCosts(
        {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        { service: 'Amazon EC2' }
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].service).toBe('Amazon EC2');
      expect(mockSend).toHaveBeenCalled();
    });

    it('should filter by region correctly', async () => {
      // Arrange
      mockSend.mockResolvedValue({ ResultsByTime: [] });

      // Act
      const result = await service.getCosts(
        {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        { region: 'us-west-2' }
      );

      // Assert
      expect(result).toEqual([]);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should exclude zero-cost entries', async () => {
      // Arrange
      const mockAWSResponse = {
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
                Keys: ['Amazon S3'],
                Metrics: {
                  UnblendedCost: {
                    Amount: '0',
                    Unit: 'USD',
                  },
                },
              },
            ],
          },
        ],
      };
      mockSend.mockResolvedValue(mockAWSResponse);

      // Act
      const result = await service.getCosts({
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].service).toBe('Amazon EC2');
    });
  });

  // ============================================================
  // getCostsByService Tests
  // ============================================================

  describe('getCostsByService', () => {
    it('should group costs by service correctly', async () => {
      // Arrange
      const mockAWSResponse = {
        ResultsByTime: [
          {
            TimePeriod: { Start: '2024-01-01', End: '2024-02-01' },
            Groups: [
              {
                Keys: ['Amazon EC2'],
                Metrics: {
                  UnblendedCost: {
                    Amount: '1000',
                    Unit: 'USD',
                  },
                },
              },
              {
                Keys: ['Amazon RDS'],
                Metrics: {
                  UnblendedCost: {
                    Amount: '500',
                    Unit: 'USD',
                  },
                },
              },
            ],
          },
        ],
      };
      mockSend.mockResolvedValue(mockAWSResponse);

      // Act
      const result = await service.getCostsByService({
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        service: 'Amazon EC2',
        totalCost: 1000,
        currency: 'USD',
      });
    });

    it('should calculate percentages correctly', async () => {
      // Arrange
      const mockAWSResponse = {
        ResultsByTime: [
          {
            TimePeriod: { Start: '2024-01-01', End: '2024-02-01' },
            Groups: [
              {
                Keys: ['Amazon EC2'],
                Metrics: {
                  UnblendedCost: {
                    Amount: '750',
                    Unit: 'USD',
                  },
                },
              },
              {
                Keys: ['Amazon RDS'],
                Metrics: {
                  UnblendedCost: {
                    Amount: '250',
                    Unit: 'USD',
                  },
                },
              },
            ],
          },
        ],
      };
      mockSend.mockResolvedValue(mockAWSResponse);

      // Act
      const result = await service.getCostsByService({
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(result[0].percentage).toBe(75); // 750/1000 * 100
      expect(result[1].percentage).toBe(25); // 250/1000 * 100
    });

    it('should sort by cost descending', async () => {
      // Arrange
      const mockAWSResponse = {
        ResultsByTime: [
          {
            TimePeriod: { Start: '2024-01-01', End: '2024-02-01' },
            Groups: [
              {
                Keys: ['Amazon S3'],
                Metrics: {
                  UnblendedCost: {
                    Amount: '100',
                    Unit: 'USD',
                  },
                },
              },
              {
                Keys: ['Amazon EC2'],
                Metrics: {
                  UnblendedCost: {
                    Amount: '500',
                    Unit: 'USD',
                  },
                },
              },
              {
                Keys: ['Amazon RDS'],
                Metrics: {
                  UnblendedCost: {
                    Amount: '300',
                    Unit: 'USD',
                  },
                },
              },
            ],
          },
        ],
      };
      mockSend.mockResolvedValue(mockAWSResponse);

      // Act
      const result = await service.getCostsByService({
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(result[0].service).toBe('Amazon EC2'); // Highest cost
      expect(result[1].service).toBe('Amazon RDS');
      expect(result[2].service).toBe('Amazon S3'); // Lowest cost
    });
  });

  // ============================================================
  // getCostTrends Tests
  // ============================================================

  describe('getCostTrends', () => {
    it('should return trends with daily granularity', async () => {
      // Arrange
      const mockAWSResponse = {
        ResultsByTime: [
          {
            TimePeriod: { Start: '2024-01-01', End: '2024-01-02' },
            Total: {
              UnblendedCost: {
                Amount: '100',
                Unit: 'USD',
              },
            },
          },
          {
            TimePeriod: { Start: '2024-01-02', End: '2024-01-03' },
            Total: {
              UnblendedCost: {
                Amount: '150',
                Unit: 'USD',
              },
            },
          },
        ],
      };
      mockSend.mockResolvedValue(mockAWSResponse);

      // Act
      const result = await service.getCostTrends(
        {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        'daily'
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].totalCost).toBe(100);
      expect(result[1].totalCost).toBe(150);
      expect(result[0].currency).toBe('USD');
    });

    it('should return trends with weekly granularity', async () => {
      // Arrange
      const mockAWSResponse = {
        ResultsByTime: [
          {
            TimePeriod: { Start: '2024-01-01', End: '2024-01-08' },
            Total: {
              UnblendedCost: {
                Amount: '700',
                Unit: 'USD',
              },
            },
          },
        ],
      };
      mockSend.mockResolvedValue(mockAWSResponse);

      // Act
      const result = await service.getCostTrends(
        {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        'weekly'
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].totalCost).toBe(700);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should return trends with monthly granularity', async () => {
      // Arrange
      const mockAWSResponse = {
        ResultsByTime: [
          {
            TimePeriod: { Start: '2024-01-01', End: '2024-02-01' },
            Total: {
              UnblendedCost: {
                Amount: '3000',
                Unit: 'USD',
              },
            },
          },
        ],
      };
      mockSend.mockResolvedValue(mockAWSResponse);

      // Act
      const result = await service.getCostTrends(
        {
          start: new Date('2024-01-01'),
          end: new Date('2024-03-31'),
        },
        'monthly'
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].totalCost).toBe(3000);
      expect(mockSend).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Retry Logic Tests
  // ============================================================

  describe('Retry Logic', () => {
    it('should retry on ThrottlingException', async () => {
      // Arrange
      mockSend
        .mockRejectedValueOnce({
          name: 'ThrottlingException',
          message: 'Rate exceeded',
        })
        .mockResolvedValueOnce({
          ResultsByTime: [],
        });

      // Act
      await service.getCosts({
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 Too Many Requests', async () => {
      // Arrange
      mockSend
        .mockRejectedValueOnce({
          name: 'TooManyRequestsException',
          $metadata: { httpStatusCode: 429 },
        })
        .mockResolvedValueOnce({
          ResultsByTime: [],
        });

      // Act
      await service.getCosts({
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should retry on 503 Service Unavailable', async () => {
      // Arrange
      mockSend
        .mockRejectedValueOnce({
          name: 'ServiceUnavailableException',
          $metadata: { httpStatusCode: 503 },
        })
        .mockResolvedValueOnce({
          ResultsByTime: [],
        });

      // Act
      await service.getCosts({
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      // Assert
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries exceeded', async () => {
      // Arrange
      const error = new Error('Rate exceeded');
      (error as any).name = 'ThrottlingException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(
        service.getCosts({
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        })
      ).rejects.toThrow('Rate exceeded');

      // Should retry 3 times + initial attempt = 4 calls
      expect(mockSend).toHaveBeenCalledTimes(4);
    });

    it('should not retry on non-retryable errors', async () => {
      // Arrange
      const error = new Error('Invalid parameter');
      (error as any).name = 'ValidationException';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(
        service.getCosts({
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        })
      ).rejects.toThrow('Invalid parameter');

      // Should only attempt once (no retries)
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================

  describe('Error Handling', () => {
    it('should handle invalid credentials error', async () => {
      // Arrange
      const error = new Error('The security token included in the request is invalid');
      (error as any).name = 'UnrecognizedClientException';
      mockSend.mockRejectedValue(error);

      // Act
      const result = await service.validateCredentials();

      // Assert
      expect(result).toBe(false);
    });

    it('should handle network errors with retries', async () => {
      // Arrange
      const error = new Error('Connection reset by peer');
      (error as any).name = 'NetworkingError';
      (error as any).code = 'ECONNRESET';
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(
        service.getCosts({
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        })
      ).rejects.toThrow('Connection reset by peer');

      // Should retry network errors
      expect(mockSend).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });
  });

  // ============================================================
  // Asset Discovery Methods (Should Throw)
  // ============================================================

  describe('Asset Discovery Methods', () => {
    it('should throw error when calling discoverAssets', async () => {
      await expect(service.discoverAssets()).rejects.toThrow(
        'Asset discovery not implemented in Cost Explorer service'
      );
    });

    it('should throw error when calling getAssetDetails', async () => {
      await expect(service.getAssetDetails('i-123')).rejects.toThrow(
        'Asset details not implemented in Cost Explorer service'
      );
    });
  });

  // ============================================================
  // Security Scanning Methods (Should Throw)
  // ============================================================

  describe('Security Scanning Methods', () => {
    it('should throw error when calling scanForMisconfigurations', async () => {
      await expect(service.scanForMisconfigurations()).rejects.toThrow(
        'Security scanning not implemented in Cost Explorer service'
      );
    });

    it('should throw error when calling getSecurityFindings', async () => {
      await expect(service.getSecurityFindings('i-123')).rejects.toThrow(
        'Security findings not implemented in Cost Explorer service'
      );
    });
  });
});
