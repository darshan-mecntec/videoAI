import express, { Express } from 'express';
import cors from 'cors';
import { requestIdMiddleware, errorHandlerMiddleware } from './api/middleware';
import { createRouter } from './api/routes';
import { ProviderService } from './domain/providerService';
import { CapabilityService } from './domain/capabilityService';
import { HealthService } from './domain/healthService';
import { ProviderRepository, CacheService, InMemoryProviderRepository, InMemoryCacheService, PostgresProviderRepository, RedisCacheService } from './infra/repository';
import { EventPublisher, InMemoryEventBus } from './events/publisher';
import { NatsEventPublisher } from './events/natsPublisher';
import { seedDefaultProviders } from './domain/seedData';
import { config } from './config';
import { Pool } from 'pg';

export interface AppDependencies {
  repo?: ProviderRepository;
  cache?: CacheService;
  eventPublisher?: EventPublisher;
}

export function createApp(deps: AppDependencies = {}): {
  app: Express;
  repo: ProviderRepository;
  cache: CacheService;
  eventPublisher: EventPublisher;
  providerService: ProviderService;
  capabilityService: CapabilityService;
  healthService: HealthService;
} {
  let repo: ProviderRepository;
  let cache: CacheService;
  let eventPublisher: EventPublisher;

  if (deps.repo) {
    repo = deps.repo;
  } else if (config.useProductionServices) {
    const pool = new Pool({ connectionString: config.pgConnectionString });
    repo = new PostgresProviderRepository(pool);
  } else {
    repo = new InMemoryProviderRepository();
  }

  if (deps.cache) {
    cache = deps.cache;
  } else if (config.useProductionServices) {
    cache = new RedisCacheService(config.redisUrl);
  } else {
    cache = new InMemoryCacheService();
  }

  if (deps.eventPublisher) {
    eventPublisher = deps.eventPublisher;
  } else if (config.useProductionServices) {
    eventPublisher = new NatsEventPublisher(config.natsUrl, config.natsSubjectPrefix);
  } else {
    eventPublisher = new InMemoryEventBus();
  }

  const providerService = new ProviderService(repo, cache, eventPublisher);
  const capabilityService = new CapabilityService(repo, cache, eventPublisher);
  const healthService = new HealthService(repo, cache);


  const app = express();
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*', // Allow all origins in development
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));
  app.use(express.json());
  app.use(requestIdMiddleware);

  const router = createRouter(providerService, capabilityService, healthService);
  app.use('/', router);

  app.use(errorHandlerMiddleware);

  return {
    app,
    repo,
    cache,
    eventPublisher,
    providerService,
    capabilityService,
    healthService,
  };
}
