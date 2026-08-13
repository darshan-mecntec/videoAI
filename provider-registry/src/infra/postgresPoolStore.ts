import { Pool } from 'pg';
import { ApiKeyPoolEntry } from '../domain/apiKeyPoolManager';

export class PostgresPoolStore {
  private pool: Pool;
  private initialized: boolean = false;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
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
          masked_key VARCHAR(255) NOT NULL,
          monthly_budget_usd NUMERIC(10, 4) DEFAULT 0,
          used_budget_usd NUMERIC(10, 4) DEFAULT 0,
          minute_limit INTEGER DEFAULT 60,
          requests_this_minute INTEGER DEFAULT 0,
          minute_window_start BIGINT DEFAULT 0,
          status VARCHAR(32) NOT NULL,
          latency_ms INTEGER DEFAULT 0,
          failure_count INTEGER DEFAULT 0,
          success_count INTEGER DEFAULT 0,
          last_used BIGINT DEFAULT 0,
          cooldown_until BIGINT DEFAULT 0,
          priority INTEGER DEFAULT 1,
          weight INTEGER DEFAULT 1
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
    const res = await this.pool.query('SELECT * FROM api_key_pool ORDER BY priority ASC');
    return res.rows.map((r: any) => this.mapRow(r));
  }

  public async addKey(newKey: ApiKeyPoolEntry): Promise<ApiKeyPoolEntry> {
    await this.initTable();
    await this.pool.query(
      `INSERT INTO api_key_pool (
        id, provider, key_name, key_secret, masked_key, monthly_budget_usd, used_budget_usd, minute_limit, requests_this_minute, minute_window_start, status, latency_ms, failure_count, success_count, last_used, cooldown_until, priority, weight
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO UPDATE SET
        used_budget_usd = EXCLUDED.used_budget_usd,
        requests_this_minute = EXCLUDED.requests_this_minute,
        status = EXCLUDED.status,
        latency_ms = EXCLUDED.latency_ms,
        failure_count = EXCLUDED.failure_count,
        success_count = EXCLUDED.success_count,
        last_used = EXCLUDED.last_used,
        cooldown_until = EXCLUDED.cooldown_until;`,
      [
        newKey.id,
        newKey.provider,
        newKey.keyName || '',
        newKey.keySecret || '',
        newKey.maskedKey || '',
        newKey.monthlyBudgetUsd || 0,
        newKey.usedBudgetUsd || 0,
        newKey.minuteLimit || 60,
        newKey.requestsThisMinute || 0,
        newKey.minuteWindowStart || 0,
        newKey.status || 'ACTIVE',
        newKey.latencyMs || 0,
        newKey.failureCount || 0,
        newKey.successCount || 0,
        newKey.lastUsed || 0,
        newKey.cooldownUntil || 0,
        newKey.priority || 1,
        newKey.weight || 1,
      ]
    );
    return newKey;
  }

  public async updateKey(keyId: string, updates: Partial<ApiKeyPoolEntry>): Promise<ApiKeyPoolEntry> {
    await this.initTable();
    const res = await this.pool.query('SELECT * FROM api_key_pool WHERE id = $1', [keyId]);
    if (res.rows.length === 0) {
      throw new Error(`Key '${keyId}' not found in Postgres store`);
    }
    const existing = this.mapRow(res.rows[0]);
    const updated = { ...existing, ...updates };
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
      keyName: row.key_name || '',
      keySecret: row.key_secret || '',
      maskedKey: row.masked_key || '',
      monthlyBudgetUsd: Number(row.monthly_budget_usd || 0),
      usedBudgetUsd: Number(row.used_budget_usd || 0),
      minuteLimit: Number(row.minute_limit || 60),
      requestsThisMinute: Number(row.requests_this_minute || 0),
      activeConnections: Number(row.active_connections || 0),
      minuteWindowStart: Number(row.minute_window_start || 0),
      status: row.status || 'ACTIVE',
      latencyMs: Number(row.latency_ms || 0),
      failureCount: Number(row.failure_count || 0),
      successCount: Number(row.success_count || 0),
      lastUsed: Number(row.last_used || 0),
      cooldownUntil: Number(row.cooldown_until || 0),
      priority: Number(row.priority || 1),
      weight: Number(row.weight || 1),
    };
  }
}
