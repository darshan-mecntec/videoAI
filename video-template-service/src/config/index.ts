export const config = {
  port: parseInt(process.env.PORT || '3013', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  videoServiceUrl: process.env.VIDEO_SERVICE_URL || 'http://localhost:3011',
};
