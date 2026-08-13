import express, { Express } from 'express';
import cors from 'cors';
import { requestIdMiddleware, errorHandlerMiddleware } from './api/middleware';
import { createRouter } from './api/routes';
import { AuthService } from './domain/authService';
import { AuthRepository } from './infra/repository';
import { JsonFileAuthRepository } from './infra/jsonFileRepository';
import { PostgresAuthRepository } from './infra/postgresAuthRepository';

export interface AppDependencies {
  repo?: AuthRepository;
  authService?: AuthService;
}

export function createApp(deps: AppDependencies = {}): {
  app: Express;
  repo: AuthRepository;
  authService: AuthService;
} {
  const dbUrl = process.env.DATABASE_URL;
  const repo = deps.repo || (dbUrl ? new PostgresAuthRepository(dbUrl) : new JsonFileAuthRepository());
  const authService = deps.authService || new AuthService(repo);

  authService.seedDefaultAuth().catch((err) => {
    console.warn('[auth-service] Warning seeding default auth accounts:', err.message || err);
  });

  const app = express();
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));
  app.use(express.json());
  app.use(requestIdMiddleware);

  const router = createRouter(authService);
  app.use('/', router);

  app.use(errorHandlerMiddleware);

  return {
    app,
    repo,
    authService,
  };
}
