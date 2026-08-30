// Per-campaign shape — switching campaigns must change the HOME's shape, not
// just its numbers. Each campaign binds a template (terminology) and declares a
// default_home_view (layout), so the lead home renders a genuinely different
// screen per campaign:
//   - camp-st-anne (Epic Go-Live, active)  → executive Command Center (unchanged flagship)
//   - camp-riverbend (Acquisition, intake) → analyst import/reconciliation home, "Cutover" terminology
//   - camp-ambulatory-wave2 (draft)        → team follow-up home with the setup-owner checklist
//
// This guards the Layer-2 adaptability claim (template/adaptability assessment,
// 2026-08-30): before this wiring, all three campaigns fell through to one
// identical layout and the "platform bends to each campaign" story was
// asserted, not shown.

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

test('riverbend home is the analyst import/reconciliation layout with Cutover terminology', async ({ page }) => {
  await seedState(page, { role: 'lead', view: 'home', campaignId: 'camp-riverbend' })
  await page.goto('/')

  await expect(
    page.locator('.main').getByText('Import and reconciliation home.'),
    'riverbend must open on the analyst home, not the shared command center'
  ).toBeVisible()

  // Template terminology: the acquisition template renames the launch "Cutover".
  await expect(
    page.locator('.main').getByText(/days to cutover/i),
    'acquisition terminology (Cutover) must reach the countdown stat'
  ).toBeVisible()
})

test('ambulatory draft home is the team follow-up layout with the setup-owner checklist', async ({ page }) => {
  await seedState(page, { role: 'lead', view: 'home', campaignId: 'camp-ambulatory-wave2' })
  await page.goto('/')

  await expect(
    page.locator('.main').getByText('Team follow-up home.'),
    'ambulatory must open on the team follow-up home'
  ).toBeVisible()

  // The owner checklist derives from the campaign's real setup sections.
  await expect(
    page.locator('.main').getByText('Ambulatory Ops'),
    'the setup-owner checklist must list the blocked section owner'
  ).toBeVisible()
})

test('st-anne home is still the executive Command Center (flagship unchanged)', async ({ page }) => {
  await seedState(page, { role: 'lead', view: 'home', campaignId: 'camp-st-anne' })
  await page.goto('/')

  await expect(
    page.locator('.main h1').first(),
    'the flagship campaign keeps the executive Command Center home'
  ).toContainText('Command Center')

  await expect(
    page.locator('.main').getByText(/days to go-live/i).first(),
    'Epic go-live terminology stays on the flagship countdown'
  ).toBeVisible()
})
