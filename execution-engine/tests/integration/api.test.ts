import request from 'supertest';
import { createApp } from '../../src/app';

describe('Execution Engine API Integration Tests', () => {
  let appInstance: ReturnType<typeof createApp>;

  beforeEach(() => {
    appInstance = createApp();
  });

  it('should dispatch video generation execution and return output asset', async () => {
    const res = await request(appInstance.app)
      .post('/v1/execution/dispatch')
      .set('X-Request-ID', 'exec-req-1')
      .send({
        capability_type: 'text-to-video',
        params: { text: 'Cinematic trailer prompt' },
      });

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe('exec-req-1');
    expect(res.body.execution_id).toBeDefined();
    expect(res.body.status).toBe('succeeded');
    expect(res.body.output_asset.type).toBe('video');
    expect(res.body.output_asset.url).toContain('.mp4');
  });

  it('should dispatch image generation execution and return output asset', async () => {
    const res = await request(appInstance.app)
      .post('/v1/execution/dispatch')
      .send({
        capability_type: 'text-to-image',
        params: { text: 'Product photo prompt' },
      });

    expect(res.status).toBe(200);
    expect(res.body.output_asset.type).toBe('image');
  });

  it('should handle error for missing capability_type', async () => {
    const res = await request(appInstance.app)
      .post('/v1/execution/dispatch')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });
});
