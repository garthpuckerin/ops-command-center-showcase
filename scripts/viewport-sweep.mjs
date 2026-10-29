#!/usr/bin/env node
/* Viewport sweep — every surface at every shape it will actually be seen in
 * (ported from janus-showcase/scripts/viewport-sweep.mjs, adapted to this
 * app's routes, shells and desk-only authority).
 *
 * The matrix: phone and tablet × portrait and landscape × { the layout the app
 * chooses, the full desktop view forced with ?layout=desktop } + the extra
 * phone sizes this repo has always swept + the narrow-desktop and desktop
 * widths where the workstation topbar must stay one row.
 *
 * Every cell × screen is judged on: the expected shell (companion below the
 * workstation tier, desktop at/above it or when forced); the floor (nothing
 * wider than the viewport, no sideways scroller, the document is the only
 * scroller); AUTHORITY (desk-only routes are desk-only in every cell below
 * the workstation tier — forced desktop on a small device included — and live
 * at the workstation); on the companion the phone contract (no table, targets
 * ≥44×44, tab bar anchored, ≥60% of the height left for content, a side rail
 * — not a bottom bar — on a short landscape screen, first content high); in
 * the forced desktop a ≥1024 layout with the way back on screen.
 *
 *   node scripts/viewport-sweep.mjs            run the matrix
 *   node scripts/viewport-sweep.mjs --shots    also write media/viewport/*.png
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium, devices } from '@playwright/test'
import { withPreviewServer, seedPastLanding, gotoRoute, ROOT, DESK_ONLY_ROUTES, WORKSTATION_MIN } from './lib/sweep-server.mjs'
import { measurePage, measure, CONTENT_SELECTOR, TOUCH_TARGET_ALLOWLIST } from './lib/probes.mjs'

const SHOTS = process.argv.includes('--shots')
const SHOT_DIR = join(ROOT, 'media', 'viewport')

const touch = (width, height, screen) => ({ viewport: { width, height }, screen, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const desktop = (width, height) => ({ viewport: { width, height }, screen: { width: Math.max(width, 1920), height: Math.max(height, 1080) }, deviceScaleFactor: 1, isMobile: false, hasTouch: false })

const CELLS = [
  { id: 'phone-portrait', device: devices['iPhone 13'] },
  { id: 'phone-portrait-small', device: touch(360, 800, { width: 360, height: 800 }) },
  { id: 'phone-portrait-max', device: touch(430, 932, { width: 430, height: 932 }) },
  { id: 'phone-landscape', device: devices['iPhone 13 landscape'] },
  { id: 'phone-landscape-SE', device: touch(667, 375, { width: 375, height: 667 }) },
  { id: 'phone-landscape-844', device: touch(844, 390, { width: 390, height: 844 }) },
  { id: 'phone-landscape-max', device: touch(932, 430, { width: 430, height: 932 }) },
  { id: 'tablet-portrait', device: devices['iPad Mini'] },
  { id: 'tablet-landscape', device: devices['iPad Mini landscape'] },
  { id: 'tablet-large-portrait', device: devices['iPad Pro 11'] },
  { id: 'tablet-large-landscape', device: devices['iPad Pro 11 landscape'] },
  { id: 'phone-portrait-DESKTOP', device: devices['iPhone 13'], forced: true },
  { id: 'phone-landscape-DESKTOP', device: devices['iPhone 13 landscape'], forced: true },
  { id: 'tablet-portrait-DESKTOP', device: devices['iPad Mini'], forced: true },
  { id: 'tablet-large-portrait-DESKTOP', device: devices['iPad Pro 11'], forced: true },
  { id: 'desktop-1050', device: desktop(1050, 800) },
  { id: 'desktop-1100', device: desktop(1100, 800) },
  { id: 'desktop-1250', device: desktop(1250, 800) },
  { id: 'desktop-1280', device: desktop(1280, 720) },
  { id: 'desktop-1366', device: desktop(1366, 768) },
  { id: 'desktop-1440', device: desktop(1440, 900) },
  { id: 'desktop-1536', device: desktop(1536, 864) },
  { id: 'desktop-1920', device: desktop(1920, 1080) },
  { id: 'desktop-2560', device: desktop(2560, 1440) },
]

const SCREENS = ['home', 'exceptions', 'people', 'readiness', 'reports', 'setup', 'writebacks', 'org-settings', 'imports']

function judgeCell(cell, route, m) {
  const p = []
  const w = cell.device.viewport.width
  const expectDesktop = cell.forced || w >= WORKSTATION_MIN
  // Authority is scoped by DEVICE tier: the forced desktop on a phone is still
  // a phone, and a layout below the workstation tier is never a workstation.
  const authority = !cell.forced && w >= WORKSTATION_MIN
  if (m.shell !== (expectDesktop ? 'desktop' : 'companion')) p.push(`shell=${m.shell}, expected ${expectDesktop ? 'desktop' : 'companion'}`)
  if (m.docWidth > m.vw + 1) p.push(`page scrolls sideways (${m.docWidth} > ${m.vw})`)
  if (m.tooWideCount) p.push(`${m.tooWideCount} element(s) past the viewport: ${m.tooWide.join('; ')}`)
  if (m.sideScrollers.length) p.push(`sideways scroller(s): ${m.sideScrollers.join(', ')}`)
  if (Math.abs(m.bodyHeight - m.docHeight) > 1) p.push(`body is a scroller (${m.bodyHeight} vs ${m.docHeight})`)

  if (DESK_ONLY_ROUTES.includes(route)) {
    if (!authority && (!m.deskOnly || m.approveButtons > 0)) p.push(`AUTHORITY: #${route} is live below the workstation tier (deskOnly=${m.deskOnly}, approve/reject=${m.approveButtons})`)
    if (authority && m.deskOnly) p.push(`#${route} is desk-gated on a workstation`)
    // Positive control: at the workstation the approve buttons the authority
    // check counts must exist — otherwise a relabelled button would make the
    // "no Approve/Reject below the tier" check pass blind.
    if (authority && route === 'writebacks' && m.approveButtons === 0) p.push('positive control failed: no Approve/Reject buttons on #writebacks at the workstation — the authority probe may be blind')
  }

  if (m.shell === 'companion') {
    if (m.hasTable) p.push('a <table> is rendered on the companion')
    if (m.smallCount) p.push(`${m.smallCount} target(s) under 44×44: ${m.small.join('; ')}`)
    if (m.nestedScrollers.length) p.push(`nested scroller(s): ${m.nestedScrollers.join(', ')}`)
    if (m.tabBar && !m.sideRail && Math.abs(m.tabBar.bottom - m.vh) > 1) p.push(`bottom tab bar is ${m.vh - m.tabBar.bottom}px off the viewport bottom`)
    const contentRatio = (m.vh - m.chrome) / m.vh
    if (contentRatio < 0.6) p.push(`only ${Math.round(contentRatio * 100)}% of the height is left for content (${m.chrome}px of fixed bars in ${m.vh}px)`)
    if (m.sideRail > m.vw * 0.15) p.push(`the side rail takes ${m.sideRail}px of a ${m.vw}px screen`)
    if (m.vh <= 500 && m.vw > m.vh && m.sideRail === 0) p.push(`short landscape screen (${m.vw}×${m.vh}) still uses a bottom tab bar`)
    if (m.firstContentTop !== null && m.firstContentTop > m.vh * 0.45) p.push(`first content starts at ${m.firstContentTop}px (${Math.round((m.firstContentTop / m.vh) * 100)}% down a ${m.vh}px screen)`)
  }

  if (cell.forced) {
    if (m.vw < WORKSTATION_MIN) p.push(`the forced desktop is laid out at ${m.vw}px — it must be a real desktop width, scaled to the screen`)
    if (!m.backToPhone) p.push('no visible "Back to the phone layout" in the forced desktop view')
    else if (m.backToPhone.right > m.vw || m.backToPhone.left < 0) p.push(`"Back to the phone layout" is off-screen (left=${m.backToPhone.left}, right=${m.backToPhone.right}, vw=${m.vw})`)
    if (m.sidebarWidth !== null && m.sidebarWidth > m.vw * 0.6) p.push(`the sidebar takes ${m.sidebarWidth}px of ${m.vw}px — a stacked reflow, not the desktop`)
  } else if (expectDesktop && m.shell === 'desktop') {
    // The workstation topbar stays ONE row; its controls compress, never wrap.
    if (m.topbarHeight !== null && m.topbarHeight > 84) p.push(`topbar wrapped to ${m.topbarHeight}px (should be one row)`)
    if (!m.sidebarWidth || m.sidebarWidth < 40) p.push('workstation without an inline sidebar')
  }
  return p
}

function judgeLanding(cell, m) {
  const p = []
  if (m.shell !== 'landing') p.push(`expected the landing, saw shell=${m.shell}`)
  if (m.docWidth > m.vw + 1) p.push(`landing scrolls sideways (${m.docWidth} > ${m.vw})`)
  if (m.smallCount) p.push(`${m.smallCount} landing target(s) under 44×44: ${m.small.join('; ')}`)
  return p
}

let checks = 0
let failures = 0
function report(cellId, label, m, problems) {
  checks += 1
  if (problems.length) failures += 1
  console.log(`${problems.length ? '✗' : '✓'} ${label.padEnd(14)} shell=${m.shell.padEnd(9)} layout=${m.vw}×${m.vh} chrome=${m.chrome}px first=${m.firstContentTop ?? '—'}${problems.length ? `\n    - ${problems.join('\n    - ')}` : ''}`)
}

await withPreviewServer({ port: 4291, outDir: 'dist-viewport' }, async (base) => {
  if (SHOTS) mkdirSync(SHOT_DIR, { recursive: true })
  const browser = await chromium.launch()
  try {
    for (const cell of CELLS) {
      const v = cell.device.viewport
      console.log(`\n== ${cell.id}  (${v.width}×${v.height}${cell.forced ? ', full desktop view forced' : ''})`)
      const context = await browser.newContext({ ...cell.device })
      await seedPastLanding(context)
      const page = await context.newPage()
      for (const route of SCREENS) {
        await gotoRoute(page, base, route, { query: cell.forced ? 'layout=desktop' : '' })
        const m = await measurePage(page)
        report(cell.id, `#${route}`, m, judgeCell(cell, route, m))
        if (SHOTS && ['home', 'exceptions', 'writebacks'].includes(route)) await page.screenshot({ path: join(SHOT_DIR, `${cell.id}--${route}.png`) })
      }
      await context.close()

      if (!cell.forced) {
        // The landing, on a context nothing has seeded.
        const fresh = await browser.newContext({ ...cell.device })
        const fp = await fresh.newPage()
        await fp.goto(base, { waitUntil: 'networkidle' })
        await fp.waitForTimeout(150)
        const m = await fp.evaluate(measure, { contentSelector: CONTENT_SELECTOR, allow: TOUCH_TARGET_ALLOWLIST })
        report(cell.id, 'landing', m, judgeLanding(cell, m))
        if (SHOTS) await fp.screenshot({ path: join(SHOT_DIR, `${cell.id}--landing.png`) })
        await fresh.close()
      }
    }
  } finally {
    await browser.close()
  }
  console.log(`\n${checks - failures}/${checks} cell×screen checks passed, ${failures} failed.`)
  if (failures) process.exitCode = 1
})
