#!/usr/bin/env node
/* Mobile sweep — the gate that is allowed to make a mobile claim
 * (portofolio-hub/docs/MOBILE_COMPANION_BENCHMARK.md, "The gate"; ported from
 * janus-showcase/scripts/mobile-sweep.mjs, adapted to this app's routes).
 * Builds the app, serves the local build on `vite preview`, and runs the
 * phone-companion contract on an emulated iPhone 13:
 *
 *   1  desktop chrome (aside.side / header.topbar) is NOT mounted
 *   2  the tab bar is fixed (bottom bar, or side rail on a short landscape
 *      screen) and every tab is ≥44×44
 *   3  first real content in the top 35% of the first screen; ≥2 items on lists
 *   4  every visible interactive target ≥44×44 — width AND height
 *   5  no <table>, nothing wider than the viewport, no sideways or nested
 *      scroller, the document is the only scroller
 *   6  nothing fixed covers an in-flow control (top of screen and end of screen)
 *   P  People: list and record ≤3.5 viewports, a bare #people/<id> deep link
 *      opens that record in a FRESH context, hash navigation re-renders, and
 *      in-app navigation writes the URL
 *   A  authority: every desk-only route renders the desk-only state from a deep
 *      link — with no Approve/Reject on screen — in every cell below the
 *      workstation tier, the 721–1023px gap band (phone landscape, portrait
 *      tablets, a narrow desktop window) included
 *   D  the full desktop view: reachable from More, laid out at ≥1024 with a
 *      visible way back, and it does NOT grant desk authority on a phone
 *
 * `--self-test` runs checks 1–4 against the desktop layout forced onto the
 * phone and FAILS unless every one of them fails there. A gate that cannot
 * fail is worse than none.
 *
 *   node scripts/mobile-sweep.mjs [--self-test]     (BASE_URL=… to skip the build)
 */
import { chromium, devices } from '@playwright/test'
import { LMS_DATA } from '../src/data.js'
import { withPreviewServer, seedPastLanding, gotoRoute, DESK_ONLY_ROUTES, WORKSTATION_MIN } from './lib/sweep-server.mjs'
import { measurePage, judge, scrollToEnd, scrollToTop } from './lib/probes.mjs'

const SELF_TEST = process.argv.includes('--self-test')
const PHONE = devices['iPhone 13']
const PRIMARY = 'nav[aria-label="Primary"]'

const LEAD_SCREENS = [
  { view: 'home' }, { view: 'exceptions', list: true }, { view: 'notifications', list: true },
  { view: 'readiness' }, { view: 'sessions' }, { view: 'people', list: true }, { view: 'learners', list: true },
  { view: 'reports' }, { view: 'setup' }, { view: 'departments' }, { view: 'facilities' },
  { view: 'timeline' }, { view: 'integrations' }, { view: 'walkthrough' }, { view: 'scenarios' },
  { view: 'catalog-map' }, { view: 'matrix' }, { view: 'settings' },
  // The desk-only state is a phone screen too — its exits must be reachable.
  ...DESK_ONLY_ROUTES.map((view) => ({ view })),
]
const ROLE_SCREENS = [
  { role: 'trainer', view: 'home' }, { role: 'trainer', view: 'sessions' }, { role: 'trainer', view: 'exceptions', list: true },
  { role: 'learner', view: 'home' }, { role: 'learner', view: 'learners' },
]

/* The authority matrix: every shape below the workstation tier. */
const custom = (width, height, screen, isMobile = true) => ({ viewport: { width, height }, screen, deviceScaleFactor: isMobile ? 2 : 1, isMobile, hasTouch: isMobile })
const AUTHORITY_CELLS = [
  ['phone portrait 390', PHONE],
  ['phone landscape 750', devices['iPhone 13 landscape']],
  ['phone landscape 844', custom(844, 390, { width: 390, height: 844 })],
  ['phone landscape 932', custom(932, 430, { width: 430, height: 932 })],
  ['tablet portrait 768', devices['iPad Mini']],
  ['tablet portrait 834', devices['iPad Pro 11']],
  ['narrow desktop window 1000', custom(1000, 760, { width: 1920, height: 1080 }, false)],
]

/* A real record, picked by PROPERTY (the flagship campaign's first learner
 * with an open exception), never a hardcoded id. */
const PERSON = LMS_DATA.learners.find((l) => l.campaign_id === 'camp-st-anne' && l.exception) || LMS_DATA.learners[0]

