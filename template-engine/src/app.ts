import express, { Express } from 'express';
import cors from 'cors';
import { requestIdMiddleware, errorHandlerMiddleware } from './api/middleware';
import { createRouter } from './api/routes';
import { TemplateService } from './domain/templateService';
import { PromptService } from './domain/promptService';
import { TemplateRepository, InMemoryTemplateRepository } from './infra/repository';
import { WorkflowEngineClient, HttpWorkflowEngineClient } from './infra/workflowClient';

export interface AppDependencies {
  repo?: TemplateRepository;
  workflowClient?: WorkflowEngineClient;
  templateService?: TemplateService;
  promptService?: PromptService;
}

export function createApp(deps: AppDependencies = {}): {
  app: Express;
  repo: TemplateRepository;
  workflowClient: WorkflowEngineClient;
  templateService: TemplateService;
  promptService: PromptService;
} {
  const repo = deps.repo || new InMemoryTemplateRepository();
  const workflowClient = deps.workflowClient || new HttpWorkflowEngineClient();

  const templateService = deps.templateService || new TemplateService(repo, workflowClient);
  const promptService = deps.promptService || new PromptService();

  const app = express();
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));
  app.use(express.json());
  app.use(requestIdMiddleware);

  const router = createRouter(templateService, promptService);
  app.use('/', router);

  app.use(errorHandlerMiddleware);

  return {
    app,
    repo,
    workflowClient,
    templateService,
    promptService,
  };
}
