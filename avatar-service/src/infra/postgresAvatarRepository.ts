import { Pool } from 'pg';
import { Avatar, Voice, AvatarVideo } from '../domain/types';
import { AvatarRepository } from './repository';

export class PostgresAvatarRepository implements AvatarRepository {
  private pool: Pool;
  private initialized: boolean = false;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    this.initTables().catch((err) => console.error('[PostgresAvatarRepository] Init error:', err));
  }

  public async initTables(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS avatars (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          org_id VARCHAR(64) NOT NULL,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(64) NOT NULL,
          model_quality VARCHAR(64) NOT NULL DEFAULT 'Avatar IV Standard',
          thumbnail_url TEXT NOT NULL,
          video_sample_url TEXT,
          assigned_voice_id VARCHAR(64),
          assigned_voice_name VARCHAR(255),
          status VARCHAR(32) NOT NULL DEFAULT 'Ready',
          pose VARCHAR(64) NOT NULL DEFAULT 'Upper Body',
          is_system BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS voices (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64),
          org_id VARCHAR(64),
          name VARCHAR(255) NOT NULL,
          desc_text TEXT,
          gender VARCHAR(32) NOT NULL DEFAULT 'Female',
          country VARCHAR(64) NOT NULL DEFAULT '🇺🇸',
          category VARCHAR(64) NOT NULL DEFAULT 'Lifelike',
          sample_audio_url TEXT,
          is_system BOOLEAN NOT NULL DEFAULT false,
          elevenlabs_voice_id VARCHAR(128),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS avatar_videos (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          org_id VARCHAR(64) NOT NULL,
          avatar_id VARCHAR(64) NOT NULL,
          avatar_name VARCHAR(255) NOT NULL,
          voice_id VARCHAR(64) NOT NULL,
          voice_name VARCHAR(255) NOT NULL,
          model_quality VARCHAR(64) NOT NULL,
          script_text TEXT NOT NULL,
          aspect_ratio VARCHAR(16) NOT NULL DEFAULT '16:9',
          duration_sec INTEGER NOT NULL DEFAULT 15,
          credits_deducted INTEGER NOT NULL DEFAULT 0,
          output_video_url TEXT,
          status VARCHAR(32) NOT NULL DEFAULT 'Processing',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
    } catch (err: any) {
      if (err.code !== '23505') {
        console.warn('[PostgresAvatarRepository] Table init warning:', err.message);
      }
    }

    this.initialized = true;
  }

  async findAvatars(userId?: string, orgId?: string): Promise<Avatar[]> {
    await this.initTables();
    let query = 'SELECT * FROM avatars WHERE is_system = true';
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      query += ` OR user_id = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';
    const res = await this.pool.query(query, params);
    return res.rows.map((row) => this.mapAvatarRow(row));
  }

  async findAvatarById(id: string): Promise<Avatar | null> {
    await this.initTables();
    const res = await this.pool.query('SELECT * FROM avatars WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapAvatarRow(res.rows[0]);
  }

  async createAvatar(avatar: Avatar): Promise<Avatar> {
    await this.initTables();
    await this.pool.query(
      `INSERT INTO avatars (id, user_id, org_id, name, type, model_quality, thumbnail_url, video_sample_url, assigned_voice_id, assigned_voice_name, status, pose, is_system, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         status = EXCLUDED.status,
         assigned_voice_id = EXCLUDED.assigned_voice_id,
         assigned_voice_name = EXCLUDED.assigned_voice_name,
         updated_at = EXCLUDED.updated_at;`,
      [
        avatar.id,
        avatar.user_id,
        avatar.org_id,
        avatar.name,
        avatar.type,
        avatar.model_quality,
        avatar.thumbnail_url,
        avatar.video_sample_url || null,
        avatar.assigned_voice_id || null,
        avatar.assigned_voice_name || null,
        avatar.status,
        avatar.pose,
        avatar.is_system,
        avatar.created_at || new Date().toISOString(),
        avatar.updated_at || new Date().toISOString(),
      ]
    );
    return avatar;
  }

  async updateAvatar(id: string, updates: Partial<Avatar>): Promise<Avatar | null> {
    const existing = await this.findAvatarById(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    await this.createAvatar(updated);
    return updated;
  }

  async deleteAvatar(id: string): Promise<boolean> {
    await this.initTables();
    const res = await this.pool.query('DELETE FROM avatars WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  async findVoices(userId?: string): Promise<Voice[]> {
    await this.initTables();
    let query = 'SELECT * FROM voices WHERE is_system = true';
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      query += ` OR user_id = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';
    const res = await this.pool.query(query, params);
    return res.rows.map((row) => this.mapVoiceRow(row));
  }

  async findVoiceById(id: string): Promise<Voice | null> {
    await this.initTables();
    const res = await this.pool.query('SELECT * FROM voices WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapVoiceRow(res.rows[0]);
  }

  async createVoice(voice: Voice): Promise<Voice> {
    await this.initTables();
    await this.pool.query(
      `INSERT INTO voices (id, user_id, org_id, name, desc_text, gender, country, category, sample_audio_url, is_system, elevenlabs_voice_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, desc_text = EXCLUDED.desc_text;`,
      [
        voice.id,
        voice.user_id || null,
        voice.org_id || null,
        voice.name,
        voice.desc || '',
        voice.gender,
        voice.country,
        voice.category,
        voice.sample_audio_url || null,
        voice.is_system,
        voice.elevenlabs_voice_id || null,
        voice.created_at || new Date().toISOString(),
      ]
    );
    return voice;
  }

  async deleteVoice(id: string): Promise<boolean> {
    await this.initTables();
    const res = await this.pool.query('DELETE FROM voices WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  async createAvatarVideo(video: AvatarVideo): Promise<AvatarVideo> {
    await this.initTables();
    await this.pool.query(
      `INSERT INTO avatar_videos (id, user_id, org_id, avatar_id, avatar_name, voice_id, voice_name, model_quality, script_text, aspect_ratio, duration_sec, credits_deducted, output_video_url, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, output_video_url = EXCLUDED.output_video_url;`,
      [
        video.id,
        video.user_id,
        video.org_id,
        video.avatar_id,
        video.avatar_name,
        video.voice_id,
        video.voice_name,
        video.model_quality,
        video.script_text,
        video.aspect_ratio,
        video.duration_sec,
        video.credits_deducted,
        video.output_video_url || null,
        video.status,
        video.created_at || new Date().toISOString(),
      ]
    );
    return video;
  }

  async findAvatarVideoById(id: string): Promise<AvatarVideo | null> {
    await this.initTables();
    const res = await this.pool.query('SELECT * FROM avatar_videos WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  async updateAvatarVideo(id: string, updates: Partial<AvatarVideo>): Promise<AvatarVideo | null> {
    const existing = await this.findAvatarVideoById(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    await this.createAvatarVideo(updated);
    return updated;
  }

  async listAvatarVideos(userId?: string): Promise<AvatarVideo[]> {
    await this.initTables();
    let query = 'SELECT * FROM avatar_videos';
    const params: any[] = [];
    if (userId) {
      query += ' WHERE user_id = $1';
      params.push(userId);
    }
    query += ' ORDER BY created_at DESC';
    const res = await this.pool.query(query, params);
    return res.rows;
  }

  private mapAvatarRow(row: any): Avatar {
    return {
      id: row.id,
      user_id: row.user_id,
      org_id: row.org_id,
      name: row.name,
      type: row.type,
      model_quality: row.model_quality,
      thumbnail_url: row.thumbnail_url,
      video_sample_url: row.video_sample_url,
      assigned_voice_id: row.assigned_voice_id,
      assigned_voice_name: row.assigned_voice_name,
      status: row.status,
      pose: row.pose,
      is_system: Boolean(row.is_system),
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  private mapVoiceRow(row: any): Voice {
    return {
      id: row.id,
      user_id: row.user_id,
      org_id: row.org_id,
      name: row.name,
      desc: row.desc_text || '',
      gender: row.gender,
      country: row.country,
      category: row.category,
      sample_audio_url: row.sample_audio_url,
      is_system: Boolean(row.is_system),
      elevenlabs_voice_id: row.elevenlabs_voice_id,
      created_at: new Date(row.created_at).toISOString(),
    };
  }
}
