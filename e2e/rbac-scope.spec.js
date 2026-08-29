// RBAC read-scope — the persona switcher must actually scope what's visible,
// not just relabel the shell. This guards the "role switch changed nothing"
// defect class (Grant Tracker reveal, 2026-08-27): the sidebar already hides
// out-of-scope items, but a deep link / URL hash (`#org-settings`) or persisted
// view would otherwise render the full admin screen for a learner or trainer.
//
// Enforcement point: viewAllowedForRole(view, role) in app.jsx, applied in
// routeScreen (first paint) and a normalizing effect (state + persistence).
//
// The suite asserts BOTH directions so it cannot pass vacuously:
//   - negative: learner/trainer deep-linking to admin views fall back to home;
//   - positive: a lead reaching the same view IS allowed to see it.

import { test, expect } from '@playwright/test'

const UI_STATE_KEY = 'lms_ops_command_center_ui_state'
const ENTERED_KEY = 'ops:entered:v1'

// Distinctive, stable heading strings per screen (from PageHeader titles/eyebrows).
const ORG_SETTINGS_HEADING = 'Portable demo, governed platform.' // org-settings (lead-only)
const LEARNER_HOME_EYEBROW = 'Required Training'                 // learner home fallback
const TRAINER_HOME_EYEBROW = 'Trainer Dashboard'                 // trainer home fallback

// Admin views a learner must never reach by any path.
const ADMIN_VIEWS = ['org-settings', 'writebacks', 'imports', 'reports', 'ai', 'scoring', 'people', 'facilities']

// Seed the entered-gate flag and a role into persisted UI state BEFORE boot, so
// readEntered()/initialRole() pick them up on first paint. Values are passed as
// an argument (NOT via closure) — addInitScript serializes only the function
// body, so closed-over constants would be undefined in the browser context.
const seedState = (page, role) =>
  page.addInitScript(([enteredKey, uiKey, r]) => {
    try {
      localStorage.setItem(enteredKey, 'true')
      localStorage.setItem(uiKey, JSON.stringify({ role: r }))
    } catch (e) { /* storage optional */ }
  }, [ENTERED_KEY, UI_STATE_KEY, role])

test.describe('RBAC read-scope', () => {
  test('learner nav is scoped — no admin items', async ({ page }) => {
    await seedState(page, 'learner')
    await page.goto('/')

    // Learner sees only their two nav items.
    await expect(page.locator('[data-tour="nav-home"]')).toBeVisible()
    await expect(page.locator('[data-tour="nav-learners"]')).toBeVisible()

    // Every admin nav item is absent from the learner sidebar.
    for (const view of ADMIN_VIEWS) {
      await expect(
        page.locator(`[data-tour="nav-${view}"]`),
        `learner nav must not contain "${view}"`
      ).toHaveCount(0)
    }
  })

  test('learner deep-links to admin views are guarded to home', async ({ page }) => {
    for (const view of ADMIN_VIEWS) {
      await seedState(page, 'learner')
      await page.goto(`/#${view}`)

      // Fell back to the learner home, not the requested admin screen.
      await expect(
        page.locator('.main').getByText(LEARNER_HOME_EYEBROW).first(),
        `deep link #${view} as learner should render the learner home`
      ).toBeVisible()
    }
  })

  test('learner cannot see the org-settings admin surface via #org-settings', async ({ page }) => {
    await seedState(page, 'learner')
    await page.goto('/#org-settings')

    await expect(
      page.getByText(ORG_SETTINGS_HEADING, { exact: false }),
      'org-settings admin heading must not render for a learner'
    ).toHaveCount(0)
    await expect(page.locator('.main').getByText(LEARNER_HOME_EYEBROW).first()).toBeVisible()
  })

  test('trainer deep-link to org-settings is guarded to the trainer home', async ({ page }) => {
    await seedState(page, 'trainer')
    await page.goto('/#org-settings')

    await expect(page.getByText(ORG_SETTINGS_HEADING, { exact: false })).toHaveCount(0)
    await expect(page.locator('.main').getByText(TRAINER_HOME_EYEBROW).first()).toBeVisible()
  })

  // Positive control: the guard is scope-aware, not a blanket hide. A lead — the
  // role that owns org-settings — reaches the same view and sees the real screen.
  test('lead IS allowed to reach org-settings', async ({ page }) => {
    await seedState(page, 'lead')
    await page.goto('/#org-settings')

    await expect(
      page.getByText(ORG_SETTINGS_HEADING, { exact: false }),
      'a lead must be able to open org-settings'
    ).toBeVisible()
  })
})
