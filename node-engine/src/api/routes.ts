import { Router, Request, Response, NextFunction } from 'express';
import { NodeRegistryService } from '../domain/nodeRegistry';
import { GraphValidatorService } from '../domain/graphValidator';

export function createRouter(
  nodeRegistry: NodeRegistryService,
  graphValidator: GraphValidatorService
): Router {
  const router = Router();

  // POST /v1/nodes/validate-graph (placed before /v1/nodes/:type)
  router.post('/v1/nodes/validate-graph', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await graphValidator.validateGraph(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/nodes
  router.get('/v1/nodes', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = req.query.category as string | undefined;
      const nodes = await nodeRegistry.listNodes({ category });
      res.status(200).json({ nodes });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/nodes/:type
  router.get('/v1/nodes/:type', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const node = await nodeRegistry.getNodeByType(req.params.type);
      res.status(200).json({ node });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/nodes
  router.post('/v1/nodes', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const node = await nodeRegistry.registerNode(req.body);
      res.status(201).json({ node });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
