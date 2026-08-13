import { RoutingService } from '../../src/domain/routingService';
import { CandidateScorer } from '../../src/domain/scorer';
import { PolicyEngine } from '../../src/domain/policyEngine';
import { MockProviderRegistryClient } from '../../src/infra/registryClient';
import { InMemoryCacheService } from '../../src/infra/cache';
import { InMemoryEventBus } from '../../src/events/publisher';
import { AppError, ProviderCapabilityCandidate } from '../../src/domain/types';

describe('RoutingService', () => {
  let registryClient: MockProviderRegistryClient;
  let scorer: CandidateScorer;
  let policyEngine: PolicyEngine;
  let cache: InMemoryCacheService;
  let eventPublisher: InMemoryEventBus;
  let routingService: RoutingService;

  beforeEach(() => {
    registryClient = new MockProviderRegistryClient();
    scorer = new CandidateScorer();
    policyEngine = new PolicyEngine();
    cache = new InMemoryCacheService();
    eventPublisher = new InMemoryEventBus();
    routingService = new RoutingService(registryClient, scorer, policyEngine, cache, eventPublisher);
  });

  const mockCandidates: ProviderCapabilityCandidate[] = [
    {
      provider_id: 'p1',
      slug: 'p1-slug',
      capability_id: 'c1',
      model_id: 'm1',
      quality_score: 0.9,
      cost_estimate_usd: 0.03,
      latency_estimate_ms: 400,
      availability_7d: 0.99,
      region_codes: ['global'],
      status: 'active',
    },
    {
      provider_id: 'p2',
      slug: 'p2-slug',
      capability_id: 'c2',
      model_id: 'm2',
      quality_score: 0.8,
      cost_estimate_usd: 0.01,
      latency_estimate_ms: 800,
      availability_7d: 0.95,
      region_codes: ['global'],
      status: 'active',
    },
  ];

  it('should throw AppError 400 when missing capability_type', async () => {
    await expect(routingService.selectRoute({ request_id: 'req-1', capability_type: '' as any })).rejects.toThrow(
      AppError
    );
  });

  it('should throw AppError 404 when no candidates exist for capability', async () => {
    await expect(
      routingService.selectRoute({ request_id: 'req-1', capability_type: 'text-to-image' })
    ).rejects.toThrow(AppError);
  });

  it('should select primary provider and order fallback chain', async () => {
    registryClient.seedCapabilities('text-to-image', mockCandidates);

    const decision = await routingService.selectRoute({
      request_id: 'req-1',
      capability_type: 'text-to-image',
      strategy_preference: 'lowest_cost',
    });

    expect(decision.selected_provider.provider_id).toBe('p2');
    expect(decision.fallback_chain.length).toBe(1);
    expect(decision.fallback_chain[0].provider_id).toBe('p1');
  });

  it('should respect org policies and org strategy default', async () => {
    registryClient.seedCapabilities('text-to-image', mockCandidates);

    await routingService.setOrgPolicy('org-123', {
      default_strategy: 'highest_quality',
      max_budget_per_request_usd: 0.05,
      blacklisted_provider_ids: [],
    });

    const policy = await routingService.getOrgPolicy('org-123');
    expect(policy.default_strategy).toBe('highest_quality');

    const decision = await routingService.selectRoute({
      request_id: 'req-2',
      capability_type: 'text-to-image',
      org_id: 'org-123',
    });

    expect(decision.selected_provider.provider_id).toBe('p1');
  });

  it('should record execution feedback and publish domain events', async () => {
    // Succeeded event
    await routingService.recordExecutionFeedback({
      call_id: 'call-1',
      provider_id: 'p1',
      capability_type: 'text-to-image',
      success: true,
      latency_ms: 320,
      cost_usd: 0.03,
      attempt_number: 1,
    });

    expect(eventPublisher.publishedEvents.length).toBe(1);
    expect(eventPublisher.publishedEvents[0].event_name).toBe('provider.call.succeeded');

    // Failed event
    await routingService.recordExecutionFeedback({
      call_id: 'call-2',
      provider_id: 'p1',
      capability_type: 'text-to-image',
      success: false,
      latency_ms: 5000,
      cost_usd: 0,
      error_code: 'TIMEOUT',
      attempt_number: 1,
    });

    expect(eventPublisher.publishedEvents.length).toBe(2);
    expect(eventPublisher.publishedEvents[1].event_name).toBe('provider.call.failed');
  });

  it('should throw AppError 400 when recording feedback with missing fields', async () => {
    await expect(
      routingService.recordExecutionFeedback({
        call_id: '',
        provider_id: 'p1',
        capability_type: 'text-to-image',
        success: true,
        latency_ms: 100,
        cost_usd: 0,
        attempt_number: 1,
      })
    ).rejects.toThrow(AppError);
  });
});
