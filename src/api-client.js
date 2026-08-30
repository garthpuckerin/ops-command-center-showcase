// Local-only ES module API adapter.
// All network/backend code has been removed. Functions operate on the imported LMS_DATA object.

import { LMS_DATA } from './data.js';

function slugId(prefix, value) {
  return `${prefix}-${String(value || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

function pct(complete, required) {
  return required > 0 ? Math.round((complete / required) * 100) : 0;
}

function daysUntil(dateValue) {
  if (!dateValue) return 0;
  const ms = new Date(dateValue).getTime() - Date.now();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function fmtDateOnly(value) {
  return value ? String(value).slice(0, 10) : "";
}

function fmtDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

function statusTitle(value) {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function transformCampaign(c, readiness) {
  return {
    id: c.id,
    name: c.name,
    status: statusTitle(c.status || "active"),
    goLiveDate: fmtDateOnly(c.go_live_at),
    phase: c.settings?.phase || (c.scenario_type === "go_live" ? "Training execution" : "Operations"),
    readiness: Math.round(c.completion_rate ?? readiness?.completion_rate ?? 0),
    readinessScore: Math.round(readiness?.score ?? c.completion_rate ?? 0),
    risk: readiness?.risk_level || "low",
    settings: c.settings || {},
    scoringProfile: c.settings?.scoring_profile || {},
    scoringExplanation: readiness?.scoring_explanation || {},
  };
}

function transformFacility(f, departments) {
  return {
    id: f.id,
    campaign_id: f.campaign_id,
    name: f.name,
    type: statusTitle(f.facility_type || "Facility"),
    departments: departments.filter(d => d.facility_id === f.id).length,
    readiness: pct(f.completed_learners, f.required_learners),
    risk: f.risk_level,
    exceptions: f.exception_count,
  };
}

function transformDepartment(d) {
  return {
    id: d.id,
    campaign_id: d.campaign_id,
    name: d.name,
    facility_id: d.facility_id,
    required: d.required_learners,
    complete: d.completed_learners,
    in_progress: d.in_progress_learners,
    not_started: d.not_started_learners,
    exceptions: d.exception_count,
    risk: d.risk_level,
  };
}

function transformRequirement(r, applicationId) {
  return {
    id: r.id,
    campaign_id: r.campaign_id,
    role: r.job_role,
    application_id: applicationId,
    title: r.requirement_name,
    rule: r.due_at ? `Complete by ${fmtDateOnly(r.due_at)}` : "Complete before campaign milestone",
    assigned: r.required_learners,
    readiness: pct(r.completed_learners, r.required_learners),
    risk: r.risk_level,
    color: r.risk_level === "high" || r.risk_level === "critical" ? "terracotta" : "olive",
    code: slugId("REQ", r.requirement_name).toUpperCase().slice(0, 18),
    cover_label: String(r.job_role || "Requirement").toUpperCase(),
  };
}

function transformSession(s, trainerIdByName) {
  return {
    id: s.id,
    title: s.title,
    requirement_id: s.requirement_id,
    trainer_id: trainerIdByName.get(s.trainer_name) || "u-api-trainer",
    facility_id: s.facility_id,
    room: s.room,
    starts: fmtDateTime(s.starts_at),
    capacity: s.capacity,
    registered: s.registered_count,
    attended: s.attended_count,
    conflict: Array.isArray(s.conflict_flags) && s.conflict_flags.length ? s.conflict_flags.join(", ") : null,
    risk: s.risk_level,
  };
}

function transformException(e) {
  return {
    id: e.id,
    queue_item_id: e.queue_item_id || `campaign_exception:${e.id}`,
    source_type: e.source_type || "campaign_exception",
    severity: e.severity,
    type: statusTitle(e.exception_type),
    exception_type: e.exception_type,
    owner: e.owner_name || "Unassigned",
    department_id: e.department_id,
    facility_id: e.facility_id,
    learner_id: null,
    due: fmtDateOnly(e.due_at),
    status: e.status,
    notes: e.notes || e.title,
    resolution_reason: e.resolution_reason,
    resolved_at: e.resolved_at,
    related_entity_type: e.related_entity_type,
    related_entity_id: e.related_entity_id,
    escalation_level: e.escalation_level || 0,
  };
}

function transformImport(i) {
  return {
    id: i.id,
    campaign_id: i.campaign_id,
    provider: i.provider,
    import_type: i.import_type,
    filename: i.filename,
    status: i.status,
    row_count: i.row_count,
    accepted_count: i.accepted_count,
    error_count: i.error_count,
    preview: i.preview || {},
    metadata: i.metadata_json || {},
    created_at: i.created_at,
  };
}

function transformWriteBackJob(job) {
  return {
    id: job.id,
    campaign_id: job.campaign_id,
    target_system: job.target_system,
    operation: job.operation,
    source_record_type: job.source_record_type,
    source_record_id: job.source_record_id,
    payload: job.payload || {},
    eligibility: job.eligibility || {},
    status: job.status,
    approval_status: job.approval_status,
    reviewer_note: job.reviewer_note,
    reviewed_at: job.reviewed_at,
    created_at: job.created_at,
  };
}

function transformCampaignTemplate(template) {
  return {
    id: template.id,
    name: template.name,
    slug: template.slug,
    scenario_type: template.scenario_type,
    description: template.description || "",
    terminology: template.terminology || {},
    scoring_profile: template.scoring_profile || {},
    default_reports: template.default_reports || [],
    requirements: template.requirements || [],
  };
}

function transformNotification(notification) {
  return {
    id: notification.id,
    campaign_id: notification.campaign_id,
    rule_id: notification.rule_id,
    title: notification.title,
    message: notification.message,
    notification_type: notification.notification_type,
    severity: notification.severity,
    status: notification.status,
    source_type: notification.source_type,
    source_id: notification.source_id,
    created_at: notification.created_at,
  };
}

function transformEscalationRule(rule) {
  return {
    id: rule.id,
    campaign_id: rule.campaign_id,
    name: rule.name,
    trigger_type: rule.trigger_type,
    parameters: rule.parameters || {},
    severity: rule.severity,
    is_active: rule.is_active,
    created_at: rule.created_at,
  };
}

function transformMilestone(milestone) {
  return {
    id: milestone.id,
    campaign_id: milestone.campaign_id,
    milestone_type: milestone.milestone_type,
    title: milestone.title,
    due_at: milestone.due_at,
    status: milestone.status,
    owner_name: milestone.owner_name,
    notes: milestone.notes,
  };
}

function transformCustomField(field) {
  return {
    id: field.id,
    organization_id: field.organization_id,
    campaign_id: field.campaign_id,
    key: field.key,
    label: field.label,
    data_type: field.data_type,
    allowed_entity_types: field.allowed_entity_types || [],
    source_aliases: field.source_aliases || [],
    enum_values: field.enum_values || [],
    is_sensitive: field.is_sensitive,
  };
}

function transformIntegrationHealth(item) {
  return {
    campaign_id: item.campaign_id,
    source: item.source,
    import_type: item.import_type,
    status: item.status,
    last_import_at: item.last_import_at,
    filename: item.filename,
    row_count: item.row_count,
    accepted_count: item.accepted_count,
    failed_row_count: item.failed_row_count,
    is_stale: item.is_stale,
  };
}

function normalizeReportPreview(preview) {
  if (!preview) return { kind: "table", columns: [], rows: [], rawRows: [] };
  if (Array.isArray(preview.columns) && preview.columns.length && typeof preview.columns[0] === "object") {
    const keys = preview.columns.map(c => c.key);
    const labels = preview.columns.map(c => c.label || c.key);
    const rawRows = (preview.rows || []).map(row => keys.map(key => row[key]));
    return { kind: "table", columns: labels, rows: rawRows, rawRows };
  }
  return {
    kind: preview.chart === "table" ? "table" : "graphical",
    columns: preview.columns || [],
    rows: preview.rows || [],
    rawRows: preview.rows || [],
  };
}

function transformReport(r) {
  const preview = normalizeReportPreview(r.preview);
  const isTable = preview?.kind === "table" || r.preview?.chart === "table";
  const sourceRows = preview?.rawRows || r.preview?.rows || [];
  const bars = sourceRows.slice(0, 5).map(row => {
    const complete = Number(row[1]) || 0;
    const inProgress = Number(row[2]) || 0;
    const notStarted = Number(row[3]) || 0;
    const total = complete + inProgress + notStarted;
    return {
      label: String(row[0] || "Item"),
      value: total ? Math.round((complete / total) * 100) : complete,
      tone: String(row[row.length - 1] || "").includes("critical") ? "terracotta" : "olive",
    };
  });
  return {
    id: r.id,
    campaign_id: r.campaign_id,
    title: r.title,
    desc: r.description || "",
    cadence: "On demand",
    owner: "Command Center",
    format: isTable ? "csv" : "graphical",
    audience: r.report_type === "daily_readiness" ? "Executives" : "Operations",
    exportUrls: r.export_urls || {},
    filterConfig: r.filter_config || {},
    columnConfig: r.column_config || [],
    groupingConfig: r.grouping_config || {},
    sortConfig: r.sort_config || [],
    preview: isTable
      ? { columns: preview.columns || [], rows: preview.rows || [] }
      : {
          headline: r.title,
          summary: r.description || "",
          metrics: [
            ...(r.preview?.summary?.score != null ? [{ label: "Readiness score", value: `${Math.round(r.preview.summary.score)}%`, tone: "terracotta" }] : []),
            { label: "Report type", value: statusTitle(r.report_type), tone: "ink" },
            { label: "Formats", value: (r.export_formats || []).join(", ").toUpperCase(), tone: "olive" },
            { label: "Rows", value: String((r.preview?.rows || []).length), tone: "ochre" },
          ],
          scoringExplanation: r.preview?.summary?.scoring_explanation,
          bars,
        },
  };
}

function transformLearner(l) {
  const name = [l.first_name, l.last_name].filter(Boolean).join(" ") || l.email || l.employee_id || "Learner";
  const completionByStatus = {
    completed: 100,
    in_progress: 50,
    not_started: 0,
    overdue: 0,
  };
  return {
    id: l.id,
    name,
    role: l.job_role || "Assigned Staff",
    department_id: l.department_id,
    facility_id: l.facility_id,
    manager: l.manager_name || "Department Lead",
    lms: l.lms_user_id ? "matched" : "missing",
    epic_id: l.epic_user_id ? "matched" : "missing",
    completion: completionByStatus[l.training_status] ?? 0,
    status: l.risk_level === "critical" || l.risk_level === "high" ? "exception" : l.training_status,
    exception: l.reconciliation_status !== "matched" ? statusTitle(l.reconciliation_status) : null,
    campaign_id: l.campaign_id,
    employee_id: l.employee_id,
    email: l.email,
    first_name: l.first_name,
    last_name: l.last_name,
    job_role: l.job_role,
    manager_name: l.manager_name,
    lms_user_id: l.lms_user_id,
    epic_user_id: l.epic_user_id,
    training_status: l.training_status,
    reconciliation_status: l.reconciliation_status,
    risk_level: l.risk_level,
  };
}

export async function hydrate() {
  LMS_DATA.apiStatus = {
    mode: "mock",
    baseUrl: '',
    loadedAt: new Date().toISOString(),
    backendHydration: "disabled",
  };
  return LMS_DATA;
}

export async function updateException(campaignId, exceptionId, updates) {
  const existing = LMS_DATA.exceptions.find(e => e.id === exceptionId);
  if (existing) Object.assign(existing, updates);
  return existing;
}

export async function updateExceptionQueueItem(campaignId, queueItemId, updates) {
  const existing = (LMS_DATA.exceptionQueue || []).find(e => e.queue_item_id === queueItemId);
  if (existing) {
    Object.assign(existing, updates);
    if (updates.owner_name) existing.owner = updates.owner_name;
  }
  return existing;
}

function rosterIdColumn(headers) {
  return (headers || []).find(h => /employee_id|employee_number|emp_id|^id$/i.test(h)) || (headers || [])[0];
}
function deptForRole(campaignId, role) {
  const depts = (LMS_DATA.departments || []).filter(d => d.campaign_id === campaignId);
  const r = String(role || "").toLowerCase();
  const match = depts.find(d => {
    const n = d.name.toLowerCase();
    return (/rn|nurse|inpatient/.test(r) && /nursing/.test(n))
      || (/emergency|\bed\b/.test(r) && /emergency/.test(n))
      || (/pharm/.test(r) && /pharm/.test(n))
      || (/radiolog|imaging|tech/.test(r) && /radiolog/.test(n))
      || (/surg|periop/.test(r) && /surg/.test(n))
      || (/ambulator|clinic/.test(r) && /ambulator/.test(n));
  });
  return match || depts[0] || {};
}
// Match the in-place enrichment data.js applies, so a raised exception is a
// first-class queue item that every count derives from.
function enrichExceptionInPlace(e) {
  e.queue_item_id = `campaign_exception:${e.id}`;
  e.source_type = "reconciliation_exception";
  e.facility_id = (LMS_DATA.departments.find(d => d.id === e.department_id) || {}).facility_id;
  e.exception_type = String(e.type || "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  e.related_entity_type = e.learner_id ? "learner" : "department";
  e.related_entity_id = e.learner_id || e.department_id;
  e.escalation_level = e.severity === "critical" ? 3 : e.severity === "high" ? 2 : 1;
  e.resolution_reason = e.resolution_reason ?? null;
  e.resolved_at = e.resolved_at ?? null;
}
function rosterValidationErrors(rows, headers) {
  const idCol = rosterIdColumn(headers);
  return rows
    .map((row, i) => (!String(row[idCol] || "").trim())
      ? { row_number: i + 2, field_name: idCol, message: "Roster row is missing a source identifier" }
      : null)
    .filter(Boolean);
}
// APPLY effects: valid rows become learners (idempotent by employee_id), and
// each id-less row raises a reconciliation exception into the shared queue — so
// applying a roster actually moves the People Directory and the open-exception
// KPI. This is the import -> reconcile -> exception spine, live on mock data.
function applyRosterImport(campaignId, rows, headers) {
  const idCol = rosterIdColumn(headers);
  let added = 0;
  rows.forEach((row, i) => {
    const empId = String(row[idCol] || "").trim();
    const role = row.job_role || row.role || "Staff";
    const dept = deptForRole(campaignId, role);
    if (!empId) {
      const ex = {
        id: `e-imp-${Date.now()}-${i}`, severity: "high", type: "Identity mismatch",
        owner: "Access Team", department_id: dept.id, learner_id: null,
        due: (LMS_DATA.exceptions[0] || {}).due, status: "open",
        notes: `Roster row ${i + 2} is missing a source identifier — held from readiness credit until reconciled.`,
      };
      enrichExceptionInPlace(ex);
      LMS_DATA.exceptions.push(ex);
      return;
    }
    if ((LMS_DATA.learners || []).some(l => l.employee_id === empId && l.campaign_id === campaignId)) return;
    const name = row.name || [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || row.email || empId;
    LMS_DATA.learners.push({
      id: `l-imp-${empId}`, employee_id: empId, email: row.email || null, name, role, job_role: role,
      department_id: dept.id, facility_id: dept.facility_id, manager: row.manager_name || row.manager || "—",
      lms: "matched", epic_id: "pending", completion: 0, status: "in_progress", exception: null, campaign_id: campaignId,
    });
    added++;
  });
  return added;
}

export async function createImport(campaignId, values) {
  const rows = parseCsvPreview(values.content || "");
  const sensitiveColumns = (rows.headers || []).filter(h => /password|secret|token|credential/i.test(h));
  const maskedRows = rows.rows.map(row => {
    const next = { ...row };
    sensitiveColumns.forEach(col => { next[col] = "[redacted]"; });
    return next;
  });
  const isRoster = values.import_type === "roster";
  const validationErrors = isRoster ? rosterValidationErrors(rows.rows, rows.headers) : [];
  const applying = !values.preview_only && isRoster;
  const addedLearners = applying ? applyRosterImport(campaignId, rows.rows, rows.headers) : 0;
  const acceptedCount = applying ? addedLearners : Math.max(0, maskedRows.length - validationErrors.length);
  const created = {
    id: `import-${Date.now()}`,
    campaign_id: campaignId,
    provider: values.provider || "manual_csv",
    import_type: values.import_type,
    filename: values.filename,
    status: values.preview_only ? "previewed" : "applied",
    row_count: maskedRows.length,
    accepted_count: acceptedCount,
    error_count: validationErrors.length,
    preview: {
      headers: rows.headers,
      rows: maskedRows,
      errors: validationErrors,
      summary: {
        row_count: maskedRows.length,
        accepted_count: acceptedCount,
        error_count: validationErrors.length,
        sensitive_columns_masked: sensitiveColumns,
        mapped_entity_counts: applying
          ? { learners: addedLearners, reconciliation_exceptions: validationErrors.length }
          : { [values.import_type]: maskedRows.length },
        suggested_custom_fields: suggestCustomFields(values.import_type, rows.headers, maskedRows, sensitiveColumns),
      },
    },
    metadata: values.metadata || {},
    created_at: new Date().toISOString(),
  };
  LMS_DATA.imports = [created, ...(LMS_DATA.imports || [])];
  return created;
}

export async function listImportRowErrors(campaignId, importId) {
  const source = (LMS_DATA.imports || []).find(i => i.id === importId);
  return source?.preview?.errors || [];
}

export async function reviewWriteBackJob(campaignId, jobId, decision, reviewerNote) {
  const existing = (LMS_DATA.writebackJobs || []).find(job => job.id === jobId);
  if (existing) {
    existing.approval_status = decision === "approve" ? "approved" : "rejected";
    existing.status = existing.approval_status;
    existing.reviewer_note = reviewerNote;
    existing.reviewed_at = new Date().toISOString();
  }
  return existing;
}

// Monotonic suffix so two creations in the same millisecond cannot collide.
let createSeq = 0;

export async function createCampaignFromTemplate(templateId, values) {
  const template = (LMS_DATA.campaignTemplates || []).find(item => item.id === templateId);
  const id = `campaign-${Date.now()}-${++createSeq}`;
  const goLiveDate = fmtDateOnly(values.go_live_at);
  const templateScoring = template?.scoring_profile || {};
  const created = {
    id,
    name: values.name,
    template_id: template?.id || templateId,
    status: statusTitle(values.status || "planning"),
    goLiveDate,
    phase: template?.terminology?.launch_label ? `${template.terminology.launch_label} setup` : "Campaign setup",
    readiness: 0,
    readinessScore: 0,
    risk: "low",
    // The template's structure is INSTANTIATED, not just previewed: scoring
    // thresholds seed from the template (weights/penalty keep house defaults),
    // and the campaign opens on the template's home layout.
    scoringProfile: {
      completion_threshold: Number(templateScoring.completion_threshold) || 90,
      critical_role_threshold: Number(templateScoring.critical_role_threshold) || 95,
      identity_mismatch_penalty: 1,
      blocker_severity_weights: { critical: 8, high: 5, medium: 2 },
    },
    homeSummary: {
      user_campaign_role: "program_admin",
      default_home_view: template?.default_home_view || "executive_summary",
      cards: { open_exceptions: 0, departments_at_risk: 0, sessions_due: 0, readiness_score: 0 },
    },
  };
  LMS_DATA.campaigns = [created, ...(LMS_DATA.campaigns || [])];

  // Starter requirements become real requirement rows — empty (assigned 0),
  // honestly, until a roster is imported and roles are mapped.
  const requirements = (template?.requirements || []).map((req, i) => ({
    id: `tr-${id}-${i + 1}`,
    campaign_id: id,
    role: "All roles",
    application_id: null,
    title: req.requirement_name,
    rule: "Seeded from the template — map roles and applications during setup",
    assigned: 0,
    readiness: 0,
    risk: "low",
    color: "ink",
    code: `TPL-${String(template?.scenario_type || "req").toUpperCase().slice(0, 4)}-${100 + i}`,
    cover_label: String(req.requirement_name || "REQUIREMENT").toUpperCase().slice(0, 12),
  }));
  LMS_DATA.trainingRequirements = [...(LMS_DATA.trainingRequirements || []), ...requirements];

  // Default reports become campaign-scoped report rows that fill in with data.
  const reports = (template?.default_reports || []).map((report, i) => ({
    id: `report-${id}-${i + 1}`,
    campaign_id: id,
    title: report.title,
    desc: `Default ${template?.name || "template"} report, seeded at campaign creation.`,
    cadence: "On demand",
    owner: "Command Center",
    format: "graphical",
    audience: "Operations",
    filterConfig: {},
    columnConfig: [],
    groupingConfig: {},
    sortConfig: [],
    preview: {
      headline: "No data yet",
      summary: "This report fills in as the campaign loads its population and completion data.",
      metrics: [],
      bars: [],
    },
  }));
  LMS_DATA.reports = [...(LMS_DATA.reports || []), ...reports];

  // The launch gate is seeded with the template's sections — unowned,
  // unsigned, first section in progress — so the new campaign's setup screen
  // shows the template's SHAPE, not an empty checklist.
  const sections = (template?.setup_sections || []).map((section, i) => ({
    id: `setup-${id}-${i + 1}`,
    campaign_id: id,
    section,
    owner: "Unassigned",
    status: i === 0 ? "in_progress" : "not_started",
    evidence: "Seeded from the template at campaign creation.",
    due: goLiveDate || null,
    signoff: null,
  }));
  LMS_DATA.campaignSetupSections = [...(LMS_DATA.campaignSetupSections || []), ...sections];

  // One starter team owns everything (its "Unassigned" alias matches the
  // seeded sections' owner) until the campaign defines its activation model —
  // some campaigns run six teams, some run one.
  LMS_DATA.teams = [
    ...(LMS_DATA.teams || []),
    { id: `team-${id}`, campaign_id: id, name: "Program Team", focus: "Owns all launch criteria until the activation model is defined", lead: "Unassigned", members: ["Unassigned"] },
  ];

  const leadUser = LMS_DATA.sessionUsers?.lead || (LMS_DATA.users || []).find(user => user.role === "lead");
  LMS_DATA.campaignAccess = [
    { user_id: leadUser?.id || "u-api-lead", campaign_id: created.id, scope: "campaign", role: "Campaign Lead", permissions: ["campaign:view", "exception:manage", "report:export"] },
    ...(LMS_DATA.campaignAccess || []),
  ];
  return created;
}

export async function updateCampaignScoring(campaignId, scoringProfile) {
  const campaign = (LMS_DATA.campaigns || []).find(c => c.id === campaignId);
  if (campaign) campaign.scoringProfile = scoringProfile;
  return campaign;
}

export async function createCampaignReport(campaignId, values) {
  const created = {
    id: `report-${Date.now()}`,
    campaign_id: campaignId,
    title: values.title,
    report_type: values.report_type,
    desc: values.description || "",
    cadence: "On demand",
    owner: "Command Center",
    format: (values.export_formats || []).includes("csv") ? "csv" : "graphical",
    audience: "Operations",
    filterConfig: values.filter_config || {},
    columnConfig: values.column_config || [],
    groupingConfig: values.grouping_config || {},
    sortConfig: values.sort_config || [],
    preview: {
      columns: (values.column_config || []).map(c => c.key),
      rows: [],
    },
  };
  LMS_DATA.reports = [created, ...(LMS_DATA.reports || [])];
  return created;
}

export async function runEscalationRules(campaignId) {
  const existing = LMS_DATA.notifications || [];
  const created = {
    id: `notif-${Date.now()}`,
    campaign_id: campaignId,
    rule_id: "mock-rule",
    title: "High blocker count",
    message: "Open blockers exceed the configured campaign threshold.",
    notification_type: "escalation",
    severity: "high",
    status: "unread",
    source_type: "campaign_exception",
    source_id: "campaign",
    created_at: new Date().toISOString(),
  };
  LMS_DATA.notifications = [created, ...existing.filter(n => !(n.campaign_id === campaignId && n.rule_id === created.rule_id))];
  return { evaluated: (LMS_DATA.escalationRules || []).filter(r => r.campaign_id === campaignId && r.is_active).length || 1, created: 1, notifications: [created] };
}

// Governed AI workspace — deterministic, campaign-grounded suggestions. There is
// no model call: the "governed provider" derives each suggestion from real
// campaign fixtures and cites the specific records it drew from. Every task is
// suggestion-only (mutation_allowed:false); nothing here writes a record.
function aiScope(campaignId) {
  const campaign = (LMS_DATA.campaigns || []).find(c => c.id === campaignId) || { id: campaignId };
  const departments = (LMS_DATA.departments || []).filter(d => d.campaign_id === campaignId);
  const deptIds = new Set(departments.map(d => d.id));
  const facilities = (LMS_DATA.facilities || []).filter(f => f.campaign_id === campaignId);
  const exceptions = (LMS_DATA.exceptions || []).filter(e => deptIds.has(e.department_id));
  const imports = (LMS_DATA.imports || []).filter(i => i.campaign_id === campaignId);
  return { campaign, departments, facilities, exceptions, imports };
}

function severityRank(e) {
  return e.severity === "critical" ? 3 : e.severity === "high" ? 2 : e.severity === "medium" ? 1 : 0;
}

const AI_SUGGESTION_BUILDERS = {
  generate_readiness_brief(s) {
    const readiness = s.campaign.readiness ?? 0;
    const days = daysUntil(s.campaign.goLiveDate);
    const atRisk = s.departments.filter(d => d.risk === "high" || d.risk === "critical");
    const worst = [...s.departments].sort((a, b) => pct(a.complete, a.required) - pct(b.complete, b.required))[0];
    const text = worst
      ? `${s.campaign.name || "Campaign"} is at ${readiness}% readiness with ${days} day${days === 1 ? "" : "s"} to go-live. ${atRisk.length} department${atRisk.length === 1 ? "" : "s"} at risk; the largest gap is ${worst.name} at ${pct(worst.complete, worst.required)}% (${worst.complete}/${worst.required} complete). Prioritize its remaining cohort before the next readiness checkpoint.`
      : `${s.campaign.name || "Campaign"} is at ${readiness}% readiness with ${days} days to go-live. No departments are loaded yet — begin with roster intake.`;
    return {
      suggestion: { text, confidence: 0.88, citations: [`campaign:${s.campaign.id}`, worst && `department:${worst.id}`].filter(Boolean) },
      provenance: { context_ids: [`campaign:${s.campaign.id}`, ...s.departments.map(d => `department:${d.id}`)], source_keys: ["campaign_readiness", "department_completion"] },
    };
  },
  summarize_blockers(s) {
    const open = s.exceptions.filter(e => e.status !== "closed");
    const critical = open.filter(e => e.severity === "critical");
    const top = [...open].sort((a, b) => severityRank(b) - severityRank(a)).slice(0, 2);
    const text = open.length
      ? `${open.length} open exception${open.length === 1 ? "" : "s"} (${critical.length} critical). Highest priority: ${top.map(e => `${e.type} — ${e.notes}`).join("; ")} Owner follow-up needed before go-live.`
      : `No open exceptions for this campaign. The reconciliation queue is clear.`;
    return {
      suggestion: { text, confidence: open.length ? 0.84 : 0.6, citations: top.map(e => `exception:${e.id}`) },
      provenance: { context_ids: open.map(e => `exception:${e.id}`), source_keys: ["exception_queue"] },
    };
  },
  draft_escalation(s) {
    const open = s.exceptions.filter(e => e.status !== "closed");
    const top = [...open].sort((a, b) => severityRank(b) - severityRank(a))[0];
    const text = top
      ? `Draft escalation to ${top.owner}: "${top.type}" (${top.severity}) is due ${String(top.due || "").slice(0, 10)} and still ${String(top.status).replace("_", " ")}. Context: ${top.notes} Requesting same-day resolution or a documented mitigation.`
      : `No open exception to escalate for this campaign.`;
    return {
      suggestion: { text, confidence: top ? 0.8 : 0.5, citations: top ? [`exception:${top.id}`] : [] },
      provenance: { context_ids: top ? [`exception:${top.id}`] : [], source_keys: ["exception_queue", "notification_context"] },
    };
  },
  suggest_learner_match(s) {
    const idIssue = s.exceptions.find(e => /identity|duplicate/i.test(e.type) && e.learner_id) || s.exceptions.find(e => e.learner_id);
    const text = idIssue
      ? `Possible match for the "${idIssue.type}" on learner ${idIssue.learner_id}: reconcile the LMS record against the Epic identity noted in "${idIssue.notes}" Suggestion only — no identifier is written until a reviewer approves the merge.`
      : `No unmatched learner records in this campaign's reconciliation set.`;
    return {
      suggestion: { text, confidence: idIssue ? 0.73 : 0.5, citations: idIssue ? [`learner:${idIssue.learner_id}`, `exception:${idIssue.id}`] : [] },
      provenance: { context_ids: idIssue ? [`exception:${idIssue.id}`] : [], source_keys: ["reconciliation_rules"] },
    };
  },
  classify_ticket(s) {
    const imp = [...s.imports].sort((a, b) => (b.error_count || b.failed_row_count || 0) - (a.error_count || a.failed_row_count || 0))[0];
    const errors = imp ? (imp.error_count ?? imp.failed_row_count ?? 0) : 0;
    const text = imp
      ? `Import ${imp.filename} (${imp.import_type}) has ${errors} row error${errors === 1 ? "" : "s"} of ${imp.row_count}. Likely cause: values that do not match the campaign course-role matrix — route to out-of-scope review rather than granting readiness credit. Sensitive columns were masked on ingest.`
      : `No imports staged for this campaign yet.`;
    return {
      suggestion: { text, confidence: imp ? 0.77 : 0.5, citations: imp ? [`import:${imp.id}`] : [] },
      provenance: { context_ids: imp ? [`import:${imp.id}`] : [], source_keys: ["import_validation"] },
    };
  },
};

