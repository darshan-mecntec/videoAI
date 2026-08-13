import { Router, Request, Response, NextFunction } from 'express';
import { TemplateService } from '../domain/templateService';
import { TemplateCategory } from '../domain/types';

export function createRouter(templateService: TemplateService): Router {
  const router = Router();

  // GET /v1/video-templates
  // List templates (filtered by category if provided)
  router.get('/v1/video-templates', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = req.query.category as TemplateCategory | undefined;
      const templates = await templateService.listTemplates(category);
      res.status(200).json({ templates });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/video-templates/:id
  // Get template details & field schema
  router.get('/v1/video-templates/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await templateService.getTemplate(req.params.id);
      res.status(200).json({ template });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/video-templates
  // Create admin custom video template
  router.post('/v1/video-templates', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await templateService.createCustomTemplate(req.body);
      res.status(201).json({ template });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/video-templates/:id/generate
  // Fill template form & trigger video generation via video-service (:3011)
  router.post('/v1/video-templates/:id/generate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await templateService.submitTemplateForm({
        template_id: req.params.id,
        field_values: req.body.field_values || {},
        project_id: req.body.project_id,
        org_id: req.body.org_id,
      });
      res.status(202).json({ result });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
