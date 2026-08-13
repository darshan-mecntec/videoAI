import request from 'supertest';
import { createApp } from '../../src/app';

describe('Metrics Service API Integration Tests', () => {
  let appInstance: ReturnType<typeof createApp>;

  beforeEach(() => {
    appInstance = createApp();
  });

  it('should return aggregated system metrics via GET /v1/metrics/aggregate', async () => {
    const res = await request(appInstance.app)
      .get('/v1/metrics/aggregate')
      .set('X-Request-ID', 'metrics-req-1');

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe('metrics-req-1');
    expect(res.body.metrics.active_services_count).toBe(9);
    expect(res.body.metrics.services.length).toBe(9);
    expect(res.body.metrics.providers_status.length).toBeGreaterThan(0);
  });
});
