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

### 2026-09-30 · Mobile companion pass — failing baseline of the ported gates
- **Severity:** high (an authority defect plus a phone surface that is the desktop squeezed) · **Status:** open, being fixed on `fix/mobile-companion` · **Visible:** yes, on every phone and tablet
- **What changed in the gates (before any app fix):** `scripts/mobile-sweep.mjs` and `scripts/viewport-sweep.mjs` were rewritten to the janus-showcase gate (`portofolio-hub/docs/MOBILE_COMPANION_BENCHMARK.md`, "The gate"): they build the app and sweep the local `vite preview`, measure with one shared probe (`scripts/lib/probes.mjs`), and add the touch floor (44px, width AND height), "desktop chrome absent", first content in the top 35%, nothing fixed covering an in-flow control, People length and deep links, hash navigation, the full desktop view, and authority in every cell below the workstation tier. `mobile-sweep --self-test` must FAIL checks 1–4 on the desktop layout forced onto a phone. `e2e/mobile-authority.spec.js` gained the 721–1023px gap band (844×390, 932×430, 768×1024, 1000×760) and an in-place rotation (390×844 → 844×390), each asserting the ABSENCE of Approve/Reject.
- **Baseline, unchanged app (commit before any fix):**
  - `npm run build` clean · `npm run test:unit` 50/50 · `npm run test:e2e` **37 passed, 9 failed** — every gap-band case and the rotation case fail (the desk-only copy is missing; the desktop shell renders).
  - `node scripts/mobile-sweep.mjs` → **89/236 passed, 147 failed**: desktop chrome mounted on every phone screen (30), first content below the top 35% (30 — e.g. home 476px, exceptions 745px, people 833px, reports 1546px of a 664px screen), targets under 44×44 (31 — 40×40 icon buttons, an 18px-tall campaign select, 17px text links), the role floater covering a control (8 — People's "Board Office" select, Settings' "Ink blue", "Campaign home" on six desk-only screens), the drawer nav as a nested scroller (1), **authority (42 — all 7 desk-only routes are live with Approve/Reject at 750, 844 and 932px landscape, 768 and 834px portrait tablets, and a 1000px window)**, People 9.2 viewports, tapping a tab does not write the URL, a hashchange does not re-render, `#people/<id>` does not open a record, no full desktop view.
  - `node scripts/mobile-sweep.mjs --self-test` → **FAILS** (gate not yet proven): there is no forced desktop view, and the phone today renders the desktop chrome with a tab bar on top, so check 2 (tab bar) passes on it while 1, 3 and 4 fail.
  - `node scripts/viewport-sweep.mjs` → **93/236 passed, 143 failed**: every phone and portrait-tablet cell renders the desktop shell (81), no forced desktop view or way back (36 + 36), desk-only routes live below the workstation tier (24), landing controls under 44×44 at every shape (20 — theme toggle 32×32, "Launch demo" 134×34), and `#setup` text spans past the right edge at 1024–1280px (11).
- **Found by the gate, not on the ranked list:** the landing touch floor and the `#setup` overflow above. Both are filed here; the landing floor is fixed in this pass because the gate the pass must leave green requires it.

## Closed
