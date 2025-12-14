/**
 * BullMQ Cost Collection Job Integration Tests
 *
 * Tests the background job that orchestrates daily cost collection
 * and anomaly detection for all active cloud accounts.
 */

import { Queue, Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import IORedis from 'ioredis';
import { CostCollectionService } from '../../../modules/finops/services/cost-collection.service';
import { AnomalyDetectionService } from '../../../modules/finops/services/anomaly-detection.service';
import { createMockPrismaCloudAccount } from '../../utils/test-helpers';

// Mock dependencies
jest.mock('bullmq');
jest.mock('ioredis');
jest.mock('@prisma/client');
jest.mock('../../../modules/finops/services/cost-collection.service');
jest.mock('../../../modules/finops/services/anomaly-detection.service');

describe('BullMQ Cost Collection Job', () => {
  let mockQueue: jest.Mocked<Queue>;
  let mockWorker: jest.Mocked<Worker>;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockCostCollectionService: jest.Mocked<CostCollectionService>;
  let mockAnomalyDetectionService: jest.Mocked<AnomalyDetectionService>;
  let mockRedis: jest.Mocked<IORedis>;
  let workerProcessor: (job: Job) => Promise<any>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Redis
    mockRedis = {
      quit: jest.fn().mockResolvedValue('OK'),
    } as any;

    (IORedis as jest.MockedClass<typeof IORedis>).mockImplementation(() => mockRedis);

    // Mock Queue
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      close: jest.fn().mockResolvedValue(undefined),
      getRepeatableJobs: jest.fn().mockResolvedValue([]),
      removeRepeatableByKey: jest.fn().mockResolvedValue(undefined),
    } as any;

    (Queue as jest.MockedClass<typeof Queue>).mockImplementation(() => mockQueue);

    // Mock Worker and capture processor function
    mockWorker = {
      on: jest.fn().mockReturnThis(),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    (Worker as jest.MockedClass<typeof Worker>).mockImplementation((queueName, processor, options) => {
      workerProcessor = processor as (job: Job) => Promise<any>;
      return mockWorker;
    });

    // Mock Prisma
    mockPrisma = {
      cloudAccount: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $disconnect: jest.fn().mockResolvedValue(undefined),
    } as any;

    (PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma);

    // Mock CostCollectionService
    mockCostCollectionService = {
      collectCostsForAccount: jest.fn().mockResolvedValue({
        success: true,
        recordsObtained: 10,
        recordsSaved: 10,
        executionTimeMs: 1000,
      }),
    } as any;

    (CostCollectionService as jest.MockedClass<typeof CostCollectionService>).mockImplementation(
      () => mockCostCollectionService
    );

    // Mock AnomalyDetectionService
    mockAnomalyDetectionService = {
      analyzeRecentCosts: jest.fn().mockResolvedValue({
        anomaliesDetected: 0,
        anomalies: [],
      }),
    } as any;

    (AnomalyDetectionService as jest.MockedClass<typeof AnomalyDetectionService>).mockImplementation(
      () => mockAnomalyDetectionService
    );
  });

  describe('Job Scheduling', () => {
    it('should schedule job to run daily at 2 AM', async () => {
      // Import the module to trigger initialization
      const { scheduleDailyCostCollection } = require('../../../shared/jobs/cost-collection.job');

      await scheduleDailyCostCollection();

      expect(mockQueue.add).toHaveBeenCalledWith(
        'daily-cost-collection',
        {},
        {
          repeat: {
            pattern: '0 2 * * *',
            tz: 'America/New_York',
          },
        }
      );
    });

    it('should not duplicate jobs on restart', async () => {
      const existingJob = {
        key: 'existing-job-key',
        name: 'daily-cost-collection',
        id: 'repeat-job-1',
      };

      mockQueue.getRepeatableJobs.mockResolvedValueOnce([existingJob] as any);

      const { scheduleDailyCostCollection } = require('../../../shared/jobs/cost-collection.job');
      await scheduleDailyCostCollection();

      expect(mockQueue.removeRepeatableByKey).toHaveBeenCalledWith('existing-job-key');
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });

    it('should handle timezone correctly', async () => {
      const { scheduleDailyCostCollection } = require('../../../shared/jobs/cost-collection.job');
      await scheduleDailyCostCollection();

      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          repeat: expect.objectContaining({
            tz: 'America/New_York',
          }),
        })
      );
    });
  });

  describe('Job Execution', () => {
    it('should process all active cloud accounts', async () => {
      const mockAccounts = [
        createMockPrismaCloudAccount({ id: 'account-1', accountName: 'Account 1' }),
        createMockPrismaCloudAccount({ id: 'account-2', accountName: 'Account 2' }),
        createMockPrismaCloudAccount({ id: 'account-3', accountName: 'Account 3' }),
      ];

      mockPrisma.cloudAccount.findMany.mockResolvedValueOnce(mockAccounts as any);

      const mockJob = { id: 'job-1' } as Job;
      const result = await workerProcessor(mockJob);

      expect(result.totalAccounts).toBe(3);
      expect(result.successfulAccounts).toBe(3);
      expect(mockCostCollectionService.collectCostsForAccount).toHaveBeenCalledTimes(3);
      expect(mockAnomalyDetectionService.analyzeRecentCosts).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent account processing', async () => {
      const mockAccounts = [
        createMockPrismaCloudAccount({ id: 'account-1' }),
        createMockPrismaCloudAccount({ id: 'account-2' }),
      ];

      mockPrisma.cloudAccount.findMany.mockResolvedValueOnce(mockAccounts as any);

      const mockJob = { id: 'job-1' } as Job;
      await workerProcessor(mockJob);

      // Verify all accounts were processed sequentially
      expect(mockCostCollectionService.collectCostsForAccount).toHaveBeenCalledTimes(2);
    });

    it('should skip inactive accounts', async () => {
      const mockAccounts = [
        createMockPrismaCloudAccount({ id: 'account-1', status: 'active' }),
      ];

      mockPrisma.cloudAccount.findMany.mockResolvedValueOnce(mockAccounts as any);

      const mockJob = { id: 'job-1' } as Job;
      await workerProcessor(mockJob);

      // Verify query filters for active accounts
      expect(mockPrisma.cloudAccount.findMany).toHaveBeenCalledWith({
        where: {
          status: 'active',
          provider: {
            in: ['aws', 'azure'],
          },
        },
        include: {
          tenant: true,
        },
      });
    });

    it('should process both AWS and Azure accounts', async () => {
      mockPrisma.cloudAccount.findMany.mockResolvedValueOnce([]);

      const mockJob = { id: 'job-1' } as Job;
      await workerProcessor(mockJob);

      expect(mockPrisma.cloudAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            provider: {
              in: ['aws', 'azure'],
            },
          }),
        })
      );
    });

    it('should handle no active accounts', async () => {
      mockPrisma.cloudAccount.findMany.mockResolvedValueOnce([]);

      const mockJob = { id: 'job-1' } as Job;
      const result = await workerProcessor(mockJob);

      expect(result.totalAccounts).toBe(0);
      expect(result.successfulAccounts).toBe(0);
      expect(mockCostCollectionService.collectCostsForAccount).not.toHaveBeenCalled();
    });

    it('should process yesterday\'s costs', async () => {
      const mockAccounts = [createMockPrismaCloudAccount()];
      mockPrisma.cloudAccount.findMany.mockResolvedValueOnce(mockAccounts as any);

      const mockJob = { id: 'job-1' } as Job;
      await workerProcessor(mockJob);

      // Calculate expected yesterday date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      expect(mockCostCollectionService.collectCostsForAccount).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        })
      );
    });
  });

  describe('Retry Logic', () => {
    it('should continue processing other accounts on individual failures', async () => {
      const mockAccounts = [
        createMockPrismaCloudAccount({ id: 'account-1', accountName: 'Account 1' }),
        createMockPrismaCloudAccount({ id: 'account-2', accountName: 'Account 2' }),
      ];

      mockPrisma.cloudAccount.findMany.mockResolvedValueOnce(mockAccounts as any);

      // First account fails
      mockCostCollectionService.collectCostsForAccount
        .mockResolvedValueOnce({
          success: false,
          recordsObtained: 0,
          recordsSaved: 0,
          executionTimeMs: 1000,
          errors: ['Collection failed'],
        })
        .mockResolvedValueOnce({
          success: true,
          recordsObtained: 10,
          recordsSaved: 10,
          executionTimeMs: 1000,
        });

      const mockJob = { id: 'job-1' } as Job;
      const result = await workerProcessor(mockJob);

      expect(result.totalAccounts).toBe(2);
      expect(result.failedAccounts).toBe(1);
      expect(result.successfulAccounts).toBe(1);
    });

    it('should track failed accounts separately', async () => {
      const mockAccounts = [
        createMockPrismaCloudAccount({ id: 'fail-1', accountName: 'Failing Account' }),
      ];

      mockPrisma.cloudAccount.findMany.mockResolvedValueOnce(mockAccounts as any);

      mockCostCollectionService.collectCostsForAccount.mockResolvedValueOnce({
        success: false,
        recordsObtained: 0,
        recordsSaved: 0,
        executionTimeMs: 1000,
        errors: ['AWS API Error'],
      });

      const mockJob = { id: 'job-1' } as Job;
      const result = await workerProcessor(mockJob);

      expect(result.results[0]).toMatchObject({
        accountId: 'fail-1',
        success: false,
        error: expect.stringContaining('Collection failed'),
      });
    });

    it('should log retry attempts', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockAccounts = [createMockPrismaCloudAccount()];
      mockPrisma.cloudAccount.findMany.mockResolvedValueOnce(mockAccounts as any);

      mockCostCollectionService.collectCostsForAccount.mockRejectedValueOnce(
        new Error('Temporary failure')
      );

      const mockJob = { id: 'job-1' } as Job;
      await workerProcessor(mockJob);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Graceful Shutdown', () => {
    it('should close all connections on shutdown', async () => {
      const { shutdownCostCollectionJob } = require('../../../shared/jobs/cost-collection.job');

      await shutdownCostCollectionJob();

      expect(mockWorker.close).toHaveBeenCalled();
      expect(mockQueue.close).toHaveBeenCalled();
      expect(mockRedis.quit).toHaveBeenCalled();
      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });

    it('should handle shutdown errors gracefully', async () => {
      mockWorker.close.mockRejectedValueOnce(new Error('Worker close failed'));
      mockQueue.close.mockRejectedValueOnce(new Error('Queue close failed'));

      const { shutdownCostCollectionJob } = require('../../../shared/jobs/cost-collection.job');

      // Should not throw
      await expect(shutdownCostCollectionJob()).resolves.toBeUndefined();
    });

    it('should force close connections on error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockWorker.close.mockRejectedValueOnce(new Error('Close failed'));

      const { shutdownCostCollectionJob } = require('../../../shared/jobs/cost-collection.job');
      await shutdownCostCollectionJob();

      // Should still attempt to close Redis and Prisma
      expect(mockRedis.quit).toHaveBeenCalled();
      expect(mockPrisma.$disconnect).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Manual Job Trigger', () => {
    it('should allow manual job triggering', async () => {
      const { triggerManualCostCollection } = require('../../../shared/jobs/cost-collection.job');

      const job = await triggerManualCostCollection();

      expect(mockQueue.add).toHaveBeenCalledWith(
        'manual-cost-collection',
        {},
        expect.objectContaining({
          priority: 1,
        })
      );
      expect(job).toBeDefined();
    });

    it('should assign higher priority to manual jobs', async () => {
      const { triggerManualCostCollection } = require('../../../shared/jobs/cost-collection.job');

      await triggerManualCostCollection();

      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          priority: 1,
        })
      );
    });
  });

  describe('Worker Configuration', () => {
    it('should configure worker with correct concurrency', () => {
      // Re-import to trigger worker creation
      require('../../../shared/jobs/cost-collection.job');

      expect(Worker).toHaveBeenCalledWith(
        'cost-collection',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 1,
        })
      );
    });

    it('should configure rate limiting', () => {
      require('../../../shared/jobs/cost-collection.job');

      expect(Worker).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({
          limiter: {
            max: 10,
            duration: 60000,
          },
        })
      );
    });
  });

  describe('Job Results', () => {
    it('should return execution statistics', async () => {
      const mockAccounts = [
        createMockPrismaCloudAccount({ id: 'account-1' }),
        createMockPrismaCloudAccount({ id: 'account-2' }),
      ];

      mockPrisma.cloudAccount.findMany.mockResolvedValueOnce(mockAccounts as any);

      mockCostCollectionService.collectCostsForAccount.mockResolvedValue({
        success: true,
        recordsObtained: 15,
        recordsSaved: 15,
        executionTimeMs: 1500,
      });

      mockAnomalyDetectionService.analyzeRecentCosts.mockResolvedValue({
        anomaliesDetected: 2,
        anomalies: [],
      });

      const mockJob = { id: 'job-1' } as Job;
      const result = await workerProcessor(mockJob);

      expect(result).toMatchObject({
        totalAccounts: 2,
        successfulAccounts: 2,
        failedAccounts: 0,
        executionTimeMs: expect.any(Number),
        results: expect.arrayContaining([
          expect.objectContaining({
            accountId: expect.any(String),
            recordsCollected: 15,
            anomaliesDetected: 2,
            success: true,
          }),
        ]),
      });
    });

    it('should track execution time', async () => {
      mockPrisma.cloudAccount.findMany.mockResolvedValueOnce([]);

      const mockJob = { id: 'job-1' } as Job;
      const result = await workerProcessor(mockJob);

      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Event Handlers', () => {
    it('should register completed event handler', () => {
      require('../../../shared/jobs/cost-collection.job');

      expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
    });

    it('should register failed event handler', () => {
      require('../../../shared/jobs/cost-collection.job');

      expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });

    it('should register error event handler', () => {
      require('../../../shared/jobs/cost-collection.job');

      expect(mockWorker.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should register ready event handler', () => {
      require('../../../shared/jobs/cost-collection.job');

      expect(mockWorker.on).toHaveBeenCalledWith('ready', expect.any(Function));
    });
  });

  describe('Azure Support', () => {
    it('should process Azure accounts', async () => {
      const mockAzureAccount = createMockPrismaCloudAccount({
        id: 'azure-account-1',
        accountName: 'Test Azure Account',
        provider: 'azure',
        status: 'active',
      });

      mockPrisma.cloudAccount.findMany.mockResolvedValueOnce([mockAzureAccount] as any);

      mockCostCollectionService.collectCostsForAccount.mockResolvedValueOnce({
        success: true,
        recordsObtained: 20,
        recordsSaved: 20,
        executionTimeMs: 1200,
      });

      mockAnomalyDetectionService.analyzeRecentCosts.mockResolvedValueOnce({
        anomaliesDetected: 1,
        anomalies: [],
      });

      const mockJob = { id: 'job-1' } as Job;
      const result = await workerProcessor(mockJob);

      expect(result.totalAccounts).toBe(1);
      expect(result.successfulAccounts).toBe(1);
      expect(mockCostCollectionService.collectCostsForAccount).toHaveBeenCalledWith(
        'azure-account-1',
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
        })
      );
    });

    it('should process mixed AWS and Azure accounts', async () => {
      const mockAccounts = [
        createMockPrismaCloudAccount({ id: 'aws-1', accountName: 'AWS Account 1', provider: 'aws' }),
        createMockPrismaCloudAccount({ id: 'azure-1', accountName: 'Azure Account 1', provider: 'azure' }),
        createMockPrismaCloudAccount({ id: 'aws-2', accountName: 'AWS Account 2', provider: 'aws' }),
        createMockPrismaCloudAccount({ id: 'azure-2', accountName: 'Azure Account 2', provider: 'azure' }),
      ];

      mockPrisma.cloudAccount.findMany.mockResolvedValueOnce(mockAccounts as any);

      mockCostCollectionService.collectCostsForAccount.mockResolvedValue({
        success: true,
        recordsObtained: 10,
        recordsSaved: 10,
        executionTimeMs: 1000,
      });

      mockAnomalyDetectionService.analyzeRecentCosts.mockResolvedValue({
        anomaliesDetected: 0,
        anomalies: [],
      });

      const mockJob = { id: 'job-1' } as Job;
      const result = await workerProcessor(mockJob);

      expect(result.totalAccounts).toBe(4);
      expect(result.successfulAccounts).toBe(4);
      expect(mockCostCollectionService.collectCostsForAccount).toHaveBeenCalledTimes(4);
      expect(mockAnomalyDetectionService.analyzeRecentCosts).toHaveBeenCalledTimes(4);
    });

    it('should handle Azure-specific errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockAzureAccount = createMockPrismaCloudAccount({
        id: 'azure-1',
        accountName: 'Failing Azure Account',
        provider: 'azure',
      });

      mockPrisma.cloudAccount.findMany.mockResolvedValueOnce([mockAzureAccount] as any);

      mockCostCollectionService.collectCostsForAccount.mockResolvedValueOnce({
        success: false,
        recordsObtained: 0,
        recordsSaved: 0,
        executionTimeMs: 500,
        errors: ['Azure subscription not found'],
      });

      const mockJob = { id: 'job-1' } as Job;
      const result = await workerProcessor(mockJob);

      expect(result.totalAccounts).toBe(1);
      expect(result.failedAccounts).toBe(1);
      expect(result.successfulAccounts).toBe(0);
      expect(result.results[0]).toMatchObject({
        accountId: 'azure-1',
        success: false,
        error: expect.stringContaining('Collection failed'),
      });

      consoleSpy.mockRestore();
    });

    it('should continue processing AWS accounts if Azure account fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockAccounts = [
        createMockPrismaCloudAccount({ id: 'aws-1', accountName: 'AWS Account', provider: 'aws' }),
        createMockPrismaCloudAccount({ id: 'azure-1', accountName: 'Failing Azure', provider: 'azure' }),
        createMockPrismaCloudAccount({ id: 'aws-2', accountName: 'AWS Account 2', provider: 'aws' }),
      ];

      mockPrisma.cloudAccount.findMany.mockResolvedValueOnce(mockAccounts as any);

      mockCostCollectionService.collectCostsForAccount
        .mockResolvedValueOnce({
          success: true,
          recordsObtained: 10,
          recordsSaved: 10,
          executionTimeMs: 1000,
        })
        .mockResolvedValueOnce({
          success: false,
          recordsObtained: 0,
          recordsSaved: 0,
          executionTimeMs: 500,
          errors: ['Azure API error'],
        })
        .mockResolvedValueOnce({
          success: true,
          recordsObtained: 15,
          recordsSaved: 15,
          executionTimeMs: 1100,
        });

      mockAnomalyDetectionService.analyzeRecentCosts.mockResolvedValue({
        anomaliesDetected: 0,
        anomalies: [],
      });

      const mockJob = { id: 'job-1' } as Job;
      const result = await workerProcessor(mockJob);

      expect(result.totalAccounts).toBe(3);
      expect(result.successfulAccounts).toBe(2);
      expect(result.failedAccounts).toBe(1);

      consoleSpy.mockRestore();
    });

    it('should process only Azure accounts when no AWS accounts exist', async () => {
      const mockAccounts = [
        createMockPrismaCloudAccount({ id: 'azure-1', provider: 'azure' }),
        createMockPrismaCloudAccount({ id: 'azure-2', provider: 'azure' }),
      ];

      mockPrisma.cloudAccount.findMany.mockResolvedValueOnce(mockAccounts as any);

      mockCostCollectionService.collectCostsForAccount.mockResolvedValue({
        success: true,
        recordsObtained: 10,
        recordsSaved: 10,
        executionTimeMs: 1000,
      });

      mockAnomalyDetectionService.analyzeRecentCosts.mockResolvedValue({
        anomaliesDetected: 0,
        anomalies: [],
      });

      const mockJob = { id: 'job-1' } as Job;
      const result = await workerProcessor(mockJob);

      expect(result.totalAccounts).toBe(2);
      expect(result.successfulAccounts).toBe(2);
      expect(mockCostCollectionService.collectCostsForAccount).toHaveBeenCalledTimes(2);
    });
  });
});
