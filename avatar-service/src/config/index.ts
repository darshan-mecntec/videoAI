export interface Config {
  port: number;
  nodeEnv: string;
  databaseUrl?: string;
  authServiceUrl: string;
  providerRegistryUrl: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3014', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  authServiceUrl: process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:3008',
  providerRegistryUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
};
