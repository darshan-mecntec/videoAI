export type ProviderStatus = 'active' | 'disabled' | 'deprecated';

export type CapabilityType =
  | 'text-to-image'
  | 'image-to-image'
  | 'inpainting'
  | 'text-to-video'
  | 'text-to-audio'
  | 'voice-clone'
  | 'avatar-lipsync'
  | 'upscale'
  | 'text-to-text';

export type PricingModel = 'per-image' | 'per-second' | 'per-token' | 'per-call' | 'per-text';

export type HealthStatusType = 'healthy' | 'degraded' | 'unavailable';

export type EnvironmentType = 'production' | 'staging';

export interface Provider {
  id: string;
  slug: string;
  display_name: string;
  status: ProviderStatus;
  region_codes: string[];
  org_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Capability {
  id: string;
  provider_id: string;
  capability_type: CapabilityType;
  model_id: string;
  max_resolution: string | null;
  supported_params: Record<string, unknown>;
  quality_score: number; // 0.0 to 1.0
  pricing_model: PricingModel;
}

export interface PricingEntry {
  id: string;
  capability_id: string;
  unit: string;
  cost_usd: number;
  effective_from: string;
  effective_until: string | null;
}

export interface HealthRecord {
  id: string;
  provider_id: string;
  checked_at: string;
  latency_ms: number;
  status: HealthStatusType;
  error_message: string | null;
  availability_7d: number; // 0.0 to 1.0
}

export interface RateLimit {
  id: string;
  provider_id: string;
  capability_id: string | null;
  requests_per_min: number;
  tokens_per_min: number | null;
  concurrency_cap: number | null;
}

export interface CredentialRef {
  id: string;
  provider_id: string;
  secret_key: string; // Vault path / Secrets Manager key reference (for production)
  api_key?: string; // Direct API key (for development only)
  environment: EnvironmentType;
}

// API Error Schema as mandated by 05_API_GUIDELINES.md
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
