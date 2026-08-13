import { createApp } from './app';
import { config } from './config';

const { app, templateService } = createApp();

templateService.seedStarterTemplates()
  .then(() => console.log('[template-engine] Starter templates seeded successfully.'))
  .catch((err) => console.error('[template-engine] Error seeding starter templates:', err));

app.listen(config.port, () => {
  console.log(`[template-engine] Running on port ${config.port} (${config.nodeEnv})`);
});
