// LMS Ops Command Center — shared screen helpers and atoms.
// Split from screens.jsx (pure code-move); screens.jsx re-exports as a barrel.
import React from 'react'
import { LMS_DATA as D } from '../data.js'
import { cls, statusTone, statusLabel, fmtDate, Eyebrow, Pill, Card } from '../components.jsx'

const byId = (items, id) => items.find(x => x.id === id);
const facilityById = id => byId(D.facilities, id);
const departmentById = id => byId(D.departments, id);
const appById = id => byId(D.applications, id);
const userById = id => byId(D.users, id);
const campaignById = id => byId(D.campaigns, id);
const facilityNameById = id => facilityById(id)?.name || "Unassigned facility";
const departmentNameById = id => departmentById(id)?.name || "Unassigned department";

function riskPill(risk) {
  return <Pill tone={statusTone(risk)} dot>{statusLabel(risk)}</Pill>;
}

function pct(n) {
  return `${Math.round(n)}%`;
}

function triggerLabel(value) {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function campaignData(campaignId) {
  const departments = D.departments.filter(d => d.campaign_id === campaignId);
  const facilities = D.facilities.filter(f => f.campaign_id === campaignId);
  const requirements = D.trainingRequirements.filter(r => r.campaign_id === campaignId);
  const learners = D.learners.filter(l => departments.some(d => d.id === l.department_id));
  const sessions = D.sessions.filter(s => facilities.some(f => f.id === s.facility_id));
  const exceptions = D.exceptions.filter(e => departments.some(d => d.id === e.department_id));
  return { departments, facilities, requirements, learners, sessions, exceptions };
}

// One predicate for "unresolved work", used everywhere exceptions are counted.
function isOpenException(e) { return !["resolved", "closed"].includes(e.status); }

// Cross-entity selectors — every displayed aggregate derives from the live
// exception + department record arrays, so resolving/starting an exception
// propagates to the KPI, the department scorecard, and the facility rollup.
function openExceptionsForDepartment(deptId) {
  return D.exceptions.filter(e => e.department_id === deptId && isOpenException(e)).length;
}
function openExceptionsForFacility(facId) {
  const deptIds = new Set(D.departments.filter(d => d.facility_id === facId).map(d => d.id));
  return D.exceptions.filter(e => deptIds.has(e.department_id) && isOpenException(e)).length;
}
function readinessForFacility(facId) {
  const depts = D.departments.filter(d => d.facility_id === facId);
  const req = depts.reduce((s, d) => s + d.required, 0);
  const comp = depts.reduce((s, d) => s + d.complete, 0);
  return req ? Math.round((comp / req) * 100) : 0;
}
function overCapacitySessions(campaignId) {
  const facIds = new Set(D.facilities.filter(f => f.campaign_id === campaignId).map(f => f.id));
  return D.sessions.filter(s => facIds.has(s.facility_id) && s.registered > s.capacity).length;
}

// DERIVE-ONCE: computed live from campaignData every render (no frozen snapshot),
// so a mutation anywhere moves the dashboard.
function campaignMetrics(campaignId) {
  const campaign = campaignById(campaignId);
  const scoped = campaignData(campaignId);
  const required = scoped.departments.reduce((s, d) => s + d.required, 0);
  const complete = scoped.departments.reduce((s, d) => s + d.complete, 0);
  const openExc = scoped.exceptions.filter(isOpenException);
  return {
    goLiveDate: campaign.goLiveDate,
    daysToGoLive: Math.max(0, Math.round((new Date(campaign.goLiveDate) - new Date()) / (1000 * 60 * 60 * 24))),
    totalLearners: required,
    overallReadiness: required ? (complete / required) * 100 : campaign.readiness,
    criticalRoleReadiness: campaign.readinessScore ?? campaign.readiness,
    departmentsAtRisk: scoped.departments.filter(d => ["high", "critical"].includes(d.risk)).length,
    facilitiesAtRisk: scoped.facilities.filter(f => ["high", "critical"].includes(f.risk)).length,
    openExceptions: openExc.length,
    identityMismatches: openExc.filter(e => /identity|duplicate/i.test(e.type)).length,
    overCapacitySessions: overCapacitySessions(campaignId),
  };
}


function CampaignAccessNotice({ campaign, onNav }) {
  const setup = campaignSetupSummary(campaign.id);
  return (
    <Card className="campaign-notice">
      <div className="campaign-notice-main">
        <Pill tone={statusTone(campaign.risk)} dot>{campaign.status}</Pill>
        <div>
          <div className="strong">{campaign.name}</div>
          <div className="muted small">Administrative-first rollout: learner, trainer, manager, and leadership surfaces can exist, but campaign access stays restricted until the workflow proves useful.</div>
        </div>
      </div>
      <div className="campaign-notice-meta">
        <Metric k="Phase" v={campaign.phase} />
        <Metric k="Go-live" v={fmtDate(campaign.goLiveDate)} />
        <Metric k="Setup gate" v={<button className="linkbtn strong" onClick={() => onNav?.("setup")}>{setup.blocked ? `${setup.blocked} blocked` : `${setup.approved}/${setup.total} approved`}</button>} />
      </div>
    </Card>
  );
}

function setupSectionsForCampaign(campaignId) {
  return (D.campaignSetupSections || []).filter(section => section.campaign_id === campaignId);
}

function campaignSetupSummary(campaignId) {
  const sections = setupSectionsForCampaign(campaignId);
  return {
    total: sections.length,
    approved: sections.filter(s => s.status === "approved").length,
    review: sections.filter(s => s.status === "needs_review").length,
    blocked: sections.filter(s => s.status === "blocked").length,
    inProgress: sections.filter(s => s.status === "in_progress").length,
  };
}


function FilterSelect({ label, value, onChange, children }) {
  return (
    <label className="select-inline session-filter-select">
      <span className="mono">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  );
}


function localDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function todayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sessionDate(value) {
  return localDate(String(value).slice(0, 10));
}

function sessionTime(value) {
  const time = String(value).split(" ")[1] || "";
  const [hourRaw, minute = "00"] = time.split(":");
  const hour = Number(hourRaw);
  if (!hourRaw || Number.isNaN(hour)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function formatSessionStart(value) {
  const [dateKey] = String(value).split(" ");
  return `${fmtDate(dateKey)} · ${sessionTime(value)}`;
}


function ReadinessTable({ departments }) {
  return (
    <Card padded={false}>
      <Table columns={["Department", "Facility", "Required", "Complete", "In progress", "Not started", "Exceptions", "Risk"]} widths={["1.2fr", "1.2fr", "90px", "90px", "100px", "100px", "90px", "90px"]}>
        {departments.length === 0 && (
          <Row><Cell>No departments in this campaign yet — start with roster intake and matrix design.</Cell><Cell /><Cell /><Cell /><Cell /><Cell /><Cell /><Cell /></Row>
        )}
        {departments.map(d => (
          <Row key={d.id}>
            <Cell><span className="strong">{d.name}</span></Cell>
            <Cell><span className="muted">{facilityNameById(d.facility_id)}</span></Cell>
            <Cell><span className="mono">{d.required}</span></Cell>
            <Cell><span className="mono">{d.complete}</span></Cell>
            <Cell><span className="mono">{d.in_progress}</span></Cell>
            <Cell><span className="mono">{d.not_started}</span></Cell>
            <Cell><span className="mono">{openExceptionsForDepartment(d.id)}</span></Cell>
            <Cell>{riskPill(d.risk)}</Cell>
          </Row>
        ))}
      </Table>
    </Card>
  );
}

function PageHeader({ eyebrow, title, sub, action }) {
  return (
    <header className="page-header">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="display-lg">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}

function Section({ eyebrow, title, action, children }) {
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="display-sm">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Metric({ k, v }) {
  return <div className="metric"><div className="metric-k">{k}</div><div className="metric-v">{v}</div></div>;
}

function KV({ k, v }) {
  return <div className="kv"><span className="kv-k">{k}</span><span className="kv-v">{v}</span></div>;
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="seg">
      {options.map(o => (
        <button key={o.value} className={cls("seg-btn", value === o.value && "seg-on")} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Table({ columns, widths, children }) {
  const cols = widths ? widths.join(" ") : columns.map(() => "1fr").join(" ");
  return (
    <div className="tbl" style={{ "--cols": cols }}>
      <div className="tbl-head">
        {columns.map((c, i) => <div key={i} className="tbl-h">{c}</div>)}
      </div>
      <div className="tbl-body">{children}</div>
    </div>
  );
}

function Row({ children, selected, onSelect }) {
  const cls = "tbl-row" + (selected ? " is-selected" : "") + (onSelect ? " is-clickable" : "");
  const handleKey = onSelect ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } } : undefined;
  return (
    <div className={cls} onClick={onSelect} onKeyDown={handleKey}
      role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined}
      aria-pressed={onSelect ? !!selected : undefined}>
      {children}
    </div>
  );
}
function Cell({ children }) { return <div className="tbl-cell">{children}</div>; }


export {
  byId, facilityById, departmentById, appById, userById, campaignById, facilityNameById, departmentNameById, riskPill, pct, triggerLabel, campaignData, campaignMetrics, isOpenException, openExceptionsForDepartment, openExceptionsForFacility, readinessForFacility, overCapacitySessions, CampaignAccessNotice, setupSectionsForCampaign, campaignSetupSummary, FilterSelect, localDate, todayDate, addDays, dateKey, sessionDate, sessionTime, formatSessionStart, ReadinessTable, PageHeader, Section, Metric, KV, Segmented, Table, Row, Cell,
};
