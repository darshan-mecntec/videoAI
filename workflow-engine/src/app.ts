import express, { Express } from 'express';
import cors from 'cors';
import { requestIdMiddleware, errorHandlerMiddleware } from './api/middleware';
import { createRouter } from './api/routes';
import { WorkflowService } from './domain/workflowService';
import { DagCompiler } from './domain/dagCompiler';
import { WorkflowRepository, InMemoryWorkflowRepository } from './infra/repository';
import { RoutingEngineClient, MockRoutingEngineClient, HttpRoutingEngineClient } from './infra/routingClient';
import { EventPublisher, InMemoryEventBus } from './events/publisher';

export interface AppDependencies {
  repo?: WorkflowRepository;
  dagCompiler?: DagCompiler;
  routingClient?: RoutingEngineClient;
  eventPublisher?: EventPublisher;
}

export function createApp(deps: AppDependencies = {}): {
  app: Express;
  repo: WorkflowRepository;
  dagCompiler: DagCompiler;
  routingClient: RoutingEngineClient;
  eventPublisher: EventPublisher;
  workflowService: WorkflowService;
} {
  const repo = deps.repo || new InMemoryWorkflowRepository();
  const dagCompiler = deps.dagCompiler || new DagCompiler();
  const routingClient = deps.routingClient || new HttpRoutingEngineClient();
  const eventPublisher = deps.eventPublisher || new InMemoryEventBus();

  const workflowService = new WorkflowService(repo, dagCompiler, routingClient, eventPublisher);

  const app = express();
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));
  app.use(express.json());
  app.use(requestIdMiddleware);

  const router = createRouter(workflowService);
  app.use('/', router);

  app.use(errorHandlerMiddleware);

  return {
    app,
    repo,
    dagCompiler,
    routingClient,
    eventPublisher,
    workflowService,
  };
}
