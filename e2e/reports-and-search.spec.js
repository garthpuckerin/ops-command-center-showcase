// Reports are campaign-scoped (no cross-campaign leakage) and the header's
// Quick search is a live control that lands on People Directory focused.
//
// The reports leak was the same defect class as the exceptions-filter leak:
// the seed reports carried no campaign_id, so St. Anne's "Daily Readiness
// Brief" (with St. Anne's department bars) rendered under the compliance and
// acquisition campaigns, and a global fallback guaranteed it even when nothing
// was scoped.

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

test('the compliance campaign shows its own report, not St. Anne\'s', async ({ page }) => {
  await seedState(page, { role: 'lead', view: 'reports', campaignId: 'camp-compliance-2026' })
  await page.goto('/')
  await expect(page.locator('.main').getByText('Compliance Completion').first()).toBeVisible()
  await expect(page.locator('.main').getByText('attestation completion').first()).toBeVisible()
  await expect(page.locator('.main').getByText('Daily Readiness Brief')).toHaveCount(0)
})

test('a campaign with no reporting package gets an honest empty state, not a borrowed report', async ({ page }) => {
  await seedState(page, { role: 'lead', view: 'reports', campaignId: 'camp-riverbend' })
  await page.goto('/')
  await expect(page.locator('.main').getByText('This campaign has no reporting package.')).toBeVisible()
  await expect(page.locator('.main').getByText('Daily Readiness Brief')).toHaveCount(0)
})

test('St. Anne keeps its full package (positive control)', async ({ page }) => {
  await seedState(page, { role: 'lead', view: 'reports', campaignId: 'camp-st-anne' })
  await page.goto('/')
  await expect(page.locator('.main').getByText('Daily Readiness Brief').first()).toBeVisible()
  await expect(page.locator('.main').getByText('Compliance Completion')).toHaveCount(0)
})

test('Quick search lands on People Directory with the search field focused', async ({ page }) => {
  await seedState(page, { role: 'lead', view: 'home', campaignId: 'camp-st-anne' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Quick search' }).click()
  await expect(page.locator('.main').getByText('Find any person by operational criteria.')).toBeVisible()
  await expect(page.locator('.people-filterbar input').first()).toBeFocused()
})

test('the sidebar brand line follows the campaign\'s template', async ({ page }) => {
  await seedState(page, { role: 'lead', view: 'home', campaignId: 'camp-compliance-2026' })
  await page.goto('/')
  await expect(page.locator('.side .brand-sub')).toHaveText('Compliance Cycle scenario')
  await expect(page.locator('.topbar-left .small')).toContainText('compliance cycle readiness')
})
