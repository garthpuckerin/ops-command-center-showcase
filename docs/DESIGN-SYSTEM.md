# Ops Command Center — Design System Contract

The baseline for this design system is **Grant Tracker** (`grant-tracker-showcase`);
both are the same editorial "ledger-paper" family. When in doubt, match GT.

This is a **contract**, not a description: two tests enforce it (see §5). If you
add a raw color or a pill that can be cut off, the suite fails.

---

## 1. Tokens — every color comes from one

All colors resolve from CSS custom properties defined in `src/index.css` under
`:root` (light), `body[data-mode="dark"]` (dark), and `body[data-palette="…"]`
(accent palettes). **Never write a raw `oklch()`/`rgba()`/`#hex` in a rule** —
use a token. (The only raw values allowed anywhere are pure black/white alphas
for shadows/hairlines, and hex inside a `url()` data-URI — see §5.)

| Group | Tokens | Role |
|---|---|---|
| Paper | `--paper` `--paper-2` `--paper-3` `--paper-float` | surfaces, lightest → raised. Sidebar is `--paper-2`; floating panels `--paper-float`. |
| Ink | `--ink` `--ink-2` `--ink-3` `--muted` `--muted-2` | text, darkest → faintest. `--ink`/`--paper` flip between themes. |
| Rule | `--rule` `--rule-2` `--rule-strong` | hairlines: default / fainter / emphasis. |
| Accent | `--accent` `--accent-deep` `--accent-tint` | primary; follows `data-palette` (terracotta default, olive, inkblue). **Lifted in dark.** |
| Semantic status | `--olive(/-deep/-tint)` `--ochre(/-deep/-tint)` `--red(/-tint)` | good / watch / danger. **Lifted in dark.** Brand accent is NEVER a danger color. |
| Cover art | `--c-*(/-deep)` `--cover-fg` `--cover-fg-ink` | editorial cover gradients (theme-independent). |
| On-accent | `--ink-on-accent` | foreground on an accent fill (flips with theme). |
| Derived | `--scrim` | modal/nav dim — `color-mix` on `--ink`, so it self-adapts. |
| Wash | `--grain-a` `--grain-b` | body corner-glow. |
| Type | `--serif` `--sans` `--mono` | Instrument Serif / Geist / JetBrains Mono. |
| Spacing | `--pad-card(/-sm/-lg)` `--pad-section` `--gap-row` `--maxw` `--side-w` | card interiors (18/26/34), section rhythm, 1720px content cap. |

**Dark mode** stamps `data-mode="dark"` on `<body>` and retargets neutrals to GT's
softer charcoal; the accent and every semantic status color **lift** so pill text
stays legible on its dark tint. A `var()` indirection (`--accent: var(--terracotta)`)
only re-resolves where it is re-declared, so accents are re-declared in the dark
and palette blocks.

## 2. Type scale

Page title `.page-header .display-lg` = **44px/1.18** (GT masthead). Section titles
`.display-sm` (24) / `.display-md` (36). Body 13–14px at line-height **1.45**.
Every uppercase micro-label (eyebrow, field-label, stat sub, nav group, table
head) is **`var(--mono)`**. Page headers sit on a full **`--ink`** rule.

## 3. Components

Screens compose these primitives only — don't hand-roll their equivalents:
`PageHeader`, `Section`, `Card`, `Table`/`Row`/`Cell`, `Pill`, `KV`, `Metric`,
`Button`, `Tabs`, `StatNumber`, `Eyebrow`, `Rule`, `Bar`, `Icon`. Status/risk
badges go through **`riskPill()`** (one place decides tone, label, and width) —
never a hand-rolled `<Pill tone={…}>` ternary, which is how the accent-as-danger
drift crept in.

**Cards** radius 2px; interior padding from `--pad-card*` (never ad-hoc px).
**Empty states** use `.empty-state`. **Card grids** use the `stat-grid` family.

## 4. State rules (GT parity)

- **Nav active**: ink fill + paper text in BOTH themes (inverts cleanly in dark;
  no accent).
