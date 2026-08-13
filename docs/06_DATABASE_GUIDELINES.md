# 06 — Database Guidelines

## Ownership
- One database (or schema) per service. No exceptions, no "just this once" reads
  across boundaries.
- Cross-service data needs: call the owning service's API, or subscribe to its events.

## Schema conventions
- Table names: `snake_case`, plural
- Every table: `id` (UUID), `created_at`, `updated_at`; soft-delete via `deleted_at`
  where deletion needs to be recoverable/auditable
- Foreign keys only within the same service's database

## Migrations
- Every schema change is a migration file, checked into version control, never a
  manual change against a running DB
- Migrations must be reversible (`up`/`down`) where practical
- One migration per PR/task, reviewed by the Database role before merge

## Indexing
- Index every foreign key
- Index columns used in `WHERE`/`ORDER BY` on tables expected to grow past ~100k rows
- Document the reasoning for any non-obvious index in the migration file's comments

## Partitioning / scaling (only once actually needed — don't pre-optimize)
- Consider time-based partitioning for high-volume append-only tables
  (e.g. workflow run logs, generation history)
- Revisit this doc once a table's row count or query latency becomes a measured problem,
  not preemptively

## Review checklist (Database role uses this on every PR touching schema)
- [ ] No cross-service foreign keys
- [ ] Migration is reversible
- [ ] New foreign keys are indexed
- [ ] No breaking change to an existing column without a migration path for existing data
