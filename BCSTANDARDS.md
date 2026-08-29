# BCSTANDARDS — ops-command-center-showcase

> AI agents: read this before writing code. This is the AI Context Contract for
> this repo. It is written to be safe if this repo is public (it becomes public
> at the reveal) — keep it that way: no other project's embargoed names, no
> secrets, no engine internals, no private absolute paths.

## What this repo is

- A **curated public showcase** of the Ops Command Center **cockpit** — the
  frontend command-center, not the engine. Mock fixtures only; no backend, no
  network, no secrets. See `README.md` (§"What's real vs. illustrative") for the
  exact cockpit-vs-engine boundary; the production engine (FastAPI/Postgres,
  source-system connectors, the deterministic reconciliation + scoring services,
  the governed write-back pipeline, and the governed AI layer) is a separate
  **private** codebase and must never be described or referenced here beyond that
  honest boundary table. Do not name the private engine repository.
- This repo is the **canonical dev home** for the Ops Command Center cockpit
  frontend going forward. The monorepo copy at `portofolio-hub/apps/ops-command-
  center` is redundant but not yet retired (retirement is deferred until
  demo↔prod reconciliation is verified). Make cockpit frontend edits **here**.

## Governance

- Authority: **Blurred Concepts Engineering Constitution v2.0** —
  `github.com/garthpuckerin/blurred-concepts-engineering`.
- Precedence (Constitution §1): direct owner instruction → this `BCSTANDARDS.md`
  → Constitution → topic standards → supporting docs.

## Code Comprehension (Comprehension Ladder Standard)
<!-- bcstd:managed comprehension v1 -->
- Graph repo_id: `github.com/garthpuckerin/ops-command-center-showcase`
- This repo is **new and not yet ingested** into the code-graph. Until it is,
  raw `Read`/`Grep` are the correct tools here; once ingested, query the ladder
  (`map` / `find` / `explain` / `neighbors` / `read`) with the repo_id above
  before raw reads for structure/behaviour/relationship questions. Note: this is
  a React app — the graph does not model JSX render edges, so grep for "what
  renders X" regardless.
<!-- /bcstd:managed -->

## Git & Release

- **Branch model (alternate, documented per the Git & Release Standard):** this
  repo does not use short-lived `feat/*`/`fix/*` branches. It is solo-maintained
  (owner + AI pair); commits land directly on **`main`**, which is the Vercel
  production branch — **push to `main` auto-deploys** the live demo once the
  git-integrated Vercel project is connected.
- **Verify before pushing:** `npm run build` (clean), `npm run test:unit`
  (fixture-coherence + governed-AI gates), and `npm run test:e2e` (smoke, RBAC
  read-scope, §4b empty states — zero console/page/network errors) must pass.
  The layout sweeps (`sweep:whiteglove` / `sweep:mobile` / `sweep:viewport`,
  run against the dev server) must be clean. The e2e error assertions are strict
  by design — a failed request or console error is a real defect, never weaken
  them.
- Tags: not adopted here; don't tag unilaterally.

## Publish / spoiler discipline (reveal-season)

- **Private until the reveal.** This repo is created **private** and flips to
  **public at the Ops Command Center reveal (Thu Sep 3 2026, 16:00 UTC)** —
  owner-only action: `gh repo edit garthpuckerin/ops-command-center-showcase
  --visibility public --accept-visibility-change-consequences`.
- **noindex is kept** at reveal (owner decision): the deployed demo carries
  `<meta name="robots" content="noindex">`; SEO/GEO lives on the hub
  (`garthpuckerin.com`), which links to this demo. Do not remove the noindex tag.
- **Sanitized-only.** Never add engine internals, secrets, real PII, the private
  engine repo name, or any other reveal-season project's embargoed name/content
  (the systems revealing after Sep 3 stay sealed until their own Thursdays —
  through Oct 1). "LMS Ops" is internal shorthand; the public product name is
  **Ops Command Center**. Vercel serves only `dist/`, so repo-root docs are not
  served by the live site — but this repo is public after the reveal, so treat
  every committed file as public.

## Institutional Memory
<!-- bcstd:managed memory v1 -->
- The comprehension and memory habits are active client bindings, not passive
  repository guidance. Each client must use the highest enforcement tier it
  supports under the Comprehension Ladder Standard.
- Recall Ogham with `hybrid_search` when starting work on a system that may
  have prior context. Before ending, store decisions with rationale, gotchas,
  and cross-session operational context with source, controlled tags, and a
  deliberate TTL. Never store secrets or code-structure facts.
- Canonical memory policy: `standards/Memory_Standard.md` in
  blurred-concepts-engineering — it governs on any conflict.
<!-- /bcstd:managed -->
