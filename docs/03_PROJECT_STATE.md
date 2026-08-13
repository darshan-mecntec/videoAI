# 03 — Project State

> The single most important file for keeping multiple agent sessions coherent. Update
> this at the end of every completed module, before starting the next one. Every agent
> reads this FIRST, before any task, to know what already exists.

_Last updated: 2026-08-13 by Antigravity Agent_

## Completed
- [x] Provider Registry (REST API, Redis cache-aside, Event catalog integration, Health tracking)
- [x] Routing Engine & Provider Dispatch (Scoring, Fallback ordering, Org policy enforcement natively in `video-service` & `provider-registry`)
- [x] Workflow Engine (DAG graph compilation, Cycle validation, Topological sorting, Async 202 execution, Step lifecycle events)
- [x] Asset Management Service (Media asset registry, video/image/audio metadata, storage URLs, generation lineage)
- [x] Visual Canvas & Video Generator UI (Interactive visual node graph builder, 1-click video pipeline runner, embedded browser MP4 player)
- [x] **Phase 1 Implementation: API Keys, Credit/Usage Management & Neon DB Workspace Overhaul**
  - [x] Persistent Credit Ledger DB with two-phase Reserve/Commit/Refund & Topup audit trails
  - [x] Scoped API Keys with SHA-256 secret hashing, expiration tracking, and revocation (`DELETE /v1/auth/api-keys/:id`)
  - [x] Webhook Delivery Engine with HMAC SHA-256 payload signature headers (`X-Signature-256`) and test ping dispatch
  - [x] Stripe Billing Integration for instant credit top-up packs
  - [x] Web Studio Developer & Credit Control Dashboard (`/profile`) featuring Ledger History, API Key Governance, Webhook Management, and Credit Top-Up checkout
  - [x] **Neon DB Integration Across Services**: `PostgresAssetRepository` and `PostgresVideoJobRepository` active with PostgreSQL SSL connection to Neon DB
  - [x] **Workspace Media Library Overhaul**: Left navigation sidebar (All, Starred, Video, Image, Audio), instant starring/unstarring (`PATCH /v1/assets/:id`), auto-registration of finished video jobs into asset-service, asset deletion (`DELETE /v1/assets/:id`), prompt-driven quick re-generation, grid/list view toggle, and search/sort bar.

## Active Core Microservices Catalog (9 Running Services)
1. `auth-service` (Port 3008) — Identity, RBAC, Scoped API Keys, Credit Ledger, Webhooks, Stripe Billing (Neon DB)
2. `provider-registry` (Port 3001) — AI Model capabilities, health catalog, provider pricing
3. `workflow-engine` (Port 3002) — DAG execution graph runner & async job orchestration
4. `asset-service` (Port 3006) — Media storage registry, Neon DB persistence, starring & asset management
5. `project-service` (Port 3009) — Workspace projects, versions, & snapshot restores
6. `metrics-service` (Port 3010) — System health telemetry & active service heartbeats
7. `video-service` (Port 3011) — Multi-provider AI video dispatch, Neon DB video job repository & auto-asset sync
8. `avatar-service` (Port 3012) — AI Avatar generation pipeline & lip-sync execution
9. `web-studio` (Port 3000) — Next.js Studio UI (Canvas, Generator, Workspace Hub, Developer Dashboard)

*(Note: Legacy stub directories `execution-engine`, `node-engine`, `routing-engine`, `template-engine`, `video-editor-service`, `video-template-service` have been consolidated into `video-service`, `workflow-engine`, and `auth-service` for cleaner monorepo execution).*

## Current (in progress right now)
- Phase 1 Fully Completed & Verified on Neon DB. Awaiting approval to move to Phase 2.

## Next (queued, not started)
- Phase 2: User Roles & Permissions
- Phase 3: Workspace & Project Hierarchy
- Phase 4: Generation Pipeline & Job Orchestration
- Phase 5: Consolidated Gap Backlog


## Known issues / tech debt
- [Anything flagged by Review/Architecture agents that was accepted as debt rather
  than fixed immediately, with a reason.]

## Standing rules recap (see 02_ENGINEERING_RULES.md for full list)
- No service accesses another service's DB directly
- Everything cross-service is event-driven unless explicitly synchronous
- Every API documented and versioned

---
**Rule for agents:** read this file before starting a task, and propose an update to it
(Completed/Current/Next) as part of your output when a task finishes. Do not start work
on something already marked "Completed" or "Current" under another owner without
flagging it first.
