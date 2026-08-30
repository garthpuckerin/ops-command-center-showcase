// LMS Ops Command Center — readiness screens.
// Split from screens.jsx (pure code-move); screens.jsx re-exports as a barrel.
import React from 'react'
import { Rule, Bar, Card, Eyebrow, Pill, StatNumber, fmtDate } from '../components.jsx'
import { Cell, KV, PageHeader, Section, Row, Table, appById, campaignById, campaignData, campaignMetrics, facilityNameById, isOpenException, openExceptionsForDepartment, openExceptionsForFacility, readinessForFacility, pct, riskPill } from './_shared.jsx'

const SEV_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };
const isAtRisk = risk => ["high", "critical"].includes(risk);

// Readiness = the cross-cutting ROLLUP: the deterministic score, overall
// completion, and where the gap is widest — the "are we ready to go live"
// answer. (Departments, below, is the per-department operating drill-down; the
// two used to render the identical table.)
function ReadinessScreen({ campaignId }) {
  const campaign = campaignById(campaignId);
  const scoped = campaignData(campaignId);
  const m = campaignMetrics(campaignId);
  const totalRequired = scoped.departments.reduce((s, d) => s + d.required, 0);
  const totalComplete = scoped.departments.reduce((s, d) => s + d.complete, 0);
  // Worst-first: the rollup leads with where the completion gap is largest.
  const depts = [...scoped.departments].sort(
    (a, b) => (a.required ? a.complete / a.required : 1) - (b.required ? b.complete / b.required : 1)
  );
  return (
    <div className="screen">
      <PageHeader
        eyebrow="Readiness"
        title="Readiness by department."
        sub={`${campaign.name}: the cross-cutting go-live readiness rollup — critical-role score, overall completion, and where the gap is widest.`}
      />
      <div className="stat-grid stat-grid-4">
        <Card><StatNumber value={pct(m.criticalRoleReadiness)} sub="critical-role readiness" hint="Deterministic score" /></Card>
        <Card><StatNumber value={pct(m.overallReadiness)} sub="overall completion" hint={`${totalComplete.toLocaleString()}/${totalRequired.toLocaleString()} assignments`} /></Card>
        <Card><StatNumber value={m.departmentsAtRisk} sub="departments at risk" hint="High or critical" /></Card>
        <Card><StatNumber value={m.openExceptions} sub="open blockers" hint={`${m.identityMismatches} identity`} /></Card>
      </div>
      <Section eyebrow="01" title="Completion by department">
        <Card padded={false}>
          <Table columns={["Department", "Facility", "Complete", "Progress", "Risk"]} widths={["1.3fr", "1.2fr", "110px", "1.5fr", "90px"]}>
            {depts.length === 0 && (
              <Row><Cell>No departments in this campaign yet — start with roster intake and matrix design.</Cell><Cell /><Cell /><Cell /><Cell /></Row>
            )}
            {depts.map(d => {
              const p = d.required ? Math.round((d.complete / d.required) * 100) : 0;
              return (
                <Row key={d.id}>
                  <Cell><span className="strong">{d.name}</span></Cell>
                  <Cell><span className="muted">{facilityNameById(d.facility_id)}</span></Cell>
                  <Cell><span className="mono">{d.complete}/{d.required}</span></Cell>
                  <Cell><div className="rosterbar"><Bar value={p} tone={isAtRisk(d.risk) ? "terracotta" : "olive"} /><span className="mono small">{p}%</span></div></Cell>
                  <Cell>{riskPill(d.risk)}</Cell>
                </Row>
              );
            })}
          </Table>
        </Card>
      </Section>
    </div>
  );
}

