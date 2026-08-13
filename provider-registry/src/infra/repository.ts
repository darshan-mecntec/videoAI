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

export interface ProviderRepository {
  // Provider operations
  findProviders(options?: { cursor?: string; limit?: number; status?: ProviderStatus }): Promise<{ providers: Provider[]; next_cursor: string | null }>;
  findProviderById(id: string): Promise<Provider | null>;
  findProviderBySlug(slug: string): Promise<Provider | null>;
  createProvider(provider: Omit<Provider, 'created_at' | 'updated_at'>): Promise<Provider>;
  updateProvider(id: string, updates: Partial<Omit<Provider, 'id' | 'created_at'>>): Promise<Provider | null>;
  softDeleteProvider(id: string): Promise<Provider | null>;

  // Capability operations
  findCapabilitiesByProviderId(providerId: string): Promise<Capability[]>;
  findCapabilitiesByTypeAndRegion(type: CapabilityType, region?: string): Promise<Array<Capability & { provider: Provider }>>;
  createCapability(capability: Capability): Promise<Capability>;
  updateCapability(id: string, updates: Partial<Omit<Capability, 'id' | 'provider_id'>>): Promise<Capability | null>;

  // Pricing operations
  findPricingByProviderId(providerId: string): Promise<PricingEntry[]>;
  createPricingEntry(entry: PricingEntry): Promise<PricingEntry>;

  // Health operations
  findHealthRecordByProviderId(providerId: string): Promise<HealthRecord | null>;
  findLatestHealthSummary(): Promise<HealthRecord[]>;
  createHealthRecord(record: HealthRecord): Promise<HealthRecord>;

  // Rate limits operations
  findRateLimitsByProviderId(providerId: string): Promise<RateLimit[]>;
  upsertRateLimits(providerId: string, limits: Array<RateLimit>): Promise<RateLimit[]>;

  // Credential references operations
  createCredentialRef(ref: CredentialRef): Promise<CredentialRef>;
  findCredentialRefByProviderId(providerId: string): Promise<CredentialRef | null>;
  updateCredentialRef(providerId: string, updates: Partial<CredentialRef>): Promise<CredentialRef>;
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
}

export class InMemoryCacheService implements CacheService {
  private store: Map<string, { value: unknown; expiresAt?: number }> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }
}

export class InMemoryProviderRepository implements ProviderRepository {
  private providers: Map<string, Provider> = new Map();
  private capabilities: Map<string, Capability> = new Map();
  private pricingEntries: Map<string, PricingEntry> = new Map();
  private healthRecords: Map<string, HealthRecord> = new Map();
  private rateLimits: Map<string, RateLimit> = new Map();
  private credentialRefs: Map<string, CredentialRef> = new Map();

  async findProviders(options?: { cursor?: string; limit?: number; status?: ProviderStatus }): Promise<{ providers: Provider[]; next_cursor: string | null }> {
    let list = Array.from(this.providers.values());
    if (options?.status) {
      list = list.filter((p) => p.status === options.status);
    }
    const limit = options?.limit || 20;
    let startIndex = 0;
    if (options?.cursor) {
      const foundIdx = list.findIndex((p) => p.id === options.cursor);
      if (foundIdx >= 0) {
        startIndex = foundIdx + 1;
      }
    }
    const sliced = list.slice(startIndex, startIndex + limit);
    const next_cursor = startIndex + limit < list.length && sliced.length > 0 ? sliced[sliced.length - 1].id : null;
    return { providers: sliced, next_cursor };
  }

  async findProviderById(id: string): Promise<Provider | null> {
    return this.providers.get(id) || null;
  }

  async findProviderBySlug(slug: string): Promise<Provider | null> {
    for (const p of this.providers.values()) {
      if (p.slug === slug) return p;
    }
    return null;
  }

  async createProvider(providerData: Omit<Provider, 'created_at' | 'updated_at'>): Promise<Provider> {
    const now = new Date().toISOString();
    const provider: Provider = {
      ...providerData,
      created_at: now,
      updated_at: now,
    };
    this.providers.set(provider.id, provider);
    return provider;
  }

  async updateProvider(id: string, updates: Partial<Omit<Provider, 'id' | 'created_at'>>): Promise<Provider | null> {
    const existing = this.providers.get(id);
    if (!existing) return null;
    const updated: Provider = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.providers.set(id, updated);
    return updated;
  }

