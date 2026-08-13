export const config = {
  port: parseInt(process.env.PORT || '3011', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  routingEngineUrl: process.env.ROUTING_ENGINE_URL || 'http://localhost:3003',
  assetServiceUrl: process.env.ASSET_SERVICE_URL || 'http://localhost:3006',
  storage: {
    driver: (process.env.STORAGE_DRIVER || 'local') as 'local' | 's3' | 'r2',
    localPath: process.env.STORAGE_LOCAL_PATH || './uploads',
    bucketUrl: process.env.STORAGE_BUCKET_URL || '',
    accessKey: process.env.STORAGE_ACCESS_KEY || '',
    secretKey: process.env.STORAGE_SECRET_KEY || '',
    region: process.env.STORAGE_REGION || '',
  },
};
