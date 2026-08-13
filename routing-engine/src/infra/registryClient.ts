import { ProviderCapabilityCandidate, CapabilityType } from '../domain/types';

export interface ProviderRegistryClient {
  fetchCapabilities(
    capabilityType: CapabilityType,
    region?: string
  ): Promise<ProviderCapabilityCandidate[]>;
}

export class MockProviderRegistryClient implements ProviderRegistryClient {
  public candidatesMap: Map<string, ProviderCapabilityCandidate[]> = new Map();

  async fetchCapabilities(
    capabilityType: CapabilityType,
    region?: string
  ): Promise<ProviderCapabilityCandidate[]> {
    const list = this.candidatesMap.get(capabilityType) || [];
    if (!region) return list;
    return list.filter(
      (c) => c.region_codes.includes(region) || c.region_codes.includes('global')
    );
  }

  seedCapabilities(capabilityType: CapabilityType, candidates: ProviderCapabilityCandidate[]): void {
    this.candidatesMap.set(capabilityType, candidates);
  }
}

export class HttpProviderRegistryClient implements ProviderRegistryClient {
  constructor(private baseUrl: string = process.env.PROVIDER_REGISTRY_URL || 'http://localhost:3001') {}

  async fetchCapabilities(
    capabilityType: CapabilityType,
    region?: string
  ): Promise<ProviderCapabilityCandidate[]> {
    try {
      const url = new URL('/v1/capabilities', this.baseUrl);
      url.searchParams.append('type', capabilityType);
      if (region) url.searchParams.append('region', region);

      const res = await fetch(url.toString());
      if (!res.ok) return [];

      const data = (await res.json()) as {
        capabilities: Array<{
          id: string;
          provider: { id: string; slug: string; display_name: string; status: string; region_codes: string[] };
          model_id: string;
          quality_score: number;
          pricing_model: string;
          max_resolution?: string | null;
        }>;
      };

      return (data.capabilities || []).map((cap) => ({
        provider_id: cap.provider.id,
        slug: cap.provider.slug,
        capability_id: cap.id || `cap-${cap.model_id}`,
        model_id: cap.model_id,
        quality_score: cap.quality_score,
        cost_estimate_usd: 0.02,
        latency_estimate_ms: 120,
        availability_7d: 1.0,
        region_codes: cap.provider.region_codes || ['global'],
        status: cap.provider.status,
      }));
    } catch (err) {
      console.error('[routing-engine] Failed to fetch capabilities from Provider Registry:', err);
      return [];
    }
  }
}
