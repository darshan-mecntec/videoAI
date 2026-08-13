import express, { Express } from 'express';
import cors from 'cors';
import { errorHandlerMiddleware } from './api/middleware';
import { createRouter } from './api/routes';
import { AvatarService } from './domain/avatarService';
import { AvatarRepository } from './infra/repository';
import { JsonFileAvatarRepository } from './infra/jsonFileAvatarRepository';
import { PostgresAvatarRepository } from './infra/postgresAvatarRepository';

export interface AppDependencies {
  repo?: AvatarRepository;
  avatarService?: AvatarService;
}

export function createApp(deps: AppDependencies = {}): {
  app: Express;
  repo: AvatarRepository;
  avatarService: AvatarService;
} {
  const dbUrl = process.env.DATABASE_URL;
  const repo = deps.repo || (dbUrl ? new PostgresAvatarRepository(dbUrl) : new JsonFileAvatarRepository());
  const avatarService = deps.avatarService || new AvatarService(repo);

  const app = express();
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));
  app.use(express.json());

  const router = createRouter(avatarService);
  app.use('/', router);

  app.use(errorHandlerMiddleware);

  return {
    app,
    repo,
    avatarService,
  };
}
