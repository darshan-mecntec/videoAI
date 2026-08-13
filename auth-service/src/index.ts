import { createApp } from './app';
import { config } from './config';

const { app, repo, authService } = createApp();

repo.listAllUsers().then((users) => {
  console.log(`[auth-service] Persistent store initialized with ${users.length} user account(s) (admin@aether.ai / user@aether.ai ready).`);
});

// Periodic background sweeper: clears stale credit reservations every 5 minutes
setInterval(() => {
  authService.sweepStaleReservations().catch(() => {});
}, 5 * 60 * 1000);

app.listen(config.port, () => {
  console.log(`[auth-service] Running on port ${config.port} (${config.nodeEnv})`);
});
