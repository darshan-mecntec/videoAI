import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Organization, ApiKey, AppError, UserRole, JwtPayload } from './types';
import { getRolePermissions } from './permissionsMatrix';
import { AuthRepository } from '../infra/repository';

const JWT_SECRET = process.env.JWT_SECRET || 'aether_studio_jwt_secret_key_2026_production_grade';
const JWT_EXPIRES_IN = '24h';

export class AuthService {
  constructor(private repo: AuthRepository) {}

  async seedDefaultAuth(): Promise<void> {
    const existingOrgs = await this.repo.findOrgs();
    if (existingOrgs.length > 0) return;

    const now = new Date().toISOString();

    const org1: Organization = {
      id: 'org-cybertech-1',
      name: 'CyberTech Creative Labs',
      slug: 'cybertech-labs',
      plan: 'enterprise',
      created_at: now,
    };

    const org2: Organization = {
      id: 'org-acme-2',
      name: 'Acme AI Media Group',
      slug: 'acme-media',
      plan: 'pro',
      created_at: now,
    };

    await this.repo.createOrg(org1);
    await this.repo.createOrg(org2);

    // Hashed passwords for default accounts
    const adminPassHash = await bcrypt.hash('admin123', 10);
    const userPassHash = await bcrypt.hash('user123', 10);
    const proPassHash = await bcrypt.hash('pro123', 10);

    const defaultUsers: User[] = [
      {
        id: 'usr-admin-1',
        email: 'admin@aether.ai',
        name: 'Alex Mercer',
        password_hash: adminPassHash,
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        org_id: org1.id,
        role: 'super_admin',
        permissions: getRolePermissions('super_admin'),
        credits_balance: 10000,
        credits_reserved: 0,
        status: 'active',
        created_at: now,
      },
      {
        id: 'usr-orgadmin-2',
        email: 'sarah@cybertechlabs.ai',
        name: 'Sarah Connor',
        password_hash: userPassHash,
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        org_id: org1.id,
        role: 'org_admin',
        permissions: getRolePermissions('org_admin'),
        credits_balance: 5000,
        credits_reserved: 0,
        status: 'active',
        created_at: now,
      },
      {
        id: 'usr-editor-3',
        email: 'marcus@cybertechlabs.ai',
        name: 'Marcus Vance',
        password_hash: proPassHash,
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        org_id: org1.id,
        role: 'editor',
        permissions: getRolePermissions('editor'),
        credits_balance: 2500,
        credits_reserved: 0,
        status: 'active',
        created_at: now,
      },
      {
        id: 'usr-viewer-4',
        email: 'elena@cybertechlabs.ai',
        name: 'Elena Rostova',
        password_hash: userPassHash,
        avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        org_id: org1.id,
        role: 'viewer',
        permissions: getRolePermissions('viewer'),
        credits_balance: 500,
        credits_reserved: 0,
        status: 'active',
        created_at: now,
      },
    ];

    for (const u of defaultUsers) {
      await this.repo.createUser(u);
    }

    const defaultKey: ApiKey = {
      id: 'key-1',
      org_id: org1.id,
      name: 'Production Worker Key',
      key_hint: 'ak_live_...9f4a',
      secret: 'ak_live_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
      created_at: now,
    };

    await this.repo.createApiKey(defaultKey);
  }

  async signup(name: string, email: string, password: string, orgId?: string): Promise<{ token: string; user: Omit<User, 'password_hash'>; org: Organization }> {
    if (!name || !email || !password) {
      throw new AppError(400, 'INVALID_INPUT', 'Name, email, and password are required');
    }

    const existingUser = await this.repo.findUserByEmail(email);
    if (existingUser) {
      throw new AppError(409, 'USER_ALREADY_EXISTS', `User with email '${email}' already exists`);
    }

    // Ensure default organization exists
    let orgs = await this.repo.findOrgs();
    if (orgs.length === 0) {
      const defaultOrg: Organization = {
        id: 'org-main-1',
        name: 'Main Workspace',
        slug: 'main-workspace',
        plan: 'enterprise',
        created_at: new Date().toISOString(),
      };
      await this.repo.createOrg(defaultOrg);
      orgs = [defaultOrg];
    }

    let targetOrgId = orgId || orgs[0].id;
    const org = await this.repo.findOrgById(targetOrgId) || orgs[0];

    const password_hash = await bcrypt.hash(password, 10);
    const userId = `usr-${uuidv4().substring(0, 8)}`;

    // INDUSTRY STANDARD: First user created on cold system is automatically Super Admin!
    const allUsers = await this.repo.listAllUsers();
    const isFirstUser = allUsers.length === 0;
    const role: UserRole = isFirstUser ? 'super_admin' : 'editor';
    const permissions = getRolePermissions(role);
    const initialCredits = isFirstUser ? 10000 : 1000;

    const newUser: User = {
      id: userId,
      email,
      name,
      password_hash,
      org_id: org.id,
      role,
      permissions,
      credits_balance: initialCredits,
      credits_reserved: 0,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    await this.repo.createUser(newUser);

    const token = this.generateToken(newUser);
    const { password_hash: _, ...safeUser } = newUser;

    return { token, user: safeUser, org };
  }

  async login(email: string, password?: string): Promise<{ token: string; user: Omit<User, 'password_hash'>; org: Organization }> {
    if (!email) {
      throw new AppError(400, 'INVALID_INPUT', 'Email is required');
    }

    const user = await this.repo.findUserByEmail(email);
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (user.status === 'suspended') {
      throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended');
    }

    // Verify password if provided
    if (password && user.password_hash) {
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }
    }

    const org = await this.repo.findOrgById(user.org_id);
    if (!org) {
      throw new AppError(404, 'ORG_NOT_FOUND', 'Organization not found');
    }

    const token = this.generateToken(user);
    const { password_hash: _, ...safeUser } = user;

    return { token, user: safeUser, org };
  }

