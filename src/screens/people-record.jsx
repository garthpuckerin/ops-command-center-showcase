// LMS Ops Command Center — a person's record, and the companion People list.
// The record is route-driven (`#people/<id>`), so it is deep-linkable on both
// shells: the workstation shows it in the profile drawer over the directory,
// the companion as its own screen (a drawer over a phone list is the desktop
// squeezed). The profile body is shared by both.
import React from 'react'
import { statusLabel, fmtDate, Eyebrow, Rule, Card } from '../components.jsx'
import { KV, riskPill } from './_shared.jsx'

export function PeopleProfileBody({ person, loading }) {
  if (loading) return <p className="muted">Loading profile...</p>;
  const customFields = Object.entries(person.custom_fields || {});
  return (
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
      <PeopleTrainingSection title="Outstanding Training" items={person.outstanding_training || []} empty="No outstanding assigned courses." completed={false} />
      <Rule />
      <PeopleTrainingSection title="Completed Training" items={person.completed_training || []} empty="No completed course records yet." completed />
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
  );
}

export function PeopleTrainingSection({ title, items, empty, completed }) {
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

/** The companion's person record — its own screen, reached by `#people/<id>`. */
export function PersonRecordScreen({ person, loading, missing, onBack }) {
  return (
    <div className="screen">
      <button className="back-link" onClick={onBack}>‹ People Directory</button>
      {missing ? (
        <Card>
          <h1 className="display-sm">No person matches this link.</h1>
          <p className="muted small">The record may belong to another campaign or tenant. Search the directory instead.</p>
        </Card>
      ) : (
        <>
          <header className="page-header">
            <div>
              <Eyebrow>Person record</Eyebrow>
              <h1 className="display-lg">{person.name}</h1>
              <p className="page-sub">{person.job_role || "No role"} · {person.manager_name || "No manager"}</p>
            </div>
          </header>
          <Card><PeopleProfileBody person={person} loading={loading} /></Card>
        </>
      )}
    </div>
  );
}

/** The companion's People list: one tappable card per person — the whole card
 *  is the target, never a 20px name link inside a stacked table row. */
export function PersonCards({ items, onOpen }) {
  return (
    <div className="person-list">
      {items.map(person => (
        <button className="person-card" key={person.id} data-person-id={person.id} onClick={() => onOpen(person)}>
          <span className="person-card-main">
            <span className="strong">{person.name}</span>
            <span className="muted small">{person.job_role || "No role"} · {person.department_name || "No department"}</span>
          </span>
          {riskPill(person.training_status)}
        </button>
      ))}
    </div>
  );
}
