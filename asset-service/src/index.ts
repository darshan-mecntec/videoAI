import { createApp } from './app';
import { config } from './config';

const { app, assetService } = createApp();

assetService.seedStarterAssets()
  .then(() => console.log('[asset-service] Starter media assets seeded successfully.'))
  .catch((err) => console.error('[asset-service] Error seeding starter media assets:', err));

app.listen(config.port, () => {
  console.log(`[asset-service] Running on port ${config.port} (${config.nodeEnv})`);
});
