// ─────────────────────────────────────────────────────────────────────────────
// Luma Dream Machine Adapter
// Real API: https://api.lumalabs.ai/dream-machine/v1/
// Docs: https://lumalabs.ai/dream-machine/api/reference
// Supports: text-to-video, image-to-video, camera motion
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

const LUMA_API_BASE = 'https://api.lumalabs.ai/dream-machine/v1';

export class LumaAdapter extends VideoProvider {
  readonly id: VideoProviderName = 'luma';
  readonly displayName = 'Luma Dream Machine';

  private get apiKey(): string | undefined {
    return process.env.LUMA_API_KEY;
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
      max_duration_seconds: 9,
      supported_resolutions: ['720p', '1080p'],
      supported_aspect_ratios: ['16:9', '9:16', '1:1', '4:5'],
      avg_generation_seconds: 120,
      cost_per_second_usd: 0.04,
    };
  }

  estimateCost(request: VideoGenerationRequest): CostEstimate {
    const duration = request.duration_seconds ?? 5;
    return {
      provider: this.id,
      estimated_cost_usd: duration * 0.04,
      estimated_latency_seconds: 120,
      confidence: 'medium',
    };
  }

  async submitJob(request: VideoGenerationRequest): Promise<VideoJob> {
    if (!this.apiKey) {
      throw new AppError(503, 'PROVIDER_NOT_CONFIGURED', 'Luma API key is not set. Add LUMA_API_KEY to your .env file.');
    }

    const now = new Date().toISOString();
    const localJobId = `job-luma-${uuidv4()}`;

    const body: Record<string, unknown> = {
      model: 'ray-2',
      prompt: request.prompt,
      aspect_ratio: request.aspect_ratio ?? '16:9',
      loop: false,
    };

    // Add keyframe if image is provided
    if (request.image_url) {
      body.keyframes = {
        frame0: {
          type: 'image',
          url: request.image_url,
        },
      };
    }

    // Multiple images for slideshow (frame0 → frameN)
    if (request.image_urls && request.image_urls.length > 0) {
      const keyframes: Record<string, unknown> = {};
      request.image_urls.forEach((url, i) => {
        keyframes[`frame${i}`] = { type: 'image', url };
      });
      body.keyframes = keyframes;
    }

    const response = await fetch(`${LUMA_API_BASE}/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (response.status === 429) {
        throw new AppError(429, 'PROVIDER_RATE_LIMITED', 'Luma API rate limit exceeded.');
      }
      throw new AppError(502, 'PROVIDER_UPSTREAM_ERROR', `Luma API error: ${errorBody.detail || response.statusText}`);
    }

    const data = await response.json() as { id: string; state: string };

    return {
      id: localJobId,
      provider: this.id,
      provider_job_id: data.id,
      status: 'processing',
      progress_pct: 5,
      request,
      created_at: now,
      updated_at: now,
    };
  }

  async pollJobStatus(providerJobId: string, localJobId: string, request: VideoGenerationRequest): Promise<VideoJob> {
    if (!this.apiKey) {
      throw new AppError(503, 'PROVIDER_NOT_CONFIGURED', 'Luma API key is not set.');
    }

    const response = await fetch(`${LUMA_API_BASE}/generations/${providerJobId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      throw new AppError(502, 'PROVIDER_UPSTREAM_ERROR', `Luma poll error: ${response.statusText}`);
    }

    const gen = await response.json() as {
      id: string;
      state: string;
      video?: { url: string; download_url?: string; duration?: number };
      failure_reason?: string;
    };

    const now = new Date().toISOString();
    const status = this.mapStatus(gen.state);

    return {
      id: localJobId,
      provider: this.id,
      provider_job_id: providerJobId,
      status,
      progress_pct: status === 'succeeded' ? 100 : 50,
      request,
      output_url: gen.video?.url,
      duration_ms: gen.video?.duration ? gen.video.duration * 1000 : undefined,
      error_message: gen.failure_reason,
      created_at: now,
      updated_at: now,
    };
  }

  async cancelJob(providerJobId: string): Promise<void> {
    if (!this.apiKey) return;
    await fetch(`${LUMA_API_BASE}/generations/${providerJobId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch(`${LUMA_API_BASE}/generations?limit=1`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return res.status < 500;
    } catch {
      return false;
    }
  }

  private mapStatus(lumaState: string): VideoJob['status'] {
    switch (lumaState) {
      case 'pending':    return 'queued';
      case 'dreaming':   return 'processing';
      case 'completed':  return 'succeeded';
      case 'failed':     return 'failed';
      default:           return 'processing';
    }
  }
}
