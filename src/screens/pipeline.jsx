// LMS Ops Command Center — pipeline screens.
// Split from screens.jsx (pure code-move); screens.jsx re-exports as a barrel.
import React, { useState, useEffect } from 'react'
import { LMS_DATA as D } from '../data.js'
import * as LMS_API from '../api-client.js'
import { statusTone, statusLabel, fmtDate, Eyebrow, Rule, Pill, Card, StatNumber, Button, Tabs } from '../components.jsx'
import { Cell, KV, PageHeader, Row, Section, Table, campaignById, computeReadiness, pct, riskPill, triggerLabel } from './_shared.jsx'

function ImportsScreen({ campaignId, onDataChanged }) {
  const campaign = campaignById(campaignId);
  const [step, setStep] = useState("upload");
  const [importType, setImportType] = useState("roster");
  const [filename, setFilename] = useState("manual-roster.csv");
  const [content, setContent] = useState("employee_id,email,first_name,last_name,job_role,api_token\nE-1001,jane@example.com,Jane,Example,Inpatient RN,secret-token\nE-1002,lee@example.com,Lee,Example,Pharmacist,secret-token\n,dana@example.com,Dana,Rivas,Emergency RN,secret-token\n");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [rowErrors, setRowErrors] = useState([]);
  const [message, setMessage] = useState("");
  const imports = (D.imports || []).filter(i => i.campaign_id === campaignId);
  const activeImport = result || preview || imports[0];
  const headers = activeImport?.preview?.headers || [];
  const rows = activeImport?.preview?.rows || [];
  const summary = activeImport?.preview?.summary || {};
  const errors = rowErrors.length ? rowErrors : (activeImport?.preview?.errors || []);
  const suggestedCustomFields = summary.suggested_custom_fields || [];

  async function runPreview() {
    setMessage("");
    const created = await LMS_API.createImport(campaignId, {
      provider: "manual_csv",
      import_type: importType,
      filename,
      content,
      preview_only: true,
      metadata: { submitted_via: "import_wizard" },
    });
    setPreview(created);
    setResult(null);
    setRowErrors(created.preview?.errors || []);
    setStep("preview");
    onDataChanged();
  }

  async function runApply() {
    setMessage("");
    const applied = await LMS_API.createImport(campaignId, {
      provider: "manual_csv",
      import_type: importType,
      filename,
      content,
      preview_only: false,
      metadata: { submitted_via: "import_wizard", preview_import_id: preview?.id },
    });
    const errors = await LMS_API.listImportRowErrors(campaignId, applied.id);
    setResult(applied);
    setRowErrors(errors);
    setStep("results");
    setMessage("Import applied. Review accepted rows and row errors below.");
    onDataChanged();
  }

  return (
    <div className="screen">
      <PageHeader
        eyebrow="Imports"
        title="Import wizard and validation review."
        sub={`${campaign.name}: upload CSV data, confirm mappings, preview masked validation results, then apply accepted rows.`}
      />

      <div className="stat-grid stat-grid-4">
        <Card><StatNumber value={summary.row_count ?? 0} sub="rows in file" hint={activeImport?.filename || filename} /></Card>
        <Card><StatNumber value={summary.accepted_count ?? 0} sub="accepted rows" hint={statusLabel(activeImport?.status || "draft")} /></Card>
        <Card><StatNumber value={summary.error_count ?? 0} sub="row errors" hint="Review before apply" /></Card>
        <Card><StatNumber value={(summary.sensitive_columns_masked || []).length} sub="masked columns" hint={(summary.sensitive_columns_masked || []).join(", ") || "None detected"} /></Card>
      </div>

      <Tabs
        active={step}
        onChange={setStep}
        tabs={[
          { id: "upload", label: "Upload" },
          { id: "map", label: "Map", count: headers.length || null },
          { id: "preview", label: "Preview", count: rows.length || null },
          { id: "results", label: "Results", count: errors.length || null },
        ]}
      />

      {step === "upload" && (
        <Section eyebrow="01 · Upload" title="Manual CSV remains the default intake path.">
          <div className="two-col">
            <Card>
              <div className="form-grid">
                <label className="field">
                  <span className="field-label mono">Import type</span>
                  <select value={importType} onChange={e => setImportType(e.target.value)}>
                    <option value="roster">Roster</option>
                    <option value="training_matrix">Training matrix</option>
                    <option value="completion_report">Completion report</option>
                    <option value="session_schedule">Session schedule</option>
                    <option value="exception_list">Exception list</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label mono">Filename</span>
                  <input value={filename} onChange={e => setFilename(e.target.value)} />
                </label>
                <label className="field field-wide">
                  <span className="field-label mono">CSV content</span>
                  <textarea rows="10" value={content} onChange={e => setContent(e.target.value)} />
                </label>
              </div>
              <div className="focal-actions">
                <Button kind="solid" iconRight="arrow" onClick={runPreview} disabled={!filename || !content}>Preview import</Button>
                <Button kind="ghost" onClick={() => setStep("map")}>Review mapping</Button>
              </div>
            </Card>
            <Card>
              <Eyebrow n={2}>Recent imports</Eyebrow>
              <Rule />
              <div className="kv-list">
                {imports.slice(0, 5).map(item => (
                  <KV key={item.id} k={item.filename} v={<Pill tone={statusTone(item.status)} block>{statusLabel(item.status)}</Pill>} />
                ))}
              </div>
            </Card>
          </div>
        </Section>
      )}

      {step === "map" && (
        <Section eyebrow="02 · Map" title="Column mapping preview.">
          <Card padded={false}>
            <Table columns={["Source column", "Mapped field", "Handling"]} widths={["1fr", "1fr", "1fr"]}>
              {(headers.length ? headers : String(content).split(/\r?\n/)[0].split(",").filter(Boolean)).map(header => {
                const clean = String(header).trim();
                const normalized = clean.toLowerCase().replace(/[^a-z0-9]+/g, "_");
                const suggestion = suggestedCustomFields.find(field => field.source_column === clean || field.key === normalized);
                const sensitive = /password|secret|token|api_key|private_key/i.test(clean);
                return (
                  <Row key={clean}>
                    <Cell><span className="strong">{clean}</span></Cell>
                    <Cell><span className="mono">{suggestion ? suggestion.key : normalized}</span></Cell>
                    <Cell>
                      {sensitive
                        ? <Pill tone="red" dot>Masked in preview</Pill>
                        : suggestion
                          ? <Pill tone="olive" dot>Org custom field · {triggerLabel(suggestion.entity_type)}</Pill>
                          : <Pill tone="muted" dot>Standard field</Pill>}
                    </Cell>
                  </Row>
                );
              })}
            </Table>
          </Card>
          <div className="focal-actions">
            <Button kind="solid" iconRight="arrow" onClick={runPreview}>Generate preview</Button>
            <Button kind="ghost" onClick={() => setStep("upload")}>Back</Button>
          </div>
        </Section>
      )}

      {(step === "preview" || step === "results") && (
        <Section eyebrow={step === "preview" ? "03 · Preview" : "05 · Results"} title={step === "preview" ? "Validation table." : "Applied import results."}>
          {message && <Card className="campaign-notice"><Pill tone="olive" dot>{message}</Pill></Card>}
          <Card padded={false}>
            <Table columns={headers.length ? headers : ["No rows"]} widths={(headers.length ? headers : ["No rows"]).map(() => "1fr")}>
              {rows.slice(0, 12).map((row, idx) => (
                <Row key={`${activeImport?.id || "preview"}-${idx}`}>
                  {(headers.length ? headers : Object.keys(row)).map(header => (
                    <Cell key={header}>
                      <span className={row[header] === "[redacted]" ? "mono mono-dim" : ""}>{row[header] || "—"}</span>
                    </Cell>
                  ))}
                </Row>
              ))}
            </Table>
          </Card>

          <div className="two-col">
            <Card>
              <Eyebrow n={4}>Mapped entities</Eyebrow>
              <Rule />
              <div className="kv-list">
                {Object.entries(summary.mapped_entity_counts || {}).map(([key, value]) => (
                  <KV key={key} k={statusLabel(key)} v={<span className="mono">{value}</span>} />
                ))}
              </div>
            </Card>
            <Card>
              <Eyebrow n={5}>Row errors</Eyebrow>
              <Rule />
              <div className="kv-list">
                {errors.length === 0 && <KV k="Validation" v={<Pill tone="olive" dot>No row errors</Pill>} />}
                {errors.slice(0, 6).map((error, idx) => (
                  <KV key={`${error.row_number || "file"}-${idx}`} k={`Row ${error.row_number || "file"}`} v={error.message} />
                ))}
              </div>
            </Card>
          </div>
          {suggestedCustomFields.length > 0 && (
            <Card>
              <Eyebrow n={6}>Org-wide custom fields</Eyebrow>
              <Rule />
              <Table columns={["Source column", "Field", "Entity", "Type"]} widths={["1fr", "1fr", "1fr", "90px"]}>
                {suggestedCustomFields.map(field => (
                  <Row key={`${field.entity_type}-${field.key}`}>
                    <Cell>{field.source_column}</Cell>
                    <Cell><span className="mono">{field.key}</span></Cell>
                    <Cell>{triggerLabel(field.entity_type)}</Cell>
                    <Cell><Pill tone="muted" mono>{field.data_type}</Pill></Cell>
                  </Row>
                ))}
              </Table>
            </Card>
          )}

          <div className="focal-actions">
            {step === "preview" && <Button kind="solid" iconRight="arrow" onClick={runApply} disabled={!preview}>Apply import</Button>}
            <Button kind="ghost" onClick={() => setStep("upload")}>New import</Button>
          </div>
        </Section>
      )}
    </div>
  );
}


