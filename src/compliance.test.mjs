// node --test  (npm run test:unit)
//
// Compliance operation — the Layer-3 "templates = genuinely different
// operations" proof. Two halves:
//   1. The pure stuck-detection rule (src/compliance.js) behaves exactly as
//      the product model states: "> X time in a course without completing".
//   2. The compliance campaign fixtures actually exercise the rule — the demo
//      must SHOW a stuck assignee, and every stuck assignee must surface in
//      the governed exception queue (cross-surface coherence, not a dead flag).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LMS_DATA as D } from './data.js'
import { isStuckLearner, stuckLearners, stuckThresholdMinutes } from './compliance.js'

const COMPLIANCE_CAMPAIGN = 'camp-compliance-2026'

const complianceCampaign = () => D.campaigns.find((c) => c.id === COMPLIANCE_CAMPAIGN)
const complianceTemplate = () => D.campaignTemplates.find((t) => t.id === complianceCampaign()?.template_id)
const complianceLearners = () => {
  const deptIds = new Set(D.departments.filter((d) => d.campaign_id === COMPLIANCE_CAMPAIGN).map((d) => d.id))
  return D.learners.filter((l) => deptIds.has(l.department_id))
}

// ── The rule itself ──────────────────────────────────────────────────────────

test('stuck threshold resolves campaign override > template default > global floor', () => {
  assert.equal(stuckThresholdMinutes({ detection: { stuck_after_minutes: 90 } }, { detection: { stuck_after_minutes: 60 } }), 90)
  assert.equal(stuckThresholdMinutes({}, { detection: { stuck_after_minutes: 60 } }), 60)
  assert.equal(stuckThresholdMinutes({}, {}), 120)
  assert.equal(stuckThresholdMinutes(null, null), 120)
})

test('stuck = over-threshold time without completion; never-started and completed are NOT stuck', () => {
  assert.equal(isStuckLearner({ time_in_course_minutes: 180, completion: 40 }, 120), true)
  assert.equal(isStuckLearner({ time_in_course_minutes: 120, completion: 99 }, 120), true, 'exactly at threshold counts')
  assert.equal(isStuckLearner({ time_in_course_minutes: 95, completion: 40 }, 120), false, 'under threshold is just in-progress')
  assert.equal(isStuckLearner({ time_in_course_minutes: 300, completion: 100 }, 120), false, 'completed is never stuck')
  assert.equal(isStuckLearner({ time_in_course_minutes: 0, completion: 0 }, 120), false, 'never-started is a nudge, not a rescue')
  assert.equal(isStuckLearner(null, 120), false)
})

// ── The fixtures exercise the rule ───────────────────────────────────────────

test('the compliance campaign exists, bound to the compliance template and home', () => {
  const c = complianceCampaign()
  assert.ok(c, 'compliance campaign missing — Layer 3 has no demo surface')
  assert.equal(c.template_id, 'tpl-compliance')
  assert.equal(c.homeSummary?.default_home_view, 'compliance_completion')
})

test('every compliance assignee carries usable time-in-course data', () => {
  const learners = complianceLearners()
  assert.ok(learners.length >= 5, `only ${learners.length} compliance assignees — table would look empty`)
  for (const l of learners) {
    assert.ok(Number.isFinite(l.time_in_course_minutes) && l.time_in_course_minutes >= 0,
      `assignee ${l.id}: time_in_course_minutes is ${l.time_in_course_minutes}`)
  }
})

test('at least one assignee is derivably stuck (the view provably shows the flag)', () => {
  const threshold = stuckThresholdMinutes(complianceCampaign(), complianceTemplate())
  const stuck = stuckLearners(complianceLearners(), threshold)
  assert.ok(stuck.length >= 1, `no assignee exceeds ${threshold} min without completing — the signature rule never renders`)
})

test('every stuck assignee surfaces as an open exception (flag feeds the queue, not a dead badge)', () => {
  const threshold = stuckThresholdMinutes(complianceCampaign(), complianceTemplate())
  const stuck = stuckLearners(complianceLearners(), threshold)
  for (const l of stuck) {
    const exc = D.exceptions.find((e) => e.learner_id === l.id && /stuck/i.test(e.type) && !['resolved', 'closed'].includes(e.status))
    assert.ok(exc, `stuck assignee ${l.id} (${l.name}) has no open stuck-learner exception`)
  }
})

test('the compliance scenario pack opens the compliance campaign (demo_campaign_id is live data)', () => {
  const pack = D.scenarioPacks.find((p) => p.template_id === 'tpl-compliance')
  assert.ok(pack, 'compliance scenario pack missing')
  assert.equal(pack.demo_campaign_id, COMPLIANCE_CAMPAIGN,
    'pack must open the compliance campaign, not a go-live dataset')
})
