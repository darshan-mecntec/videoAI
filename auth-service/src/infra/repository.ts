import { User, Organization, ApiKey, CreditLedgerRecord, WebhookEndpoint, OrgInvite, AuditLogEntry } from '../domain/types';

export interface AuthRepository {
  findUserById(id: string): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  createUser(user: User): Promise<User>;
  updateUser(user: User): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
  listUsersByOrg(orgId: string): Promise<User[]>;
  listAllUsers(): Promise<User[]>;

  findOrgs(): Promise<Organization[]>;
  findOrgById(id: string): Promise<Organization | null>;
  createOrg(org: Organization): Promise<Organization>;
  updateOrg(org: Organization): Promise<Organization>;

  createInvite(invite: OrgInvite): Promise<OrgInvite>;
  findInviteByToken(token: string): Promise<OrgInvite | null>;
  listInvitesByOrg(orgId: string): Promise<OrgInvite[]>;
  updateInvite(invite: OrgInvite): Promise<OrgInvite>;

  addAuditLog(entry: AuditLogEntry): Promise<AuditLogEntry>;
  getAuditLogs(orgId: string): Promise<AuditLogEntry[]>;

  findApiKeys(orgId: string): Promise<ApiKey[]>;
  findApiKeyById(id: string): Promise<ApiKey | null>;
  createApiKey(key: ApiKey): Promise<ApiKey>;
  revokeApiKey(id: string): Promise<boolean>;

  addLedgerRecord(record: CreditLedgerRecord): Promise<CreditLedgerRecord>;
  getLedgerRecords(userId?: string, orgId?: string): Promise<CreditLedgerRecord[]>;
  getLedgerAnalytics(orgId?: string): Promise<{ totalCreditsConsumed: number; totalProviderCostUsd: number; byModel: Record<string, number> }>;

  findWebhooks(orgId: string): Promise<WebhookEndpoint[]>;
  createWebhook(webhook: WebhookEndpoint): Promise<WebhookEndpoint>;
  deleteWebhook(id: string): Promise<boolean>;
}

export class InMemoryAuthRepository implements AuthRepository {
  private users: Map<string, User> = new Map();
  private orgs: Map<string, Organization> = new Map();
  private apiKeys: Map<string, ApiKey> = new Map();
  private ledgerRecords: CreditLedgerRecord[] = [];
  private webhooks: Map<string, WebhookEndpoint> = new Map();

  async findUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return null;
  }

  async createUser(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async listUsersByOrg(orgId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter((u) => u.org_id === orgId);
  }

  async listAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async findOrgs(): Promise<Organization[]> {
    return Array.from(this.orgs.values());
  }

  async findOrgById(id: string): Promise<Organization | null> {
    return this.orgs.get(id) || null;
  }

  private invites: Map<string, OrgInvite> = new Map();
  private auditLogs: AuditLogEntry[] = [];

  async createOrg(org: Organization): Promise<Organization> {
    this.orgs.set(org.id, org);
    return org;
  }

  async updateOrg(org: Organization): Promise<Organization> {
    this.orgs.set(org.id, org);
    return org;
  }

  async createInvite(invite: OrgInvite): Promise<OrgInvite> {
    this.invites.set(invite.id, invite);
    return invite;
  }

  async findInviteByToken(token: string): Promise<OrgInvite | null> {
    for (const inv of this.invites.values()) {
      if (inv.token === token) return inv;
    }
    return null;
  }

  async listInvitesByOrg(orgId: string): Promise<OrgInvite[]> {
    return Array.from(this.invites.values()).filter(i => i.org_id === orgId);
  }

  async updateInvite(invite: OrgInvite): Promise<OrgInvite> {
    this.invites.set(invite.id, invite);
    return invite;
  }

  async addAuditLog(entry: AuditLogEntry): Promise<AuditLogEntry> {
    this.auditLogs.unshift(entry);
    return entry;
  }

  async getAuditLogs(orgId: string): Promise<AuditLogEntry[]> {
    return this.auditLogs.filter(a => a.org_id === orgId || !orgId);
  }

  async findApiKeys(orgId: string): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values()).filter((k) => k.org_id === orgId && k.status === 'active');
  }

  async findApiKeyById(id: string): Promise<ApiKey | null> {
    return this.apiKeys.get(id) || null;
  }

  async createApiKey(key: ApiKey): Promise<ApiKey> {
    this.apiKeys.set(key.id, key);
    return key;
  }

  async revokeApiKey(id: string): Promise<boolean> {
    const key = this.apiKeys.get(id);
    if (!key) return false;
    key.status = 'revoked';
    return true;
  }

  async addLedgerRecord(record: CreditLedgerRecord): Promise<CreditLedgerRecord> {
    this.ledgerRecords.unshift(record);
    return record;
  }

  async getLedgerRecords(userId?: string, orgId?: string): Promise<CreditLedgerRecord[]> {
    return this.ledgerRecords.filter(r => {
      if (userId && r.userId !== userId) return false;
      if (orgId && r.orgId !== orgId) return false;
      return true;
    });
  }

  async getLedgerAnalytics(orgId?: string): Promise<{ totalCreditsConsumed: number; totalProviderCostUsd: number; byModel: Record<string, number> }> {
    let totalCreditsConsumed = 0;
    let totalProviderCostUsd = 0;
    const byModel: Record<string, number> = {};

    const records = await this.getLedgerRecords(undefined, orgId);
    for (const r of records) {
      if (r.type === 'COMMIT' || r.type === 'RESERVE') {
        totalCreditsConsumed += r.amount;
        totalProviderCostUsd += r.providerCostUsd || 0;
        if (r.modelId) {
          byModel[r.modelId] = (byModel[r.modelId] || 0) + r.amount;
        }
      }
    }

    return {
      totalCreditsConsumed,
      totalProviderCostUsd: Number(totalProviderCostUsd.toFixed(4)),
      byModel,
    };
  }

  async findWebhooks(orgId: string): Promise<WebhookEndpoint[]> {
    return Array.from(this.webhooks.values()).filter(w => w.org_id === orgId);
  }

  async createWebhook(webhook: WebhookEndpoint): Promise<WebhookEndpoint> {
    this.webhooks.set(webhook.id, webhook);
    return webhook;
  }

  async deleteWebhook(id: string): Promise<boolean> {
    return this.webhooks.delete(id);
  }
}


