# Issues — ops-command-center-showcase

> Routing rule (Work Item Routing Standard): this file is the home for anything
> **broken, wrong, missing, or knowingly deferred**. Ideas go to
> `FEATURES-BACKLOG.md`, sequenced commitments to `ROADMAP.md`, decisions with
> rationale to `DECISIONS.md`. Every entry carries evidence (or says it is
> undiagnosed) and says whether it is user-visible.

## Open

### 2026-09-27 · Rotating a phone to landscape turns off the desk-only authority gate
- **Severity:** medium (mock data, but it defeats the showcase's own "no approve authority on the phone" rule) · **Status:** open; fix planned after 2026-10-01 · **Visible:** yes, on any phone wider than 720px in landscape
- **Evidence:** `useIsMobile()` (`src/app.jsx:106`) is `matchMedia("(max-width: 720px)")` with no orientation or pointer signal, and `routeScreen` gates `DESK_ONLY_VIEWS` on it. The repo's own sweep widths for phones in landscape are 667, 844 and 932px (`scripts/viewport-sweep.mjs`). Only 667 stays gated. At 844 and 932 the desktop shell renders, including live Approve/Reject on write-backs, as confirmed by `media/benchmark/results.json` (phone-landscape: no bottom bar, desktop side rail). The same 720 is typed separately in `src/index.css` (493, 524, 1858, 2037) with no shared constant.
- **Test gap:** `e2e/mobile-authority.spec.js` only uses 375×812. `scripts/mobile-sweep.mjs` runs 844×390 but checks layout, never the gate.
- **Fix (owner-approved plan, `portofolio-hub/docs/MOBILE_COMPANION_BENCHMARK.md` Ops item 1):** one breakpoint shared by the JS and the CSS, authority that does not change on rotation, and a landscape case in the authority test.
- **Note:** this finding is the subject of the Oct 1 MIMIR² & Ogham walkthrough (found by two recorded agent sessions on 2026-09-27). Do not fix it before that video is published.

### 2026-10-20 · Remaining mobile companion debt from the 2026-09-21 benchmark
Filed from `portofolio-hub/docs/MOBILE_COMPANION_BENCHMARK.md` (Ops items 2-5; item 1 is the landscape-gate entry above). Source-level claims spot-checked 2026-10-20; not re-measured live. Order of work is set by the remediation plan (Ops is Phase 1).
- **No companion shell at 721-979px · medium · visible.** The desktop topbar renders in a 109px bar with 32×32 icon buttons and an 18px campaign select (benchmark). `useIsMobile()` is `max-width: 720px` (`src/app.jsx:106-116`) against a 980px drawer breakpoint in CSS.
- **Floating role switcher covers controls · low-medium · visible.** It covers "Open triage queue" (and a filter field) on three phone screens (benchmark).
- **People runs 9.2 viewports; no record is deep-linkable; hash navigation does not re-render · low-medium · visible.** `src/app.jsx` reads `location.hash` (`:334`) but has no `hashchange` listener (grep 2026-10-20: none).
- **No full desktop view on a phone · low · visible.**
- **Release gates would pass a squeezed desktop · medium · latent.** No touch floor, no "desktop chrome absent" check, no self-test (benchmark).
- **`src/index.css` is 2,052 lines · low · latent.** Split after the mobile work, as a pure move behind an orphan-class gate and a parsed-CSS diff.

## Closed