export async function runAiAssistant(campaignId, taskType, ids = {}) {
  const build = AI_SUGGESTION_BUILDERS[taskType];
  const built = build
    ? build(aiScope(campaignId))
    : {
        suggestion: { text: "Suggestion generated from deterministic campaign context. Review before staging any action.", confidence: 0.6, citations: [`campaign:${campaignId}`] },
        provenance: { context_ids: [`campaign:${campaignId}`], source_keys: ["campaign_context"] },
      };
  return {
    task_type: taskType,
    campaign_id: campaignId,
    mutation_allowed: false,
    suggestions: [{ type: taskType, ...built.suggestion }],
    provenance: built.provenance,
    model: "deterministic-governed-provider",
  };
}

export async function listPeople(filters = {}) {
  return listPeopleFromLocalData(filters);
}

export async function getPersonProfile(personId) {
  return getPersonProfileFromLocalData(personId);
}

function suggestCustomFields(importType, headers, rows, sensitiveColumns) {
  const entityByImport = {
    roster: "learner",
    training_matrix: "requirement",
    completion_report: "assignment",
    session_schedule: "session",
    exception_list: "exception",
  };
  const standard = new Set({
    roster: ["employee_id", "employee_number", "lms_user_id", "lms_id", "epic_user_id", "epic_id", "email", "first_name", "last_name", "job_role", "role", "manager_name", "manager", "training_status", "risk_level", "source_system"],
    training_matrix: ["job_role", "role", "requirement_name", "course", "course_name", "application", "epic_application", "delivery_mode", "required_learners", "completed_learners", "exception_count", "risk_level"],
    completion_report: ["employee_id", "employee_number", "lms_user_id", "lms_id", "epic_user_id", "epic_id", "email", "job_role", "role", "requirement_name", "course_name", "course", "completion_status", "status", "completed_at", "completion_date", "score", "source_system"],
    session_schedule: ["title", "session_title", "starts_at", "start_time", "ends_at", "end_time", "trainer_name", "trainer", "room", "classroom", "capacity", "registered_count", "attended_count", "no_show_count", "waitlist_count", "status", "risk_level", "requirement_name", "course_name", "course", "facility", "facility_name", "facility_code"],
    exception_list: ["title", "issue_title", "exception_type", "issue_type", "type", "severity", "status", "owner_name", "owner", "due_at", "due_date", "learner_name", "learner", "source_system", "notes", "description", "department", "department_name", "facility", "facility_name", "facility_code"],
  }[importType] || []);
  const entityType = entityByImport[importType] || "record";
  return (headers || []).map(header => {
    const key = slugId("", header).replace(/^-/, "").replace(/-/g, "_");
    if (!key || standard.has(key) || (sensitiveColumns || []).includes(header)) return null;
    if (!rows.some(row => ![undefined, null, ""].includes(row[header]))) return null;
    return { scope: "organization", entity_type: entityType, key, label: statusTitle(key), source_column: header, data_type: "text" };
  }).filter(Boolean);
}

