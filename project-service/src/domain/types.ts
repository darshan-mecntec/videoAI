export interface Project {
  id: string;
  org_id: string;
  name: string;
  description: string;
  is_default: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  asset_url: string;
  snapshot_note: string;
  created_at: string;
}

export interface CreateProjectInput {
  org_id?: string;
  name: string;
  description?: string;
  is_default?: boolean;
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
