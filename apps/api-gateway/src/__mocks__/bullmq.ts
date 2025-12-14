/**
 * BullMQ Mock
 *
 * This mock provides reusable BullMQ queue and worker mocks for testing.
 * Prevents actual Redis connections and job processing during tests.
 */

import { mockDeep, mockReset } from 'jest-mock-extended';
import type { Queue as QueueType, Worker as WorkerType, Job as JobType } from 'bullmq';

/**
 * Mock Job Data Structure
 */
export interface MockJobData {
  id: string;
  name: string;
  data: any;
  opts?: any;
}

/**
 * Create a mock job with data
 */
export function createMockJob(data: Partial<MockJobData> = {}): JobType {
  const mockJobInstance = mockDeep<JobType>();

  Object.assign(mockJobInstance, {
    id: data.id || '1',
    name: data.name || 'test-job',
    data: data.data || {},
    opts: data.opts || {},
    progress: jest.fn(),
    log: jest.fn(),
    updateProgress: jest.fn(),
  });

  return mockJobInstance;
}

/**
 * Mock Queue Factory
 */
export function createMockQueue(name: string = 'test-queue'): QueueType {
  const queueMock = mockDeep<QueueType>();

  Object.assign(queueMock, {
    name,
    add: jest.fn().mockResolvedValue(createMockJob()),
    addBulk: jest.fn().mockResolvedValue([]),
    getJob: jest.fn().mockResolvedValue(null),
    getJobs: jest.fn().mockResolvedValue([]),
    getWaiting: jest.fn().mockResolvedValue([]),
    getActive: jest.fn().mockResolvedValue([]),
    getCompleted: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([]),
    clean: jest.fn().mockResolvedValue([]),
    obliterate: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  });

  return queueMock;
}

/**
 * Mock Queue Constructor
 */
export class Queue {
  public name: string;
  public add: jest.Mock;
  public addBulk: jest.Mock;
  public getJob: jest.Mock;
  public getJobs: jest.Mock;
  public getWaiting: jest.Mock;
  public getActive: jest.Mock;
  public getCompleted: jest.Mock;
  public getFailed: jest.Mock;
  public clean: jest.Mock;
  public obliterate: jest.Mock;
  public pause: jest.Mock;
  public resume: jest.Mock;
  public close: jest.Mock;

  constructor(name: string, opts?: any) {
    this.name = name;
    this.add = jest.fn().mockResolvedValue(createMockJob());
    this.addBulk = jest.fn().mockResolvedValue([]);
    this.getJob = jest.fn().mockResolvedValue(null);
    this.getJobs = jest.fn().mockResolvedValue([]);
    this.getWaiting = jest.fn().mockResolvedValue([]);
    this.getActive = jest.fn().mockResolvedValue([]);
    this.getCompleted = jest.fn().mockResolvedValue([]);
    this.getFailed = jest.fn().mockResolvedValue([]);
    this.clean = jest.fn().mockResolvedValue([]);
    this.obliterate = jest.fn().mockResolvedValue(undefined);
    this.pause = jest.fn().mockResolvedValue(undefined);
    this.resume = jest.fn().mockResolvedValue(undefined);
    this.close = jest.fn().mockResolvedValue(undefined);
  }
}

/**
 * Mock Worker Constructor
 */
export class Worker {
  public name: string;
  public run: jest.Mock;
  public close: jest.Mock;
  public pause: jest.Mock;
  public resume: jest.Mock;
  public on: jest.Mock;

  constructor(name: string, processor?: any, opts?: any) {
    this.name = name;
    this.run = jest.fn();
    this.close = jest.fn().mockResolvedValue(undefined);
    this.pause = jest.fn().mockResolvedValue(undefined);
    this.resume = jest.fn().mockResolvedValue(undefined);
    this.on = jest.fn().mockReturnThis();
  }
}

/**
 * Mock Job Class
 */
export class Job {
  public id: string;
  public name: string;
  public data: any;
  public opts: any;
  public progress: jest.Mock;
  public log: jest.Mock;
  public updateProgress: jest.Mock;

  constructor(name: string, data: any, opts?: any) {
    this.id = '1';
    this.name = name;
    this.data = data;
    this.opts = opts || {};
    this.progress = jest.fn();
    this.log = jest.fn();
    this.updateProgress = jest.fn();
  }
}

/**
 * Reset all BullMQ mocks before each test
 */
beforeEach(() => {
  jest.clearAllMocks();
});

export default {
  Queue,
  Worker,
  Job,
  createMockJob,
  createMockQueue,
};
