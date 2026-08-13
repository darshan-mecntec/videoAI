import request from 'supertest';
import { createApp } from '../../src/app';

describe('Asset Service API Integration Tests', () => {
  let appInstance: ReturnType<typeof createApp>;

  beforeEach(async () => {
    appInstance = createApp();
    await appInstance.assetService.seedStarterAssets();
  });

  it('should list assets and filter by type', async () => {
    const listRes = await request(appInstance.app)
      .get('/v1/assets')
      .set('X-Request-ID', 'asset-req-1')
      .query({ type: 'video' });

    expect(listRes.status).toBe(200);
    expect(listRes.headers['x-request-id']).toBe('asset-req-1');
    expect(listRes.body.assets.length).toBeGreaterThan(0);
    expect(listRes.body.assets[0].type).toBe('video');
  });

  it('should create new media asset via POST /v1/assets', async () => {
    const res = await request(appInstance.app)
      .post('/v1/assets')
      .send({
        name: 'Rendered AI Video Clip',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        metadata: { mime_type: 'video/mp4', file_size_bytes: 10485760 },
      });

    expect(res.status).toBe(201);
    expect(res.body.asset.id).toBeDefined();
    expect(res.body.asset.name).toBe('Rendered AI Video Clip');
  });

  it('should handle error for invalid asset ID', async () => {
    const res = await request(appInstance.app).get('/v1/assets/non-existent-id');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ASSET_NOT_FOUND');
  });
});
