import request from 'supertest';
import { createApp } from '../../src/app';

describe('Auth Service API Integration Tests', () => {
  let appInstance: ReturnType<typeof createApp>;

  beforeEach(async () => {
    appInstance = createApp();
    await appInstance.authService.seedDefaultAuth();
  });

  it('should authenticate user via POST /v1/auth/login and return session token', async () => {
    const res = await request(appInstance.app)
      .post('/v1/auth/login')
      .set('X-Request-ID', 'auth-req-1')
      .send({ email: 'admin@aether.ai', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe('auth-req-1');
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('admin@aether.ai');
    expect(res.body.org.name).toBe('CyberTech Creative Labs');
  });

  it('should list tenant organizations via GET /v1/auth/orgs', async () => {
    const res = await request(appInstance.app).get('/v1/auth/orgs');
    expect(res.status).toBe(200);
    expect(res.body.orgs.length).toBe(2);
  });

  it('should create new platform API Key via POST /v1/auth/api-keys with Bearer token', async () => {
    const loginRes = await request(appInstance.app)
      .post('/v1/auth/login')
      .send({ email: 'admin@aether.ai', password: 'admin123' });

    const token = loginRes.body.token;

    const res = await request(appInstance.app)
      .post('/v1/auth/api-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ org_id: 'org-cybertech-1', name: 'Staging Worker Key' });

    expect(res.status).toBe(201);
    expect(res.body.api_key.secret).toContain('ak_live_');
  });
});
