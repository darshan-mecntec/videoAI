export interface Config {
  port: number;
  nodeEnv: string;
  workflowEngineUrl: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  workflowEngineUrl: process.env.WORKFLOW_ENGINE_URL || 'http://localhost:3002',
};
