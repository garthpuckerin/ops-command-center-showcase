// Template instantiation, end to end — creating a campaign from a template
// must land the user in a template-SHAPED campaign: the template's home
// layout, its terminology, and a launch gate seeded with the template's
// sections. Before this, the create screen previewed reports/requirements it
// silently dropped, and every new campaign was a blank Epic-shaped shell.

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

test('creating a compliance campaign lands on a compliance-shaped campaign', async ({ page }) => {
  await seedState(page, { role: 'lead', view: 'new-campaign', campaignId: 'camp-st-anne' })
  await page.goto('/')

  // Pick the compliance template; the preview shows what will be instantiated.
  await page.getByRole('button', { name: 'Compliance Cycle' }).click()
  await expect(page.locator('.main').getByText('Detection thresholds')).toBeVisible()

  // Name it and create.
  await page.locator('.main input').first().fill('Q4 Compliance Cycle')
  await page.getByRole('button', { name: 'Create campaign', exact: true }).click()

  // Landed on the COMPLIANCE home of the new campaign — its shape, not a
  // blank Epic shell — with an honest empty state, not a headers-only table.
  await expect(page.locator('.main').getByText('Compliance completion home.')).toBeVisible()
  await expect(page.locator('.main').getByText(/days to deadline/i)).toBeVisible()
  await expect(page.locator('.main').getByText(/No assignees in this campaign yet/i)).toBeVisible()

  // The launch gate was seeded from the template's sections, unsigned.
  await page.locator('[data-tour="nav-setup"]').click()
  await expect(page.locator('.main').getByText('Detection thresholds')).toBeVisible()
  await expect(page.locator('.main').getByText('Assignment population')).toBeVisible()
  await expect(page.locator('.main').getByText('Not ready for launch approval.')).toBeVisible()
})

test('creating an acquisition campaign lands on the analyst home with its own gate', async ({ page }) => {
  await seedState(page, { role: 'lead', view: 'new-campaign', campaignId: 'camp-st-anne' })
  await page.goto('/')

  await page.getByRole('button', { name: 'Acquisition Onboarding' }).click()
  await page.locator('.main input').first().fill('Lakeside Acquisition')
  await page.getByRole('button', { name: 'Create campaign', exact: true }).click()

  await expect(page.locator('.main').getByText('Import and reconciliation home.')).toBeVisible()
  await expect(page.locator('.main').getByText(/days to cutover/i)).toBeVisible()

  await page.locator('[data-tour="nav-setup"]').click()
  await expect(page.locator('.main').getByText('Old org role mapping')).toBeVisible()
})
