# 07 — Event Catalog

> Every event published anywhere in the system must be listed here BEFORE it's used.
> This is the contract between services that never talk to each other's databases.

## Naming convention
`domain.entity.action` — e.g. `workflow.run.completed`, `asset.created`, `provider.config.updated`

## Catalog

| Event name | Producer | Consumers | Payload (key fields) | Version |
|---|---|---|---|---|
| `workflow.run.started` | Workflow Engine | Notification Svc | `run_id`, `workflow_id`, `user_id`, `started_at` | v1 |
| `workflow.run.completed` | Workflow Engine | Asset Svc, Notification Svc | `run_id`, `workflow_id`, `status`, `outputs[]` | v1 |
| `workflow.step.completed` | Workflow Engine | Asset Svc | `run_id`, `step_id`, `output_ref` | v1 |
| `asset.created` | Asset Svc | Project Svc, Notification Svc | `asset_id`, `project_id`, `type`, `url` | v1 |
| `provider.config.updated` | Provider Registry | Routing Engine | `provider_id`, `capabilities[]` | v1 |
| `provider.call.succeeded` | Routing Engine | Provider Registry, Billing, Analytics | `call_id`, `provider_id`, `capability`, `latency_ms`, `cost_usd` | v1 |
| `provider.call.failed` | Routing Engine | Provider Registry, Monitoring | `call_id`, `provider_id`, `capability`, `error_code`, `attempts` | v1 |

[Add rows as new events are introduced. Never delete a row for an event still in use —
mark it deprecated instead.]

## Versioning rule
- Adding a field: does NOT require a version bump, as long as consumers ignore
  unknown fields
- Removing/renaming/changing the type of a field: requires a new version
  (`workflow.run.completed.v2`), old version kept alive until all consumers migrate

## Rule for agents
Before publishing a new event, check this table for something equivalent first —
don't create `asset.new` if `asset.created` already exists. If you add an event,
add its row here as part of the same PR.
