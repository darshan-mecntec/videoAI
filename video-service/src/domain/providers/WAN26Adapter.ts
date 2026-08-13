// ─────────────────────────────────────────────────────────────────────────────
// WAN 2.6 AI Adapter (Alibaba WAN 2.6 Native Audio Model)
// Supports: text-to-video, image-to-video with native audio generation
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

const REPLICATE_API_BASE = 'https://api.replicate.com/v1';
const WAN26_MODEL_VERSION = 'alibaba/wan-2.6:latest';

export class WAN26Adapter extends VideoProvider {
  readonly id: VideoProviderName = 'wan_2_6';
  readonly displayName = 'WAN 2.6 Native Audio';

  private get apiKey(): string | undefined {
    return process.env.WAN26_API_KEY || process.env.REPLICATE_API_KEY;
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
      max_duration_seconds: 10,
      supported_resolutions: ['720p', '1080p'],
      supported_aspect_ratios: ['16:9', '9:16', '1:1'],
      avg_generation_seconds: 80,
      cost_per_second_usd: 0.05,
    };
  }

  estimateCost(request: VideoGenerationRequest): CostEstimate {
    const duration = request.duration_seconds ?? 5;
    return {
      provider: this.id,
      estimated_cost_usd: duration * 0.05,
      estimated_latency_seconds: 80,
      confidence: 'high',
    };
  }

  async submitJob(request: VideoGenerationRequest): Promise<VideoJob> {
    if (!this.apiKey) {
      throw new AppError(503, 'PROVIDER_NOT_CONFIGURED', 'WAN 2.6 API key is not set. Add WAN26_API_KEY or REPLICATE_API_KEY to your .env file.');
    }

    const now = new Date().toISOString();
    const localJobId = `job-wan-${uuidv4()}`;

    const input: Record<string, unknown> = {
      prompt: request.prompt,
      aspect_ratio: request.aspect_ratio ?? '16:9',
      duration: request.duration_seconds ?? 5,
      audio: true,
    };

    if (request.image_url) {
      input.image = request.image_url;
    }

    const response = await fetch(`${REPLICATE_API_BASE}/predictions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        version: WAN26_MODEL_VERSION,
        input,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (response.status === 429) {
        throw new AppError(429, 'PROVIDER_RATE_LIMITED', 'WAN 2.6 API rate limit exceeded.');
      }
      throw new AppError(502, 'PROVIDER_UPSTREAM_ERROR', `WAN 2.6 API error: ${errorBody.detail || response.statusText}`);
    }

    const data = await response.json() as { id: string; status: string };

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
      throw new AppError(503, 'PROVIDER_NOT_CONFIGURED', 'WAN 2.6 API key is not set.');
    }

    const response = await fetch(`${REPLICATE_API_BASE}/predictions/${providerJobId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      throw new AppError(502, 'PROVIDER_UPSTREAM_ERROR', `WAN 2.6 poll error: ${response.statusText}`);
    }

    const pred = await response.json() as {
      id: string;
      status: string;
      output?: string | string[];
      error?: string;
    };

    const now = new Date().toISOString();
    const status = this.mapStatus(pred.status);
    const outputUrl = Array.isArray(pred.output) ? pred.output[0] : pred.output;

    return {
      id: localJobId,
      provider: this.id,
      provider_job_id: providerJobId,
      status,
      progress_pct: status === 'succeeded' ? 100 : 50,
      request,
      output_url: outputUrl,
      error_message: pred.error,
      created_at: now,
      updated_at: now,
    };
  }

  async cancelJob(providerJobId: string): Promise<void> {
    if (!this.apiKey) return;
    await fetch(`${REPLICATE_API_BASE}/predictions/${providerJobId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch(`${REPLICATE_API_BASE}/account`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return res.status < 500;
    } catch {
      return false;
    }
  }

  private mapStatus(status: string): VideoJob['status'] {
    switch (status) {
      case 'starting':
      case 'processing': return 'processing';
      case 'succeeded':  return 'succeeded';
      case 'failed':     return 'failed';
      case 'canceled':   return 'cancelled';
      default:           return 'processing';
    }
  }
}