// Departments = the per-department OPERATING view: pick a department (ordered by
// follow-up workload) and work its open blockers and owners. Master-detail,
// modeled on the Exception Queue.
function DepartmentsScreen({ campaignId }) {
  const scoped = campaignData(campaignId);
  // Follow-up order: most open blockers first, then most not-started.
  const depts = [...scoped.departments].sort(
    (a, b) => (openExceptionsForDepartment(b.id) - openExceptionsForDepartment(a.id)) || (b.not_started - a.not_started)
  );
  const [activeId, setActiveId] = React.useState(depts[0]?.id || null);
  React.useEffect(() => {
    if (depts.length && !depts.some(d => d.id === activeId)) setActiveId(depts[0].id);
  }, [campaignId, depts.length, activeId]);
  const active = depts.find(d => d.id === activeId) || depts[0];

  if (depts.length === 0) {
    return (
      <div className="screen">
        <PageHeader eyebrow="Departments" title="Department operating view." sub="Manager-facing follow-up: work each department's open blockers and owners." />
        <div className="empty-state">
          <div className="empty-state-title">No departments in this campaign yet</div>
          <p className="muted small">Departments appear here once the campaign has assigned learners — start with roster intake and matrix design.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <PageHeader
        eyebrow="Departments"
        title="Department operating view."
        sub="Manager-facing follow-up: departments are ordered by open work — pick one to see its owners and blockers."
      />
      <div className="two-col">
        <Card padded={false}>
          <Table columns={["Department", "Blockers", "Not started", "Risk"]} widths={["1.5fr", "96px", "104px", "90px"]}>
            {depts.map(d => (
              <Row key={d.id} selected={active?.id === d.id} onSelect={() => setActiveId(d.id)}>
                <Cell><span className="strong">{d.name}</span><div className="muted small">{facilityNameById(d.facility_id)}</div></Cell>
                <Cell><span className="mono">{openExceptionsForDepartment(d.id)}</span></Cell>
                <Cell><span className="mono">{d.not_started}</span></Cell>
                <Cell>{riskPill(d.risk)}</Cell>
              </Row>
            ))}
          </Table>
        </Card>
        <DepartmentDetailPanel department={active} exceptions={scoped.exceptions} />
      </div>
    </div>
  );
}

function DepartmentDetailPanel({ department, exceptions }) {
  if (!department) return <Card><Pill tone="muted">No department selected</Pill></Card>;
  const open = exceptions
    .filter(e => e.department_id === department.id && isOpenException(e))
    .sort((a, b) => (SEV_ORDER[b.severity] || 0) - (SEV_ORDER[a.severity] || 0));
  const p = department.required ? Math.round((department.complete / department.required) * 100) : 0;
  return (
    <Card>
      <Eyebrow>Follow-up</Eyebrow>
      <h2 className="display-sm">{department.name}</h2>
      <p className="muted small">{facilityNameById(department.facility_id)}</p>
      <Rule />
      <div className="kv-list">
        <KV k="Readiness" v={<Bar value={p} tone={isAtRisk(department.risk) ? "terracotta" : "olive"} showLabel />} />
        <KV k="Complete" v={<span className="mono">{department.complete}/{department.required}</span>} />
        <KV k="In progress" v={<span className="mono">{department.in_progress}</span>} />
        <KV k="Not started" v={<span className="mono">{department.not_started}</span>} />
        <KV k="Risk" v={riskPill(department.risk)} />
      </div>
      <Rule />
      <Eyebrow>Open blockers ({open.length})</Eyebrow>
      {open.length === 0 ? (
        <p className="muted small">No open blockers — this department is clear.</p>
      ) : (
        <div className="kv-list">
          {open.map(e => (
            <div key={e.id} className="kv">
              <span className="kv-k"><span className="meta-stack">{riskPill(e.severity)}<span className="strong">{e.type}</span></span></span>
              <span className="kv-v"><span className="muted small">{e.owner || "Unassigned"} · due {fmtDate(e.due)}</span></span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function FacilitiesScreen({ campaignId }) {
  const scoped = campaignData(campaignId);
  return (
    <div className="screen">
      <PageHeader eyebrow="Facilities" title="Facility readiness map." sub="Training readiness and exception volume by physical go-live location." />
      {scoped.facilities.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No facilities yet</div>
          <p className="muted small">No facilities are mapped for this campaign.</p>
        </div>
      ) : (
      <div className="roles-grid">
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
      )}
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
