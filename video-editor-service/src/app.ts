import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import { requestIdMiddleware, errorHandlerMiddleware } from './api/middleware';
import { createRouter } from './api/routes';
import { TimelineService } from './domain/timelineService';
import { RenderService } from './domain/renderService';
import { EditorRepository, InMemoryEditorRepository } from './infra/repository';

export interface AppDependencies {
  repo?: EditorRepository;
  timelineService?: TimelineService;
  renderService?: RenderService;
}

export function createApp(deps: AppDependencies = {}): {
  app: Express;
  timelineService: TimelineService;
  renderService: RenderService;
} {
  const repo = deps.repo || new InMemoryEditorRepository();
  const timelineService = deps.timelineService || new TimelineService(repo);
  const renderService = deps.renderService || new RenderService(repo);

  const app = express();

  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(requestIdMiddleware);

  // Serve static uploads
  const uploadsPath = path.resolve(process.env.STORAGE_LOCAL_PATH || './uploads');
  app.use('/uploads', express.static(uploadsPath));

  const router = createRouter(timelineService, renderService);
  app.use('/', router);

  app.use(errorHandlerMiddleware);

  return { app, timelineService, renderService };
}