- **Hover** is ONE model: every surface/row/tile/nav/icon/ghost-button hover uses
  `background: var(--hover)` — a translucent-ink overlay (`color-mix(--ink 6%)`)
  that darkens in light and lightens in dark, so it is visible on ANY base surface
  (paper, paper-2, paper-3, a tint) in EITHER theme. Never hover to an absolute
  surface token (`--paper-2` on a `--paper-2` surface is invisible — that was the
  bug). Cards additionally set `border-color: var(--ink)`. All link variants
  underline to `--ink`. Solid/accent buttons darken to `--accent-deep`.
- **Selected row/tile**: `--paper-2`/`--accent-tint` + a 3px inset accent rail.
- **Focus**: the global `:focus-visible` ring (incl. `a`); don't `outline:none` a
  real control without a `:focus-within` fallback.
- Transitions ~`.12s`, disabled under `prefers-reduced-motion`.
- **Accent bars** (decorative left edges) are 3px.

## 5. Guards (the contract is enforced)

- **`src/design-tokens.test.mjs`** (`npm run test:unit`) — fails on any raw color
  literal that isn't a token definition, a pure black/white alpha, or inside a
  `url()`. This is what keeps colors from drifting back to hardcoded values.
- **`scripts/whiteglove-sweep.mjs`** — walks every screen across all campaigns and
  fails on: text defects, inert affordances, and **any pill cut off in its cell**.
- **`scripts/mobile-sweep.mjs`** (with `--self-test`) and **`scripts/viewport-sweep.mjs`** —
  the phone-companion gate and the device matrix (§7). They build the app and
  sweep their own `vite preview`; `BASE_URL=…` points them at a running server.
- **`src/surface.test.mjs`** — no stylesheet declares a width breakpoint below the
  workstation tier; the tiers live in `src/surface.js` only.
- Plus the e2e suite.

Run the whole set before shipping: `npm run test:unit && npm run build`, the two
layout sweeps, and `sweep:whiteglove` against a running dev server.

## 6. Pills — standardized but adaptive

Status/risk pills **fill their column up to a cap** (`width:100%` + `max-width`:
status 104px, severity 72px), so they align within a column, shrink to fit a
narrow one (never cut off), and relax to natural width in mobile cards. Standalone
badges (KV values, notices) stay natural width.

## 7. The phone companion (a separate surface, not a breakpoint)

Below the workstation tier the app renders the **companion shell**
(`src/shell/CompanionShell.jsx`) — its own component tree, not the desktop
restyled. Template: `portofolio-hub/docs/MOBILE_COMPANION_BENCHMARK.md`.

- **Tiers** (`src/surface.js`, the only source): phone < 768, tablet 768–1023,
  workstation ≥ 1024. CSS reads `<html data-surface | data-tier | data-shape |
  data-authority>` through `:where(...)`, so a tier rule keeps the specificity of
  a plain class.
- **Shell**: no sidebar, no topbar. A 52px app bar (campaign, screen name, the
  standing "Mock data" notice); a fixed tab bar per role (triage and
  monitoring, never approvals) plus **More** — a sheet with the full nav (desk
  surfaces tagged `desk`), workstation actions (tagged), campaign, demo role,
  tour, theme and "Open the desktop layout". No floating control over the page.
- **Short landscape** (height ≤ 500px): the tabs become a 76px side rail, the
  app bar scrolls away and the masthead compacts.
- **Screens**: tables cardify; filter bars fold behind one `<details>`
  (`FilterFold`); on the phone tier the masthead drops its eyebrow and sub-line
  (the app bar already names the screen). People pages 10 cards at a time and a
  record is its own screen at `#people/<id>`.
- **Authority**: `DESK_ONLY_VIEWS` render the designed desk-only state below the
  workstation tier and in the forced desktop view on a phone (DECISIONS ADR-001);
  role-home CTAs to desk surfaces are not rendered there.
- **Full desktop view**: `?layout=desktop` or More → "Open the desktop layout"
  sets the viewport meta to a 1280 layout, with "Back to the phone layout" first
  in the topbar.
- **Floors**: every target ≥ 44×44 (width and height); the document is the only
  scroller (the More sheet, a dialog, is the one exception); nothing is wider
  than the viewport.
