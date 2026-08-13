export interface DispatchExecutionRequest {
  workflow_id?: string;
  step_id?: string;
  capability_type: string;
  provider_id?: string;
  model_id?: string;
  params: Record<string, unknown>;
  inputs?: Record<string, unknown>;
}

export interface DispatchExecutionResult {
  execution_id: string;
  status: 'succeeded' | 'failed';
  provider_used: string;
  model_used: string;
  capability_type: string;
  output_asset: {
    name: string;
    type: 'video' | 'image' | 'audio';
    url: string;
    thumbnail_url?: string;
    resolution?: string;
    duration_sec?: number;
  };
  metrics: {
    latency_ms: number;
    cost_usd: number;
    tokens_consumed?: number;
  };
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
