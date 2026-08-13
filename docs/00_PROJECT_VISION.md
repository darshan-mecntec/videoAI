# 00 — Project Vision

> ⚠️ Sections marked [INFERRED] were not stated in your source doc — they're my best
> guess from the service names (Provider Registry, Workflow Engine, Routing Engine,
> Assets, Projects). Confirm or correct these before agents start building against them.

## What is this product?
AI Creative Studio — a platform that lets users build and run creative generation
workflows (e.g. image, video, copy) that can call multiple AI providers behind one
unified interface, using a Workflow Engine to chain steps and a Provider Registry +
Routing Engine to decide which AI provider handles each step. [INFERRED from service list]

## Who is it for?
[INFERRED] Creators, marketers, or small teams who want to combine multiple AI models
into a repeatable workflow (e.g. "generate copy with one provider → generate an image
with another → save as an asset") without hand-wiring each provider's API themselves.
**Not confirmed in your source doc — correct this if your actual target user is different
(e.g. internal tool, enterprise, developer-facing API product, etc.)**

## Core value proposition
[INFERRED] One workflow, many providers — swap the underlying AI provider (e.g. OpenAI ↔
Stability ↔ a self-hosted model) behind a step without rebuilding the workflow, because
Provider Registry + Routing Engine abstract the provider away from the Workflow Engine.

## Non-goals (explicitly out of scope for v1)
[NOT SPECIFIED IN SOURCE — fill these in]
- [ ]
- [ ]

## Success metrics for v1
[NOT SPECIFIED IN SOURCE — fill these in, e.g.:]
- [ ] A user can create a multi-step workflow (input → generate → save) end to end
- [ ] At least 2 providers integrated behind the Provider Registry
- [ ] [latency / cost / reliability target]

## Constraints
- Team size: you (as architect) + AI coding agents, organized by role
  (Backend/API/Database/Infra/QA/Review/Architecture/Integration) per your system design
- Timeline: [NOT SPECIFIED]
- Budget/infra constraints: [NOT SPECIFIED]

---
**Rule for agents:** if a task conflicts with anything above, stop and report the
conflict instead of resolving it yourself.
