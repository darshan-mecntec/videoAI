import express, { Express } from 'express';
import cors from 'cors';
import { requestIdMiddleware, errorHandlerMiddleware } from './api/middleware';
import { createRouter } from './api/routes';
import { ProjectService } from './domain/projectService';
import { ProjectRepository, InMemoryProjectRepository } from './infra/repository';
import { PostgresProjectRepository } from './infra/postgresProjectRepository';

export interface AppDependencies {
  repo?: ProjectRepository;
  projectService?: ProjectService;
}

export function createApp(deps: AppDependencies = {}): {
  app: Express;
  repo: ProjectRepository;
  projectService: ProjectService;
} {
  const dbUrl = process.env.DATABASE_URL;
  const repo = deps.repo || (dbUrl ? new PostgresProjectRepository(dbUrl) : new InMemoryProjectRepository());
  const projectService = deps.projectService || new ProjectService(repo);

  const app = express();
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));
  app.use(express.json());
  app.use(requestIdMiddleware);

  const router = createRouter(projectService);
  app.use('/', router);

  app.use(errorHandlerMiddleware);

  return {
    app,
    repo,
    projectService,
  };
}
