// node --test  (npm run test:unit)
//
// Teams — the activation model (gap #4). Two halves:
//   1. The pure ownership rule (src/teams.js): owner strings resolve to a
//      campaign team through membership; ownership is derived, never a
//      team_id copy on rows.
//   2. The fixtures live the story: St. Anne runs SIX teams each owning at
//      least one launch criterion; the compliance campaign runs ONE — the
//      platform bends to each campaign's activation model.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LMS_DATA as D } from './data.js'
import { teamForOwner, teamRollup, teamsForCampaign } from './teams.js'
import { createCampaignFromTemplate } from './api-client.js'

// ── The rule itself (synthetic data) ─────────────────────────────────────────

test('teamForOwner resolves membership, lead, and team name; unknown owners resolve to null', () => {
  const S = {
    teams: [
      { id: 't1', campaign_id: 'c1', name: 'Access & Identity', lead: 'N. Farouk', members: ['Access Team'] },
      { id: 't2', campaign_id: 'c2', name: 'Access & Identity', lead: 'Someone Else', members: ['Access Team'] },
    ],
  }
  assert.equal(teamForOwner(S, 'c1', 'Access Team')?.id, 't1', 'member alias resolves, campaign-scoped')
  assert.equal(teamForOwner(S, 'c1', 'N. Farouk')?.id, 't1', 'the lead belongs to their own team')
  assert.equal(teamForOwner(S, 'c1', 'Access & Identity')?.id, 't1', 'the team name itself is an alias')
  assert.equal(teamForOwner(S, 'c1', 'Nobody Known'), null)
  assert.equal(teamForOwner(S, 'c1', null), null)
})

// ── The fixtures live the model ──────────────────────────────────────────────

test('every team belongs to a real campaign and team names are unique per campaign', () => {
  const campaignIds = new Set(D.campaigns.map((c) => c.id))
  const seen = new Set()
  for (const t of D.teams) {
    assert.ok(campaignIds.has(t.campaign_id), `team ${t.id}: unknown campaign ${t.campaign_id}`)
    const key = `${t.campaign_id}:${t.name}`
    assert.ok(!seen.has(key), `duplicate team name "${t.name}" in ${t.campaign_id}`)
    seen.add(key)
  }
})

test('owner aliases are unambiguous within a campaign (one alias, one team)', () => {
  for (const c of D.campaigns) {
    const aliasOwner = new Map()
    for (const t of teamsForCampaign(D, c.id)) {
      for (const alias of [...(t.members || []), t.lead, t.name]) {
        if (!alias) continue
        assert.ok(!aliasOwner.has(alias) || aliasOwner.get(alias) === t.id,
          `campaign ${c.id}: alias "${alias}" claimed by both ${aliasOwner.get(alias)} and ${t.id}`)
        aliasOwner.set(alias, t.id)
      }
    }
  }
})

test('every seed setup section resolves to an owning team in its campaign', () => {
  for (const s of D.campaignSetupSections) {
    const team = teamForOwner(D, s.campaign_id, s.owner)
    assert.ok(team, `section ${s.id} (owner "${s.owner}"): no owning team — criteria must be owned`)
  }
})

test('every seed exception resolves to an owning team in its campaign', () => {
  const campaignByDept = new Map(D.departments.map((d) => [d.id, d.campaign_id]))
  for (const e of D.exceptions) {
    const campaignId = campaignByDept.get(e.department_id)
    const team = teamForOwner(D, campaignId, e.owner)
    assert.ok(team, `exception ${e.id} (owner "${e.owner}"): no owning team in ${campaignId}`)
  }
})

test('the activation model flexes: St. Anne runs six teams, compliance runs one', () => {
  assert.equal(teamsForCampaign(D, 'camp-st-anne').length, 6,
    'the real go-live activation model is six owning teams')
  assert.equal(teamsForCampaign(D, 'camp-compliance-2026').length, 1,
    'a compliance cycle is one owning team — the platform bends to each campaign')
  const counts = new Set(D.campaigns.map((c) => teamsForCampaign(D, c.id).length))
  assert.ok(counts.size >= 3, 'campaign team counts must actually vary, not repeat one shape')
})

test('each St. Anne team owns at least one criterion, and nothing is unowned', () => {
  const rollup = teamRollup(D, 'camp-st-anne')
  for (const { team, criteria } of rollup.rows) {
    assert.ok(criteria >= 1, `team ${team.name} owns no launch criteria — "six teams each owning different criteria" must be literal`)
  }
  assert.equal(rollup.unassignedCriteria, 0, 'every St. Anne criterion has an owning team')
  assert.equal(rollup.unassignedBlockers, 0, 'every open St. Anne blocker has an owning team')
})

// ── Instantiation keeps the model total ──────────────────────────────────────

test('creating a campaign seeds a starter team owning every seeded criterion', async () => {
  const created = await createCampaignFromTemplate('tpl-acquisition', {
    name: 'Teams Check Acquisition', slug: 'teams-check', status: 'planning', go_live_at: '2027-02-01T12:00:00Z',
  })
  const teams = teamsForCampaign(D, created.id)
  assert.equal(teams.length, 1, 'a new campaign starts with one program team')
  const rollup = teamRollup(D, created.id)
  assert.equal(rollup.unassignedCriteria, 0, 'every seeded gate section is owned by the starter team')
  assert.equal(rollup.rows[0].criteria, 4, 'the acquisition gate\'s four sections all roll up to it')
})
