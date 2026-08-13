import 'dotenv/config';
import { createApp } from './app';
import { config } from './config';

const { app } = createApp();

app.listen(config.port, () => {
  console.log(`[video-template-service] Running on port ${config.port} (${config.nodeEnv})`);
  console.log(`[video-template-service] Dynamic Video Template Engine & Form Schema Builder active`);
});