function listPeopleFromLocalData(filters = {}) {
  const limit = Number(filters.limit || 50);
  const offset = Number(filters.offset || 0);
  const q = String(filters.q || "").toLowerCase();
  const rows = (LMS_DATA.learners || []).filter(person => {
    if (q) {
      const haystack = [
        person.name,
        person.email,
        person.employee_id,
        person.lms_user_id,
        person.epic_user_id,
        person.role,
        person.manager,
      ].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.manager && filters.manager !== "all" && !String(person.manager || person.manager_name || "").toLowerCase().includes(String(filters.manager).toLowerCase())) return false;
    if (filters.department_id && filters.department_id !== "all" && person.department_id !== filters.department_id) return false;
    if (filters.facility_id && filters.facility_id !== "all" && person.facility_id !== filters.facility_id) return false;
    if (filters.job_role && filters.job_role !== "all" && !String(person.role || person.job_role || "").toLowerCase().includes(String(filters.job_role).toLowerCase())) return false;
    if (filters.training_status && filters.training_status !== "all" && person.training_status !== filters.training_status) return false;
    if (filters.reconciliation_status && filters.reconciliation_status !== "all" && person.reconciliation_status !== filters.reconciliation_status) return false;
    if (filters.risk_level && filters.risk_level !== "all" && person.risk_level !== filters.risk_level) return false;
    if (filters.campaign_id && filters.campaign_id !== "all" && person.campaign_id !== filters.campaign_id) return false;
    return true;
  }).map(person => localPersonItem(person));
  // The demo hydrates a small sample of learner records; the real campaign
  // population is the sum of department required counts. Absent a narrowing
  // filter, report that population as "matching" (the UI hint says "not fully
  // hydrated" and shows "N of TOTAL loaded"), so the directory total agrees with
  // the dashboard's learner headline instead of contradicting it (8 vs 1,735).
  const hasFilter = !!q || ["manager", "department_id", "facility_id", "job_role", "training_status", "reconciliation_status", "risk_level"]
    .some(k => filters[k] && filters[k] !== "all");
  const activeCamp = (filters.campaign_id && filters.campaign_id !== "all") ? filters.campaign_id : LMS_DATA.activeCampaignId;
  const campaignScale = (LMS_DATA.departments || []).filter(d => d.campaign_id === activeCamp).reduce((s, d) => s + (d.required || 0), 0);
  const total = hasFilter ? rows.length : Math.max(rows.length, campaignScale);
  return {
    items: rows.slice(offset, offset + limit),
    total,
    limit,
    offset,
    has_more: offset + limit < rows.length,
  };
}

