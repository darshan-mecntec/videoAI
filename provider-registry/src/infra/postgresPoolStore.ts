import { Pool } from 'pg';
import { ApiKeyPoolEntry } from '../domain/apiKeyPoolManager';

export class PostgresPoolStore {
  private pool: Pool;
  private initialized: boolean = false;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    this.initTable().catch((err) => console.error('[PostgresPoolStore] Table init error:', err));
  }

  public async initTable(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS api_key_pool (
          id VARCHAR(64) PRIMARY KEY,
          provider VARCHAR(64) NOT NULL,
          key_name VARCHAR(255) NOT NULL,
          key_secret TEXT NOT NULL,
          masked_key VARCHAR(64) NOT NULL,
          monthly_budget_usd NUMERIC(10, 2) NOT NULL DEFAULT 5000,
          used_budget_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
          minute_limit INTEGER DEFAULT 100,
          requests_this_minute INTEGER DEFAULT 0,
          minute_window_start BIGINT DEFAULT 0,
          status VARCHAR(32) DEFAULT 'ACTIVE',
          latency_ms INTEGER DEFAULT 300,
          failure_count INTEGER DEFAULT 0,
          success_count INTEGER DEFAULT 0,
          last_used BIGINT DEFAULT 0,
          cooldown_until BIGINT DEFAULT 0,
          priority INTEGER DEFAULT 1,
          weight INTEGER DEFAULT 100
        );
      `);
    } catch (err: any) {
      if (err.code !== '23505') {
        console.warn('[PostgresPoolStore] initTable warning:', err.message);
      }
    }

    this.initialized = true;
  }

  public async readKeys(): Promise<ApiKeyPoolEntry[]> {
    await this.initTable();
    const res = await this.pool.query('SELECT * FROM api_key_pool ORDER BY priority ASC, last_used DESC');
    return res.rows.map((row) => this.mapRow(row));
  }

  public async addKey(newKey: ApiKeyPoolEntry): Promise<ApiKeyPoolEntry> {
    await this.initTable();
    await this.pool.query(
      `INSERT INTO api_key_pool (id, provider, key_name, key_secret, masked_key, monthly_budget_usd, used_budget_usd, minute_limit, requests_this_minute, minute_window_start, status, latency_ms, failure_count, success_count, last_used, cooldown_until, priority, weight)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (id) DO UPDATE SET
         provider = EXCLUDED.provider,
         key_name = EXCLUDED.key_name,
         monthly_budget_usd = EXCLUDED.monthly_budget_usd,
         used_budget_usd = EXCLUDED.used_budget_usd,
         status = EXCLUDED.status,
         priority = EXCLUDED.priority;`,
      [
        newKey.id,
        newKey.provider,
        newKeyNameFix(newKey.keyName),
        newKey.keySecret,
        newKey.maskedKey,
        newKey.monthlyBudgetUsd,
        newKey.usedBudgetUsd || 0,
        newKey.minuteLimit || 100,
        newKey.requestsThisMinute || 0,
        BigInt(newKey.minuteWindowStart || Date.now()),
        newKey.status || 'ACTIVE',
        newKey.latencyMs || 300,
        newKey.failureCount || 0,
        newKey.successCount || 0,
        BigInt(newKey.lastUsed || Date.now()),
        BigInt(newKey.cooldownUntil || 0),
        newKey.priority || 1,
        newKey.weight || 100,
      ]
    );
    return newKey;
  }

  public async updateKey(keyId: string, updates: Partial<ApiKeyPoolEntry>): Promise<ApiKeyPoolEntry> {
    await this.initTable();
    const existing = await this.readKeys();
    const target = existing.find((k) => k.id === keyId);
    if (!target) {
      throw new Error(`Key '${keyId}' not found in Neon PostgreSQL pool`);
    }

    const updated = { ...target, ...updates };
    await this.addKey(updated);
    return updated;
  }

  public async deleteKey(keyId: string): Promise<boolean> {
    await this.initTable();
    const res = await this.pool.query('DELETE FROM api_key_pool WHERE id = $1', [keyId]);
    return (res.rowCount || 0) > 0;
  }

  private mapRow(row: any): ApiKeyPoolEntry {
    return {
      id: row.id,
      provider: row.provider,
      keyName: row.key_name,
      keySecret: row.key_secret,
      maskedKey: row.masked_key,
      monthlyBudgetUsd: Number(row.monthly_budget_usd || 5000),
      usedBudgetUsd: Number(row.used_budget_usd || 0),
      minuteLimit: Number(row.minute_limit || 100),
      requestsThisMinute: Number(row.requests_this_minute || 0),
      minuteWindowStart: Number(row.minute_window_start || Date.now()),
      status: row.status || 'ACTIVE',
      latencyMs: Number(row.latency_ms || 300),
      failureCount: Number(row.failure_count || 0),
      successCount: Number(row.success_count || 0),
      lastUsed: Number(row.last_used || Date.now()),
      cooldownUntil: Number(row.cooldown_until || 0),
      priority: Number(row.priority || 1),
      weight: Number(row.weight || 100),
    };
  }
}

function newKeyNameFix(name: string): string {
  return name || 'API Key';
}
