import { createApp } from './app';
import { config } from './config';

const { app, repo } = createApp();

repo.listAllUsers().then((users) => {
  if (users.length === 0) {
    console.log('[auth-service] System initialized cleanly. Zero pre-seeded users. First user signup will become Super Admin.');
  } else {
    console.log(`[auth-service] Persistent store loaded with ${users.length} registered user account(s).`);
  }
});

app.listen(config.port, () => {
  console.log(`[auth-service] Running on port ${config.port} (${config.nodeEnv})`);
});
