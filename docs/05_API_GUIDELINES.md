# 05 — API Guidelines

## Versioning
- All routes prefixed `/v1/...`
- Breaking changes require a new version (`/v2/...`); never break `/v1` in place

## Structure
- REST for CRUD-ish resources; gRPC only where internal service-to-service latency
  matters (document the exception in the service's README if used)
- Resource-based URLs: `/v1/workflows/{id}/steps`, not verb-based (`/v1/getWorkflow`)

## Error schema (consistent across every service)
```json
{
  "error": {
    "code": "PROVIDER_UNAVAILABLE",
    "message": "Human-readable message",
    "details": {},
    "request_id": "uuid"
  }
}
```
- `code` is a stable, machine-readable string (SCREAMING_SNAKE_CASE), never changes
  once shipped
- HTTP status codes used correctly (400 validation, 401/403 auth, 404 not found,
  409 conflict, 429 rate limit, 5xx server)

## Validation
- Validate all input at the API layer before it reaches domain logic
- Return all validation errors at once, not one-at-a-time

## Documentation
- Every endpoint documented in that service's `openapi.yaml` before merge
- Include example request/response for every endpoint

## Pagination (for list endpoints)
- Cursor-based: `?cursor=...&limit=...`
- Response includes `next_cursor` (null when no more pages)

## Auth
- All internal service-to-service calls carry a service identity token
- All client-facing calls carry a user auth token validated by Auth Service
