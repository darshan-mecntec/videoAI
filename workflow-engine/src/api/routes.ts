import { Router, Request, Response, NextFunction } from 'express';
import { WorkflowService } from '../domain/workflowService';

export function createRouter(workflowService: WorkflowService): Router {
  const router = Router();

  // GET /v1/workflows/runs/:run_id (placed before /v1/workflows/:id)
  router.get('/v1/workflows/runs/:run_id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const run = await workflowService.getRun(req.params.run_id);
      res.status(200).json({ run });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/workflows
  router.get('/v1/workflows', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project_id = req.query.project_id as string | undefined;
      const cursor = req.query.cursor as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const result = await workflowService.listWorkflows({ project_id, cursor, limit });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/workflows/:id
  router.get('/v1/workflows/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflow = await workflowService.getWorkflow(req.params.id);
      res.status(200).json({ workflow });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/workflows
  router.post('/v1/workflows', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { project_id, name, description, nodes, edges } = req.body;
      const workflow = await workflowService.createWorkflow({
        project_id,
        name,
        description,
        nodes,
        edges,
      });
      res.status(201).json({ workflow });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /v1/workflows/:id
  router.patch('/v1/workflows/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, nodes, edges } = req.body;
      const workflow = await workflowService.updateWorkflow(req.params.id, {
        name,
        description,
        nodes,
        edges,
      });
      res.status(200).json({ workflow });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/workflows/:id/run (Async execution - returns 202 Accepted)
  router.post('/v1/workflows/:id/run', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id, inputs } = req.body;
      const run = await workflowService.startRun(req.params.id, { user_id, inputs });
      res.status(202).json({
        run_id: run.run_id,
        status: run.status,
        message: 'Workflow run accepted and queued for execution',
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