  async softDeleteProvider(id: string): Promise<Provider | null> {
    return this.updateProvider(id, { status: 'deprecated' });
  }

  async findCapabilitiesByProviderId(providerId: string): Promise<Capability[]> {
    return Array.from(this.capabilities.values()).filter((c) => c.provider_id === providerId);
  }

  async findCapabilitiesByTypeAndRegion(type: CapabilityType, region?: string): Promise<Array<Capability & { provider: Provider }>> {
    const results: Array<Capability & { provider: Provider }> = [];
    for (const cap of this.capabilities.values()) {
      if (cap.capability_type === type) {
        const provider = this.providers.get(cap.provider_id);
        if (provider && provider.status === 'active') {
          if (!region || provider.region_codes.includes(region) || provider.region_codes.includes('global')) {
            results.push({ ...cap, provider });
          }
        }
      }
    }
    // Sort by quality_score descending per implementation plan
    results.sort((a, b) => b.quality_score - a.quality_score);
    return results;
  }

  async createCapability(capability: Capability): Promise<Capability> {
    const id = capability.id || `cap-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const cap: Capability = { ...capability, id };
    this.capabilities.set(id, cap);
    return cap;
  }

  async updateCapability(id: string, updates: Partial<Omit<Capability, 'id' | 'provider_id'>>): Promise<Capability | null> {
    const existing = this.capabilities.get(id);
    if (!existing) return null;
    const updated: Capability = { ...existing, ...updates };
    this.capabilities.set(id, updated);
    return updated;
  }

  async findPricingByProviderId(providerId: string): Promise<PricingEntry[]> {
    const caps = await this.findCapabilitiesByProviderId(providerId);
    const capIds = new Set(caps.map((c) => c.id));
    return Array.from(this.pricingEntries.values()).filter((pe) => capIds.has(pe.capability_id));
  }

  async createPricingEntry(entryData: PricingEntry): Promise<PricingEntry> {
    const id = entryData.id || `pe-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const entry: PricingEntry = { ...entryData, id };
    this.pricingEntries.set(id, entry);
    return entry;
  }

  async findHealthRecordByProviderId(providerId: string): Promise<HealthRecord | null> {
    return this.healthRecords.get(providerId) || null;
  }

  async findLatestHealthSummary(): Promise<HealthRecord[]> {
    return Array.from(this.healthRecords.values());
  }

  async createHealthRecord(recordData: HealthRecord): Promise<HealthRecord> {
    const id = recordData.id || `hr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const record: HealthRecord = { ...recordData, id };
    this.healthRecords.set(recordData.provider_id, record);
    return record;
  }

  async findRateLimitsByProviderId(providerId: string): Promise<RateLimit[]> {
    return Array.from(this.rateLimits.values()).filter((rl) => rl.provider_id === providerId);
  }

  async upsertRateLimits(providerId: string, limits: Array<RateLimit>): Promise<RateLimit[]> {
    // Delete existing rate limits for this provider
    for (const [id, rl] of Array.from(this.rateLimits.entries())) {
      if (rl.provider_id === providerId) {
        this.rateLimits.delete(id);
      }
    }
    const created: RateLimit[] = [];
    for (const limit of limits) {
      const id = limit.id || `rl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const rl: RateLimit = { ...limit, id, provider_id: limit.provider_id || providerId };
      this.rateLimits.set(id, rl);
      created.push(rl);
    }
    return created;
  }

  async createCredentialRef(refData: CredentialRef): Promise<CredentialRef> {
    const id = refData.id || `cred-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const ref: CredentialRef = { ...refData, id };
    this.credentialRefs.set(refData.provider_id, ref);
    return ref;
  }

  async findCredentialRefByProviderId(providerId: string): Promise<CredentialRef | null> {
    return this.credentialRefs.get(providerId) || null;
  }

  async updateCredentialRef(providerId: string, updates: Partial<CredentialRef>): Promise<CredentialRef> {
    const existing = this.credentialRefs.get(providerId);
    if (!existing) {
      throw new Error(`Credential ref for provider ${providerId} not found`);
    }
    const updated: CredentialRef = { ...existing, ...updates };
    this.credentialRefs.set(providerId, updated);
    return updated;
  }
}

export { PostgresProviderRepository } from './postgresqlRepository';
export { RedisCacheService } from './redisCache';
