import { ProviderService } from '../../src/domain/providerService';
import { CapabilityService } from '../../src/domain/capabilityService';
import { InMemoryProviderRepository, InMemoryCacheService } from '../../src/infra/repository';
import { InMemoryEventBus } from '../../src/events/publisher';
import { AppError } from '../../src/domain/types';

describe('ProviderService', () => {
  let repo: InMemoryProviderRepository;
  let cache: InMemoryCacheService;
  let eventPublisher: InMemoryEventBus;
  let providerService: ProviderService;
  let capabilityService: CapabilityService;

  beforeEach(() => {
    repo = new InMemoryProviderRepository();
    cache = new InMemoryCacheService();
    eventPublisher = new InMemoryEventBus();
    providerService = new ProviderService(repo, cache, eventPublisher);
    capabilityService = new CapabilityService(repo, cache, eventPublisher);
  });

  describe('registerProvider', () => {
    it('should register a new provider and publish config updated event', async () => {
      const result = await providerService.registerProvider({
        slug: 'openai-v1',
        display_name: 'OpenAI Provider',
        secret_key: 'vault/openai/prod',
        region_codes: ['us-east-1', 'eu-west-1'],
      });

      expect(result.provider).toBeDefined();
      expect(result.provider.slug).toBe('openai-v1');
      expect(result.provider.status).toBe('active');
      expect(result.credentialRef.secret_key).toBe('vault/openai/prod');

      expect(eventPublisher.publishedEvents.length).toBe(1);
      expect(eventPublisher.publishedEvents[0].event_name).toBe('provider.config.updated');
    });

    it('should throw AppError 400 when missing required fields', async () => {
      await expect(
        providerService.registerProvider({
          slug: '',
          display_name: 'Test',
          secret_key: 'key',
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw AppError 409 when slug is already registered', async () => {
      await providerService.registerProvider({
        slug: 'openai-v1',
        display_name: 'OpenAI Provider',
        secret_key: 'vault/openai/prod',
      });

      await expect(
        providerService.registerProvider({
          slug: 'openai-v1',
          display_name: 'OpenAI Duplicate',
          secret_key: 'vault/openai/prod',
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('getProvider', () => {
    it('should return provider and capabilities when exists', async () => {
      const { provider } = await providerService.registerProvider({
        slug: 'stability-v1',
        display_name: 'Stability AI',
        secret_key: 'vault/stability/prod',
      });

      const fetched = await providerService.getProvider(provider.id);
      expect(fetched.provider.id).toBe(provider.id);
      expect(fetched.capabilities.length).toBeGreaterThan(0);
    });

    it('should throw AppError 404 for non-existent provider', async () => {
      await expect(providerService.getProvider('non-existent-id')).rejects.toThrow(AppError);
    });
  });

  describe('listProviders', () => {
    it('should list providers with pagination and status filter', async () => {
      await providerService.registerProvider({ slug: 'p1', display_name: 'P1', secret_key: 'k1' });
      await providerService.registerProvider({ slug: 'p2', display_name: 'P2', secret_key: 'k2' });

      const list = await providerService.listProviders({ limit: 1, status: 'active' });
      expect(list.providers.length).toBe(1);
      expect(list.next_cursor).not.toBeNull();

      const page2 = await providerService.listProviders({ cursor: list.next_cursor!, limit: 1 });
      expect(page2.providers.length).toBe(1);
    });
  });

  describe('updateProvider & softDeleteProvider', () => {
    it('should update provider and invalidate cache', async () => {
      const { provider } = await providerService.registerProvider({ slug: 'p1', display_name: 'P1', secret_key: 'k1' });
      const updated = await providerService.updateProvider(provider.id, { display_name: 'Updated P1' });

      expect(updated.display_name).toBe('Updated P1');
    });

    it('should soft delete provider (set status=deprecated)', async () => {
      const { provider } = await providerService.registerProvider({ slug: 'p1', display_name: 'P1', secret_key: 'k1' });
      const deleted = await providerService.softDeleteProvider(provider.id);

      expect(deleted.status).toBe('deprecated');
    });

    it('should throw AppError 404 when updating non-existent provider', async () => {
      await expect(providerService.updateProvider('invalid', { display_name: 'X' })).rejects.toThrow(AppError);
      await expect(providerService.softDeleteProvider('invalid')).rejects.toThrow(AppError);
    });
  });

  describe('pricing and rate limits', () => {
    it('should manage pricing and rate limits', async () => {
      const { provider } = await providerService.registerProvider({ slug: 'p1', display_name: 'P1', secret_key: 'k1' });
      const cap = await capabilityService.addCapability(provider.id, {
        capability_type: 'text-to-image',
        model_id: 'm1',
        max_resolution: null,
        supported_params: {},
        quality_score: 0.9,
        pricing_model: 'per-image',
      });

      const pricing = await providerService.addPricingEntry(provider.id, {
        capability_id: cap.id,
        unit: 'image',
        cost_usd: 0.02,
        effective_from: new Date().toISOString(),
        effective_until: null,
      });
      expect(pricing.cost_usd).toBe(0.02);

      const fetchedPricing = await providerService.getPricing(provider.id);
      expect(fetchedPricing.length).toBe(1);

      const rateLimits = await providerService.updateRateLimits(provider.id, [
        { capability_id: cap.id, requests_per_min: 100, tokens_per_min: null, concurrency_cap: 10 },
      ]);
      expect(rateLimits.length).toBe(1);

      const fetchedLimits = await providerService.getRateLimits(provider.id);
      expect(fetchedLimits.length).toBe(1);
    });

    it('should throw AppError 404 for pricing/rate-limits on non-existent provider', async () => {
      await expect(providerService.getPricing('invalid')).rejects.toThrow(AppError);
      await expect(providerService.addPricingEntry('invalid', {} as any)).rejects.toThrow(AppError);
      await expect(providerService.getRateLimits('invalid')).rejects.toThrow(AppError);
      await expect(providerService.updateRateLimits('invalid', [])).rejects.toThrow(AppError);
    });
  });
});
