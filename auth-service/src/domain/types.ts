export type UserRole = 'super_admin' | 'member';

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
  | 'audit:read'
  | 'webhooks:manage';

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
  max_concurrent_jobs?: number;
  created_at: string;
}

export interface OrgInvite {
  id: string;
  org_id: string;
  email: string;
  role: UserRole;
  token: string;
  status: 'pending' | 'accepted' | 'revoked';
  expires_at: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  org_id: string;
  user_id: string;
  user_email: string;
  action: string;
  target: string;
  ip: string;
  timestamp: string;
}

export interface ApiKey {
  id: string;
  org_id: string;
  name: string;
  key_hint: string;
  secret_hash: string;
  secret_raw?: string; // Only returned once on creation
  scopes: string[];
  expires_at?: string | null;
  last_used_at?: string | null;
  status: 'active' | 'revoked';
  created_at: string;
}

export interface CreditLedgerRecord {
  id: string;
  userId: string;
  orgId: string;
  modelId?: string;
  amount: number;
  type: 'RESERVE' | 'COMMIT' | 'REFUND' | 'TOPUP' | 'SUBSCRIPTION' | 'GRANT';
  status: 'COMPLETED' | 'PENDING' | 'ROLLED_BACK';
  description: string;
  providerCostUsd?: number;
  timestamp: string;
}

export interface WebhookEndpoint {
  id: string;
  org_id: string;
  url: string;
  description: string;
  secret: string;
  events: string[];
  status: 'active' | 'paused';
  created_at: string;
  last_dispatched_at?: string | null;
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


