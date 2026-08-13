// ─────────────────────────────────────────────────────────────────────────────
// Runway Gen-4 / Gen-4.5 Adapter
// Real API: https://api.runwayml.com/v1/
// Docs: https://docs.runwayml.com/
// Supports: image-to-video, text-to-video
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

const RUNWAY_API_BASE = 'https://api.runwayml.com/v1';

export class RunwayAdapter extends VideoProvider {
  readonly id: VideoProviderName = 'runway';
  readonly displayName = 'Runway Gen-4.5';

  private get apiKey(): string | undefined {
    return process.env.RUNWAY_API_KEY;
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
      supported_resolutions: ['720p', '1080p', '4k'],
      supported_aspect_ratios: ['16:9', '9:16', '1:1'],
      avg_generation_seconds: 75,
      cost_per_second_usd: 0.05,
    };
  }

  estimateCost(request: VideoGenerationRequest): CostEstimate {
    const duration = request.duration_seconds ?? 5;
    return {
      provider: this.id,
      estimated_cost_usd: duration * 0.05,
      estimated_latency_seconds: 75,
      confidence: 'high',
    };
  }

  async submitJob(request: VideoGenerationRequest): Promise<VideoJob> {
    if (!this.apiKey) {
      throw new AppError(503, 'PROVIDER_NOT_CONFIGURED', 'Runway API key is not set. Add RUNWAY_API_KEY to your .env file.');
    }

    const now = new Date().toISOString();
    const localJobId = `job-runway-${uuidv4()}`;

    const body: Record<string, unknown> = {
      model: 'gen4_turbo',
      promptText: request.prompt,
      duration: request.duration_seconds ?? 5,
      ratio: this.mapAspectRatio(request.aspect_ratio ?? '16:9'),
    };

    const endpoint = request.image_url ? '/image_to_video' : '/text_to_video';

    if (request.image_url) {
      body.promptImage = request.image_url;
    }

    let response = await fetch(`${RUNWAY_API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify(body),
    });

    if (response.status === 404 && endpoint === '/text_to_video') {
      // Fallback to /image_to_video if provider accepts text prompts on main endpoint
      response = await fetch(`${RUNWAY_API_BASE}/image_to_video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Runway-Version': '2024-11-06',
        },
        body: JSON.stringify(body),
      });
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (response.status === 429) {
        throw new AppError(429, 'PROVIDER_RATE_LIMITED', 'Runway API rate limit exceeded. Please try again later.');
      }
      throw new AppError(502, 'PROVIDER_UPSTREAM_ERROR', `Runway API error: ${errorBody.error || response.statusText}`);
    }

    const data = await response.json() as { id: string };

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
      throw new AppError(503, 'PROVIDER_NOT_CONFIGURED', 'Runway API key is not set.');
    }

    const response = await fetch(`${RUNWAY_API_BASE}/tasks/${providerJobId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Runway-Version': '2024-11-06',
      },
    });

    if (!response.ok) {
      throw new AppError(502, 'PROVIDER_UPSTREAM_ERROR', `Runway poll error: ${response.statusText}`);
    }

    const task = await response.json() as {
      id: string;
      status: string;
      progress?: number;
      output?: string[];
      failure?: string;
    };

    const now = new Date().toISOString();
    const status = this.mapStatus(task.status);

    return {
      id: localJobId,
      provider: this.id,
      provider_job_id: providerJobId,
      status,
      progress_pct: status === 'succeeded' ? 100 : Math.round((task.progress ?? 0) * 100),
      request,
      output_url: task.output?.[0],
      error_message: task.failure,
      created_at: now,
      updated_at: now,
    };
  }

  async cancelJob(providerJobId: string): Promise<void> {
    if (!this.apiKey) return;
    await fetch(`${RUNWAY_API_BASE}/tasks/${providerJobId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Runway-Version': '2024-11-06',
      },
    });
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch(`${RUNWAY_API_BASE}/tasks`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'X-Runway-Version': '2024-11-06' },
      });
      return res.status < 500;
    } catch {
      return false;
    }
  }

  private mapStatus(runwayStatus: string): VideoJob['status'] {
    switch (runwayStatus) {
      case 'PENDING':    return 'queued';
      case 'RUNNING':    return 'processing';
      case 'SUCCEEDED':  return 'succeeded';
      case 'FAILED':     return 'failed';
      case 'CANCELLED':  return 'cancelled';
      default:           return 'processing';
    }
  }

  private mapAspectRatio(ar: string): string {
    switch (ar) {
      case '9:16': return '720:1280';
      case '1:1':  return '960:960';
      default:     return '1280:720';
    }
  }
}

