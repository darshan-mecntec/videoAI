import { createApp } from './app';
import { config } from './config';

const { app, projectService } = createApp();

projectService.seedStarterProjects()
  .then(() => console.log('[project-service] Starter projects seeded successfully.'))
  .catch((err) => console.error('[project-service] Error seeding starter projects:', err));

app.listen(config.port, () => {
  console.log(`[project-service] Running on port ${config.port} (${config.nodeEnv})`);
});
