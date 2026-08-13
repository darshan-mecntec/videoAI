import { Pool } from 'pg';
import { User, Organization, ApiKey, CreditLedgerRecord, WebhookEndpoint, OrgInvite, AuditLogEntry } from '../domain/types';
import { AuthRepository } from './repository';

export class PostgresAuthRepository implements AuthRepository {
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
    this.initTables().catch((err) => console.error('[PostgresAuthRepository] Table init error:', err));
  }

  public async initTables(): Promise<void> {
    if (this.initialized) return;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash TEXT,
        avatar_url TEXT,
        org_id VARCHAR(64) NOT NULL,
        role VARCHAR(32) NOT NULL,
        permissions JSONB DEFAULT '[]'::jsonb,
        credits_balance INTEGER DEFAULT 1000,
        credits_reserved INTEGER DEFAULT 0,
        status VARCHAR(32) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        plan VARCHAR(32) NOT NULL,
        max_concurrent_jobs INTEGER DEFAULT 5,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS org_invites (
        id VARCHAR(64) PRIMARY KEY,
        org_id VARCHAR(64) NOT NULL,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL,
        token VARCHAR(128) UNIQUE NOT NULL,
        status VARCHAR(32) DEFAULT 'pending',
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        org_id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        action VARCHAR(64) NOT NULL,
        target TEXT NOT NULL,
        ip VARCHAR(64) DEFAULT '127.0.0.1',
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id VARCHAR(64) PRIMARY KEY,
        org_id VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        key_hint VARCHAR(64) NOT NULL,
        secret_hash TEXT NOT NULL,
        scopes JSONB DEFAULT '["*"]'::jsonb,
        expires_at TIMESTAMPTZ,
        last_used_at TIMESTAMPTZ,
        status VARCHAR(32) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    try {
      await this.pool.query('ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS secret_hash TEXT;');
      await this.pool.query('ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS scopes JSONB DEFAULT \'["*"]\'::jsonb;');
      await this.pool.query('ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;');
      await this.pool.query('ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;');
      await this.pool.query('ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT \'active\';');
      await this.pool.query('ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();');
      await this.pool.query('ALTER TABLE api_keys ALTER COLUMN secret DROP NOT NULL;');
    } catch (_) {}

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS credit_ledger (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        org_id VARCHAR(64) NOT NULL,
        model_id VARCHAR(64),
        amount INTEGER NOT NULL,
        type VARCHAR(32) NOT NULL,
        status VARCHAR(32) NOT NULL,
        description TEXT NOT NULL,
        provider_cost_usd NUMERIC(10,4) DEFAULT 0,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id VARCHAR(64) PRIMARY KEY,
        org_id VARCHAR(64) NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        secret TEXT NOT NULL,
        events JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(32) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_dispatched_at TIMESTAMPTZ
      );
    `);

    this.initialized = true;
  }

  async findUserById(id: string): Promise<User | null> {
    await this.initTables();
    const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapUserRow(res.rows[0]);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    await this.initTables();
    const res = await this.pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (res.rows.length === 0) return null;
    return this.mapUserRow(res.rows[0]);
  }

  async createUser(user: User): Promise<User> {
    await this.initTables();
    await this.pool.query(
      `INSERT INTO users (id, email, name, password_hash, avatar_url, org_id, role, permissions, credits_balance, credits_reserved, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         permissions = EXCLUDED.permissions,
         credits_balance = EXCLUDED.credits_balance,
         credits_reserved = EXCLUDED.credits_reserved,
         status = EXCLUDED.status;`,
      [
        user.id,
        user.email,
        user.name,
        user.password_hash || null,
        user.avatar_url || null,
        user.org_id,
        user.role,
        JSON.stringify(user.permissions || []),
        user.credits_balance ?? 1000,
        user.credits_reserved ?? 0,
        user.status || 'active',
        user.created_at || new Date().toISOString(),
      ]
    );
    return user;
  }

  async updateUser(user: User): Promise<User> {
    return this.createUser(user);
  }

  async deleteUser(id: string): Promise<boolean> {
    await this.initTables();
    await this.pool.query('DELETE FROM users WHERE id = $1', [id]);
    return true;
  }

  async listUsersByOrg(orgId: string): Promise<User[]> {
    await this.initTables();
    const res = await this.pool.query('SELECT * FROM users WHERE org_id = $1 ORDER BY created_at ASC', [orgId]);
    return res.rows.map((row) => this.mapUserRow(row));
  }

  async listAllUsers(): Promise<User[]> {
    await this.initTables();
    const res = await this.pool.query('SELECT * FROM users ORDER BY created_at ASC');
    return res.rows.map((row) => this.mapUserRow(row));
  }

  async findOrgs(): Promise<Organization[]> {
    await this.initTables();
    const res = await this.pool.query('SELECT * FROM organizations ORDER BY created_at ASC');
    return res.rows;
  }

  async findOrgById(id: string): Promise<Organization | null> {
    await this.initTables();
    const res = await this.pool.query('SELECT * FROM organizations WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async createOrg(org: Organization): Promise<Organization> {
    await this.initTables();
    await this.pool.query(
      `INSERT INTO organizations (id, name, slug, plan, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, plan = EXCLUDED.plan;`,
      [org.id, org.name, org.slug, org.plan, org.created_at || new Date().toISOString()]
    );
    return org;
  }

  async findApiKeys(orgId: string): Promise<ApiKey[]> {
    await this.initTables();
    const res = await this.pool.query("SELECT * FROM api_keys WHERE org_id = $1 AND status = 'active' ORDER BY created_at DESC", [orgId]);
    return res.rows.map(r => ({
      ...r,
      scopes: typeof r.scopes === 'string' ? JSON.parse(r.scopes) : r.scopes || ['*'],
    }));
  }

  async findApiKeyById(id: string): Promise<ApiKey | null> {
    await this.initTables();
    const res = await this.pool.query('SELECT * FROM api_keys WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      ...r,
      scopes: typeof r.scopes === 'string' ? JSON.parse(r.scopes) : r.scopes || ['*'],
    };
  }

  async createApiKey(key: ApiKey): Promise<ApiKey> {
    await this.initTables();
    await this.pool.query(
      `INSERT INTO api_keys (id, org_id, name, key_hint, secret_hash, scopes, expires_at, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
      [key.id, key.org_id, key.name, key.key_hint, key.secret_hash, JSON.stringify(key.scopes || ['*']), key.expires_at || null, key.status || 'active', key.created_at || new Date().toISOString()]
    );
    return key;
  }

  async revokeApiKey(id: string): Promise<boolean> {
    await this.initTables();
    const res = await this.pool.query("UPDATE api_keys SET status = 'revoked' WHERE id = $1", [id]);
    return (res.rowCount || 0) > 0;
  }

  async addLedgerRecord(record: CreditLedgerRecord): Promise<CreditLedgerRecord> {
    await this.initTables();
    await this.pool.query(
      `INSERT INTO credit_ledger (id, user_id, org_id, model_id, amount, type, status, description, provider_cost_usd, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
      [record.id, record.userId, record.orgId, record.modelId || null, record.amount, record.type, record.status, record.description, record.providerCostUsd || 0, record.timestamp || new Date().toISOString()]
    );
    return record;
  }

  async getLedgerRecords(userId?: string, orgId?: string): Promise<CreditLedgerRecord[]> {
    await this.initTables();
    let query = 'SELECT * FROM credit_ledger WHERE 1=1';
    const params: any[] = [];
    if (userId) {
      params.push(userId);
      query += ` AND user_id = $${params.length}`;
    }
    if (orgId) {
      params.push(orgId);
      query += ` AND org_id = $${params.length}`;
    }
    query += ' ORDER BY timestamp DESC';
    const res = await this.pool.query(query, params);
    return res.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      orgId: r.org_id,
      modelId: r.model_id,
      amount: Number(r.amount),
      type: r.type,
      status: r.status,
      description: r.description,
      providerCostUsd: Number(r.provider_cost_usd || 0),
      timestamp: r.timestamp,
    }));
  }

  async getLedgerAnalytics(orgId?: string): Promise<{ totalCreditsConsumed: number; totalProviderCostUsd: number; byModel: Record<string, number> }> {
    const records = await this.getLedgerRecords(undefined, orgId);
    let totalCreditsConsumed = 0;
    let totalProviderCostUsd = 0;
    const byModel: Record<string, number> = {};

    for (const r of records) {
      if (r.type === 'COMMIT' || r.type === 'RESERVE') {
        totalCreditsConsumed += r.amount;
        totalProviderCostUsd += r.providerCostUsd || 0;
        if (r.modelId) {
          byModel[r.modelId] = (byModel[r.modelId] || 0) + r.amount;
        }
      }
    }

    return {
      totalCreditsConsumed,
      totalProviderCostUsd: Number(totalProviderCostUsd.toFixed(4)),
      byModel,
    };
  }

  async findWebhooks(orgId: string): Promise<WebhookEndpoint[]> {
    await this.initTables();
    const res = await this.pool.query('SELECT * FROM webhooks WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    return res.rows.map(r => ({
      ...r,
      events: typeof r.events === 'string' ? JSON.parse(r.events) : r.events || [],
    }));
  }

  async createWebhook(webhook: WebhookEndpoint): Promise<WebhookEndpoint> {
    await this.initTables();
    await this.pool.query(
      `INSERT INTO webhooks (id, org_id, url, description, secret, events, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
      [webhook.id, webhook.org_id, webhook.url, webhook.description, webhook.secret, JSON.stringify(webhook.events || []), webhook.status, webhook.created_at || new Date().toISOString()]
    );
    return webhook;
  }

  async deleteWebhook(id: string): Promise<boolean> {
    await this.initTables();
    const res = await this.pool.query('DELETE FROM webhooks WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  async updateOrg(org: Organization): Promise<Organization> {
    await this.initTables();
    await this.pool.query(
      `UPDATE organizations SET name = $1, slug = $2, plan = $3, max_concurrent_jobs = $4 WHERE id = $5;`,
      [org.name, org.slug, org.plan, org.max_concurrent_jobs || 5, org.id]
    );
    return org;
  }

  async createInvite(invite: OrgInvite): Promise<OrgInvite> {
    await this.initTables();
    await this.pool.query(
      `INSERT INTO org_invites (id, org_id, email, role, token, status, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
      [invite.id, invite.org_id, invite.email, invite.role, invite.token, invite.status, invite.expires_at, invite.created_at || new Date().toISOString()]
    );
    return invite;
  }

  async findInviteByToken(token: string): Promise<OrgInvite | null> {
    await this.initTables();
    const res = await this.pool.query('SELECT * FROM org_invites WHERE token = $1', [token]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      org_id: r.org_id,
      email: r.email,
      role: r.role,
      token: r.token,
      status: r.status,
      expires_at: new Date(r.expires_at).toISOString(),
      created_at: new Date(r.created_at).toISOString(),
    };
  }

  async listInvitesByOrg(orgId: string): Promise<OrgInvite[]> {
    await this.initTables();
    const res = await this.pool.query('SELECT * FROM org_invites WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    return res.rows.map(r => ({
      id: r.id,
      org_id: r.org_id,
      email: r.email,
      role: r.role,
      token: r.token,
      status: r.status,
      expires_at: new Date(r.expires_at).toISOString(),
      created_at: new Date(r.created_at).toISOString(),
    }));
  }

  async updateInvite(invite: OrgInvite): Promise<OrgInvite> {
    await this.initTables();
    await this.pool.query(
      `UPDATE org_invites SET status = $1 WHERE id = $2;`,
      [invite.status, invite.id]
    );
    return invite;
  }

  async addAuditLog(entry: AuditLogEntry): Promise<AuditLogEntry> {
    await this.initTables();
    await this.pool.query(
      `INSERT INTO audit_logs (id, org_id, user_id, user_email, action, target, ip, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
      [entry.id, entry.org_id, entry.user_id, entry.user_email, entry.action, entry.target, entry.ip || '127.0.0.1', entry.timestamp || new Date().toISOString()]
    );
    return entry;
  }

  async getAuditLogs(orgId: string): Promise<AuditLogEntry[]> {
    await this.initTables();
    const query = orgId ? 'SELECT * FROM audit_logs WHERE org_id = $1 ORDER BY timestamp DESC LIMIT 100' : 'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100';
    const params = orgId ? [orgId] : [];
    const res = await this.pool.query(query, params);
    return res.rows.map(r => ({
      id: r.id,
      org_id: r.org_id,
      user_id: r.user_id,
      user_email: r.user_email,
      action: r.action,
      target: r.target,
      ip: r.ip,
      timestamp: new Date(r.timestamp).toISOString(),
    }));
  }

  private mapUserRow(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      password_hash: row.password_hash,
      avatar_url: row.avatar_url,
      org_id: row.org_id,
      role: row.role,
      permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions || [],
      credits_balance: Number(row.credits_balance || 0),
      credits_reserved: Number(row.credits_reserved || 0),
      status: row.status || 'active',
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }
}

