/**
 * Unit Tests: Anomaly Detection Service
 *
 * This test suite verifies the AnomalyDetectionService with mocked Prisma.
 * Tests cover anomaly detection logic, severity calculation, event emission,
 * duplicate prevention, and query filtering.
 */

import { AnomalyDetectionService } from '../anomaly-detection.service';
import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';

// Mock Prisma
jest.mock('@prisma/client');

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;
  let prismaMock: jest.Mocked<PrismaClient>;
  let eventBusMock: jest.Mocked<EventEmitter>;

  beforeEach(() => {
    // Create Prisma mock
    prismaMock = {
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

    // Create EventBus mock
    eventBusMock = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    } as any;

    // Create service instance
    service = new AnomalyDetectionService(prismaMock, eventBusMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // analyzeRecentCosts - Anomaly Detection Tests
  // ============================================================

  describe('analyzeRecentCosts - Anomaly Detection', () => {
    it('should detect anomaly with 60% deviation as low severity', async () => {
      // Arrange
      const analysisDate = new Date('2024-01-31');

      // Mock daily costs (current day)
      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon EC2',
          provider: 'aws',
          _sum: { amount: 160 }, // 60% higher than baseline (100)
        },
      ] as any);

      // Mock historical data (baseline = 100)
      prismaMock.costData.findMany.mockResolvedValue([
        { amount: 100 },
        { amount: 100 },
        { amount: 100 },
      ] as any);

      // Mock no existing anomaly
      prismaMock.costAnomaly.findFirst.mockResolvedValue(null);

      // Mock anomaly creation
      prismaMock.costAnomaly.create.mockResolvedValue({
        id: 'anomaly-1',
        severity: 'low',
        deviation: 60,
      } as any);

      // Act
      const result = await service.analyzeRecentCosts('tenant-1', 'account-1', analysisDate);

      // Assert
      expect(result.anomaliesDetected).toBe(1);
      expect(result.anomalies[0].severity).toBe('low');
      expect(eventBusMock.emit).toHaveBeenCalledWith(
        'cost.anomaly.detected',
        expect.objectContaining({ severity: 'low' })
      );
    });

    it('should detect anomaly with 150% deviation as medium severity', async () => {
      // Arrange
      const analysisDate = new Date('2024-01-31');

      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon EC2',
          provider: 'aws',
          _sum: { amount: 250 }, // 150% higher
        },
      ] as any);

      prismaMock.costData.findMany.mockResolvedValue([
        { amount: 100 },
        { amount: 100 },
        { amount: 100 },
      ] as any);

      prismaMock.costAnomaly.findFirst.mockResolvedValue(null);
      prismaMock.costAnomaly.create.mockResolvedValue({
        id: 'anomaly-2',
        severity: 'medium',
        deviation: 150,
      } as any);

      // Act
      const result = await service.analyzeRecentCosts('tenant-1', 'account-1', analysisDate);

      // Assert
      expect(result.anomaliesDetected).toBe(1);
      expect(result.anomalies[0].severity).toBe('medium');
    });

    it('should detect anomaly with 300% deviation as high severity', async () => {
      // Arrange
      const analysisDate = new Date('2024-01-31');

      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon EC2',
          provider: 'aws',
          _sum: { amount: 400 }, // 300% higher
        },
      ] as any);

      prismaMock.costData.findMany.mockResolvedValue([
        { amount: 100 },
        { amount: 100 },
        { amount: 100 },
      ] as any);

      prismaMock.costAnomaly.findFirst.mockResolvedValue(null);
      prismaMock.costAnomaly.create.mockResolvedValue({
        id: 'anomaly-3',
        severity: 'high',
        deviation: 300,
      } as any);

      // Act
      const result = await service.analyzeRecentCosts('tenant-1', 'account-1', analysisDate);

      // Assert
      expect(result.anomaliesDetected).toBe(1);
      expect(result.anomalies[0].severity).toBe('high');
    });

    it('should detect anomaly with 600% deviation as critical severity', async () => {
      // Arrange
      const analysisDate = new Date('2024-01-31');

      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon EC2',
          provider: 'aws',
          _sum: { amount: 700 }, // 600% higher
        },
      ] as any);

      prismaMock.costData.findMany.mockResolvedValue([
        { amount: 100 },
        { amount: 100 },
        { amount: 100 },
      ] as any);

      prismaMock.costAnomaly.findFirst.mockResolvedValue(null);
      prismaMock.costAnomaly.create.mockResolvedValue({
        id: 'anomaly-4',
        severity: 'critical',
        deviation: 600,
      } as any);

      // Act
      const result = await service.analyzeRecentCosts('tenant-1', 'account-1', analysisDate);

      // Assert
      expect(result.anomaliesDetected).toBe(1);
      expect(result.anomalies[0].severity).toBe('critical');
    });

    it('should NOT detect anomaly with 40% deviation (below threshold)', async () => {
      // Arrange
      const analysisDate = new Date('2024-01-31');

      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon EC2',
          provider: 'aws',
          _sum: { amount: 140 }, // Only 40% higher
        },
      ] as any);

      prismaMock.costData.findMany.mockResolvedValue([
        { amount: 100 },
        { amount: 100 },
        { amount: 100 },
      ] as any);

      // Act
      const result = await service.analyzeRecentCosts('tenant-1', 'account-1', analysisDate);

      // Assert
      expect(result.anomaliesDetected).toBe(0);
      expect(result.anomalies).toHaveLength(0);
      expect(prismaMock.costAnomaly.create).not.toHaveBeenCalled();
      expect(eventBusMock.emit).not.toHaveBeenCalled();
    });

    it('should skip service if no historical data exists', async () => {
      // Arrange
      const analysisDate = new Date('2024-01-31');

      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon EC2',
          provider: 'aws',
          _sum: { amount: 500 },
        },
      ] as any);

      // No historical data
      prismaMock.costData.findMany.mockResolvedValue([]);

      // Act
      const result = await service.analyzeRecentCosts('tenant-1', 'account-1', analysisDate);

      // Assert
      expect(result.anomaliesDetected).toBe(0);
      expect(prismaMock.costAnomaly.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Event Emission Tests
  // ============================================================

  describe('Event Emission', () => {
    it('should emit cost.anomaly.detected event', async () => {
      // Arrange
      const analysisDate = new Date('2024-01-31');

      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon RDS',
          provider: 'aws',
          _sum: { amount: 250 },
        },
      ] as any);

      prismaMock.costData.findMany.mockResolvedValue([
        { amount: 100 },
        { amount: 100 },
      ] as any);

      prismaMock.costAnomaly.findFirst.mockResolvedValue(null);
      prismaMock.costAnomaly.create.mockResolvedValue({
        id: 'anomaly-123',
        tenantId: 'tenant-1',
        severity: 'medium',
        service: 'Amazon RDS',
        provider: 'aws',
        expectedCost: 100,
        actualCost: 250,
        date: analysisDate,
      } as any);

      // Act
      await service.analyzeRecentCosts('tenant-1', 'account-1', analysisDate);

      // Assert
      expect(eventBusMock.emit).toHaveBeenCalledWith(
        'cost.anomaly.detected',
        expect.objectContaining({
          tenantId: 'tenant-1',
          anomalyId: 'anomaly-123',
          provider: 'aws',
          severity: 'medium',
          expectedCost: 100,
          actualCost: 250,
          service: 'Amazon RDS',
        })
      );
    });
  });

  // ============================================================
  // Duplicate Prevention Tests
  // ============================================================

  describe('Duplicate Prevention', () => {
    it('should not create duplicate anomaly for same service/date/tenant', async () => {
      // Arrange
      const analysisDate = new Date('2024-01-31');

      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon EC2',
          provider: 'aws',
          _sum: { amount: 200 },
        },
      ] as any);

      prismaMock.costData.findMany.mockResolvedValue([
        { amount: 100 },
        { amount: 100 },
      ] as any);

      // Existing anomaly
      prismaMock.costAnomaly.findFirst.mockResolvedValue({
        id: 'existing-anomaly',
        service: 'Amazon EC2',
        date: analysisDate,
      } as any);

      // Act
      const result = await service.analyzeRecentCosts('tenant-1', 'account-1', analysisDate);

      // Assert
      expect(result.anomaliesDetected).toBe(0);
      expect(prismaMock.costAnomaly.create).not.toHaveBeenCalled();
      expect(eventBusMock.emit).not.toHaveBeenCalled();
    });

    it('should check for existing anomaly before creating', async () => {
      // Arrange
      const analysisDate = new Date('2024-01-31');

      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon S3',
          provider: 'aws',
          _sum: { amount: 300 },
        },
      ] as any);

      prismaMock.costData.findMany.mockResolvedValue([
        { amount: 100 },
      ] as any);

      prismaMock.costAnomaly.findFirst.mockResolvedValue(null);
      prismaMock.costAnomaly.create.mockResolvedValue({
        id: 'new-anomaly',
      } as any);

      // Act
      await service.analyzeRecentCosts('tenant-1', 'account-1', analysisDate);

      // Assert
      expect(prismaMock.costAnomaly.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          service: 'Amazon S3',
          date: analysisDate,
          provider: 'aws',
        },
      });
    });
  });

  // ============================================================
  // Severity Calculation Tests
  // ============================================================

  describe('calculateSeverity', () => {
    it('should return critical for deviation > 500%', async () => {
      // Arrange
      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon EC2',
          provider: 'aws',
          _sum: { amount: 650 }, // 550% deviation
        },
      ] as any);

      prismaMock.costData.findMany.mockResolvedValue([{ amount: 100 }] as any);
      prismaMock.costAnomaly.findFirst.mockResolvedValue(null);
      prismaMock.costAnomaly.create.mockResolvedValue({
        id: 'a1',
        severity: 'critical',
      } as any);

      // Act
      const result = await service.analyzeRecentCosts('t1', 'a1', new Date());

      // Assert
      expect(prismaMock.costAnomaly.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'critical',
        }),
      });
    });

    it('should return high for deviation 200-500%', async () => {
      // Arrange
      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon EC2',
          provider: 'aws',
          _sum: { amount: 350 }, // 250% deviation
        },
      ] as any);

      prismaMock.costData.findMany.mockResolvedValue([{ amount: 100 }] as any);
      prismaMock.costAnomaly.findFirst.mockResolvedValue(null);
      prismaMock.costAnomaly.create.mockResolvedValue({
        id: 'a2',
        severity: 'high',
      } as any);

      // Act
      await service.analyzeRecentCosts('t1', 'a1', new Date());

      // Assert
      expect(prismaMock.costAnomaly.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'high',
        }),
      });
    });

    it('should return medium for deviation 100-200%', async () => {
      // Arrange
      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon EC2',
          provider: 'aws',
          _sum: { amount: 250 }, // 150% deviation (medium severity)
        },
      ] as any);

      prismaMock.costData.findMany.mockResolvedValue([{ amount: 100 }] as any);
      prismaMock.costAnomaly.findFirst.mockResolvedValue(null);
      prismaMock.costAnomaly.create.mockResolvedValue({
        id: 'a3',
        severity: 'medium',
      } as any);

      // Act
      await service.analyzeRecentCosts('t1', 'a1', new Date());

      // Assert
      expect(prismaMock.costAnomaly.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'medium',
        }),
      });
    });

    it('should return low for deviation 50-100%', async () => {
      // Arrange
      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon EC2',
          provider: 'aws',
          _sum: { amount: 170 }, // 70% deviation
        },
      ] as any);

      prismaMock.costData.findMany.mockResolvedValue([{ amount: 100 }] as any);
      prismaMock.costAnomaly.findFirst.mockResolvedValue(null);
      prismaMock.costAnomaly.create.mockResolvedValue({
        id: 'a4',
        severity: 'low',
      } as any);

      // Act
      await service.analyzeRecentCosts('t1', 'a1', new Date());

      // Assert
      expect(prismaMock.costAnomaly.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'low',
        }),
      });
    });
  });

  // ============================================================
  // Historical Average Calculation Tests
  // ============================================================

  describe('getHistoricalAverage', () => {
    it('should calculate average correctly', async () => {
      // Arrange
      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon EC2',
          provider: 'aws',
          _sum: { amount: 300 },
        },
      ] as any);

      // Historical data: [100, 150, 200] = avg 150
      prismaMock.costData.findMany.mockResolvedValue([
        { amount: 100 },
        { amount: 150 },
        { amount: 200 },
      ] as any);

      prismaMock.costAnomaly.findFirst.mockResolvedValue(null);
      prismaMock.costAnomaly.create.mockResolvedValue({
        id: 'a1',
        expectedCost: 150,
        actualCost: 300,
      } as any);

      // Act
      await service.analyzeRecentCosts('t1', 'a1', new Date('2024-01-31'));

      // Assert
      expect(prismaMock.costAnomaly.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expectedCost: 150, // Average of [100, 150, 200]
          actualCost: 300,
        }),
      });
    });

    it('should exclude current date from historical baseline', async () => {
      // Arrange
      const analysisDate = new Date('2024-01-31');

      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon EC2',
          provider: 'aws',
          _sum: { amount: 500 },
        },
      ] as any);

      prismaMock.costData.findMany.mockResolvedValue([
        { amount: 100 },
        { amount: 100 },
      ] as any);

      prismaMock.costAnomaly.findFirst.mockResolvedValue(null);
      prismaMock.costAnomaly.create.mockResolvedValue({ id: 'a1' } as any);

      // Act
      await service.analyzeRecentCosts('t1', 'a1', analysisDate);

      // Assert
      const findManyCall = prismaMock.costData.findMany.mock.calls[0][0];
      expect(findManyCall.where.date.lte).not.toEqual(analysisDate);
      // Should be day before analysis date
      const expectedEndDate = new Date(analysisDate);
      expectedEndDate.setDate(expectedEndDate.getDate() - 1);
      expect(findManyCall.where.date.lte.getDate()).toBe(expectedEndDate.getDate());
    });
  });

  // ============================================================
  // getAnomaliesForTenant Tests
  // ============================================================

  describe('getAnomaliesForTenant', () => {
    it('should filter by status', async () => {
      // Arrange
      prismaMock.costAnomaly.findMany.mockResolvedValue([]);

      // Act
      await service.getAnomaliesForTenant('tenant-1', { status: 'open' });

      // Assert
      expect(prismaMock.costAnomaly.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: 'open',
        }),
        include: { tenant: true },
        orderBy: [{ severity: 'desc' }, { date: 'desc' }],
      });
    });

    it('should filter by severity', async () => {
      // Arrange
      prismaMock.costAnomaly.findMany.mockResolvedValue([]);

      // Act
      await service.getAnomaliesForTenant('tenant-1', { severity: 'critical' });

      // Assert
      expect(prismaMock.costAnomaly.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          severity: 'critical',
        }),
        include: { tenant: true },
        orderBy: [{ severity: 'desc' }, { date: 'desc' }],
      });
    });

    it('should filter by provider', async () => {
      // Arrange
      prismaMock.costAnomaly.findMany.mockResolvedValue([]);

      // Act
      await service.getAnomaliesForTenant('tenant-1', { provider: 'aws' });

      // Assert
      expect(prismaMock.costAnomaly.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          provider: 'aws',
        }),
        include: { tenant: true },
        orderBy: [{ severity: 'desc' }, { date: 'desc' }],
      });
    });

    it('should filter by service', async () => {
      // Arrange
      prismaMock.costAnomaly.findMany.mockResolvedValue([]);

      // Act
      await service.getAnomaliesForTenant('tenant-1', { service: 'Amazon EC2' });

      // Assert
      expect(prismaMock.costAnomaly.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          service: 'Amazon EC2',
        }),
        include: { tenant: true },
        orderBy: [{ severity: 'desc' }, { date: 'desc' }],
      });
    });

    it('should filter by date range', async () => {
      // Arrange
      prismaMock.costAnomaly.findMany.mockResolvedValue([]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Act
      await service.getAnomaliesForTenant('tenant-1', {
        startDate,
        endDate,
      });

      // Assert
      expect(prismaMock.costAnomaly.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          date: {
            gte: startDate,
            lte: endDate,
          },
        }),
        include: { tenant: true },
        orderBy: [{ severity: 'desc' }, { date: 'desc' }],
      });
    });

    it('should order by severity desc and date desc', async () => {
      // Arrange
      prismaMock.costAnomaly.findMany.mockResolvedValue([]);

      // Act
      await service.getAnomaliesForTenant('tenant-1');

      // Assert
      expect(prismaMock.costAnomaly.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        include: { tenant: true },
        orderBy: [{ severity: 'desc' }, { date: 'desc' }],
      });
    });
  });

  // ============================================================
  // Edge Cases and Default Behavior
  // ============================================================

  describe('Edge Cases', () => {
    it('should use yesterday as default analysis date', async () => {
      // Arrange
      prismaMock.costData.groupBy.mockResolvedValue([]);
      prismaMock.costData.findMany.mockResolvedValue([]);

      // Act
      await service.analyzeRecentCosts('t1', 'a1'); // No date provided

      // Assert
      const groupByCall = prismaMock.costData.groupBy.mock.calls[0][0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      expect(groupByCall.where.date.getDate()).toBe(yesterday.getDate());
    });

    it('should handle multiple services with different deviations', async () => {
      // Arrange
      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon EC2',
          provider: 'aws',
          _sum: { amount: 200 }, // 100% deviation → medium
        },
        {
          service: 'Amazon RDS',
          provider: 'aws',
          _sum: { amount: 700 }, // 600% deviation → critical
        },
      ] as any);

      prismaMock.costData.findMany.mockResolvedValue([{ amount: 100 }] as any);
      prismaMock.costAnomaly.findFirst.mockResolvedValue(null);
      prismaMock.costAnomaly.create
        .mockResolvedValueOnce({ id: 'a1', severity: 'medium' } as any)
        .mockResolvedValueOnce({ id: 'a2', severity: 'critical' } as any);

      // Act
      const result = await service.analyzeRecentCosts('t1', 'a1', new Date());

      // Assert
      expect(result.anomaliesDetected).toBe(2);
      expect(prismaMock.costAnomaly.create).toHaveBeenCalledTimes(2);
    });

    it('should handle negative cost deviations (cost decreases)', async () => {
      // Arrange
      const analysisDate = new Date('2024-01-31');

      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon S3',
          provider: 'aws',
          _sum: { amount: 20 }, // -80% deviation (cost dropped significantly)
        },
      ] as any);

      prismaMock.costData.findMany.mockResolvedValue([{ amount: 100 }] as any);
      prismaMock.costAnomaly.findFirst.mockResolvedValue(null);
      prismaMock.costAnomaly.create.mockResolvedValue({
        id: 'anomaly-neg',
        severity: 'low',
        deviation: -80,
      } as any);

      // Act
      const result = await service.analyzeRecentCosts('tenant-1', 'account-1', analysisDate);

      // Assert
      expect(result.anomaliesDetected).toBe(1);
      expect(prismaMock.costAnomaly.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deviation: -80,
          severity: 'low', // Should still calculate severity based on absolute value
        }),
      });
    });

    it('should handle zero expected cost gracefully', async () => {
      // Arrange
      const analysisDate = new Date('2024-01-31');

      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'New Service',
          provider: 'aws',
          _sum: { amount: 500 },
        },
      ] as any);

      // No historical data (returns 0)
      prismaMock.costData.findMany.mockResolvedValue([]);

      // Act
      const result = await service.analyzeRecentCosts('tenant-1', 'account-1', analysisDate);

      // Assert
      expect(result.anomaliesDetected).toBe(0);
      expect(prismaMock.costAnomaly.create).not.toHaveBeenCalled();
    });

    it('should handle empty cost data for analysis date', async () => {
      // Arrange
      const analysisDate = new Date('2024-01-31');

      prismaMock.costData.groupBy.mockResolvedValue([]);

      // Act
      const result = await service.analyzeRecentCosts('tenant-1', 'account-1', analysisDate);

      // Assert
      expect(result.anomaliesDetected).toBe(0);
      expect(result.anomalies).toEqual([]);
      expect(prismaMock.costData.findMany).not.toHaveBeenCalled();
    });

    it('should handle Azure provider anomalies', async () => {
      // Arrange
      const analysisDate = new Date('2024-01-31');

      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Virtual Machines',
          provider: 'azure',
          _sum: { amount: 300 },
        },
      ] as any);

      prismaMock.costData.findMany.mockResolvedValue([{ amount: 100 }] as any);
      prismaMock.costAnomaly.findFirst.mockResolvedValue(null);
      prismaMock.costAnomaly.create.mockResolvedValue({
        id: 'azure-anomaly',
        provider: 'azure',
        severity: 'high',
      } as any);

      // Act
      const result = await service.analyzeRecentCosts('tenant-1', 'account-1', analysisDate);

      // Assert
      expect(result.anomaliesDetected).toBe(1);
      expect(prismaMock.costAnomaly.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: 'azure',
          service: 'Virtual Machines',
        }),
      });
    });
  });

  // ============================================================
  // Additional Filter Combination Tests
  // ============================================================

  describe('getAnomaliesForTenant - Combined Filters', () => {
    it('should apply multiple filters simultaneously', async () => {
      // Arrange
      prismaMock.costAnomaly.findMany.mockResolvedValue([]);

      const filters = {
        status: 'open' as const,
        severity: 'critical' as const,
        provider: 'aws',
        service: 'Amazon EC2',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      // Act
      await service.getAnomaliesForTenant('tenant-1', filters);

      // Assert
      expect(prismaMock.costAnomaly.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          status: 'open',
          severity: 'critical',
          provider: 'aws',
          service: 'Amazon EC2',
          date: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31'),
          },
        },
        include: { tenant: true },
        orderBy: [{ severity: 'desc' }, { date: 'desc' }],
      });
    });

    it('should handle startDate filter without endDate', async () => {
      // Arrange
      prismaMock.costAnomaly.findMany.mockResolvedValue([]);

      // Act
      await service.getAnomaliesForTenant('tenant-1', {
        startDate: new Date('2024-01-01'),
      });

      // Assert
      expect(prismaMock.costAnomaly.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          date: {
            gte: new Date('2024-01-01'),
          },
        },
        include: { tenant: true },
        orderBy: [{ severity: 'desc' }, { date: 'desc' }],
      });
    });

    it('should handle endDate filter without startDate', async () => {
      // Arrange
      prismaMock.costAnomaly.findMany.mockResolvedValue([]);

      // Act
      await service.getAnomaliesForTenant('tenant-1', {
        endDate: new Date('2024-01-31'),
      });

      // Assert
      expect(prismaMock.costAnomaly.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          date: {
            lte: new Date('2024-01-31'),
          },
        },
        include: { tenant: true },
        orderBy: [{ severity: 'desc' }, { date: 'desc' }],
      });
    });

    it('should return anomalies without any filters', async () => {
      // Arrange
      const mockAnomalies = [
        {
          id: 'a1',
          tenantId: 'tenant-1',
          service: 'EC2',
          status: 'open',
          severity: 'high',
        },
      ];
      prismaMock.costAnomaly.findMany.mockResolvedValue(mockAnomalies as any);

      // Act
      const result = await service.getAnomaliesForTenant('tenant-1');

      // Assert
      expect(result).toEqual(mockAnomalies);
      expect(prismaMock.costAnomaly.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        include: { tenant: true },
        orderBy: [{ severity: 'desc' }, { date: 'desc' }],
      });
    });
  });

  // ============================================================
  // Boundary Value Tests
  // ============================================================

  describe('Severity Calculation - Boundary Values', () => {
    it('should return low for exactly 50% deviation', async () => {
      // Arrange - Create exactly 50.5% deviation to exceed threshold (>50%)
      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon EC2',
          provider: 'aws',
          _sum: { amount: 150.5 }, // 50.5% deviation (just over 50% threshold)
        },
      ] as any);

      prismaMock.costData.findMany.mockResolvedValue([{ amount: 100 }] as any);
      prismaMock.costAnomaly.findFirst.mockResolvedValue(null);
      prismaMock.costAnomaly.create.mockResolvedValue({
        id: 'a1',
        severity: 'low',
      } as any);

      // Act
      await service.analyzeRecentCosts('t1', 'a1', new Date());

      // Assert
      expect(prismaMock.costAnomaly.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'low',
        }),
      });
    });

    it('should return low for exactly 100% deviation', async () => {
      // Arrange
      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon EC2',
          provider: 'aws',
          _sum: { amount: 200 }, // Exactly 100% deviation
        },
      ] as any);

      prismaMock.costData.findMany.mockResolvedValue([{ amount: 100 }] as any);
      prismaMock.costAnomaly.findFirst.mockResolvedValue(null);
      prismaMock.costAnomaly.create.mockResolvedValue({
        id: 'a1',
        severity: 'low',
      } as any);

      // Act
      await service.analyzeRecentCosts('t1', 'a1', new Date());

      // Assert
      expect(prismaMock.costAnomaly.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'low',
        }),
      });
    });

    it('should return medium for exactly 200% deviation', async () => {
      // Arrange
      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon EC2',
          provider: 'aws',
          _sum: { amount: 300 }, // Exactly 200% deviation
        },
      ] as any);

      prismaMock.costData.findMany.mockResolvedValue([{ amount: 100 }] as any);
      prismaMock.costAnomaly.findFirst.mockResolvedValue(null);
      prismaMock.costAnomaly.create.mockResolvedValue({
        id: 'a1',
        severity: 'medium',
      } as any);

      // Act
      await service.analyzeRecentCosts('t1', 'a1', new Date());

      // Assert
      expect(prismaMock.costAnomaly.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'medium',
        }),
      });
    });

    it('should return high for exactly 500% deviation', async () => {
      // Arrange
      prismaMock.costData.groupBy.mockResolvedValue([
        {
          service: 'Amazon EC2',
          provider: 'aws',
          _sum: { amount: 600 }, // Exactly 500% deviation
        },
      ] as any);

      prismaMock.costData.findMany.mockResolvedValue([{ amount: 100 }] as any);
      prismaMock.costAnomaly.findFirst.mockResolvedValue(null);
      prismaMock.costAnomaly.create.mockResolvedValue({
        id: 'a1',
        severity: 'high',
      } as any);

      // Act
      await service.analyzeRecentCosts('t1', 'a1', new Date());

      // Assert
      expect(prismaMock.costAnomaly.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'high',
        }),
      });
    });
  });
});
