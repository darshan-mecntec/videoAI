# 01 — System Architecture

> Source of truth for how the system is shaped. Only YOU edit this file. Agents read it,
> never rewrite it. If an agent thinks it's wrong, it reports the issue in its output
> instead of changing this file.

## High-level service map
```
                        Client (Web/App)
                              │
                        API Gateway
                              │
   ┌───────────┬──────────────┼──────────────┬───────────┐
   │           │              │              │           │
 Auth Svc   Project Svc   Workflow Engine  Asset Svc  Provider Registry
                              │
                        Event Bus (async)
                              │
                    ┌─────────┴─────────┐
                 Routing Engine     Notification Svc
```
[Adjust names/boxes to match your real services once decided.]

## Service boundaries
| Service | Owns | Does NOT own |
|---|---|---|
| Auth Service | users, sessions, permissions | project data |
| Project Service | projects, project settings | assets, workflows |
| Workflow Engine | workflow definitions, execution state | provider calls (delegates to Provider Registry) |
| Provider Registry | provider configs, credentials, capability metadata | workflow logic |
| Routing Engine | choosing which provider handles a request | provider implementation details |
| Asset Service | generated/uploaded files, metadata | generation logic |

## Communication rules
- Synchronous (REST/gRPC): used for request/response, e.g. client → API Gateway → Service.
- Asynchronous (events): used for anything cross-service that isn't a direct user-facing
  read, e.g. "workflow.completed", "asset.created".
- **No service reads another service's database directly.** Ever. Cross-service data
  needs go through an API call or an event, never a shared table/schema.

## Tech stack (fill in once decided)
- Backend language/framework: [ ]
- Database(s): [ ]
- Message broker: [ ]
- Frontend framework: [ ]
- Deployment target: [ ]

## Data flow — example (Workflow Run)
1. Client submits workflow run request → API Gateway → Workflow Engine
2. Workflow Engine resolves steps, calls Routing Engine for each provider step
3. Routing Engine calls Provider Registry to get the right provider adapter
4. Provider adapter calls external AI API, returns normalized result
5. Workflow Engine emits `workflow.step.completed` event
6. Asset Service listens, persists output
7. Workflow Engine emits `workflow.completed` when all steps done

## Migration considerations
- Provider adapters must be swappable without touching Workflow Engine code
  (this is why Provider Registry exists as its own service).
- Assume some providers will eventually be self-hosted/open-source models — the
  adapter interface must not assume "always an external HTTP API."

---
**Rule for agents:** implement within these boundaries. If a task seems to require
crossing a boundary listed above, stop and flag it — don't silently work around it.
