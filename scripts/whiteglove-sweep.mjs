/* White-glove sweep — walks EVERY lead-role screen across ALL THREE campaigns
 * (including the empty Draft campaign) and reports two defect classes:
 *
 *  1. Text defects: negative day counts ("-4 d"), NaN, $NaN, Invalid Date,
 *     undefined / [object Object] leaking into rendered copy.
 *  2. Inert affordances: elements that LOOK interactive (.linkbtn, .link-btn,
 *     [role="button"]) whose computed cursor is not pointer — a surface that
 *     reads as clickable but isn't wired.
 *
 *   BASE_URL=http://localhost:3200 node scripts/whiteglove-sweep.mjs
 *   (defaults to the local dev server; pass a deployed URL for a live sweep)
 */
import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3200'

const TEXT_DEFECTS = [
  ['negative day count', /(?<![\w.$%-])-\d+\s?(d|days?)\b/],
  ['NaN', /(?<![a-zA-Z])NaN\b/],
  ['Invalid Date', /Invalid Date/],
  ['undefined', /\bundefined\b/],
  ['object Object', /\[object Object\]/],
]

const CAMPAIGNS = ['camp-st-anne', 'camp-riverbend', 'camp-ambulatory-wave2']

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

const issues = []
const note = (screen, what) => issues.push(`${screen}: ${what}`)

const seed = (campaignId) =>
  page.addInitScript(([enteredKey, uiKey, camp]) => {
    try {
      localStorage.setItem(enteredKey, 'true')
      localStorage.setItem(uiKey, JSON.stringify({ role: 'lead', view: 'home', campaignId: camp }))
    } catch (e) {}
  }, ['ops:entered:v1', 'lms_ops_command_center_ui_state', campaignId])

const settle = async () => {
  await page.waitForSelector('.side-link', { timeout: 10000 })
  await page.waitForTimeout(250)
}

const scan = async (screen) => {
  const { text, inert } = await page.evaluate(() => {
    const text = document.body.innerText
    const sels = '.linkbtn, .link-btn, [role="button"], [data-nav]'
    const inert = [...document.querySelectorAll(sels)]
      .filter((el) => getComputedStyle(el).cursor !== 'pointer' && !el.disabled && el.getAttribute('aria-disabled') !== 'true')
      .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${(el.textContent || '').trim().slice(0, 40)}"`)
    return { text, inert }
  })
  for (const [label, re] of TEXT_DEFECTS) {
    const m = text.match(re)
    if (m) {
      const at = text.indexOf(m[0])
      note(screen, `${label} → "…${text.slice(Math.max(0, at - 40), at + 30).replace(/\n/g, ' ⏎ ')}…"`)
    }
  }
  for (const el of [...new Set(inert)]) note(screen, `looks clickable but isn't: ${el}`)
}

for (const campaignId of CAMPAIGNS) {
  await seed(campaignId)
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await settle()

  // Discover every lead nav destination from the shell itself.
  const views = await page.evaluate(() =>
    [...document.querySelectorAll('[data-tour^="nav-"]')].map((el) => el.getAttribute('data-tour').replace(/^nav-/, '')),
  )
  for (const view of views) {
    await page.locator(`[data-tour="nav-${view}"]`).first().click()
    await page.waitForTimeout(300)
    await scan(`${campaignId}:${view}`)
  }
}

await browser.close()
console.log('')
if (issues.length === 0) console.log('✓ white-glove sweep clean')
else {
  console.log(`${issues.length} issue(s):`)
  issues.forEach((i) => console.log('  ✗ ' + i))
  process.exitCode = 1
}
