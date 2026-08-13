import express, { Express } from 'express';
import cors from 'cors';
import { requestIdMiddleware, errorHandlerMiddleware } from './api/middleware';
import { createRouter } from './api/routes';
import { TemplateService } from './domain/templateService';
import { TemplateRepository, InMemoryTemplateRepository } from './infra/repository';

export interface AppDependencies {
  repo?: TemplateRepository;
  templateService?: TemplateService;
}

export function createApp(deps: AppDependencies = {}): {
  app: Express;
  templateService: TemplateService;
} {
  const repo = deps.repo || new InMemoryTemplateRepository();
  const templateService = deps.templateService || new TemplateService(repo);

  const app = express();

  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(requestIdMiddleware);

  const router = createRouter(templateService);
  app.use('/', router);

  app.use(errorHandlerMiddleware);

  return { app, templateService };
}
