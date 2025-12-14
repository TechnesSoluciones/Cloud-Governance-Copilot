/**
 * Redis Mock
 *
 * This mock provides a reusable Redis client mock for testing.
 * Prevents actual Redis connections during tests.
 */

import { mockDeep, mockReset } from 'jest-mock-extended';
import type { Redis } from 'ioredis';

/**
 * Mock Redis Client
 */
export const mockRedis = mockDeep<Redis>();

/**
 * Reset Redis mock before each test
 */
beforeEach(() => {
  mockReset(mockRedis);
});

/**
 * In-memory store for testing
 */
class InMemoryRedis {
  private store: Map<string, string>;
  private hashes: Map<string, Map<string, string>>;
  private sets: Map<string, Set<string>>;
  private lists: Map<string, string[]>;

  constructor() {
    this.store = new Map();
    this.hashes = new Map();
    this.sets = new Map();
    this.lists = new Map();
  }

  // String operations
  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.store.set(key, value);
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    this.store.set(key, value);
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.store.delete(key)) deleted++;
    }
    return deleted;
  }

  async exists(...keys: string[]): Promise<number> {
    return keys.filter(key => this.store.has(key)).length;
  }

  // Hash operations
  async hset(key: string, field: string, value: string): Promise<number> {
    if (!this.hashes.has(key)) {
      this.hashes.set(key, new Map());
    }
    const hash = this.hashes.get(key)!;
    const isNew = !hash.has(field);
    hash.set(field, value);
    return isNew ? 1 : 0;
  }

  async hget(key: string, field: string): Promise<string | null> {
    const hash = this.hashes.get(key);
    return hash?.get(field) || null;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const hash = this.hashes.get(key);
    if (!hash) return {};
    return Object.fromEntries(hash.entries());
  }

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    const set = this.sets.get(key)!;
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    return added;
  }

  async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  // List operations
  async lpush(key: string, ...values: string[]): Promise<number> {
    if (!this.lists.has(key)) {
      this.lists.set(key, []);
    }
    const list = this.lists.get(key)!;
    list.unshift(...values);
    return list.length;
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    if (!this.lists.has(key)) {
      this.lists.set(key, []);
    }
    const list = this.lists.get(key)!;
    list.push(...values);
    return list.length;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const list = this.lists.get(key);
    if (!list) return [];
    return list.slice(start, stop + 1);
  }

  // Utility
  async flushall(): Promise<'OK'> {
    this.store.clear();
    this.hashes.clear();
    this.sets.clear();
    this.lists.clear();
    return 'OK';
  }

  async quit(): Promise<'OK'> {
    return 'OK';
  }

  async disconnect(): Promise<void> {
    return;
  }
}

/**
 * Create an in-memory Redis instance for testing
 */
export function createInMemoryRedis(): InMemoryRedis {
  return new InMemoryRedis();
}

export default {
  mockRedis,
  createInMemoryRedis,
};
