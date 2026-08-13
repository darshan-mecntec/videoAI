import { Router, Request, Response, NextFunction } from 'express';
import { ProviderService } from '../domain/providerService';
import { CapabilityService } from '../domain/capabilityService';
import { HealthService } from '../domain/healthService';
import { CapabilityType, ProviderStatus, AppError } from '../domain/types';

export function createRouter(
  providerService: ProviderService,
  capabilityService: CapabilityService,
  healthService: HealthService
): Router {
  const router = Router();

  // --- Provider Endpoints ---

  // GET /v1/providers
  router.get('/v1/providers', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cursor = req.query.cursor as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const status = req.query.status as ProviderStatus | undefined;
      const result = await providerService.listProviders({ cursor, limit, status });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/providers/health-summary (must be declared before /v1/providers/:id)
  router.get('/v1/providers/health-summary', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await healthService.getHealthSummary();
      res.status(200).json({ health_summary: summary });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/providers/:id
  router.get('/v1/providers/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await providerService.getProvider(req.params.id);
      res.status(200).json({
        provider: result.provider,
        credentialRef: result.credentialRef,
        capabilities: result.capabilities
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/providers
  router.post('/v1/providers', async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('POST /v1/providers body:', req.body); // Debug log
      const { slug, display_name, region_codes, org_id, credential, secret_key, api_key, environment } = req.body;
      const effectiveSecretKey = credential?.secret_key || secret_key || (slug ? `vault/${slug}/production` : '');
      const effectiveApiKey = credential?.api_key || api_key;
      const effectiveEnv = credential?.environment || environment || 'production';

      const result = await providerService.registerProvider({
        slug,
        display_name,
        region_codes,
        org_id,
        secret_key: effectiveSecretKey,
        api_key: effectiveApiKey,
        environment: effectiveEnv,
      });
      res.status(201).json(result);
    } catch (err) {
      console.error('Error creating provider:', err);
      next(err);
    }
  });

  // PATCH /v1/providers/:id
  router.patch('/v1/providers/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await providerService.updateProvider(req.params.id, req.body);
      res.status(200).json({ provider: updated });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /v1/providers/:id (Soft-delete per architect review)
  router.delete('/v1/providers/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const softDeleted = await providerService.softDeleteProvider(req.params.id);
      res.status(200).json({ provider: softDeleted });
    } catch (err) {
      next(err);
    }
  });

  // --- Capability Endpoints ---

  // GET /v1/capabilities (Lookup endpoint for Routing Engine)
  router.get('/v1/capabilities', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = req.query.type as CapabilityType | undefined;
      if (!type) {
        throw new AppError(400, 'MISSING_CAPABILITY_TYPE', 'Query parameter "type" is required for capability lookup');
      }
      const region = req.query.region as string | undefined;
      const capabilities = await capabilityService.lookupCapabilities(type, region);
      res.status(200).json({ capabilities });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/providers/:id/capabilities
  router.get('/v1/providers/:id/capabilities', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { capabilities } = await providerService.getProvider(req.params.id);
      res.status(200).json({ capabilities });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/providers/:id/capabilities
  router.post('/v1/providers/:id/capabilities', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const capability = await capabilityService.addCapability(req.params.id, req.body);
      res.status(201).json({ capability });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/providers/:id/auto-discover
  router.post('/v1/providers/:id/auto-discover', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await providerService.autoDiscoverCapabilities(req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  // PATCH /v1/providers/:id/capabilities/:capId
  router.patch('/v1/providers/:id/capabilities/:capId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const capability = await capabilityService.updateCapability(req.params.capId, req.body);
      res.status(200).json({ capability });
    } catch (err) {
      next(err);
    }
  });

  // --- Pricing Endpoints ---

  // GET /v1/providers/:id/pricing
  router.get('/v1/providers/:id/pricing', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pricing = await providerService.getPricing(req.params.id);
      res.status(200).json({ pricing });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/providers/:id/pricing
  router.post('/v1/providers/:id/pricing', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entry = await providerService.addPricingEntry(req.params.id, req.body);
      res.status(201).json({ pricing_entry: entry });
    } catch (err) {
      next(err);
    }
  });

  // --- Health Endpoints ---

  // GET /v1/providers/:id/health
  router.get('/v1/providers/:id/health', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const health = await healthService.getHealth(req.params.id);
      res.status(200).json({ health });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/providers/:id/health-check
  router.post('/v1/providers/:id/health-check', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, latency_ms, error_message, availability_7d } = req.body;
      const record = await healthService.recordHealthCheck(
        req.params.id,
        status || 'healthy',
        latency_ms || 10,
        error_message || null,
        availability_7d !== undefined ? availability_7d : 1.0
      );
      res.status(200).json({ health_record: record });
    } catch (err) {
      next(err);
    }
  });

  // --- Rate Limit Endpoints ---

  // GET /v1/providers/:id/rate-limits
  router.get('/v1/providers/:id/rate-limits', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limits = await providerService.getRateLimits(req.params.id);
      res.status(200).json({ rate_limits: limits });
    } catch (err) {
      next(err);
    }
  });

  // PUT /v1/providers/:id/rate-limits
  router.put('/v1/providers/:id/rate-limits', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limits = await providerService.updateRateLimits(req.params.id, req.body.limits || []);
      res.status(200).json({ rate_limits: limits });
    } catch (err) {
      next(err);
    }
  });

  // --- API Key Pool Management Endpoints ---

  // GET /v1/pools/telemetry
  router.get('/v1/pools/telemetry', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { globalApiKeyPool } = await import('../domain/apiKeyPoolManager');
      const telemetry = globalApiKeyPool.getPoolTelemetry();
      res.status(200).json({ telemetry });
    } catch (err) {
      next(err);
    }
  });

  // GET /v1/pools/keys
  router.get('/v1/pools/keys', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { globalApiKeyPool } = await import('../domain/apiKeyPoolManager');
      const provider = req.query.provider as string | undefined;
      const keys = globalApiKeyPool.getPoolKeys(provider);
      res.status(200).json({ keys });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/pools/keys
  router.post('/v1/pools/keys', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { globalApiKeyPool } = await import('../domain/apiKeyPoolManager');
      const { provider, keyName, keySecret, monthlyBudgetUsd, priority } = req.body;
      const newKey = globalApiKeyPool.addPoolKey(provider, keyName, keySecret, monthlyBudgetUsd, priority);
      res.status(201).json({ key: newKey });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /v1/pools/keys/:keyId
  router.patch('/v1/pools/keys/:keyId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { globalApiKeyPool } = await import('../domain/apiKeyPoolManager');
      const updated = globalApiKeyPool.updateKeyConfig(req.params.keyId, req.body);
      res.status(200).json({ key: updated });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /v1/pools/keys/:keyId
  router.delete('/v1/pools/keys/:keyId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { globalApiKeyPool } = await import('../domain/apiKeyPoolManager');
      const deleted = globalApiKeyPool.removePoolKey(req.params.keyId);
      res.status(200).json({ success: deleted });
    } catch (err) {
      next(err);
    }
  });

  // POST /v1/pools/keys/:keyId/toggle
  router.post('/v1/pools/keys/:keyId/toggle', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { globalApiKeyPool } = await import('../domain/apiKeyPoolManager');
      const updated = globalApiKeyPool.togglePoolKey(req.params.keyId);
      res.status(200).json({ key: updated });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

