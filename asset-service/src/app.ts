import express, { Express } from 'express';
import cors from 'cors';
import { requestIdMiddleware, errorHandlerMiddleware } from './api/middleware';
import { createRouter } from './api/routes';
import { AssetService } from './domain/assetService';
import { AssetRepository, InMemoryAssetRepository } from './infra/repository';
import { PostgresAssetRepository } from './infra/postgresAssetRepository';

export interface AppDependencies {
  repo?: AssetRepository;
  assetService?: AssetService;
}

export function createApp(deps: AppDependencies = {}): {
  app: Express;
  repo: AssetRepository;
  assetService: AssetService;
} {
  const dbUrl = process.env.DATABASE_URL;
  const repo = deps.repo || (dbUrl ? new PostgresAssetRepository(dbUrl) : new InMemoryAssetRepository());
  const assetService = deps.assetService || new AssetService(repo);

  const app = express();
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));
  app.use(express.json());
  app.use(requestIdMiddleware);

  const router = createRouter(assetService);
  app.use('/', router);

  app.use(errorHandlerMiddleware);

  return {
    app,
    repo,
    assetService,
  };
}
