import { Capability, CapabilityType, PricingModel } from './types';
import { ProviderRepository } from '../infra/repository';

export class CapabilityDiscoveryService {
  constructor(private repo: ProviderRepository) {}

  async discoverOpenAICapabilities(apiKey: string): Promise<Capability[]> {
    const capabilities: Capability[] = [];

    try {
      // Fetch available models from OpenAI
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json() as { data: Array<{ id: string }> };
      const models = data.data || [];

      // Map OpenAI models to capabilities
      for (const model of models) {
        const modelId = model.id;

        // Image generation models
        if (modelId.includes('dall-e') || modelId.includes('image')) {
          capabilities.push({
            id: `cap-${modelId}`,
            provider_id: '', // Will be set by caller
            capability_type: 'text-to-image',
            model_id: modelId,
            max_resolution: '1024x1024',
            supported_params: { prompt: true, size: true, quality: true },
            quality_score: 0.95,
            pricing_model: 'per-image',
          });
        }

        // Text generation models
        if (modelId.includes('gpt')) {
          capabilities.push({
            id: `cap-${modelId}`,
            provider_id: '',
            capability_type: 'text-to-text',
            model_id: modelId,
            max_resolution: null,
            supported_params: { prompt: true, max_tokens: true, temperature: true },
            quality_score: 0.92,
            pricing_model: 'per-token',
          });
        }

        // Audio models
        if (modelId.includes('tts') || modelId.includes('audio')) {
          capabilities.push({
            id: `cap-${modelId}`,
            provider_id: '',
            capability_type: 'text-to-audio',
            model_id: modelId,
            max_resolution: null,
            supported_params: { input: true, voice: true },
            quality_score: 0.88,
            pricing_model: 'per-second',
          });
        }

        // Video models (if any)
        if (modelId.includes('sora') || modelId.includes('video')) {
          capabilities.push({
            id: `cap-${modelId}`,
            provider_id: '',
            capability_type: 'text-to-video',
            model_id: modelId,
            max_resolution: '1920x1080',
            supported_params: { prompt: true, duration: true },
            quality_score: 0.90,
            pricing_model: 'per-second',
          });
        }
      }
    } catch (error) {
      console.error('OpenAI capability discovery failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to discover OpenAI capabilities: ${errorMessage}`);
    }

    return capabilities;
  }

  async discoverStabilityAICapabilities(apiKey: string): Promise<Capability[]> {
    const capabilities: Capability[] = [];

    try {
      // Stability AI doesn't have a public models endpoint, so we'll use known models
      const knownModels = [
        { id: 'stable-diffusion-xl-1024-v1-0', type: 'text-to-image' as CapabilityType, quality: 0.90 },
        { id: 'stable-diffusion-v1-6', type: 'text-to-image' as CapabilityType, quality: 0.88 },
        { id: 'stable-diffusion-2-1', type: 'text-to-image' as CapabilityType, quality: 0.85 },
        { id: 'sdxt-img2img-1024-v1-0', type: 'image-to-image' as CapabilityType, quality: 0.87 },
        { id: 'sdxt-inpaint-1024-v1-0', type: 'inpainting' as CapabilityType, quality: 0.86 },
      ];

      for (const model of knownModels) {
        capabilities.push({
          id: `cap-${model.id}`,
          provider_id: '',
          capability_type: model.type,
          model_id: model.id,
          max_resolution: '1024x1024',
          supported_params: { prompt: true, negative_prompt: true, steps: true },
          quality_score: model.quality,
          pricing_model: 'per-image',
        });
      }
    } catch (error) {
      console.error('Stability AI capability discovery failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to discover Stability AI capabilities: ${errorMessage}`);
    }

    return capabilities;
  }

  async discoverCapabilitiesBySlug(slug: string, apiKey: string): Promise<Capability[]> {
    switch (slug.toLowerCase()) {
      case 'openai':
        return this.discoverOpenAICapabilities(apiKey);
      case 'stability':
      case 'stability-ai':
        return this.discoverStabilityAICapabilities(apiKey);
      default:
        throw new Error(`Auto-discovery not implemented for provider: ${slug}`);
    }
  }
}
