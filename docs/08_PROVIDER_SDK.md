# 08 — Provider SDK Contract

> This is the seam that lets you add/swap AI providers (OpenAI, Anthropic, Stability,
> a self-hosted model, etc.) without touching Workflow Engine or Routing Engine code.

## Interface every provider adapter must implement
```
interface ProviderAdapter {
  id: string                      // e.g. "openai-image-v1"
  capabilities: Capability[]      // e.g. ["text-to-image", "image-to-image"]

  generate(input: GenerationRequest): Promise<GenerationResult>
  healthCheck(): Promise<HealthStatus>
  getRateLimit(): RateLimitInfo
}
```

## GenerationRequest / GenerationResult (normalized shape — every adapter maps to this)
```json
// Request
{ "capability": "text-to-image", "prompt": "...", "params": {}, "request_id": "uuid" }

// Result
{
  "request_id": "uuid",
  "status": "success | error | rate_limited",
  "output": { "type": "image", "url_or_data": "..." },
  "error": null,
  "provider_meta": { "latency_ms": 0, "cost_estimate": 0 }
}
```

## Rules
1. No code outside `provider-adapters/*` may call an external AI API directly.
2. Every adapter normalizes errors to the shared error schema (`05_API_GUIDELINES.md`)
   — callers never see provider-specific error shapes.
3. Every adapter reports its own rate limit status so the Routing Engine can fail over.
4. Credentials live only in the Provider Registry's config store, never hardcoded in
   an adapter.
5. New provider = new adapter implementing this interface + registered in Provider
   Registry. Zero changes required in Workflow Engine or Routing Engine.

## Adding a new provider (task template for an agent)
```
Task: Implement a ProviderAdapter for [Provider Name] supporting [capability].
Read: 08_PROVIDER_SDK.md, 02_ENGINEERING_RULES.md
Output: adapter implementation, unit tests (including a mocked failure case),
        registration entry, README section.
Do not: modify Workflow Engine, Routing Engine, or the ProviderAdapter interface itself.
```
