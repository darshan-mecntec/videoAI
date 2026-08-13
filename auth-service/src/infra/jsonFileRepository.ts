import fs from 'fs';
import path from 'path';
import { User, Organization, ApiKey } from '../domain/types';
import { AuthRepository } from './repository';

interface StorageSchema {
  users: Record<string, User>;
  orgs: Record<string, Organization>;
  apiKeys: Record<string, ApiKey>;
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
      const initial: StorageSchema = { users: {}, orgs: {}, apiKeys: {} };
      fs.writeFileSync(this.filePath, JSON.stringify(initial, null, 2), 'utf-8');
    }
  }

  private readData(): StorageSchema {
    try {
      this.ensureFileExists();
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content) as StorageSchema;
    } catch (err) {
      return { users: {}, orgs: {}, apiKeys: {} };
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

  async findApiKeys(orgId: string): Promise<ApiKey[]> {
    const data = this.readData();
    return Object.values(data.apiKeys).filter((k) => k.org_id === orgId);
  }

  async createApiKey(key: ApiKey): Promise<ApiKey> {
    const data = this.readData();
    data.apiKeys[key.id] = key;
    this.writeData(data);
    return key;
  }
}
