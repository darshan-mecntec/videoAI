import { Pool } from 'pg';
import { ModelCatalogueEntry } from '../domain/types';
import fs from 'fs';
import path from 'path';

export class PostgresModelCatalogueStore {
  private pool: Pool | null = null;
  private jsonPath: string;
  private initialized: boolean = false;

  constructor(connectionString?: string) {
    this.jsonPath = path.join(__dirname, '../../data/model_catalogue.json');
    if (connectionString) {
      this.pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
      });
    }
    this.initTable().catch((err) => console.warn('[ModelCatalogueStore] Table init warning:', err.message));
  }

  public async initTable(): Promise<void> {
    if (this.initialized) return;

    if (this.pool) {
      try {
        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS ai_model_catalogue (
            id VARCHAR(64) PRIMARY KEY,
            display_name VARCHAR(255) NOT NULL,
            provider_slug VARCHAR(64) NOT NULL,
            provider_model_id VARCHAR(255) NOT NULL,
            modality VARCHAR(64) NOT NULL,
            quality_tier VARCHAR(32) DEFAULT 'standard',
            credits_per_unit NUMERIC(10, 4) NOT NULL,
            unit VARCHAR(64) NOT NULL,
            provider_cost_usd NUMERIC(10, 6) DEFAULT 0,
            description TEXT,
            is_enabled BOOLEAN DEFAULT true,
            is_featured BOOLEAN DEFAULT false,
            sort_order INTEGER DEFAULT 10,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);
      } catch (err: any) {
        console.warn('[ModelCatalogueStore] Postgres init warning:', err.message);
      }
    } else {
      const dir = path.dirname(this.jsonPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (!fs.existsSync(this.jsonPath)) {
        fs.writeFileSync(this.jsonPath, JSON.stringify([], null, 2));
      }
    }

    this.initialized = true;
    await this.seedDefaultCatalogueIfEmpty();
  }

  public async seedDefaultCatalogueIfEmpty(): Promise<void> {
    const existing = await this.listAllModels();
    if (existing.length > 0) return;

    const now = new Date().toISOString();
    const defaults: ModelCatalogueEntry[] = [
      {
        id: 'veo-3-1-pro',
        display_name: 'Google Veo 3.1 Pro',
        provider_slug: 'google-veo',
        provider_model_id: 'veo-3.1-generate-001',
        modality: 'text-to-video',
        quality_tier: 'pro',
        credits_per_unit: 12,
        unit: 'per-second',
        provider_cost_usd: 0.160,
        description: 'Cinematic 4K video generation with native audio sync',
        is_enabled: true,
        is_featured: true,
        sort_order: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'veo-3-1-fast',
        display_name: 'Google Veo 3.1 Fast',
        provider_slug: 'google-veo',
        provider_model_id: 'veo-3.1-fast-001',
        modality: 'text-to-video',
        quality_tier: 'fast',
        credits_per_unit: 6,
        unit: 'per-second',
        provider_cost_usd: 0.080,
        description: 'High-speed video generation for rapid iteration',
        is_enabled: true,
        is_featured: false,
        sort_order: 2,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'imagen-3-ultra',
        display_name: 'Google Imagen 3 Ultra',
        provider_slug: 'google-veo',
        provider_model_id: 'imagen-3.0-generate-002',
        modality: 'text-to-image',
        quality_tier: 'pro',
        credits_per_unit: 5,
        unit: 'per-image',
        provider_cost_usd: 0.067,
        description: 'Photorealistic 4K image generation via Google key pool',
        is_enabled: true,
        is_featured: true,
        sort_order: 3,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'dall-e-3-hd',
        display_name: 'OpenAI DALL-E 3 HD',
        provider_slug: 'openai',
        provider_model_id: 'dall-e-3',
        modality: 'text-to-image',
        quality_tier: 'pro',
        credits_per_unit: 4,
        unit: 'per-image',
        provider_cost_usd: 0.040,
        description: 'High-definition creative & typography render',
        is_enabled: true,
        is_featured: false,
        sort_order: 4,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'eleven-v3-cinematic',
        display_name: 'ElevenLabs Eleven v3 (Cinematic)',
        provider_slug: 'elevenlabs',
        provider_model_id: 'eleven_v3',
        modality: 'voice-tts',
        quality_tier: 'pro',
        credits_per_unit: 2,
        unit: 'per-1k-chars',
        provider_cost_usd: 0.019,
        description: 'Emotional, cinematic multi-language voice synthesis',
        is_enabled: true,
        is_featured: true,
        sort_order: 5,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'eleven-flash-2-5',
        display_name: 'ElevenLabs Flash v2.5 (Realtime)',
        provider_slug: 'elevenlabs',
        provider_model_id: 'eleven_flash_v2_5',
        modality: 'voice-tts',
        quality_tier: 'fast',
        credits_per_unit: 1,
        unit: 'per-1k-chars',
        provider_cost_usd: 0.012,
        description: '75ms ultra-low latency voice for AI Avatars',
        is_enabled: true,
        is_featured: false,
        sort_order: 6,
        created_at: now,
        updated_at: now,
      },
    ];

    for (const item of defaults) {
      await this.saveModel(item);
    }
  }

  public async listAllModels(): Promise<ModelCatalogueEntry[]> {
    if (this.pool) {
      try {
        await this.initTable();
        const res = await this.pool.query('SELECT * FROM ai_model_catalogue ORDER BY sort_order ASC, created_at ASC');
        return res.rows.map(r => this.mapRow(r));
      } catch {
        return this.readJsonModels();
      }
    }
    return this.readJsonModels();
  }

  public async listEnabledModels(modality?: string): Promise<ModelCatalogueEntry[]> {
    const all = await this.listAllModels();
    return all.filter(m => m.is_enabled && (!modality || m.modality === modality));
  }

  public async saveModel(model: ModelCatalogueEntry): Promise<ModelCatalogueEntry> {
    if (this.pool) {
      try {
        await this.initTable();
        await this.pool.query(
          `INSERT INTO ai_model_catalogue (
            id, display_name, provider_slug, provider_model_id, modality, quality_tier, credits_per_unit, unit, provider_cost_usd, description, is_enabled, is_featured, sort_order, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            provider_slug = EXCLUDED.provider_slug,
            provider_model_id = EXCLUDED.provider_model_id,
            modality = EXCLUDED.modality,
            quality_tier = EXCLUDED.quality_tier,
            credits_per_unit = EXCLUDED.credits_per_unit,
            unit = EXCLUDED.unit,
            provider_cost_usd = EXCLUDED.provider_cost_usd,
            description = EXCLUDED.description,
            is_enabled = EXCLUDED.is_enabled,
            is_featured = EXCLUDED.is_featured,
            sort_order = EXCLUDED.sort_order,
            updated_at = NOW();`,
          [
            model.id,
            model.display_name,
            model.provider_slug,
            model.provider_model_id,
            model.modality,
            model.quality_tier,
            model.credits_per_unit,
            model.unit,
            model.provider_cost_usd,
            model.description,
            model.is_enabled,
            model.is_featured,
            model.sort_order,
            model.created_at || new Date().toISOString(),
            new Date().toISOString(),
          ]
        );
      } catch (e: any) {
        console.warn('[ModelCatalogueStore] Postgres save error, falling back to JSON:', e.message);
        this.saveJsonModel(model);
      }
    } else {
      this.saveJsonModel(model);
    }
    return model;
  }

  public async deleteModel(id: string): Promise<boolean> {
    if (this.pool) {
      try {
        await this.initTable();
        await this.pool.query('DELETE FROM ai_model_catalogue WHERE id = $1', [id]);
      } catch (_) {}
    }
    const models = this.readJsonModels().filter(m => m.id !== id);
    this.writeJsonModels(models);
    return true;
  }

  private mapRow(r: any): ModelCatalogueEntry {
    return {
      id: r.id,
      display_name: r.display_name,
      provider_slug: r.provider_slug,
      provider_model_id: r.provider_model_id,
      modality: r.modality,
      quality_tier: r.quality_tier,
      credits_per_unit: Number(r.credits_per_unit),
      unit: r.unit,
      provider_cost_usd: Number(r.provider_cost_usd),
      description: r.description,
      is_enabled: Boolean(r.is_enabled),
      is_featured: Boolean(r.is_featured),
      sort_order: Number(r.sort_order),
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  private readJsonModels(): ModelCatalogueEntry[] {
    try {
      if (!fs.existsSync(this.jsonPath)) return [];
      const content = fs.readFileSync(this.jsonPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private saveJsonModel(model: ModelCatalogueEntry) {
    const models = this.readJsonModels();
    const idx = models.findIndex(m => m.id === model.id);
    if (idx >= 0) {
      models[idx] = { ...models[idx], ...model, updated_at: new Date().toISOString() };
    } else {
      models.push(model);
    }
    this.writeJsonModels(models);
  }

  private writeJsonModels(models: ModelCatalogueEntry[]) {
    try {
      const dir = path.dirname(this.jsonPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.jsonPath, JSON.stringify(models, null, 2));
    } catch (_) {}
  }
}

export const globalModelCatalogueStore = new PostgresModelCatalogueStore(process.env.DATABASE_URL);
