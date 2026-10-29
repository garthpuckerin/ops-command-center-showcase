// The companion is its own shell, records are links, and the full desktop
// view on a phone is real and reversible. Ranked items 2–5 of the mobile
// companion pass (portofolio-hub/docs/MOBILE_COMPANION_BENCHMARK.md, Ops).

import { test, expect, devices } from '@playwright/test'
import { LMS_DATA } from '../src/data.js'

const UI_STATE_KEY = 'lms_ops_command_center_ui_state'
const ENTERED_KEY = 'ops:entered:v1'
const PERSON = LMS_DATA.learners.find((l) => l.campaign_id === 'camp-st-anne' && l.exception) || LMS_DATA.learners[0]

const seedState = (page, state) =>
  page.addInitScript(([enteredKey, uiKey, s]) => {
    try {
      localStorage.setItem(enteredKey, 'true')
      localStorage.setItem(uiKey, JSON.stringify(s))
    } catch (e) { /* storage optional */ }
  }, [ENTERED_KEY, UI_STATE_KEY, state])

test.describe('companion shell (768×1024 tablet portrait)', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('the desktop sidebar and topbar are not mounted — not merely hidden', async ({ page }) => {
    await seedState(page, { role: 'lead', view: 'home', campaignId: 'camp-st-anne' })
    await page.goto('/')
    await expect(page.locator('.companion-tabs')).toBeVisible()
    await expect(page.locator('aside.side')).toHaveCount(0)
    await expect(page.locator('header.topbar')).toHaveCount(0)
    await expect(page.locator('.role-floater'), 'no floating control over the page').toHaveCount(0)
  })

  test('workstation actions stay reachable from More, and open the desk-only state', async ({ page }) => {
    await seedState(page, { role: 'lead', view: 'home', campaignId: 'camp-st-anne' })
    await page.goto('/')
    await page.locator('.companion-tabs').getByRole('button', { name: 'More' }).click()
    await page.getByRole('dialog', { name: 'More' }).getByRole('button', { name: /Invite people/ }).click()
    await expect(page.locator('.main').getByText('Invite people stays at the desk.')).toBeVisible()
    await expect(page.getByRole('button', { name: /Queue .*invite/ })).toHaveCount(0)
  })
})

test.describe('hash routing', () => {
  test('in-app navigation writes the URL and back returns to the previous screen', async ({ page }) => {
    await seedState(page, { role: 'lead', view: 'home', campaignId: 'camp-st-anne' })
    await page.goto('/#home')
    await page.locator('.side').getByRole('button', { name: 'Exceptions' }).click()
    await expect(page).toHaveURL(/#exceptions$/)
    await page.goBack()
    await expect(page).toHaveURL(/#home$/)
    await expect(page.locator('.main').getByText('Open blockers and escalations.')).toHaveCount(0)
  })

  test('a learner deep link to an admin route is replaced, not pushed', async ({ page }) => {
    await seedState(page, { role: 'learner', view: 'home', campaignId: 'camp-st-anne' })
    // A fresh tab: about:blank, then this load — two entries if the redirect
    // REPLACED #org-settings, three if it pushed #home on top of it.
    const pageEntries = async () => page.evaluate(() => history.length)
    await page.goto('/#org-settings')
    await expect(page).toHaveURL(/#home$/)
    await expect(page.getByText('Portable demo, governed platform.')).toHaveCount(0)
    await page.locator('.side').getByRole('button', { name: 'My Record' }).click()
    await expect(page).toHaveURL(/#learners$/)
    expect(await pageEntries(), 'the redirect replaced its entry; only the click pushed one').toBe(3)
    await page.goBack()
    await expect(page, 'back lands on the redirected #home, never the forbidden #org-settings').toHaveURL(/#home$/)
  })

  test('a People record deep link opens the profile drawer at the workstation', async ({ page }) => {
    await seedState(page, { role: 'lead', view: 'home', campaignId: 'camp-st-anne' })
    await page.goto(`/#people/${PERSON.id}`)
    const drawer = page.locator('.profile-drawer')
    await expect(drawer.getByRole('heading', { name: PERSON.name })).toBeVisible()
    await drawer.getByTitle('Close').click()
    await expect(page).toHaveURL(/#people$/)
    await expect(page.locator('.profile-drawer')).toHaveCount(0)
  })
})

test.describe('full desktop view on a phone', () => {
  // The phone's own descriptor (screen, touch, isMobile) — minus its browser
  // type, which Playwright only allows at the top level.
  const { defaultBrowserType, ...iphone } = devices['iPhone 13']
  test.use(iphone)

  test('is the real desktop, keeps desk-only scoping, and has a way back', async ({ page }) => {
    await seedState(page, { role: 'lead', view: 'writebacks', campaignId: 'camp-st-anne' })
    await page.goto('/?layout=desktop')
    await expect(page.locator('aside.side')).toBeVisible()
    expect(await page.evaluate(() => innerWidth), 'laid out at a desktop width, scaled').toBeGreaterThanOrEqual(1024)
    await expect(page.locator('.main').getByText('Write-back approvals stays at the desk.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Approve', exact: true }), 'the scaled desktop grants no approve authority').toHaveCount(0)

    await page.locator('[data-back-to-phone]').click()
    await expect(page.locator('.companion-tabs')).toBeVisible()
    await expect(page.locator('aside.side')).toHaveCount(0)
    expect(await page.evaluate(() => innerWidth)).toBe(390)
    await expect(page, 'the force param is dropped so a reload stays on the phone layout').not.toHaveURL(/layout=desktop/)
  })
})
