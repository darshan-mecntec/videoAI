export type AssetType = 'video' | 'image' | 'audio';

export interface AssetMetadata {
  resolution?: string;
  duration_sec?: number;
  fps?: number;
  sample_rate?: number;
  mime_type: string;
  file_size_bytes: number;
  prompt_used?: string;
  provider_id?: string;
  model_id?: string;
}

export interface MediaAsset {
  id: string;
  project_id: string;
  name: string;
  type: AssetType;
  url: string;
  thumbnail_url?: string;
  metadata: AssetMetadata;
  created_at: string;
}

export interface CreateAssetInput {
  project_id?: string;
  name: string;
  type: AssetType;
  url: string;
  thumbnail_url?: string;
  metadata: AssetMetadata;
}

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
