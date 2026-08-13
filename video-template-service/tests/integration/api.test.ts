import request from 'supertest';
import { createApp } from '../../src/app';

describe('Video Template Service Integration Tests', () => {
  let appInstance: ReturnType<typeof createApp>;

  beforeEach(() => {
    appInstance = createApp();
  });

  describe('GET /v1/video-templates', () => {
    it('should list all system templates', async () => {
      const res = await request(appInstance.app)
        .get('/v1/video-templates')
        .set('X-Request-ID', 'test-templates-1');

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe('test-templates-1');
      expect(res.body.templates.length).toBeGreaterThanOrEqual(6);

      const templateIds = res.body.templates.map((t: { id: string }) => t.id);
      expect(templateIds).toContain('tmpl-real-estate');
      expect(templateIds).toContain('tmpl-instagram-reel');
      expect(templateIds).toContain('tmpl-corporate-ad');
    });

    it('should filter templates by category', async () => {
      const res = await request(appInstance.app)
        .get('/v1/video-templates?category=real_estate');

      expect(res.status).toBe(200);
      expect(res.body.templates).toHaveLength(1);
      expect(res.body.templates[0].category).toBe('real_estate');
    });
  });

  describe('GET /v1/video-templates/:id', () => {
    it('should return template schema for valid ID', async () => {
      const res = await request(appInstance.app)
        .get('/v1/video-templates/tmpl-real-estate');

      expect(res.status).toBe(200);
      expect(res.body.template.name).toBe('Real Estate Property Showcase');
      expect(res.body.template.fields).toBeDefined();
    });

    it('should return 404 for non-existent template', async () => {
      const res = await request(appInstance.app)
        .get('/v1/video-templates/non-existent-template');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TEMPLATE_NOT_FOUND');
    });
  });

  describe('POST /v1/video-templates', () => {
    it('should create custom admin video template', async () => {
      const res = await request(appInstance.app)
        .post('/v1/video-templates')
        .send({
          name: 'Custom Product Launch',
          category: 'product',
          description: 'Product teaser video',
          fields: [
            { key: 'title', label: 'Title', type: 'text', required: true },
          ],
          generation_config: { stage: 'text_to_video', aspect_ratio: '16:9' },
        });

      expect(res.status).toBe(201);
      expect(res.body.template.id).toMatch(/^tmpl-custom-/);
      expect(res.body.template.is_system).toBe(false);
    });
  });

  describe('POST /v1/video-templates/:id/generate — Form Validation', () => {
    it('should return 400 when required field is missing', async () => {
      const res = await request(appInstance.app)
        .post('/v1/video-templates/tmpl-real-estate/generate')
        .send({ field_values: { property_title: 'Villa' } }); // missing required fields

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_REQUIRED_FIELD');
    });
  });
});
