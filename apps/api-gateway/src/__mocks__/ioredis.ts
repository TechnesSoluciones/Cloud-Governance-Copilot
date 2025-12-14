/**
 * IORedis Mock
 *
 * This mock prevents actual Redis connections during tests.
 * Provides a mock Redis client with common methods.
 */

export default class IORedis {
  public host: string;
  public port: number;
  public password?: string;
  public status: string;

  constructor(opts?: any) {
    this.host = opts?.host || 'localhost';
    this.port = opts?.port || 6379;
    this.password = opts?.password;
    this.status = 'ready';
  }

  async connect() {
    return this;
  }

  async disconnect() {
    return 'OK';
  }

  async quit() {
    return 'OK';
  }

  async ping() {
    return 'PONG';
  }

  async get(key: string) {
    return null;
  }

  async set(key: string, value: any) {
    return 'OK';
  }

  async del(key: string) {
    return 1;
  }

  async exists(key: string) {
    return 0;
  }

  async expire(key: string, seconds: number) {
    return 1;
  }

  async ttl(key: string) {
    return -1;
  }

  async keys(pattern: string) {
    return [];
  }

  async scan(cursor: number) {
    return ['0', []];
  }

  async hget(key: string, field: string) {
    return null;
  }

  async hset(key: string, field: string, value: any) {
    return 1;
  }

  async hgetall(key: string) {
    return {};
  }

  async lpush(key: string, ...values: any[]) {
    return values.length;
  }

  async rpush(key: string, ...values: any[]) {
    return values.length;
  }

  async lpop(key: string) {
    return null;
  }

  async rpop(key: string) {
    return null;
  }

  async lrange(key: string, start: number, stop: number) {
    return [];
  }

  async sadd(key: string, ...members: any[]) {
    return members.length;
  }

  async smembers(key: string) {
    return [];
  }

  async sismember(key: string, member: any) {
    return 0;
  }

  async zadd(key: string, ...args: any[]) {
    return 1;
  }

  async zrange(key: string, start: number, stop: number) {
    return [];
  }

  async zrangebyscore(key: string, min: number, max: number) {
    return [];
  }

  async publish(channel: string, message: any) {
    return 0;
  }

  async subscribe(channel: string) {
    return;
  }

  on(event: string, callback: Function) {
    return this;
  }

  once(event: string, callback: Function) {
    return this;
  }

  off(event: string, callback?: Function) {
    return this;
  }

  removeListener(event: string, callback: Function) {
    return this;
  }

  duplicate() {
    return new IORedis();
  }
}
