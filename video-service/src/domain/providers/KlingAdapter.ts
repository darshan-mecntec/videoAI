// ─────────────────────────────────────────────────────────────────────────────
// Kling AI 3.0 Adapter
// Real API: https://api.klingai.com/v1/
// Docs: https://api.klingai.com/
// Supports: text-to-video, image-to-video, camera control, multi-shot
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

const KLING_API_BASE = 'https://api.klingai.com/v1';

export class KlingAdapter extends VideoProvider {
  readonly id: VideoProviderName = 'kling';
  readonly displayName = 'Kling 3.0';

  private get apiKey(): string | undefined {
    return process.env.KLING_API_KEY;
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
      max_duration_seconds: 15,
      supported_resolutions: ['720p', '1080p', '4k'],
      supported_aspect_ratios: ['16:9', '9:16', '1:1'],
      avg_generation_seconds: 90,
      cost_per_second_usd: 0.06,
    };
  }

  estimateCost(request: VideoGenerationRequest): CostEstimate {
    const duration = request.duration_seconds ?? 5;
    return {
      provider: this.id,
      estimated_cost_usd: duration * 0.06,
      estimated_latency_seconds: 90,
      confidence: 'high',
    };
  }

  async submitJob(request: VideoGenerationRequest): Promise<VideoJob> {
    if (!this.apiKey) {
      throw new AppError(503, 'PROVIDER_NOT_CONFIGURED', 'Kling API key is not set. Add KLING_API_KEY to your .env file.');
    }

    const now = new Date().toISOString();
    const localJobId = `job-kling-${uuidv4()}`;

    const endpoint = request.image_url ? '/videos/image2video' : '/videos/text2video';

    const body: Record<string, unknown> = {
      model_name: 'kling-v3',
      prompt: request.prompt,
      duration: `${request.duration_seconds ?? 5}`,
      aspect_ratio: request.aspect_ratio ?? '16:9',
      mode: 'std',
    };

    if (request.image_url) {
      body.image = { url: request.image_url };
    }

    const response = await fetch(`${KLING_API_BASE}${endpoint}`, {
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
        throw new AppError(429, 'PROVIDER_RATE_LIMITED', 'Kling API rate limit exceeded.');
      }
      throw new AppError(502, 'PROVIDER_UPSTREAM_ERROR', `Kling API error: ${errorBody.message || response.statusText}`);
    }

    const data = await response.json() as { data?: { task_id: string }; task_id?: string };
    const taskId = data.data?.task_id || data.task_id || localJobId;

    return {
      id: localJobId,
      provider: this.id,
      provider_job_id: taskId,
      status: 'processing',
      progress_pct: 5,
      request,
      created_at: now,
      updated_at: now,
    };
  }

  async pollJobStatus(providerJobId: string, localJobId: string, request: VideoGenerationRequest): Promise<VideoJob> {
    if (!this.apiKey) {
      throw new AppError(503, 'PROVIDER_NOT_CONFIGURED', 'Kling API key is not set.');
    }

    const response = await fetch(`${KLING_API_BASE}/tasks/${providerJobId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      throw new AppError(502, 'PROVIDER_UPSTREAM_ERROR', `Kling poll error: ${response.statusText}`);
    }

    const resJson = await response.json() as Record<string, unknown>;
    const taskData = (resJson.data || resJson) as {
      task_status?: string;
      task_result?: { videos?: Array<{ url: string; duration?: string }> };
    };
    const rawStatus = taskData.task_status || 'processing';
    const status = this.mapStatus(rawStatus);
    const videoUrl = taskData.task_result?.videos?.[0]?.url;

    const now = new Date().toISOString();

    return {
      id: localJobId,
      provider: this.id,
      provider_job_id: providerJobId,
      status,
      progress_pct: status === 'succeeded' ? 100 : 50,
      request,
      output_url: videoUrl,
      created_at: now,
      updated_at: now,
    };
  }

  async cancelJob(_providerJobId: string): Promise<void> {
    // Kling tasks do not support cancellation via public API
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch(`${KLING_API_BASE}/account`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return res.status < 500;
    } catch {
      return false;
    }
  }

  private mapStatus(klingStatus: string): VideoJob['status'] {
    switch (klingStatus?.toLowerCase()) {
      case 'submitted':
      case 'queued':      return 'queued';
      case 'processing': return 'processing';
      case 'succeed':
      case 'succeeded':
      case 'completed':  return 'succeeded';
      case 'failed':     return 'failed';
      default:           return 'processing';
    }
  }
}
