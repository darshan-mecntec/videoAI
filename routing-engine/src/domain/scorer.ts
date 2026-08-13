import { ProviderCapabilityCandidate, CandidateScore, StrategyPreference } from './types';

export interface StrategyWeights {
  cost: number;
  quality: number;
  latency: number;
  availability: number;
}

export const STRATEGY_WEIGHTS: Record<StrategyPreference, StrategyWeights> = {
  balanced: { cost: 0.30, quality: 0.40, latency: 0.15, availability: 0.15 },
  lowest_cost: { cost: 0.70, quality: 0.10, latency: 0.10, availability: 0.10 },
  highest_quality: { cost: 0.05, quality: 0.80, latency: 0.05, availability: 0.10 },
  lowest_latency: { cost: 0.10, quality: 0.10, latency: 0.70, availability: 0.10 },
};

export class CandidateScorer {
  scoreCandidates(
    candidates: ProviderCapabilityCandidate[],
    strategy: StrategyPreference = 'balanced'
  ): CandidateScore[] {
    if (candidates.length === 0) {
      return [];
    }

    const weights = STRATEGY_WEIGHTS[strategy] || STRATEGY_WEIGHTS.balanced;

    // Determine max values for relative normalization
    const maxCost = Math.max(...candidates.map((c) => c.cost_estimate_usd), 0.00001);
    const maxLatency = Math.max(...candidates.map((c) => c.latency_estimate_ms), 1);

    const scored: CandidateScore[] = candidates.map((c) => {
      // Normalization: lower is better for cost and latency
      const cost_score = maxCost > 0 ? Math.max(0, 1 - c.cost_estimate_usd / maxCost) : 1.0;
      const quality_score = Math.min(1.0, Math.max(0.0, c.quality_score));
      const latency_score = maxLatency > 0 ? Math.max(0, 1 - c.latency_estimate_ms / maxLatency) : 1.0;
      const availability_score = Math.min(1.0, Math.max(0.0, c.availability_7d));

      const total_score = Number(
        (
          weights.cost * cost_score +
          weights.quality * quality_score +
          weights.latency * latency_score +
          weights.availability * availability_score
        ).toFixed(4)
      );

      return {
        provider_id: c.provider_id,
        slug: c.slug,
        capability_id: c.capability_id,
        model_id: c.model_id,
        total_score,
        cost_score: Number(cost_score.toFixed(4)),
        quality_score: Number(quality_score.toFixed(4)),
        latency_score: Number(latency_score.toFixed(4)),
        availability_score: Number(availability_score.toFixed(4)),
        estimated_cost_usd: c.cost_estimate_usd,
        estimated_latency_ms: c.latency_estimate_ms,
      };
    });

    // Sort descending by total_score
    scored.sort((a, b) => b.total_score - a.total_score);
    return scored;
  }
}
