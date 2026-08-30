// node --test  (npm run test:unit)
//
// Template instantiation — creating a campaign from a template must produce a
// template-SHAPED campaign, not a blank shell. Before this gate,
// createCampaignFromTemplate copied name/status/date and dropped the
// template's scoring profile, requirements, reports, and gate sections — so
// the create flow previewed structure it never delivered.
//
// Note: node --test isolates each test FILE in its own process, so the
// LMS_DATA mutations these creations make cannot leak into other suites.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LMS_DATA as D } from './data.js'
import { createCampaignFromTemplate } from './api-client.js'

// Mirrors RoleHomeScreen (src/screens/home.jsx) — same closed set as
// template-binding.test.mjs.
const HOME_VIEWS = new Set([
  'executive_summary',
  'readiness_lead_queue',
  'analyst_import_reconciliation',
  'manager_team_followup',
  'compliance_completion',
])

const create = (templateId, name) =>
  createCampaignFromTemplate(templateId, { name, slug: name.toLowerCase().replace(/\s+/g, '-'), status: 'planning', go_live_at: '2027-01-15T12:00:00Z' })

test('every template declares its instantiation surface (sections + home view)', () => {
  for (const t of D.campaignTemplates) {
    assert.ok(Array.isArray(t.setup_sections) && t.setup_sections.length >= 3,
      `template ${t.id}: no setup_sections to instantiate`)
    assert.ok(HOME_VIEWS.has(t.default_home_view),
      `template ${t.id}: default_home_view "${t.default_home_view}" is not an implemented layout`)
  }
})

test('creating from the compliance template instantiates its full structure', async () => {
  const created = await create('tpl-compliance', 'Q4 Compliance Cycle')

  assert.equal(created.template_id, 'tpl-compliance')
  assert.equal(created.homeSummary?.default_home_view, 'compliance_completion',
    'a compliance campaign must open on the compliance home')

  // Scoring thresholds come from the template, not a hardcoded Epic default.
  assert.equal(created.scoringProfile?.completion_threshold, 100)
  assert.equal(created.scoringProfile?.critical_role_threshold, 100)

  const reqs = D.trainingRequirements.filter((r) => r.campaign_id === created.id)
  assert.deepEqual(reqs.map((r) => r.title), ['Annual Compliance Attestation'],
    'starter requirements must be instantiated as real requirement rows')

  const reports = D.reports.filter((r) => r.campaign_id === created.id)
  assert.deepEqual(reports.map((r) => r.title), ['Compliance Completion'],
    'default reports must be instantiated as real report rows')

  const sections = D.campaignSetupSections.filter((s) => s.campaign_id === created.id)
  assert.deepEqual(sections.map((s) => s.section),
    ['Campaign details', 'Assignment population', 'Detection thresholds'],
    'the launch gate must be seeded with the template\'s sections')
  assert.ok(sections.every((s) => s.signoff == null), 'nothing may be pre-signed-off at creation')
  assert.ok(sections.every((s) => s.status !== 'approved'), 'no section may start approved')
})

test('different templates instantiate genuinely different shapes', async () => {
  const epic = await create('tpl-epic-go-live', 'Epic Wave 3')
  const acq = await create('tpl-acquisition', 'Lakeside Acquisition')

  assert.notEqual(epic.id, acq.id, 'rapid creations must not collide on id')
  assert.equal(epic.homeSummary?.default_home_view, 'executive_summary')
  assert.equal(acq.homeSummary?.default_home_view, 'analyst_import_reconciliation')
  assert.notEqual(epic.scoringProfile.completion_threshold, acq.scoringProfile.completion_threshold)

  const epicSections = D.campaignSetupSections.filter((s) => s.campaign_id === epic.id).map((s) => s.section)
  const acqSections = D.campaignSetupSections.filter((s) => s.campaign_id === acq.id).map((s) => s.section)
  assert.notDeepEqual(epicSections, acqSections,
    'two templates producing identical gates would be the blank-shell defect again')
  assert.ok(acqSections.includes('Old org role mapping'), 'acquisition gate keeps its signature section')
})

test('instantiated rows are campaign-scoped (no leakage into other campaigns)', async () => {
  const before = D.trainingRequirements.filter((r) => r.campaign_id === 'camp-st-anne').length
  const created = await create('tpl-epic-go-live', 'Scope Check Wave')
  const after = D.trainingRequirements.filter((r) => r.campaign_id === 'camp-st-anne').length
  assert.equal(after, before, 'creating a campaign must not add rows to existing campaigns')
  const mine = D.trainingRequirements.filter((r) => r.campaign_id === created.id)
  assert.ok(mine.every((r) => r.assigned === 0 && r.readiness === 0), 'seeded requirements start empty, honestly')
})
