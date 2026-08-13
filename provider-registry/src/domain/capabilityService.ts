import { Capability, CapabilityType, AppError, Provider } from './types';
import { ProviderRepository, CacheService } from '../infra/repository';
import { EventPublisher } from '../events/publisher';
import { v4 as uuidv4 } from 'uuid';

export class CapabilityService {
  constructor(
    private repo: ProviderRepository,
    private cache: CacheService,
    private eventPublisher: EventPublisher
  ) {}

  async addCapability(providerId: string, capData: Omit<Capability, 'id' | 'provider_id'>): Promise<Capability> {
    const provider = await this.repo.findProviderById(providerId);
    if (!provider) {
      throw new AppError(404, 'PROVIDER_NOT_FOUND', `Provider with id '${providerId}' not found`);
    }

    const capability = await this.repo.createCapability({
      ...capData,
      provider_id: providerId,
      id: uuidv4(),
    });

    await this.cache.delPattern('registry:capabilities:*');
    await this.publishConfigUpdated(provider);

    return capability;
  }

  async updateCapability(capId: string, updates: Partial<Omit<Capability, 'id' | 'provider_id'>>): Promise<Capability> {
    const updated = await this.repo.updateCapability(capId, updates);
    if (!updated) {
      throw new AppError(404, 'CAPABILITY_NOT_FOUND', `Capability with id '${capId}' not found`);
    }

    const provider = await this.repo.findProviderById(updated.provider_id);
    if (provider) {
      await this.publishConfigUpdated(provider);
    }

    await this.cache.delPattern('registry:capabilities:*');
    return updated;
  }

  async lookupCapabilities(type: CapabilityType, region?: string): Promise<Array<Capability & { provider: Provider }>> {
    const cacheKey = `registry:capabilities:${type}:${region || 'all'}`;
    const cached = await this.cache.get<Array<Capability & { provider: Provider }>>(cacheKey);
    if (cached) {
      return cached;
    }

    const results = await this.repo.findCapabilitiesByTypeAndRegion(type, region);
    await this.cache.set(cacheKey, results, 30); // 30s TTL per implementation plan
    return results;
  }

  private async publishConfigUpdated(provider: Provider): Promise<void> {
    const caps = await this.repo.findCapabilitiesByProviderId(provider.id);
    await this.eventPublisher.publish({
      event_name: 'provider.config.updated',
      version: 'v1',
      timestamp: new Date().toISOString(),
      payload: {
        provider_id: provider.id,
        slug: provider.slug,
        status: provider.status,
        capabilities: caps.map((c) => c.capability_type),
      },
    });
  }
}
