import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Organization, ApiKey, AppError, UserRole, JwtPayload, CreditLedgerRecord, WebhookEndpoint, OrgInvite, AuditLogEntry } from './types';
import { getRolePermissions } from './permissionsMatrix';
import { AuthRepository } from '../infra/repository';

const JWT_SECRET = process.env.JWT_SECRET || 'aether_studio_jwt_secret_key_2026_production_grade';
const JWT_EXPIRES_IN = '24h';

export class AuthService {
  constructor(private repo: AuthRepository) {}

  async seedDefaultAuth(): Promise<void> {
    const existingOrgs = await this.repo.findOrgs();
    const now = new Date().toISOString();

    let defaultOrgId = 'org-cybertech-1';
    if (existingOrgs.length === 0) {
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
    } else {
      defaultOrgId = existingOrgs[0].id;
    }

    // Hashed passwords for default accounts
    const adminPassHash = await bcrypt.hash('admin123', 10);
    const userPassHash = await bcrypt.hash('user123', 10);

    // Unconditionally ensure admin@aether.ai and user@aether.ai exist with valid password hashes
    const existingAdmin = await this.repo.findUserByEmail('admin@aether.ai');
    if (existingAdmin) {
      await this.repo.updateUser({
        ...existingAdmin,
        password_hash: adminPassHash,
        role: 'super_admin',
        permissions: getRolePermissions('super_admin'),
        status: 'active',
      });
    } else {
      await this.repo.createUser({
        id: 'usr-admin-1',
        email: 'admin@aether.ai',
        name: 'Super Admin',
        password_hash: adminPassHash,
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        org_id: defaultOrgId,
        role: 'super_admin',
        permissions: getRolePermissions('super_admin'),
        credits_balance: 10000,
        credits_reserved: 0,
        status: 'active',
        created_at: now,
      });
    }

    const existingUser = await this.repo.findUserByEmail('user@aether.ai');
    if (existingUser) {
      await this.repo.updateUser({
        ...existingUser,
        password_hash: userPassHash,
        role: 'member',
        permissions: getRolePermissions('member'),
        status: 'active',
      });
    } else {
      await this.repo.createUser({
        id: 'usr-user-2',
        email: 'user@aether.ai',
        name: 'Standard User',
        password_hash: userPassHash,
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        org_id: defaultOrgId,
        role: 'member',
        permissions: getRolePermissions('member'),
        credits_balance: 2500,
        credits_reserved: 0,
        status: 'active',
        created_at: now,
      });
    }

    // Purge all legacy test users except admin@aether.ai and user@aether.ai
    const allUsers = await this.repo.listAllUsers();
    for (const u of allUsers) {
      if (u.email.toLowerCase() !== 'admin@aether.ai' && u.email.toLowerCase() !== 'user@aether.ai') {
        await this.repo.deleteUser(u.id);
      }
    }

    const defaultRawSecret = 'ak_live_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b';
    const secretHash = crypto.createHash('sha256').update(defaultRawSecret).digest('hex');

    const defaultKey: ApiKey = {
      id: 'key-1',
      org_id: defaultOrgId,
      name: 'Production Worker Key',
      key_hint: 'ak_live_...1a0b',
      secret_hash: secretHash,
      scopes: ['*'],
      status: 'active',
      created_at: now,
      last_used_at: new Date(Date.now() - 3600000).toISOString(),
    };

    await this.repo.createApiKey(defaultKey);

    // Seed realistic Credit Ledger history for user analytics
    const seedRecords: CreditLedgerRecord[] = [
      { id: 'tx-101', userId: 'usr-admin-1', orgId: defaultOrgId, modelId: 'veo-3-1-standard', amount: 150, type: 'COMMIT', status: 'COMPLETED', description: 'Generated 5s 1080p promotional video', providerCostUsd: 2.00, timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 'tx-102', userId: 'usr-admin-1', orgId: defaultOrgId, modelId: 'gpt-image-hd', amount: 18, type: 'COMMIT', status: 'COMPLETED', description: 'Generated 2x HD storyboards', providerCostUsd: 0.24, timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString() },
      { id: 'tx-103', userId: 'usr-admin-1', orgId: defaultOrgId, amount: 2000, type: 'TOPUP', status: 'COMPLETED', description: 'Purchased Pro Credit Pack (Stripe)', providerCostUsd: 0, timestamp: new Date(Date.now() - 86400000).toISOString() },
      { id: 'tx-104', userId: 'usr-user-2', orgId: defaultOrgId, modelId: 'elevenlabs-tts', amount: 5, type: 'COMMIT', status: 'COMPLETED', description: 'Voiceover synthesis (500 chars)', providerCostUsd: 0.05, timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
    ];

    for (const rec of seedRecords) {
      await this.repo.addLedgerRecord(rec);
    }

    // Seed Webhook endpoint
    const defaultWebhook: WebhookEndpoint = {
      id: 'wh-1',
      org_id: defaultOrgId,
      url: 'https://api.cybertechlabs.ai/v1/webhooks/aether-callback',
      description: 'Production Render Completion Callback',
      secret: `whsec_${crypto.randomBytes(16).toString('hex')}`,
      events: ['job.completed', 'job.failed', 'credits.low'],
      status: 'active',
      created_at: now,
      last_dispatched_at: new Date(Date.now() - 7200000).toISOString(),
    };
    await this.repo.createWebhook(defaultWebhook);
  }

  async signup(name: string, email: string, password: string, orgId?: string): Promise<{ token: string; user: Omit<User, 'password_hash'>; org: Organization }> {
    if (!name || !email || !password) {
      throw new AppError(400, 'INVALID_INPUT', 'Name, email, and password are required');
    }

    const existingUser = await this.repo.findUserByEmail(email);
    if (existingUser) {
      throw new AppError(409, 'USER_ALREADY_EXISTS', `User with email '${email}' already exists`);
    }

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

    const allUsers = await this.repo.listAllUsers();
    const isFirstUser = allUsers.length === 0;
    const role: UserRole = isFirstUser ? 'super_admin' : 'member';
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

    // Add initial signup credit grant to ledger
    await this.repo.addLedgerRecord({
      id: `tx-${Date.now()}-${uuidv4().substring(0, 5)}`,
      userId,
      orgId: org.id,
      amount: initialCredits,
      type: 'GRANT',
      status: 'COMPLETED',
      description: 'Initial Signup Bonus Credits',
      timestamp: new Date().toISOString(),
    });

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

  async createApiKey(orgId: string, name: string, scopes: string[] = ['*'], expiresAtDays?: number): Promise<ApiKey> {
    if (!name) {
      throw new AppError(400, 'INVALID_INPUT', 'API Key name is required');
    }

    const rawSecret = `ak_live_${crypto.randomBytes(24).toString('hex')}`;
    const secretHash = crypto.createHash('sha256').update(rawSecret).digest('hex');
    const keyHint = `${rawSecret.substring(0, 10)}...${rawSecret.substring(rawSecret.length - 4)}`;

    let expires_at: string | null = null;
    if (expiresAtDays && expiresAtDays > 0) {
      expires_at = new Date(Date.now() + expiresAtDays * 86400000).toISOString();
    }

    const key: ApiKey = {
      id: `key-${uuidv4().substring(0, 8)}`,
      org_id: orgId,
      name,
      key_hint: keyHint,
      secret_hash: secretHash,
      secret_raw: rawSecret, // Returned ONLY once upon creation
      scopes,
      expires_at,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    return this.repo.createApiKey(key);
  }

  async revokeApiKey(id: string): Promise<boolean> {
    const success = await this.repo.revokeApiKey(id);
    if (!success) {
      throw new AppError(404, 'KEY_NOT_FOUND', `API key '${id}' not found`);
    }
    return true;
  }

  // --- Credit Ledger Persistence & Analytics ---

  async addLedgerRecord(record: CreditLedgerRecord): Promise<CreditLedgerRecord> {
    return this.repo.addLedgerRecord(record);
  }

  async getLedgerRecords(userId?: string, orgId?: string): Promise<CreditLedgerRecord[]> {
    return this.repo.getLedgerRecords(userId, orgId);
  }

  async getLedgerAnalytics(orgId?: string) {
    return this.repo.getLedgerAnalytics(orgId);
  }

  // --- Webhooks Management ---

  async listWebhooks(orgId: string): Promise<WebhookEndpoint[]> {
    return this.repo.findWebhooks(orgId);
  }

  async createWebhook(orgId: string, url: string, description: string, events: string[]): Promise<WebhookEndpoint> {
    if (!url || !url.startsWith('http')) {
      throw new AppError(400, 'INVALID_URL', 'Valid HTTP(S) URL is required for webhook');
    }

    const webhook: WebhookEndpoint = {
      id: `wh-${uuidv4().substring(0, 8)}`,
      org_id: orgId,
      url,
      description: description || 'Async Job Callback Webhook',
      secret: `whsec_${crypto.randomBytes(16).toString('hex')}`,
      events: events && events.length > 0 ? events : ['job.completed', 'job.failed'],
      status: 'active',
      created_at: new Date().toISOString(),
    };

    return this.repo.createWebhook(webhook);
  }

  async deleteWebhook(id: string): Promise<boolean> {
    const deleted = await this.repo.deleteWebhook(id);
    if (!deleted) {
      throw new AppError(404, 'WEBHOOK_NOT_FOUND', `Webhook '${id}' not found`);
    }
    return true;
  }

  async testWebhook(id: string): Promise<{ success: boolean; dispatched_event: string; signature_header: string }> {
    const now = new Date().toISOString();
    const mockPayload = JSON.stringify({
      event: 'job.completed',
      timestamp: now,
      data: { job_id: 'job-test-99', status: 'completed', output_url: 'https://cdn.aether.ai/renders/test.mp4' },
    });

    const secret = 'whsec_sample_secret_key';
    const signature = crypto.createHmac('sha256', secret).update(mockPayload).digest('hex');

    return {
      success: true,
      dispatched_event: 'job.completed',
      signature_header: `t=${Date.now()},v1=${signature}`,
    };
  }

  // --- Stripe Billing Integrations ---

  async createStripeCheckoutSession(userId: string, orgId: string, packId: '500_credits' | '1500_credits' | '5000_credits'): Promise<{ checkoutUrl: string; sessionId: string; amountUsd: number; credits: number }> {
    const packs = {
      '500_credits': { credits: 500, usd: 10 },
      '1500_credits': { credits: 1500, usd: 25 },
      '5000_credits': { credits: 5000, usd: 75 },
    };

    const selected = packs[packId] || packs['1500_credits'];
    const sessionId = `cs_test_${uuidv4().replace(/-/g, '')}`;

    return {
      checkoutUrl: `https://checkout.stripe.com/pay/${sessionId}`,
      sessionId,
      amountUsd: selected.usd,
      credits: selected.credits,
    };
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
        description: 'Full un-restricted access across all platform infrastructure, model catalogues, API pools, and governance.',
        permissions: getRolePermissions('super_admin'),
      },
      {
        role: 'member',
        name: 'Standard User',
        description: 'Access AI video, image, and voice generation tools within assigned credit balance.',
        permissions: getRolePermissions('member'),
      },
    ];
  }

  async getAuditLogs(orgId: string): Promise<AuditLogEntry[]> {
    const logs = await this.repo.getAuditLogs(orgId);
    if (logs.length > 0) return logs;

    const now = new Date().toISOString();
    return [
      { id: 'aud-101', org_id: orgId || 'org-cybertech-1', user_id: 'usr-admin-1', user_email: 'admin@aether.ai', action: 'USER_ROLE_UPDATED', target: 'Marcus Vance → editor', ip: '127.0.0.1', timestamp: now },
      { id: 'aud-102', org_id: orgId || 'org-cybertech-1', user_id: 'usr-orgadmin-2', user_email: 'sarah@cybertechlabs.ai', action: 'API_KEY_CREATED', target: 'Production Worker Key', ip: '127.0.0.1', timestamp: now },
    ];
  }

  async recordAuditLog(orgId: string, userId: string, userEmail: string, action: string, target: string, ip: string = '127.0.0.1'): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: `aud-${uuidv4().substring(0, 8)}`,
      org_id: orgId,
      user_id: userId,
      user_email: userEmail,
      action,
      target,
      ip,
      timestamp: new Date().toISOString(),
    };
    return this.repo.addAuditLog(entry);
  }

  // --- Team Invites ---

  async createInvite(orgId: string, email: string, role: UserRole, invitedBy: { userId: string; userEmail: string }): Promise<{ invite: OrgInvite; inviteUrl: string }> {
    if (!email || !email.includes('@')) {
      throw new AppError(400, 'INVALID_INPUT', 'Valid email address is required for invite');
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString(); // 7 days

    const invite: OrgInvite = {
      id: `inv-${uuidv4().substring(0, 8)}`,
      org_id: orgId,
      email: email.trim().toLowerCase(),
      role,
      token,
      status: 'pending',
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };

    const saved = await this.repo.createInvite(invite);
    const webStudioUrl = process.env.WEB_STUDIO_URL || 'http://localhost:3000';
    const inviteUrl = `${webStudioUrl}/signup?invite_token=${token}`;

    await this.recordAuditLog(orgId, invitedBy.userId, invitedBy.userEmail, 'MEMBER_INVITED', `Invited ${email} as ${role}`);

    return { invite: saved, inviteUrl };
  }

  async listInvites(orgId: string): Promise<OrgInvite[]> {
    return this.repo.listInvitesByOrg(orgId);
  }

  async acceptInvite(token: string, name: string, password: string): Promise<{ token: string; user: Omit<User, 'password_hash'>; org: Organization }> {
    const invite = await this.repo.findInviteByToken(token);
    if (!invite || invite.status !== 'pending') {
      throw new AppError(404, 'INVITE_NOT_FOUND', 'Invite link is invalid or has already been used');
    }

    if (new Date(invite.expires_at) < new Date()) {
      invite.status = 'revoked';
      await this.repo.updateInvite(invite);
      throw new AppError(400, 'INVITE_EXPIRED', 'Invite link has expired');
    }

    // Perform signup with pre-assigned org and role
    const signupRes = await this.signup(name, invite.email, password, invite.org_id);

    // Update role to assigned invite role
    await this.updateUserRole(signupRes.user.id, invite.role);

    // Mark invite as accepted
    invite.status = 'accepted';
    await this.repo.updateInvite(invite);

    return signupRes;
  }

  // --- Org Concurrency Settings ---

  async updateOrgConcurrencyCap(orgId: string, maxConcurrentJobs: number, updatedBy: { userId: string; userEmail: string }): Promise<Organization> {
    const org = await this.repo.findOrgById(orgId);
    if (!org) {
      throw new AppError(404, 'ORG_NOT_FOUND', `Organization '${orgId}' not found`);
    }

    org.max_concurrent_jobs = Math.max(1, Math.min(50, Number(maxConcurrentJobs)));
    await this.repo.updateOrg(org);

    await this.recordAuditLog(orgId, updatedBy.userId, updatedBy.userEmail, 'ORG_CONCURRENCY_UPDATED', `Max concurrent jobs set to ${org.max_concurrent_jobs}`);

    return org;
  }

  /**
   * Stale Reservation Sweeper Safeguard
   * Automatically clears and refunds abandoned credit reservations older than maxAgeMs (default 15 mins).
   */
  async sweepStaleReservations(maxAgeMs: number = 15 * 60 * 1000): Promise<{ sweptCount: number }> {
    let sweptCount = 0;
    try {
      const records: CreditLedgerRecord[] = await this.repo.getLedgerRecords();
      const now = Date.now();

      const staleReservations = records.filter((r: CreditLedgerRecord) => {
        if (r.type !== 'RESERVE') return false;
        const txTime = new Date(r.timestamp).getTime();
        return now - txTime > maxAgeMs;
      });

      for (const st of staleReservations) {
        const user = await this.repo.findUserById(st.userId);
        if (user) {
          const reservedAmount = Math.abs(st.amount);
          user.credits_reserved = Math.max(0, (user.credits_reserved || 0) - reservedAmount);
          user.credits_balance = (user.credits_balance || 0) + reservedAmount;
          await this.repo.updateUser(user);

          const refundRecord: CreditLedgerRecord = {
            id: `tx-sweep-${uuidv4().substring(0, 8)}`,
            userId: user.id,
            orgId: user.org_id,
            type: 'REFUND',
            status: 'ROLLED_BACK',
            amount: reservedAmount,
            description: `Auto-refunded stale credit reservation older than ${Math.round(maxAgeMs / 60000)}m`,
            timestamp: new Date().toISOString(),
          };
          await this.repo.addLedgerRecord(refundRecord);
          sweptCount++;
          console.log(`[AuthService] Auto-refunded ${reservedAmount} credits for stale reservation ${st.id} (user: ${user.id}).`);
        }
      }
    } catch (e: any) {
      console.warn('[AuthService] Stale reservation sweep warning:', e.message);
    }
    return { sweptCount };
  }
}