const outcomes = []
const record = (id, { ok, detail }) => outcomes.push({ id, ok, detail })

async function phonePage(browser, device = PHONE, seed = {}) {
  const context = await browser.newContext({ ...device })
  await seedPastLanding(context, seed)
  return { context, page: await context.newPage() }
}

async function contractOnScreen(page, label, { list = false } = {}) {
  await scrollToTop(page)
  const top = await measurePage(page)
  await scrollToEnd(page)
  const end = await measurePage(page)
  await scrollToTop(page)
  record(`1 · ${label}: desktop chrome absent`, judge.chromeAbsent(top))
  record(`2 · ${label}: tab bar fixed, tabs ≥44×44`, judge.tabBar(top))
  record(`3 · ${label}: first content high${list ? ', ≥2 items' : ''}`, judge.firstContent(top, { list }))
  record(`4 · ${label}: every target ≥44×44`, judge.touch(top))
  record(`5 · ${label}: no table, no overflow, one scroller`, judge.hygiene(top))
  record(`6 · ${label}: nothing fixed covers a control`, judge.notCovered(top, end))
  return top
}

async function openMore(page) {
  await page.locator(PRIMARY).getByRole('button', { name: /^More/ }).click()
  await page.waitForTimeout(200)
}

async function runContract(browser, base) {
  const { context, page } = await phonePage(browser)
  for (const s of LEAD_SCREENS) {
    await gotoRoute(page, base, s.view)
    await contractOnScreen(page, `#${s.view}`, s)
  }
  await gotoRoute(page, base, 'home')
  await openMore(page)
  const sheet = await measurePage(page)
  record('4 · More (open): every target ≥44×44', judge.touch(sheet))
  record('5 · More (open): no overflow, one scroller', judge.hygiene(sheet))
  await context.close()

  for (const s of ROLE_SCREENS) {
    const r = await phonePage(browser, PHONE, { role: s.role })
    await gotoRoute(r.page, base, s.view)
    await contractOnScreen(r.page, `${s.role} #${s.view}`, s)
    await r.context.close()
  }
}

async function heading(page) {
  return (await page.locator('.screen h1').first().innerText().catch(() => '')).trim()
}

async function runPeople(browser, base) {
  const { context, page } = await phonePage(browser)
  await gotoRoute(page, base, 'people')
  record('P1 · #people: the list is ≤3.5 viewports', judge.length(await measurePage(page)))

  // In-app navigation must write the URL, or nothing on the phone can be shared.
  await page.locator(PRIMARY).getByRole('button', { name: 'Queue' }).click()
  await page.waitForTimeout(200)
  const hashAfterTab = await page.evaluate(() => location.hash)
  record('P2 · tapping the Queue tab writes #exceptions to the URL', { ok: hashAfterTab === '#exceptions', detail: `location.hash=${hashAfterTab || '(empty)'}` })

  // Same-document hash navigation (a pasted link, the back button) re-renders.
  await gotoRoute(page, base, 'exceptions')
  const exceptionsHeading = await heading(page)
  await gotoRoute(page, base, 'home')
  await page.evaluate(() => { location.hash = '#exceptions' })
  await page.waitForTimeout(300)
  const afterHashChange = await heading(page)
  record('P3 · a hashchange (#home → #exceptions) re-renders the screen', { ok: afterHashChange === exceptionsHeading, detail: `heading after hashchange "${afterHashChange}", expected "${exceptionsHeading}"` })
  await context.close()

  // A bare record link opened by someone with no session.
  const fresh = await browser.newContext({ ...PHONE })
  await seedPastLanding(fresh)
  const fp = await fresh.newPage()
  await gotoRoute(fp, base, `people/${PERSON.id}`)
  const recordHeading = await heading(fp)
  record(`P4 · a bare deep link #people/${PERSON.id} opens that record in a fresh context`, { ok: recordHeading === PERSON.name, detail: `heading "${recordHeading}", expected "${PERSON.name}"` })
  if (recordHeading === PERSON.name) {
    const m = await contractOnScreen(fp, `#people/${PERSON.id}`)
    record(`P5 · #people/${PERSON.id}: the record is ≤3.5 viewports`, judge.length(m))
  }
  await fresh.close()
}

