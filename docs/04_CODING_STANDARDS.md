# 04 — Coding Standards

## Folder structure (per service)
```
service-name/
├── src/
│   ├── api/            # controllers/routes — thin, no business logic
│   ├── domain/          # core business logic, use-cases
│   ├── infra/            # DB, external calls, adapters
│   ├── events/          # event publishers/consumers
│   └── config/
├── tests/
│   ├── unit/
│   └── integration/
├── README.md
├── openapi.yaml         # if the service exposes a REST API
└── Dockerfile
```

## Naming conventions
- Services: `kebab-case` (e.g. `provider-registry`)
- Classes/Types: `PascalCase`
- Functions/variables: `camelCase` (JS/TS) or `snake_case` (Python) — pick one per
  language and stay consistent across the whole project
- Events: `domain.entity.action` (e.g. `workflow.run.completed`, `asset.created`)
- Database tables: `snake_case`, plural (e.g. `provider_configs`)

## Commit / PR conventions
- Commit format: `[service-name] short description` (e.g. `[provider-registry] add adapter interface`)
- One PR per module/task, matching the scope given to the agent
- PR description must state: what was built, what was explicitly NOT touched, and any
  flagged rule conflicts

## Error handling
- Never swallow exceptions silently — log with context, then re-throw or return a
  typed error
- Use the shared error-code schema (see `05_API_GUIDELINES.md`) for anything crossing
  a service boundary

## Testing
- Unit tests colocated logically under `tests/unit`, mirroring `src/` structure
- Integration tests hit real (or containerized) dependencies, not mocks, where feasible
- Every bug fix ships with a regression test
