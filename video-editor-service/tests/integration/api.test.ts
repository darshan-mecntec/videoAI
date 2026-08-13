import request from 'supertest';
import { createApp } from '../../src/app';

describe('Video Editor Service Integration Tests', () => {
  let appInstance: ReturnType<typeof createApp>;

  beforeEach(() => {
    appInstance = createApp();
  });

  describe('GET /v1/editor/presets', () => {
    it('should list all 6 export presets with resolution and aspect ratio', async () => {
      const res = await request(appInstance.app)
        .get('/v1/editor/presets')
        .set('X-Request-ID', 'test-presets-1');

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe('test-presets-1');
      expect(res.body.presets).toHaveLength(6);

      const presetNames = res.body.presets.map((p: { name: string }) => p.name);
      expect(presetNames).toContain('youtube_1080p');
      expect(presetNames).toContain('instagram_reel');
      expect(presetNames).toContain('tiktok');
      expect(presetNames).toContain('facebook_square');
      expect(presetNames).toContain('linkedin_hd');
      expect(presetNames).toContain('animated_gif');
    });
  });

  describe('Timeline CRUD & Edit Operations', () => {
    it('should create a timeline, add clips, apply edits, and calculate duration', async () => {
      // 1. Create timeline
      const createRes = await request(appInstance.app)
        .post('/v1/editor/timeline')
        .send({ name: 'Commercial Spot', aspect_ratio: '16:9' });

      expect(createRes.status).toBe(201);
      const timelineId = createRes.body.timeline.id;
      expect(timelineId).toBeDefined();

      // 2. Add video clip
      const addRes = await request(appInstance.app)
        .patch(`/v1/editor/timeline/${timelineId}`)
        .send({
          type: 'add_clip',
          track_type: 'video',
          payload: { asset_url: 'https://example.com/clip1.mp4', duration_ms: 10000 },
        });

      expect(addRes.status).toBe(200);
      expect(addRes.body.timeline.tracks.video).toHaveLength(1);
      expect(addRes.body.timeline.duration_ms).toBe(10000);

      const clipId = addRes.body.timeline.tracks.video[0].id;

      // 3. Trim clip
      const trimRes = await request(appInstance.app)
        .patch(`/v1/editor/timeline/${timelineId}`)
        .send({
          type: 'trim_clip',
          clip_id: clipId,
          payload: { trim_start_ms: 0, trim_end_ms: 7000 },
        });

      expect(trimRes.status).toBe(200);
      expect(trimRes.body.timeline.duration_ms).toBe(7000);

      // 4. Add subtitle
      const subRes = await request(appInstance.app)
        .patch(`/v1/editor/timeline/${timelineId}`)
        .send({
          type: 'add_subtitle',
          payload: { text: 'Welcome to Acme AI Studio', start_ms: 500, duration_ms: 4000 },
        });

      expect(subRes.status).toBe(200);
      expect(subRes.body.timeline.tracks.subtitles).toHaveLength(1);

      // 5. Add logo overlay
      const overlayRes = await request(appInstance.app)
        .patch(`/v1/editor/timeline/${timelineId}`)
        .send({
          type: 'add_overlay',
          payload: { asset_url: 'https://example.com/logo.png', x_pct: 10, y_pct: 10, width_pct: 20 },
        });

      expect(overlayRes.status).toBe(200);
      expect(overlayRes.body.timeline.tracks.overlays).toHaveLength(1);
    });
  });

  describe('Render & Export Engine', () => {
    it('should trigger render job and poll status to completion', async () => {
      // Create & populate timeline
      const createRes = await request(appInstance.app)
        .post('/v1/editor/timeline')
        .send({ name: 'Export Test' });
      const timelineId = createRes.body.timeline.id;

      await request(appInstance.app)
        .patch(`/v1/editor/timeline/${timelineId}`)
        .send({
          type: 'add_clip',
          payload: { asset_url: 'https://example.com/sample.mp4', duration_ms: 5000 },
        });

      // Trigger render
      const renderRes = await request(appInstance.app)
        .post(`/v1/editor/timeline/${timelineId}/render`)
        .send({ preset: 'youtube_1080p' });

      expect(renderRes.status).toBe(202);
      const jobId = renderRes.body.job.id;

      // Poll render job
      const pollRes = await request(appInstance.app)
        .get(`/v1/editor/render/${jobId}`);

      expect(pollRes.status).toBe(200);
      expect(pollRes.body.job.id).toBe(jobId);
      expect(pollRes.body.job.preset).toBe('youtube_1080p');
    });

    it('should return 400 when trying to render empty timeline', async () => {
      const createRes = await request(appInstance.app)
        .post('/v1/editor/timeline')
        .send({ name: 'Empty Timeline' });

      const renderRes = await request(appInstance.app)
        .post(`/v1/editor/timeline/${createRes.body.timeline.id}/render`)
        .send({ preset: 'youtube_1080p' });

      expect(renderRes.status).toBe(400);
      expect(renderRes.body.error.code).toBe('TIMELINE_EMPTY');
    });
  });
});
