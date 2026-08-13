// ─────────────────────────────────────────────────────────────────────────────
// Google Veo 3.1 Adapter with Key-Pool Failover
// Real API: https://generativelanguage.googleapis.com/v1beta/
// Endpoint: models/veo-3.1-generate-preview:predictLongRunning
// Supports: text-to-video, image-to-video, key-pool failover across 14+ keys
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

const VEO_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const VEO_MODEL = 'veo-3.1-generate-preview';

export class GoogleVeoAdapter extends VideoProvider {
  readonly id: VideoProviderName = 'google_veo';
  readonly displayName = 'Google Veo 3.1';

  /**
   * Returns array of all configured Google API keys (from main key + key pool).
   */
  private get apiKeys(): string[] {
    const mainKey = process.env.GOOGLE_VEO_API_KEY || process.env.GEMINI_API_KEY;
    const pool = (process.env.GEMINI_KEY_POOL || '').split(',').map(k => k.trim()).filter(Boolean);
    const set = new Set<string>();
    if (mainKey && mainKey.trim()) set.add(mainKey.trim());
    pool.forEach(k => set.add(k));
    return Array.from(set);
  }

  isConfigured(): boolean {
    return this.apiKeys.length > 0;
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
      max_duration_seconds: 8,
      supported_resolutions: ['720p', '1080p'],
      supported_aspect_ratios: ['16:9', '9:16', '1:1'],
      avg_generation_seconds: 120,
      cost_per_second_usd: 0.08,
    };
  }

  estimateCost(request: VideoGenerationRequest): CostEstimate {
    const duration = request.duration_seconds ?? 5;
    return {
      provider: this.id,
      estimated_cost_usd: duration * 0.08,
      estimated_latency_seconds: 120,
      confidence: 'high',
    };
  }

  async submitJob(request: VideoGenerationRequest): Promise<VideoJob> {
    const keys = this.apiKeys;
    if (keys.length === 0) {
      throw new AppError(503, 'PROVIDER_NOT_CONFIGURED', 'Google Veo API key is not set. Add GOOGLE_VEO_API_KEY or GEMINI_API_KEY to your .env file.');
    }

    const now = new Date().toISOString();
    const localJobId = `job-veo-${uuidv4()}`;

    let fullPrompt = request.prompt;
    if (request.brand_name) fullPrompt += `. Brand: ${request.brand_name}`;
    if (request.cta_text) fullPrompt += `. Call to Action: ${request.cta_text}`;

    const instanceObj: Record<string, unknown> = { prompt: fullPrompt };
    if (request.image_url) {
      instanceObj.image = { gcsUri: request.image_url.startsWith('gs://') ? request.image_url : undefined, imageBytes: !request.image_url.startsWith('gs://') ? request.image_url : undefined };
      instanceObj.image_url = request.image_url;
    }

    const body = {
      instances: [
        instanceObj
      ],
      parameters: {
        aspectRatio: request.aspect_ratio || "16:9",
        durationSeconds: Math.min(request.duration_seconds || 8, 15),
      }
    };

    let lastError: AppError | null = null;

    // Key pool failover: loop through all available keys until one succeeds
    for (const key of keys) {
      try {
        const response = await fetch(
          `${VEO_API_BASE}/models/${VEO_MODEL}:predictLongRunning?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({})) as { error?: { message?: string; code?: number; status?: string } };
          if (response.status === 429 || errorBody.error?.status === 'RESOURCE_EXHAUSTED') {
            console.warn(`[google_veo] Key ending in ...${key.slice(-6)} rate limited (429). Trying next key in pool...`);
            lastError = new AppError(429, 'PROVIDER_RATE_LIMITED', 'Google Veo preview quota reached across all configured API keys. Google AI Studio free tier rate-limits preview generation. Please wait a few minutes or use Runway / Pika.');
            continue; // Try next key
          }
          if (response.status === 404) {
            throw new AppError(502, 'PROVIDER_UPSTREAM_ERROR', `Google Veo endpoint error: ${errorBody.error?.message || response.statusText}`);
          }
          throw new AppError(502, 'PROVIDER_UPSTREAM_ERROR', `Google Veo API error: ${errorBody.error?.message || response.statusText}`);
        }

        const data = await response.json() as { name: string };
        if (!data.name) {
          throw new AppError(502, 'PROVIDER_UPSTREAM_ERROR', 'Google Veo did not return an operation name.');
        }

        return {
          id: localJobId,
          provider: this.id,
          provider_job_id: data.name, // e.g. "operations/abc123"
          status: 'processing',
          progress_pct: 5,
          request,
          created_at: now,
          updated_at: now,
        };
      } catch (err) {
        if (err instanceof AppError) {
          if (err.statusCode === 429) continue; // Try next key on 429
          throw err;
        }
        throw new AppError(502, 'PROVIDER_UPSTREAM_ERROR', `Google Veo request failed: ${(err as Error).message}`);
      }
    }

    // If all keys in key pool were rate limited
    throw lastError || new AppError(429, 'PROVIDER_RATE_LIMITED', 'Google Veo quota limit reached on all configured API keys.');
  }

  async pollJobStatus(providerJobId: string, localJobId: string, request: VideoGenerationRequest): Promise<VideoJob> {
    const keys = this.apiKeys;
    if (keys.length === 0) {
      throw new AppError(503, 'PROVIDER_NOT_CONFIGURED', 'Google Veo API key is not set.');
    }

    const key = keys[0]; // Use first key for status check
    const response = await fetch(
      `${VEO_API_BASE}/${providerJobId}?key=${key}`,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (!response.ok) {
      throw new AppError(502, 'PROVIDER_UPSTREAM_ERROR', `Google Veo poll error: ${response.statusText}`);
    }

    const op = await response.json() as {
      name: string;
      done?: boolean;
      response?: {
        generateVideoResponse?: { videoUri?: string };
        predictions?: Array<{ bytesBase64Encoded?: string; videoUri?: string; uri?: string }>;
        videos?: Array<{ uri: string }>;
      };
      error?: { message: string };
    };

    const now = new Date().toISOString();
    const isDone = op.done === true;
    const hasError = !!op.error;

    const outputUrl =
      op.response?.generateVideoResponse?.videoUri ||
      op.response?.predictions?.[0]?.videoUri ||
      op.response?.predictions?.[0]?.uri ||
      op.response?.videos?.[0]?.uri;

    return {
      id: localJobId,
      provider: this.id,
      provider_job_id: providerJobId,
      status: hasError ? 'failed' : isDone ? 'succeeded' : 'processing',
      progress_pct: isDone ? 100 : 50,
      request,
      output_url: outputUrl,
      error_message: op.error?.message,
      created_at: now,
      updated_at: now,
    };
  }

  async cancelJob(_providerJobId: string): Promise<void> {
    // Operations do not support cancellation via public API
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const res = await fetch(`${VEO_API_BASE}/models?key=${this.apiKeys[0]}`);
      return res.status < 500;
    } catch {
      return false;
    }
  }
}
