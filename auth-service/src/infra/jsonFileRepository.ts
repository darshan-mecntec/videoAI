import fs from 'fs';
import path from 'path';
import { User, Organization, ApiKey, CreditLedgerRecord, WebhookEndpoint, OrgInvite, AuditLogEntry } from '../domain/types';
import { AuthRepository } from './repository';

interface StorageSchema {
  users: Record<string, User>;
  orgs: Record<string, Organization>;
  invites?: Record<string, OrgInvite>;
  auditLogs?: AuditLogEntry[];
  apiKeys: Record<string, ApiKey>;
  ledger: CreditLedgerRecord[];
  webhooks: Record<string, WebhookEndpoint>;
}

export class JsonFileAuthRepository implements AuthRepository {
  private filePath: string;

  constructor(customPath?: string) {
    this.filePath = customPath || path.join(__dirname, '../../data/auth.json');
    this.ensureFileExists();
  }

  private ensureFileExists(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      const initial: StorageSchema = { users: {}, orgs: {}, apiKeys: {}, ledger: [], webhooks: {} };
      fs.writeFileSync(this.filePath, JSON.stringify(initial, null, 2), 'utf-8');
    }
  }

  private readData(): StorageSchema {
    try {
      this.ensureFileExists();
      const content = fs.readFileSync(this.filePath, 'utf-8');
      const data = JSON.parse(content);
      return {
        users: data.users || {},
        orgs: data.orgs || {},
        apiKeys: data.apiKeys || {},
        ledger: data.ledger || [],
        webhooks: data.webhooks || {},
      };
    } catch (err) {
      return { users: {}, orgs: {}, apiKeys: {}, ledger: [], webhooks: {} };
    }
  }

  private writeData(data: StorageSchema): void {
    this.ensureFileExists();
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async findUserById(id: string): Promise<User | null> {
    const data = this.readData();
    return data.users[id] || null;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const data = this.readData();
    const target = email.toLowerCase().trim();
    for (const u of Object.values(data.users)) {
      if (u.email.toLowerCase().trim() === target) return u;
    }
    return null;
  }

  async createUser(user: User): Promise<User> {
    const data = this.readData();
    data.users[user.id] = user;
    this.writeData(data);
    return user;
  }

  async updateUser(user: User): Promise<User> {
    const data = this.readData();
    data.users[user.id] = user;
    this.writeData(data);
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const data = this.readData();
    delete data.users[id];
    this.writeData(data);
    return true;
  }

  async listUsersByOrg(orgId: string): Promise<User[]> {
    const data = this.readData();
    return Object.values(data.users).filter((u) => u.org_id === orgId);
  }

  async listAllUsers(): Promise<User[]> {
    const data = this.readData();
    return Object.values(data.users);
  }

  async findOrgs(): Promise<Organization[]> {
    const data = this.readData();
    return Object.values(data.orgs);
  }

  async findOrgById(id: string): Promise<Organization | null> {
    const data = this.readData();
    return data.orgs[id] || null;
  }

  async createOrg(org: Organization): Promise<Organization> {
    const data = this.readData();
    data.orgs[org.id] = org;
    this.writeData(data);
    return org;
  }

  async updateOrg(org: Organization): Promise<Organization> {
    const data = this.readData();
    data.orgs[org.id] = org;
    this.writeData(data);
    return org;
  }

  async createInvite(invite: OrgInvite): Promise<OrgInvite> {
    const data = this.readData();
    if (!data.invites) data.invites = {};
    data.invites[invite.id] = invite;
    this.writeData(data);
    return invite;
  }

  async findInviteByToken(token: string): Promise<OrgInvite | null> {
    const data = this.readData();
    if (!data.invites) return null;
    for (const inv of Object.values(data.invites)) {
      if (inv.token === token) return inv;
    }
    return null;
  }

  async listInvitesByOrg(orgId: string): Promise<OrgInvite[]> {
    const data = this.readData();
    if (!data.invites) return [];
    return Object.values(data.invites).filter((i) => i.org_id === orgId);
  }

  async updateInvite(invite: OrgInvite): Promise<OrgInvite> {
    const data = this.readData();
    if (!data.invites) data.invites = {};
    data.invites[invite.id] = invite;
    this.writeData(data);
    return invite;
  }

  async addAuditLog(entry: AuditLogEntry): Promise<AuditLogEntry> {
    const data = this.readData();
    if (!data.auditLogs) data.auditLogs = [];
    data.auditLogs.unshift(entry);
    this.writeData(data);
    return entry;
  }

  async getAuditLogs(orgId: string): Promise<AuditLogEntry[]> {
    const data = this.readData();
    if (!data.auditLogs) return [];
    return data.auditLogs.filter((a) => a.org_id === orgId || !orgId);
  }

  async findApiKeys(orgId: string): Promise<ApiKey[]> {
    const data = this.readData();
    return Object.values(data.apiKeys).filter((k) => k.org_id === orgId && k.status === 'active');
  }

  async findApiKeyById(id: string): Promise<ApiKey | null> {
    const data = this.readData();
    return data.apiKeys[id] || null;
  }

  async createApiKey(key: ApiKey): Promise<ApiKey> {
    const data = this.readData();
    data.apiKeys[key.id] = key;
    this.writeData(data);
    return key;
  }

  async revokeApiKey(id: string): Promise<boolean> {
    const data = this.readData();
    if (!data.apiKeys[id]) return false;
    data.apiKeys[id].status = 'revoked';
    this.writeData(data);
    return true;
  }

  async addLedgerRecord(record: CreditLedgerRecord): Promise<CreditLedgerRecord> {
    const data = this.readData();
    data.ledger.unshift(record);
    this.writeData(data);
    return record;
  }

  async getLedgerRecords(userId?: string, orgId?: string): Promise<CreditLedgerRecord[]> {
    const data = this.readData();
    return data.ledger.filter(r => {
      if (userId && r.userId !== userId) return false;
      if (orgId && r.orgId !== orgId) return false;
      return true;
    });
  }

  async getLedgerAnalytics(orgId?: string): Promise<{ totalCreditsConsumed: number; totalProviderCostUsd: number; byModel: Record<string, number> }> {
    const records = await this.getLedgerRecords(undefined, orgId);
    let totalCreditsConsumed = 0;
    let totalProviderCostUsd = 0;
    const byModel: Record<string, number> = {};

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
    const data = this.readData();
    return Object.values(data.webhooks).filter((w) => w.org_id === orgId);
  }

  async createWebhook(webhook: WebhookEndpoint): Promise<WebhookEndpoint> {
    const data = this.readData();
    data.webhooks[webhook.id] = webhook;
    this.writeData(data);
    return webhook;
  }

  async deleteWebhook(id: string): Promise<boolean> {
    const data = this.readData();
    if (!data.webhooks[id]) return false;
    delete data.webhooks[id];
    this.writeData(data);
    return true;
  }
}

