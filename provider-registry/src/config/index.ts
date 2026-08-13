export interface Config {
  port: number;
  nodeEnv: string;
  redisUrl: string;
  pgConnectionString: string;
  natsUrl: string;
  natsSubjectPrefix: string;
  useProductionServices: boolean;
  // Development API keys (for testing without secrets manager)
  devApiKeys?: Record<string, string>;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  pgConnectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/provider_registry',
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  natsSubjectPrefix: process.env.NATS_SUBJECT_PREFIX || 'provider',
  useProductionServices: process.env.USE_PRODUCTION_SERVICES === 'true',
  devApiKeys: {
    openai: process.env.OPENAI_API_KEY || '',
    stability: process.env.STABILITY_API_KEY || '',
    // Add more provider API keys as needed
  }
};
