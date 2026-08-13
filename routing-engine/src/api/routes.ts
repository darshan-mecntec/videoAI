import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RoutingService } from '../domain/routingService';

export function createRouter(routingService: RoutingService): Router {
  const router = Router();

  // POST /v1/routing/route
  router.post('/v1/routing/route', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        request_id,
        capability_type,
        region,
        org_id,
        strategy_preference,
        max_cost_usd,
        required_params,
      } = req.body;

      const decision = await routingService.selectRoute({
        request_id: request_id || uuidv4(),
        capability_type,
        region,
        org_id,
        strategy_preference,
        max_cost_usd,
        required_params,
      });

      res.status(200).json(decision);
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/routing/policies/:org_id
  router.get('/v1/routing/policies/:org_id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const policy = await routingService.getOrgPolicy(req.params.org_id);
      res.status(200).json({ policy });
    } catch (err) {
      next(err);
    }
  });

  // PUT /v1/routing/policies/:org_id
  router.put('/v1/routing/policies/:org_id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { default_strategy, max_budget_per_request_usd, blacklisted_provider_ids } = req.body;
      const policy = await routingService.setOrgPolicy(req.params.org_id, {
        default_strategy: default_strategy || 'balanced',
        max_budget_per_request_usd: max_budget_per_request_usd !== undefined ? max_budget_per_request_usd : null,
        blacklisted_provider_ids: blacklisted_provider_ids || [],
      });
      res.status(200).json({ policy });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/routing/feedback
  router.post('/v1/routing/feedback', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { call_id, provider_id, capability_type, success, latency_ms, cost_usd, error_code, attempt_number } =
        req.body;

      await routingService.recordExecutionFeedback({
        call_id,
        provider_id,
        capability_type,
        success,
        latency_ms,
        cost_usd,
        error_code,
        attempt_number,
      });

      res.status(200).json({ status: 'acknowledged' });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
