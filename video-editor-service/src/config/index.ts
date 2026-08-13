export const config = {
  port: parseInt(process.env.PORT || '3012', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  storage: {
    driver: (process.env.STORAGE_DRIVER || 'local') as 'local' | 's3' | 'r2',
    localPath: process.env.STORAGE_LOCAL_PATH || './uploads',
  },
};
