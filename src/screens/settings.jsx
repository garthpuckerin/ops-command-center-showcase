// LMS Ops Command Center — settings screens.
// Split from screens.jsx (pure code-move); screens.jsx re-exports as a barrel.
import React, { useState } from 'react'
import { LMS_DATA as D } from '../data.js'
import * as LMS_API from '../api-client.js'
import { cls, Eyebrow, Rule, Pill, Icon, Card, StatNumber, Button } from '../components.jsx'
import { Cell, KV, PageHeader, Row, Section, Segmented, Table, campaignById, campaignData, riskPill, triggerLabel } from './_shared.jsx'

function OrgSettingsScreen({ t, setTweak }) {
  const org = D.organizationSettings || {};
  const fields = D.customFields || [];
  const palettes = [
    { id: "terracotta", label: "Command Warm", value: ["#b5572d", "#0f0d0a", "#f6f3ec"] },
    { id: "olive", label: "Clinical Olive", value: ["#566234", "#0f0d0a", "#f6f3ec"] },
    { id: "inkblue", label: "Boardroom Blue", value: ["#3a4d6e", "#0f0d0a", "#f6f3ec"] },
  ];
  return (
    <div className="screen">
      <PageHeader eyebrow="Organization settings" title="Portable demo, governed platform." sub="A client-safe settings surface for themes, connectors, local AI, org-wide custom fields, and deployment posture." />
      <div className="settings-grid">
        <Card>
          <Eyebrow n={1}>Organization</Eyebrow>
          <Rule />
          <div className="kv-list">
            <KV k="Name" v={org.name} />
            <KV k="Deployment mode" v={<Pill tone="olive" mono>{org.deployment_mode}</Pill>} />
            <KV k="Data residency" v={org.data_residency} />
            <KV k="Governance" v={org.governance_model} />
            <KV k="AI mode" v={org.ai_mode} />
          </div>
        </Card>
        <Card>
          <Eyebrow n={2}>Theme</Eyebrow>
          <Rule />
          <div className="theme-grid">
            {palettes.map(p => (
              <button key={p.id} className="theme-card" onClick={() => setTweak("palette", p.value)}>
                <span className="theme-swatch" style={{ background: p.value[0] }} />
                <span className="strong">{p.label}</span>
                <span className="muted small">Demo-safe palette</span>
              </button>
            ))}
          </div>
          <Rule />
          <KV k="Mode" v={<Segmented value={t.themeMode || "light"} onChange={(v) => setTweak("themeMode", v)} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />} />
          <KV k="Density" v={<Segmented value={t.density} onChange={(v) => setTweak("density", v)} options={[{ value: "cozy", label: "Cozy" }, { value: "compact", label: "Compact" }]} />} />
        </Card>
      </div>
      <Section eyebrow="03" title="Connectors and local AI">
        <Card padded={false}>
          <Table columns={["Connection", "Status", "Scope"]} widths={["1.2fr", "120px", "2fr"]}>
            {(org.connectors || []).map(conn => (
              <Row key={conn.id}>
                <Cell><span className="strong">{conn.name}</span></Cell>
                <Cell><Pill tone={conn.status === "mock" || conn.status === "configurable" ? "olive" : conn.status === "planned" ? "ochre" : "muted"} mono>{conn.status}</Pill></Cell>
                <Cell><span className="muted">{conn.scope}</span></Cell>
              </Row>
            ))}
          </Table>
        </Card>
      </Section>
      <Section eyebrow="04" title="Org-wide custom fields">
        <Card padded={false}>
          <Table columns={["Field", "Type", "Entity scope", "Aliases", "Sensitive"]} widths={["1fr", "90px", "1.4fr", "1.3fr", "100px"]}>
            {fields.map(field => (
              <Row key={field.id}>
                <Cell><span className="strong">{field.label}</span><div className="mono mono-dim small">{field.key}</div></Cell>
                <Cell><span className="mono small">{field.data_type}</span></Cell>
                <Cell>{field.allowed_entity_types.join(", ")}</Cell>
                <Cell><span className="muted">{field.source_aliases.join(", ")}</span></Cell>
                <Cell><Pill tone={field.is_sensitive ? "terracotta" : "olive"} mono>{field.is_sensitive ? "Yes" : "No"}</Pill></Cell>
              </Row>
            ))}
          </Table>
        </Card>
      </Section>
    </div>
  );
}


const PALETTE_OPTIONS = [
  { id: "terracotta", label: "Terracotta", value: ["#b5572d", "#0f0d0a", "#f6f3ec"], swatch: "#b5572d" },
  { id: "olive", label: "Olive", value: ["#566234", "#0f0d0a", "#f6f3ec"], swatch: "#566234" },
  { id: "inkblue", label: "Ink blue", value: ["#3a4d6e", "#0f0d0a", "#f6f3ec"], swatch: "#3a4d6e" },
];

