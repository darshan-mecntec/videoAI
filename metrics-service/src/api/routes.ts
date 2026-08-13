import { Router, Request, Response, NextFunction } from 'express';
import { MetricsService } from '../domain/metricsService';

export function createRouter(metricsService: MetricsService): Router {
  const router = Router();

  // GET /v1/metrics/aggregate
  router.get('/v1/metrics/aggregate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await metricsService.getAggregateMetrics();
      res.status(200).json({ metrics });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
