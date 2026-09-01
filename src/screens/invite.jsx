// LMS Ops Command Center — governed people provisioning (Team & access).
// Mirrors the production engine's bulk-invite: pick an org role and campaign
// access, see EXACTLY what the grant gives, queue the invites — staged,
// visible, revocable; nothing is provisioned until an invite is accepted.
//
// Layout-stability contract: the grant preview keeps one fixed structure —
// every role's permission list has the same length (enforced by
// invites.test.mjs), the description slot reserves its height, and the status
// line owns a fixed slot — so changing selections NEVER resizes the UI.
import React, { useState } from 'react'
import { LMS_DATA as D } from '../data.js'
import * as LMS_API from '../api-client.js'
import { statusLabel, Eyebrow, Rule, Pill, Card, Button } from '../components.jsx'
import { Cell, KV, PageHeader, Row, Section, Table, campaignById } from './_shared.jsx'

function InvitePeopleScreen({ setView, campaignId, onDataChanged }) {
  const orgRoles = D.orgRoles || [];
  const campaignRoles = D.campaignRoleOptions || [];
  const [emails, setEmails] = useState("");
  const [orgRoleId, setOrgRoleId] = useState("coordinator");
  const [inviteCampaignId, setInviteCampaignId] = useState(campaignId);
  const [campaignRoleId, setCampaignRoleId] = useState("program_admin");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  const orgRole = orgRoles.find(r => r.id === orgRoleId) || orgRoles[0];
  const campaignRole = campaignRoles.find(r => r.id === campaignRoleId) || campaignRoles[0];
  const targetCampaign = campaignById(inviteCampaignId) || D.campaigns[0];
  const parsedEmails = [...new Set(emails.split(/[\s,;]+/).map(e => e.trim().toLowerCase()).filter(e => e.includes("@")))];
  const invitations = D.invitations || [];

  async function queue() {
    setWorking(true);
    setMessage("");
    try {
      const created = await LMS_API.queueInvites({
        emails: parsedEmails,
        org_role: orgRole.id,
        campaign_id: targetCampaign.id,
        campaign_role: campaignRole.id,
      });
      setEmails("");
      onDataChanged?.();
      setMessage(`${created.length} invite${created.length === 1 ? "" : "s"} queued — staged below until accepted.`);
    } catch (err) {
      setMessage(`Invite failed: ${err.message}`);
    } finally {
      setWorking(false);
    }
  }

  async function revoke(invite) {
    setWorking(true);
    try {
      await LMS_API.revokeInvite(invite.id);
      onDataChanged?.();
      setMessage(`Invite for ${invite.email} revoked.`);
    } catch (err) {
      setMessage(`Revoke failed: ${err.message}`);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="screen">
      <PageHeader
        eyebrow="Team &amp; access"
        title="Invite people."
        sub="Provisioning is governed like everything else: a named role, explicit campaign access, a visible grant — queued for acceptance, never silently created."
      />
      <div className="two-col">
        <Card>
          <Eyebrow n={1}>Who and what</Eyebrow>
          <h2 className="display-sm">Queue invites with a reviewed grant.</h2>
          <Rule />
          <div className="form-grid">
            <label className="field field-wide">
              <span className="field-label mono">Email addresses (comma or newline separated)</span>
              <textarea rows={3} value={emails} onChange={e => setEmails(e.target.value)} placeholder="j.rivera@example.org, s.okoye@example.org" />
            </label>
            <label className="field">
              <span className="field-label mono">Org role</span>
              <select value={orgRoleId} onChange={e => setOrgRoleId(e.target.value)}>
                {orgRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field-label mono">Campaign</span>
              <select value={targetCampaign.id} onChange={e => setInviteCampaignId(e.target.value)}>
                {D.campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field-label mono">Campaign role</span>
              <select value={campaignRoleId} onChange={e => setCampaignRoleId(e.target.value)}>
                {campaignRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
          </div>
          {/* Fixed-height status slot: messages appear WITHOUT moving the form. */}
          <div className="small invite-status" style={{ minHeight: 20, marginTop: 10 }} aria-live="polite">
            {message && <span className={message.includes("failed") ? "strong" : "muted"}>{message}</span>}
          </div>
          <div className="focal-actions">
            <Button kind="solid" iconRight="arrow" disabled={working || parsedEmails.length === 0} onClick={queue}>
              Queue {parsedEmails.length || ""} invite{parsedEmails.length === 1 ? "" : "s"}
            </Button>
            <Button kind="ghost" onClick={() => setView("people")}>Back to People Directory</Button>
          </div>
        </Card>

        <Card>
          <Eyebrow n={2}>What this grants</Eyebrow>
          <h2 className="display-sm">The grant, before it exists.</h2>
          <Rule />
          <div className="kv-list">
            <KV k="Org role" v={orgRole.name} />
            <KV k="Scope" v={<span className="muted" style={{ display: "inline-block", minHeight: 38 }}>{orgRole.desc}</span>} />
          </div>
          {/* One permission per line: the COUNT is constant across roles
              (tested), so the panel height cannot change with the selection. */}
          <ul className="mono small" style={{ listStyle: "none", padding: 0, margin: "6px 0 0", lineHeight: 1.9 }}>
            {orgRole.permissions.map(p => <li key={p}>{p}</li>)}
          </ul>
          <Rule />
          <div className="kv-list">
            <KV k="Campaign" v={<span className="oneline" title={targetCampaign.name}>{targetCampaign.name}</span>} />
            <KV k="Campaign role" v={campaignRole.name} />
          </div>
          <ul className="mono small" style={{ listStyle: "none", padding: 0, margin: "6px 0 0", lineHeight: 1.9 }}>
            {campaignRole.permissions.map(p => <li key={p}>{p}</li>)}
          </ul>
          <Rule />
          <p className="muted small" style={{ lineHeight: 1.7 }}>
            Queued invites are staged below and revocable. The account, its role
            assignment, and its campaign access exist only after the invite is
            accepted — the same approve-before-commit rule as every write-back.
          </p>
        </Card>
      </div>

      <Section eyebrow="01 · Staged" title="Invites and their state">
        <Card padded={false}>
          <Table columns={["Person", "Org role", "Campaign", "Campaign role", "Status", "Invited by", ""]} widths={["1.5fr", "1fr", "1.3fr", "1fr", "120px", "1fr", "90px"]}>
            {invitations.length === 0 && (
              <Row><Cell>No invites staged yet.</Cell><Cell /><Cell /><Cell /><Cell /><Cell /><Cell /></Row>
            )}
            {invitations.map(invite => (
              <Row key={invite.id}>
                <Cell><span className="strong">{invite.name || invite.email}</span>{invite.name && <div className="muted small">{invite.email}</div>}</Cell>
                <Cell>{(orgRoles.find(r => r.id === invite.org_role) || {}).name || invite.org_role}</Cell>
                <Cell><span className="muted">{campaignById(invite.campaign_id)?.name || invite.campaign_id}</span></Cell>
                <Cell>{(campaignRoles.find(r => r.id === invite.campaign_role) || {}).name || invite.campaign_role}</Cell>
                <Cell><Pill tone={invite.status === "accepted" ? "olive" : invite.status === "revoked" ? "red" : "ochre"} dot block>{statusLabel(invite.status)}</Pill></Cell>
                <Cell><span className="muted">{invite.invited_by}</span></Cell>
                <Cell>{invite.status === "queued"
                  ? <Button kind="ghost" size="sm" disabled={working} onClick={() => revoke(invite)}>Revoke</Button>
                  : <span className="muted small">—</span>}</Cell>
              </Row>
            ))}
          </Table>
        </Card>
      </Section>
    </div>
  );
}

export { InvitePeopleScreen };
