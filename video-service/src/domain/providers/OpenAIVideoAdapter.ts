// ─────────────────────────────────────────────────────────────────────────────
// OpenAI Sora Adapter
// Real API: https://api.openai.com/v1/video/generations
// Docs: https://platform.openai.com/docs/api-reference/video
// Supports: text-to-video (Sora)
// ─────────────────────────────────────────────────────────────────────────────

import { VideoProvider } from './VideoProvider';
import {
  VideoGenerationRequest,
  VideoJob,
  ProviderCapabilityInfo,
  CostEstimate,
  VideoProviderName,
  VideoGenerationStage,
  AppError,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

const OPENAI_API_BASE = 'https://api.openai.com/v1';

export class OpenAIVideoAdapter extends VideoProvider {
  readonly id: VideoProviderName = 'openai';
  readonly displayName = 'OpenAI Sora';

  private get apiKey(): string | undefined {
    return process.env.OPENAI_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  supportsStage(_stage: VideoGenerationStage): boolean {
    return true;
  }

  getCapabilityInfo(): ProviderCapabilityInfo {
    return {
      provider: this.id,
      display_name: this.displayName,
      is_configured: this.isConfigured(),
      supported_stages: ['text_to_video', 'image_to_video', 'images_to_video', 'script_to_video'],
      max_duration_seconds: 20,
      supported_resolutions: ['720p', '1080p'],
      supported_aspect_ratios: ['16:9', '9:16', '1:1'],
      avg_generation_seconds: 180,
      cost_per_second_usd: 0.15,
    };
  }

  estimateCost(request: VideoGenerationRequest): CostEstimate {
    const duration = request.duration_seconds ?? 5;
    return {
      provider: this.id,
      estimated_cost_usd: duration * 0.15,
      estimated_latency_seconds: 180,
      confidence: 'medium',
    };
  }

  async submitJob(request: VideoGenerationRequest): Promise<VideoJob> {
    if (!this.apiKey) {
      throw new AppError(503, 'PROVIDER_NOT_CONFIGURED', 'OpenAI API key is not set. Add OPENAI_API_KEY to your .env file.');
    }

    const now = new Date().toISOString();
    const localJobId = `job-openai-${uuidv4()}`;

    let fullPrompt = request.prompt;
    if (request.brand_name) fullPrompt += `. Brand: ${request.brand_name}`;
    if (request.cta_text) fullPrompt += `. Call to Action: ${request.cta_text}`;
    if (request.image_urls && request.image_urls.length > 0) {
      fullPrompt += `. Reference images: ${request.image_urls.join(', ')}`;
    }

    const body: Record<string, unknown> = {
      model: 'sora',
      prompt: fullPrompt,
      n: 1,
      size: this.mapResolution(request.aspect_ratio ?? '16:9', request.resolution ?? '1080p'),
    };

    if (request.duration_seconds) {
      body.duration = request.duration_seconds;
    }

    const response = await fetch(`${OPENAI_API_BASE}/video/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as { error?: { code?: string; message?: string } };
      if (response.status === 404) {
        throw new AppError(
          502,
          'PROVIDER_UPSTREAM_ERROR',
          'OpenAI Sora Video API is currently in private access / limited beta and not available on standard OpenAI API keys. To generate real videos, please configure RUNWAY_API_KEY, PIKA_API_KEY, or LUMA_API_KEY in your .env file.'
        );
      }
      if (response.status === 429) {
        throw new AppError(429, 'PROVIDER_RATE_LIMITED', 'OpenAI API rate limit exceeded.');
      }
      if (response.status === 400 && errorBody.error?.code === 'content_policy_violation') {
        throw new AppError(422, 'PROMPT_REJECTED', `OpenAI rejected prompt due to content policy: ${errorBody.error.message}`);
      }
      throw new AppError(502, 'PROVIDER_UPSTREAM_ERROR', `OpenAI API error: ${errorBody.error?.message || response.statusText}`);
    }

    // Sora returns the generation synchronously or with a job ID
    const data = await response.json() as { id?: string; data?: Array<{ url?: string }>; status?: string };

    // If immediate response with video URL (non-async path)
    if (data.data?.[0]?.url) {
      return {
        id: localJobId,
        provider: this.id,
        provider_job_id: data.id ?? localJobId,
        status: 'succeeded',
        progress_pct: 100,
        request,
        output_url: data.data[0].url,
        created_at: now,
        updated_at: now,
      };
    }

    return {
      id: localJobId,
      provider: this.id,
      provider_job_id: data.id ?? localJobId,
      status: 'processing',
      progress_pct: 5,
      request,
      created_at: now,
      updated_at: now,
    };
  }

  async pollJobStatus(providerJobId: string, localJobId: string, request: VideoGenerationRequest): Promise<VideoJob> {
    if (!this.apiKey) {
      throw new AppError(503, 'PROVIDER_NOT_CONFIGURED', 'OpenAI API key is not set.');
    }

    const response = await fetch(`${OPENAI_API_BASE}/video/generations/${providerJobId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      throw new AppError(502, 'PROVIDER_UPSTREAM_ERROR', `OpenAI poll error: ${response.statusText}`);
    }

    const gen = await response.json() as {
      id: string;
      status: string;
      data?: Array<{ url: string }>;
      error?: { message: string };
    };

    const now = new Date().toISOString();
    const status = this.mapStatus(gen.status);

    return {
      id: localJobId,
      provider: this.id,
      provider_job_id: providerJobId,
      status,
      progress_pct: status === 'succeeded' ? 100 : 50,
      request,
      output_url: gen.data?.[0]?.url,
      error_message: gen.error?.message,
      created_at: now,
      updated_at: now,
    };
  }

  async cancelJob(_providerJobId: string): Promise<void> {
    // Sora does not currently support cancellation
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch(`${OPENAI_API_BASE}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return res.status < 500;
    } catch {
      return false;
    }
  }

  private mapStatus(status: string): VideoJob['status'] {
    switch (status) {
      case 'queued':      return 'queued';
      case 'processing':  return 'processing';
      case 'completed':
      case 'succeeded':   return 'succeeded';
      case 'failed':      return 'failed';
      case 'cancelled':   return 'cancelled';
      default:            return 'processing';
    }
  }

  private mapResolution(aspectRatio: string, resolution: string): string {
    const isHD = resolution === '1080p';
    switch (aspectRatio) {
      case '9:16':  return isHD ? '1080x1920' : '720x1280';
      case '1:1':   return isHD ? '1080x1080' : '720x720';
      default:      return isHD ? '1920x1080' : '1280x720';
    }
  }
}
