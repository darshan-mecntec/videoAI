# Workflow Engine Microservice

Orchestrates multi-step AI creative workflows (e.g., Prompt -> Text-to-Image -> Upscale -> Voiceover). Validates node graphs (DAG), compiles parallel execution stages, queries Routing Engine for step-level provider selection, tracks execution state, and emits domain events.

## Responsibilities
- Workflow definition CRUD & immutable versioning (updates increment version).
- Cycle detection (Kahn's algorithm) & topological sorting.
- Compiles independent nodes into concurrent execution stages.
- Async execution orchestration (`POST /v1/workflows/:id/run` returns `202 Accepted`).
- Queries `routing-engine` (`/v1/routing/route`) for optimal provider selection per step.
- Emits `workflow.run.started`, `workflow.step.completed`, and `workflow.run.completed` events.

## Does NOT own
- Provider selection scoring algorithm (owned by `routing-engine`).
- Media binary storage (owned by Asset Management & S3).
- User authentication and organization RBAC (owned by Auth Service).

## Running Locally
```bash
npm install
npm run dev
```

## Running Tests
```bash
npm test
```
