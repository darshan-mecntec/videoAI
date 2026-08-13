export type UserRole = 'super_admin' | 'org_admin' | 'editor' | 'member' | 'viewer';

export type Permission =
  | 'platform:admin'
  | 'providers:write'
  | 'providers:read'
  | 'credits:manage'
  | 'credits:view'
  | 'users:write'
  | 'users:read'
  | 'video:generate'
  | 'image:generate'
  | 'audio:generate'
  | 'assets:read'
  | 'assets:delete'
  | 'billing:view'
  | 'apikeys:manage'
  | 'pool:manage'
  | 'audit:read';

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash?: string;
  avatar_url?: string;
  org_id: string;
  role: UserRole;
  permissions: Permission[];
  credits_balance: number;
  credits_reserved: number;
  status: 'active' | 'suspended';
  created_at: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  org_id: string;
  role: UserRole;
  permissions: Permission[];
  iat?: number;
  exp?: number;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  created_at: string;
}

export interface ApiKey {
  id: string;
  org_id: string;
  name: string;
  key_hint: string;
  secret: string;
  created_at: string;
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

