import express, { Express } from 'express';
import cors from 'cors';
import { requestIdMiddleware, errorHandlerMiddleware } from './api/middleware';
import { createRouter } from './api/routes';
import { VideoService } from './domain/videoService';
import { ProviderRegistry } from './domain/providerRegistry';
import { VideoJobRepository, InMemoryVideoJobRepository } from './infra/repository';

export interface AppDependencies {
  repo?: VideoJobRepository;
  registry?: ProviderRegistry;
  videoService?: VideoService;
}

export function createApp(deps: AppDependencies = {}): {
  app: Express;
  videoService: VideoService;
  registry: ProviderRegistry;
} {
  const registry = deps.registry || new ProviderRegistry();
  const repo = deps.repo || new InMemoryVideoJobRepository();
  const videoService = deps.videoService || new VideoService(registry, repo);

  const app = express();

  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(requestIdMiddleware);

  const router = createRouter(videoService);
  app.use('/', router);

  app.use(errorHandlerMiddleware);

  return { app, videoService, registry };
}
