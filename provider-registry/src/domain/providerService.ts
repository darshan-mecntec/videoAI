import { v4 as uuidv4 } from 'uuid';
import { Provider, Capability, PricingEntry, RateLimit, CredentialRef, AppError, ProviderStatus } from './types';
import { ProviderRepository, CacheService } from '../infra/repository';
import { EventPublisher } from '../events/publisher';
import { CapabilityDiscoveryService } from './capabilityDiscovery';

export interface RegisterProviderInput {
  slug: string;
  display_name: string;
  region_codes?: string[];
  org_id?: string | null;
  secret_key: string;
  api_key?: string;
  environment?: 'production' | 'staging';
}

export class ProviderService {
  private discoveryService: CapabilityDiscoveryService;

  constructor(
    private repo: ProviderRepository,
    private cache: CacheService,
    private eventPublisher: EventPublisher
  ) {
    this.discoveryService = new CapabilityDiscoveryService(repo);
  }

  async registerProvider(input: RegisterProviderInput): Promise<{ provider: Provider; credentialRef: CredentialRef }> {
    console.log('Register provider input:', input); // Debug log
    
    if (!input.slug || !input.display_name) {
      throw new AppError(400, 'INVALID_INPUT', 'Missing required fields: slug, display_name');
    }
    
    // For development, either secret_key (vault path) or api_key (direct key) is required
    if (!input.secret_key && !input.api_key) {
      throw new AppError(400, 'INVALID_INPUT', 'Either secret_key (vault path) or api_key (for development) is required');
    }

    const existing = await this.repo.findProviderBySlug(input.slug);
    if (existing) {
      throw new AppError(409, 'PROVIDER_ALREADY_EXISTS', `Provider with slug '${input.slug}' already exists`);
    }

    const providerId = uuidv4();
    const provider = await this.repo.createProvider({
      id: providerId,
      slug: input.slug,
      display_name: input.display_name,
      status: 'active',
      region_codes: input.region_codes || ['global'],
      org_id: input.org_id || null,
    });

    const credentialRef = await this.repo.createCredentialRef({
      id: uuidv4(),
      provider_id: providerId,
      secret_key: input.secret_key,
      api_key: input.api_key,
      environment: input.environment || 'production',
    });

    // 1. Automatically create initial Health Record
    await this.repo.createHealthRecord({
      id: uuidv4(),
      provider_id: providerId,
      checked_at: new Date().toISOString(),
      latency_ms: 120,
      status: 'healthy',
      error_message: null,
      availability_7d: 1.0,
    });

    // 2. Automatically populate initial capabilities based on slug/name
    const slugLower = input.slug.toLowerCase();
    const nameLower = input.display_name.toLowerCase();

    if (slugLower.includes('openai') || nameLower.includes('openai')) {
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'text-to-image',
        model_id: 'dall-e-3',
        max_resolution: '1024x1024',
        supported_params: { quality: ['standard', 'hd'], style: ['vivid', 'natural'] },
        quality_score: 0.96,
        pricing_model: 'per-image',
      });
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'image-to-image',
        model_id: 'dall-e-2',
        max_resolution: '1024x1024',
        supported_params: { size: '1024x1024' },
        quality_score: 0.88,
        pricing_model: 'per-image',
      });
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'text-to-video',
        model_id: 'sora-v1',
        max_resolution: '1080p',
        supported_params: { duration_sec: 10, fps: 30 },
        quality_score: 0.95,
        pricing_model: 'per-second',
      });
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'text-to-audio',
        model_id: 'tts-1-hd',
        max_resolution: null,
        supported_params: { voice: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] },
        quality_score: 0.94,
        pricing_model: 'per-second',
      });
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'voice-clone',
        model_id: 'whisper-voice-v1',
        max_resolution: null,
        supported_params: { sample_rate: 44100 },
        quality_score: 0.91,
        pricing_model: 'per-call',
      });
    } else if (slugLower.includes('stability') || nameLower.includes('stability')) {
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'text-to-image',
        model_id: 'sdxl-1.0',
        max_resolution: '1024x1024',
        supported_params: { steps: 30, cfg_scale: 7 },
        quality_score: 0.92,
        pricing_model: 'per-image',
      });
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'inpainting',
        model_id: 'sdxl-inpainting-v1',
        max_resolution: '1024x1024',
        supported_params: { mask_blur: 4 },
        quality_score: 0.89,
        pricing_model: 'per-image',
      });
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'upscale',
        model_id: 'esrgan-v4-upscaler',
        max_resolution: '4096x4096',
        supported_params: { scale: 4 },
        quality_score: 0.91,
        pricing_model: 'per-image',
      });
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'text-to-video',
        model_id: 'stable-video-diffusion',
        max_resolution: '1080p',
        supported_params: { motion_bucket_id: 127 },
        quality_score: 0.90,
        pricing_model: 'per-second',
      });
    } else if (slugLower.includes('runway') || nameLower.includes('runway')) {
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'text-to-video',
        model_id: 'gen-2',
        max_resolution: '1080p',
        supported_params: { duration_sec: 4 },
        quality_score: 0.94,
        pricing_model: 'per-second',
      });
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'text-to-video',
        model_id: 'gen-2-img2vid',
        max_resolution: '1080p',
        supported_params: { interpolate: true },
        quality_score: 0.92,
        pricing_model: 'per-second',
      });
    } else if (slugLower.includes('eleven') || nameLower.includes('eleven')) {
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'text-to-audio',
        model_id: 'eleven-multilingual-v2',
        max_resolution: null,
        supported_params: { stability: 0.5 },
        quality_score: 0.97,
        pricing_model: 'per-call',
      });
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'voice-clone',
        model_id: 'eleven-voice-cloning-v1',
        max_resolution: null,
        supported_params: { sample_rate: 44100 },
        quality_score: 0.95,
        pricing_model: 'per-call',
      });
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'avatar-lipsync',
        model_id: 'eleven-lipsync-v1',
        max_resolution: '1080p',
        supported_params: { fps: 30 },
        quality_score: 0.93,
        pricing_model: 'per-second',
      });
    } else {
      // Default multimodal capabilities for custom provider
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'text-to-image',
        model_id: `${input.slug}-image-v1`,
        max_resolution: '1024x1024',
        supported_params: {},
        quality_score: 0.90,
        pricing_model: 'per-image',
      });
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'text-to-video',
        model_id: `${input.slug}-video-v1`,
        max_resolution: '1080p',
        supported_params: { duration_sec: 5 },
        quality_score: 0.88,
        pricing_model: 'per-second',
      });
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'text-to-audio',
        model_id: `${input.slug}-audio-v1`,
        max_resolution: null,
        supported_params: {},
        quality_score: 0.86,
        pricing_model: 'per-second',
      });
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'avatar-lipsync',
        model_id: `${input.slug}-avatar-v1`,
        max_resolution: '1080p',
        supported_params: {},
        quality_score: 0.85,
        pricing_model: 'per-second',
      });
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'inpainting',
        model_id: `${input.slug}-inpaint-v1`,
        max_resolution: '1024x1024',
        supported_params: {},
        quality_score: 0.87,
        pricing_model: 'per-image',
      });
      await this.repo.createCapability({
        id: uuidv4(),
        provider_id: providerId,
        capability_type: 'upscale',
        model_id: `${input.slug}-upscale-v1`,
        max_resolution: '4096x4096',
        supported_params: {},
        quality_score: 0.89,
        pricing_model: 'per-image',
      });
    }

    await this.publishConfigUpdated(provider);

    return { provider, credentialRef };
  }

  async getProvider(id: string): Promise<{ provider: Provider; credentialRef: CredentialRef | null; capabilities: Capability[] }> {
    const provider = await this.repo.findProviderById(id);
    if (!provider) {
      throw new AppError(404, 'PROVIDER_NOT_FOUND', `Provider with id '${id}' not found`);
    }

    const credentialRef = await this.repo.findCredentialRefByProviderId(id);
    const capabilities = await this.repo.findCapabilitiesByProviderId(id);

    // Don't expose full API key in response for security, but indicate if it's set
    const safeCredentialRef = credentialRef ? {
      ...credentialRef,
      api_key: credentialRef.api_key ? '••••••••••••' : undefined // Mask API key
    } : null;

    return { provider, credentialRef: safeCredentialRef, capabilities };
  }

  async listProviders(options?: { cursor?: string; limit?: number; status?: ProviderStatus }): Promise<{ providers: Provider[]; next_cursor: string | null }> {
    return this.repo.findProviders(options);
  }

  async updateProvider(id: string, updates: Partial<Omit<Provider, 'id' | 'created_at'>> & { credential?: { secret_key?: string; api_key?: string; environment?: string } }): Promise<Provider> {
    // Handle credential updates if provided
    if (updates.credential) {
      const existingCred = await this.repo.findCredentialRefByProviderId(id);
      if (existingCred) {
        // Update existing credential - keep existing API key if not provided
        await this.repo.updateCredentialRef(id, {
          ...existingCred,
          ...updates.credential,
          api_key: updates.credential.api_key !== undefined ? updates.credential.api_key : existingCred.api_key,
          environment: (updates.credential.environment || existingCred.environment) as 'production' | 'staging',
        });
      } else {
        // Create new credential
        await this.repo.createCredentialRef({
          id: uuidv4(),
          provider_id: id,
          secret_key: updates.credential.secret_key || '',
          api_key: updates.credential.api_key,
          environment: (updates.credential.environment || 'production') as 'production' | 'staging',
        });
      }
      delete updates.credential;
    }
    
    const provider = await this.repo.updateProvider(id, updates);
    if (!provider) {
      throw new AppError(404, 'PROVIDER_NOT_FOUND', `Provider with id '${id}' not found`);
    }
    await this.cache.delPattern('registry:capabilities:*');
    await this.publishConfigUpdated(provider);
    return provider;
  }

  async softDeleteProvider(id: string): Promise<Provider> {
    const provider = await this.repo.softDeleteProvider(id);
    if (!provider) {
      throw new AppError(404, 'PROVIDER_NOT_FOUND', `Provider with id '${id}' not found`);
    }
    await this.cache.delPattern('registry:capabilities:*');
    await this.publishConfigUpdated(provider);
    return provider;
  }

  async getPricing(providerId: string): Promise<PricingEntry[]> {
    const provider = await this.repo.findProviderById(providerId);
    if (!provider) {
      throw new AppError(404, 'PROVIDER_NOT_FOUND', `Provider with id '${providerId}' not found`);
    }
    return this.repo.findPricingByProviderId(providerId);
  }

  async addPricingEntry(providerId: string, entry: Omit<PricingEntry, 'id'>): Promise<PricingEntry> {
    const provider = await this.repo.findProviderById(providerId);
    if (!provider) {
      throw new AppError(404, 'PROVIDER_NOT_FOUND', `Provider with id '${providerId}' not found`);
    }
    return this.repo.createPricingEntry({ ...entry, id: uuidv4() });
  }

  async getRateLimits(providerId: string): Promise<RateLimit[]> {
    const provider = await this.repo.findProviderById(providerId);
    if (!provider) {
      throw new AppError(404, 'PROVIDER_NOT_FOUND', `Provider with id '${providerId}' not found`);
    }
    return this.repo.findRateLimitsByProviderId(providerId);
  }

  async updateRateLimits(providerId: string, limits: Array<Omit<RateLimit, 'id' | 'provider_id'>>): Promise<RateLimit[]> {
    const provider = await this.repo.findProviderById(providerId);
    if (!provider) {
      throw new AppError(404, 'PROVIDER_NOT_FOUND', `Provider with id '${providerId}' not found`);
    }
    const limitsWithIds = limits.map(limit => ({ ...limit, id: uuidv4(), provider_id: providerId }));
    const updated = await this.repo.upsertRateLimits(providerId, limitsWithIds);
    await this.cache.set(`provider:${providerId}:rate-limits`, updated, 60);
    return updated;
  }

  async autoDiscoverCapabilities(providerId: string): Promise<{ discovered: Capability[]; provider: Provider }> {
    const provider = await this.repo.findProviderById(providerId);
    if (!provider) {
      throw new AppError(404, 'PROVIDER_NOT_FOUND', `Provider with id '${providerId}' not found`);
    }

    const credentialRef = await this.repo.findCredentialRefByProviderId(providerId);
    if (!credentialRef) {
      throw new AppError(404, 'CREDENTIAL_NOT_FOUND', `No credentials found for provider '${providerId}'`);
    }

    // Use API key if available, otherwise we can't auto-discover
    const apiKey = credentialRef.api_key;
    if (!apiKey) {
      throw new AppError(400, 'NO_API_KEY', `No API key available for auto-discovery. Please add an API key for development.`);
    }

    try {
      const discoveredCapabilities = await this.discoveryService.discoverCapabilitiesBySlug(
        provider.slug,
        apiKey
      );

      // Add discovered capabilities to the provider
      const createdCapabilities: Capability[] = [];
      for (const cap of discoveredCapabilities) {
        cap.provider_id = providerId;
        cap.id = cap.id || uuidv4();
        const created = await this.repo.createCapability(cap);
        createdCapabilities.push(created);
      }

      // Invalidate cache
      await this.cache.del(`provider:${providerId}:capabilities`);

      return {
        discovered: createdCapabilities,
        provider,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(500, 'AUTO_DISCOVERY_FAILED', `Auto-discovery failed: ${errorMessage}`);
    }
  }

  private async publishConfigUpdated(provider: Provider): Promise<void> {
    const caps = await this.repo.findCapabilitiesByProviderId(provider.id);
    await this.eventPublisher.publish({
      event_name: 'provider.config.updated',
      version: 'v1',
      timestamp: new Date().toISOString(),
      payload: {
        provider_id: provider.id,
        slug: provider.slug,
        status: provider.status,
        capabilities: caps.map((c) => c.capability_type),
      },
    });
  }
}
