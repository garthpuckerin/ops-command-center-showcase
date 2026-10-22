# Decisions — ops-command-center-showcase

> Routing rule (Work Item Routing Standard): this file records **decisions with
> rationale** (lightweight ADRs). If a future engineer would ask "why is it like
> this?", the answer belongs here. Defects → `ISSUES.md`; ideas →
> `FEATURES-BACKLOG.md`; sequencing → `ROADMAP.md`.

## ADR-001 · One breakpoint source; desk authority scoped by device tier (2026-09-30)

**Decision.** `src/surface.js` is the only place the shell breakpoints live:
phone < 768, tablet companion 768–1023, workstation ≥ 1024 (the
`portofolio-hub/docs/MOBILE_COMPANION_BENCHMARK.md` template tiers). The JS
resolves the surface and stamps `data-surface`, `data-tier`, `data-shape` and
`data-authority` on `<html>`; the CSS keys off those attributes and never types
its own width breakpoint below 1024px (`src/surface.test.mjs` enforces this).
Desk authority — the surfaces in `DESK_ONLY_VIEWS` — is granted only on a
workstation layout that is not the full desktop view forced on a small device.

**Why.** The JS said 720 while the CSS said 980, so at 721–979px (a phone
turned to landscape, any portrait tablet) the desktop shell rendered with live
write-back approvals (ISSUES 2026-09-27). Two copies of one number drift; one
copy cannot. Authority keyed to the device tier means turning a phone never
changes what it may approve.

**Consequences.**
- Every phone is the companion in both orientations (the widest phone in
  landscape is 932px). A tablet whose landscape width reaches 1024px (iPad Mini,
  iPad Pro 11) gets the workstation — and its authority — in landscape, per the
  template's tiers; in portrait it is the companion. This is the template's own
  rule and matches janus-showcase; record it here so nobody reads it as a
  regression of "authority must not depend on orientation", which is about phones.
- The full desktop view on a phone (`?layout=desktop`) is the real desktop laid
  out at 1280 and scaled; it is for reading, so desk-only surfaces stay gated
  there (the copy says so). Judged by the device's own width, because
  `innerWidth` reads 1280 once the viewport meta changes.
- A narrow desktop browser window (< 1024px) is the companion and is gated. In
  production authority is session/device policy enforced server-side, never a
  viewport query; this demo only models the surface.

**Alternatives rejected.** Keep the media queries and share the number via a
CSS custom property (media queries cannot read custom properties); scope by the
device's short side (a 1366×768 laptop would lose authority); give the forced
desktop authority (a 390px screen showing a scaled 1280 page is exactly the
"thumb-sized summary" the desk-only copy refuses to approve from).

## ADR-002 · Routes live in the URL hash, records included (2026-09-30)

**Decision.** `#<view>` or `#<view>/<record>` (`src/route.js`). In-app navigation
pushes a history entry; normalisation (RBAC) replaces it; a `hashchange`
re-renders. People records are routes: the companion shows a record screen, the
workstation the profile drawer, from the same URL.

**Why.** Before, navigation never wrote the URL and a hash change did nothing
until a reload, so nothing on the phone could be shared and the sweeps silently
re-scanned the home screen (fixed in 8f4ad47 by cache-busting). The benchmark
requires every screen to be URL-addressable and a bare record link to open its
record in a fresh session.
