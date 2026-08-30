// LMS Ops Command Center — home screens.
// Split from screens.jsx (pure code-move); screens.jsx re-exports as a barrel.
import React, { useState } from 'react'
import { LMS_DATA as D } from '../data.js'
import { cls, statusLabel, fmt, fmtDate, Eyebrow, Rule, Pill, Icon, Card, StatNumber, Button, RequirementCover } from '../components.jsx'
import { CampaignAccessNotice, Cell, KV, Metric, PageHeader, Row, Section, Table, campaignById, campaignData, campaignMetrics, isOpenException, openExceptionsForDepartment, departmentNameById, facilityNameById, pct, riskPill } from './_shared.jsx'
import { SessionsScreen } from './sessions.jsx'

function CommandCenterScreen({ onNav, campaignId }) {
  const campaign = campaignById(campaignId);
  const m = campaignMetrics(campaignId);
  const scoped = campaignData(campaignId);
  const critical = scoped.exceptions.filter(e => e.severity === "critical" && isOpenException(e));
  const atRiskDepartments = scoped.departments.filter(d => ["critical", "high"].includes(d.risk));

  return (
    <div className="screen">
      <PageHeader
        eyebrow={`Campaign · ${campaign.status} · ${campaign.phase}`}
        title={<>Command Center</>}
        sub={`${campaign.name} goes live in ${m.daysToGoLive} days. Campaign data is scoped by RBAC and filtered to assigned personnel.`}
        action={<Button kind="solid" iconRight="chev" onClick={() => onNav("reports")}>Export brief</Button>}
      />

      <div className="stat-grid stat-grid-4">
        <Card><StatNumber value={m.daysToGoLive} sub="days to go-live" hint={m.goLiveDate} /></Card>
        <Card><StatNumber value={pct(m.overallReadiness)} sub="overall readiness" hint={`${fmt(m.totalLearners)} assigned learners`} /></Card>
        <Card><StatNumber value={pct(m.criticalRoleReadiness)} sub="critical roles" hint="ED, inpatient, pharmacy, radiology" /></Card>
        <Card><StatNumber value={m.openExceptions} sub="open exceptions" hint={`${critical.length} critical blockers`} /></Card>
      </div>

      <CampaignAccessNotice campaign={campaign} onNav={onNav} />

      <Card className="focal" padded={false}>
        <div className="focal-grid" data-tour="home-focal">
          <div className="cover cover-accent cover-lg" style={{ height: 280 }}>
            <div className="cover-grid" />
            <div className="cover-mark mono">READINESS RISK</div>
            <div className="cover-figure">
              {pct(m.criticalRoleReadiness)}
              <span className="cover-figure-sub">critical-role readiness</span>
            </div>
          </div>
          <div className="focal-body">
            <Eyebrow n={1}>Highest risk today</Eyebrow>
            <h2 className="display-md">{campaign.risk === "low" ? "Campaign is ready for matrix design." : "Highest-risk areas need escalation before launch."}</h2>
            <p className="lead">{campaign.risk === "low" ? "This campaign is still administrative-only: define sites, departments, role mappings, and report templates before inviting broader users." : "The selected campaign has readiness, identity, or scheduling risks that should be worked from the exception queue."}</p>
            <Rule />
            <div className="focal-meta">
              <Metric k="Departments at risk" v={<span className="mono">{m.departmentsAtRisk}</span>} />
              <Metric k="Facilities at risk" v={<span className="mono">{m.facilitiesAtRisk}</span>} />
              <Metric k="Identity mismatches" v={<span className="mono">{m.identityMismatches}</span>} />
              <Metric k="Over-capacity sessions" v={<span className="mono">{m.overCapacitySessions}</span>} />
            </div>
            <div className="focal-actions">
              <Button kind="solid" iconRight="arrow" onClick={() => onNav("exceptions")}>Open exception queue</Button>
              <Button kind="ghost" onClick={() => onNav("readiness")}>Review readiness</Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="two-col">
        <Section eyebrow="01 · Department risk" title="At-risk departments">
          <Card padded={false}>
            <Table columns={["Department", "Facility", "Ready", "Exceptions", "Risk"]} widths={["1.2fr", "1.3fr", "90px", "90px", "100px"]}>
              {atRiskDepartments.map(d => (
                <Row key={d.id}>
                  <Cell><span className="strong">{d.name}</span></Cell>
                  <Cell><span className="muted">{facilityNameById(d.facility_id)}</span></Cell>
                  <Cell><span className="mono">{pct((d.complete / d.required) * 100)}</span></Cell>
                  <Cell><span className="mono">{openExceptionsForDepartment(d.id)}</span></Cell>
                  <Cell>{riskPill(d.risk)}</Cell>
                </Row>
              ))}
            </Table>
          </Card>
        </Section>

        <Section eyebrow="02 · Escalations" title="Critical blockers">
          <Card padded={false} className="queue">
            {critical.length === 0 && (
              <div className="queue-row">
                <Icon name="check" size={18} />
                <div className="queue-main">
                  <div className="queue-title">No critical blockers in this campaign</div>
                  <div className="muted small">Continue building the administrative setup before broad rollout.</div>
                </div>
                <Pill tone="olive" dot>Clear</Pill>
              </div>
            )}
            {critical.map(e => (
              <div key={e.id} className="queue-row">
                <Icon name="flag" size={18} />
                <div className="queue-main">
                  <div className="queue-title">{e.type}</div>
                  <div className="muted small">{departmentNameById(e.department_id)} · owner {e.owner}</div>
                </div>
                <div className="queue-meta mono mono-dim small">{fmtDate(e.due)}</div>
                {riskPill(e.severity)}
              </div>
            ))}
          </Card>
        </Section>
      </div>
    </div>
  );
}


