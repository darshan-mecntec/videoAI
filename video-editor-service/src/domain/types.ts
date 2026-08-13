// ─────────────────────────────────────────────────────────────────────────────
// Video Editor Service — Domain Types
// Models full 5-track editing timeline, non-destructive editing operations,
// FFmpeg rendering, and platform export presets.
// ─────────────────────────────────────────────────────────────────────────────

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '21:9';
export type ExportFormat = 'mp4' | 'mov' | 'webm' | 'gif';
export type RenderStatus = 'queued' | 'rendering' | 'succeeded' | 'failed' | 'cancelled';

export interface VideoClip {
  id: string;
  asset_url: string;
  start_ms: number;         // Start time on the timeline (ms)
  end_ms: number;           // End time on the timeline (ms)
  trim_start_ms: number;    // Source video in-point (ms)
  trim_end_ms: number;      // Source video out-point (ms)
  speed?: number;           // 0.5x, 1.0x, 1.5x, 2.0x
  volume?: number;          // 0.0 to 1.0
  opacity?: number;         // 0.0 to 1.0
}

export interface AudioClip {
  id: string;
  asset_url: string;
  start_ms: number;
  end_ms: number;
  volume: number;           // 0.0 to 1.0
  fade_in_ms?: number;
  fade_out_ms?: number;
}

export interface SubtitleClip {
  id: string;
  text: string;
  start_ms: number;
  end_ms: number;
  font_size?: number;       // e.g. 24
  font_color?: string;      // e.g. "#FFFFFF"
  bg_color?: string;        // e.g. "#00000080"
  position?: 'bottom' | 'top' | 'center';
}

export interface OverlayClip {
  id: string;
  asset_url: string;        // e.g. logo, watermark, PNG image
  start_ms: number;
  end_ms: number;
  x_pct: number;            // X position 0–100%
  y_pct: number;            // Y position 0–100%
  width_pct: number;        // Width 0–100%
  opacity: number;          // 0.0 to 1.0
}

export interface EffectItem {
  id: string;
  type: 'fade_in' | 'fade_out' | 'zoom_in' | 'color_boost' | 'blur_bg';
  start_ms: number;
  duration_ms: number;
}

export interface TimelineTracks {
  video: VideoClip[];
  audio: AudioClip[];
  subtitles: SubtitleClip[];
  overlays: OverlayClip[];
  effects: EffectItem[];
}

export interface TimelineProject {
  id: string;
  project_id?: string;
  name: string;
  duration_ms: number;
  aspect_ratio: AspectRatio;
  resolution: '720p' | '1080p' | '4k';
  tracks: TimelineTracks;
  created_at: string;
  updated_at: string;
}

// ─── Edit Operations ─────────────────────────────────────────────────────────

export type EditOperationType =
  | 'add_clip'
  | 'remove_clip'
  | 'trim_clip'
  | 'split_clip'
  | 'set_clip_speed'
  | 'set_clip_volume'
  | 'add_subtitle'
  | 'remove_subtitle'
  | 'add_overlay'
  | 'remove_overlay'
  | 'change_aspect_ratio';

export interface EditOperation {
  type: EditOperationType;
  track_type: keyof TimelineTracks;
  clip_id?: string;
  payload: Record<string, unknown>;
}

// ─── Render & Export Engine Types ────────────────────────────────────────────

export type ExportPresetName =
  | 'youtube_1080p'
  | 'instagram_reel'
  | 'tiktok'
  | 'facebook_square'
  | 'linkedin_hd'
  | 'animated_gif';

export interface ExportPresetConfig {
  name: ExportPresetName;
  display_name: string;
  aspect_ratio: AspectRatio;
  width: number;
  height: number;
  fps: number;
  video_bitrate: string;
  format: ExportFormat;
}

export interface RenderJob {
  id: string;
  timeline_id: string;
  preset: ExportPresetName;
  status: RenderStatus;
  progress_pct: number;     // 0-100
  output_url?: string;
  file_size_bytes?: number;
  duration_ms?: number;
  error_message?: string;
  created_at: string;
  finished_at?: string;
}

// ─── Error Handling ──────────────────────────────────────────────────────────

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
