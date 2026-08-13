import { Pool } from 'pg';
import { User, Organization, ApiKey } from '../domain/types';
import { AuthRepository } from './repository';

export class PostgresAuthRepository implements AuthRepository {
  private pool: Pool;
  private initialized: boolean = false;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
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
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id VARCHAR(64) PRIMARY KEY,
        org_id VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        key_hint VARCHAR(64) NOT NULL,
        secret TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
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
    const res = await this.pool.query('SELECT * FROM api_keys WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    return res.rows;
  }

  async createApiKey(key: ApiKey): Promise<ApiKey> {
    await this.initTables();
    await this.pool.query(
      `INSERT INTO api_keys (id, org_id, name, key_hint, secret, created_at)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [key.id, key.org_id, key.name, key.key_hint, key.secret, key.created_at || new Date().toISOString()]
    );
    return key;
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
