import express, { Express } from 'express';
import cors from 'cors';
import { requestIdMiddleware, errorHandlerMiddleware } from './api/middleware';
import { createRouter } from './api/routes';
import { ExecutionService } from './domain/executionService';

export interface AppDependencies {
  executionService?: ExecutionService;
}

export function createApp(deps: AppDependencies = {}): {
  app: Express;
  executionService: ExecutionService;
} {
  const executionService = deps.executionService || new ExecutionService();

  const app = express();
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));
  app.use(express.json());
  app.use(requestIdMiddleware);

  const router = createRouter(executionService);
  app.use('/', router);

  app.use(errorHandlerMiddleware);

  return {
    app,
    executionService,
  };
}
