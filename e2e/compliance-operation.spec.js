// Layer 3 — "templates = genuinely different operations" must be VISIBLE.
// The compliance template runs a real second operation: its own campaign
// (camp-compliance-2026), deadline terminology, a per-assignee completion home,
// and the signature stuck rule ("> threshold minutes in course, not completed")
// rendered as live flags. Scenario packs are the front door: a pack with a demo
// campaign opens it; a concept pack honestly offers no door.

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

test('compliance home renders the second operation: deadline terminology + stuck flags', async ({ page }) => {
  await seedState(page, { role: 'lead', view: 'home', campaignId: 'camp-compliance-2026' })
  await page.goto('/')

  await expect(
    page.locator('.main').getByText('Compliance completion home.'),
    'the compliance campaign must open its own completion home'
  ).toBeVisible()

  await expect(
    page.locator('.main').getByText(/days to deadline/i),
    'compliance terminology (Deadline) must reach the countdown stat'
  ).toBeVisible()

  // The two derivably-stuck assignees (and ONLY those) carry the Stuck flag —
  // the never-started leader must not (different problem, different fix).
  const stuckPills = page.locator('.main .tbl').getByText('Stuck', { exact: true })
  await expect(stuckPills, 'exactly the two over-threshold incomplete assignees are flagged').toHaveCount(2)
  await expect(page.locator('.main').getByText('Sofia Reyes')).toBeVisible()
})

test('the compliance scenario pack opens its demo campaign (template → campaign chain is live)', async ({ page }) => {
  await seedState(page, { role: 'lead', view: 'scenarios', campaignId: 'camp-st-anne' })
  await page.goto('/')

  const compliancePack = page.locator('.scenario-card').filter({ hasText: 'Regulatory Compliance Cycle' })
  await expect(compliancePack).toBeVisible()
  await compliancePack.getByRole('button', { name: 'Open demo campaign' }).click()

  // Landed on the compliance campaign's OWN home, switcher moved with it.
  await expect(page.locator('.main').getByText('Compliance completion home.')).toBeVisible()
  await expect(page.locator('.campaign-switcher select')).toHaveValue('camp-compliance-2026')
})

test('a concept pack offers no demo-campaign door (honest gradient, not a dead button)', async ({ page }) => {
  await seedState(page, { role: 'lead', view: 'scenarios', campaignId: 'camp-st-anne' })
  await page.goto('/')

  const enablementPack = page.locator('.scenario-card').filter({ hasText: 'Role-Based Enablement Rollout' })
  await expect(enablementPack).toBeVisible()
  await expect(
    enablementPack.getByRole('button', { name: 'Open demo campaign' }),
    'concept packs must not offer a demo campaign'
  ).toHaveCount(0)
  await expect(enablementPack.getByText('Concept — not yet built')).toBeVisible()
})
