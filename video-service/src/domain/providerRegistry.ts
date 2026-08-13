// ─────────────────────────────────────────────────────────────────────────────
// Provider Registry
// Registers all available adapters and resolves the best one for a request.
// Integrates with routing-engine for intelligent multi-factor selection.
// ─────────────────────────────────────────────────────────────────────────────

import { VideoProvider } from './providers/VideoProvider';
import { RunwayAdapter } from './providers/RunwayAdapter';
import { PikaAdapter } from './providers/PikaAdapter';
import { LumaAdapter } from './providers/LumaAdapter';
import { OpenAIVideoAdapter } from './providers/OpenAIVideoAdapter';
import { GoogleVeoAdapter } from './providers/GoogleVeoAdapter';
import { KlingAdapter } from './providers/KlingAdapter';
import { WAN26Adapter } from './providers/WAN26Adapter';
import { VideoGenerationRequest, VideoProviderName, AppError } from './types';

export class ProviderRegistry {
  private providers: Map<VideoProviderName, VideoProvider>;

  constructor() {
    this.providers = new Map<VideoProviderName, VideoProvider>([
      ['runway',     new RunwayAdapter()],
      ['pika',       new PikaAdapter()],
      ['luma',       new LumaAdapter()],
      ['openai',     new OpenAIVideoAdapter()],
      ['google_veo', new GoogleVeoAdapter()],
      ['kling',      new KlingAdapter()],
      ['wan_2_6',    new WAN26Adapter()],
    ] as Array<[VideoProviderName, VideoProvider]>);
  }

  /**
   * Returns all registered providers that have API keys configured.
   * Only configured providers are visible to users and the routing engine.
   */
  getConfiguredProviders(): VideoProvider[] {
    return Array.from(this.providers.values()).filter(p => p.isConfigured());
  }

  /**
   * Returns all providers (configured or not) — for the /providers endpoint.
   */
  getAllProviders(): VideoProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Resolves the best provider for a request.
   * Priority: preferred_provider (if set & configured) → routing-engine → first available.
   */
  async resolveProvider(request: VideoGenerationRequest): Promise<VideoProvider> {
    // If caller specified a preferred provider
    if (request.preferred_provider) {
      const preferred = this.providers.get(request.preferred_provider);
      if (preferred && preferred.isConfigured() && preferred.supportsStage(request.stage)) {
        return preferred;
      }
      throw new AppError(
        503,
        'PROVIDER_NOT_CONFIGURED',
        `Preferred provider '${request.preferred_provider}' is not configured or does not support stage '${request.stage}'. Add its API key to .env.`
      );
    }

    // Try routing engine for intelligent selection
    try {
      const routingUrl = process.env.ROUTING_ENGINE_URL || 'http://localhost:3003';
      const configuredIds = this.getConfiguredProviders()
        .filter(p => p.supportsStage(request.stage))
        .map(p => p.id);

      if (configuredIds.length === 0) {
        throw new AppError(
          503,
          'NO_PROVIDERS_CONFIGURED',
          `No video providers are configured for stage '${request.stage}'. Add at least one API key (RUNWAY_API_KEY, PIKA_API_KEY, LUMA_API_KEY, OPENAI_API_KEY, or GOOGLE_VEO_API_KEY) to your .env file.`
        );
      }

      const response = await fetch(`${routingUrl}/v1/routes/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capability: `video:${request.stage}`,
          candidates: configuredIds,
        }),
      });

      if (response.ok) {
        const data = await response.json() as { selected_provider?: string };
        if (data.selected_provider) {
          const routed = this.providers.get(data.selected_provider as VideoProviderName);
          if (routed && routed.isConfigured()) return routed;
        }
      }
    } catch {
      // Routing engine unavailable — fall through to first available
    }

    // Fallback: first configured provider that supports the stage
    const available = this.getConfiguredProviders().find(p => p.supportsStage(request.stage));
    if (!available) {
      throw new AppError(
        503,
        'NO_PROVIDERS_CONFIGURED',
        `No video providers are configured for stage '${request.stage}'. Add at least one API key to your .env file.`
      );
    }
    return available;
  }

  getProvider(id: VideoProviderName): VideoProvider | undefined {
    return this.providers.get(id);
  }
}
