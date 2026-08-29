// LMS Ops Command Center — people screens.
// Split from screens.jsx (pure code-move); screens.jsx re-exports as a barrel.
import React, { useState, useEffect } from 'react'
import { LMS_DATA as D } from '../data.js'
import * as LMS_API from '../api-client.js'
import { statusLabel, fmt, fmtDate, Eyebrow, Rule, Pill, Bar, Card, StatNumber, Button } from '../components.jsx'
import { Cell, FilterSelect, KV, PageHeader, Row, Table, campaignData, departmentNameById, pct, riskPill } from './_shared.jsx'

function LearnersScreen({ me, role, campaignId }) {
  const scoped = campaignData(campaignId);
  const currentName = me ? `${me.first_name} ${me.last_name}` : "";
  const rows = role === "learner" ? scoped.learners.filter(l => l.name === currentName) : scoped.learners;
  return (
    <div className="screen">
      <PageHeader eyebrow="Learner Reconciliation" title="Learners, accounts, and completion state." sub="Shows where HR, LMS, and Epic identity data do not line up." />
      <Card padded={false}>
        <Table columns={["Learner", "Role", "Department", "LMS", "Epic ID", "Completion", "Exception"]} widths={["1.2fr", "1fr", "1.1fr", "90px", "90px", "1fr", "1.2fr"]}>
          {rows.length === 0 && (
            <Row>
              <Cell><span className="muted">No learner record is currently linked to this demo user.</span></Cell>
              <Cell /><Cell /><Cell /><Cell /><Cell /><Cell />
            </Row>
          )}
          {rows.map(l => (
            <Row key={l.id}>
              <Cell><span className="strong">{l.name}</span><div className="muted small">Manager · {l.manager}</div></Cell>
              <Cell><span>{l.role}</span></Cell>
              <Cell><span className="muted">{departmentNameById(l.department_id)}</span></Cell>
              <Cell>{riskPill(l.lms)}</Cell>
              <Cell>{riskPill(l.epic_id)}</Cell>
              <Cell><div className="rosterbar"><Bar value={l.completion} tone={l.status === "exception" ? "terracotta" : "olive"} /><span className="mono small">{pct(l.completion)}</span></div></Cell>
              <Cell>{l.exception ? <Pill tone="red" dot>{l.exception}</Pill> : <span className="muted">—</span>}</Cell>
            </Row>
          ))}
        </Table>
      </Card>
    </div>
  );
}

