import { CacheService } from '../infra/cache';

export interface ProviderConfigUpdatedEvent {
  event_name: 'provider.config.updated';
  version: 'v1';
  payload: {
    provider_id: string;
    slug: string;
    status: string;
    capabilities: string[];
  };
}

export class ConfigUpdatedSubscriber {
  constructor(private cache: CacheService) {}

  async handleConfigUpdated(event: ProviderConfigUpdatedEvent): Promise<void> {
    // Invalidate cached candidate lookups
    await this.cache.delPattern('routing:candidates:*');
  }
}