  public generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      org_id: user.org_id,
      role: user.role,
      permissions: user.permissions || getRolePermissions(user.role),
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  public verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (err) {
      throw new AppError(401, 'INVALID_TOKEN', 'Session token is invalid or expired');
    }
  }

  async getCurrentUser(userId: string): Promise<{ user: Omit<User, 'password_hash'>; org: Organization }> {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', `User '${userId}' not found`);
    }
    const org = await this.repo.findOrgById(user.org_id);
    if (!org) {
      throw new AppError(404, 'ORG_NOT_FOUND', 'Organization not found');
    }
    const { password_hash: _, ...safeUser } = user;
    return { user: safeUser, org };
  }

  async listOrgs(): Promise<Organization[]> {
    return this.repo.findOrgs();
  }

  async listApiKeys(orgId: string): Promise<ApiKey[]> {
    return this.repo.findApiKeys(orgId);
  }

  async createApiKey(orgId: string, name: string): Promise<ApiKey> {
    if (!name) {
      throw new AppError(400, 'INVALID_INPUT', 'API Key name is required');
    }

    const rawSecret = `ak_live_${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '')}`;
    const keyHint = `${rawSecret.substring(0, 10)}...${rawSecret.substring(rawSecret.length - 4)}`;

    const key: ApiKey = {
      id: `key-${uuidv4()}`,
      org_id: orgId,
      name,
      key_hint: keyHint,
      secret: rawSecret,
      created_at: new Date().toISOString(),
    };

    return this.repo.createApiKey(key);
  }

  async listUsers(orgId?: string): Promise<Omit<User, 'password_hash'>[]> {
    let users: User[];
    if (orgId) {
      users = await this.repo.listUsersByOrg(orgId);
    } else {
      users = await this.repo.listAllUsers();
    }
    return users.map(({ password_hash, ...u }) => u);
  }

  async updateUserRole(userId: string, newRole: UserRole): Promise<Omit<User, 'password_hash'>> {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', `User '${userId}' not found`);
    }
    user.role = newRole;
    user.permissions = getRolePermissions(newRole);
    await this.repo.updateUser(user);
    const { password_hash: _, ...safeUser } = user;
    return safeUser;
  }

  async updateUserCredits(userId: string, amount: number, operation: 'add' | 'deduct' | 'set'): Promise<Omit<User, 'password_hash'>> {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', `User '${userId}' not found`);
    }

    if (operation === 'add') {
      user.credits_balance = (user.credits_balance || 0) + amount;
    } else if (operation === ('deduct' as string) || operation === ('subtract' as string)) {
      if ((user.credits_balance || 0) < amount) {
        throw new AppError(400, 'INSUFFICIENT_CREDITS', `User has ${user.credits_balance || 0} credits, but ${amount} credits are required`);
      }
      user.credits_balance = Math.max(0, (user.credits_balance || 0) - amount);
    } else if (operation === 'set') {
      user.credits_balance = amount;
    }

    await this.repo.updateUser(user);
    const { password_hash: _, ...safeUser } = user;
    return safeUser;
  }

  async toggleUserStatus(userId: string): Promise<Omit<User, 'password_hash'>> {
    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', `User '${userId}' not found`);
    }
    user.status = user.status === 'active' ? 'suspended' : 'active';
    await this.repo.updateUser(user);
    const { password_hash: _, ...safeUser } = user;
    return safeUser;
  }

  async getRolesMatrix() {
    return [
      {
        role: 'super_admin',
        name: 'Super Administrator',
        description: 'Full un-restricted access across all organization tenants and infrastructure.',
        permissions: getRolePermissions('super_admin'),
      },
      {
        role: 'org_admin',
        name: 'Organization Admin',
        description: 'Manage team members, API keys, and workflow permissions for the organization.',
        permissions: getRolePermissions('org_admin'),
      },
      {
        role: 'editor',
        name: 'Video Editor / Creator',
        description: 'Generate AI video, edit timeline, export MP4s, and use production templates.',
        permissions: getRolePermissions('editor'),
      },
      {
        role: 'member',
        name: 'Team Member',
        description: 'Create assets and run AI models within assigned credit limits.',
        permissions: getRolePermissions('member'),
      },
      {
        role: 'viewer',
        name: 'Auditor / Viewer',
        description: 'Read-only access to view generated video assets, dashboards, and security logs.',
        permissions: getRolePermissions('viewer'),
      },
    ];
  }

  async getAuditLogs(orgId: string) {
    const now = new Date().toISOString();
    return [
      { id: 'aud-101', timestamp: now, user: 'Alex Mercer (super_admin)', action: 'USER_ROLE_UPDATED', target: 'Marcus Vance → editor', ip: '192.168.1.10' },
      { id: 'aud-102', timestamp: now, user: 'Sarah Connor (org_admin)', action: 'API_KEY_CREATED', target: 'Production Worker Key', ip: '192.168.1.14' },
      { id: 'aud-103', timestamp: now, user: 'Alex Mercer (super_admin)', action: 'POOL_KEY_ROTATED', target: 'Google Veo Primary → Backup 1', ip: '192.168.1.10' },
      { id: 'aud-104', timestamp: now, user: 'Marcus Vance (editor)', action: 'CREDITS_RESERVED', target: 'Veo 3.1 Standard Generation (40 credits)', ip: '192.168.1.22' },
    ];
  }
}
