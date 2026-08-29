// LMS Ops Command Center — readiness screens.
// Split from screens.jsx (pure code-move); screens.jsx re-exports as a barrel.
import React from 'react'
import { Rule, Bar, Card } from '../components.jsx'
import { Cell, KV, PageHeader, ReadinessTable, Row, Table, appById, campaignById, campaignData, openExceptionsForFacility, readinessForFacility, pct, riskPill } from './_shared.jsx'

function ReadinessScreen({ campaignId }) {
  const campaign = campaignById(campaignId);
  const scoped = campaignData(campaignId);
  return (
    <div className="screen">
      <PageHeader eyebrow="Readiness" title="Readiness by department." sub={`${campaign.name}: completion, exceptions, and launch risk grouped by operational owner.`} />
      <ReadinessTable departments={scoped.departments} />
    </div>
  );
}

function DepartmentsScreen({ campaignId }) {
  const scoped = campaignData(campaignId);
  return (
    <div className="screen">
      <PageHeader eyebrow="Departments" title="Department operating view." sub="Manager-facing readiness and follow-up workload." />
      <ReadinessTable departments={scoped.departments} />
    </div>
  );
}

function FacilitiesScreen({ campaignId }) {
  const scoped = campaignData(campaignId);
  return (
    <div className="screen">
      <PageHeader eyebrow="Facilities" title="Facility readiness map." sub="Training readiness and exception volume by physical go-live location." />
      <div className="roles-grid">
        {scoped.facilities.length === 0 && <p className="muted small">No facilities mapped for this campaign yet.</p>}
        {scoped.facilities.map(f => (
          <Card key={f.id} className="role-card">
            <div className="role-head">
              {riskPill(f.risk)}
              <span className="mono">{pct(readinessForFacility(f.id))}</span>
            </div>
            <h3 className="role-title">{f.name}</h3>
            <p className="muted small">{f.type}</p>
            <Rule />
            <div className="kv-list">
              <KV k="Departments" v={<span className="mono">{f.departments}</span>} />
              <KV k="Open exceptions" v={<span className="mono">{openExceptionsForFacility(f.id)}</span>} />
              <KV k="Readiness" v={<Bar value={readinessForFacility(f.id)} tone={f.risk === "critical" ? "terracotta" : "olive"} showLabel />} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TrainingMatrixScreen({ campaignId }) {
  const scoped = campaignData(campaignId);
  return (
    <div className="screen">
      <PageHeader eyebrow="Training Matrix" title="Role-to-application requirements." sub="The source of truth for who needs what before go-live." />
      <Card padded={false}>
        <Table columns={["Role", "Epic Application", "Required Training", "Rule", "Assigned", "Ready", "Risk"]} widths={["1fr", "1.1fr", "1.4fr", "1.6fr", "90px", "1fr", "90px"]}>
          {scoped.requirements.length === 0 && (
            <Row><Cell>No training requirements defined yet — build the role-to-application matrix to begin.</Cell><Cell /><Cell /><Cell /><Cell /><Cell /><Cell /></Row>
          )}
          {scoped.requirements.map(r => (
            <Row key={r.id}>
              <Cell><span className="strong">{r.role}</span></Cell>
              <Cell><span className="muted">{appById(r.application_id).name}</span></Cell>
              <Cell><span>{r.title}</span><div className="mono mono-dim small">{r.code}</div></Cell>
              <Cell><span className="small">{r.rule}</span></Cell>
              <Cell><span className="mono">{r.assigned}</span></Cell>
              <Cell><div className="rosterbar"><Bar value={r.readiness} tone={r.color} /><span className="mono small">{pct(r.readiness)}</span></div></Cell>
              <Cell>{riskPill(r.risk)}</Cell>
            </Row>
          ))}
        </Table>
      </Card>
    </div>
  );
}


export {
  ReadinessScreen, DepartmentsScreen, FacilitiesScreen, TrainingMatrixScreen,
};
