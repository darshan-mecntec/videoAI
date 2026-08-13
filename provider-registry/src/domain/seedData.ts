import { ProviderService } from './providerService';
import { CapabilityService } from './capabilityService';
import { HealthService } from './healthService';

export async function seedDefaultProviders(
  providerService: ProviderService,
  capabilityService: CapabilityService,
  healthService: HealthService
): Promise<void> {
  const existing = await providerService.listProviders();
  if (existing.providers.length > 0) {
    return; // Already seeded
  }

  // 1. OpenAI
  const { provider: openai } = await providerService.registerProvider({
    slug: 'openai-v1',
    display_name: 'OpenAI',
    region_codes: ['global', 'us-east-1'],
    secret_key: 'vault/openai/production',
  });

  await capabilityService.addCapability(openai.id, {
    capability_type: 'text-to-image',
    model_id: 'dall-e-3',
    max_resolution: '1024x1024',
    supported_params: { quality: ['standard', 'hd'], style: ['vivid', 'natural'] },
    quality_score: 0.96,
    pricing_model: 'per-image',
  });

  await capabilityService.addCapability(openai.id, {
    capability_type: 'image-to-image',
    model_id: 'dall-e-2',
    max_resolution: '1024x1024',
    supported_params: { n: [1, 2, 4] },
    quality_score: 0.88,
    pricing_model: 'per-image',
  });

  await healthService.recordHealthCheck(openai.id, 'healthy', 420, null, 0.99);

  // 2. Stability AI
  const { provider: stability } = await providerService.registerProvider({
    slug: 'stability-v1',
    display_name: 'Stability AI',
    region_codes: ['global', 'us-west-2'],
    secret_key: 'vault/stability/production',
  });

  await capabilityService.addCapability(stability.id, {
    capability_type: 'text-to-image',
    model_id: 'sdxl-1.0',
    max_resolution: '1024x1024',
    supported_params: { steps: [30, 50], cfg_scale: 7 },
    quality_score: 0.92,
    pricing_model: 'per-image',
  });

  await capabilityService.addCapability(stability.id, {
    capability_type: 'inpainting',
    model_id: 'sdxl-inpainting-v1',
    max_resolution: '1024x1024',
    supported_params: { mask_blur: 4 },
    quality_score: 0.89,
    pricing_model: 'per-image',
  });

  await capabilityService.addCapability(stability.id, {
    capability_type: 'upscale',
    model_id: 'esrgan-v4-upscaler',
    max_resolution: '4096x4096',
    supported_params: { scale: [2, 4] },
    quality_score: 0.91,
    pricing_model: 'per-image',
  });

  await healthService.recordHealthCheck(stability.id, 'healthy', 380, null, 1.0);

  // 3. Runway ML
  const { provider: runway } = await providerService.registerProvider({
    slug: 'runway-v1',
    display_name: 'Runway ML',
    region_codes: ['global', 'us-east-1'],
    secret_key: 'vault/runway/production',
  });

  await capabilityService.addCapability(runway.id, {
    capability_type: 'text-to-video',
    model_id: 'gen-2',
    max_resolution: '1080p',
    supported_params: { duration_sec: [4, 8], fps: 24 },
    quality_score: 0.94,
    pricing_model: 'per-second',
  });

  await healthService.recordHealthCheck(runway.id, 'healthy', 1250, null, 0.98);

  // 4. ElevenLabs
  const { provider: elevenlabs } = await providerService.registerProvider({
    slug: 'elevenlabs-v1',
    display_name: 'ElevenLabs',
    region_codes: ['global', 'eu-west-1'],
    secret_key: 'vault/elevenlabs/production',
  });

  await capabilityService.addCapability(elevenlabs.id, {
    capability_type: 'text-to-audio',
    model_id: 'eleven-multilingual-v2',
    max_resolution: null,
    supported_params: { stability: 0.5, similarity_boost: 0.75 },
    quality_score: 0.97,
    pricing_model: 'per-call',
  });

  await capabilityService.addCapability(elevenlabs.id, {
    capability_type: 'voice-clone',
    model_id: 'eleven-voice-cloning-v1',
    max_resolution: null,
    supported_params: { sample_rate: 44100 },
    quality_score: 0.95,
    pricing_model: 'per-call',
  });

  await healthService.recordHealthCheck(elevenlabs.id, 'healthy', 280, null, 0.99);

  console.log('[provider-registry] Default AI providers and capabilities seeded successfully.');
}
