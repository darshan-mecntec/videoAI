# 11 — How to Actually Run This (Playbook for a New Engineer)

This is the part the original doc skips: what you literally do, day to day.

## Step 0 — Set up once
1. Create a real git repo. Every "agent" task becomes a real branch and a real PR,
   even if you're the only human reviewing it.
2. Put this `/docs` folder at the repo root.
3. Fill in `00_PROJECT_VISION.md` and `01_SYSTEM_ARCHITECTURE.md` yourself, by hand,
   before any agent writes code. These two are the only ones that must be 100% done
   up front. Everything else can start as a stub and fill in as you go.

## Step 1 — Don't build all 10 docs before you code
Start with 3: Vision, Architecture, Engineering Rules, plus Project State as a running
log. Add `04`–`10` only when you hit the situation they cover (e.g. write
`07_EVENT_CATALOG.md` when you're about to add your first event, not before).
Building all 10 up front is the most common way solo devs stall before writing a
single line of product code.

## Step 2 — The actual loop, per module
This is the part that replaces "Agent 1 / Agent 2 / Agent 3" with something you can
run today with one tool (e.g. Claude Code) in separate sessions:

1. **Plan session** — prompt:
   > "Read 01_SYSTEM_ARCHITECTURE.md, 02_ENGINEERING_RULES.md, 03_PROJECT_STATE.md.
   > Propose an implementation plan for [Provider Registry] only. Don't write code yet."
   Review the plan yourself. This is you acting as the architect — approve or correct it.

2. **Implementation session** — new session/branch, prompt:
   > "Implement exactly this plan for [Provider Registry]. Follow 02_ENGINEERING_RULES.md
   > and 04_CODING_STANDARDS.md. Output: folder structure, code, tests, README.
   > Do not touch any other service."

3. **Review session** — a *different* session (fresh context, no memory of writing the
   code — this matters, it won't rubber-stamp itself), prompt:
   > "Review this diff against 01_SYSTEM_ARCHITECTURE.md and 02_ENGINEERING_RULES.md.
   > Flag architecture violations, security issues, and rule violations. Don't fix them,
   > just list them."

4. **You** triage the flags — accept, reject, or send back for a fix.

5. **QA session** — prompt:
   > "Write unit, integration, and edge-case tests for [Provider Registry] per
   > 02_ENGINEERING_RULES.md's coverage requirement."

6. **Merge** the PR yourself.

7. **Update `03_PROJECT_STATE.md`** — move the module from Current to Completed, note
   any tech debt that got accepted rather than fixed.

## Step 3 — When to actually split by "role" vs. just do it yourself
Splitting into Database/API/Infra "agents" is worth it once you have enough concurrent
work that a single sequential session is your bottleneck. For a first module or two,
one session doing plan → implement → self-review with the docs as context is enough.
Don't build ceremony you don't need yet.

## Common pitfalls to avoid
- **Letting an agent "helpfully" touch architecture** — if a diff touches
  `01_SYSTEM_ARCHITECTURE.md`, folder conventions, or event schemas without you asking
  for that, reject the PR regardless of how good the reasoning sounds.
- **Skipping the fresh-context review step** — a review done by the same session that
  wrote the code tends to agree with itself. Always review in a new session.
- **Letting `03_PROJECT_STATE.md` go stale** — the moment it's out of date, every future
  session is planning against a false picture of what exists.
- **Writing all the docs and none of the code** — docs are infrastructure for the
  build, not the deliverable. If you've spent more than a day on `/docs` and haven't
  shipped one module, stop and build the module.

## Minimal viable version of this whole system
If all of this feels like too much at once: keep just `01_SYSTEM_ARCHITECTURE.md`,
`02_ENGINEERING_RULES.md`, and `03_PROJECT_STATE.md`. Run plan → implement → review
(fresh session) → merge → update state, per module. Add the rest of `/docs` only when
a specific module (API, events, provider integration) actually needs its own contract
written down.
