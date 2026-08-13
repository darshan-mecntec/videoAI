import fs from 'fs';
import path from 'path';
import { ApiKeyPoolEntry } from '../domain/apiKeyPoolManager';

interface PoolSchema {
  keys: ApiKeyPoolEntry[];
}

export class JsonFilePoolStore {
  private filePath: string;

  constructor(customPath?: string) {
    this.filePath = customPath || path.join(__dirname, '../../data/pool_keys.json');
    this.ensureFileExists();
  }

  private ensureFileExists(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      const initial: PoolSchema = { keys: [] };
      fs.writeFileSync(this.filePath, JSON.stringify(initial, null, 2), 'utf-8');
    }
  }

  public readKeys(): ApiKeyPoolEntry[] {
    try {
      this.ensureFileExists();
      const content = fs.readFileSync(this.filePath, 'utf-8');
      const data = JSON.parse(content) as PoolSchema;
      return data.keys || [];
    } catch (err) {
      return [];
    }
  }

  public writeKeys(keys: ApiKeyPoolEntry[]): void {
    this.ensureFileExists();
    const data: PoolSchema = { keys };
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  public addKey(newKey: ApiKeyPoolEntry): ApiKeyPoolEntry {
    const keys = this.readKeys();
    keys.unshift(newKey);
    this.writeKeys(keys);
    return newKey;
  }

  public updateKey(keyId: string, updates: Partial<ApiKeyPoolEntry>): ApiKeyPoolEntry {
    const keys = this.readKeys();
    const index = keys.findIndex((k) => k.id === keyId);
    if (index === -1) {
      throw new Error(`Key '${keyId}' not found in persistent store`);
    }
    keys[index] = { ...keys[index], ...updates };
    this.writeKeys(keys);
    return keys[index];
  }

  public deleteKey(keyId: string): boolean {
    const keys = this.readKeys();
    const filtered = keys.filter((k) => k.id !== keyId);
    if (filtered.length !== keys.length) {
      this.writeKeys(filtered);
      return true;
    }
    return false;
  }
}

export const globalJsonPoolStore = new JsonFilePoolStore();
