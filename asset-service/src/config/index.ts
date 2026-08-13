export interface Config {
  port: number;
  nodeEnv: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3006', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
};
