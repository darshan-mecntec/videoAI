export type CapabilityType =
  | 'text-to-image'
  | 'image-to-image'
  | 'inpainting'
  | 'text-to-video'
  | 'text-to-audio'
  | 'voice-clone'
  | 'avatar-lipsync'
  | 'upscale';

export type StrategyPreference = 'lowest_cost' | 'highest_quality' | 'lowest_latency' | 'balanced';

export interface RouteRequest {
  request_id: string;
  capability_type: CapabilityType;
  region?: string;
  org_id?: string;
  strategy_preference?: StrategyPreference;
  max_cost_usd?: number;
  required_params?: Record<string, unknown>;
}

export interface ProviderCapabilityCandidate {
  provider_id: string;
  slug: string;
  capability_id: string;
  model_id: string;
  quality_score: number; // 0.0 to 1.0
  cost_estimate_usd: number;
  latency_estimate_ms: number;
  availability_7d: number; // 0.0 to 1.0
  region_codes: string[];
  status: string;
}

export interface CandidateScore {
  provider_id: string;
  slug: string;
  capability_id: string;
  model_id: string;
  total_score: number; // 0.0 to 1.0
  cost_score: number;
  quality_score: number;
  latency_score: number;
  availability_score: number;
  estimated_cost_usd: number;
  estimated_latency_ms: number;
}

export interface RouteDecision {
  request_id: string;
  capability_type: CapabilityType;
  selected_provider: CandidateScore;
  fallback_chain: CandidateScore[];
  evaluated_at: string;
}

export interface OrgPolicy {
  org_id: string;
  default_strategy: StrategyPreference;
  max_budget_per_request_usd: number | null;
  blacklisted_provider_ids: string[];
}

export interface ExecutionFeedback {
  call_id: string;
  provider_id: string;
  capability_type: CapabilityType;
  success: boolean;
  latency_ms: number;
  cost_usd: number;
  error_code?: string;
  attempt_number: number;
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
