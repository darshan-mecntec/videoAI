import { PostgresProviderRepository } from '../../src/infra/postgresqlRepository';
import { Pool } from 'pg';
import { ProviderStatus, CapabilityType } from '../../src/domain/types';
import { v4 as uuidv4 } from 'uuid';

const describeIfPostgres = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfPostgres('PostgresProviderRepository', () => {
  let pool: Pool;
  let repo: PostgresProviderRepository;

  beforeAll(async () => {
    // Setup test database connection
    pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL
    });
    repo = new PostgresProviderRepository(pool);

    // Create test schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS providers (
        id VARCHAR(255) PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        region_codes JSONB NOT NULL DEFAULT '["global"]'::jsonb,
        org_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS capabilities (
        id VARCHAR(255) PRIMARY KEY,
        provider_id VARCHAR(255) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        capability_type VARCHAR(100) NOT NULL,
        model_id VARCHAR(255) NOT NULL,
        max_resolution VARCHAR(50),
        supported_params JSONB NOT NULL DEFAULT '{}'::jsonb,
        quality_score DECIMAL(3,2) NOT NULL,
        pricing_model VARCHAR(50) NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pricing_entries (
        id VARCHAR(255) PRIMARY KEY,
        capability_id VARCHAR(255) NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
        unit VARCHAR(50) NOT NULL,
        cost_usd DECIMAL(10,6) NOT NULL,
        effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
        effective_until TIMESTAMP WITH TIME ZONE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS health_records (
        id VARCHAR(255) PRIMARY KEY,
        provider_id VARCHAR(255) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        checked_at TIMESTAMP WITH TIME ZONE NOT NULL,
        latency_ms INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL,
        error_message TEXT,
        availability_7d DECIMAL(3,2) NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id VARCHAR(255) PRIMARY KEY,
        provider_id VARCHAR(255) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        capability_id VARCHAR(255) REFERENCES capabilities(id) ON DELETE CASCADE,
        requests_per_min INTEGER NOT NULL,
        tokens_per_min INTEGER,
        concurrency_cap INTEGER
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS credential_refs (
        id VARCHAR(255) PRIMARY KEY,
        provider_id VARCHAR(255) NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        secret_key VARCHAR(500) NOT NULL,
        environment VARCHAR(50) NOT NULL
      );
    `);
  });

  afterAll(async () => {
    // Clean up test schema
    await pool.query('DROP TABLE IF EXISTS credential_refs CASCADE');
    await pool.query('DROP TABLE IF EXISTS rate_limits CASCADE');
    await pool.query('DROP TABLE IF EXISTS health_records CASCADE');
    await pool.query('DROP TABLE IF EXISTS pricing_entries CASCADE');
    await pool.query('DROP TABLE IF EXISTS capabilities CASCADE');
    await pool.query('DROP TABLE IF EXISTS providers CASCADE');
    await pool.end();
  });

  beforeEach(async () => {
    // Clean all tables before each test
    await pool.query('DELETE FROM credential_refs');
    await pool.query('DELETE FROM rate_limits');
    await pool.query('DELETE FROM health_records');
    await pool.query('DELETE FROM pricing_entries');
    await pool.query('DELETE FROM capabilities');
    await pool.query('DELETE FROM providers');
  });

  describe('Provider operations', () => {
    it('should create and find a provider', async () => {
      const provider = await repo.createProvider({
        id: 'test-provider-1',
        slug: 'test-slug',
        display_name: 'Test Provider',
        status: 'active',
        region_codes: ['us-east-1'],
        org_id: null
      });

      expect(provider.slug).toBe('test-slug');

      const found = await repo.findProviderById('test-provider-1');
      expect(found).not.toBeNull();
      expect(found?.slug).toBe('test-slug');
    });

    it('should find provider by slug', async () => {
      await repo.createProvider({
        id: 'test-provider-2',
        slug: 'unique-slug',
        display_name: 'Unique Provider',
        status: 'active',
        region_codes: ['global'],
        org_id: null
      });

      const found = await repo.findProviderBySlug('unique-slug');
      expect(found).not.toBeNull();
      expect(found?.id).toBe('test-provider-2');
    });

    it('should update provider', async () => {
      await repo.createProvider({
        id: 'test-provider-3',
        slug: 'update-test',
        display_name: 'Original Name',
        status: 'active',
        region_codes: ['global'],
        org_id: null
      });

      const updated = await repo.updateProvider('test-provider-3', {
        display_name: 'Updated Name',
        status: 'disabled'
      });

      expect(updated).not.toBeNull();
      expect(updated?.display_name).toBe('Updated Name');
      expect(updated?.status).toBe('disabled');
    });

    it('should soft delete provider', async () => {
      await repo.createProvider({
        id: 'test-provider-4',
        slug: 'soft-delete-test',
        display_name: 'To Delete',
        status: 'active',
        region_codes: ['global'],
        org_id: null
      });

      const deleted = await repo.softDeleteProvider('test-provider-4');
      expect(deleted).not.toBeNull();
      expect(deleted?.status).toBe('deprecated');
    });

    it('should list providers with pagination', async () => {
      await repo.createProvider({
        id: 'p1',
        slug: 'p1',
        display_name: 'Provider 1',
        status: 'active',
        region_codes: ['global'],
        org_id: null
      });
      await repo.createProvider({
        id: 'p2',
        slug: 'p2',
        display_name: 'Provider 2',
        status: 'active',
        region_codes: ['global'],
        org_id: null
      });

      const result = await repo.findProviders({ limit: 1 });
      expect(result.providers.length).toBe(1);
      expect(result.next_cursor).not.toBeNull();

      const page2 = await repo.findProviders({ cursor: result.next_cursor!, limit: 1 });
      expect(page2.providers.length).toBe(1);
      expect(page2.next_cursor).toBeNull();
    });
  });

  describe('Capability operations', () => {
    it('should create and find capabilities', async () => {
      const providerId = uuidv4();
      await repo.createProvider({
        id: providerId,
        slug: 'cap-provider',
        display_name: 'Capability Provider',
        status: 'active',
        region_codes: ['global'],
        org_id: null
      });

      const capability = await repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'text-to-image',
        model_id: 'model-1',
        max_resolution: '1024x1024',
        supported_params: {},
        quality_score: 0.9,
        pricing_model: 'per-image'
      });

      expect(capability.capability_type).toBe('text-to-image');

      const capabilities = await repo.findCapabilitiesByProviderId(providerId);
      expect(capabilities.length).toBe(1);
    });

    it('should find capabilities by type and region', async () => {
      const providerId = uuidv4();
      await repo.createProvider({
        id: providerId,
        slug: 'region-provider',
        display_name: 'Region Provider',
        status: 'active',
        region_codes: ['us-east-1', 'eu-west-1'],
        org_id: null
      });

      await repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'text-to-image',
        model_id: 'model-1',
        max_resolution: null,
        supported_params: {},
        quality_score: 0.95,
        pricing_model: 'per-image'
      });

      const results = await repo.findCapabilitiesByTypeAndRegion('text-to-image', 'us-east-1');
      expect(results.length).toBe(1);
      expect(results[0].provider.slug).toBe('region-provider');
    });

    it('should update capability', async () => {
      const providerId = uuidv4();
      const capId = uuidv4();
      await repo.createProvider({
        id: providerId,
        slug: 'update-cap-provider',
        display_name: 'Update Cap Provider',
        status: 'active',
        region_codes: ['global'],
        org_id: null
      });

      await repo.createCapability({
        id: capId,
        provider_id: providerId,
        capability_type: 'text-to-image',
        model_id: 'model-1',
        max_resolution: null,
        supported_params: {},
        quality_score: 0.8,
        pricing_model: 'per-image'
      });

      const updated = await repo.updateCapability(capId, { quality_score: 0.99 });
      expect(updated).not.toBeNull();
      expect(updated?.quality_score).toBe(0.99);
    });
  });

  describe('Health operations', () => {
    it('should create and find health records', async () => {
      const providerId = uuidv4();
      await repo.createProvider({
        id: providerId,
        slug: 'health-provider',
        display_name: 'Health Provider',
        status: 'active',
        region_codes: ['global'],
        org_id: null
      });

      const record = await repo.createHealthRecord({
        id: uuidv4(),
        provider_id: providerId,
        checked_at: new Date().toISOString(),
        latency_ms: 150,
        status: 'healthy',
        error_message: null,
        availability_7d: 0.99
      });

      expect(record.status).toBe('healthy');

      const found = await repo.findHealthRecordByProviderId(providerId);
      expect(found).not.toBeNull();
      expect(found?.status).toBe('healthy');
    });

    it('should get health summary', async () => {
      const providerId = uuidv4();
      await repo.createProvider({
        id: providerId,
        slug: 'health-summary-1',
        display_name: 'Health Summary 1',
        status: 'active',
        region_codes: ['global'],
        org_id: null
      });

      await repo.createHealthRecord({
        id: uuidv4(),
        provider_id: providerId,
        checked_at: new Date().toISOString(),
        latency_ms: 100,
        status: 'healthy',
        error_message: null,
        availability_7d: 1.0
      });

      const summary = await repo.findLatestHealthSummary();
      expect(summary.length).toBeGreaterThan(0);
    });
  });

  describe('Rate limit operations', () => {
    it('should upsert rate limits', async () => {
      const providerId = uuidv4();
      await repo.createProvider({
        id: providerId,
        slug: 'rate-provider',
        display_name: 'Rate Provider',
        status: 'active',
        region_codes: ['global'],
        org_id: null
      });

      const limits = await repo.upsertRateLimits(providerId, [
        {
          id: uuidv4(),
          provider_id: providerId,
          capability_id: null,
          requests_per_min: 100,
          tokens_per_min: 10000,
          concurrency_cap: 10
        }
      ]);

      expect(limits.length).toBe(1);
      expect(limits[0].requests_per_min).toBe(100);

      const found = await repo.findRateLimitsByProviderId(providerId);
      expect(found.length).toBe(1);
    });
  });

  describe('Credential operations', () => {
    it('should create and find credential refs', async () => {
      const providerId = uuidv4();
      await repo.createProvider({
        id: providerId,
        slug: 'cred-provider',
        display_name: 'Cred Provider',
        status: 'active',
        region_codes: ['global'],
        org_id: null
      });

      const cred = await repo.createCredentialRef({
        id: uuidv4(),
        provider_id: providerId,
        secret_key: 'vault/secret/path',
        environment: 'production'
      });

      expect(cred.secret_key).toBe('vault/secret/path');

      const found = await repo.findCredentialRefByProviderId(providerId);
      expect(found).not.toBeNull();
      expect(found?.secret_key).toBe('vault/secret/path');
    });
  });
});
