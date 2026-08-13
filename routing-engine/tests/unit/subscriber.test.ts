import { ConfigUpdatedSubscriber } from '../../src/events/subscriber';
import { InMemoryCacheService } from '../../src/infra/cache';

describe('ConfigUpdatedSubscriber', () => {
  it('should invalidate candidate cache on provider.config.updated event', async () => {
    const cache = new InMemoryCacheService();
    await cache.set('routing:candidates:text-to-image:all', [{ test: true }]);

    const subscriber = new ConfigUpdatedSubscriber(cache);
    await subscriber.handleConfigUpdated({
      event_name: 'provider.config.updated',
      version: 'v1',
      payload: {
        provider_id: 'p1',
        slug: 'p1-slug',
        status: 'active',
        capabilities: ['text-to-image'],
      },
    });

    const cached = await cache.get('routing:candidates:text-to-image:all');
    expect(cached).toBeNull();
  });
});
