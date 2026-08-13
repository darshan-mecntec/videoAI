export interface Config {
  port: number;
  nodeEnv: string;
  redisUrl: string;
  providerRegistryUrl: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  providerRegistryUrl: process.env.PROVIDER_REGISTRY_URL || 'http://localhost:3001',
};
