import { ProviderCapabilityCandidate, OrgPolicy, RouteRequest } from './types';

export class PolicyEngine {
  filterCandidates(
    candidates: ProviderCapabilityCandidate[],
    request: RouteRequest,
    policy?: OrgPolicy | null
  ): ProviderCapabilityCandidate[] {
    return candidates.filter((c) => {
      // 1. Status check: provider must be active
      if (c.status !== 'active') {
        return false;
      }

      // 2. Region check
      if (request.region && request.region !== 'global') {
        const matchesRegion = c.region_codes.includes(request.region) || c.region_codes.includes('global');
        if (!matchesRegion) {
          return false;
        }
      }

      // 3. Blacklist check (from org policy or local blacklists)
      if (policy && policy.blacklisted_provider_ids.includes(c.provider_id)) {
        return false;
      }

      // 4. Per-request max cost constraint
      if (request.max_cost_usd !== undefined && request.max_cost_usd !== null) {
        if (c.cost_estimate_usd > request.max_cost_usd) {
          return false;
        }
      }

      // 5. Tenant max budget constraint from policy
      if (policy && policy.max_budget_per_request_usd !== null && policy.max_budget_per_request_usd !== undefined) {
        if (c.cost_estimate_usd > policy.max_budget_per_request_usd) {
          return false;
        }
      }

      return true;
    });
  }
}
