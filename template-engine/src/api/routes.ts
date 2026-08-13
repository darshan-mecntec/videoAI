import { Router, Request, Response, NextFunction } from 'express';
import { TemplateService } from '../domain/templateService';
import { PromptService } from '../domain/promptService';
import { TemplateCategory } from '../domain/types';

export function createRouter(
  templateService: TemplateService,
  promptService: PromptService
): Router {
  const router = Router();

  // GET /v1/templates
  router.get('/v1/templates', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = req.query.category as TemplateCategory | undefined;
      const modality = req.query.modality as string | undefined;
      const cursor = req.query.cursor as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const result = await templateService.listTemplates({ category, modality, cursor, limit });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/templates/:id
  router.get('/v1/templates/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await templateService.getTemplate(req.params.id);
      res.status(200).json({ template });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/templates
  router.post('/v1/templates', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await templateService.createTemplate(req.body);
      res.status(201).json({ template });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/templates/:id/fork
  router.post('/v1/templates/:id/fork', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { project_id, custom_name } = req.body;
      const result = await templateService.forkTemplate(req.params.id, { project_id, custom_name });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/prompts/render
  router.post('/v1/prompts/render', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = promptService.renderPrompt(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/prompts/lint
  router.post('/v1/prompts/lint', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = promptService.lintPrompt(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
