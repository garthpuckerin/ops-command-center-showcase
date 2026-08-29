// LMS Ops Command Center — catalog screens.
// Split from screens.jsx (pure code-move); screens.jsx re-exports as a barrel.
import React, { useState, useEffect } from 'react'
import { LMS_DATA as D } from '../data.js'
import { statusTone, statusLabel, Eyebrow, Rule, Pill, Bar, Card, StatNumber, Tabs } from '../components.jsx'
import { Cell, KV, PageHeader, Row, Table, appById, campaignById, riskPill } from './_shared.jsx'

function scopedCatalog(campaignId) {
  const catalog = D.catalogEntities || { roles: [], programs: [], curricula: [] };
  return {
    courses: D.trainingRequirements.filter(r => r.campaign_id === campaignId),
    roles: catalog.roles.filter(r => r.campaign_id === campaignId),
    programs: catalog.programs.filter(p => p.campaign_id === campaignId),
    curricula: catalog.curricula.filter(c => c.campaign_id === campaignId),
  };
}

function CurriculumMapScreen({ campaignId }) {
  const campaign = campaignById(campaignId);
  const catalog = scopedCatalog(campaignId);
  const [tab, setTab] = React.useState("roles");
  const [selected, setSelected] = React.useState(null);
  const rows = tab === "courses" ? catalog.courses : catalog[tab];

  React.useEffect(() => setSelected(null), [campaignId, tab]);

  return (
    <div className="screen">
      <PageHeader eyebrow="Course and role setup" title="Expose the messy matrix." sub={`${campaign.name}: inspect courses, roles, programs, and curricula separately before rollout recommendations are approved.`} />
      <div className="stat-grid stat-grid-4">
        <Card><StatNumber value={catalog.courses.length} sub="courses" hint="Campaign scoped" /></Card>
        <Card><StatNumber value={catalog.roles.length} sub="learner roles" hint="Mapped from source roles" /></Card>
        <Card><StatNumber value={catalog.programs.length} sub="programs" hint="LMS module grouping" /></Card>
        <Card><StatNumber value={catalog.curricula.length} sub="curricula" hint="Required learning bundles" /></Card>
      </div>
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "roles", label: "Roles", count: catalog.roles.length },
          { id: "courses", label: "Courses", count: catalog.courses.length },
          { id: "programs", label: "Programs", count: catalog.programs.length },
          { id: "curricula", label: "Curricula", count: catalog.curricula.length },
        ]}
      />
      <Card padded={false}>
        <Table columns={tab === "courses" ? ["Course", "Role", "Application", "Assigned", "Ready", "Risk"] : ["Name", "Type", "Owner / Source", "Assigned", "Confidence", "Status"]} widths={tab === "courses" ? ["1.4fr", "1fr", "1.1fr", "90px", "1fr", "90px"] : ["1.4fr", "100px", "1.4fr", "90px", "110px", "110px"]}>
          {rows.length === 0 && <Row><Cell>No records for this campaign.</Cell><Cell /><Cell /><Cell /><Cell /><Cell /></Row>}
          {rows.map(item => tab === "courses" ? (
            <Row key={item.id}>
              <Cell><button className="link-btn strong" onClick={() => setSelected({ type: "course", item })}>{item.title}</button><div className="mono mono-dim small">{item.code}</div></Cell>
              <Cell>{item.role}</Cell>
              <Cell><span className="muted">{appById(item.application_id)?.name}</span></Cell>
              <Cell><span className="mono">{item.assigned}</span></Cell>
              <Cell><Bar value={item.readiness} tone={item.color} showLabel /></Cell>
              <Cell>{riskPill(item.risk)}</Cell>
            </Row>
          ) : (
            <Row key={item.id}>
              <Cell><button className="link-btn strong" onClick={() => setSelected({ type: catalogTypeLabel(tab), item })}>{item.name}</button><div className="muted small">{item.notes || ""}</div></Cell>
              <Cell><Pill tone="muted" mono>{item.type || "role"}</Pill></Cell>
              <Cell>{item.owner || item.source_role || "Training Ops"}</Cell>
              <Cell><span className="mono">{item.assigned || item.learner_count || 0}</span></Cell>
              <Cell><span className="mono">{item.confidence ? `${Math.round(item.confidence * 100)}%` : "n/a"}</span></Cell>
              <Cell><Pill tone={statusTone(item.status || "approved")} dot block>{statusLabel(item.status || "approved")}</Pill></Cell>
            </Row>
          ))}
        </Table>
      </Card>
      {selected && <CatalogDrawer selection={selected} catalog={catalog} onClose={() => setSelected(null)} />}
    </div>
  );
}

function catalogTypeLabel(tab) {
  return ({ roles: "role", programs: "program", curricula: "curriculum" })[tab] || tab;
}

function CatalogDrawer({ selection, catalog, onClose }) {
  const { type, item } = selection;
  const courseIds = type === "course" ? [item.id] : (item.courses || []);
  const roleIds = type === "role" ? [item.id] : (item.roles || catalog.roles.filter(r => (r.courses || []).some(id => courseIds.includes(id))).map(r => r.id));
  const courses = catalog.courses.filter(c => courseIds.includes(c.id));
  const roles = catalog.roles.filter(r => roleIds.includes(r.id) || (r.courses || []).some(id => courseIds.includes(id)));
  const programs = catalog.programs.filter(p => (p.courses || []).some(id => courseIds.includes(id)) || (p.roles || []).some(id => roleIds.includes(id)));
  const curricula = catalog.curricula.filter(c => (c.courses || []).some(id => courseIds.includes(id)) || (c.roles || []).some(id => roleIds.includes(id)));
  const assignedLearners = D.learners.filter(l => roles.some(r => r.name === l.role));

  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <aside className="profile-drawer" role="dialog" aria-label="Catalog detail" onClick={e => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <Eyebrow>{type}</Eyebrow>
            <h2 className="display-sm">{item.name || item.title}</h2>
            <p className="muted small">{item.notes || item.rule || "Campaign-scoped catalog relationship."}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="profile-section">
          <Card>
            <div className="kv-list">
              <KV k="Assigned learners" v={<span className="mono">{assignedLearners.length || item.assigned || item.learner_count || 0}</span>} />
              <KV k="Roles attached" v={<span className="mono">{roles.length}</span>} />
              <KV k="Courses required" v={<span className="mono">{courses.length}</span>} />
              <KV k="Programs" v={<span className="mono">{programs.length}</span>} />
              <KV k="Curricula" v={<span className="mono">{curricula.length}</span>} />
            </div>
          </Card>
          <CatalogDrawerSection title="Attached roles" items={roles.map(r => `${r.name} (${r.source_role})`)} />
          <CatalogDrawerSection title="Required courses" items={courses.map(c => `${c.title} - ${c.code}`)} />
          <CatalogDrawerSection title="Programs" items={programs.map(p => p.name)} />
          <CatalogDrawerSection title="Curricula" items={curricula.map(c => c.name)} />
          <CatalogDrawerSection title="Assigned learners" items={assignedLearners.map(l => `${l.name} - ${l.manager}`)} empty="No campaign learners are assigned yet." />
        </div>
      </aside>
    </div>
  );
}

function CatalogDrawerSection({ title, items, empty = "None attached." }) {
  return (
    <Card>
      <div className="strong">{title}</div>
      <Rule />
      <div className="stack">
        {(items.length ? items : [empty]).map((value, index) => (
          <div className="profile-campaign" key={`${title}-${index}`}>
            <span>{value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}


export {
  scopedCatalog, CurriculumMapScreen, catalogTypeLabel, CatalogDrawer, CatalogDrawerSection,
};
