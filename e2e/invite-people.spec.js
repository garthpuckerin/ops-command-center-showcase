// Invite people — governed provisioning, end to end. The flow mirrors the
// engine's bulk-invite (queued, role-validated, revocable; nothing silently
// created), and the grant preview honors the layout-stability contract: the
// owner's requirement that the UI must not resize as selections change is
// asserted here by MEASUREMENT, not by hope.

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

test('the full flow: People Directory → invite → queued → revoke', async ({ page }) => {
  await seedState(page, { role: 'lead', view: 'people', campaignId: 'camp-st-anne' })
  await page.goto('/')

  await page.getByRole('button', { name: 'Invite people' }).click()
  await expect(page.locator('.main').getByText('Invite people.')).toBeVisible()

  // Seeded staged list is already visible — never a bare table.
  await expect(page.locator('.main').getByText('r.calloway@example.org')).toBeVisible()

  await page.locator('.content textarea').fill('j.rivera@example.org, s.okoye@example.org')
  await page.locator('.content select').nth(0).selectOption('instructor')
  await page.locator('.content select').nth(1).selectOption('camp-compliance-2026')
  await page.locator('.content select').nth(2).selectOption('trainer')

  // The preview names the grant before it exists.
  await expect(page.locator('.main').getByText('Session delivery, attendance, and delivery blockers.')).toBeVisible()

  await page.getByRole('button', { name: 'Queue 2 invites' }).click()
  await expect(page.locator('.main').getByText('2 invites queued — staged below until accepted.')).toBeVisible()
  await expect(page.locator('.main').getByText('j.rivera@example.org')).toBeVisible()
  await expect(page.locator('.main').getByText('s.okoye@example.org')).toBeVisible()

  // Revoke one — it stays visible as an audit state.
  const row = page.locator('.tbl-row').filter({ hasText: 'j.rivera@example.org' })
  await row.getByRole('button', { name: 'Revoke' }).click()
  await expect(row.getByText('Revoked')).toBeVisible()
})

test('the grant preview NEVER resizes as selections change (measured)', async ({ page }) => {
  await seedState(page, { role: 'lead', view: 'people-invite', campaignId: 'camp-st-anne' })
  await page.goto('/')

  const formCard = page.locator('.two-col > .card').first()
  const previewCard = page.locator('.two-col > .card').nth(1)
  await expect(previewCard.getByText('What this grants')).toBeVisible()

  const base = { form: await formCard.boundingBox(), preview: await previewCard.boundingBox() }

  // Walk EVERY org role, campaign, and campaign role; the panels must not
  // move by a single pixel.
  for (const role of ['administrator', 'coordinator', 'instructor', 'readiness_lead', 'learner']) {
    await page.locator('.content select').nth(0).selectOption(role)
    const b = await previewCard.boundingBox()
    expect(b.height, `org role "${role}" changed the preview height`).toBe(base.preview.height)
    expect((await formCard.boundingBox()).height, `org role "${role}" changed the form height`).toBe(base.form.height)
  }
  for (const campaign of ['camp-riverbend', 'camp-ambulatory-wave2', 'camp-compliance-2026', 'camp-st-anne']) {
    await page.locator('.content select').nth(1).selectOption(campaign)
    const b = await previewCard.boundingBox()
    expect(b.height, `campaign "${campaign}" changed the preview height`).toBe(base.preview.height)
  }
  for (const campaignRole of ['campaign_lead', 'program_admin', 'trainer', 'learner']) {
    await page.locator('.content select').nth(2).selectOption(campaignRole)
    const b = await previewCard.boundingBox()
    expect(b.height, `campaign role "${campaignRole}" changed the preview height`).toBe(base.preview.height)
  }

  // Queuing an invite shows a status message in its reserved slot — still no shift.
  await page.locator('.content textarea').fill('stable@example.org')
  await page.getByRole('button', { name: 'Queue 1 invite' }).click()
  await expect(page.locator('.main').getByText('1 invite queued — staged below until accepted.')).toBeVisible()
  expect((await formCard.boundingBox()).height, 'the status message must use its reserved slot').toBe(base.form.height)
})

test.describe('phone companion', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('inviting people is a workstation surface', async ({ page }) => {
    await seedState(page, { role: 'lead', view: 'people-invite', campaignId: 'camp-st-anne' })
    await page.goto('/')
    await expect(page.locator('.main').getByText('Invite people stays at the desk.')).toBeVisible()
    await expect(page.getByRole('button', { name: /Queue .*invite/ })).toHaveCount(0)
  })
})

test('learners and trainers cannot reach the invite surface', async ({ page }) => {
  await seedState(page, { role: 'trainer', view: 'home', campaignId: 'camp-st-anne' })
  await page.goto('/#people-invite')
  await expect(page.locator('.main').getByText('Trainer Dashboard').first()).toBeVisible()
  await expect(page.locator('.main').getByText('Invite people.')).toHaveCount(0)
})
