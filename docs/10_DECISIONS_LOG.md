# 10 — Decisions Log (ADR)

> One entry per meaningful architectural decision. This is what stops the same debate
> happening again in three months, and gives agents context on *why* a rule exists.

## Template
```
## ADR-000: [Short title]
Date: YYYY-MM-DD
Status: Proposed | Accepted | Superseded by ADR-XXX

Context: [What problem/question prompted this decision]
Decision: [What was decided]
Alternatives considered: [What else was on the table, and why rejected]
Consequences: [What this makes easier, what it makes harder]
```

---

## ADR-001: Event-driven communication between services
Date: [DATE]
Status: Accepted

Context: Services need to react to state changes in other services (e.g. Asset Service
needs to know when a workflow run completes) without tight coupling or shared databases.
Decision: Use an event bus for all cross-service notifications; synchronous calls only
for direct request/response reads.
Alternatives considered: Direct service-to-service REST calls for everything (rejected —
creates tight coupling and cascading failure risk); shared database (rejected — violates
service ownership, blocks independent scaling/migration).
Consequences: Easier to add new consumers later without touching producers; harder to
reason about ordering/consistency, requires careful event versioning (see `07_EVENT_CATALOG.md`).

---

## ADR-002: Provider adapter interface
Date: [DATE]
Status: Accepted

Context: Need to support multiple AI providers (and eventually self-hosted models)
without rewriting Workflow/Routing Engine each time.
Decision: All providers implement a single `ProviderAdapter` interface (`08_PROVIDER_SDK.md`);
no other code calls external AI APIs directly.
Alternatives considered: Provider-specific code paths in Workflow Engine (rejected —
exactly the coupling this project is trying to avoid).
Consequences: New providers are additive, not invasive; adds one layer of indirection
for every generation call.
