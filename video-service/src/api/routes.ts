import { Router, Request, Response, NextFunction } from 'express';
import { VideoService } from '../domain/videoService';
import { VideoGenerationRequest } from '../domain/types';

export function createRouter(videoService: VideoService): Router {
  const router = Router();

  // POST /v1/video/generate
  // Submit a real video generation job to a provider
  router.post('/v1/video/generate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request: VideoGenerationRequest = {
        stage: req.body.stage,
        prompt: req.body.prompt,
        image_url: req.body.image_url,
        image_urls: req.body.image_urls,
        aspect_ratio: req.body.aspect_ratio,
        duration_seconds: req.body.duration_seconds,
        resolution: req.body.resolution,
        fps: req.body.fps,
        brand_name: req.body.brand_name,
        logo_url: req.body.logo_url,
        cta_text: req.body.cta_text,
        preferred_provider: req.body.preferred_provider,
        project_id: req.body.project_id,
        org_id: req.body.org_id,
        user_id: req.body.user_id,
      };
      const job = await videoService.submitGenerationJob(request);
      res.status(202).json({ job });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/video/jobs/:jobId
  // Poll real provider API for current job status
  router.get('/v1/video/jobs/:jobId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const job = await videoService.getJobStatus(req.params.jobId);
      res.status(200).json({ job });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/video/jobs
  // List jobs (filtered by org_id if provided)
  router.get('/v1/video/jobs', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.query.org_id as string | undefined;
      const jobs = await videoService.listJobs(orgId);
      res.status(200).json({ jobs });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /v1/video/jobs/:jobId
  // Cancel a running job via real provider cancellation endpoint
  router.delete('/v1/video/jobs/:jobId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const job = await videoService.cancelJob(req.params.jobId);
      res.status(200).json({ job });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/video/providers
  // Returns all providers with capability and configuration status
  // is_configured: false means API key not set
  router.get('/v1/video/providers', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const providers = await videoService.listProviders();
      res.status(200).json({ providers });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/video/estimate
  // Returns real cost & latency estimates from all configured providers
  router.post('/v1/video/estimate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request: VideoGenerationRequest = {
        stage: req.body.stage,
        prompt: req.body.prompt,
        image_url: req.body.image_url,
        duration_seconds: req.body.duration_seconds,
        aspect_ratio: req.body.aspect_ratio,
        preferred_provider: req.body.preferred_provider,
      };
      const estimates = await videoService.estimateCost(request);
      res.status(200).json({ estimates });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
