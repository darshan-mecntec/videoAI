import { User, Organization, ApiKey } from '../domain/types';

export interface AuthRepository {
  findUserById(id: string): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  createUser(user: User): Promise<User>;
  updateUser(user: User): Promise<User>;
  listUsersByOrg(orgId: string): Promise<User[]>;
  listAllUsers(): Promise<User[]>;

  findOrgs(): Promise<Organization[]>;
  findOrgById(id: string): Promise<Organization | null>;
  createOrg(org: Organization): Promise<Organization>;

  findApiKeys(orgId: string): Promise<ApiKey[]>;
  createApiKey(key: ApiKey): Promise<ApiKey>;
}

export class InMemoryAuthRepository implements AuthRepository {
  private users: Map<string, User> = new Map();
  private orgs: Map<string, Organization> = new Map();
  private apiKeys: Map<string, ApiKey> = new Map();

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

  async createOrg(org: Organization): Promise<Organization> {
    this.orgs.set(org.id, org);
    return org;
  }

  async findApiKeys(orgId: string): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values()).filter((k) => k.org_id === orgId);
  }

  async createApiKey(key: ApiKey): Promise<ApiKey> {
    this.apiKeys.set(key.id, key);
    return key;
  }
}