function WriteBacksScreen({ campaignId, onDataChanged }) {
  const campaign = campaignById(campaignId);
  const [activeId, setActiveId] = React.useState(null);
  const [note, setNote] = React.useState("Reviewed against source record and campaign context.");
  const [message, setMessage] = React.useState("");
  const [workingId, setWorkingId] = React.useState(null);
  const jobs = (D.writebackJobs || []).filter(job => job.campaign_id === campaignId);
  const active = jobs.find(job => job.id === activeId) || jobs[0];
  React.useEffect(() => {
    if (jobs.length && !jobs.some(job => job.id === activeId)) setActiveId(jobs[0].id);
  }, [campaignId, jobs.length, activeId]);

  async function review(job, decision) {
    setWorkingId(job.id);
    setMessage("");
    try {
      await LMS_API.reviewWriteBackJob(campaignId, job.id, decision, note);
      onDataChanged?.();
      setMessage(decision === "approve" ? "Write-back approved for deterministic execution." : "Write-back rejected.");
    } catch (err) {
      setMessage(`Review failed: ${err.message}`);
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="screen">
      <PageHeader
        eyebrow="Write-back approvals"
        title="Review staged source-system changes."
        sub={`${campaign.name}: external writes stay staged until an authorized reviewer approves or rejects with a note.`}
      />
      {message && <Pill tone={message.startsWith("Review failed") ? "red" : "olive"}>{message}</Pill>}
      <div className="two-col">
        <Card padded={false}>
          {/* Source record shows in the detail panel — kept out of the master so
              Operation and Eligibility read at full width. */}
          <Table columns={["System", "Operation", "Eligibility", "Approval", "Created"]} widths={["96px", "1.5fr", "1.1fr", "120px", "116px"]}>
            {jobs.map(job => {
              const blocked = job.eligibility?.eligible === false;
              return (
                <Row key={job.id} selected={job.id === active?.id} onSelect={() => setActiveId(job.id)}>
                  <Cell><span className="strong">{job.target_system}</span></Cell>
                  <Cell><span className="mono">{job.operation}</span></Cell>
                  <Cell>{blocked ? <Pill tone="red" dot sev>Blocked</Pill> : <Pill tone="olive" dot sev>Eligible</Pill>}</Cell>
                  <Cell>{riskPill(job.approval_status)}</Cell>
                  <Cell><span className="mono small">{fmtDate(String(job.created_at || "").slice(0, 10))}</span></Cell>
                </Row>
              );
            })}
          </Table>
        </Card>
        <WriteBackDetail job={active} note={note} setNote={setNote} onReview={review} working={workingId === active?.id} />
      </div>
    </div>
  );
}

function WriteBackDetail({ job, note, setNote, onReview, working }) {
  if (!job) return <Card><Pill tone="muted">No staged write-backs</Pill></Card>;
  const blockedReasons = job.eligibility?.blocked_reasons || [];
  const payloadRows = Object.entries(job.payload || {});
  return (
    <Card>
      <Eyebrow n={7}>Approval detail</Eyebrow>
      <h2 className="display-sm">{statusLabel(job.target_system)} · {statusLabel(job.operation)}</h2>
      <p className="muted small">Execution remains stubbed until an approved adapter run is explicitly enabled.</p>
      <Rule />
      <div className="kv-list">
        <KV k="Source record" v={`${job.source_record_type}:${job.source_record_id || "pending"}`} />
        <KV k="Approval" v={<Pill tone={job.approval_status === "approved" ? "olive" : job.approval_status === "rejected" ? "red" : "ochre"} block>{statusLabel(job.approval_status)}</Pill>} />
        <KV k="Blocked reasons" v={blockedReasons.length ? blockedReasons.join(", ") : "None"} />
        <KV k="Reviewer note" v={job.reviewer_note || "Required before approve/reject"} />
      </div>
      <Rule />
      <Table columns={["Payload field", "Value"]} widths={["1fr", "1.5fr"]}>
        {payloadRows.map(([key, value]) => (
          <Row key={key}>
            <Cell><span className="mono">{key}</span></Cell>
            <Cell><span className="small">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span></Cell>
          </Row>
        ))}
      </Table>
      <label className="field" style={{ marginTop: 14 }}>
        <span className="field-label mono">Reviewer note</span>
        <textarea rows="4" value={note} onChange={e => setNote(e.target.value)} />
      </label>
      <div className="focal-actions">
        <Button kind="solid" size="sm" disabled={working || !note.trim()} onClick={() => onReview(job, "approve")}>Approve</Button>
        <Button kind="ghost" size="sm" disabled={working || !note.trim()} onClick={() => onReview(job, "reject")}>Reject</Button>
      </div>
    </Card>
  );
}

function ScoringScreen({ campaignId, onDataChanged }) {
  const campaign = campaignById(campaignId);
  const initial = campaign.scoringProfile || {};
  const [profile, setProfile] = useState({
    completion_threshold: initial.completion_threshold ?? 95,
    critical_role_threshold: initial.critical_role_threshold ?? 98,
    identity_mismatch_penalty: initial.identity_mismatch_penalty ?? 2,
    blocker_severity_weights: {
      critical: initial.blocker_severity_weights?.critical ?? 8,
      high: initial.blocker_severity_weights?.high ?? 5,
      medium: initial.blocker_severity_weights?.medium ?? 2,
    },
  });
  const [message, setMessage] = useState("");
  // Live, deterministic preview — recomputes on every profile edit.
  const live = computeReadiness(campaignId, profile);

  function setNumber(path, value) {
    const n = Number(value);
    if (path.includes(".")) {
      const [root, key] = path.split(".");
      setProfile({ ...profile, [root]: { ...profile[root], [key]: n } });
    } else {
      setProfile({ ...profile, [path]: n });
    }
  }

  async function save() {
    setMessage("");
    await LMS_API.updateCampaignScoring(campaignId, profile);
    campaign.scoringProfile = profile;
    campaign.readinessScore = live.score; // scored readiness feeds the dashboard's critical-role KPI
    onDataChanged?.();
    setMessage(`Scoring profile saved — readiness scored at ${live.score}%.`);
  }

  return (
    <div className="screen">
      <PageHeader eyebrow="Readiness scoring" title="Configure deterministic readiness scoring." sub={`${campaign.name}: thresholds, blocker weights, critical-role expectations, and mismatch penalties.`} />
      {message && <Pill tone="olive">{message}</Pill>}
      <div className="two-col">
        <Card>
          <div className="form-grid">
            <label className="field">
              <span className="field-label mono">Completion threshold</span>
              <input type="number" value={profile.completion_threshold} onChange={e => setNumber("completion_threshold", e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label mono">Critical role threshold</span>
              <input type="number" value={profile.critical_role_threshold} onChange={e => setNumber("critical_role_threshold", e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label mono">Identity mismatch penalty</span>
              <input type="number" value={profile.identity_mismatch_penalty} onChange={e => setNumber("identity_mismatch_penalty", e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label mono">Critical blocker weight</span>
              <input type="number" value={profile.blocker_severity_weights.critical} onChange={e => setNumber("blocker_severity_weights.critical", e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label mono">High blocker weight</span>
              <input type="number" value={profile.blocker_severity_weights.high} onChange={e => setNumber("blocker_severity_weights.high", e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label mono">Medium blocker weight</span>
              <input type="number" value={profile.blocker_severity_weights.medium} onChange={e => setNumber("blocker_severity_weights.medium", e.target.value)} />
            </label>
          </div>
          <div className="focal-actions">
            <Button kind="solid" onClick={save}>Save scoring</Button>
          </div>
        </Card>
        <Card>
          <Eyebrow n={9}>Live readiness score</Eyebrow>
          <h2 className="display-sm">{live.score}% score</h2>
          <p className="muted small">Deterministic and explainable — recomputes as you change the profile; Save writes it to the campaign so the dashboard's critical-role readiness follows.</p>
          <Rule />
          <div className="kv-list">
            <KV k="Base completion" v={<span className="mono">{live.completionPct}%</span>} />
            <KV k="Below-target drag" v={<span className="mono">-{live.belowTargetDrag}</span>} />
            <KV k={`Open blockers (${live.openBlockers})`} v={<span className="mono">-{live.blockerDrag}</span>} />
            <KV k={`Identity mismatches (${live.identityMismatches})`} v={<span className="mono">-{live.mismatchDrag}</span>} />
            <Rule />
            <KV k="Scored readiness" v={<span className="mono strong">{live.score}%</span>} />
          </div>
        </Card>
      </div>
    </div>
  );
}


export {
  ImportsScreen, WriteBacksScreen, WriteBackDetail, ScoringScreen,
};