function PeopleDirectoryScreen({ campaignId }) {
  const pageSize = 50;
  const [filters, setFilters] = React.useState(defaultPeopleFilters(campaignId));
  const [page, setPage] = React.useState({ items: [], total: 0, limit: pageSize, offset: 0, has_more: false });
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState(null);
  const [profile, setProfile] = React.useState(null);
  const [error, setError] = React.useState("");
  const loaded = page.items.length;

  React.useEffect(() => {
    let cancelled = false;
    async function loadFirstPage() {
      setLoading(true);
      setError("");
      try {
        const next = await LMS_API.listPeople({ ...cleanPeopleFilters(filters), limit: pageSize, offset: 0 });
        if (!cancelled) setPage(next);
      } catch (err) {
        if (!cancelled) setError(err.message || "People lookup failed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadFirstPage();
    return () => { cancelled = true; };
  }, [JSON.stringify(filters)]);

  async function loadMore() {
    setLoading(true);
    setError("");
    try {
      const next = await LMS_API.listPeople({ ...cleanPeopleFilters(filters), limit: pageSize, offset: loaded });
      setPage({ ...next, items: [...page.items, ...(next.items || [])] });
    } catch (err) {
      setError(err.message || "People lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  async function openProfile(person) {
    setSelected(person);
    setProfile(null);
    try {
      const detail = await LMS_API.getPersonProfile(person.id);
      setProfile(detail || person);
    } catch (err) {
      setProfile(person);
    }
  }

  return (
    <div className="screen">
      <PageHeader
        eyebrow="People Directory"
        title="Find any person by operational criteria."
        sub="Tenant-scoped lookup across imported learner records, managers, facilities, departments, campaign participation, identity mappings, and custom fields."
      />
      <PeopleFilterBar filters={filters} setFilters={setFilters} campaignId={campaignId} />
      <div className="grid grid-3">
        <Card><StatNumber value={fmt(page.total)} sub="matching records" hint="paged, not fully hydrated" /></Card>
        <Card><StatNumber value={fmt(loaded)} sub="loaded" hint={page.has_more ? "more available" : "current result set"} /></Card>
        <Card><StatNumber value={fmt(uniquePeopleManagers(page.items).length)} sub="managers visible" hint="from current page" /></Card>
      </div>
      {error && <Card><Pill tone="red">{error}</Pill></Card>}
      <Card padded={false}>
        <Table columns={["Person", "Manager", "Department", "Facility", "Campaign", "Training", "Identity"]} widths={["1.4fr", "1fr", "1fr", "1fr", "1.1fr", "120px", "1fr"]}>
          {(page.items || []).map(person => (
            <Row key={person.id}>
              <Cell>
                <button className="link-btn strong" onClick={() => openProfile(person)}>{person.name}</button>
                <div className="muted small">{person.email || person.employee_id || "No primary contact"}</div>
              </Cell>
              <Cell><span>{person.manager_name || "—"}</span></Cell>
              <Cell><span className="muted">{person.department_name || "—"}</span></Cell>
              <Cell><span className="muted">{person.facility_name || "—"}</span></Cell>
              <Cell><span>{person.campaign_name}</span><div className="muted small">{person.campaign_count} campaign{person.campaign_count === 1 ? "" : "s"}</div></Cell>
              <Cell>{riskPill(person.training_status)}</Cell>
              <Cell>
                <div className="stack-tight">
                  <span className="mono small">{person.employee_id || "No employee ID"}</span>
                  <span className="muted small">LMS {person.lms_user_id || "—"} · Epic {person.epic_user_id || "—"}</span>
                </div>
              </Cell>
            </Row>
          ))}
        </Table>
        <div className="table-footer">
          <span className="muted small">{loading ? "Loading..." : `${fmt(loaded)} of ${fmt(page.total)} loaded`}</span>
          <Button kind="ghost" disabled={loading || !page.has_more} onClick={loadMore}>Load more</Button>
        </div>
      </Card>
      {selected && (
        <PeopleProfileDrawer
          person={profile || selected}
          loading={!profile}
          onClose={() => { setSelected(null); setProfile(null); }}
        />
      )}
    </div>
  );
}

function PeopleFilterBar({ filters, setFilters, campaignId }) {
  const departments = D.departments.filter(d => !filters.campaign_id || filters.campaign_id === "all" || d.campaign_id === filters.campaign_id);
  const facilities = D.facilities.filter(f => !filters.campaign_id || filters.campaign_id === "all" || f.campaign_id === filters.campaign_id);
  const managers = ["all", ...new Set((D.learners || []).map(l => l.manager_name || l.manager).filter(Boolean))].sort();
  const roles = ["all", ...new Set((D.learners || []).map(l => l.job_role || l.role).filter(Boolean))].sort();
  const set = (key, value) => setFilters({ ...filters, [key]: value });
  return (
    <Card className="filterbar people-filterbar">
      <div className="filterbar-row">
        <label className="session-filter-select grow">
          <span>Search</span>
          <input value={filters.q} onChange={e => set("q", e.target.value)} placeholder="Name, email, employee ID, LMS, Epic" />
        </label>
        <FilterSelect label="Manager" value={filters.manager} onChange={v => set("manager", v)}>
          {managers.map(manager => <option key={manager} value={manager}>{manager === "all" ? "All" : manager}</option>)}
        </FilterSelect>
        <FilterSelect label="Role" value={filters.job_role} onChange={v => set("job_role", v)}>
          {roles.map(role => <option key={role} value={role}>{role === "all" ? "All" : role}</option>)}
        </FilterSelect>
        <FilterSelect label="Campaign" value={filters.campaign_id} onChange={v => set("campaign_id", v)}>
          <option value="all">All</option>
          {D.campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </FilterSelect>
        <FilterSelect label="Department" value={filters.department_id} onChange={v => set("department_id", v)}>
          <option value="all">All</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </FilterSelect>
        <FilterSelect label="Facility" value={filters.facility_id} onChange={v => set("facility_id", v)}>
          <option value="all">All</option>
          {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </FilterSelect>
        <FilterSelect label="Training" value={filters.training_status} onChange={v => set("training_status", v)}>
          {["all", "completed", "in_progress", "not_started", "overdue"].map(v => <option key={v} value={v}>{v === "all" ? "All" : statusLabel(v)}</option>)}
        </FilterSelect>
        <FilterSelect label="Risk" value={filters.risk_level} onChange={v => set("risk_level", v)}>
          {["all", "critical", "high", "medium", "low"].map(v => <option key={v} value={v}>{v === "all" ? "All" : statusLabel(v)}</option>)}
        </FilterSelect>
        <Button kind="ghost" onClick={() => setFilters(defaultPeopleFilters(campaignId))}>Reset</Button>
      </div>
    </Card>
  );
}

function PeopleProfileDrawer({ person, loading, onClose }) {
  const customFields = Object.entries(person.custom_fields || {});
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="profile-drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <Eyebrow>Profile</Eyebrow>
            <h2>{person.name}</h2>
            <p className="muted">{person.job_role || "No role"} · {person.manager_name || "No manager"}</p>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close">×</button>
        </div>
        {loading ? <p className="muted">Loading profile...</p> : (
          <>
            <div className="profile-section">
              <Eyebrow>Identity</Eyebrow>
              <div className="kv-list">
                <KV k="Email" v={person.email || "—"} />
                <KV k="Employee ID" v={<span className="mono">{person.employee_id || "—"}</span>} />
                <KV k="LMS ID" v={<span className="mono">{person.lms_user_id || "—"}</span>} />
                <KV k="Epic ID" v={<span className="mono">{person.epic_user_id || "—"}</span>} />
                <KV k="Reconciliation" v={riskPill(person.reconciliation_status)} />
              </div>
            </div>
            <Rule />
            <div className="profile-section">
              <Eyebrow>Org Placement</Eyebrow>
              <div className="kv-list">
                <KV k="Manager" v={person.manager_name || "—"} />
                <KV k="Department" v={person.department_name || "—"} />
                <KV k="Facility" v={person.facility_name || "—"} />
                <KV k="Risk" v={riskPill(person.risk_level)} />
              </div>
            </div>
            <Rule />
            <PeopleTrainingSection
              title="Outstanding Training"
              items={person.outstanding_training || []}
              empty="No outstanding assigned courses."
              completed={false}
            />
            <Rule />
            <PeopleTrainingSection
              title="Completed Training"
              items={person.completed_training || []}
              empty="No completed course records yet."
              completed
            />
            <Rule />
            <div className="profile-section">
              <Eyebrow>Campaigns</Eyebrow>
              <div className="stack">
                {(person.campaigns || []).map(c => (
                  <div className="profile-campaign" key={`${c.campaign_id}-${c.learner_id}`}>
                    <div>
                      <div className="strong">{c.campaign_name}</div>
                      <div className="muted small">{c.department_name || "No department"} · {c.facility_name || "No facility"}</div>
                    </div>
                    <div className="profile-campaign-pills">
                      {riskPill(c.training_status)}
                      {riskPill(c.risk_level)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {customFields.length > 0 && (
              <>
                <Rule />
                <div className="profile-section">
                  <Eyebrow>Custom Fields</Eyebrow>
                  <div className="kv-list">
                    {customFields.map(([key, value]) => <KV key={key} k={statusLabel(key)} v={String(value)} />)}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

function PeopleTrainingSection({ title, items, empty, completed }) {
  return (
    <div className="profile-section">
      <Eyebrow>{title}</Eyebrow>
      {items.length === 0 ? <p className="muted small">{empty}</p> : (
        <div className="stack">
          {items.map(item => (
            <div className="training-card" key={item.assignment_id}>
              <div>
                <div className="strong">{item.requirement_name}</div>
                <div className="muted small">{item.application || "General"} · {item.campaign_name}</div>
                <div className="muted small">
                  {completed
                    ? `Completed ${fmtDate(item.completed_at)}${item.score != null ? ` · Score ${item.score}` : ""}`
                    : `Due ${fmtDate(item.due_at)}${item.exception_count ? ` · ${item.exception_count} exception${item.exception_count === 1 ? "" : "s"}` : ""}`}
                </div>
              </div>
              {riskPill(item.status)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function defaultPeopleFilters(campaignId) {
  return {
    q: "",
    manager: "all",
    department_id: "all",
    facility_id: "all",
    job_role: "all",
    training_status: "all",
    reconciliation_status: "all",
    risk_level: "all",
    campaign_id: "all",
  };
}

function cleanPeopleFilters(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "all" && value !== ""));
}

function uniquePeopleManagers(items) {
  return [...new Set((items || []).map(item => item.manager_name).filter(Boolean))];
}


export {
  LearnersScreen, PeopleDirectoryScreen, PeopleFilterBar, PeopleProfileDrawer, PeopleTrainingSection, defaultPeopleFilters, cleanPeopleFilters, uniquePeopleManagers,
};
