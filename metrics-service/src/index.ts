import { createApp } from './app';
import { config } from './config';

const { app } = createApp();

app.listen(config.port, () => {
  console.log(`[metrics-service] Running on port ${config.port} (${config.nodeEnv})`);
});
