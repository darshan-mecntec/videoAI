import 'dotenv/config';
import { createApp } from './app';
import { config } from './config';

const { app } = createApp();

app.listen(config.port, () => {
  console.log(`[video-editor-service] Running on port ${config.port} (${config.nodeEnv})`);
  console.log(`[video-editor-service] 5-track Timeline Engine, FFmpeg Renderer & Export Presets active`);
});
