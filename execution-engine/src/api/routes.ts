import { Router, Request, Response, NextFunction } from 'express';
import { ExecutionService } from '../domain/executionService';

export function createRouter(executionService: ExecutionService): Router {
  const router = Router();

  // POST /v1/execution/dispatch
  router.post('/v1/execution/dispatch', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await executionService.dispatchExecution(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
