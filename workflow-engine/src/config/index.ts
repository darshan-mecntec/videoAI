export interface Config {
  port: number;
  nodeEnv: string;
  routingEngineUrl: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  routingEngineUrl: process.env.ROUTING_ENGINE_URL || 'http://localhost:3001',
};
