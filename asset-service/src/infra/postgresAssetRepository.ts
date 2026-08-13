import { Pool } from 'pg';
import { MediaAsset, AssetType } from '../domain/types';
import { AssetRepository } from './repository';

export class PostgresAssetRepository implements AssetRepository {
  private pool: Pool;
  private initialized: boolean = false;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    this.initTable().catch((err) => console.error('[PostgresAssetRepository] Table init error:', err));
  }

  public async initTable(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS media_assets (
          id VARCHAR(64) PRIMARY KEY,
          project_id VARCHAR(64),
          user_id VARCHAR(64),
          org_id VARCHAR(64),
          name VARCHAR(255) NOT NULL,
          type VARCHAR(32) NOT NULL,
          url TEXT NOT NULL,
          thumbnail_url TEXT,
          starred BOOLEAN DEFAULT false,
          prompt TEXT,
          credits INTEGER DEFAULT 15,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Add columns if table already existed without them
      await this.pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS user_id VARCHAR(64);`);
      await this.pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS org_id VARCHAR(64);`);
      await this.pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS starred BOOLEAN DEFAULT false;`);
      await this.pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS prompt TEXT;`);
      await this.pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 15;`);
    } catch (err: any) {
      if (err.code !== '23505') {
        console.warn('[PostgresAssetRepository] initTable warning:', err.message);
      }
    }

    this.initialized = true;
  }

  async findAssets(options?: { type?: AssetType; project_id?: string; user_id?: string; org_id?: string; starred?: boolean }): Promise<MediaAsset[]> {
    await this.initTable();
    let query = 'SELECT * FROM media_assets';
    const params: any[] = [];
    const conditions: string[] = [];

    if (options?.type) {
      conditions.push(`type = $${params.length + 1}`);
      params.push(options.type);
    }
    if (options?.project_id) {
      conditions.push(`project_id = $${params.length + 1}`);
      params.push(options.project_id);
    }
    if (options?.user_id) {
      conditions.push(`user_id = $${params.length + 1}`);
      params.push(options.user_id);
    }
    if (options?.org_id) {
      conditions.push(`org_id = $${params.length + 1}`);
      params.push(options.org_id);
    }
    if (options?.starred !== undefined) {
      conditions.push(`starred = $${params.length + 1}`);
      params.push(options.starred);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const res = await this.pool.query(query, params);
    return res.rows.map((row) => this.mapRow(row));
  }

  async findAssetById(id: string): Promise<MediaAsset | null> {
    await this.initTable();
    const res = await this.pool.query('SELECT * FROM media_assets WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async createAsset(asset: MediaAsset): Promise<MediaAsset> {
    await this.initTable();
    await this.pool.query(
      `INSERT INTO media_assets (id, project_id, user_id, org_id, name, type, url, thumbnail_url, starred, prompt, credits, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         url = EXCLUDED.url,
         thumbnail_url = EXCLUDED.thumbnail_url,
         starred = EXCLUDED.starred,
         prompt = EXCLUDED.prompt,
         credits = EXCLUDED.credits,
         metadata = EXCLUDED.metadata;`,
      [
        asset.id,
        asset.project_id || null,
        asset.user_id || null,
        asset.org_id || null,
        asset.name,
        asset.type,
        asset.url,
        asset.thumbnail_url || null,
        Boolean(asset.starred),
        asset.prompt || null,
        asset.credits || 15,
        JSON.stringify(asset.metadata || {}),
        asset.created_at || new Date().toISOString(),
      ]
    );
    return asset;
  }

  async updateAsset(id: string, patch: Partial<MediaAsset>): Promise<MediaAsset> {
    await this.initTable();
    const existing = await this.findAssetById(id);
    if (!existing) {
      throw new Error(`Asset '${id}' not found`);
    }

    const updated = { ...existing, ...patch };
    await this.pool.query(
      `UPDATE media_assets
       SET name = $1, type = $2, url = $3, thumbnail_url = $4, starred = $5, prompt = $6, credits = $7, metadata = $8
       WHERE id = $9`,
      [
        updated.name,
        updated.type,
        updated.url,
        updated.thumbnail_url || null,
        Boolean(updated.starred),
        updated.prompt || null,
        updated.credits || 15,
        JSON.stringify(updated.metadata || {}),
        id,
      ]
    );
    return updated;
  }

  async deleteAsset(id: string): Promise<boolean> {
    await this.initTable();
    const res = await this.pool.query('DELETE FROM media_assets WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  private mapRow(row: any): MediaAsset {
    return {
      id: row.id,
      project_id: row.project_id,
      user_id: row.user_id,
      org_id: row.org_id,
      name: row.name,
      type: row.type,
      url: row.url,
      thumbnail_url: row.thumbnail_url,
      starred: Boolean(row.starred),
      prompt: row.prompt || '',
      credits: row.credits || 15,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }
}
