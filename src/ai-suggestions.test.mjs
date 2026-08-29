// Governed AI workspace — suggestion honesty + depth gate.
//
// The AI screen's framing is honest (suggestion-only, mutation_allowed:false,
// citations shown), but framing is worthless if every task returns the same
// placeholder text — a domain expert clicking "Readiness brief" vs "Exception
// summary" and getting identical output sees straight through it. This gate
// asserts each task produces DISTINCT, fixture-GROUNDED output while the honesty
// invariants hold. (The prior placeholder implementation returned one identical
// string for all five tasks and would fail the distinctness assertion.)
//
// Run: npm run test:unit   (node --test, no browser)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runAiAssistant } from './api-client.js'
import { LMS_DATA } from './data.js'

const CAMPAIGN = LMS_DATA.activeCampaignId
const TASKS = ['generate_readiness_brief', 'summarize_blockers', 'draft_escalation', 'suggest_learner_match', 'classify_ticket']

// Entity ids that exist for the active campaign — a citation must point at one.
const deptIds = new Set(LMS_DATA.departments.filter(d => d.campaign_id === CAMPAIGN).map(d => d.id))
const exceptionIds = new Set(LMS_DATA.exceptions.filter(e => deptIds.has(e.department_id)).map(e => e.id))
const importIds = new Set(LMS_DATA.imports.filter(i => i.campaign_id === CAMPAIGN).map(i => i.id))
const learnerIds = new Set(LMS_DATA.learners.map(l => l.id))
const idExists = (citation) => {
  const [kind, id] = String(citation).split(':')
  if (kind === 'campaign') return id === CAMPAIGN
  if (kind === 'department') return deptIds.has(id)
  if (kind === 'exception') return exceptionIds.has(id)
  if (kind === 'import') return importIds.has(id)
  if (kind === 'learner') return learnerIds.has(id)
  return false
}

test('every task is suggestion-only and governed (honesty invariants)', async () => {
  for (const task of TASKS) {
    const r = await runAiAssistant(CAMPAIGN, task)
    assert.equal(r.mutation_allowed, false, `${task} must not allow mutation`)
    assert.equal(r.model, 'deterministic-governed-provider', `${task} must report the governed model`)
    assert.ok(Array.isArray(r.suggestions) && r.suggestions.length >= 1, `${task} must return a suggestion`)
    assert.ok(r.provenance && Array.isArray(r.provenance.source_keys) && r.provenance.source_keys.length >= 1, `${task} must carry provenance`)
  }
})

test('tasks return DISTINCT suggestion text (not one placeholder for all)', async () => {
  const texts = []
  for (const task of TASKS) {
    const r = await runAiAssistant(CAMPAIGN, task)
    texts.push(r.suggestions[0].text)
  }
  assert.equal(new Set(texts).size, TASKS.length, 'each task must produce distinct text')
})

test('citations point at real fixture records', async () => {
  for (const task of TASKS) {
    const r = await runAiAssistant(CAMPAIGN, task)
    const citations = r.suggestions[0].citations || []
    assert.ok(citations.length >= 1, `${task} must cite at least one record`)
    for (const c of citations) {
      assert.ok(idExists(c), `${task} citation "${c}" must reference a real ${CAMPAIGN} record`)
    }
  }
})

test('grounded content: readiness brief, blockers, and import anomaly reference real signal', async () => {
  const brief = await runAiAssistant(CAMPAIGN, 'generate_readiness_brief')
  assert.match(brief.suggestions[0].text, /% readiness/, 'brief should state a readiness percentage')

  const blockers = await runAiAssistant(CAMPAIGN, 'summarize_blockers')
  assert.match(blockers.suggestions[0].text, /open exception/, 'blocker summary should count open exceptions')

  const anomaly = await runAiAssistant(CAMPAIGN, 'classify_ticket')
  assert.match(anomaly.suggestions[0].text, /\.csv/, 'import anomaly should name the source file')
})
