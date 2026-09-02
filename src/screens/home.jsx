// LMS Ops Command Center — home screens.
// Split from screens.jsx (pure code-move); screens.jsx re-exports as a barrel.
import React, { useState } from 'react'
import { LMS_DATA as D } from '../data.js'
import { cls, statusTone, statusLabel, fmt, fmtDate, Eyebrow, Rule, Pill, Icon, Card, StatNumber, Button, RequirementCover } from '../components.jsx'
import { CampaignAccessNotice, Cell, KV, Metric, PageHeader, Row, Section, Table, campaignById, campaignData, campaignMetrics, campaignSetupSummary, campaignTemplate, campaignTerms, isOpenException, openExceptionsForDepartment, departmentNameById, facilityNameById, pct, riskPill, setupSectionsForCampaign, teamForOwner, triggerLabel } from './_shared.jsx'
import { isStuckLearner, stuckThresholdMinutes } from '../compliance.js'
import { SessionsScreen } from './sessions.jsx'

function CommandCenterScreen({ onNav, campaignId }) {
  const campaign = campaignById(campaignId);
  const template = campaignTemplate(campaignId);
  const terms = campaignTerms(campaignId);
  const m = campaignMetrics(campaignId);
  const scoped = campaignData(campaignId);
  const critical = scoped.exceptions.filter(e => e.severity === "critical" && isOpenException(e));
  const atRiskDepartments = scoped.departments.filter(d => ["critical", "high"].includes(d.risk));

  return (
    <div className="screen">
      <PageHeader
        eyebrow={`${template?.name || "Campaign"} · ${campaign.status} · ${campaign.phase}`}
        title={<>Command Center</>}
        sub={`${campaign.name} reaches ${terms.launch_label.toLowerCase()} in ${m.daysToGoLive} days. Campaign data is scoped by RBAC and filtered to assigned personnel.`}
        action={<Button kind="solid" iconRight="chev" onClick={() => onNav("reports")}>Export brief</Button>}
      />

      <div className="stat-grid stat-grid-4">
        <Card><StatNumber value={m.daysToGoLive} sub={`days to ${terms.launch_label.toLowerCase()}`} hint={m.goLiveDate} /></Card>
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


// Per-campaign home shape. Each campaign's homeSummary configures WHICH layout
// the lead lands on (default_home_view) and the viewer's role IN that campaign
// (user_campaign_role) — so switching campaigns changes the home's shape, not
// just its numbers. Layouts derive from the same live records their target
// screens use; nothing here is a second copy of a count.
function RoleHomeScreen({ onNav, campaignId }) {
  const campaign = campaignById(campaignId);
  const view = campaign.homeSummary?.default_home_view || "executive_summary";
  const roleLabel = triggerLabel(campaign.homeSummary?.user_campaign_role || "campaign member");
  if (view === "readiness_lead_queue") {
    // Derive from the same live metrics the command center uses, so re-scoring
    // and import-apply move these cards too (fall back to seeded summary only
    // where no metric exists, e.g. sessions_due).
    const m = campaignMetrics(campaignId);
    return (
      <div className="screen">
        <PageHeader eyebrow={roleLabel} title="Queue-first campaign home." sub={`${campaign.name}: open blockers, risk drivers, and ready-to-work queues.`} />
        <div className="stat-grid stat-grid-4">
          <Card><StatNumber value={Math.round(m.criticalRoleReadiness)} sub="readiness score" hint="configured scoring" /></Card>
          <Card><StatNumber value={m.openExceptions} sub="open exceptions" hint="queue workload" /></Card>
          <Card><StatNumber value={m.departmentsAtRisk} sub="departments at risk" hint="high or critical" /></Card>
          <Card><StatNumber value={campaign.homeSummary?.cards?.sessions_due ?? 0} sub="sessions" hint="training calendar" /></Card>
        </div>
        <div className="focal-actions">
          <Button kind="solid" iconRight="arrow" onClick={() => onNav("exceptions")}>Open work queue</Button>
          {/* Workstation surfaces aren't advertised on the phone companion. */}
          <span className="mobile-hide"><Button kind="ghost" onClick={() => onNav("imports")}>Review imports</Button></span>
          <span className="mobile-hide"><Button kind="ghost" onClick={() => onNav("writebacks")}>Review write-backs</Button></span>
        </div>
      </div>
    );
  }
  if (view === "analyst_import_reconciliation") {
    // Intake-first home: this campaign's configured shape is roster intake, so
    // the home leads with intake state — launch gate, role mappings, and the
    // import cadence — from the same records the setup/catalog/health screens read.
    const terms = campaignTerms(campaignId);
    const m = campaignMetrics(campaignId);
    const setup = campaignSetupSummary(campaignId);
    const roleMappings = (D.catalogEntities?.roles || []).filter(r => r.campaign_id === campaignId);
    const mappingsToReview = roleMappings.filter(r => ["needs_review", "blocked"].includes(r.status)).length;
    const pendingFeeds = (D.integrationHealth || []).filter(i => i.campaign_id === campaignId && i.status !== "completed").length;
    return (
      <div className="screen">
        <PageHeader eyebrow={roleLabel} title="Import and reconciliation home." sub={`${campaign.name}: validate source files, row errors, identity mismatches, and scoring inputs.`} />
        <div className="stat-grid stat-grid-4">
          <Card><StatNumber value={m.daysToGoLive} sub={`days to ${terms.launch_label.toLowerCase()}`} hint={m.goLiveDate} /></Card>
          <Card><StatNumber value={`${setup.approved}/${setup.total}`} sub="setup sections approved" hint={setup.blocked ? `${setup.blocked} blocked` : "launch gate"} /></Card>
          <Card><StatNumber value={mappingsToReview} sub="role mappings to review" hint={`${roleMappings.length} mapped ${roleMappings.length === 1 ? "role" : "roles"}`} /></Card>
          <Card><StatNumber value={pendingFeeds} sub="pending import feeds" hint="manual CSV cadence" /></Card>
        </div>
        <div className="focal-actions">
          {/* The wizard and scoring are workstation surfaces — not advertised
              on the phone companion, where the launch gate leads instead. */}
          <span className="mobile-hide"><Button kind="solid" iconRight="arrow" onClick={() => onNav("imports")}>Open import wizard</Button></span>
          <Button kind="ghost" onClick={() => onNav("setup")}>Review launch gate</Button>
          <span className="mobile-hide"><Button kind="ghost" onClick={() => onNav("scoring")}>Tune scoring</Button></span>
          <Button kind="ghost" onClick={() => onNav("reports")}>Preview reports</Button>
        </div>
      </div>
    );
  }
  if (view === "compliance_completion") {
    // The compliance operation: per-assignee completion against a deadline,
    // with the signature stuck rule ("> threshold minutes in course, not
    // completed", src/compliance.js) derived live — this table, the stat card,
    // and the exception queue all read the same records.
    const terms = campaignTerms(campaignId);
    const m = campaignMetrics(campaignId);
    const scoped = campaignData(campaignId);
    const threshold = stuckThresholdMinutes(campaign, campaignTemplate(campaignId));
    const assignees = scoped.learners;
    const stuck = assignees.filter(l => isStuckLearner(l, threshold));
    const learnerWord = terms.learner_label.toLowerCase();
    return (
      <div className="screen">
        <PageHeader
          eyebrow={roleLabel}
          title="Compliance completion home."
          sub={`${campaign.name}: per-${learnerWord} completion against the ${terms.launch_label.toLowerCase()}. ${terms.learner_label}s past ${threshold} minutes in a course without completing are flagged as stuck and escalated.`}
        />
        <div className="stat-grid stat-grid-4">
          <Card><StatNumber value={m.daysToGoLive} sub={`days to ${terms.launch_label.toLowerCase()}`} hint={m.goLiveDate} /></Card>
          <Card><StatNumber value={pct(m.overallReadiness)} sub="completion" hint={`${fmt(m.totalLearners)} ${learnerWord}s assigned`} /></Card>
          <Card><StatNumber value={stuck.length} sub={`stuck ${learnerWord}s`} hint={`> ${threshold} min, not completed`} /></Card>
          <Card><StatNumber value={m.openExceptions} sub="open exceptions" hint="escalation queue" /></Card>
        </div>
        <Section eyebrow="01 · Completion watch" title={`${terms.learner_label} completion and stuck flags`}>
          <Card padded={false}>
            <Table columns={[terms.learner_label, "Division", "Completion", "Time in course", "Status"]} widths={["1.3fr", "1.2fr", "110px", "130px", "140px"]}>
              {assignees.length === 0 && (
                <Row><Cell>{`No ${learnerWord}s in this campaign yet — import the assignment population to start completion tracking.`}</Cell><Cell /><Cell /><Cell /><Cell /></Row>
              )}
              {assignees.map(l => {
                const flagged = isStuckLearner(l, threshold);
                return (
                  <Row key={l.id}>
                    <Cell><span className="strong">{l.name}</span><div className="muted small">{l.role}</div></Cell>
                    <Cell><span className="muted">{departmentNameById(l.department_id)}</span></Cell>
                    <Cell><span className="mono">{pct(l.completion)}</span></Cell>
                    <Cell><span className="mono">{l.time_in_course_minutes ?? 0} min</span></Cell>
                    <Cell>{flagged
                      ? <Pill tone={statusTone("blocked")} dot block>Stuck</Pill>
                      : <Pill tone={statusTone(l.status)} dot block>{statusLabel(l.status)}</Pill>}</Cell>
                  </Row>
                );
              })}
            </Table>
          </Card>
        </Section>
        <div className="focal-actions">
          <Button kind="solid" iconRight="arrow" onClick={() => onNav("exceptions")}>Open exception queue</Button>
          <Button kind="ghost" onClick={() => onNav("setup")}>Review detection setup</Button>
          <Button kind="ghost" onClick={() => onNav("reports")}>View reports</Button>
        </div>
      </div>
    );
  }
  if (view === "manager_team_followup") {
    // Follow-up-first home: early-phase work is chasing section owners, so the
    // home leads with the owner checklist from the setup gate records.
    const setup = campaignSetupSummary(campaignId);
    const sections = setupSectionsForCampaign(campaignId);
    const scoped = campaignData(campaignId);
    return (
      <div className="screen">
        <PageHeader eyebrow={roleLabel} title="Team follow-up home." sub={`${campaign.name}: owner follow-up, department risk, and exception ownership.`} />
        <div className="stat-grid stat-grid-4">
          <Card><StatNumber value={`${setup.approved}/${setup.total}`} sub="setup sections approved" hint="launch gate" /></Card>
          <Card><StatNumber value={setup.blocked} sub="blocked sections" hint="owner follow-up needed" /></Card>
          <Card><StatNumber value={scoped.departments.length} sub="departments loaded" hint="population intake" /></Card>
          <Card><StatNumber value={scoped.requirements.length} sub="requirements drafted" hint="course and role matrix" /></Card>
        </div>
        <Section eyebrow="01 · Owner follow-up" title="Setup sections by owner">
          <Card padded={false}>
            <Table columns={["Section", "Owner", "Team", "Status", "Due"]} widths={["1.3fr", "0.9fr", "1fr", "150px", "110px"]}>
              {sections.map(section => (
                <Row key={section.id}>
                  <Cell><span className="strong">{section.section}</span></Cell>
                  <Cell>{section.owner}</Cell>
                  <Cell><span className="muted">{teamForOwner(campaignId, section.owner)?.name || "—"}</span></Cell>
                  <Cell><Pill tone={statusTone(section.status)} dot block>{statusLabel(section.status)}</Pill></Cell>
                  <Cell><span className="mono small">{fmtDate(section.due)}</span></Cell>
                </Row>
              ))}
            </Table>
          </Card>
        </Section>
        <div className="focal-actions">
          <Button kind="solid" iconRight="arrow" onClick={() => onNav("setup")}>Open setup gate</Button>
          <Button kind="ghost" onClick={() => onNav("departments")}>Review departments</Button>
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
      <PageHeader eyebrow="Required Training" title={<>Your go-live readiness, <em>{me ? `${me.first_name} ${me.last_name}` : "Learner"}.</em></>} sub="A learner-facing view of assigned training, account status, and remaining blockers." />
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
      <PageHeader eyebrow="Trainer Dashboard" title={<>Session operations, <em>{me.first_name} {me.last_name}.</em></>} sub={`${mySessions.length} sessions assigned · ${risky.length} need attention.`} />
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
            <span className="mobile-hide"><Button kind="ghost" onClick={() => onNav("org-settings")}>Deployment settings</Button></span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ScenarioPacksScreen({ onNav, setCampaignId }) {
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
        <Card><StatNumber value={packs.filter(p => p.status === "active").length} sub="active packs" hint="Live demo campaigns" /></Card>
        <Card><StatNumber value="1" sub="adaptive engine" hint="Multiple campaign types" /></Card>
      </div>
      <div className="scenario-grid">
        {packs.map(pack => {
          const template = templates.find(t => t.id === pack.template_id);
          // demo_campaign_id is live navigation: a pack with a demo campaign
          // opens THAT campaign's home — its own template, terminology, and
          // home layout. Concept packs have none, and honestly say so.
          const demoCampaign = (D.campaigns || []).find(c => c.id === pack.demo_campaign_id);
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
                <KV k="Demo campaign" v={demoCampaign?.name || "Concept — not yet built"} />
                <KV k="Buyer signal" v={pack.buyer_signal} />
              </div>
              <div className="focal-actions">
                {demoCampaign && setCampaignId && (
                  <Button kind="solid" iconRight="arrow" onClick={() => { setCampaignId(demoCampaign.id); onNav("home"); }}>Open demo campaign</Button>
                )}
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
