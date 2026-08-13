import request from 'supertest';
import { createApp } from '../../src/app';

describe('Project Service API Integration Tests', () => {
  let appInstance: ReturnType<typeof createApp>;

  beforeEach(async () => {
    appInstance = createApp();
    await appInstance.projectService.seedStarterProjects();
  });

  it('should list projects for organization via GET /v1/projects', async () => {
    const res = await request(appInstance.app)
      .get('/v1/projects')
      .set('X-Request-ID', 'proj-req-1')
      .query({ org_id: 'org-cybertech-1' });

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe('proj-req-1');
    expect(res.body.projects.length).toBeGreaterThan(0);
    expect(res.body.projects[0].org_id).toBe('org-cybertech-1');
  });

  it('should create new project workspace via POST /v1/projects', async () => {
    const res = await request(appInstance.app)
      .post('/v1/projects')
      .send({
        org_id: 'org-cybertech-1',
        name: 'Staging Ads Campaign',
        description: 'Testing project workspace',
      });

    expect(res.status).toBe(201);
    expect(res.body.project.id).toBeDefined();
    expect(res.body.project.name).toBe('Staging Ads Campaign');
  });
});