function getPersonProfileFromLocalData(personId) {
  const person = (LMS_DATA.learners || []).find(item => item.id === personId);
  if (!person) return null;
  const item = localPersonItem(person);
  return {
    ...item,
    campaigns: [{
      campaign_id: item.campaign_id,
      campaign_name: item.campaign_name,
      learner_id: item.id,
      facility_name: item.facility_name,
      department_name: item.department_name,
      training_status: item.training_status,
      reconciliation_status: item.reconciliation_status,
      risk_level: item.risk_level,
    }],
    outstanding_training: [],
    completed_training: [],
  };
}

function localPersonItem(person) {
  const campaign = (LMS_DATA.campaigns || []).find(c => c.id === person.campaign_id);
  const facility = (LMS_DATA.facilities || []).find(f => f.id === person.facility_id);
  const department = (LMS_DATA.departments || []).find(d => d.id === person.department_id);
  return {
    id: person.id,
    employee_id: person.employee_id,
    email: person.email,
    first_name: person.first_name,
    last_name: person.last_name,
    name: person.name,
    job_role: person.job_role || person.role,
    manager_name: person.manager_name || person.manager,
    facility_id: person.facility_id,
    facility_name: facility?.name,
    department_id: person.department_id,
    department_name: department?.name,
    campaign_id: person.campaign_id || campaign?.id || LMS_DATA.activeCampaignId,
    campaign_name: campaign?.name || "Current campaign",
    campaign_count: 1,
    training_status: person.training_status || person.status,
    reconciliation_status: person.reconciliation_status || (person.exception ? "unresolved" : "matched"),
    risk_level: person.risk_level || (person.status === "exception" ? "high" : "low"),
    lms_user_id: person.lms_user_id,
    epic_user_id: person.epic_user_id,
    custom_fields: person.custom_fields || {},
  };
}

function parseCsvPreview(content) {
  const lines = String(content || "").trim().split(/\r?\n/).filter(Boolean);
  const headers = (lines[0] || "").split(",").map(h => h.trim()).filter(Boolean);
  const rows = lines.slice(1).map(line => {
    const cells = line.split(",");
    return headers.reduce((acc, header, idx) => {
      acc[header] = (cells[idx] || "").trim();
      return acc;
    }, {});
  });
  return { headers, rows };
}
