import request from 'supertest';
import { createApp } from '../../src/app';

describe('Template Engine API Integration Tests', () => {
  let appInstance: ReturnType<typeof createApp>;

  beforeEach(async () => {
    appInstance = createApp();
    await appInstance.templateService.seedStarterTemplates();
  });

  it('should flow through lifecycle: list templates -> get details -> fork to workflow -> render prompt -> lint prompt', async () => {
    // 1. List Templates
    const listRes = await request(appInstance.app)
      .get('/v1/templates')
      .set('X-Request-ID', 'tmpl-req-1')
      .query({ category: 'ecommerce' });

    expect(listRes.status).toBe(200);
    expect(listRes.headers['x-request-id']).toBe('tmpl-req-1');
    expect(listRes.body.templates.length).toBe(1);
    const templateId = listRes.body.templates[0].id;

    // 2. Get Template Details
    const getRes = await request(appInstance.app).get(`/v1/templates/${templateId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.template.slug).toBe('ecommerce-ad-suite');

    // 3. Fork Template
    const forkRes = await request(appInstance.app)
      .post(`/v1/templates/${templateId}/fork`)
      .send({ project_id: 'proj-demo-1', custom_name: 'Forked E-Commerce Pipeline' });

    expect(forkRes.status).toBe(201);
    expect(forkRes.body.workflow.id).toBeDefined();
    expect(forkRes.body.workflow.name).toBe('Forked E-Commerce Pipeline');

    // 4. Render Prompt with Variables
    const renderRes = await request(appInstance.app)
      .post('/v1/prompts/render')
      .send({
        template_text: 'Product photo of {{product_name}} on {{background}}',
        variables: { product_name: 'Smart Watch', background: 'glass desk' },
      });

    expect(renderRes.status).toBe(200);
    expect(renderRes.body.rendered_text).toBe('Product photo of Smart Watch on glass desk');
    expect(renderRes.body.variables_used).toEqual(['background', 'product_name']);

    // 5. Lint Prompt
    const lintRes = await request(appInstance.app)
      .post('/v1/prompts/lint')
      .send({ prompt: 'Clean professional product photo prompt' });

    expect(lintRes.status).toBe(200);
    expect(lintRes.body.is_valid).toBe(true);
  });

  it('should create custom template via POST /v1/templates', async () => {
    const res = await request(appInstance.app)
      .post('/v1/templates')
      .send({
        slug: 'social-story-gen',
        title: 'Social Story Generator',
        description: 'Story pipeline',
        category: 'social_video',
        modalities: ['text-to-image'],
        nodes: [{ id: 'n1', name: 'N1', node_type: 'prompt', params: {}, inputs: [], outputs: [] }],
        edges: [],
      });

    expect(res.status).toBe(201);
    expect(res.body.template.slug).toBe('social-story-gen');
  });

  it('should handle API errors for missing template or invalid input', async () => {
    const getRes = await request(appInstance.app).get('/v1/templates/non-existent');
    expect(getRes.status).toBe(404);
    expect(getRes.body.error.code).toBe('TEMPLATE_NOT_FOUND');

    const renderRes = await request(appInstance.app).post('/v1/prompts/render').send({ template_text: '' });
    expect(renderRes.status).toBe(400);
    expect(renderRes.body.error.code).toBe('INVALID_INPUT');

    const lintRes = await request(appInstance.app).post('/v1/prompts/lint').send({ prompt: '' });
    expect(lintRes.status).toBe(400);
    expect(lintRes.body.error.code).toBe('INVALID_INPUT');
  });

  it('should handle unhandled 500 error in error middleware', async () => {
    jest.spyOn(appInstance.templateService, 'listTemplates').mockRejectedValueOnce(new Error('Internal database failure'));
    const res = await request(appInstance.app).get('/v1/templates');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(res.body.error.message).toBe('Internal database failure');
  });
});
