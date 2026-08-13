import { Pool, PoolClient } from 'pg';
import {
  Provider,
  Capability,
  PricingEntry,
  HealthRecord,
  RateLimit,
  CredentialRef,
  CapabilityType,
  ProviderStatus
} from '../domain/types';
import { ProviderRepository } from './repository';

export class PostgresProviderRepository implements ProviderRepository {
  constructor(private pool: Pool) {}

  private async withClient<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      return await callback(client);
    } finally {
      client.release();
    }
  }

  async findProviders(options?: { cursor?: string; limit?: number; status?: ProviderStatus }): Promise<{ providers: Provider[]; next_cursor: string | null }> {
    const limit = options?.limit || 20;
    let query = 'SELECT * FROM providers';
    const params: any[] = [];
    let paramIndex = 1;

    if (options?.status) {
      query += ` WHERE status = $${paramIndex}`;
      params.push(options.status);
      paramIndex++;
    }

    if (options?.cursor) {
      const whereClause = params.length > 0 ? ' AND' : ' WHERE';
      query += `${whereClause} id > $${paramIndex}`;
      params.push(options.cursor);
      paramIndex++;
    }

    query += ` ORDER BY id ASC LIMIT $${paramIndex}`;
    params.push(limit + 1); // Fetch one extra to determine if there's a next page
    paramIndex++;

    const result = await this.pool.query(query, params);
    const providers = result.rows.slice(0, limit);
    const next_cursor = result.rows.length > limit ? result.rows[limit - 1].id : null;

    return { providers, next_cursor };
  }

  async findProviderById(id: string): Promise<Provider | null> {
    const result = await this.pool.query('SELECT * FROM providers WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findProviderBySlug(slug: string): Promise<Provider | null> {
    const result = await this.pool.query('SELECT * FROM providers WHERE slug = $1', [slug]);
    return result.rows[0] || null;
  }

  async createProvider(providerData: Omit<Provider, 'created_at' | 'updated_at'>): Promise<Provider> {
    const now = new Date().toISOString();
    const query = `
      INSERT INTO providers (id, slug, display_name, status, region_codes, org_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      providerData.id,
      providerData.slug,
      providerData.display_name,
      providerData.status,
      JSON.stringify(providerData.region_codes),
      providerData.org_id,
      now,
      now
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateProvider(id: string, updates: Partial<Omit<Provider, 'id' | 'created_at'>>): Promise<Provider | null> {
    const now = new Date().toISOString();
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.slug !== undefined) {
      setClauses.push(`slug = $${paramIndex}`);
      values.push(updates.slug);
      paramIndex++;
    }
    if (updates.display_name !== undefined) {
      setClauses.push(`display_name = $${paramIndex}`);
      values.push(updates.display_name);
      paramIndex++;
    }
    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex}`);
      values.push(updates.status);
      paramIndex++;
    }
    if (updates.region_codes !== undefined) {
      setClauses.push(`region_codes = $${paramIndex}`);
      values.push(JSON.stringify(updates.region_codes));
      paramIndex++;
    }
    if (updates.org_id !== undefined) {
      setClauses.push(`org_id = $${paramIndex}`);
      values.push(updates.org_id);
      paramIndex++;
    }

    setClauses.push(`updated_at = $${paramIndex}`);
    values.push(now);
    paramIndex++;

    values.push(id);

    const query = `
      UPDATE providers
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  async softDeleteProvider(id: string): Promise<Provider | null> {
    return this.updateProvider(id, { status: 'deprecated' });
  }

  async findCapabilitiesByProviderId(providerId: string): Promise<Capability[]> {
    const result = await this.pool.query(
      'SELECT * FROM capabilities WHERE provider_id = $1',
      [providerId]
    );
    return result.rows;
  }

  async findCapabilitiesByTypeAndRegion(type: CapabilityType, region?: string): Promise<Array<Capability & { provider: Provider }>> {
    let query = `
      SELECT c.*, p.* as provider_fields
      FROM capabilities c
      JOIN providers p ON c.provider_id = p.id
      WHERE c.capability_type = $1
      AND p.status = 'active'
    `;
    const params: any[] = [type];
    let paramIndex = 2;

    if (region) {
      query += ` AND (p.region_codes @> $${paramIndex}::jsonb OR p.region_codes @> '["global"]'::jsonb)`;
      params.push(JSON.stringify([region]));
      paramIndex++;
    }

    query += ` ORDER BY c.quality_score DESC`;

    const result = await this.pool.query(query, params);
    return result.rows.map(row => ({
      id: row.id,
      provider_id: row.provider_id,
      capability_type: row.capability_type,
      model_id: row.model_id,
      max_resolution: row.max_resolution,
      supported_params: row.supported_params,
      quality_score: row.quality_score,
      pricing_model: row.pricing_model,
      provider: {
        id: row.provider_fields.id,
        slug: row.provider_fields.slug,
        display_name: row.provider_fields.display_name,
        status: row.provider_fields.status,
        region_codes: row.provider_fields.region_codes,
        org_id: row.provider_fields.org_id,
        created_at: row.provider_fields.created_at,
        updated_at: row.provider_fields.updated_at
      }
    }));
  }

  async createCapability(capability: Capability): Promise<Capability> {
    const query = `
      INSERT INTO capabilities (id, provider_id, capability_type, model_id, max_resolution, supported_params, quality_score, pricing_model)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      capability.id,
      capability.provider_id,
      capability.capability_type,
      capability.model_id,
      capability.max_resolution,
      JSON.stringify(capability.supported_params),
      capability.quality_score,
      capability.pricing_model
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateCapability(id: string, updates: Partial<Omit<Capability, 'id' | 'provider_id'>>): Promise<Capability | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.capability_type !== undefined) {
      setClauses.push(`capability_type = $${paramIndex}`);
      values.push(updates.capability_type);
      paramIndex++;
    }
    if (updates.model_id !== undefined) {
      setClauses.push(`model_id = $${paramIndex}`);
      values.push(updates.model_id);
      paramIndex++;
    }
    if (updates.max_resolution !== undefined) {
      setClauses.push(`max_resolution = $${paramIndex}`);
      values.push(updates.max_resolution);
      paramIndex++;
    }
    if (updates.supported_params !== undefined) {
      setClauses.push(`supported_params = $${paramIndex}`);
      values.push(JSON.stringify(updates.supported_params));
      paramIndex++;
    }
    if (updates.quality_score !== undefined) {
      setClauses.push(`quality_score = $${paramIndex}`);
      values.push(updates.quality_score);
      paramIndex++;
    }
    if (updates.pricing_model !== undefined) {
      setClauses.push(`pricing_model = $${paramIndex}`);
      values.push(updates.pricing_model);
      paramIndex++;
    }

    values.push(id);

    const query = `
      UPDATE capabilities
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  async findPricingByProviderId(providerId: string): Promise<PricingEntry[]> {
    const query = `
      SELECT pe.* FROM pricing_entries pe
      JOIN capabilities c ON pe.capability_id = c.id
      WHERE c.provider_id = $1
    `;
    const result = await this.pool.query(query, [providerId]);
    return result.rows;
  }

  async createPricingEntry(entry: PricingEntry): Promise<PricingEntry> {
    const query = `
      INSERT INTO pricing_entries (id, capability_id, unit, cost_usd, effective_from, effective_until)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      entry.id,
      entry.capability_id,
      entry.unit,
      entry.cost_usd,
      entry.effective_from,
      entry.effective_until
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findHealthRecordByProviderId(providerId: string): Promise<HealthRecord | null> {
    const result = await this.pool.query(
      'SELECT * FROM health_records WHERE provider_id = $1 ORDER BY checked_at DESC LIMIT 1',
      [providerId]
    );
    return result.rows[0] || null;
  }

  async findLatestHealthSummary(): Promise<HealthRecord[]> {
    const query = `
      SELECT DISTINCT ON (provider_id) *
      FROM health_records
      ORDER BY provider_id, checked_at DESC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async createHealthRecord(record: HealthRecord): Promise<HealthRecord> {
    const query = `
      INSERT INTO health_records (id, provider_id, checked_at, latency_ms, status, error_message, availability_7d)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      record.id,
      record.provider_id,
      record.checked_at,
      record.latency_ms,
      record.status,
      record.error_message,
      record.availability_7d
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findRateLimitsByProviderId(providerId: string): Promise<RateLimit[]> {
    const result = await this.pool.query(
      'SELECT * FROM rate_limits WHERE provider_id = $1',
      [providerId]
    );
    return result.rows;
  }

  async upsertRateLimits(providerId: string, limits: Array<RateLimit>): Promise<RateLimit[]> {
    return this.withClient(async (client) => {
      await client.query('BEGIN');

      try {
        // Delete existing rate limits for this provider
        await client.query('DELETE FROM rate_limits WHERE provider_id = $1', [providerId]);

        const created: RateLimit[] = [];
        for (const limit of limits) {
          const query = `
            INSERT INTO rate_limits (id, provider_id, capability_id, requests_per_min, tokens_per_min, concurrency_cap)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `;
          const values = [
            limit.id,
            limit.provider_id || providerId,
            limit.capability_id,
            limit.requests_per_min,
            limit.tokens_per_min,
            limit.concurrency_cap
          ];
          const result = await client.query(query, values);
          created.push(result.rows[0]);
        }

        await client.query('COMMIT');
        return created;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  }

  async createCredentialRef(ref: CredentialRef): Promise<CredentialRef> {
    const query = `
      INSERT INTO credential_refs (id, provider_id, secret_key, api_key, environment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      ref.id,
      ref.provider_id,
      ref.secret_key,
      ref.api_key || null,
      ref.environment
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findCredentialRefByProviderId(providerId: string): Promise<CredentialRef | null> {
    const result = await this.pool.query(
      'SELECT * FROM credential_refs WHERE provider_id = $1',
      [providerId]
    );
    return result.rows[0] || null;
  }

  async updateCredentialRef(providerId: string, updates: Partial<CredentialRef>): Promise<CredentialRef> {
    const query = `
      UPDATE credential_refs 
      SET secret_key = COALESCE($2, secret_key),
          api_key = COALESCE($3, api_key),
          environment = COALESCE($4, environment)
      WHERE provider_id = $1
      RETURNING *
    `;
    const values = [
      providerId,
      updates.secret_key,
      updates.api_key,
      updates.environment
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }
}
