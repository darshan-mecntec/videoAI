export interface RouteDecisionResult {
  selected_provider: {
    provider_id: string;
    model_id: string;
    total_score: number;
    estimated_cost_usd: number;
  };
  fallback_chain: Array<{
    provider_id: string;
    model_id: string;
  }>;
}

export interface RoutingEngineClient {
  routeCapability(
    capabilityType: string,
    options?: { region?: string; org_id?: string }
  ): Promise<RouteDecisionResult>;
}

export class MockRoutingEngineClient implements RoutingEngineClient {
  async routeCapability(
    capabilityType: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: { region?: string; org_id?: string }
  ): Promise<RouteDecisionResult> {
    return {
      selected_provider: {
        provider_id: `provider-${capabilityType}`,
        model_id: `${capabilityType}-model-v1`,
        total_score: 0.95,
        estimated_cost_usd: 0.02,
      },
      fallback_chain: [],
    };
  }
}

export class HttpRoutingEngineClient implements RoutingEngineClient {
  constructor(private baseUrl: string = process.env.ROUTING_ENGINE_URL || 'http://localhost:3003') {}

  async routeCapability(
    capabilityType: string,
    options?: { region?: string; org_id?: string }
  ): Promise<RouteDecisionResult> {
    try {
      const url = `${this.baseUrl}/v1/routing/route`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capability_type: capabilityType,
          region: options?.region || 'global',
          org_id: options?.org_id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Routing engine HTTP ${response.status}`);
      }

      const data = (await response.json()) as RouteDecisionResult;
      return data;
    } catch (err) {
      console.warn(`[workflow-engine] Routing Engine call fallback for capability '${capabilityType}':`, err);
      return {
        selected_provider: {
          provider_id: `provider-${capabilityType}`,
          model_id: `${capabilityType}-model-v1`,
          total_score: 0.90,
          estimated_cost_usd: 0.02,
        },
        fallback_chain: [],
      };
    }
  }
}