function SettingsScreen({ me, t, setTweak }) {
  const activePaletteId =
    Array.isArray(t.palette) && t.palette[0] === "#566234" ? "olive" :
    Array.isArray(t.palette) && t.palette[0] === "#3a4d6e" ? "inkblue" : "terracotta";

  return (
    <div className="screen">
      <PageHeader eyebrow="Settings" title="Prototype settings." sub="Visual controls for the standalone demo." />
      <Section eyebrow="01" title="Appearance">
        <Card padded>
          <div className="kv-list">
            <div className="kv">
              <span className="kv-k">Accent palette</span>
              <span className="kv-v">
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {PALETTE_OPTIONS.map(p => (
                    <button key={p.id} onClick={() => setTweak("palette", p.value)} className={cls("btn", activePaletteId === p.id ? "btn-solid" : "btn-ghost")} style={{ paddingLeft: 10 }}>
                      <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: 2, background: p.swatch, border: "1px solid rgba(0,0,0,.15)", flexShrink: 0 }} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </span>
            </div>
            <div className="kv">
              <span className="kv-k">Theme mode</span>
              <span className="kv-v">
                <Segmented value={t.themeMode || "light"} onChange={(v) => setTweak("themeMode", v)} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
              </span>
            </div>
            <div className="kv">
              <span className="kv-k">Density</span>
              <span className="kv-v">
                <Segmented value={t.density} onChange={(v) => setTweak("density", v)} options={[{ value: "cozy", label: "Cozy" }, { value: "compact", label: "Compact" }]} />
              </span>
            </div>
          </div>
        </Card>
      </Section>
      <Section eyebrow="02" title="Account">
        <Card padded>
          <div className="kv-list">
            <KV k="Name" v={`${me.first_name} ${me.last_name}`} />
            <KV k="Email" v={<span className="mono small">{me.email}</span>} />
            <KV k="Role" v={<Pill tone="muted" mono>{me.title}</Pill>} />
          </div>
        </Card>
      </Section>
    </div>
  );
}

function NotificationsScreen({ campaignId, onDataChanged }) {
  const campaign = campaignById(campaignId);
  const notifications = (D.notifications || [])
    .filter(n => n.campaign_id === campaignId)
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  const rules = (D.escalationRules || []).filter(r => r.campaign_id === campaignId);
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState(null);

  async function runRules() {
    if (!LMS_API?.runEscalationRules) return;
    setRunning(true);
    try {
      const next = await LMS_API.runEscalationRules(campaignId);
      setResult(next);
      onDataChanged?.();
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="screen">
      <PageHeader
        eyebrow={`Campaign · ${campaign.status}`}
        title="Notifications"
        sub={`${campaign.name} escalation rules create in-app work signals before external channels are enabled.`}
        action={<Button kind="solid" icon="bell" onClick={runRules} disabled={running}>{running ? "Running" : "Run rules"}</Button>}
      />

      <div className="stat-grid stat-grid-4">
        <Card><StatNumber value={notifications.filter(n => n.status === "unread").length} sub="unread" hint="Campaign scoped" /></Card>
        <Card><StatNumber value={rules.filter(r => r.is_active).length} sub="active rules" hint={`${rules.length} configured`} /></Card>
        <Card><StatNumber value={notifications.filter(n => n.severity === "critical").length} sub="critical notices" hint="Highest urgency" /></Card>
        <Card><StatNumber value={notifications.filter(n => n.source_type === "campaign_exception").length} sub="blocker notices" hint="From exception rules" /></Card>
      </div>

      {result && (
        <Card padded>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div className="strong">Rule execution complete</div>
              <div className="muted small">{result.evaluated} evaluated, {result.created} new notifications.</div>
            </div>
            <Pill tone={result.created ? "terracotta" : "olive"} mono>{result.created ? "New signals" : "No changes"}</Pill>
          </div>
        </Card>
      )}

      <Section eyebrow="01" title="In-app notifications">
        <Table columns={["Signal", "Severity", "Source", "Status", "Created"]} widths={["1.7fr", "110px", "1fr", "110px", "150px"]}>
          {notifications.length === 0 && <Row><Cell>No notifications for this campaign.</Cell><Cell /><Cell /><Cell /><Cell /></Row>}
          {notifications.map(n => (
            <Row key={n.id}>
              <Cell>
                <div className="strong">{n.title}</div>
                <div className="muted small">{n.message}</div>
              </Cell>
              <Cell>{riskPill(n.severity)}</Cell>
              <Cell><span className="mono small">{triggerLabel(n.source_type)}</span></Cell>
              <Cell><Pill tone={n.status === "unread" ? "terracotta" : "muted"} mono>{triggerLabel(n.status)}</Pill></Cell>
              <Cell><span className="mono small">{String(n.created_at || "").slice(0, 16).replace("T", " ")}</span></Cell>
            </Row>
          ))}
        </Table>
      </Section>

      <Section eyebrow="02" title="Escalation rules">
        <Table columns={["Rule", "Trigger", "Parameters", "Severity", "State"]} widths={["1.4fr", "1.2fr", "1.6fr", "110px", "90px"]}>
          {rules.length === 0 && <Row><Cell>No escalation rules configured.</Cell><Cell /><Cell /><Cell /><Cell /></Row>}
          {rules.map(rule => (
            <Row key={rule.id}>
              <Cell><div className="strong">{rule.name}</div></Cell>
              <Cell><span className="mono small">{triggerLabel(rule.trigger_type)}</span></Cell>
              <Cell><span className="mono small">{JSON.stringify(rule.parameters || {})}</span></Cell>
              <Cell>{riskPill(rule.severity)}</Cell>
              <Cell><Pill tone={rule.is_active ? "olive" : "muted"} mono>{rule.is_active ? "Active" : "Paused"}</Pill></Cell>
            </Row>
          ))}
        </Table>
      </Section>
    </div>
  );
}

function TimelineScreen({ campaignId }) {
  const campaign = campaignById(campaignId);
  const milestones = (D.milestones || [])
    .filter(m => m.campaign_id === campaignId)
    .sort((a, b) => new Date(a.due_at) - new Date(b.due_at));
  const next = milestones.find(m => m.status !== "complete") || milestones[0];

  return (
    <div className="screen">
      <PageHeader eyebrow="Timeline" title="Campaign milestones" sub={`${campaign.name} timing, deadlines, import cadence, and escalation checkpoints.`} />
      <div className="stat-grid stat-grid-4">
        <Card><StatNumber value={milestones.length} sub="milestones" hint="Campaign scoped" /></Card>
        <Card><StatNumber value={next ? Math.max(0, Math.round((new Date(next.due_at) - new Date()) / (1000 * 60 * 60 * 24))) : 0} sub="days to next" hint={next?.title || "No milestone"} /></Card>
        <Card><StatNumber value={milestones.filter(m => m.milestone_type === "import_cadence").length} sub="import cadence" /></Card>
        <Card><StatNumber value={milestones.filter(m => m.milestone_type.includes("escalation")).length} sub="escalation checkpoints" /></Card>
      </div>
      <Section eyebrow="01" title="Milestone timeline">
        <Table columns={["Milestone", "Type", "Due", "Owner", "Status"]} widths={["1.6fr", "1fr", "150px", "1fr", "110px"]}>
          {milestones.length === 0 && <Row><Cell>No milestones for this campaign.</Cell><Cell /><Cell /><Cell /><Cell /></Row>}
          {milestones.map(m => (
            <Row key={m.id}>
              <Cell><div className="strong">{m.title}</div><div className="muted small">{m.notes}</div></Cell>
              <Cell><span className="mono small">{triggerLabel(m.milestone_type)}</span></Cell>
              <Cell><span className="mono small">{String(m.due_at || "").slice(0, 10)}</span></Cell>
              <Cell>{m.owner_name || "Unassigned"}</Cell>
              <Cell><Pill tone={m.status === "complete" ? "olive" : "muted"} mono>{triggerLabel(m.status)}</Pill></Cell>
            </Row>
          ))}
        </Table>
      </Section>
    </div>
  );
}

function IntegrationHealthScreen({ campaignId }) {
  const campaign = campaignById(campaignId);
  const health = (D.integrationHealth || []).filter(item => item.campaign_id === campaignId);
  return (
    <div className="screen">
      <PageHeader eyebrow="Integration health" title="Source-system freshness" sub={`${campaign.name} import recency, failed rows, and stale-data warnings.`} />
      <div className="stat-grid stat-grid-4">
        <Card><StatNumber value={health.length} sub="sources" hint="Latest per source/type" /></Card>
        <Card><StatNumber value={health.filter(h => h.is_stale).length} sub="stale feeds" hint="Needs refresh" /></Card>
        <Card><StatNumber value={health.reduce((s, h) => s + (h.failed_row_count || 0), 0)} sub="failed rows" /></Card>
        <Card><StatNumber value={health.reduce((s, h) => s + (h.accepted_count || 0), 0)} sub="accepted rows" /></Card>
      </div>
      <Section eyebrow="01" title="Feed status">
        <Table columns={["Source", "Type", "Status", "Last import", "Rows", "Warning"]} widths={["1fr", "1fr", "110px", "150px", "110px", "1fr"]}>
          {health.length === 0 && <Row><Cell>No integration health snapshots for this campaign.</Cell><Cell /><Cell /><Cell /><Cell /><Cell /></Row>}
          {health.map(item => (
            <Row key={`${item.source}-${item.import_type}`}>
              <Cell><span className="mono small">{item.source}</span></Cell>
              <Cell>{triggerLabel(item.import_type)}</Cell>
              <Cell><Pill tone={item.status === "completed" ? "olive" : "terracotta"} mono>{triggerLabel(item.status)}</Pill></Cell>
              <Cell><span className="mono small">{item.last_import_at ? String(item.last_import_at).slice(0, 16).replace("T", " ") : "Never"}</span></Cell>
              <Cell><span className="mono small">{item.accepted_count}/{item.row_count}</span></Cell>
              <Cell>{item.is_stale ? <Pill tone="terracotta" mono>Stale</Pill> : <Pill tone="olive" mono>Fresh</Pill>}</Cell>
            </Row>
          ))}
        </Table>
      </Section>
    </div>
  );
}

function AiAssistantsScreen({ campaignId }) {
  const campaign = campaignById(campaignId);
  const [result, setResult] = React.useState(null);
  const [running, setRunning] = React.useState(null);
  const [staged, setStaged] = React.useState(false);
  const scopedReports = D.reports.filter(r => r.campaign_id === campaignId || !r.campaign_id);
  const scopedLearners = campaignData(campaignId).learners;
  const scopedImports = (D.imports || []).filter(i => i.campaign_id === campaignId);
  const scopedNotifications = (D.notifications || []).filter(n => n.campaign_id === campaignId);

  async function run(taskType) {
    if (!LMS_API?.runAiAssistant) return;
    setRunning(taskType);
    setStaged(false);
    try {
      const next = await LMS_API.runAiAssistant(campaignId, taskType, {
        report_id: scopedReports[0]?.id,
        learner_id: scopedLearners[0]?.id,
        import_id: scopedImports[0]?.id,
        notification_id: scopedNotifications[0]?.id,
      });
      setResult(next);
    } finally {
      setRunning(null);
    }
  }

  const tasks = [
    { type: "generate_readiness_brief", label: "Readiness brief", hint: "Uses report preview metrics." },
    { type: "summarize_blockers", label: "Exception summary", hint: "Uses deterministic queue payloads." },
    { type: "draft_escalation", label: "Escalation draft", hint: "Uses in-app notification context." },
    { type: "suggest_learner_match", label: "Learner match", hint: "Suggests only; no identifier writes." },
    { type: "classify_ticket", label: "Import anomaly", hint: "Uses masked validation errors." },
  ];

  return (
    <div className="screen">
      <PageHeader eyebrow="Governed AI" title="Suggestion workspace" sub={`${campaign.name} assistants cite deterministic campaign context and cannot mutate records.`} />
      <div className="card-grid card-grid-2">
        {tasks.map(task => (
          <Card key={task.type} padded>
            <div className="role-head">
              <Pill tone="muted" mono>Suggestion only</Pill>
              <Icon name="spark" size={16} />
            </div>
            <h3 className="role-title">{task.label}</h3>
            <p className="muted small">{task.hint}</p>
            <Button kind="solid" onClick={() => run(task.type)} disabled={running === task.type}>{running === task.type ? "Running" : "Generate"}</Button>
          </Card>
        ))}
      </div>
      {result && (
        <Section eyebrow="01" title="Suggestion result">
          <Card padded>
            <div className="kv-list">
              <KV k="Task" v={<span className="mono">{triggerLabel(result.task_type)}</span>} />
              <KV k="Mutation allowed" v={<Pill tone={result.mutation_allowed ? "terracotta" : "olive"} mono>{String(result.mutation_allowed)}</Pill>} />
              <KV k="Model" v={<span className="mono small">{result.model || "deterministic"}</span>} />
            </div>
            <Rule />
            {(result.suggestions || []).map((suggestion, index) => (
              <div key={index} className="kv-list">
                <KV k="Suggestion" v={suggestion.text} />
                <KV k="Confidence" v={<span className="mono">{Math.round((suggestion.confidence || 0) * 100)}%</span>} />
                <KV k="Citations" v={<span className="mono small">{(suggestion.citations || []).join(", ")}</span>} />
              </div>
            ))}
            <div className="focal-actions">
              <Button kind="ghost" icon="shield" onClick={() => setStaged(true)} disabled={staged}>{staged ? "Staged ✓" : "Stage for review"}</Button>
              {staged && <span className="muted small">Staged for reviewer — no record mutated.</span>}
            </div>
          </Card>
        </Section>
      )}
    </div>
  );
}


export {
  OrgSettingsScreen, PALETTE_OPTIONS, SettingsScreen, NotificationsScreen, TimelineScreen, IntegrationHealthScreen, AiAssistantsScreen,
};
