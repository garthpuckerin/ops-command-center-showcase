// Teams — the activation model must be VISIBLE (gap #4). The setup gate shows
// each campaign's owning teams with derived criteria/blocker rollups, and the
// counts flex per campaign: St. Anne's go-live ran six teams; the compliance
// cycle runs one. Before this, ownership was free-text strings and the
// "6 teams each owning different criteria" story had no representation.

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

test('St. Anne setup gate shows six owning teams and the campaign-added criterion', async ({ page }) => {
  await seedState(page, { role: 'lead', view: 'setup', campaignId: 'camp-st-anne' })
  await page.goto('/')

  await expect(page.locator('.main').getByText('Owning teams')).toBeVisible()
  for (const teamName of ['Readiness Leadership', 'Operations PMO', 'HRIS & Data', 'Training Operations', 'Access & Identity', 'Go-Live Command Center']) {
    await expect(
      page.locator('.main').getByText(teamName).first(),
      `team "${teamName}" must appear in the activation model`
    ).toBeVisible()
  }
  // The seventh criterion St. Anne added beyond its template's six.
  await expect(page.locator('.main').getByText('Command center coverage plan')).toBeVisible()
})

test('the compliance campaign runs ONE owning team (the model flexes per campaign)', async ({ page }) => {
  await seedState(page, { role: 'lead', view: 'setup', campaignId: 'camp-compliance-2026' })
  await page.goto('/')

  await expect(page.locator('.main').getByText('Owning teams')).toBeVisible()
  await expect(page.locator('.main').getByText('Compliance Office').first()).toBeVisible()
  // No go-live teams bleed into the compliance campaign's model.
  await expect(page.locator('.main').getByText('Access & Identity')).toHaveCount(0)
  await expect(page.locator('.main').getByText('Training Operations')).toHaveCount(0)
})

test('the campaign home surfaces the team count per campaign', async ({ page }) => {
  await seedState(page, { role: 'lead', view: 'home', campaignId: 'camp-st-anne' })
  await page.goto('/')
  await expect(
    page.locator('.campaign-notice .metric').filter({ hasText: 'Teams' }),
    'St. Anne home shows its six owning teams'
  ).toContainText('6')
})
