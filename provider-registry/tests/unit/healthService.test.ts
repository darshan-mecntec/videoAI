import { ProviderService } from '../../src/domain/providerService';
import { HealthService } from '../../src/domain/healthService';
import { InMemoryProviderRepository, InMemoryCacheService } from '../../src/infra/repository';
import { InMemoryEventBus } from '../../src/events/publisher';
import { AppError } from '../../src/domain/types';

describe('HealthService', () => {
  let repo: InMemoryProviderRepository;
  let cache: InMemoryCacheService;
  let eventPublisher: InMemoryEventBus;
  let providerService: ProviderService;
  let healthService: HealthService;

  beforeEach(() => {
    repo = new InMemoryProviderRepository();
    cache = new InMemoryCacheService();
    eventPublisher = new InMemoryEventBus();
    providerService = new ProviderService(repo, cache, eventPublisher);
    healthService = new HealthService(repo, cache);
  });

  it('should return default initial health record if none recorded', async () => {
    const { provider } = await providerService.registerProvider({
      slug: 'elevenlabs-v1',
      display_name: 'ElevenLabs Voice',
      secret_key: 'vault/elevenlabs',
    });

    const health = await healthService.getHealth(provider.id);
    expect(health.status).toBe('healthy');
    expect(health.availability_7d).toBe(1.0);
  });

  it('should record health check and update cache', async () => {
    const { provider } = await providerService.registerProvider({
      slug: 'elevenlabs-v1',
      display_name: 'ElevenLabs Voice',
      secret_key: 'vault/elevenlabs',
    });

    const record = await healthService.recordHealthCheck(provider.id, 'degraded', 450, 'High latency detected', 0.98);
    expect(record.status).toBe('degraded');
    expect(record.latency_ms).toBe(450);

    const fetched = await healthService.getHealth(provider.id);
    expect(fetched.status).toBe('degraded');

    const summary = await healthService.getHealthSummary();
    expect(summary.length).toBe(1);
    expect(summary[0].provider_id).toBe(provider.id);
  });

  it('should throw AppError 404 for non-existent provider', async () => {
    await expect(healthService.getHealth('invalid')).rejects.toThrow(AppError);
    await expect(healthService.recordHealthCheck('invalid', 'healthy', 20)).rejects.toThrow(AppError);
  });
});
