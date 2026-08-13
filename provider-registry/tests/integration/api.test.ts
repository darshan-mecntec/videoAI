import request from 'supertest';
import { createApp } from '../../src/app';

describe('Provider Registry API Integration Tests', () => {
  let appInstance: ReturnType<typeof createApp>;

  beforeEach(() => {
    appInstance = createApp();
  });

  it('should flow through full lifecycle: register -> add cap -> lookup -> health check -> soft delete', async () => {
    // 1. Register Provider
    const regRes = await request(appInstance.app)
      .post('/v1/providers')
      .set('X-Request-ID', 'test-req-1')
      .send({
        slug: 'openai-v1',
        display_name: 'OpenAI Platform',
        secret_key: 'vault/openai/prod',
        region_codes: ['us-east-1'],
      });

    expect(regRes.status).toBe(201);
    expect(regRes.headers['x-request-id']).toBe('test-req-1');
    const providerId = regRes.body.provider.id;

    // 2. Add Capability
    const capRes = await request(appInstance.app)
      .post(`/v1/providers/${providerId}/capabilities`)
      .send({
        capability_type: 'text-to-image',
        model_id: 'dall-e-3',
        max_resolution: '1024x1024',
        supported_params: {},
        quality_score: 0.96,
        pricing_model: 'per-image',
      });
    expect(capRes.status).toBe(201);
    const capId = capRes.body.capability.id;

    // 3. Lookup capabilities
    const lookupRes = await request(appInstance.app)
      .get('/v1/capabilities')
      .query({ type: 'text-to-image', region: 'us-east-1' });

    expect(lookupRes.status).toBe(200);
    expect(lookupRes.body.capabilities.length).toBeGreaterThanOrEqual(1);
    expect(lookupRes.body.capabilities[0].provider.id).toBe(providerId);

    // 4. Get provider capabilities directly
    const getCapsRes = await request(appInstance.app).get(`/v1/providers/${providerId}/capabilities`);
    expect(getCapsRes.status).toBe(200);
    expect(getCapsRes.body.capabilities.length).toBeGreaterThanOrEqual(1);

    // 5. Update Capability
    const patchCapRes = await request(appInstance.app)
      .patch(`/v1/providers/${providerId}/capabilities/${capId}`)
      .send({ quality_score: 0.99 });
    expect(patchCapRes.status).toBe(200);
    expect(patchCapRes.body.capability.quality_score).toBe(0.99);

    // 6. Add Pricing & Rate limits
    const pricingRes = await request(appInstance.app)
      .post(`/v1/providers/${providerId}/pricing`)
      .send({
        capability_id: capId,
        unit: 'image',
        cost_usd: 0.04,
        effective_from: new Date().toISOString(),
        effective_until: null,
      });
    expect(pricingRes.status).toBe(201);

    const getPricingRes = await request(appInstance.app).get(`/v1/providers/${providerId}/pricing`);
    expect(getPricingRes.status).toBe(200);
    expect(getPricingRes.body.pricing.length).toBe(1);

    const rateLimitsRes = await request(appInstance.app)
      .put(`/v1/providers/${providerId}/rate-limits`)
      .send({
        limits: [{ capability_id: capId, requests_per_min: 50, tokens_per_min: null, concurrency_cap: 5 }],
      });
    expect(rateLimitsRes.status).toBe(200);

    const getRateLimitsRes = await request(appInstance.app).get(`/v1/providers/${providerId}/rate-limits`);
    expect(getRateLimitsRes.status).toBe(200);
    expect(getRateLimitsRes.body.rate_limits.length).toBe(1);

    // 7. Get Health & Record Health check
    const getHealthRes = await request(appInstance.app).get(`/v1/providers/${providerId}/health`);
    expect(getHealthRes.status).toBe(200);
    expect(getHealthRes.body.health).toBeDefined();

    const healthCheckRes = await request(appInstance.app)
      .post(`/v1/providers/${providerId}/health-check`)
      .send({ status: 'healthy', latency_ms: 120 });
    expect(healthCheckRes.status).toBe(200);

    const healthSummaryRes = await request(appInstance.app).get('/v1/providers/health-summary');
    expect(healthSummaryRes.status).toBe(200);
    expect(healthSummaryRes.body.health_summary.length).toBe(1);

    // 8. Patch provider details
    const patchProviderRes = await request(appInstance.app)
      .patch(`/v1/providers/${providerId}`)
      .send({ display_name: 'OpenAI Global Platform' });
    expect(patchProviderRes.status).toBe(200);

    // 9. Soft Delete provider
    const delRes = await request(appInstance.app).delete(`/v1/providers/${providerId}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.provider.status).toBe('deprecated');
  });

  it('should handle list providers with query params', async () => {
    const res = await request(appInstance.app).get('/v1/providers').query({ limit: 10, status: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.providers).toBeDefined();
  });

  it('should return error response complying with 05_API_GUIDELINES.md schema', async () => {
    const res = await request(appInstance.app).get('/v1/providers/non-existent-uuid');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('PROVIDER_NOT_FOUND');
    expect(res.body.error.message).toContain('non-existent-uuid');
    expect(res.body.error.request_id).toBeDefined();
  });

  it('should handle API errors for all endpoints when provider is invalid', async () => {
    const invalidId = 'invalid-id';

    const patchRes = await request(appInstance.app).patch(`/v1/providers/${invalidId}`).send({ display_name: 'X' });
    expect(patchRes.status).toBe(404);

    const delRes = await request(appInstance.app).delete(`/v1/providers/${invalidId}`);
    expect(delRes.status).toBe(404);

    const getCapsRes = await request(appInstance.app).get(`/v1/providers/${invalidId}/capabilities`);
    expect(getCapsRes.status).toBe(404);

    const postCapRes = await request(appInstance.app).post(`/v1/providers/${invalidId}/capabilities`).send({});
    expect(postCapRes.status).toBe(404);

    const patchCapRes = await request(appInstance.app).patch(`/v1/providers/${invalidId}/capabilities/invalid-cap`).send({});
    expect(patchCapRes.status).toBe(404);

    const getPricingRes = await request(appInstance.app).get(`/v1/providers/${invalidId}/pricing`);
    expect(getPricingRes.status).toBe(404);

    const postPricingRes = await request(appInstance.app).post(`/v1/providers/${invalidId}/pricing`).send({});
    expect(postPricingRes.status).toBe(404);

    const getHealthRes = await request(appInstance.app).get(`/v1/providers/${invalidId}/health`);
    expect(getHealthRes.status).toBe(404);

    const postHealthRes = await request(appInstance.app).post(`/v1/providers/${invalidId}/health-check`).send({});
    expect(postHealthRes.status).toBe(404);

    const getLimitsRes = await request(appInstance.app).get(`/v1/providers/${invalidId}/rate-limits`);
    expect(getLimitsRes.status).toBe(404);

    const putLimitsRes = await request(appInstance.app).put(`/v1/providers/${invalidId}/rate-limits`).send({});
    expect(putLimitsRes.status).toBe(404);
  });

  it('should return 400 when missing required query param in lookup', async () => {
    const res = await request(appInstance.app).get('/v1/capabilities');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_CAPABILITY_TYPE');
  });

  it('should handle unhandled 500 error in error middleware', async () => {
    // Override a method to throw a raw Error
    jest.spyOn(appInstance.providerService, 'listProviders').mockRejectedValueOnce(new Error('Database explosion'));
    const res = await request(appInstance.app).get('/v1/providers');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(res.body.error.message).toBe('Database explosion');
  });
});