async function runAuthority(browser, base) {
  for (const [cellName, device] of AUTHORITY_CELLS) {
    const w = device.viewport.width
    if (w >= WORKSTATION_MIN) throw new Error(`authority cell ${cellName} is not below the workstation tier`)
    const { context, page } = await phonePage(browser, device)
    for (const route of DESK_ONLY_ROUTES) {
      await gotoRoute(page, base, route)
      const m = await measurePage(page)
      const ok = m.deskOnly && m.approveButtons === 0
      record(`A · ${cellName} (${w}×${device.viewport.height}) #${route}: desk-only, no Approve/Reject`, { ok, detail: ok ? 'desk-only state, 0 approve/reject buttons' : `deskOnly=${m.deskOnly} approve/reject buttons=${m.approveButtons} shell=${m.shell}` })
    }
    await context.close()
  }
}

async function runDesktopView(browser, base) {
  const { context, page } = await phonePage(browser)
  await gotoRoute(page, base, 'home')
  await openMore(page)
  const openLink = page.getByRole('button', { name: 'Open the desktop layout' })
  const reachable = (await openLink.count()) > 0
  record('D1 · More offers "Open the desktop layout"', { ok: reachable, detail: reachable ? 'present' : 'not found in More' })
  if (!reachable) { await context.close(); return }
  await openLink.click()
  await page.waitForTimeout(400)
  const forced = await measurePage(page)
  const backOnScreen = forced.backToPhone && forced.backToPhone.left >= 0 && forced.backToPhone.right <= forced.vw && forced.backToPhone.top >= 0 && forced.backToPhone.bottom <= forced.vh
  record('D2 · the full desktop view is the real desktop (≥1024 layout) with a way back on screen', {
    ok: forced.shell === 'desktop' && forced.vw >= WORKSTATION_MIN && Boolean(backOnScreen),
    detail: `shell=${forced.shell} layout=${forced.vw}px backToPhone=${JSON.stringify(forced.backToPhone)}`,
  })
  await gotoRoute(page, base, 'writebacks')
  const gated = await measurePage(page)
  record('D3 · the forced desktop on a phone keeps write-backs desk-only (no Approve/Reject)', { ok: gated.deskOnly && gated.approveButtons === 0, detail: `shell=${gated.shell} deskOnly=${gated.deskOnly} approve/reject=${gated.approveButtons}` })
  if (backOnScreen) {
    await page.locator('[data-back-to-phone]').click()
    await page.waitForTimeout(400)
    const back = await measurePage(page)
    record('D4 · "Back to the phone layout" returns to the companion at the device width', { ok: back.shell === 'companion' && back.vw === PHONE.viewport.width, detail: `shell=${back.shell} layout=${back.vw}px` })
  }
  await context.close()
}

async function runSelfTest(browser, base) {
  const { context, page } = await phonePage(browser)
  await gotoRoute(page, base, 'home', { query: 'layout=desktop' })
  const m = await measurePage(page)
  await context.close()
  const checks = [
    ['1 · desktop chrome absent', judge.chromeAbsent(m)],
    ['2 · tab bar fixed, tabs ≥44×44', judge.tabBar(m)],
    ['3 · first content high', judge.firstContent(m)],
    ['4 · every target ≥44×44', judge.touch(m)],
  ]
  console.log(`\n--self-test: the desktop layout forced onto an iPhone 13 (?layout=desktop; layout ${m.vw}×${m.vh}, shell=${m.shell})`)
  let allFailed = true
  for (const [id, r] of checks) {
    console.log(`${r.ok ? '✗ (did NOT fail — the gate cannot tell this from the companion)' : '✓ (correctly FAILS)'} ${id} — ${r.detail}`)
    if (r.ok) allFailed = false
  }
  console.log(allFailed ? '\nself-test PASSED: the squeezed desktop fails checks 1–4.' : '\nself-test FAILED: at least one check passed on the squeezed desktop.')
  if (!allFailed) process.exitCode = 1
}

await withPreviewServer({ port: 4288, outDir: 'dist-sweep' }, async (base) => {
  const browser = await chromium.launch()
  try {
    if (SELF_TEST) return await runSelfTest(browser, base)
    await runContract(browser, base)
    await runPeople(browser, base)
    await runAuthority(browser, base)
    await runDesktopView(browser, base)
  } finally {
    await browser.close()
  }
  console.log('')
  for (const o of outcomes) console.log(`${o.ok ? '✓' : '✗'} ${o.id} — ${o.detail}`)
  const failed = outcomes.filter((o) => !o.ok).length
  console.log(`\n${outcomes.length - failed}/${outcomes.length} mobile checks passed, ${failed} failed.`)
  if (failed) process.exitCode = 1
})
