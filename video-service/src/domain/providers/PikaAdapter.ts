// ─────────────────────────────────────────────────────────────────────────────
// Pika Labs Adapter
// Real API: https://api.pika.art/v1/
// Docs: https://pika.art/api
// Supports: text-to-video, image-to-video
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

const PIKA_API_BASE = 'https://api.pika.art/v1';

export class PikaAdapter extends VideoProvider {
  readonly id: VideoProviderName = 'pika';
  readonly displayName = 'Pika 2.2';

  private get apiKey(): string | undefined {
    return process.env.PIKA_API_KEY;
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
      avg_generation_seconds: 60,
      cost_per_second_usd: 0.03,
    };
  }

  estimateCost(request: VideoGenerationRequest): CostEstimate {
    const duration = request.duration_seconds ?? 5;
    return {
      provider: this.id,
      estimated_cost_usd: duration * 0.03,
      estimated_latency_seconds: 60,
      confidence: 'high',
    };
  }

  async submitJob(request: VideoGenerationRequest): Promise<VideoJob> {
    if (!this.apiKey) {
      throw new AppError(503, 'PROVIDER_NOT_CONFIGURED', 'Pika API key is not set. Add PIKA_API_KEY to your .env file.');
    }

    const now = new Date().toISOString();
    const localJobId = `job-pika-${uuidv4()}`;

    const body: Record<string, unknown> = {
      prompt_text: request.prompt,
      promptText: request.prompt, // fallback
      duration: request.duration_seconds ?? 5,
      aspect_ratio: request.aspect_ratio ?? '16:9',
      resolution: request.resolution ?? '1080p',
      frame_rate: request.fps ?? 24,
    };

    if (request.image_url) {
      body.image = { url: request.image_url };
      body.image_url = request.image_url;
    }

    // Attempt /videos endpoint first, fallback to /generate
    let response = await fetch(`${PIKA_API_BASE}/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 404) {
      response = await fetch(`${PIKA_API_BASE}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (response.status === 429) {
        throw new AppError(429, 'PROVIDER_RATE_LIMITED', 'Pika API rate limit exceeded.');
      }
      if (response.status === 422) {
        throw new AppError(422, 'PROMPT_REJECTED', `Pika rejected prompt: ${errorBody.message || 'Content policy violation'}`);
      }
      throw new AppError(502, 'PROVIDER_UPSTREAM_ERROR', `Pika API error: ${errorBody.message || response.statusText}`);
    }

    const data = await response.json() as { id?: string; jobId?: string; videoId?: string; status?: string };
    const providerJobId = data.id || data.jobId || data.videoId || localJobId;

    return {
      id: localJobId,
      provider: this.id,
      provider_job_id: providerJobId,
      status: 'processing',
      progress_pct: 5,
      request,
      created_at: now,
      updated_at: now,
    };
  }

  async pollJobStatus(providerJobId: string, localJobId: string, request: VideoGenerationRequest): Promise<VideoJob> {
    if (!this.apiKey) {
      throw new AppError(503, 'PROVIDER_NOT_CONFIGURED', 'Pika API key is not set.');
    }

    let response = await fetch(`${PIKA_API_BASE}/videos/${providerJobId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });

    if (response.status === 404) {
      response = await fetch(`${PIKA_API_BASE}/jobs/${providerJobId}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
    }

    if (!response.ok) {
      throw new AppError(502, 'PROVIDER_UPSTREAM_ERROR', `Pika poll error: ${response.statusText}`);
    }

    const resJson = await response.json() as Record<string, unknown>;
    const job = (resJson.video || resJson.job || resJson) as {
      status?: string;
      progress?: number;
      resultUrl?: string;
      videoUrl?: string;
      url?: string;
      thumbnailUrl?: string;
      error?: string;
    };

    const now = new Date().toISOString();
    const rawStatus = job.status || 'processing';
    const status = this.mapStatus(rawStatus);

    return {
      id: localJobId,
      provider: this.id,
      provider_job_id: providerJobId,
      status,
      progress_pct: status === 'succeeded' ? 100 : Math.round((job.progress ?? 0.5) * 100),
      request,
      output_url: job.resultUrl || job.videoUrl || job.url,
      thumbnail_url: job.thumbnailUrl,
      error_message: job.error,
      created_at: now,
      updated_at: now,
    };
  }

  async cancelJob(providerJobId: string): Promise<void> {
    if (!this.apiKey) return;
    await fetch(`${PIKA_API_BASE}/videos/${providerJobId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    }).catch(() => {
      fetch(`${PIKA_API_BASE}/jobs/${providerJobId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      }).catch(() => {});
    });
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch(`${PIKA_API_BASE}/health`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return res.status < 500;
    } catch {
      return false;
    }
  }

  private mapStatus(pikaStatus: string): VideoJob['status'] {
    switch (pikaStatus?.toLowerCase()) {
      case 'queued':     return 'queued';
      case 'processing':
      case 'running':    return 'processing';
      case 'finished':
      case 'completed':
      case 'succeeded':  return 'succeeded';
      case 'failed':
      case 'error':      return 'failed';
      case 'cancelled':  return 'cancelled';
      default:           return 'processing';
    }
  }
}

