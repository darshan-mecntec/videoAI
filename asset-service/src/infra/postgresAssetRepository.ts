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
          name VARCHAR(255) NOT NULL,
          type VARCHAR(32) NOT NULL,
          url TEXT NOT NULL,
          thumbnail_url TEXT,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
    } catch (err: any) {
      if (err.code !== '23505') {
        console.warn('[PostgresAssetRepository] initTable warning:', err.message);
      }
    }

    this.initialized = true;
  }

  async findAssets(options?: { type?: AssetType; project_id?: string }): Promise<MediaAsset[]> {
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
      `INSERT INTO media_assets (id, project_id, name, type, url, thumbnail_url, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         url = EXCLUDED.url,
         thumbnail_url = EXCLUDED.thumbnail_url,
         metadata = EXCLUDED.metadata;`,
      [
        asset.id,
        asset.project_id || null,
        asset.name,
        asset.type,
        asset.url,
        asset.thumbnail_url || null,
        JSON.stringify(asset.metadata || {}),
        asset.created_at || new Date().toISOString(),
      ]
    );
    return asset;
  }

  private mapRow(row: any): MediaAsset {
    return {
      id: row.id,
      project_id: row.project_id,
      name: row.name,
      type: row.type,
      url: row.url,
      thumbnail_url: row.thumbnail_url,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }
}
