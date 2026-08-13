import { Router, Request, Response, NextFunction } from 'express';
import { TimelineService } from '../domain/timelineService';
import { RenderService } from '../domain/renderService';
import { listExportPresets } from '../domain/exportPresets';
import { EditOperation, ExportPresetName } from '../domain/types';

export function createRouter(timelineService: TimelineService, renderService: RenderService): Router {
  const router = Router();

  // GET /v1/editor/presets
  // List all platform export presets
  router.get('/v1/editor/presets', (_req: Request, res: Response) => {
    const presets = listExportPresets();
    res.status(200).json({ presets });
  });

  // POST /v1/editor/timeline
  // Create a new video editing timeline project
  router.post('/v1/editor/timeline', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, project_id, aspect_ratio, resolution } = req.body;
      const timeline = await timelineService.createTimeline({ name, project_id, aspect_ratio, resolution });
      res.status(201).json({ timeline });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/editor/timeline/:id
  // Get full 5-track timeline state
  router.get('/v1/editor/timeline/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const timeline = await timelineService.getTimeline(req.params.id);
      res.status(200).json({ timeline });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /v1/editor/timeline/:id
  // Apply editing operation (trim, split, set speed, volume, add subtitle, add overlay...)
  router.patch('/v1/editor/timeline/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const op: EditOperation = {
        type: req.body.type,
        track_type: req.body.track_type || 'video',
        clip_id: req.body.clip_id,
        payload: req.body.payload || {},
      };
      const timeline = await timelineService.applyEditOperation(req.params.id, op);
      res.status(200).json({ timeline });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/editor/timelines
  // List all timeline projects
  router.get('/v1/editor/timelines', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.query.project_id as string | undefined;
      const timelines = await timelineService.listTimelines(projectId);
      res.status(200).json({ timelines });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/editor/timeline/:id/render
  // Trigger FFmpeg render with platform export preset
  router.post('/v1/editor/timeline/:id/render', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const timeline = await timelineService.getTimeline(req.params.id);
      const presetName: ExportPresetName = req.body.preset || 'youtube_1080p';
      const job = await renderService.triggerRender(timeline, presetName);
      res.status(202).json({ job });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/editor/render/:jobId
  // Poll render job status
  router.get('/v1/editor/render/:jobId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const job = await renderService.getRenderJob(req.params.jobId);
      res.status(200).json({ job });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
