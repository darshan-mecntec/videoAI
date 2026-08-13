import express, { Express } from 'express';
import cors from 'cors';
import { requestIdMiddleware, errorHandlerMiddleware } from './api/middleware';
import { createRouter } from './api/routes';
import { NodeRegistryService } from './domain/nodeRegistry';
import { GraphValidatorService } from './domain/graphValidator';
import { NodeRepository, InMemoryNodeRepository } from './infra/repository';

export interface AppDependencies {
  repo?: NodeRepository;
  nodeRegistry?: NodeRegistryService;
  graphValidator?: GraphValidatorService;
}

export function createApp(deps: AppDependencies = {}): {
  app: Express;
  repo: NodeRepository;
  nodeRegistry: NodeRegistryService;
  graphValidator: GraphValidatorService;
} {
  const repo = deps.repo || new InMemoryNodeRepository();
  const nodeRegistry = deps.nodeRegistry || new NodeRegistryService(repo);
  const graphValidator = deps.graphValidator || new GraphValidatorService(nodeRegistry);

  const app = express();
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));
  app.use(express.json());
  app.use(requestIdMiddleware);

  const router = createRouter(nodeRegistry, graphValidator);
  app.use('/', router);

  app.use(errorHandlerMiddleware);

  return {
    app,
    repo,
    nodeRegistry,
    graphValidator,
  };
}
