/* Viewport sweep — measures key screens across the real device matrix and
 * reports layout defects for ops-command-center's drawer-nav design:
 *   - sideways scroll (the page must never pan)
 *   - wrong nav tier: at <=980 the sidebar must be an off-canvas drawer with a
 *     hamburger; above 980 it must be the inline rail (no hamburger)
 *   - over-tall top bar
 *   - landing fit (fresh visitor) — no sideways scroll, CTA present
 *
 *   BASE_URL=http://localhost:3200 node scripts/viewport-sweep.mjs
 */
import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3200'
const DRAWER_BP = 980

const VIEWPORTS = [
  ['phone-P small', 360, 800], ['phone-P', 390, 844], ['phone-P max', 430, 932],
  ['phone-L SE', 667, 375], ['phone-L', 844, 390], ['phone-L max', 932, 430],
  ['tablet-P', 768, 1024], ['tablet-P big', 834, 1194], ['tablet-L', 1024, 768], ['tablet-L big', 1194, 834],
  ['narrow-1050', 1050, 800], ['narrow-1100', 1100, 800], ['narrow-1250', 1250, 800], ['narrow-1520', 1520, 864],
  ['laptop short', 1280, 720], ['laptop', 1366, 768], ['laptop 125%', 1536, 864],
  ['desktop FHD', 1920, 1080], ['desktop QHD', 2560, 1440],
]

const SCREENS = ['home', 'readiness', 'exceptions', 'writebacks', 'reports', 'setup', 'org-settings']

const browser = await chromium.launch()
const issues = []
const note = (vp, screen, what) => issues.push(`${vp} · ${screen}: ${what}`)

for (const [vpName, width, height] of VIEWPORTS) {
  // Emulate a real touch device below the drawer breakpoint (matches actual
  // phones/tablets and the mobile-sweep); desktop emulation above it.
  const mobileTier = width <= 1024
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: mobileTier ? 2 : 1,
    isMobile: mobileTier,
    hasTouch: mobileTier,
  })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ops:entered:v1', 'true')
      localStorage.setItem('lms_ops_command_center_ui_state', JSON.stringify({ role: 'lead', view: 'home', campaignId: 'camp-st-anne' }))
    } catch (e) {}
  })

  for (const view of SCREENS) {
    await page.goto(BASE + '/#' + view, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.side-link', { timeout: 10000 }).catch(() => note(vpName, view, 'shell never rendered'))
    await page.waitForTimeout(250)

    const m = await page.evaluate(() => {
      const r = (sel) => { const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { x: b.x, w: b.width, h: b.height, display: cs.display, transform: cs.transform, position: cs.position } }
      const toggle = document.querySelector('.nav-toggle')
      const toggleVisible = toggle ? getComputedStyle(toggle).display !== 'none' : false
      return {
        vw: innerWidth,
        scrollW: document.documentElement.scrollWidth,
        side: r('.side'), topbar: r('.topbar'),
        toggleVisible,
      }
    })

    if (m.scrollW > m.vw + 1) note(vpName, view, `sideways scroll (${m.scrollW} > ${m.vw})`)
    // Header invariant: on the inline (desktop) tier the topbar must stay ONE
    // row. Its flexible controls compress with ellipsis rather than wrap, so a
    // tall topbar (>84px ≈ two rows vs the ~64px single row) is the "broken
    // header" defect. (Below the drawer breakpoint the topbar legitimately
    // stacks for mobile, so only check width > 980.)
    if (width > 980 && m.topbar && m.topbar.h > 84) note(vpName, view, `topbar wrapped to ${Math.round(m.topbar.h)}px (should be one row)`)

    const isDrawerTier = width <= DRAWER_BP
    if (isDrawerTier) {
      // Off-canvas: the hamburger must be present and the sidebar must sit off
      // the left edge (translated out) when closed.
      if (!m.toggleVisible) note(vpName, view, 'drawer tier but no hamburger toggle')
      if (m.side && m.side.x >= 0 && m.side.transform === 'none') note(vpName, view, 'drawer tier but sidebar is inline (not off-canvas)')
    } else {
      // Inline rail: hamburger must be hidden and the sidebar occupies real space.
      if (m.toggleVisible) note(vpName, view, 'inline tier but hamburger is visible')
      if (!m.side || m.side.w < 40) note(vpName, view, 'inline tier but sidebar has no width')
    }
  }

  // Landing fit (fresh visitor — clear the entered flag).
  const fresh = await ctx.newPage()
  await fresh.addInitScript(() => { try { localStorage.removeItem('ops:entered:v1') } catch (e) {} })
  await fresh.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await fresh.waitForTimeout(200)
  const lm = await fresh.evaluate(() => ({
    sideways: document.documentElement.scrollWidth > innerWidth + 1,
    headline: !!document.querySelector('.landing-headline'),
  }))
  if (lm.sideways) note(vpName, 'landing', 'sideways scroll')
  if (!lm.headline) note(vpName, 'landing', 'headline missing')

  await ctx.close()
}

await browser.close()
console.log('')
if (issues.length === 0) console.log('✓ viewport sweep clean across ' + VIEWPORTS.length + ' viewports')
else { console.log(`${issues.length} issue(s):`); issues.forEach((i) => console.log('  ✗ ' + i)); process.exitCode = 1 }
