// ─────────────────────────────────────────────────────────────────────────────
// Video Template Service — Domain Types
// Defines dynamic form schemas, template categories, generation triggers,
// and admin template management contracts.
// ─────────────────────────────────────────────────────────────────────────────

export type TemplateCategory =
  | 'real_estate'
  | 'social_media'
  | 'corporate'
  | 'product'
  | 'travel'
  | 'event'
  | 'wedding';

export type TemplateFieldType = 'text' | 'textarea' | 'image' | 'images' | 'select' | 'number';

export interface TemplateField {
  key: string;
  label: string;
  type: TemplateFieldType;
  required: boolean;
  placeholder?: string;
  default_value?: string | number;
  options?: string[]; // for 'select' type
  max_items?: number; // for 'images' type
}

export interface TemplateGenerationConfig {
  stage: 'text_to_video' | 'image_to_video' | 'images_to_video' | 'script_to_video';
  preferred_provider?: string;
  aspect_ratio?: '16:9' | '9:16' | '1:1' | '4:5';
  duration_seconds?: number;
  resolution?: '720p' | '1080p';
}

export interface VideoTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  thumbnail_url?: string;
  icon?: string;
  fields: TemplateField[];
  generation_config: TemplateGenerationConfig;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateSubmissionRequest {
  template_id: string;
  field_values: Record<string, unknown>;
  project_id?: string;
  org_id?: string;
}

export interface TemplateSubmissionResult {
  job_id: string;
  provider: string;
  status: string;
  template: VideoTemplate;
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
