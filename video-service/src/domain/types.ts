// ─────────────────────────────────────────────────────────────────────────────
// Video Service — Core Domain Types
// Production-grade: no mock types, all fields reflect real provider API shapes
// ─────────────────────────────────────────────────────────────────────────────

export type VideoJobStatus =
  | 'queued'
  | 'initializing'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type VideoProviderName = 'openai' | 'runway' | 'pika' | 'luma' | 'google_veo' | 'kling' | 'wan_2_6';

export type VideoGenerationStage =
  | 'text_to_video'         // Stage 1: prompt → video
  | 'image_to_video'        // Stage 2: image + prompt → video
  | 'images_to_video'       // Stage 3: multiple images → video slideshow
  | 'script_to_video';      // Stage 4: full script + brand assets → marketing video

export type VideoAspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export interface VideoGenerationRequest {
  // Which generation stage
  stage: VideoGenerationStage;

  // Prompt (required for all stages)
  prompt: string;

  // Image URL(s) — required for image_to_video and images_to_video
  image_url?: string;
  image_urls?: string[];

  // Optional configuration
  aspect_ratio?: VideoAspectRatio;
  duration_seconds?: number;     // 4 | 5 | 10 | 15
  resolution?: '720p' | '1080p';
  fps?: 24 | 30;

  // Stage 4: script-to-video extras
  brand_name?: string;
  logo_url?: string;
  cta_text?: string;

  // Provider preference (optional — routing engine picks best if omitted)
  preferred_provider?: VideoProviderName;

  // Context
  project_id?: string;
  org_id?: string;
  user_id?: string;
}

export interface VideoJob {
  id: string;
  provider: VideoProviderName;
  provider_job_id: string;       // The real job/task ID from the provider
  status: VideoJobStatus;
  progress_pct: number;          // 0–100
  request: VideoGenerationRequest;
  output_url?: string;           // Real CDN URL of generated video from provider
  thumbnail_url?: string;
  duration_ms?: number;
  error_message?: string;
  cost_usd?: number;
  created_at: string;
  updated_at: string;
}

export interface ProviderCapabilityInfo {
  provider: VideoProviderName;
  display_name: string;
  is_configured: boolean;       // True only if API key present in env
  supported_stages: VideoGenerationStage[];
  max_duration_seconds: number;
  supported_resolutions: string[];
  supported_aspect_ratios: VideoAspectRatio[];
  avg_generation_seconds: number;
  cost_per_second_usd: number;
}

export interface CostEstimate {
  provider: VideoProviderName;
  estimated_cost_usd: number;
  estimated_latency_seconds: number;
  confidence: 'high' | 'medium' | 'low';
}

// ─── Error Types ─────────────────────────────────────────────────────────────

export interface ApiErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    request_id?: string;
  };
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(statusCode: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
