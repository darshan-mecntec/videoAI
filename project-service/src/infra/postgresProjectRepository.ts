import { Pool } from 'pg';
import { Project, ProjectVersion } from '../domain/types';
import { ProjectRepository } from './repository';

export class PostgresProjectRepository implements ProjectRepository {
  private pool: Pool;
  private initialized: boolean = false;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    this.initTables().catch((err) => console.error('[PostgresProjectRepository] Table init error:', err));
  }

  public async initTables(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id VARCHAR(64) PRIMARY KEY,
          org_id VARCHAR(64) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          is_default BOOLEAN DEFAULT false,
          member_count INTEGER DEFAULT 1,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS project_versions (
          id VARCHAR(64) PRIMARY KEY,
          project_id VARCHAR(64) NOT NULL,
          version_number INTEGER NOT NULL,
          asset_url TEXT,
          snapshot_note TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
    } catch (err: any) {
      if (err.code !== '23505') {
        console.warn('[PostgresProjectRepository] initTables error:', err.message);
      }
    }

    this.initialized = true;
  }

  async findProjects(orgId: string): Promise<Project[]> {
    await this.initTables();
    const res = await this.pool.query('SELECT * FROM projects WHERE org_id = $1 ORDER BY updated_at DESC', [orgId]);
    return res.rows.map((row) => ({
      ...row,
      is_default: Boolean(row.is_default),
      member_count: Number(row.member_count || 1),
    }));
  }

  async findProjectById(id: string): Promise<Project | null> {
    await this.initTables();
    const res = await this.pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      ...row,
      is_default: Boolean(row.is_default),
      member_count: Number(row.member_count || 1),
    };
  }

  async createProject(project: Project): Promise<Project> {
    await this.initTables();
    await this.pool.query(
      `INSERT INTO projects (id, org_id, name, description, is_default, member_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         is_default = EXCLUDED.is_default,
         member_count = EXCLUDED.member_count,
         updated_at = EXCLUDED.updated_at;`,
      [
        project.id,
        project.org_id,
        project.name,
        project.description || '',
        project.is_default ?? false,
        project.member_count ?? 1,
        project.created_at || new Date().toISOString(),
        project.updated_at || new Date().toISOString(),
      ]
    );
    return project;
  }

  async saveVersion(version: ProjectVersion): Promise<ProjectVersion> {
    await this.initTables();
    await this.pool.query(
      `INSERT INTO project_versions (id, project_id, version_number, asset_url, snapshot_note, created_at)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [
        version.id,
        version.project_id,
        version.version_number,
        version.asset_url || '',
        version.snapshot_note || '',
        version.created_at || new Date().toISOString(),
      ]
    );
    return version;
  }

  async listVersions(projectId: string): Promise<ProjectVersion[]> {
    await this.initTables();
    const res = await this.pool.query('SELECT * FROM project_versions WHERE project_id = $1 ORDER BY version_number ASC', [projectId]);
    return res.rows;
  }
}
