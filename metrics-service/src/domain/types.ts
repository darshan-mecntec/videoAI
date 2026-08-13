export interface MicroserviceHealthSignal {
  service_name: string;
  port: number;
  status: 'healthy' | 'degraded' | 'down';
  latency_ms: number;
  last_heartbeat: string;
}

export interface SystemMetrics {
  total_requests: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  error_rate_pct: number;
  active_services_count: number;
  services: MicroserviceHealthSignal[];
  providers_status: Array<{ provider_id: string; name: string; status: string; uptime_7d: number }>;
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
