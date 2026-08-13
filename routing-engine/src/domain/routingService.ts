import {
  RouteRequest,
  RouteDecision,
  OrgPolicy,
  ExecutionFeedback,
  AppError,
  StrategyPreference,
  ProviderCapabilityCandidate
} from './types';
import { CandidateScorer } from './scorer';
import { PolicyEngine } from './policyEngine';
import { ProviderRegistryClient } from '../infra/registryClient';
import { CacheService } from '../infra/cache';
import { EventPublisher } from '../events/publisher';

export class RoutingService {
  private orgPolicies: Map<string, OrgPolicy> = new Map();

  constructor(
    private registryClient: ProviderRegistryClient,
    private scorer: CandidateScorer,
    private policyEngine: PolicyEngine,
    private cache: CacheService,
    private eventPublisher: EventPublisher
  ) {}

  async selectRoute(request: RouteRequest): Promise<RouteDecision> {
    if (!request.capability_type) {
      throw new AppError(400, 'INVALID_REQUEST', 'capability_type is required');
    }

    // 1. Fetch candidates (with cache-aside)
    const cacheKey = `routing:candidates:${request.capability_type}:${request.region || 'all'}`;
    let candidates = await this.cache.get<ProviderCapabilityCandidate[]>(cacheKey);

    if (!candidates) {
      candidates = await this.registryClient.fetchCapabilities(
        request.capability_type,
        request.region
      );
      await this.cache.set(cacheKey, candidates, 60);
    }

    // 2. Fetch Org Policy if org_id is present
    let policy: OrgPolicy | null = null;
    if (request.org_id) {
      policy = await this.getOrgPolicy(request.org_id);
    }

    // 3. Filter candidates through Policy Engine
    const filteredCandidates = this.policyEngine.filterCandidates(candidates, request, policy);

    if (filteredCandidates.length === 0) {
      throw new AppError(
        404,
        'NO_SUITABLE_PROVIDER',
        `No suitable active provider found for capability '${request.capability_type}' matching specified constraints`
      );
    }

    // 4. Determine Strategy Preference (request override > org policy default > 'balanced')
    const strategy: StrategyPreference =
      request.strategy_preference || (policy ? policy.default_strategy : 'balanced');

    // 5. Score candidates
    const scoredCandidates = this.scorer.scoreCandidates(filteredCandidates, strategy);

    const selected_provider = scoredCandidates[0];
    const fallback_chain = scoredCandidates.slice(1);

    return {
      request_id: request.request_id,
      capability_type: request.capability_type,
      selected_provider,
      fallback_chain,
      evaluated_at: new Date().toISOString(),
    };
  }

  async getOrgPolicy(orgId: string): Promise<OrgPolicy> {
    const policy = this.orgPolicies.get(orgId);
    if (!policy) {
      return {
        org_id: orgId,
        default_strategy: 'balanced',
        max_budget_per_request_usd: null,
        blacklisted_provider_ids: [],
      };
    }
    return policy;
  }

  async setOrgPolicy(orgId: string, policyData: Omit<OrgPolicy, 'org_id'>): Promise<OrgPolicy> {
    const policy: OrgPolicy = {
      ...policyData,
      org_id: orgId,
    };
    this.orgPolicies.set(orgId, policy);
    return policy;
  }

  async recordExecutionFeedback(feedback: ExecutionFeedback): Promise<void> {
    if (!feedback.call_id || !feedback.provider_id || !feedback.capability_type) {
      throw new AppError(400, 'INVALID_FEEDBACK', 'call_id, provider_id, and capability_type are required');
    }

    const timestamp = new Date().toISOString();

    if (feedback.success) {
      await this.eventPublisher.publish({
        event_name: 'provider.call.succeeded',
        version: 'v1',
        timestamp,
        payload: {
          call_id: feedback.call_id,
          provider_id: feedback.provider_id,
          capability: feedback.capability_type,
          latency_ms: feedback.latency_ms,
          cost_usd: feedback.cost_usd,
        },
      });
    } else {
      await this.eventPublisher.publish({
        event_name: 'provider.call.failed',
        version: 'v1',
        timestamp,
        payload: {
          call_id: feedback.call_id,
          provider_id: feedback.provider_id,
          capability: feedback.capability_type,
          error_code: feedback.error_code || 'UNKNOWN_FAILURE',
          attempt_number: feedback.attempt_number || 1,
        },
      });
    }
  }
}