function RoleHomeScreen({ onNav, campaignId }) {
  const campaign = campaignById(campaignId);
  const view = campaign.homeSummary?.default_home_view || "executive_summary";
  if (view === "readiness_lead_queue") {
    // Derive from the same live metrics the command center uses, so re-scoring
    // and import-apply move these cards too (fall back to seeded summary only
    // where no metric exists, e.g. sessions_due).
    const m = campaignMetrics(campaignId);
    return (
      <div className="screen">
        <PageHeader eyebrow="Readiness lead" title="Queue-first campaign home." sub={`${campaign.name}: open blockers, risk drivers, and ready-to-work queues.`} />
        <div className="stat-grid stat-grid-4">
          <Card><StatNumber value={Math.round(m.criticalRoleReadiness)} sub="readiness score" hint="configured scoring" /></Card>
          <Card><StatNumber value={m.openExceptions} sub="open exceptions" hint="queue workload" /></Card>
          <Card><StatNumber value={m.departmentsAtRisk} sub="departments at risk" hint="high or critical" /></Card>
          <Card><StatNumber value={campaign.homeSummary?.cards?.sessions_due ?? 0} sub="sessions" hint="training calendar" /></Card>
        </div>
        <div className="focal-actions">
          <Button kind="solid" iconRight="arrow" onClick={() => onNav("exceptions")}>Open work queue</Button>
          <Button kind="ghost" onClick={() => onNav("imports")}>Review imports</Button>
          <Button kind="ghost" onClick={() => onNav("writebacks")}>Review write-backs</Button>
        </div>
      </div>
    );
  }
  if (view === "analyst_import_reconciliation") {
    return (
      <div className="screen">
        <PageHeader eyebrow="Analyst" title="Import and reconciliation home." sub={`${campaign.name}: validate source files, row errors, identity mismatches, and scoring inputs.`} />
        <div className="focal-actions">
          <Button kind="solid" iconRight="arrow" onClick={() => onNav("imports")}>Open import wizard</Button>
          <Button kind="ghost" onClick={() => onNav("scoring")}>Tune scoring</Button>
          <Button kind="ghost" onClick={() => onNav("reports")}>Preview reports</Button>
        </div>
      </div>
    );
  }
  if (view === "manager_team_followup") {
    return (
      <div className="screen">
        <PageHeader eyebrow="Manager" title="Team follow-up home." sub={`${campaign.name}: department risk, learner follow-up, and exception ownership.`} />
        <div className="focal-actions">
          <Button kind="solid" iconRight="arrow" onClick={() => onNav("departments")}>Review departments</Button>
          <Button kind="ghost" onClick={() => onNav("learners")}>Open learners</Button>
        </div>
      </div>
    );
  }
  return <CommandCenterScreen onNav={onNav} campaignId={campaignId} />;
}


