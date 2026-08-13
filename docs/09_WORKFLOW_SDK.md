# 09 — Workflow SDK Contract

## Workflow definition schema (what a user's workflow is stored as)
```json
{
  "workflow_id": "uuid",
  "name": "string",
  "steps": [
    {
      "step_id": "uuid",
      "type": "generate | transform | branch | wait",
      "capability": "text-to-image",
      "inputs": { "from": "previous_step | user_input", "params": {} },
      "on_error": "fail | skip | retry"
    }
  ],
  "version": 1
}
```

## Execution contract
- The Workflow Engine resolves each step in order (or per declared dependency graph)
  and calls the Routing Engine — it never calls a provider adapter directly.
- Every step transition emits an event (`workflow.step.completed` / `.failed`) —
  see `07_EVENT_CATALOG.md`. Nothing about step outcomes is communicated by direct
  DB write into another service.
- Step failures follow the step's `on_error` policy; a full run's final status is
  only ever `completed`, `failed`, or `partial`.

## Node types (extend this list as new step types are needed)
| Type | Purpose |
|---|---|
| `generate` | Calls Routing Engine for an AI capability |
| `transform` | Pure data transform, no external call (e.g. resize, crop) |
| `branch` | Conditional routing to different next steps |
| `wait` | Pause for external input/approval |

## Rules
1. Workflow Engine never imports or calls a provider adapter directly — always through
   Routing Engine.
2. Adding a new node `type` requires updating this file in the same PR.
3. Workflow definitions are versioned; changing a step's shape for existing saved
   workflows requires a migration path, not a silent break.
