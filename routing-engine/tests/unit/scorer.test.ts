import { CandidateScorer } from '../../src/domain/scorer';
import { ProviderCapabilityCandidate } from '../../src/domain/types';

describe('CandidateScorer', () => {
  let scorer: CandidateScorer;

  beforeEach(() => {
    scorer = new CandidateScorer();
  });

  const sampleCandidates: ProviderCapabilityCandidate[] = [
    {
      provider_id: 'p-cheap',
      slug: 'provider-cheap',
      capability_id: 'c1',
      model_id: 'cheap-v1',
      quality_score: 0.7,
      cost_estimate_usd: 0.01,
      latency_estimate_ms: 2000,
      availability_7d: 0.99,
      region_codes: ['global'],
      status: 'active',
    },
    {
      provider_id: 'p-fast',
      slug: 'provider-fast',
      capability_id: 'c2',
      model_id: 'fast-v1',
      quality_score: 0.8,
      cost_estimate_usd: 0.05,
      latency_estimate_ms: 300,
      availability_7d: 0.98,
      region_codes: ['global'],
      status: 'active',
    },
    {
      provider_id: 'p-quality',
      slug: 'provider-quality',
      capability_id: 'c3',
      model_id: 'quality-v1',
      quality_score: 0.98,
      cost_estimate_usd: 0.10,
      latency_estimate_ms: 1500,
      availability_7d: 1.0,
      region_codes: ['global'],
      status: 'active',
    },
  ];

  it('should return empty array when no candidates supplied', () => {
    const scored = scorer.scoreCandidates([], 'balanced');
    expect(scored).toEqual([]);
  });

  it('should prioritize cheapest provider under lowest_cost strategy', () => {
    const scored = scorer.scoreCandidates(sampleCandidates, 'lowest_cost');
    expect(scored[0].provider_id).toBe('p-cheap');
  });

  it('should prioritize highest quality provider under highest_quality strategy', () => {
    const scored = scorer.scoreCandidates(sampleCandidates, 'highest_quality');
    expect(scored[0].provider_id).toBe('p-quality');
  });

  it('should prioritize fastest provider under lowest_latency strategy', () => {
    const scored = scorer.scoreCandidates(sampleCandidates, 'lowest_latency');
    expect(scored[0].provider_id).toBe('p-fast');
  });

  it('should calculate balanced score correctly (p-fast wins overall balance)', () => {
    const scored = scorer.scoreCandidates(sampleCandidates, 'balanced');
    expect(scored.length).toBe(3);
    expect(scored[0].provider_id).toBe('p-fast');
  });

  it('should handle zero cost/latency and fallback strategy', () => {
    const zeroCandidates: ProviderCapabilityCandidate[] = [
      {
        provider_id: 'p-zero',
        slug: 'p-zero',
        capability_id: 'c0',
        model_id: 'm0',
        quality_score: 1.5, // > 1.0 bound check
        cost_estimate_usd: 0,
        latency_estimate_ms: 0,
        availability_7d: -0.5, // < 0 bound check
        region_codes: ['global'],
        status: 'active',
      },
    ];

    const scored = scorer.scoreCandidates(zeroCandidates, 'unknown_strategy' as any);
    expect(scored[0].quality_score).toBe(1.0);
    expect(scored[0].availability_score).toBe(0.0);
    expect(scored[0].cost_score).toBe(1.0);
    expect(scored[0].latency_score).toBe(1.0);
  });
});
