import express, { Express } from 'express';
import cors from 'cors';
import { requestIdMiddleware, errorHandlerMiddleware } from './api/middleware';
import { createRouter } from './api/routes';
import { RoutingService } from './domain/routingService';
import { CandidateScorer } from './domain/scorer';
import { PolicyEngine } from './domain/policyEngine';
import { ProviderRegistryClient, MockProviderRegistryClient, HttpProviderRegistryClient } from './infra/registryClient';
import { CacheService, InMemoryCacheService } from './infra/cache';
import { EventPublisher, InMemoryEventBus } from './events/publisher';

export interface AppDependencies {
  registryClient?: ProviderRegistryClient;
  scorer?: CandidateScorer;
  policyEngine?: PolicyEngine;
  cache?: CacheService;
  eventPublisher?: EventPublisher;
}

export function createApp(deps: AppDependencies = {}): {
  app: Express;
  registryClient: ProviderRegistryClient;
  scorer: CandidateScorer;
  policyEngine: PolicyEngine;
  cache: CacheService;
  eventPublisher: EventPublisher;
  routingService: RoutingService;
} {
  const registryClient = deps.registryClient || new HttpProviderRegistryClient();
  const scorer = deps.scorer || new CandidateScorer();
  const policyEngine = deps.policyEngine || new PolicyEngine();
  const cache = deps.cache || new InMemoryCacheService();
  const eventPublisher = deps.eventPublisher || new InMemoryEventBus();

  const routingService = new RoutingService(registryClient, scorer, policyEngine, cache, eventPublisher);

  const app = express();
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));
  app.use(express.json());
  app.use(requestIdMiddleware);

  const router = createRouter(routingService);
  app.use('/', router);

  app.use(errorHandlerMiddleware);

  return {
    app,
    registryClient,
    scorer,
    policyEngine,
    cache,
    eventPublisher,
    routingService,
  };
}
