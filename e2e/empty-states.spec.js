// §4b empty states — a campaign-scoped surface must never render as a blank /
// headers-only table. The demo's "Ambulatory Wave 2" campaign is a Draft with
// zero departments; switching to it and opening Readiness previously showed an
// empty table with no explanation (a classic not-quite-ready reveal tell). The
// mapped surfaces now render an explicit empty state.

import { test, expect } from '@playwright/test'

const UI_STATE_KEY = 'lms_ops_command_center_ui_state'
const ENTERED_KEY = 'ops:entered:v1'
const EMPTY_CAMPAIGN = 'camp-ambulatory-wave2' // Draft, 0 departments

const seedState = (page, state) =>
  page.addInitScript(([enteredKey, uiKey, s]) => {
    try {
      localStorage.setItem(enteredKey, 'true')
      localStorage.setItem(uiKey, JSON.stringify(s))
    } catch (e) { /* storage optional */ }
  }, [ENTERED_KEY, UI_STATE_KEY, state])

test('readiness renders an empty state for a campaign with no departments', async ({ page }) => {
  await seedState(page, { role: 'lead', view: 'readiness', campaignId: EMPTY_CAMPAIGN })
  await page.goto('/')

  await expect(
    page.locator('.main').getByText('No departments in this campaign yet', { exact: false }),
    'the readiness table must show an empty state, not a blank/headers-only table'
  ).toBeVisible()
})
