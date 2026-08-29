/* Mobile/tablet sweep — ops-command-center uses a hamburger→off-canvas drawer
 * on small viewports (no bottom tab bar), so this checks the defect classes that
 * design can still ship:
 *
 *  1. Sideways scroll — the page must never pan horizontally.
 *  2. Nested scroll regions — the app's scroll surface is .main (or the page).
 *     Any OTHER element that actually overflows is a finding on phone tiers
 *     (tables here cardify/ellipsize via .tbl grid rows, they do not x-scroll).
 *  3. Grids that stay multi-column beyond the tier's budget.
 *
 * Route injection (hash), lead role, per viewport. Nav-interaction coverage
 * lives in the e2e suite; the sweep needs fast, deterministic state entry.
 *
 *   BASE_URL=http://localhost:3200 node scripts/mobile-sweep.mjs
 */
import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3200'

const VIEWPORTS = [
  ['phone-P', 375, 812, 'phone'],
  ['phone-P small', 360, 800, 'phone'],
  ['phone-L', 844, 390, 'phone-land'],
  ['tablet-P', 768, 1024, 'tablet'],
  ['tablet-L', 1024, 768, 'tablet'],
]

const MAX_COLS = { phone: 2, 'phone-land': 3, tablet: 4 }

// Containers allowed to keep columns: table rows (grid-based, cells ellipsize),
// twin-stat rows, key/value rows, segmented controls, pill groups, nav.
const GRID_ALLOW = ['tbl', 'tbl-row', 'tbl-head', 'kv-list', 'seg', 'segmented', 'pill-group', 'stat-grid', 'stat-grid-4', 'two-col', 'theme-grid', 'roles-grid', 'card-grid', 'card-grid-2', 'side-nav', 'topbar', 'topbar-right', 'topbar-left']

const SCREENS = ['home', 'readiness', 'departments', 'facilities', 'exceptions', 'sessions', 'people', 'imports', 'writebacks', 'reports', 'setup', 'scoring', 'ai', 'org-settings']

const browser = await chromium.launch()
const issues = []
const note = (vp, screen, what) => issues.push(`${vp} · ${screen}: ${what}`)

for (const [vpName, width, height, tier] of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    isMobile: tier !== 'tablet',
    hasTouch: true,
    deviceScaleFactor: 2,
  })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ops:entered:v1', 'true')
      localStorage.setItem('lms_ops_command_center_ui_state', JSON.stringify({ role: 'lead', view: 'home', campaignId: 'camp-st-anne' }))
    } catch (e) {}
  })

  const settle = async () => {
    await page.waitForSelector('.side-link', { timeout: 10000 })
    await page.waitForTimeout(250)
  }

  const scan = async (screen) => {
    const r = await page.evaluate(({ tier, maxCols, allow }) => {
      const out = []
      const vis = (el) => {
        const b = el.getBoundingClientRect()
        if (b.width < 2 || b.height < 2) return false
        const cs = getComputedStyle(el)
        return cs.display !== 'none' && cs.visibility !== 'hidden'
      }
      const label = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''}`

      // 1. Sideways scroll.
      if (document.documentElement.scrollWidth > innerWidth + 1) {
        out.push(`page pans sideways (${document.documentElement.scrollWidth} > ${innerWidth})`)
      }

      // 2. Nested scroll regions. Allowed: the main content column, the
      // off-canvas nav drawer, and any dialog/drawer surface.
      for (const el of document.querySelectorAll('*')) {
        if (!vis(el)) continue
        const cs = getComputedStyle(el)
        const scrollsX = /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 2
        const scrollsY = /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2
        const allowedScroll = el.classList.contains('main') || el.classList.contains('content') ||
          el.closest('.side') || // the nav drawer and its scrolling nav list are allowed to scroll
          el === document.documentElement || el === document.body || el.closest('[role="dialog"], .drawer-panel, .profile-drawer, .nav-backdrop')
        if (allowedScroll) continue
        if (scrollsX) out.push(`x-scroll region: ${label(el)} (${el.scrollWidth}>${el.clientWidth})`)
        if (scrollsY) out.push(`nested y-scroll region: ${label(el)} (${el.scrollHeight}>${el.clientHeight})`)
      }

      // 3. Multi-column grids beyond the tier's budget.
      for (const el of document.querySelectorAll('*')) {
        if (!vis(el)) continue
        const cs = getComputedStyle(el)
        if (cs.display !== 'grid') continue
        if (allow.some((c) => el.classList.contains(c))) continue
        const tracks = cs.gridTemplateColumns.split(' ').map(parseFloat).filter((w) => w > 24)
        const cols = tracks.length
        const maxTrack = Math.max(0, ...tracks)
        const per = el.getBoundingClientRect().width / (cols || 1)
        if (cols > maxCols && maxTrack < 120) out.push(`${cols}-column grid at ${Math.round(per)}px/col: ${label(el)}`)
      }
      return out
    }, { tier, maxCols: MAX_COLS[tier], allow: GRID_ALLOW })
    for (const w of [...new Set(r)]) note(vpName, screen, w)
  }

  for (const view of SCREENS) {
    await page.goto(BASE + '/#' + view, { waitUntil: 'domcontentloaded' })
    await settle()
    await scan(view)
  }

  await ctx.close()
}

await browser.close()
console.log('')
if (issues.length === 0) console.log('✓ mobile sweep clean across ' + VIEWPORTS.length + ' viewports')
else {
  console.log(`${issues.length} issue(s):`)
  issues.forEach((i) => console.log('  ✗ ' + i))
  process.exitCode = 1
}
