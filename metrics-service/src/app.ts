import express, { Express } from 'express';
import cors from 'cors';
import { requestIdMiddleware, errorHandlerMiddleware } from './api/middleware';
import { createRouter } from './api/routes';
import { MetricsService } from './domain/metricsService';

export interface AppDependencies {
  metricsService?: MetricsService;
}

export function createApp(deps: AppDependencies = {}): {
  app: Express;
  metricsService: MetricsService;
} {
  const metricsService = deps.metricsService || new MetricsService();

  const app = express();
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));
  app.use(express.json());
  app.use(requestIdMiddleware);

  const router = createRouter(metricsService);
  app.use('/', router);

  app.use(errorHandlerMiddleware);

  return {
    app,
    metricsService,
  };
}
