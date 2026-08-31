// Surface-scoped authority — the phone is a monitoring/triage companion, not
// the workstation squeezed smaller. Workstation surfaces (approvals, imports,
// scoring, AI staging, org settings, campaign creation) render a deliberate
// desk-only state on phone viewports, by every path including deep links —
// while triage (the exception queue) keeps its authority. This guards the
// "too much authority on mobile" defect class (GrantTracker reveal lesson).

import { test, expect } from '@playwright/test'

const UI_STATE_KEY = 'lms_ops_command_center_ui_state'
const ENTERED_KEY = 'ops:entered:v1'

const seedState = (page, state) =>
  page.addInitScript(([enteredKey, uiKey, s]) => {
    try {
      localStorage.setItem(enteredKey, 'true')
      localStorage.setItem(uiKey, JSON.stringify(s))
    } catch (e) { /* storage optional */ }
  }, [ENTERED_KEY, UI_STATE_KEY, state])

test.describe('phone companion', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('write-back approvals are desk-only on the phone', async ({ page }) => {
    await seedState(page, { role: 'lead', view: 'writebacks', campaignId: 'camp-st-anne' })
    await page.goto('/')

    await expect(page.locator('.main').getByText('Write-back approvals stays at the desk.')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Approve', exact: true }),
      'no approve authority on the phone'
    ).toHaveCount(0)
    // The state is informative, not a dead end: it shows what is waiting.
    await expect(page.locator('.main').getByText(/staged payloads? (is|are) waiting for desk review/)).toBeVisible()
  })

  test('deep links to workstation surfaces are guarded too', async ({ page }) => {
    await seedState(page, { role: 'lead', view: 'home', campaignId: 'camp-st-anne' })
    await page.goto('/#org-settings')

    await expect(page.locator('.main').getByText('Org settings stays at the desk.')).toBeVisible()
    await expect(page.getByText('Portable demo, governed platform.')).toHaveCount(0)
  })

  test('the tab bar carries triage, not approvals — and triage keeps its authority', async ({ page }) => {
    await seedState(page, { role: 'lead', view: 'exceptions', campaignId: 'camp-st-anne' })
    await page.goto('/')

    const tabbar = page.locator('.mobile-tabbar')
    await expect(tabbar.getByText('Alerts')).toBeVisible()
    await expect(tabbar.getByText('Approvals')).toHaveCount(0)

    // Field triage is what a phone IS for: select an OPEN exception (the
    // queue's first row is a resolved one) and Resolve stays live.
    await page.locator('.main').getByText('Duplicate account').first().click()
    await expect(page.getByRole('button', { name: 'Resolve', exact: true })).toBeVisible()
  })
})

test.describe('phone companion — advertised authority', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('role-home CTAs do not advertise workstation surfaces on the phone', async ({ page }) => {
    await seedState(page, { role: 'lead', view: 'home', campaignId: 'camp-riverbend' })
    await page.goto('/')

    await expect(page.locator('.main').getByText('Import and reconciliation home.')).toBeVisible()
    // The desk CTAs exist for the workstation but are hidden on the phone.
    await expect(page.getByRole('button', { name: 'Open import wizard' })).toBeHidden()
    await expect(page.getByRole('button', { name: 'Tune scoring' })).toBeHidden()
    // The monitoring paths remain.
    await expect(page.getByRole('button', { name: 'Review launch gate' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Preview reports' })).toBeVisible()
  })

  test('the phone tour never walks a desk-gated surface', async ({ page }) => {
    await seedState(page, { role: 'lead', view: 'home', campaignId: 'camp-st-anne' })
    await page.goto('/')

    await page.getByRole('button', { name: 'Toggle demo role switcher' }).click()
    await page.getByRole('button', { name: 'Start tour' }).click()
    const dialog = page.locator('.tour-card')
    await expect(dialog).toBeVisible()

    for (let i = 0; i < 12; i++) {
      await expect(
        page.locator('.main').getByText('stays at the desk.'),
        'a tour step must never narrate a surface the phone gates'
      ).toHaveCount(0)
      const next = dialog.getByRole('button', { name: /^(Next|Finish)$/ })
      const label = (await next.innerText()).trim()
      await next.click()
      if (label === 'Finish') break
    }
    await expect(dialog, 'the tour completes').toHaveCount(0)
  })
})

test.describe('workstation', () => {
  test('the same surface keeps full authority at the desk', async ({ page }) => {
    await seedState(page, { role: 'lead', view: 'writebacks', campaignId: 'camp-st-anne' })
    await page.goto('/')

    await expect(
      page.getByRole('button', { name: 'Approve', exact: true }).first(),
      'desk retains approve authority'
    ).toBeVisible()
    await expect(page.locator('.main').getByText('stays at the desk.')).toHaveCount(0)
  })

  test('the desk keeps its role-home CTAs', async ({ page }) => {
    await seedState(page, { role: 'lead', view: 'home', campaignId: 'camp-riverbend' })
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Open import wizard' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tune scoring' })).toBeVisible()
  })
})
