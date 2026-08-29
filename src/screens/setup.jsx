// LMS Ops Command Center — setup screens.
// Split from screens.jsx (pure code-move); screens.jsx re-exports as a barrel.
import React, { useState } from 'react'
import { LMS_DATA as D } from '../data.js'
import * as LMS_API from '../api-client.js'
import { statusTone, statusLabel, fmtDate, Eyebrow, Rule, Pill, Card, StatNumber, Button } from '../components.jsx'
import { isoFromToday } from '../dates.js'
import { Cell, KV, PageHeader, Row, Section, Table, campaignById, campaignSetupSummary, riskPill, setupSectionsForCampaign } from './_shared.jsx'

function CampaignSetupScreen({ campaignId }) {
  const campaign = campaignById(campaignId);
  const sections = setupSectionsForCampaign(campaignId);
  const summary = campaignSetupSummary(campaignId);
  const launchReady = summary.total > 0 && summary.approved === summary.total;
  const nextSection =
    sections.find(s => s.status === "blocked") ||
    sections.find(s => s.status === "needs_review") ||
    sections.find(s => s.status === "in_progress") ||
    sections.find(s => s.status === "not_started") ||
    sections[0];

  return (
    <div className="screen">
      <PageHeader
        eyebrow="Campaign setup"
        title="Launch gate and signoff."
        sub={`${campaign.name}: setup sections must be reviewed before the campaign dashboard becomes launch-ready truth.`}
      />

      <div className="stat-grid stat-grid-4">
        <Card><StatNumber value={summary.approved} sub="approved" hint={`${summary.total} setup sections`} /></Card>
        <Card><StatNumber value={summary.review} sub="needs review" hint="Owner signoff required" /></Card>
        <Card><StatNumber value={summary.blocked} sub="blocked" hint="Must clear before launch" /></Card>
        <Card><StatNumber value={summary.inProgress} sub="in progress" hint="Still being configured" /></Card>
      </div>

      <div className="two-col">
        <Card>
          <Eyebrow n={1}>Gate status</Eyebrow>
          <h2 className="display-sm">{launchReady ? "Ready for launch approval." : "Not ready for launch approval."}</h2>
          <p className="muted small">
            {launchReady
              ? "All setup sections are approved. Final launch approval can be staged."
              : "The campaign can be reviewed, but unresolved setup sections should block final launch approval."}
          </p>
          <Rule />
          <div className="kv-list">
            <KV k="Campaign phase" v={campaign.phase} />
            <KV k="Risk" v={riskPill(campaign.risk)} />
            <KV k="Next setup item" v={nextSection?.section || "No setup sections"} />
            <KV k="Owner" v={nextSection?.owner || "Unassigned"} />
            <KV k="Status" v={nextSection ? <Pill tone={statusTone(nextSection.status)} dot block>{statusLabel(nextSection.status)}</Pill> : "—"} />
          </div>
        </Card>

        <Card>
          <Eyebrow n={2}>Launch control</Eyebrow>
          <h2 className="display-sm">Approval remains governed.</h2>
          <p className="muted small">This POI screen shows the required sections and signoff state. It does not mutate campaign status or source systems.</p>
          <Rule />
          <div className="kv-list">
            <KV k="Write-back" v="Staged approval only" />
            <KV k="Audit" v="Owner, status, evidence, due date" />
            <KV k="Dashboard trust" v={launchReady ? "Launch-ready" : "Pre-launch review"} />
          </div>
        </Card>
      </div>

      <Section eyebrow="03" title="Setup checklist">
        <Card padded={false}>
          <Table columns={["Section", "Owner", "Status", "Evidence", "Due"]} widths={["1.2fr", "1fr", "130px", "1.7fr", "110px"]}>
            {sections.map(section => (
              <Row key={section.id}>
                <Cell><span className="strong">{section.section}</span><div className="muted small">Signoff · {section.signoff || "pending"}</div></Cell>
                <Cell>{section.owner}</Cell>
                <Cell><Pill tone={statusTone(section.status)} dot block>{statusLabel(section.status)}</Pill></Cell>
                <Cell><span className="muted">{section.evidence}</span></Cell>
                <Cell><span className="mono small">{fmtDate(section.due)}</span></Cell>
              </Row>
            ))}
          </Table>
        </Card>
      </Section>
    </div>
  );
}


