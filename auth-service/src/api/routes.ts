import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../domain/authService';
import { globalCreditEngine } from '../domain/creditEngine';
import { createAuthMiddleware, requirePermission, AuthRequest } from './middleware';

export function createRouter(authService: AuthService): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(authService);

  // --- Public Auth Routes ---

  // POST /v1/auth/signup
  router.post('/v1/auth/signup', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, org_id } = req.body;
      const result = await authService.signup(name, email, password, org_id);
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/auth/login
  router.post('/v1/auth/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const effectiveEmail = email || 'admin@aether.ai';
      const result = await authService.login(effectiveEmail, password);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/auth/me
  router.get('/v1/auth/me', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userToken?.sub || (req.query.user_id as string) || 'usr-admin-1';
      const result = await authService.getCurrentUser(userId);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  });

  // --- User Management & RBAC ---

  // GET /v1/auth/users
  router.get('/v1/auth/users', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = req.query.org_id as string | undefined;
      const users = await authService.listUsers(orgId);
      res.status(200).json({ users });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /v1/auth/users/:id/role
  router.patch('/v1/auth/users/:id/role', authMiddleware, requirePermission('users:write'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { role } = req.body;
      const user = await authService.updateUserRole(req.params.id, role);
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/auth/users/:id/credits
  router.post('/v1/auth/users/:id/credits', authMiddleware, requirePermission('credits:manage'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { amount, operation } = req.body;
      const user = await authService.updateUserCredits(req.params.id, Number(amount), operation || 'add');
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /v1/auth/users/:id/status
  router.patch('/v1/auth/users/:id/status', authMiddleware, requirePermission('users:write'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await authService.toggleUserStatus(req.params.id);
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/auth/users/:id/toggle-status
  router.post('/v1/auth/users/:id/toggle-status', authMiddleware, requirePermission('users:write'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await authService.toggleUserStatus(req.params.id);
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/auth/roles
  router.get('/v1/auth/roles', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matrix = await authService.getRolesMatrix();
      res.status(200).json({ roles: matrix });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/auth/audit-logs (Audit log trail)
  router.get(['/v1/auth/audit-log', '/v1/auth/audit-logs'], authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = (req.query.org_id as string) || req.userToken?.org_id || 'org-cybertech-1';
      const logs = await authService.getAuditLogs(orgId);
      res.status(200).json({ audit_logs: logs });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/auth/users/:userId/credits — Admin manual credit grant
  router.post('/v1/auth/users/:userId/credits', authMiddleware, requirePermission('credits:manage'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { amount, reason } = req.body;
      const updatedUser = await authService.updateUserCredits(req.params.userId, Number(amount), 'add');
      
      const adminEmail = req.userToken?.email || 'admin@aether.ai';
      await authService.recordAuditLog(updatedUser.org_id, req.userToken?.sub || 'usr-admin-1', adminEmail, 'CREDITS_GRANTED', `Granted ${amount} credits to ${updatedUser.email}: ${reason || 'Admin Grant'}`);
      
      await authService.addLedgerRecord({
        id: `tx-grant-${Date.now()}`,
        userId: updatedUser.id,
        orgId: updatedUser.org_id,
        type: 'GRANT',
        status: 'COMPLETED',
        amount: Number(amount),
        description: `Admin Granted ${amount} Credits: ${reason || 'Manual topup'}`,
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({ success: true, user: updatedUser });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /v1/auth/users/:userId/role — Admin update user role
  router.patch('/v1/auth/users/:userId/role', authMiddleware, requirePermission('users:write'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { role } = req.body;
      const updatedUser = await authService.updateUserRole(req.params.userId, role);
      res.status(200).json({ success: true, user: updatedUser });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/auth/users/:userId/status — Admin toggle user status
  router.post('/v1/auth/users/:userId/status', authMiddleware, requirePermission('users:write'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const updatedUser = await authService.toggleUserStatus(req.params.userId);
      res.status(200).json({ success: true, user: updatedUser });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/auth/invites (Create shareable team invite link)
  router.post('/v1/auth/invites', authMiddleware, requirePermission('users:write'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = req.userToken?.org_id || req.body.org_id || 'org-cybertech-1';
      const { email, role } = req.body;
      const inviter = {
        userId: req.userToken?.sub || 'usr-admin-1',
        userEmail: req.userToken?.email || 'admin@aether.ai',
      };
      const result = await authService.createInvite(orgId, email, role || 'editor', inviter);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/auth/invites (List org invites)
  router.get('/v1/auth/invites', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = (req.query.org_id as string) || req.userToken?.org_id || 'org-cybertech-1';
      const invites = await authService.listInvites(orgId);
      res.status(200).json({ invites });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/auth/invites/accept (Public route to accept invite link)
  router.post('/v1/auth/invites/accept', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, name, password } = req.body;
      const result = await authService.acceptInvite(token, name, password);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /v1/auth/orgs/:id/concurrency (Configure org concurrent job limit)
  router.patch('/v1/auth/orgs/:id/concurrency', authMiddleware, requirePermission('users:write'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { max_concurrent_jobs } = req.body;
      const updater = {
        userId: req.userToken?.sub || 'usr-admin-1',
        userEmail: req.userToken?.email || 'admin@aether.ai',
      };
      const org = await authService.updateOrgConcurrencyCap(req.params.id, Number(max_concurrent_jobs), updater);
      res.status(200).json({ org });
    } catch (err) {
      next(err);
    }
  });

  // --- Credit Engine Endpoints ---

  // GET /v1/credits/pricing
  router.get('/v1/credits/pricing', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const models = globalCreditEngine.getModelPricingList();
      res.status(200).json({ models, creditValueUsd: 0.02 });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /v1/credits/pricing/:modelId
  router.patch('/v1/credits/pricing/:modelId', authMiddleware, requirePermission('credits:manage'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { providerCostUsd, profitMarginPercent } = req.body;
      const updated = globalCreditEngine.updateModelPricing(req.params.modelId, Number(providerCostUsd), Number(profitMarginPercent));
      res.status(200).json({ model: updated });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/credits/reserve
  router.post('/v1/credits/reserve', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userToken?.sub || req.body.userId || 'usr-admin-1';
      const orgId = req.userToken?.org_id || 'org-cybertech-1';
      const { modelId, units } = req.body;

      const { user } = await authService.getCurrentUser(userId);
      const reservation = globalCreditEngine.reserveCredits(userId, user.credits_balance, modelId, Number(units || 1));

      if (!reservation.success) {
        return res.status(402).json({ error: reservation.error, creditsRequired: reservation.creditsRequired });
      }

      // Deduct reserved balance temporarily
      await authService.updateUserCredits(userId, reservation.creditsRequired!, 'deduct');

      // Persist entry to Credit Ledger
      await authService.addLedgerRecord({
        id: reservation.transactionId!,
        userId,
        orgId,
        modelId,
        amount: reservation.creditsRequired!,
        type: 'RESERVE',
        status: 'PENDING',
        description: `Reserved ${reservation.creditsRequired} credits for ${modelId} (${units || 1} units)`,
        providerCostUsd: reservation.providerCostUsd,
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        transactionId: reservation.transactionId,
        creditsDeducted: reservation.creditsRequired,
        providerCostEstimatedUsd: reservation.providerCostUsd,
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/credits/commit
  router.post('/v1/credits/commit', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { transactionId } = req.body;
      const committed = globalCreditEngine.commitCredits(transactionId);

      if (committed) {
        const userId = req.userToken?.sub || 'usr-admin-1';
        const orgId = req.userToken?.org_id || 'org-cybertech-1';
        await authService.addLedgerRecord({
          id: `commit-${Date.now()}`,
          userId,
          orgId,
          amount: 0,
          type: 'COMMIT',
          status: 'COMPLETED',
          description: `Committed generation job (${transactionId})`,
          timestamp: new Date().toISOString(),
        });
      }

      res.status(200).json({ success: committed });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/credits/refund
  router.post('/v1/credits/refund', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { transactionId, reason } = req.body;
      const result = globalCreditEngine.refundCredits(transactionId, reason);
      if (result) {
        await authService.updateUserCredits(result.userId, result.refundedAmount, 'add');
        const orgId = req.userToken?.org_id || 'org-cybertech-1';
        await authService.addLedgerRecord({
          id: `ref-${Date.now()}`,
          userId: result.userId,
          orgId,
          amount: result.refundedAmount,
          type: 'REFUND',
          status: 'ROLLED_BACK',
          description: `Refunded ${result.refundedAmount} credits: ${reason || 'Provider execution failure'}`,
          timestamp: new Date().toISOString(),
        });
      }
      res.status(200).json({ success: !!result, refundedAmount: result?.refundedAmount || 0 });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/credits/sweep-stale — Auto-refund abandoned credit reservations
  router.post('/v1/credits/sweep-stale', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const maxAgeMs = req.body.maxAgeMs ? Number(req.body.maxAgeMs) : 15 * 60 * 1000;
      const result = await authService.sweepStaleReservations(maxAgeMs);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/credits/ledger — Credit usage history log
  router.get('/v1/credits/ledger', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.query.user_id as string | undefined;
      const orgId = (req.query.org_id as string) || req.userToken?.org_id;
      const records = await authService.getLedgerRecords(userId, orgId);
      res.status(200).json({ records });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/credits/analytics — Spend breakdown analytics
  router.get('/v1/credits/analytics', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = (req.query.org_id as string) || req.userToken?.org_id;
      const analytics = await authService.getLedgerAnalytics(orgId);
      res.status(200).json({ analytics });
    } catch (err) {
      next(err);
    }
  });

  // --- Orgs, Keys & Audit Logs ---

  // GET /v1/auth/orgs
  router.get('/v1/auth/orgs', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgs = await authService.listOrgs();
      res.status(200).json({ orgs });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/auth/api-keys
  router.get('/v1/auth/api-keys', authMiddleware, requirePermission('apikeys:manage'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = (req.query.org_id as string) || req.userToken?.org_id || 'org-cybertech-1';
      const api_keys = await authService.listApiKeys(orgId);
      res.status(200).json({ api_keys });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/auth/api-keys — Scoped API key creation
  router.post('/v1/auth/api-keys', authMiddleware, requirePermission('apikeys:manage'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = req.body.org_id || req.userToken?.org_id || 'org-cybertech-1';
      const { name, scopes, expires_in_days } = req.body;
      const key = await authService.createApiKey(orgId, name, scopes, expires_in_days);
      res.status(201).json({ api_key: key });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /v1/auth/api-keys/:id — Revoke API key
  router.delete('/v1/auth/api-keys/:id', authMiddleware, requirePermission('apikeys:manage'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await authService.revokeApiKey(req.params.id);
      res.status(200).json({ success: true, message: `API key '${req.params.id}' revoked` });
    } catch (err) {
      next(err);
    }
  });

  // --- Webhook Endpoints ---

  // GET /v1/webhooks
  router.get('/v1/webhooks', authMiddleware, requirePermission('webhooks:manage'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = (req.query.org_id as string) || req.userToken?.org_id || 'org-cybertech-1';
      const webhooks = await authService.listWebhooks(orgId);
      res.status(200).json({ webhooks });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/webhooks
  router.post('/v1/webhooks', authMiddleware, requirePermission('webhooks:manage'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = req.body.org_id || req.userToken?.org_id || 'org-cybertech-1';
      const { url, description, events } = req.body;
      const webhook = await authService.createWebhook(orgId, url, description, events);
      res.status(201).json({ webhook });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /v1/webhooks/:id
  router.delete('/v1/webhooks/:id', authMiddleware, requirePermission('webhooks:manage'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await authService.deleteWebhook(req.params.id);
      res.status(200).json({ success: true, message: `Webhook '${req.params.id}' deleted` });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/webhooks/:id/test
  router.post('/v1/webhooks/:id/test', authMiddleware, requirePermission('webhooks:manage'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.testWebhook(req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  // --- Stripe Billing Integration ---

  // POST /v1/billing/checkout-session
  router.post('/v1/billing/checkout-session', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userToken?.sub || 'usr-admin-1';
      const orgId = req.userToken?.org_id || 'org-cybertech-1';
      const { pack_id } = req.body;
      const session = await authService.createStripeCheckoutSession(userId, orgId, pack_id);
      res.status(200).json(session);
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/billing/webhook — Stripe Webhook receiver
  router.post('/v1/billing/webhook', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, data } = req.body;
      if (type === 'checkout.session.completed' || type === 'mock.payment.success') {
        const userId = data?.object?.metadata?.user_id || 'usr-admin-1';
        const credits = Number(data?.object?.metadata?.credits || 1500);
        await authService.updateUserCredits(userId, credits, 'add');
        await authService.addLedgerRecord({
          id: `topup-${Date.now()}`,
          userId,
          orgId: 'org-cybertech-1',
          amount: credits,
          type: 'TOPUP',
          status: 'COMPLETED',
          description: `Stripe Credit Pack Top-Up (${credits} credits)`,
          timestamp: new Date().toISOString(),
        });
      }
      res.status(200).json({ received: true });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/auth/audit-log
  router.get('/v1/auth/audit-log', authMiddleware, requirePermission('audit:read'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = (req.query.org_id as string) || req.userToken?.org_id || 'org-cybertech-1';
      const logs = await authService.getAuditLogs(orgId);
      res.status(200).json({ audit_logs: logs });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

