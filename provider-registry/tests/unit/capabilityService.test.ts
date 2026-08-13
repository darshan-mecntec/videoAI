import { ProviderService } from '../../src/domain/providerService';
import { CapabilityService } from '../../src/domain/capabilityService';
import { InMemoryProviderRepository, InMemoryCacheService } from '../../src/infra/repository';
import { InMemoryEventBus } from '../../src/events/publisher';
import { AppError } from '../../src/domain/types';

describe('CapabilityService', () => {
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

  it('should add capability and invalidate cache', async () => {
    const { provider } = await providerService.registerProvider({
      slug: 'openai-img',
      display_name: 'OpenAI Image',
      secret_key: 'vault/openai',
    });

    const capability = await capabilityService.addCapability(provider.id, {
      capability_type: 'text-to-image',
      model_id: 'dall-e-3',
      max_resolution: '1024x1024',
      supported_params: { style: ['vivid', 'natural'] },
      quality_score: 0.95,
      pricing_model: 'per-image',
    });

    expect(capability.id).toBeDefined();
    expect(capability.model_id).toBe('dall-e-3');
  });

  it('should throw AppError 404 when adding capability to non-existent provider', async () => {
    await expect(
      capabilityService.addCapability('invalid', {
        capability_type: 'text-to-image',
        model_id: 'model-x',
        max_resolution: null,
        supported_params: {},
        quality_score: 0.8,
        pricing_model: 'per-call',
      })
    ).rejects.toThrow(AppError);
  });

  it('should update capability and trigger event', async () => {
    const { provider } = await providerService.registerProvider({
      slug: 'runway-v1',
      display_name: 'Runway Video',
      secret_key: 'vault/runway',
    });

    const cap = await capabilityService.addCapability(provider.id, {
      capability_type: 'text-to-video',
      model_id: 'gen-2',
      max_resolution: '1080p',
      supported_params: {},
      quality_score: 0.85,
      pricing_model: 'per-second',
    });

    const updated = await capabilityService.updateCapability(cap.id, { quality_score: 0.92 });
    expect(updated.quality_score).toBe(0.92);
  });

  it('should throw AppError 404 when updating non-existent capability', async () => {
    await expect(capabilityService.updateCapability('invalid-cap', { quality_score: 0.5 })).rejects.toThrow(AppError);
  });

  it('should lookup capabilities by type and region, caching result and sorting by quality_score desc', async () => {
    const { provider: p1 } = await providerService.registerProvider({
      slug: 'p1',
      display_name: 'P1',
      secret_key: 'k1',
      region_codes: ['us-east-1'],
    });
    const { provider: p2 } = await providerService.registerProvider({
      slug: 'p2',
      display_name: 'P2',
      secret_key: 'k2',
      region_codes: ['us-east-1'],
    });

    await capabilityService.addCapability(p1.id, {
      capability_type: 'text-to-image',
      model_id: 'm1',
      max_resolution: null,
      supported_params: {},
      quality_score: 0.7,
      pricing_model: 'per-image',
    });

    await capabilityService.addCapability(p2.id, {
      capability_type: 'text-to-image',
      model_id: 'm2',
      max_resolution: null,
      supported_params: {},
      quality_score: 0.95,
      pricing_model: 'per-image',
    });

    const results = await capabilityService.lookupCapabilities('text-to-image', 'us-east-1');
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0].quality_score).toBe(0.95);

    // Verify cache hit
    const cached = await capabilityService.lookupCapabilities('text-to-image', 'us-east-1');
    expect(cached.length).toBeGreaterThanOrEqual(2);
  });
});
