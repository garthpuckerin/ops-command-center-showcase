// node --test  (npm run test:unit)
//
// Invite people — governed provisioning, mirroring the production engine's
// bulk-invite semantics: invites are QUEUED records with a validated role
// (unknown roles are rejected, matching the engine's 400), visible in a
// staged list; nothing is silently created. Also encodes the layout-stability
// requirement structurally: every role's permission list has the same length,
// so the grant-preview panel cannot change height when selections change.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LMS_DATA as D } from './data.js'
import { queueInvites, revokeInvite } from './api-client.js'

test('org roles cover the operating vocabulary with constant-length grants (no-resize invariant)', () => {
  const ids = new Set(D.orgRoles.map((r) => r.id))
  for (const required of ['administrator', 'coordinator', 'instructor', 'readiness_lead', 'learner']) {
    assert.ok(ids.has(required), `missing org role: ${required}`)
  }
  const lengths = new Set(D.orgRoles.map((r) => r.permissions.length))
  assert.equal(lengths.size, 1,
    'every org role must grant the same NUMBER of permissions so the preview panel never resizes on selection')
  for (const r of D.orgRoles) {
    assert.ok(r.name && r.desc, `org role ${r.id}: needs a name and description`)
  }
})

test('campaign roles have constant-length grants too', () => {
  const lengths = new Set(D.campaignRoleOptions.map((r) => r.permissions.length))
  assert.equal(lengths.size, 1, 'campaign-role permission lists must not vary in length')
})

test('seeded invitations reference real campaigns and roles', () => {
  const campaignIds = new Set(D.campaigns.map((c) => c.id))
  const orgRoleIds = new Set(D.orgRoles.map((r) => r.id))
  const campRoleIds = new Set(D.campaignRoleOptions.map((r) => r.id))
  assert.ok(D.invitations.length >= 1, 'seed at least one staged invite so the list is never a bare table')
  for (const inv of D.invitations) {
    assert.ok(campaignIds.has(inv.campaign_id), `invite ${inv.id}: unknown campaign ${inv.campaign_id}`)
    assert.ok(orgRoleIds.has(inv.org_role), `invite ${inv.id}: unknown org role ${inv.org_role}`)
    assert.ok(campRoleIds.has(inv.campaign_role), `invite ${inv.id}: unknown campaign role ${inv.campaign_role}`)
    assert.ok(['queued', 'accepted', 'revoked'].includes(inv.status), `invite ${inv.id}: unknown status ${inv.status}`)
  }
})

test('queueInvites stages queued records and rejects unknown roles (engine parity)', async () => {
  const before = D.invitations.length
  const created = await queueInvites({
    emails: ['a.tester@example.org', 'b.tester@example.org', 'a.tester@example.org'],
    org_role: 'instructor',
    campaign_id: 'camp-compliance-2026',
    campaign_role: 'trainer',
  })
  assert.equal(created.length, 2, 'duplicate emails collapse')
  assert.ok(created.every((i) => i.status === 'queued'), 'invites are staged, not provisioned')
  assert.equal(new Set(created.map((i) => i.id)).size, 2, 'ids are collision-free')
  assert.equal(D.invitations.length, before + 2, 'staged invites are visible in the list')

  await assert.rejects(
    () => queueInvites({ emails: ['x@example.org'], org_role: 'superuser', campaign_id: 'camp-st-anne', campaign_role: 'trainer' }),
    /Unknown role/,
    'unknown org roles are rejected like the engine\'s 400'
  )
  await assert.rejects(
    () => queueInvites({ emails: ['x@example.org'], org_role: 'learner', campaign_id: 'camp-st-anne', campaign_role: 'owner' }),
    /Unknown campaign role/
  )
})

test('revokeInvite marks the record revoked — an audit state, not a deletion', async () => {
  const created = await queueInvites({
    emails: ['revoke.me@example.org'], org_role: 'learner', campaign_id: 'camp-st-anne', campaign_role: 'learner',
  })
  const revoked = await revokeInvite(created[0].id)
  assert.equal(revoked.status, 'revoked')
  assert.ok(D.invitations.some((i) => i.id === created[0].id), 'revoked invites stay visible')
})
