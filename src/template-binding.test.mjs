// node --test  (npm run test:unit)
//
// Template binding — the adaptability contract. Campaigns are configured BY a
// template (terminology, scoring shape) and each campaign declares its own home
// layout. These invariants keep the "campaigns are differently shaped" story
// structural: a campaign without a real template binding, or with a home view
// no layout implements, silently falls back to the one-shape demo this gate
// exists to prevent.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LMS_DATA as D } from './data.js'

// The layouts RoleHomeScreen implements (src/screens/home.jsx). A view outside
// this set renders the executive fallback — legal for the code, but a fixture
// naming one would be a dead configuration, so the fixture set is closed here.
const HOME_VIEWS = new Set([
  'executive_summary',
  'readiness_lead_queue',
  'analyst_import_reconciliation',
  'manager_team_followup',
  'compliance_completion',
])

const CAMPAIGN_ROLES = new Set(['readiness_lead', 'program_admin', 'training_coordinator', 'compliance_owner'])

test('every campaign is bound to a real template', () => {
  const templateIds = new Set(D.campaignTemplates.map((t) => t.id))
  for (const c of D.campaigns) {
    assert.ok(c.template_id, `campaign ${c.id}: no template_id — terminology cannot adapt`)
    assert.ok(templateIds.has(c.template_id), `campaign ${c.id}: unknown template ${c.template_id}`)
  }
})

test('every template carries complete terminology', () => {
  for (const t of D.campaignTemplates) {
    for (const key of ['launch_label', 'learner_label', 'blocker_label']) {
      assert.ok(t.terminology?.[key], `template ${t.id}: missing terminology.${key}`)
    }
  }
})

test('every campaign default_home_view is an implemented layout', () => {
  for (const c of D.campaigns) {
    const view = c.homeSummary?.default_home_view
    assert.ok(view, `campaign ${c.id}: no default_home_view`)
    assert.ok(HOME_VIEWS.has(view), `campaign ${c.id}: unimplemented home view "${view}"`)
  }
})

test('campaign home views actually differ (the per-campaign-shape proof)', () => {
  const views = new Set(D.campaigns.map((c) => c.homeSummary?.default_home_view))
  assert.ok(views.size >= 2,
    `all ${D.campaigns.length} campaigns share one home view — the adaptability story is asserted, not shown`)
})

test('campaign templates actually differ across campaigns', () => {
  const templates = new Set(D.campaigns.map((c) => c.template_id))
  assert.ok(templates.size >= 2,
    'all campaigns bind the same template — switching campaigns changes no terminology')
})

test('every campaign declares a known user_campaign_role', () => {
  for (const c of D.campaigns) {
    const role = c.homeSummary?.user_campaign_role
    assert.ok(role, `campaign ${c.id}: no user_campaign_role`)
    assert.ok(CAMPAIGN_ROLES.has(role), `campaign ${c.id}: unknown campaign role "${role}"`)
  }
})

test('every scenario pack references a real template', () => {
  const templateIds = new Set(D.campaignTemplates.map((t) => t.id))
  for (const p of D.scenarioPacks) {
    assert.ok(templateIds.has(p.template_id), `pack ${p.id}: unknown template ${p.template_id}`)
  }
})

test('a pack that declares a demo campaign points at a real one bound to the SAME template', () => {
  // demo_campaign_id was dead data pointing at the wrong dataset (the
  // compliance pack "opened" the Epic campaign). Now it is live navigation:
  // null is honest for concept packs, but a non-null id must resolve AND the
  // target campaign must actually run this pack's template.
  for (const p of D.scenarioPacks) {
    if (p.demo_campaign_id == null) continue
    const target = D.campaigns.find((c) => c.id === p.demo_campaign_id)
    assert.ok(target, `pack ${p.id}: demo_campaign_id ${p.demo_campaign_id} does not exist`)
    assert.equal(target.template_id, p.template_id,
      `pack ${p.id}: opens ${target.id}, which runs ${target.template_id}, not this pack's template`)
  }
})