function CampaignCreateScreen({ setView, setCampaignId, onDataChanged }) {
  const templates = D.campaignTemplates || [];
  const [templateId, setTemplateId] = useState(templates[0]?.id);
  const active = templates.find(t => t.id === templateId) || templates[0];
  const [name, setName] = useState("New Readiness Campaign");
  const [slug, setSlug] = useState("new-readiness-campaign");
  const [status, setStatus] = useState("planning");
  const [goLiveAt, setGoLiveAt] = useState(isoFromToday(90));
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  async function createFromTemplate() {
    setWorking(true);
    setMessage("");
    try {
      const created = await LMS_API.createCampaignFromTemplate(active.id, {
        name,
        slug,
        status,
        go_live_at: goLiveAt ? `${goLiveAt}T12:00:00Z` : null,
      });
      setCampaignId(created.id);
      onDataChanged?.();
      setView("home");
    } catch (err) {
      setMessage(`Create failed: ${err.message}`);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="screen">
      <PageHeader eyebrow="Campaign templates" title="Start from a scenario pack." sub="Reusable templates bring default terminology, reports, scoring profile, and starter requirements into the new campaign." />
      {message && <Pill tone="red">{message}</Pill>}
      <div className="two-col">
        <Card padded={false}>
          <Table columns={["Template", "Scenario", "Reports", "Requirements"]} widths={["1.3fr", "1fr", "90px", "110px"]}>
            {templates.map(template => (
              <Row key={template.id}>
                <Cell><button className="linkbtn strong" onClick={() => setTemplateId(template.id)}>{template.name}</button><div className="muted small">{template.description}</div></Cell>
                <Cell><span className="mono">{template.scenario_type}</span></Cell>
                <Cell><span className="mono">{template.default_reports?.length || 0}</span></Cell>
                <Cell><span className="mono">{template.requirements?.length || 0}</span></Cell>
              </Row>
            ))}
          </Table>
        </Card>
        <Card>
          <Eyebrow n={8}>Create campaign</Eyebrow>
          <h2 className="display-sm">{active?.name || "Template"}</h2>
          <p className="muted small">{active?.terminology?.launch_label || "Launch"} terminology · {active?.scoring_profile?.completion_threshold || 0}% completion threshold</p>
          <Rule />
          <div className="form-grid">
            <label className="field field-wide">
              <span className="field-label mono">Campaign name</span>
              <input value={name} onChange={e => setName(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label mono">Slug</span>
              <input value={slug} onChange={e => setSlug(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label mono">Status</span>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </label>
            <label className="field field-wide">
              <span className="field-label mono">{active?.terminology?.launch_label || "Launch"} date</span>
              <input type="date" value={goLiveAt} onChange={e => setGoLiveAt(e.target.value)} />
            </label>
          </div>
          <Rule />
          <div className="kv-list">
            <KV k="Terminology" v={Object.values(active?.terminology || {}).join(", ")} />
            <KV k="Default reports" v={(active?.default_reports || []).map(r => r.title).join(", ")} />
            <KV k="Starter requirements" v={(active?.requirements || []).map(r => r.requirement_name).join(", ")} />
          </div>
          <div className="focal-actions">
            <Button kind="solid" iconRight="arrow" disabled={working || !active || !name || !slug} onClick={createFromTemplate}>Create campaign</Button>
            <Button kind="ghost" onClick={() => setView("home")}>Cancel</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}


export {
  CampaignSetupScreen, CampaignCreateScreen,
};
