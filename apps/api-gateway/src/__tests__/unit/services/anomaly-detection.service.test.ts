/**
 * Anomaly Detection Service Unit Tests
 *
 * Tests the statistical anomaly detection service that identifies cost spikes
 * by comparing actual costs against historical baselines.
 */

import { AnomalyDetectionService } from '../../../modules/finops/services/anomaly-detection.service';
import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import { createMockPrismaCostData, createMockPrismaAnomaly } from '../../utils/test-helpers';

describe('Anomaly Detection Service', () => {
  let service: AnomalyDetectionService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockEventBus: EventEmitter;
  let emitSpy: jest.SpyInstance;

  const tenantId = 'tenant-uuid-1';
  const accountId = 'account-uuid-1';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Prisma client
    mockPrisma = {
      costData: {
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      costAnomaly: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
    } as any;

    // Mock Event Bus
    mockEventBus = new EventEmitter();
    emitSpy = jest.spyOn(mockEventBus, 'emit');

    service = new AnomalyDetectionService(mockPrisma, mockEventBus);
  });

  describe('detectAnomalies()', () => {
    it('should detect cost spikes (>2 std dev)', async () => {
      const analysisDate = new Date('2025-12-15');

      // Mock current day costs (high spike)
      mockPrisma.costData.groupBy.mockResolvedValueOnce([
        {
          service: 'EC2',
          provider: 'aws',
          _sum: { amount: 500.00 }, // Spike!
        },
      ] as any);

      // Mock historical costs (last 30 days) - average should be ~100
      const historicalCosts = Array.from({ length: 30 }, (_, i) =>
        createMockPrismaCostData({
          amount: 100.00,
          service: 'EC2',
          date: new Date('2025-11-15'),
        })
      );
      mockPrisma.costData.findMany.mockResolvedValueOnce(historicalCosts as any);

      // Mock no existing anomaly
      mockPrisma.costAnomaly.findFirst.mockResolvedValueOnce(null);

      // Mock anomaly creation
      mockPrisma.costAnomaly.create.mockResolvedValueOnce(
        createMockPrismaAnomaly({
          expectedCost: 100.00,
          actualCost: 500.00,
          deviation: 400.00,
          severity: 'critical',
        }) as any
      );

      const result = await service.analyzeRecentCosts(tenantId, accountId, analysisDate);

      expect(result.anomaliesDetected).toBe(1);
      expect(result.anomalies).toHaveLength(1);
      expect(mockPrisma.costAnomaly.create).toHaveBeenCalled();
    });

    it('should calculate baseline from historical data (30 days)', async () => {
      const analysisDate = new Date('2025-12-15');

      mockPrisma.costData.groupBy.mockResolvedValueOnce([
        { service: 'EC2', provider: 'aws', _sum: { amount: 200.00 } },
      ] as any);

      const historicalCosts = Array.from({ length: 30 }, (_, i) =>
        createMockPrismaCostData({ amount: 100.00, date: new Date('2025-11-01') })
      );
      mockPrisma.costData.findMany.mockResolvedValueOnce(historicalCosts as any);
      mockPrisma.costAnomaly.findFirst.mockResolvedValueOnce(null);
      mockPrisma.costAnomaly.create.mockResolvedValueOnce(createMockPrismaAnomaly() as any);

      await service.analyzeRecentCosts(tenantId, accountId, analysisDate);

      // Verify historical data query excludes current date
      expect(mockPrisma.costData.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          cloudAccountId: accountId,
          service: 'EC2',
          date: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        },
      });
    });

    it('should assign correct severity levels', async () => {
      const testCases = [
        { actualCost: 175, expectedCost: 100, expectedSeverity: 'low' },      // 75% deviation
        { actualCost: 250, expectedCost: 100, expectedSeverity: 'medium' },   // 150% deviation
        { actualCost: 400, expectedCost: 100, expectedSeverity: 'high' },     // 300% deviation
        { actualCost: 700, expectedCost: 100, expectedSeverity: 'critical' }, // 600% deviation
      ];

      for (const testCase of testCases) {
        mockPrisma.costData.groupBy.mockResolvedValueOnce([
          { service: 'EC2', provider: 'aws', _sum: { amount: testCase.actualCost } },
        ] as any);

        mockPrisma.costData.findMany.mockResolvedValueOnce([
          createMockPrismaCostData({ amount: testCase.expectedCost }),
        ] as any);

        mockPrisma.costAnomaly.findFirst.mockResolvedValueOnce(null);

        const createdAnomaly = createMockPrismaAnomaly({ severity: testCase.expectedSeverity });
        mockPrisma.costAnomaly.create.mockResolvedValueOnce(createdAnomaly as any);

        const result = await service.analyzeRecentCosts(tenantId, accountId, new Date('2025-12-15'));

        expect(mockPrisma.costAnomaly.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            severity: testCase.expectedSeverity,
          }),
        });
      }
    });

    it('should NOT detect anomalies in normal variance', async () => {
      const analysisDate = new Date('2025-12-15');

      // Current cost within normal range (40% deviation, below 50% threshold)
      mockPrisma.costData.groupBy.mockResolvedValueOnce([
        { service: 'EC2', provider: 'aws', _sum: { amount: 140.00 } },
      ] as any);

      // Historical average: 100
      mockPrisma.costData.findMany.mockResolvedValueOnce([
        createMockPrismaCostData({ amount: 100.00 }),
      ] as any);

      const result = await service.analyzeRecentCosts(tenantId, accountId, analysisDate);

      expect(result.anomaliesDetected).toBe(0);
      expect(result.anomalies).toHaveLength(0);
      expect(mockPrisma.costAnomaly.create).not.toHaveBeenCalled();
    });

    it('should skip services with no historical data', async () => {
      const analysisDate = new Date('2025-12-15');

      mockPrisma.costData.groupBy.mockResolvedValueOnce([
        { service: 'NewService', provider: 'aws', _sum: { amount: 500.00 } },
      ] as any);

      // No historical data
      mockPrisma.costData.findMany.mockResolvedValueOnce([]);

      const result = await service.analyzeRecentCosts(tenantId, accountId, analysisDate);

      expect(result.anomaliesDetected).toBe(0);
      expect(mockPrisma.costAnomaly.create).not.toHaveBeenCalled();
    });
  });

  describe('Severity Calculation', () => {
    it('should assign LOW for 50-100% deviation', async () => {
      mockPrisma.costData.groupBy.mockResolvedValueOnce([
        { service: 'EC2', provider: 'aws', _sum: { amount: 175.00 } },
      ] as any);

      mockPrisma.costData.findMany.mockResolvedValueOnce([
        createMockPrismaCostData({ amount: 100.00 }),
      ] as any);

      mockPrisma.costAnomaly.findFirst.mockResolvedValueOnce(null);
      mockPrisma.costAnomaly.create.mockResolvedValueOnce(
        createMockPrismaAnomaly({ severity: 'low' }) as any
      );

      await service.analyzeRecentCosts(tenantId, accountId, new Date('2025-12-15'));

      expect(mockPrisma.costAnomaly.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ severity: 'low' }),
      });
    });

    it('should assign MEDIUM for 100-200% deviation', async () => {
      mockPrisma.costData.groupBy.mockResolvedValueOnce([
        { service: 'EC2', provider: 'aws', _sum: { amount: 250.00 } },
      ] as any);

      mockPrisma.costData.findMany.mockResolvedValueOnce([
        createMockPrismaCostData({ amount: 100.00 }),
      ] as any);

      mockPrisma.costAnomaly.findFirst.mockResolvedValueOnce(null);
      mockPrisma.costAnomaly.create.mockResolvedValueOnce(
        createMockPrismaAnomaly({ severity: 'medium' }) as any
      );

      await service.analyzeRecentCosts(tenantId, accountId, new Date('2025-12-15'));

      expect(mockPrisma.costAnomaly.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ severity: 'medium' }),
      });
    });

    it('should assign HIGH for 200-500% deviation', async () => {
      mockPrisma.costData.groupBy.mockResolvedValueOnce([
        { service: 'EC2', provider: 'aws', _sum: { amount: 400.00 } },
      ] as any);

      mockPrisma.costData.findMany.mockResolvedValueOnce([
        createMockPrismaCostData({ amount: 100.00 }),
      ] as any);

      mockPrisma.costAnomaly.findFirst.mockResolvedValueOnce(null);
      mockPrisma.costAnomaly.create.mockResolvedValueOnce(
        createMockPrismaAnomaly({ severity: 'high' }) as any
      );

      await service.analyzeRecentCosts(tenantId, accountId, new Date('2025-12-15'));

      expect(mockPrisma.costAnomaly.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ severity: 'high' }),
      });
    });

    it('should assign CRITICAL for >500% deviation', async () => {
      mockPrisma.costData.groupBy.mockResolvedValueOnce([
        { service: 'EC2', provider: 'aws', _sum: { amount: 700.00 } },
      ] as any);

      mockPrisma.costData.findMany.mockResolvedValueOnce([
        createMockPrismaCostData({ amount: 100.00 }),
      ] as any);

      mockPrisma.costAnomaly.findFirst.mockResolvedValueOnce(null);
      mockPrisma.costAnomaly.create.mockResolvedValueOnce(
        createMockPrismaAnomaly({ severity: 'critical' }) as any
      );

      await service.analyzeRecentCosts(tenantId, accountId, new Date('2025-12-15'));

      expect(mockPrisma.costAnomaly.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ severity: 'critical' }),
      });
    });

    it('should use absolute deviation for negative spikes', async () => {
      // Cost drop from 100 to 30 (-70% = 70% absolute deviation)
      mockPrisma.costData.groupBy.mockResolvedValueOnce([
        { service: 'EC2', provider: 'aws', _sum: { amount: 30.00 } },
      ] as any);

      mockPrisma.costData.findMany.mockResolvedValueOnce([
        createMockPrismaCostData({ amount: 100.00 }),
      ] as any);

      mockPrisma.costAnomaly.findFirst.mockResolvedValueOnce(null);
      mockPrisma.costAnomaly.create.mockResolvedValueOnce(
        createMockPrismaAnomaly({ severity: 'low', deviation: -70.00 }) as any
      );

      await service.analyzeRecentCosts(tenantId, accountId, new Date('2025-12-15'));

      expect(mockPrisma.costAnomaly.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'low', // 70% absolute deviation
          deviation: expect.any(Number),
        }),
      });
    });
  });

  describe('Statistical Algorithm', () => {
    it('should calculate mean correctly', async () => {
      mockPrisma.costData.groupBy.mockResolvedValueOnce([
        { service: 'EC2', provider: 'aws', _sum: { amount: 300.00 } },
      ] as any);

      // Historical data: [100, 110, 90, 105, 95] → mean = 100
      mockPrisma.costData.findMany.mockResolvedValueOnce([
        createMockPrismaCostData({ amount: 100.00 }),
        createMockPrismaCostData({ amount: 110.00 }),
        createMockPrismaCostData({ amount: 90.00 }),
        createMockPrismaCostData({ amount: 105.00 }),
        createMockPrismaCostData({ amount: 95.00 }),
      ] as any);

      mockPrisma.costAnomaly.findFirst.mockResolvedValueOnce(null);
      mockPrisma.costAnomaly.create.mockResolvedValueOnce(createMockPrismaAnomaly() as any);

      await service.analyzeRecentCosts(tenantId, accountId, new Date('2025-12-15'));

      expect(mockPrisma.costAnomaly.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expectedCost: 100.00,
        }),
      });
    });

    it('should handle insufficient historical data', async () => {
      mockPrisma.costData.groupBy.mockResolvedValueOnce([
        { service: 'EC2', provider: 'aws', _sum: { amount: 500.00 } },
      ] as any);

      // Empty historical data
      mockPrisma.costData.findMany.mockResolvedValueOnce([]);

      const result = await service.analyzeRecentCosts(tenantId, accountId, new Date('2025-12-15'));

      expect(result.anomaliesDetected).toBe(0);
      expect(mockPrisma.costAnomaly.create).not.toHaveBeenCalled();
    });

    it('should handle multiple services in single analysis', async () => {
      mockPrisma.costData.groupBy.mockResolvedValueOnce([
        { service: 'EC2', provider: 'aws', _sum: { amount: 300.00 } },
        { service: 'RDS', provider: 'aws', _sum: { amount: 400.00 } },
        { service: 'S3', provider: 'aws', _sum: { amount: 50.00 } },
      ] as any);

      // EC2 historical
      mockPrisma.costData.findMany.mockResolvedValueOnce([
        createMockPrismaCostData({ amount: 100.00, service: 'EC2' }),
      ] as any);

      // RDS historical
      mockPrisma.costData.findMany.mockResolvedValueOnce([
        createMockPrismaCostData({ amount: 100.00, service: 'RDS' }),
      ] as any);

      // S3 historical
      mockPrisma.costData.findMany.mockResolvedValueOnce([
        createMockPrismaCostData({ amount: 50.00, service: 'S3' }),
      ] as any);

      mockPrisma.costAnomaly.findFirst.mockResolvedValue(null);
      mockPrisma.costAnomaly.create.mockResolvedValue(createMockPrismaAnomaly() as any);

      const result = await service.analyzeRecentCosts(tenantId, accountId, new Date('2025-12-15'));

      // EC2 and RDS should trigger anomalies (200% and 300% deviation)
      // S3 should not (0% deviation)
      expect(result.anomaliesDetected).toBe(2);
    });
  });

  describe('Event Emission', () => {
    it('should emit anomaly.detected event', async () => {
      mockPrisma.costData.groupBy.mockResolvedValueOnce([
        { service: 'EC2', provider: 'aws', _sum: { amount: 300.00 } },
      ] as any);

      mockPrisma.costData.findMany.mockResolvedValueOnce([
        createMockPrismaCostData({ amount: 100.00 }),
      ] as any);

      mockPrisma.costAnomaly.findFirst.mockResolvedValueOnce(null);
      mockPrisma.costAnomaly.create.mockResolvedValueOnce(
        createMockPrismaAnomaly({ id: 'anomaly-123' }) as any
      );

      await service.analyzeRecentCosts(tenantId, accountId, new Date('2025-12-15'));

      expect(emitSpy).toHaveBeenCalledWith('cost.anomaly.detected', {
        tenantId,
        anomalyId: 'anomaly-123',
        provider: 'aws',
        severity: expect.any(String),
        expectedCost: expect.any(Number),
        actualCost: expect.any(Number),
        service: 'EC2',
        date: expect.any(Date),
      });
    });

    it('should include all required event data', async () => {
      mockPrisma.costData.groupBy.mockResolvedValueOnce([
        { service: 'RDS', provider: 'aws', _sum: { amount: 700.00 } },
      ] as any);

      mockPrisma.costData.findMany.mockResolvedValueOnce([
        createMockPrismaCostData({ amount: 100.00 }),
      ] as any);

      mockPrisma.costAnomaly.findFirst.mockResolvedValueOnce(null);
      mockPrisma.costAnomaly.create.mockResolvedValueOnce(
        createMockPrismaAnomaly({
          id: 'anomaly-456',
          service: 'RDS',
          severity: 'critical',
          expectedCost: 100.00,
          actualCost: 700.00,
        }) as any
      );

      await service.analyzeRecentCosts(tenantId, accountId, new Date('2025-12-15'));

      expect(emitSpy).toHaveBeenCalledWith('cost.anomaly.detected', {
        tenantId: tenantId,
        anomalyId: 'anomaly-456',
        provider: 'aws',
        severity: 'critical',
        expectedCost: 100.00,
        actualCost: 700.00,
        service: 'RDS',
        date: expect.any(Date),
      });
    });

    it('should NOT emit for non-anomalies', async () => {
      mockPrisma.costData.groupBy.mockResolvedValueOnce([
        { service: 'EC2', provider: 'aws', _sum: { amount: 120.00 } },
      ] as any);

      mockPrisma.costData.findMany.mockResolvedValueOnce([
        createMockPrismaCostData({ amount: 100.00 }),
      ] as any);

      await service.analyzeRecentCosts(tenantId, accountId, new Date('2025-12-15'));

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Duplicate Prevention', () => {
    it('should not create duplicate anomalies', async () => {
      mockPrisma.costData.groupBy.mockResolvedValueOnce([
        { service: 'EC2', provider: 'aws', _sum: { amount: 300.00 } },
      ] as any);

      mockPrisma.costData.findMany.mockResolvedValueOnce([
        createMockPrismaCostData({ amount: 100.00 }),
      ] as any);

      // Existing anomaly found
      mockPrisma.costAnomaly.findFirst.mockResolvedValueOnce(
        createMockPrismaAnomaly() as any
      );

      const result = await service.analyzeRecentCosts(tenantId, accountId, new Date('2025-12-15'));

      expect(result.anomaliesDetected).toBe(0);
      expect(mockPrisma.costAnomaly.create).not.toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should check for duplicates by service, date, and provider', async () => {
      mockPrisma.costData.groupBy.mockResolvedValueOnce([
        { service: 'EC2', provider: 'aws', _sum: { amount: 300.00 } },
      ] as any);

      mockPrisma.costData.findMany.mockResolvedValueOnce([
        createMockPrismaCostData({ amount: 100.00 }),
      ] as any);

      mockPrisma.costAnomaly.findFirst.mockResolvedValueOnce(null);
      mockPrisma.costAnomaly.create.mockResolvedValueOnce(createMockPrismaAnomaly() as any);

      const analysisDate = new Date('2025-12-15');
      await service.analyzeRecentCosts(tenantId, accountId, analysisDate);

      expect(mockPrisma.costAnomaly.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId,
          service: 'EC2',
          date: analysisDate,
          provider: 'aws',
        },
      });
    });
  });

  describe('getAnomaliesForTenant()', () => {
    it('should retrieve anomalies for tenant', async () => {
      const mockAnomalies = [
        createMockPrismaAnomaly({ id: '1', severity: 'critical' }),
        createMockPrismaAnomaly({ id: '2', severity: 'high' }),
      ];

      mockPrisma.costAnomaly.findMany.mockResolvedValueOnce(mockAnomalies as any);

      const anomalies = await service.getAnomaliesForTenant(tenantId);

      expect(anomalies).toHaveLength(2);
      expect(mockPrisma.costAnomaly.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        include: { tenant: true },
        orderBy: [{ severity: 'desc' }, { date: 'desc' }],
      });
    });

    it('should filter by status', async () => {
      mockPrisma.costAnomaly.findMany.mockResolvedValueOnce([]);

      await service.getAnomaliesForTenant(tenantId, { status: 'open' });

      expect(mockPrisma.costAnomaly.findMany).toHaveBeenCalledWith({
        where: { tenantId, status: 'open' },
        include: { tenant: true },
        orderBy: [{ severity: 'desc' }, { date: 'desc' }],
      });
    });

    it('should filter by severity', async () => {
      mockPrisma.costAnomaly.findMany.mockResolvedValueOnce([]);

      await service.getAnomaliesForTenant(tenantId, { severity: 'critical' });

      expect(mockPrisma.costAnomaly.findMany).toHaveBeenCalledWith({
        where: { tenantId, severity: 'critical' },
        include: { tenant: true },
        orderBy: [{ severity: 'desc' }, { date: 'desc' }],
      });
    });

    it('should filter by date range', async () => {
      mockPrisma.costAnomaly.findMany.mockResolvedValueOnce([]);

      const startDate = new Date('2025-12-01');
      const endDate = new Date('2025-12-31');

      await service.getAnomaliesForTenant(tenantId, { startDate, endDate });

      expect(mockPrisma.costAnomaly.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: { tenant: true },
        orderBy: [{ severity: 'desc' }, { date: 'desc' }],
      });
    });

    it('should filter by provider', async () => {
      mockPrisma.costAnomaly.findMany.mockResolvedValueOnce([]);

      await service.getAnomaliesForTenant(tenantId, { provider: 'aws' });

      expect(mockPrisma.costAnomaly.findMany).toHaveBeenCalledWith({
        where: { tenantId, provider: 'aws' },
        include: { tenant: true },
        orderBy: [{ severity: 'desc' }, { date: 'desc' }],
      });
    });

    it('should apply multiple filters', async () => {
      mockPrisma.costAnomaly.findMany.mockResolvedValueOnce([]);

      await service.getAnomaliesForTenant(tenantId, {
        status: 'open',
        severity: 'critical',
        provider: 'aws',
      });

      expect(mockPrisma.costAnomaly.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          status: 'open',
          severity: 'critical',
          provider: 'aws',
        },
        include: { tenant: true },
        orderBy: [{ severity: 'desc' }, { date: 'desc' }],
      });
    });
  });

  describe('Default Analysis Date', () => {
    it('should use yesterday as default analysis date', async () => {
      mockPrisma.costData.groupBy.mockResolvedValueOnce([]);

      await service.analyzeRecentCosts(tenantId, accountId);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      expect(mockPrisma.costData.groupBy).toHaveBeenCalledWith({
        by: ['service', 'provider'],
        where: {
          tenantId,
          cloudAccountId: accountId,
          date: yesterday,
        },
        _sum: { amount: true },
      });
    });
  });
});
