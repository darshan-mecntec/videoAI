import request from 'supertest';
import { createApp } from '../../src/app';
import { MockProviderRegistryClient } from '../../src/infra/registryClient';
import { ProviderCapabilityCandidate } from '../../src/domain/types';

describe('Routing Engine API Integration Tests', () => {
  let appInstance: ReturnType<typeof createApp>;

  const sampleCandidates: ProviderCapabilityCandidate[] = [
    {
      provider_id: 'p-cheap',
      slug: 'p-cheap',
      capability_id: 'c1',
      model_id: 'cheap-v1',
      quality_score: 0.75,
      cost_estimate_usd: 0.01,
      latency_estimate_ms: 1200,
      availability_7d: 0.99,
      region_codes: ['us-east-1'],
      status: 'active',
    },
    {
      provider_id: 'p-quality',
      slug: 'p-quality',
      capability_id: 'c2',
      model_id: 'quality-v1',
      quality_score: 0.98,
      cost_estimate_usd: 0.08,
      latency_estimate_ms: 800,
      availability_7d: 1.0,
      region_codes: ['us-east-1'],
      status: 'active',
    },
  ];

  beforeEach(() => {
    appInstance = createApp();
    (appInstance.registryClient as MockProviderRegistryClient).seedCapabilities('text-to-image', sampleCandidates);
  });

  it('should return routing decision with selected_provider and fallback_chain', async () => {
    const res = await request(appInstance.app)
      .post('/v1/routing/route')
      .set('X-Request-ID', 'integration-req-1')
      .send({
        capability_type: 'text-to-image',
        strategy_preference: 'highest_quality',
      });

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe('integration-req-1');
    expect(res.body.selected_provider.provider_id).toBe('p-quality');
    expect(res.body.fallback_chain.length).toBe(1);
    expect(res.body.fallback_chain[0].provider_id).toBe('p-cheap');
  });

  it('should manage org policies via GET and PUT endpoints', async () => {
    const getRes = await request(appInstance.app).get('/v1/routing/policies/org-alpha');
    expect(getRes.status).toBe(200);
    expect(getRes.body.policy.default_strategy).toBe('balanced');

    const putRes = await request(appInstance.app)
      .put('/v1/routing/policies/org-alpha')
      .send({
        default_strategy: 'lowest_cost',
        max_budget_per_request_usd: 0.05,
        blacklisted_provider_ids: ['p-quality'],
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.policy.default_strategy).toBe('lowest_cost');

    // Route under org-alpha policy (p-quality is blacklisted)
    const routeRes = await request(appInstance.app).post('/v1/routing/route').send({
      capability_type: 'text-to-image',
      org_id: 'org-alpha',
    });

    expect(routeRes.status).toBe(200);
    expect(routeRes.body.selected_provider.provider_id).toBe('p-cheap');
    expect(routeRes.body.fallback_chain.length).toBe(0);
  });

  it('should acknowledge execution feedback', async () => {
    const res = await request(appInstance.app).post('/v1/routing/feedback').send({
      call_id: 'call-abc',
      provider_id: 'p-cheap',
      capability_type: 'text-to-image',
      success: true,
      latency_ms: 250,
      cost_usd: 0.01,
      attempt_number: 1,
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('acknowledged');
  });

  it('should return standard 05_API_GUIDELINES error when no candidate matches', async () => {
    const res = await request(appInstance.app).post('/v1/routing/route').send({
      capability_type: 'text-to-video',
    });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NO_SUITABLE_PROVIDER');
    expect(res.body.error.request_id).toBeDefined();
  });

  it('should handle unhandled 500 error in error middleware', async () => {
    jest.spyOn(appInstance.routingService, 'selectRoute').mockRejectedValueOnce(new Error('Internal scoring glitch'));
    const res = await request(appInstance.app).post('/v1/routing/route').send({ capability_type: 'text-to-image' });

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(res.body.error.message).toBe('Internal scoring glitch');
  });
});
