import { createApp } from './app';
import { config } from './config';

const { app, nodeRegistry } = createApp();

nodeRegistry.seedDefaultNodes()
  .then(() => console.log('[node-engine] Default node catalog seeded successfully.'))
  .catch((err) => console.error('[node-engine] Error seeding default node catalog:', err));

app.listen(config.port, () => {
  console.log(`[node-engine] Running on port ${config.port} (${config.nodeEnv})`);
});
