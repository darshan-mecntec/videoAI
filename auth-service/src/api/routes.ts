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
      const { modelId, units } = req.body;

      const { user } = await authService.getCurrentUser(userId);
      const reservation = globalCreditEngine.reserveCredits(userId, user.credits_balance, modelId, Number(units || 1));

      if (!reservation.success) {
        return res.status(402).json({ error: reservation.error, creditsRequired: reservation.creditsRequired });
      }

      // Deduct reserved balance temporarily
      await authService.updateUserCredits(userId, reservation.creditsRequired!, 'deduct');

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
      }
      res.status(200).json({ success: !!result, refundedAmount: result?.refundedAmount || 0 });
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

  // POST /v1/auth/api-keys
  router.post('/v1/auth/api-keys', authMiddleware, requirePermission('apikeys:manage'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = req.body.org_id || req.userToken?.org_id || 'org-cybertech-1';
      const name = req.body.name;
      const key = await authService.createApiKey(orgId, name);
      res.status(201).json({ api_key: key });
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
