# 02 — Engineering Rules

> Every agent loads this before writing a single line of code. These are hard constraints,
> not suggestions. If a rule blocks a task, the agent reports it — it does not break the rule.

## Architecture
1. No shared databases between services — each service owns its own schema/tables.
2. No direct calls to external AI provider APIs outside the Provider Registry / provider
   adapter layer. Every provider call goes through one seam.
3. No circular dependencies between services.
4. No business logic in controllers/route handlers — controllers validate input and
   delegate to a service/use-case layer.
5. Everything cross-service that isn't a direct read goes through events, not direct DB
   or synchronous chaining.

## Code quality
6. Every public function/module has a docstring or comment stating its contract
   (inputs, outputs, error cases).
7. Use interfaces/abstract base classes at integration seams (e.g. provider adapters,
   storage backends) so implementations are swappable.
8. Minimum 80% unit test coverage on new code. No PR merges below that without an
   explicit, written exception in the PR description.
9. No hardcoded secrets, provider names, or magic strings — use config/env + the
   Provider Registry.

## APIs
10. Every API is versioned (`/v1/...`) from day one.
11. Every API is documented (OpenAPI/Swagger) before merge, not after.
12. Errors use a consistent error-code schema across all services (see `05_API_GUIDELINES.md`).

## Events
13. Every event is documented in `07_EVENT_CATALOG.md` before it's published anywhere.
14. Events are versioned and additive — don't silently change an existing event's shape.

## Process
15. One module/service per task. No "implement the whole project" prompts.
16. Every task's output includes: folder structure, code, tests, README for that module.
    Nothing outside the assigned scope.
17. Agents never modify: `01_SYSTEM_ARCHITECTURE.md`, folder structure conventions,
    naming conventions, service contracts, event schemas, database boundaries. Only the
    human architect changes these.
18. Every completed module updates `03_PROJECT_STATE.md` (or flags it for the human to
    update) — Completed / Current / Next.

## What to do when a rule seems wrong or in the way
Don't silently break it or quietly work around it. Output a short note:
> "Rule #X blocks this task because ___. Suggested change: ___."
The human decides whether to change the rule.
