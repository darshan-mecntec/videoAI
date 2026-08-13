# Provider Routing Engine Service

Real-time decision engine that selects the optimal primary AI provider and orders a fallback chain based on cost, quality, latency, availability, and organization policies.

## Responsibilities
- Receives capability requests and fetches candidates from Provider Registry.
- Normalizes and computes multi-factor weighted candidate scores ($O(N)$ decision latency).
- Enforces organization policies (default strategies, request budget caps, provider blacklists).
- Generates ordered fallback chains (`[Selected Provider, Fallback 1, Fallback 2]`).
- Publishes execution events (`provider.call.succeeded` & `provider.call.failed`).
- Subscribes to `provider.config.updated` events for cache invalidation.

## Does NOT own
- Provider metadata database (owned by `provider-registry`).
- Executing provider adapters or direct external AI API calls (owned by Execution Engine / Adapters).

## Running Locally
```bash
npm install
npm run dev
```

## Running Tests
```bash
npm test
```
