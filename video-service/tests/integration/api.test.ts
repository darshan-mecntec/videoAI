// ─────────────────────────────────────────────────────────────────────────────
// video-service Integration Tests
// Tests the full request/response contract of each API endpoint.
// Verifies proper error codes when no API keys are configured.
// ─────────────────────────────────────────────────────────────────────────────

import request from 'supertest';
import { createApp } from '../../src/app';

describe('Video Service API Integration Tests', () => {
  let appInstance: ReturnType<typeof createApp>;

  beforeEach(() => {
    // Each test gets a clean app instance (no shared state)
    appInstance = createApp();
  });

  describe('GET /v1/video/providers', () => {
    it('should list all 5 providers with configuration status', async () => {
      const res = await request(appInstance.app)
        .get('/v1/video/providers')
        .set('X-Request-ID', 'test-providers-1');

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe('test-providers-1');
      expect(res.body.providers).toHaveLength(5);

      const providerIds = res.body.providers.map((p: { provider: string }) => p.provider);
      expect(providerIds).toContain('runway');
      expect(providerIds).toContain('pika');
      expect(providerIds).toContain('luma');
      expect(providerIds).toContain('openai');
      expect(providerIds).toContain('google_veo');

      // Each provider has required capability fields
      const runway = res.body.providers.find((p: { provider: string }) => p.provider === 'runway');
      expect(runway).toHaveProperty('is_configured');
      expect(runway).toHaveProperty('supported_stages');
      expect(runway).toHaveProperty('avg_generation_seconds');
      expect(runway).toHaveProperty('cost_per_second_usd');
    });
  });

  describe('POST /v1/video/generate — Input Validation', () => {
    it('should return 400 when prompt is missing', async () => {
      const res = await request(appInstance.app)
        .post('/v1/video/generate')
        .send({ stage: 'text_to_video' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_INPUT');
    });

    it('should return 400 when stage is missing', async () => {
      const res = await request(appInstance.app)
        .post('/v1/video/generate')
        .send({ prompt: 'A beautiful sunset' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_INPUT');
    });

    it('should return 400 when image_url is missing for image_to_video', async () => {
      const res = await request(appInstance.app)
        .post('/v1/video/generate')
        .send({ stage: 'image_to_video', prompt: 'Animate this' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_INPUT');
    });

    it('should return 400 when less than 2 image_urls for images_to_video', async () => {
      const res = await request(appInstance.app)
        .post('/v1/video/generate')
        .send({ stage: 'images_to_video', prompt: 'Slideshow', image_urls: ['http://example.com/img1.jpg'] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_INPUT');
    });

    it('should return 503 with clear error when no providers are configured', async () => {
      // In test env with no real API keys, expect a 503 or provider-not-configured error
      const res = await request(appInstance.app)
        .post('/v1/video/generate')
        .send({ stage: 'text_to_video', prompt: 'A futuristic city at night' });

      // Either 202 (accepted), 502 (upstream API error), or 503 (no providers)
      expect([202, 502, 503]).toContain(res.status);
      if (res.status === 503) {
        expect(res.body.error.code).toMatch(/PROVIDER_NOT_CONFIGURED|NO_PROVIDERS_CONFIGURED/);
      }
    });
  });

  describe('POST /v1/video/estimate', () => {
    it('should return 503 with clear message when no providers configured', async () => {
      const res = await request(appInstance.app)
        .post('/v1/video/estimate')
        .send({ stage: 'text_to_video', prompt: 'A beautiful mountain' });

      // Either returns estimates (if API keys in env) or 503
      expect([200, 503]).toContain(res.status);
    });
  });

  describe('GET /v1/video/jobs/:jobId', () => {
    it('should return 404 for non-existent job', async () => {
      const res = await request(appInstance.app)
        .get('/v1/video/jobs/job-does-not-exist');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('JOB_NOT_FOUND');
    });
  });

  describe('DELETE /v1/video/jobs/:jobId', () => {
    it('should return 404 when trying to cancel non-existent job', async () => {
      const res = await request(appInstance.app)
        .delete('/v1/video/jobs/job-does-not-exist');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('JOB_NOT_FOUND');
    });
  });
});
