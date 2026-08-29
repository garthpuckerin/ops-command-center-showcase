// LMS Ops Command Center — exceptions screens.
// Split from screens.jsx (pure code-move); screens.jsx re-exports as a barrel.
import React, { useState, useEffect } from 'react'
import { LMS_DATA as D } from '../data.js'
import * as LMS_API from '../api-client.js'
import { statusLabel, fmtDate, Eyebrow, Rule, Pill, Card, Button } from '../components.jsx'
import { Cell, KV, PageHeader, Row, Table, addDays, campaignData, dateKey, departmentById, facilityById, localDate, riskPill, todayDate } from './_shared.jsx'

function ExceptionsScreen({ campaignId, onDataChanged }) {
  const scoped = campaignData(campaignId);
  const [workingId, setWorkingId] = React.useState(null);
  const [message, setMessage] = React.useState("");
  const [filters, setFilters] = React.useState({
    status: "all",
    severity: "all",
    owner: "all",
    type: "all",
    facility: "all",
    department: "all",
    due: "all",
  });
  const queue = (D.exceptionQueue || scoped.exceptions).filter(e => {
    if (e.campaign_id && e.campaign_id !== campaignId) return false;
    if (!e.campaign_id && !scoped.departments.some(d => d.id === e.department_id)) return false;
    return exceptionMatchesFilters(e, filters);
  });
  const [activeId, setActiveId] = React.useState(queue[0]?.queue_item_id || queue[0]?.id);
  React.useEffect(() => {
    if (queue.length && !queue.some(e => (e.queue_item_id || e.id) === activeId)) {
      setActiveId(queue[0].queue_item_id || queue[0].id);
    }
  }, [campaignId, queue.length, activeId]);
  const active = queue.find(e => (e.queue_item_id || e.id) === activeId) || queue[0];
  const owners = ["all", ...new Set((D.exceptionQueue || scoped.exceptions).map(e => e.owner).filter(Boolean))];
  const types = ["all", ...new Set((D.exceptionQueue || scoped.exceptions).map(e => e.exception_type || e.type).filter(Boolean))];

  async function updateException(item, updates) {
    const itemId = item.queue_item_id || item.id;
    setWorkingId(itemId);
    setMessage("");
    try {
      if (LMS_API?.updateExceptionQueueItem && item.queue_item_id) {
        await LMS_API.updateExceptionQueueItem(campaignId, item.queue_item_id, updates);
      } else if (LMS_API) {
        await LMS_API.updateException(campaignId, item.id, updates);
      } else {
        const existing = (D.exceptionQueue || D.exceptions).find(e => (e.queue_item_id || e.id) === itemId);
        if (existing) Object.assign(existing, updates);
      }
      onDataChanged?.();
      setMessage(["closed", "resolved"].includes(updates.status) ? "Exception resolved." : "Exception updated.");
    } catch (err) {
      setMessage(`Update failed: ${err.message}`);
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="screen">
      <PageHeader eyebrow="Exception Queue" title="Open blockers and escalations." sub="The daily work queue for readiness leads, trainers, access teams, and department owners." />
      {message && <Pill tone={message.startsWith("Update failed") ? "red" : "olive"}>{message}</Pill>}
      <Card className="filterbar">
        <div className="filterbar-row">
          <QueueSelect label="Status" value={filters.status} onChange={v => setFilters({ ...filters, status: v })} options={["all", "open", "in_progress", "blocked", "resolved", "closed"]} />
          <QueueSelect label="Severity" value={filters.severity} onChange={v => setFilters({ ...filters, severity: v })} options={["all", "critical", "high", "medium", "low"]} />
          <QueueSelect label="Owner" value={filters.owner} onChange={v => setFilters({ ...filters, owner: v })} options={owners} />
          <QueueSelect label="Type" value={filters.type} onChange={v => setFilters({ ...filters, type: v })} options={types} />
          <QueueSelect label="Facility" value={filters.facility} onChange={v => setFilters({ ...filters, facility: v })} options={["all", ...scoped.facilities.map(f => f.id)]} render={id => id === "all" ? "All" : facilityById(id)?.name || id} />
          <QueueSelect label="Department" value={filters.department} onChange={v => setFilters({ ...filters, department: v })} options={["all", ...scoped.departments.map(d => d.id)]} render={id => id === "all" ? "All" : departmentById(id)?.name || id} />
          <QueueSelect label="Due" value={filters.due} onChange={v => setFilters({ ...filters, due: v })} options={["all", "overdue", "today", "week"]} />
        </div>
      </Card>

      <div className="two-col">
        <Card padded={false}>
          <Table columns={["Severity", "Type", "Owner", "Department", "Due", "Status", "Actions"]} widths={["100px", "1fr", "1fr", "1.1fr", "100px", "100px", "150px"]}>
            {queue.map(e => (
              <Row key={e.queue_item_id || e.id}
                selected={(e.queue_item_id || e.id) === (active?.queue_item_id || active?.id)}
                onSelect={() => setActiveId(e.queue_item_id || e.id)}>
                <Cell>{riskPill(e.severity)}</Cell>
                <Cell><span className="strong">{e.type}</span></Cell>
                <Cell><span>{e.owner}</span></Cell>
                <Cell><span className="muted">{departmentById(e.department_id)?.name || "Campaign"}</span></Cell>
                <Cell><span className="mono small">{fmtDate(e.due)}</span></Cell>
                <Cell>{riskPill(e.status)}</Cell>
                <Cell>
                  <div className="exception-actions">
                    {e.status === "open" && (
                      <Button kind="ghost" size="sm" disabled={workingId === (e.queue_item_id || e.id)} onClick={() => updateException(e, { status: "in_progress", owner_name: e.owner || "Readiness Lead" })}>Start</Button>
                    )}
                    {!["closed", "resolved"].includes(e.status) && (
                      <Button kind="solid" size="sm" disabled={workingId === (e.queue_item_id || e.id)} onClick={() => updateException(e, { status: "resolved", resolution_reason: "Resolved from exception queue", notes: `${e.notes || ""} Resolved in Command Center.` })}>Resolve</Button>
                    )}
                  </div>
                </Cell>
              </Row>
            ))}
          </Table>
        </Card>
        <ExceptionDetailPanel item={active} onUpdate={updates => active && updateException(active, updates)} working={workingId === (active?.queue_item_id || active?.id)} />
      </div>
    </div>
  );
}

function exceptionMatchesFilters(e, filters) {
  if (filters.status !== "all" && e.status !== filters.status) return false;
  if (filters.severity !== "all" && e.severity !== filters.severity) return false;
  if (filters.owner !== "all" && e.owner !== filters.owner) return false;
  if (filters.type !== "all" && (e.exception_type || e.type) !== filters.type) return false;
  if (filters.facility !== "all" && e.facility_id !== filters.facility) return false;
  if (filters.department !== "all" && e.department_id !== filters.department) return false;
  if (filters.due !== "all") {
    const due = e.due ? localDate(e.due) : null;
    const today = todayDate();
    if (!due) return false;
    if (filters.due === "overdue" && due >= today) return false;
    if (filters.due === "today" && dateKey(due) !== dateKey(today)) return false;
    if (filters.due === "week" && (due < today || due > addDays(today, 7))) return false;
  }
  return true;
}

function QueueSelect({ label, value, onChange, options, render }) {
  const labelFor = render || (v => statusLabel(v));
  return (
    <label className="session-filter-select">
      <span>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {options.map(option => <option key={option} value={option}>{labelFor(option)}</option>)}
      </select>
    </label>
  );
}

function ExceptionDetailPanel({ item, onUpdate, working }) {
  if (!item) {
    return <Card><Pill tone="muted">No queue item selected</Pill></Card>;
  }
  return (
    <Card>
      <Eyebrow n={6}>Detail</Eyebrow>
      <h2 className="display-sm">{item.type}</h2>
      <p className="muted small">{item.notes}</p>
      <Rule />
      <div className="kv-list">
        <KV k="Source" v={<span className="mono">{item.source_type || "campaign_exception"}</span>} />
        <KV k="Owner" v={item.owner || "Unassigned"} />
        <KV k="Facility" v={item.facility_id ? facilityById(item.facility_id)?.name : "Campaign"} />
        <KV k="Department" v={item.department_id ? departmentById(item.department_id)?.name : "Campaign"} />
        <KV k="Related" v={item.related_entity_type ? `${item.related_entity_type}:${item.related_entity_id || "pending"}` : "None"} />
        <KV k="Escalation" v={<span className="mono">{item.escalation_level || 0}</span>} />
        <KV k="Resolution" v={item.resolution_reason || "Open"} />
      </div>
      <div className="focal-actions">
        <Button kind="ghost" size="sm" disabled={working} onClick={() => onUpdate({ owner_name: item.owner || "Readiness Lead", escalation_level: Math.min((item.escalation_level || 0) + 1, 5) })}>Escalate</Button>
        <Button kind="solid" size="sm" disabled={working} onClick={() => onUpdate({ status: "resolved", resolution_reason: "Resolved from detail panel" })}>Resolve</Button>
      </div>
    </Card>
  );
}


export {
  ExceptionsScreen, exceptionMatchesFilters, QueueSelect, ExceptionDetailPanel,
};
