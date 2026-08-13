import 'dotenv/config';
import { createApp } from './app';
import { config } from './config/index';

const { app, registry } = createApp();

// Log provider configuration status on startup
const providers = registry.getAllProviders().map(p => p.getCapabilityInfo());
const configured = providers.filter(p => p.is_configured);
const unconfigured = providers.filter(p => !p.is_configured);

app.listen(config.port, () => {
  console.log(`[video-service] Running on port ${config.port} (${config.nodeEnv})`);
  console.log(`[video-service] ${configured.length}/${providers.length} providers configured:`);
  configured.forEach(p => console.log(`  ✓ ${p.display_name}`));
  if (unconfigured.length > 0) {
    console.log(`[video-service] ${unconfigured.length} provider(s) not configured (add API keys to .env):`);
    unconfigured.forEach(p => console.log(`  ✗ ${p.display_name} — needs ${p.provider.toUpperCase()}_API_KEY`));
  }
  if (configured.length === 0) {
    console.warn('[video-service] ⚠ WARNING: No providers configured. Video generation will return 503 until at least one API key is added.');
  }
});
