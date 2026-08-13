import { createClient, RedisClientType } from 'redis';
import { CacheService } from './repository';

export class RedisCacheService implements CacheService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor(url: string = 'redis://localhost:6379') {
    this.client = createClient({ url });
    this.client.on('error', (err) => console.error('Redis Client Error:', err));
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
      this.isConnected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      await this.connect();
    }
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      try {
        return JSON.parse(data) as T;
      } catch (parseError) {
        console.error(`Redis JSON parse error for key ${key}:`, parseError);
        return null;
      }
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
    try {
      // Redis SCAN is safer than KEYS for production
      let cursor = 0;
      do {
        const result = await this.client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100
        });
        cursor = result.cursor;
        if (result.keys.length > 0) {
          await this.client.del(result.keys);
        }
      } while (cursor !== 0);
    } catch (error) {
      console.error(`Redis DEL_PATTERN error for pattern ${pattern}:`, error);
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }
}
