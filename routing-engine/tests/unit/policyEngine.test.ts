import { PolicyEngine } from '../../src/domain/policyEngine';
import { ProviderCapabilityCandidate, OrgPolicy, RouteRequest } from '../../src/domain/types';

describe('PolicyEngine', () => {
  let policyEngine: PolicyEngine;

  beforeEach(() => {
    policyEngine = new PolicyEngine();
  });

  const sampleCandidates: ProviderCapabilityCandidate[] = [
    {
      provider_id: 'p1',
      slug: 'p1',
      capability_id: 'c1',
      model_id: 'm1',
      quality_score: 0.9,
      cost_estimate_usd: 0.05,
      latency_estimate_ms: 500,
      availability_7d: 0.99,
      region_codes: ['us-east-1'],
      status: 'active',
    },
    {
      provider_id: 'p2',
      slug: 'p2',
      capability_id: 'c2',
      model_id: 'm2',
      quality_score: 0.8,
      cost_estimate_usd: 0.15,
      latency_estimate_ms: 400,
      availability_7d: 0.95,
      region_codes: ['eu-west-1'],
      status: 'active',
    },
    {
      provider_id: 'p3-disabled',
      slug: 'p3',
      capability_id: 'c3',
      model_id: 'm3',
      quality_score: 0.95,
      cost_estimate_usd: 0.02,
      latency_estimate_ms: 100,
      availability_7d: 0.99,
      region_codes: ['us-east-1'],
      status: 'disabled',
    },
  ];

  it('should filter out inactive candidates', () => {
    const req: RouteRequest = { request_id: 'r1', capability_type: 'text-to-image' };
    const filtered = policyEngine.filterCandidates(sampleCandidates, req);

    expect(filtered.find((c) => c.provider_id === 'p3-disabled')).toBeUndefined();
    expect(filtered.length).toBe(2);
  });

  it('should filter candidates by region', () => {
    const req: RouteRequest = { request_id: 'r1', capability_type: 'text-to-image', region: 'us-east-1' };
    const filtered = policyEngine.filterCandidates(sampleCandidates, req);

    expect(filtered.length).toBe(1);
    expect(filtered[0].provider_id).toBe('p1');
  });

  it('should filter candidates exceeding max_cost_usd on request', () => {
    const req: RouteRequest = { request_id: 'r1', capability_type: 'text-to-image', max_cost_usd: 0.08 };
    const filtered = policyEngine.filterCandidates(sampleCandidates, req);

    expect(filtered.length).toBe(1);
    expect(filtered[0].provider_id).toBe('p1');
  });

  it('should filter blacklisted providers and org budget caps from OrgPolicy', () => {
    const req: RouteRequest = { request_id: 'r1', capability_type: 'text-to-image' };
    const policy: OrgPolicy = {
      org_id: 'org-1',
      default_strategy: 'balanced',
      max_budget_per_request_usd: 0.10,
      blacklisted_provider_ids: ['p1'],
    };

    const filtered = policyEngine.filterCandidates(sampleCandidates, req, policy);
    expect(filtered.find((c) => c.provider_id === 'p1')).toBeUndefined(); // Blacklisted
    expect(filtered.find((c) => c.provider_id === 'p2')).toBeUndefined(); // Cost 0.15 > 0.10
    expect(filtered.length).toBe(0);
  });
});
