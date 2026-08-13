import { createApp } from './app';
import { config } from './config';

const { app, avatarService } = createApp();

// Seed system default avatars & voices if database is clean
avatarService.ensureSystemDefaults()
  .then(() => console.log('[avatar-service] System default avatars and voices verified.'))
  .catch((err) => console.error('[avatar-service] Error seeding system defaults:', err));

app.listen(config.port, () => {
  console.log(`[avatar-service] Running on port ${config.port} (${config.nodeEnv})`);
});
