import { Pool } from 'pg';
import { VideoJob } from '../domain/types';
import { VideoJobRepository } from './repository';

export class PostgresVideoJobRepository implements VideoJobRepository {
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
    this.initTable().catch((err) => console.error('[PostgresVideoJobRepository] Table init error:', err));
  }

  public async initTable(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS video_jobs (
          id VARCHAR(64) PRIMARY KEY,
          provider VARCHAR(64) NOT NULL,
          provider_job_id VARCHAR(128) NOT NULL,
          status VARCHAR(32) NOT NULL,
          progress_pct INTEGER DEFAULT 0,
          request JSONB NOT NULL,
          output_url TEXT,
          thumbnail_url TEXT,
          duration_ms INTEGER,
          error_message TEXT,
          cost_usd NUMERIC(10, 4),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
    } catch (err: any) {
      if (err.code !== '23505') {
        console.warn('[PostgresVideoJobRepository] initTable warning:', err.message);
      }
    }

    this.initialized = true;
  }

  async saveJob(job: VideoJob): Promise<VideoJob> {
    await this.initTable();
    await this.pool.query(
      `INSERT INTO video_jobs (
        id, provider, provider_job_id, status, progress_pct, request, output_url, thumbnail_url, duration_ms, error_message, cost_usd, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        progress_pct = EXCLUDED.progress_pct,
        output_url = EXCLUDED.output_url,
        thumbnail_url = EXCLUDED.thumbnail_url,
        duration_ms = EXCLUDED.duration_ms,
        error_message = EXCLUDED.error_message,
        cost_usd = EXCLUDED.cost_usd,
        updated_at = NOW();`,
      [
        job.id,
        job.provider,
        job.provider_job_id,
        job.status,
        job.progress_pct || 0,
        JSON.stringify(job.request),
        job.output_url || null,
        job.thumbnail_url || null,
        job.duration_ms || null,
        job.error_message || null,
        job.cost_usd || null,
        job.created_at || new Date().toISOString(),
        job.updated_at || new Date().toISOString(),
      ]
    );
    return job;
  }

  async findJobById(id: string): Promise<VideoJob | null> {
    await this.initTable();
    const res = await this.pool.query('SELECT * FROM video_jobs WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async updateJob(id: string, update: Partial<VideoJob>): Promise<VideoJob> {
    await this.initTable();
    const existing = await this.findJobById(id);
    if (!existing) {
      throw new Error(`Job '${id}' not found`);
    }

    const updated = { ...existing, ...update, updated_at: new Date().toISOString() };
    await this.saveJob(updated);
    return updated;
  }

  async listJobs(orgId?: string): Promise<VideoJob[]> {
    await this.initTable();
    let query = 'SELECT * FROM video_jobs';
    const params: any[] = [];

    if (orgId) {
      query += ` WHERE request->>'org_id' = $1`;
      params.push(orgId);
    }
    query += ' ORDER BY created_at DESC';

    const res = await this.pool.query(query, params);
    return res.rows.map((r: any) => this.mapRow(r));
  }

  private mapRow(row: any): VideoJob {
    return {
      id: row.id,
      provider: row.provider,
      provider_job_id: row.provider_job_id,
      status: row.status,
      progress_pct: Number(row.progress_pct || 0),
      request: typeof row.request === 'string' ? JSON.parse(row.request) : row.request,
      output_url: row.output_url || undefined,
      thumbnail_url: row.thumbnail_url || undefined,
      duration_ms: row.duration_ms ? Number(row.duration_ms) : undefined,
      error_message: row.error_message || undefined,
      cost_usd: row.cost_usd ? Number(row.cost_usd) : undefined,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    };
  }
}