function LearnerHomeScreen({ me, onNav, campaignId }) {
  const scoped = campaignData(campaignId);
  const learnerName = me ? `${me.first_name} ${me.last_name}` : "";
  const learner = scoped.learners.find(l => l.name === learnerName) || scoped.learners[0] || D.learners[0];
  const requirement = scoped.requirements[0] || D.trainingRequirements[0];
  if (!learner) {
    return (
      <div className="screen">
        <PageHeader eyebrow="Required Training" title="No learner profile linked." sub="The current user does not have a learner record in this campaign yet." />
        <Card><p className="muted">Import or link a roster record to show learner readiness.</p></Card>
      </div>
    );
  }
  return (
    <div className="screen">
      <PageHeader eyebrow="Required Training" title={<>Your go-live readiness, <em>{me?.first_name || "Learner"}.</em></>} sub="A learner-facing view of assigned training, account status, and remaining blockers." />
      <Card className="focal" padded={false}>
        <div className="focal-grid">
          <RequirementCover requirement={requirement} size="lg" />
          <div className="focal-body">
            <Eyebrow n={1}>Current assignment</Eyebrow>
            <h2 className="display-md">{learner.role || learner.job_role || "Assigned training"}</h2>
            <p className="lead">Your current completion is {pct(learner.completion)}. Account reconciliation status is shown below.</p>
            <Rule />
            <div className="focal-meta">
              <Metric k="Department" v={departmentNameById(learner.department_id)} />
              <Metric k="Facility" v={facilityNameById(learner.facility_id)} />
              <Metric k="LMS account" v={statusLabel(learner.lms)} />
              <Metric k="Epic ID" v={statusLabel(learner.epic_id)} />
            </div>
            <div className="focal-actions">
              <Button kind="solid" iconRight="arrow" onClick={() => onNav("learners")}>View my record</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function TrainerHomeScreen({ me, onNav, campaignId }) {
  const scoped = campaignData(campaignId);
  const mySessions = scoped.sessions.filter(s => s.trainer_id === me.id);
  const risky = mySessions.filter(s => s.risk !== "low");
  return (
    <div className="screen">
      <PageHeader eyebrow="Trainer Dashboard" title={<>Session operations, <em>{me.first_name}.</em></>} sub={`${mySessions.length} sessions assigned · ${risky.length} need attention.`} />
      <div className="stat-grid stat-grid-4">
        <Card><StatNumber value={mySessions.length} sub="assigned sessions" /></Card>
        <Card><StatNumber value={risky.length} sub="flagged sessions" /></Card>
        <Card><StatNumber value={mySessions.reduce((s, x) => s + x.registered, 0)} sub="registered learners" /></Card>
        <Card><StatNumber value={mySessions.reduce((s, x) => s + Math.max(0, x.registered - x.capacity), 0)} sub="over capacity" /></Card>
      </div>
      <SessionsScreen me={me} role="trainer" campaignId={campaignId} />
    </div>
  );
}

function DemoWalkthroughScreen({ campaignId, onNav }) {
  const campaign = campaignById(campaignId);
  const steps = (D.demoWalkthrough || []).sort((a, b) => a.order - b.order);
  const [activeId, setActiveId] = React.useState(steps[0]?.id);
  const active = steps.find(s => s.id === activeId) || steps[0];

  return (
    <div className="screen">
      <PageHeader
        eyebrow="Guided demo"
        title="A buyer-ready walkthrough."
        sub={`${campaign.name}: use this screen as the talk track for why the product exists, what it governs, and how a messy campaign becomes launch-ready.`}
        action={<Button kind="solid" icon="play" onClick={() => onNav(active?.route || "home")}>Open current stop</Button>}
      />
      <Card className="demo-hero" padded={false}>
        <div className="demo-hero-main">
          <Eyebrow n={1}>Storyline</Eyebrow>
          <h2 className="display-md">Campaign readiness becomes a governed operating system, not a spreadsheet chase.</h2>
          <p className="lead">The demo carries the conversation from market positioning to setup governance, messy source data, coordinator workflows, and deployment confidence.</p>
          <div className="focal-actions">
            <Button kind="solid" iconRight="arrow" onClick={() => onNav("scenarios")}>Start with scenario packs</Button>
            <Button kind="ghost" onClick={() => onNav("setup")}>Review launch gate</Button>
          </div>
        </div>
        <div className="demo-hero-aside">
          <Metric k="Stops" v={<span className="mono">{steps.length}</span>} />
          <Metric k="Current campaign" v={campaign.name} />
          <Metric k="Proof depth" v={<span className="mono">setup + catalog + ops</span>} />
        </div>
      </Card>
      <div className="walkthrough-grid">
        <Card padded={false}>
          <div className="walkthrough-list">
            {steps.map(step => (
              <button key={step.id} className={cls("walkthrough-step", active?.id === step.id && "walkthrough-step-on")} onClick={() => setActiveId(step.id)}>
                <span className="walkthrough-num mono">{String(step.order).padStart(2, "0")}</span>
                <span>
                  <span className="strong">{step.title}</span>
                  <span className="muted small">{step.persona}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <Eyebrow n={2}>Talk track</Eyebrow>
          <h2 className="display-sm">{active?.title}</h2>
          <Rule />
          <div className="kv-list">
            <KV k="Audience" v={active?.persona} />
            <KV k="Point" v={active?.point} />
            <KV k="Proof" v={active?.proof} />
            <KV k="Route" v={<span className="mono small">#{active?.route}</span>} />
          </div>
          <div className="focal-actions">
            <Button kind="solid" iconRight="arrow" onClick={() => onNav(active?.route)}>Open this screen</Button>
            <Button kind="ghost" onClick={() => onNav("org-settings")}>Deployment settings</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ScenarioPacksScreen({ onNav }) {
  const packs = D.scenarioPacks || [];
  const templates = D.campaignTemplates || [];
  return (
    <div className="screen">
      <PageHeader
        eyebrow="Scenario packs"
        title="Epic go-live is one template."
        sub="Campaigns share the same readiness engine, but each scenario pack changes terminology, scoring, reports, requirements, and buyer story."
      />
      <div className="stat-grid stat-grid-4">
        <Card><StatNumber value={packs.length} sub="scenario packs" hint="Demo-ready and concept packs" /></Card>
        <Card><StatNumber value={templates.length} sub="templates" hint="Reusable setup profiles" /></Card>
        <Card><StatNumber value={packs.filter(p => p.status === "active").length} sub="active pack" hint="POI surface" /></Card>
        <Card><StatNumber value="1" sub="adaptive engine" hint="Multiple campaign types" /></Card>
      </div>
      <div className="scenario-grid">
        {packs.map(pack => {
          const template = templates.find(t => t.id === pack.template_id);
          return (
            <Card key={pack.id} className="scenario-card">
              <div className="role-head">
                <Pill tone={pack.status === "active" ? "olive" : pack.status === "planning" ? "ochre" : "muted"} mono>{pack.status}</Pill>
                <span className="mono small">{pack.industry}</span>
              </div>
              <h3 className="role-title">{pack.name}</h3>
              <p className="muted small">{pack.best_for}</p>
              <Rule />
              <div className="kv-list">
                <KV k="Launch label" v={template?.terminology?.launch_label || "Launch"} />
                <KV k="Learner label" v={template?.terminology?.learner_label || "Learner"} />
                <KV k="Buyer signal" v={pack.buyer_signal} />
              </div>
              <div className="focal-actions">
                <Button kind="ghost" iconRight="chev" onClick={() => onNav("setup")}>View setup gates</Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


export {
  CommandCenterScreen, RoleHomeScreen, LearnerHomeScreen, TrainerHomeScreen, DemoWalkthroughScreen, ScenarioPacksScreen,
};
