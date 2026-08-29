// Mock LMS Ops Command Center data.
// Scenario: Epic Go-Live readiness support. Fake data only.
//
// All dates are RELATIVE to the real "today": each frozen 2026 fixture date is
// passed through the dates.js shifters (shiftIso / shiftDateTime / shiftTimestamp),
// which slide the entire dataset by one constant offset (today − 2026-05-28 anchor).
// This keeps the go-live countdown, exception due windows, session calendar, and
// "last sync" feed fresh whenever the demo is opened, while preserving every
// relationship between events. See dates.js for the migration primitives.

import { shiftIso, shiftDateTime, shiftTimestamp, daysToGoLive } from './dates.js';

const LMS_DATA = (function () {
  const campaigns = [
    { id: "camp-st-anne", name: "St. Anne Hospital Acquisition", status: "Active", goLiveDate: shiftIso("2026-07-15"), phase: "Training execution", readiness: 76, readinessScore: 44, risk: "high", scoringProfile: { completion_threshold: 95, critical_role_threshold: 98, identity_mismatch_penalty: 2, blocker_severity_weights: { critical: 8, high: 5, medium: 2 } }, homeSummary: { user_campaign_role: "readiness_lead", default_home_view: "executive_summary", cards: { open_exceptions: 3, departments_at_risk: 2, sessions_due: 3, readiness_score: 44 } } },
    { id: "camp-riverbend", name: "Riverbend Medical Center Acquisition", status: "Planning", goLiveDate: shiftIso("2026-10-03"), phase: "Roster intake", readiness: 12, readinessScore: 0, risk: "medium", scoringProfile: { completion_threshold: 90, critical_role_threshold: 95, identity_mismatch_penalty: 2, blocker_severity_weights: { critical: 8, high: 5, medium: 2 } }, homeSummary: { user_campaign_role: "program_admin", default_home_view: "executive_summary", cards: { open_exceptions: 0, departments_at_risk: 2, sessions_due: 0, readiness_score: 0 } } },
    { id: "camp-ambulatory-wave2", name: "Ambulatory Wave 2", status: "Draft", goLiveDate: shiftIso("2026-11-12"), phase: "Matrix design", readiness: 0, readinessScore: 0, risk: "low", scoringProfile: { completion_threshold: 85, critical_role_threshold: 90, identity_mismatch_penalty: 1, blocker_severity_weights: { critical: 8, high: 5, medium: 2 } }, homeSummary: { user_campaign_role: "training_coordinator", default_home_view: "executive_summary", cards: { open_exceptions: 0, departments_at_risk: 0, sessions_due: 0, readiness_score: 0 } } },
  ];
  const campaignTemplates = [
    {
      id: "tpl-epic-go-live",
      name: "Epic Go-Live",
      slug: "epic-go-live",
      scenario_type: "go_live",
      description: "Hospital or ambulatory Epic launch readiness campaign.",
      terminology: { launch_label: "Go-live", learner_label: "End user", blocker_label: "Readiness blocker" },
      scoring_profile: { completion_threshold: 95, critical_role_threshold: 98, blocker_weight: 3 },
      default_reports: [{ title: "Daily Readiness Brief" }, { title: "At-Risk Learners" }],
      requirements: [{ requirement_name: "EpicCare RN Foundation" }, { requirement_name: "Registration Foundations" }],
    },
    {
      id: "tpl-acquisition",
      name: "Acquisition Onboarding",
      slug: "acquisition-onboarding",
      scenario_type: "acquisition_onboarding",
      description: "Training and identity readiness for acquired teams.",
      terminology: { launch_label: "Cutover", learner_label: "Transitioning employee", blocker_label: "Onboarding issue" },
      scoring_profile: { completion_threshold: 90, critical_role_threshold: 95, blocker_weight: 2 },
      default_reports: [{ title: "Onboarding Readiness" }],
      requirements: [{ requirement_name: "Acquisition Orientation" }],
    },
    {
      id: "tpl-compliance",
      name: "Compliance Cycle",
      slug: "compliance-cycle",
      scenario_type: "compliance",
      description: "Recurring compliance assignment and completion campaign.",
      terminology: { launch_label: "Deadline", learner_label: "Assignee", blocker_label: "Compliance exception" },
      scoring_profile: { completion_threshold: 100, critical_role_threshold: 100, blocker_weight: 4 },
      default_reports: [{ title: "Compliance Completion" }],
      requirements: [{ requirement_name: "Annual Compliance Attestation" }],
    },
    {
      id: "tpl-sales-enablement",
      name: "Sales Enablement",
      slug: "sales-enablement",
      scenario_type: "sales_enablement",
      description: "Role-based enablement campaign for commercial teams.",
      terminology: { launch_label: "Launch", learner_label: "Seller", blocker_label: "Enablement gap" },
      scoring_profile: { completion_threshold: 85, critical_role_threshold: 90, blocker_weight: 2 },
      default_reports: [{ title: "Enablement Readiness" }],
      requirements: [{ requirement_name: "Product Positioning Certification" }],
    },
  ];
  const activeCampaignId = "camp-st-anne";
  const goLiveDate = campaigns.find(c => c.id === activeCampaignId).goLiveDate;

  const users = [
    { id: "u-001", first_name: "Mira", last_name: "Okafor", email: "mira.okafor@example.org", role: "lead", avatar: "MO", title: "Readiness Lead" },
    { id: "u-002", first_name: "Daniel", last_name: "Reeve", email: "daniel.reeve@example.org", role: "trainer", avatar: "DR", title: "Principal Trainer" },
    { id: "u-003", first_name: "Priya", last_name: "Anand", email: "priya.anand@example.org", role: "trainer", avatar: "PA", title: "Credentialed Trainer" },
    { id: "u-004", first_name: "Owen", last_name: "Voss", email: "owen.voss@example.org", role: "learner", avatar: "OV", title: "Inpatient RN" },
  ];

  const campaignAccess = [
    { user_id: "u-001", campaign_id: "camp-st-anne", scope: "campaign", role: "Campaign Lead", permissions: ["campaign:view", "readiness:view", "learner:view", "session:view", "exception:manage", "report:export", "import:run"] },
    { user_id: "u-001", campaign_id: "camp-riverbend", scope: "campaign", role: "Campaign Lead", permissions: ["campaign:view", "campaign:manage", "readiness:view", "report:view"] },
    { user_id: "u-001", campaign_id: "camp-ambulatory-wave2", scope: "campaign", role: "Program Admin", permissions: ["campaign:view", "campaign:manage", "report:view"] },
    { user_id: "u-002", campaign_id: "camp-st-anne", scope: "sessions", role: "Trainer", permissions: ["campaign:view", "session:view", "exception:view"] },
    { user_id: "u-003", campaign_id: "camp-st-anne", scope: "sessions", role: "Trainer", permissions: ["campaign:view", "session:view", "exception:view"] },
    { user_id: "u-004", campaign_id: "camp-st-anne", scope: "own_record", role: "Learner", permissions: ["campaign:view", "learner:self"] },
  ];

  const campaignSetupSections = [
    { id: "setup-st-anne-details", campaign_id: "camp-st-anne", section: "Campaign details", owner: "Mira Okafor", status: "approved", evidence: "Launch dates, owners, and scope confirmed.", due: shiftIso("2026-05-20"), signoff: "Mira Okafor" },
    { id: "setup-st-anne-locations", campaign_id: "camp-st-anne", section: "Locations and departments", owner: "Operations PMO", status: "approved", evidence: "4 facilities and 7 departments loaded.", due: shiftIso("2026-05-24"), signoff: "Operations PMO" },
    { id: "setup-st-anne-population", campaign_id: "camp-st-anne", section: "Learner population", owner: "HRIS", status: "needs_review", evidence: "Duplicate provider and missing LMS records remain.", due: shiftIso("2026-06-03"), signoff: null },
    { id: "setup-st-anne-matrix", campaign_id: "camp-st-anne", section: "Course and role matrix", owner: "Training Ops", status: "needs_review", evidence: "7 role tracks active; ED and pharmacy need final review.", due: shiftIso("2026-06-05"), signoff: null },
    { id: "setup-st-anne-access", campaign_id: "camp-st-anne", section: "Accounts and access", owner: "Access Team", status: "blocked", evidence: "Missing Epic IDs and duplicate LMS accounts block launch confidence.", due: shiftIso("2026-06-04"), signoff: null },
    { id: "setup-st-anne-writeback", campaign_id: "camp-st-anne", section: "Write-back policy", owner: "Readiness Lead", status: "approved", evidence: "Manual export only until connector approval.", due: shiftIso("2026-05-29"), signoff: "Readiness Lead" },

    { id: "setup-riverbend-details", campaign_id: "camp-riverbend", section: "Campaign details", owner: "Program Admin", status: "approved", evidence: "Acquisition template selected with cutover date.", due: shiftIso("2026-06-15"), signoff: "Program Admin" },
    { id: "setup-riverbend-roster", campaign_id: "camp-riverbend", section: "Roster intake", owner: "HRIS", status: "in_progress", evidence: "Riverbend ED and Nursing files are loaded for review.", due: shiftIso("2026-06-21"), signoff: null },
    { id: "setup-riverbend-rolemap", campaign_id: "camp-riverbend", section: "Old org role mapping", owner: "Training Ops", status: "needs_review", evidence: "Two Riverbend roles map into draft parent-org tracks.", due: shiftIso("2026-06-24"), signoff: null },
    { id: "setup-riverbend-matrix", campaign_id: "camp-riverbend", section: "Course and role matrix", owner: "Training Ops", status: "not_started", evidence: "Waiting on role mapping signoff.", due: shiftIso("2026-06-27"), signoff: null },

    { id: "setup-ambulatory-details", campaign_id: "camp-ambulatory-wave2", section: "Campaign details", owner: "Program Admin", status: "in_progress", evidence: "Draft wave created; site list pending.", due: shiftIso("2026-07-02"), signoff: null },
    { id: "setup-ambulatory-sites", campaign_id: "camp-ambulatory-wave2", section: "Site list", owner: "Ambulatory Ops", status: "blocked", evidence: "East Ambulatory Group is loaded; remaining sites are not approved.", due: shiftIso("2026-07-08"), signoff: null },
    { id: "setup-ambulatory-matrix", campaign_id: "camp-ambulatory-wave2", section: "Course and role matrix", owner: "Training Ops", status: "not_started", evidence: "Matrix design begins after site signoff.", due: shiftIso("2026-07-15"), signoff: null },
  ];

  const sessionUsers = {
    learner: users.find(u => u.id === "u-004"),
    trainer: users.find(u => u.id === "u-002"),
    lead: users.find(u => u.id === "u-001"),
  };

  const facilities = [
    { id: "fac-main", campaign_id: "camp-st-anne", name: "Main Hospital", type: "Acute Care", departments: 8, readiness: 72, risk: "high", exceptions: 41 },
    { id: "fac-north", campaign_id: "camp-st-anne", name: "North Ambulatory Clinic", type: "Ambulatory", departments: 5, readiness: 84, risk: "medium", exceptions: 16 },
    { id: "fac-ed", campaign_id: "camp-st-anne", name: "Emergency Department", type: "Emergency", departments: 3, readiness: 61, risk: "critical", exceptions: 29 },
    { id: "fac-surgery", campaign_id: "camp-st-anne", name: "Surgical Center", type: "Procedural", departments: 4, readiness: 79, risk: "medium", exceptions: 18 },
    { id: "fac-riverbend", campaign_id: "camp-riverbend", name: "Riverbend Medical Center", type: "Acute Care", departments: 6, readiness: 12, risk: "medium", exceptions: 4 },
    { id: "fac-east-amb", campaign_id: "camp-ambulatory-wave2", name: "East Ambulatory Group", type: "Ambulatory", departments: 9, readiness: 0, risk: "low", exceptions: 0 },
  ];

  const departments = [
    { id: "dep-nursing", campaign_id: "camp-st-anne", name: "Nursing", facility_id: "fac-main", required: 640, complete: 431, in_progress: 124, not_started: 85, exceptions: 38, risk: "high" },
    { id: "dep-ed", campaign_id: "camp-st-anne", name: "Emergency Department", facility_id: "fac-ed", required: 188, complete: 103, in_progress: 41, not_started: 44, exceptions: 29, risk: "critical" },
    { id: "dep-revcycle", campaign_id: "camp-st-anne", name: "Revenue Cycle", facility_id: "fac-main", required: 214, complete: 181, in_progress: 19, not_started: 14, exceptions: 8, risk: "low" },
    { id: "dep-pharmacy", campaign_id: "camp-st-anne", name: "Pharmacy", facility_id: "fac-main", required: 92, complete: 67, in_progress: 14, not_started: 11, exceptions: 7, risk: "medium" },
    { id: "dep-radiology", campaign_id: "camp-st-anne", name: "Radiology", facility_id: "fac-main", required: 126, complete: 86, in_progress: 20, not_started: 20, exceptions: 13, risk: "medium" },
    { id: "dep-ambulatory", campaign_id: "camp-st-anne", name: "Ambulatory Operations", facility_id: "fac-north", required: 301, complete: 259, in_progress: 27, not_started: 15, exceptions: 16, risk: "medium" },
    { id: "dep-surgery", campaign_id: "camp-st-anne", name: "Perioperative Services", facility_id: "fac-surgery", required: 174, complete: 129, in_progress: 28, not_started: 17, exceptions: 18, risk: "medium" },
    { id: "dep-riverbend-ed", campaign_id: "camp-riverbend", name: "Riverbend ED", facility_id: "fac-riverbend", required: 144, complete: 0, in_progress: 18, not_started: 126, exceptions: 2, risk: "medium" },
    { id: "dep-riverbend-nursing", campaign_id: "camp-riverbend", name: "Riverbend Nursing", facility_id: "fac-riverbend", required: 420, complete: 0, in_progress: 33, not_started: 387, exceptions: 2, risk: "medium" },
  ];

  // Single source of truth for the active campaign's headline readiness.
  // Derived from the department completion table (sum complete / sum required)
  // so the dashboard stat, the Daily Readiness Brief, and the readiness table
  // never disagree. Falls back to the campaign's stated readiness if the
  // active campaign has no assigned learners (avoids divide-by-zero).
  const activeCampaign = campaigns.find(c => c.id === activeCampaignId);
  const activeDepartmentRows = departments.filter(d => d.campaign_id === activeCampaignId);
  const activeRequiredTotal = activeDepartmentRows.reduce((s, d) => s + d.required, 0);
  const activeCompleteTotal = activeDepartmentRows.reduce((s, d) => s + d.complete, 0);
  const overallReadinessPct = activeRequiredTotal
    ? Math.round((activeCompleteTotal / activeRequiredTotal) * 100)
    : activeCampaign.readiness;

  const applications = [
    { id: "app-inpatient", name: "EpicCare Inpatient", owner: "Clinical Apps" },
    { id: "app-ambulatory", name: "EpicCare Ambulatory", owner: "Clinical Apps" },
    { id: "app-cadence", name: "Cadence", owner: "Access" },
    { id: "app-prelude", name: "Prelude", owner: "Access" },
    { id: "app-willow", name: "Willow", owner: "Pharmacy" },
    { id: "app-radiant", name: "Radiant", owner: "Ancillary" },
    { id: "app-resolute", name: "Resolute", owner: "Revenue Cycle" },
  ];

  const trainingRequirements = [
    { id: "tr-rn-ip", campaign_id: "camp-st-anne", role: "Inpatient RN", application_id: "app-inpatient", title: "Inpatient RN Documentation", rule: "Complete before credential activation", assigned: 528, readiness: 69, risk: "high", color: "terracotta", code: "IP-RN-100", cover_label: "INPATIENT RN" },
    { id: "tr-provider", campaign_id: "camp-st-anne", role: "Provider", application_id: "app-inpatient", title: "Provider Orders & Results", rule: "Complete before first login", assigned: 246, readiness: 74, risk: "medium", color: "olive", code: "PROV-210", cover_label: "PROVIDER" },
    { id: "tr-registrar", campaign_id: "camp-st-anne", role: "Front Desk Registrar", application_id: "app-prelude", title: "Registration & Check-In Workflow", rule: "Complete plus manager attestation", assigned: 188, readiness: 86, risk: "low", color: "ink", code: "REG-120", cover_label: "REGISTRATION" },
    { id: "tr-scheduler", campaign_id: "camp-st-anne", role: "Scheduler", application_id: "app-cadence", title: "Cadence Scheduling Basics", rule: "Complete before schedule cutover", assigned: 161, readiness: 81, risk: "medium", color: "ochre", code: "CAD-110", cover_label: "SCHEDULING" },
    { id: "tr-pharm", campaign_id: "camp-st-anne", role: "Pharmacist", application_id: "app-willow", title: "Willow Verification & Dispense", rule: "Complete plus lab signoff", assigned: 72, readiness: 73, risk: "medium", color: "olive", code: "WIL-230", cover_label: "PHARMACY" },
    { id: "tr-rad", campaign_id: "camp-st-anne", role: "Radiology Tech", application_id: "app-radiant", title: "Radiant Imaging Workflow", rule: "Complete before modality testing", assigned: 94, readiness: 68, risk: "high", color: "terracotta", code: "RAD-160", cover_label: "RADIOLOGY" },
    { id: "tr-billing", campaign_id: "camp-st-anne", role: "Billing Specialist", application_id: "app-resolute", title: "Resolute Charge Review", rule: "Complete before parallel validation", assigned: 112, readiness: 88, risk: "low", color: "ink", code: "RES-140", cover_label: "REVENUE" },
    { id: "tr-riverbend-rn", campaign_id: "camp-riverbend", role: "Inpatient RN", application_id: "app-inpatient", title: "Riverbend RN Foundation Mapping", rule: "Draft requirement pending roster validation", assigned: 420, readiness: 0, risk: "medium", color: "ochre", code: "RB-IP-RN-100", cover_label: "RIVERBEND RN" },
    { id: "tr-riverbend-ed", campaign_id: "camp-riverbend", role: "ED Registrar", application_id: "app-prelude", title: "Riverbend ED Registration Intake", rule: "Draft requirement pending access validation", assigned: 144, readiness: 0, risk: "medium", color: "ochre", code: "RB-ED-REG-120", cover_label: "RIVERBEND ED" },
    { id: "tr-wave2-ma", campaign_id: "camp-ambulatory-wave2", role: "Ambulatory MA", application_id: "app-ambulatory", title: "Ambulatory MA Intake Workflow", rule: "Not released until site list is approved", assigned: 0, readiness: 0, risk: "low", color: "ink", code: "AMB-MA-100", cover_label: "AMBULATORY" },
  ];

  const learners = [
    { id: "l-001", name: "Owen Voss", role: "Inpatient RN", department_id: "dep-nursing", facility_id: "fac-main", manager: "S. Patel", lms: "matched", epic_id: "matched", completion: 78, status: "in_progress", exception: null },
    { id: "l-002", name: "Hana El-Amin", role: "Inpatient RN", department_id: "dep-ed", facility_id: "fac-ed", manager: "M. Torres", lms: "matched", epic_id: "missing", completion: 42, status: "exception", exception: "Missing Epic ID" },
    { id: "l-003", name: "Jonas Park", role: "Provider", department_id: "dep-ed", facility_id: "fac-ed", manager: "R. Singh", lms: "duplicate", epic_id: "matched", completion: 21, status: "exception", exception: "Duplicate LMS account" },
    { id: "l-004", name: "Imani Walsh", role: "Front Desk Registrar", department_id: "dep-ambulatory", facility_id: "fac-north", manager: "C. Nguyen", lms: "matched", epic_id: "matched", completion: 100, status: "completed", exception: null },
    { id: "l-005", name: "Theo Brennan", role: "Pharmacist", department_id: "dep-pharmacy", facility_id: "fac-main", manager: "L. Romero", lms: "missing", epic_id: "matched", completion: 0, status: "exception", exception: "Missing LMS account" },
    { id: "l-006", name: "Aria Sundqvist", role: "Radiology Tech", department_id: "dep-radiology", facility_id: "fac-main", manager: "P. Chen", lms: "matched", epic_id: "matched", completion: 64, status: "in_progress", exception: null },
    { id: "l-007", name: "Zara Khouri", role: "Scheduler", department_id: "dep-ambulatory", facility_id: "fac-north", manager: "C. Nguyen", lms: "matched", epic_id: "matched", completion: 91, status: "in_progress", exception: null },
    { id: "l-008", name: "Léo Martin", role: "Billing Specialist", department_id: "dep-revcycle", facility_id: "fac-main", manager: "J. Abrams", lms: "matched", epic_id: "matched", completion: 100, status: "completed", exception: null },
  ];

  const sessions = [
    { id: "s-101", title: "Inpatient RN Documentation Lab", requirement_id: "tr-rn-ip", trainer_id: "u-002", facility_id: "fac-main", room: "Training Lab A", starts: shiftDateTime("2026-06-02 09:00"), capacity: 24, registered: 28, attended: 0, conflict: "Over capacity", risk: "high" },
    { id: "s-102", title: "Provider Orders & Results", requirement_id: "tr-provider", trainer_id: "u-003", facility_id: "fac-ed", room: "ED Conference 2", starts: shiftDateTime("2026-06-03 13:00"), capacity: 18, registered: 16, attended: 0, conflict: null, risk: "low" },
    { id: "s-103", title: "Registration & Check-In Workflow", requirement_id: "tr-registrar", trainer_id: "u-002", facility_id: "fac-north", room: "Clinic Classroom", starts: shiftDateTime("2026-06-04 10:00"), capacity: 20, registered: 19, attended: 0, conflict: null, risk: "low" },
    { id: "s-104", title: "Willow Verification & Dispense", requirement_id: "tr-pharm", trainer_id: "u-003", facility_id: "fac-main", room: "Pharmacy Lab", starts: shiftDateTime("2026-06-04 10:00"), capacity: 12, registered: 13, attended: 0, conflict: "Trainer double-booked", risk: "critical" },
    { id: "s-105", title: "Radiant Imaging Workflow", requirement_id: "tr-rad", trainer_id: "u-003", facility_id: "fac-main", room: "Radiology Workroom", starts: shiftDateTime("2026-06-06 08:00"), capacity: 14, registered: 9, attended: 0, conflict: "Underfilled", risk: "medium" },
  ];

  const exceptions = [
    { id: "e-301", severity: "critical", type: "Identity mismatch", owner: "Mira Okafor", department_id: "dep-ed", learner_id: "l-002", due: shiftIso("2026-05-31"), status: "open", notes: "Epic ID missing for ED RN cohort." },
    { id: "e-302", severity: "high", type: "Duplicate account", owner: "Access Team", department_id: "dep-ed", learner_id: "l-003", due: shiftIso("2026-06-01"), status: "open", notes: "Two LMS records map to one provider profile." },
    { id: "e-303", severity: "high", type: "Session capacity", owner: "Daniel Reeve", department_id: "dep-nursing", learner_id: null, due: shiftIso("2026-05-30"), status: "in_progress", notes: "RN lab is four seats over capacity." },
    { id: "e-304", severity: "critical", type: "Trainer conflict", owner: "Priya Anand", department_id: "dep-pharmacy", learner_id: null, due: shiftIso("2026-05-29"), status: "open", notes: "Willow session conflicts with Provider Orders session." },
    { id: "e-305", severity: "medium", type: "Missing LMS account", owner: "Mira Okafor", department_id: "dep-pharmacy", learner_id: "l-005", due: shiftIso("2026-06-03"), status: "open", notes: "Pharmacist exists in HR and Epic but not LMS." },
    { id: "e-306", severity: "critical", type: "Super-user gap", owner: "Mira Okafor", department_id: "dep-nursing", learner_id: "l-001", due: shiftIso("2026-05-30"), status: "open", notes: "Unit has no credentialed super-user for go-live floor support." },
    { id: "e-307", severity: "high", type: "Overdue completion", owner: "Daniel Reeve", department_id: "dep-nursing", learner_id: "l-004", due: shiftIso("2026-05-28"), status: "open", notes: "EpicCare Inpatient course past the training deadline." },
    { id: "e-308", severity: "high", type: "Identity mismatch", owner: "Access Team", department_id: "dep-ed", learner_id: "l-006", due: shiftIso("2026-06-02"), status: "in_progress", notes: "HR employee_id does not match the Epic provisioning feed." },
    { id: "e-309", severity: "medium", type: "Out-of-scope course", owner: "Priya Anand", department_id: "dep-radiology", learner_id: "l-007", due: shiftIso("2026-06-04"), status: "open", notes: "Imported completion maps to no required Radiant course — held from readiness credit." },
    { id: "e-310", severity: "high", type: "Role change re-trigger", owner: "Mira Okafor", department_id: "dep-radiology", learner_id: "l-008", due: shiftIso("2026-06-01"), status: "open", notes: "Tech moved to a lead role; new curriculum requirements re-opened." },
    { id: "e-311", severity: "medium", type: "Credential lapse", owner: "Access Team", department_id: "dep-pharmacy", learner_id: null, due: shiftIso("2026-06-05"), status: "open", notes: "Pharmacist license attestation expires before go-live." },
    { id: "e-312", severity: "low", type: "Missing LMS account", owner: "Daniel Reeve", department_id: "dep-revcycle", learner_id: null, due: shiftIso("2026-06-06"), status: "open", notes: "Two Prelude/Resolute staff not yet provisioned in the LMS." },
    { id: "e-313", severity: "high", type: "Session capacity", owner: "Priya Anand", department_id: "dep-ambulatory", learner_id: null, due: shiftIso("2026-06-02"), status: "open", notes: "Ambulatory EpicCare class is over capacity; needs a second offering." },
    { id: "e-314", severity: "medium", type: "Provisioning pending", owner: "Access Team", department_id: "dep-ambulatory", learner_id: null, due: shiftIso("2026-06-03"), status: "in_progress", notes: "Epic access requests pending approval for float-pool nurses." },
    { id: "e-315", severity: "critical", type: "Identity mismatch", owner: "Mira Okafor", department_id: "dep-surgery", learner_id: null, due: shiftIso("2026-05-31"), status: "open", notes: "Surgical staff SSO identities not reconciled to Epic." },
    { id: "e-316", severity: "medium", type: "Overdue completion", owner: "Daniel Reeve", department_id: "dep-surgery", learner_id: null, due: shiftIso("2026-06-04"), status: "open", notes: "Cadence scheduling module past deadline for two coordinators." },
    { id: "e-317", severity: "low", type: "Duplicate account", owner: "Access Team", department_id: "dep-nursing", learner_id: null, due: shiftIso("2026-06-07"), status: "resolved", notes: "Merged duplicate agency-nurse records.", resolution_reason: "Duplicate merged and verified." },
    { id: "e-318", severity: "high", type: "Super-user gap", owner: "Priya Anand", department_id: "dep-ed", learner_id: null, due: shiftIso("2026-05-30"), status: "open", notes: "ED needs one more credentialed super-user per shift." },
    { id: "e-319", severity: "medium", type: "Out-of-scope course", owner: "Mira Okafor", department_id: "dep-nursing", learner_id: null, due: shiftIso("2026-06-05"), status: "open", notes: "Legacy course completions do not satisfy the Epic curriculum." },
    { id: "e-320", severity: "high", type: "Overdue completion", owner: "Daniel Reeve", department_id: "dep-nursing", learner_id: null, due: shiftIso("2026-06-02"), status: "in_progress", notes: "RN documentation e-learning overdue for a large cohort." },
  ];

  const reports = [
    {
      id: "r-001",
      title: "Daily Readiness Brief",
      desc: "Executive summary of completion, exceptions, and risk by department.",
      cadence: "Daily",
      owner: "Readiness Lead",
      format: "graphical",
      audience: "Executives",
      filterConfig: {},
      columnConfig: [{ key: "metric", label: "Metric" }, { key: "value", label: "Value" }],
      groupingConfig: {},
      sortConfig: [],
      preview: {
        headline: `${overallReadinessPct}% overall readiness`,
        summary: "Two departments remain below launch threshold. ED readiness and identity reconciliation require same-day escalation.",
        metrics: [
          { label: "Overall readiness", value: `${overallReadinessPct}%`, tone: "olive" },
          { label: "Critical roles", value: "64%", tone: "terracotta" },
          { label: "Open blockers", value: "5", tone: "red" },
        ],
        bars: [
          { label: "Revenue Cycle", value: 85, tone: "olive" },
          { label: "Ambulatory", value: 86, tone: "olive" },
          { label: "Pharmacy", value: 73, tone: "ochre" },
          { label: "Nursing", value: 67, tone: "terracotta" },
          { label: "Emergency", value: 55, tone: "terracotta" },
        ],
      },
    },
    {
      id: "r-002",
      title: "At-Risk Learner Export",
      desc: "Learners missing required training, accounts, or Epic identifiers.",
      cadence: "On demand",
      owner: "Training Ops",
      format: "csv",
      audience: "Coordinators",
      filterConfig: { risk_level: ["critical", "high"] },
      columnConfig: [
        { key: "name", label: "Learner" },
        { key: "job_role", label: "Role" },
        { key: "department", label: "Department" },
        { key: "risk_level", label: "Risk" },
      ],
      groupingConfig: { key: "department" },
      sortConfig: [{ key: "name", direction: "asc" }],
      preview: {
        columns: ["learner", "role", "department", "completion", "exception", "owner"],
        rows: [
          ["Hana El-Amin", "Inpatient RN", "Emergency Department", "42%", "Missing Epic ID", "Mira Okafor"],
          ["Jonas Park", "Provider", "Emergency Department", "21%", "Duplicate LMS account", "Access Team"],
          ["Theo Brennan", "Pharmacist", "Pharmacy", "0%", "Missing LMS account", "Mira Okafor"],
        ],
      },
    },
    {
      id: "r-003",
      title: "Department Readiness Packet",
      desc: "Manager-facing follow-up list grouped by department and role.",
      cadence: "Twice weekly",
      owner: "Department Leads",
      format: "graphical + table",
      audience: "Managers",
      preview: {
        headline: "Emergency Department requires manager follow-up",
        summary: "44 learners have not started required training and 29 records have unresolved exceptions.",
        metrics: [
          { label: "Required", value: "188", tone: "ink" },
          { label: "Complete", value: "103", tone: "olive" },
          { label: "Not started", value: "44", tone: "red" },
        ],
        bars: [
          { label: "Providers", value: 74, tone: "ochre" },
          { label: "Inpatient RN", value: 58, tone: "terracotta" },
          { label: "ED Registrar", value: 69, tone: "terracotta" },
        ],
        table: [
          ["Inpatient RN", "82", "48", "21", "13", "high"],
          ["Provider", "43", "32", "7", "4", "medium"],
          ["ED Registrar", "63", "23", "13", "27", "critical"],
        ],
      },
    },
    {
      id: "r-004",
      title: "Completion Reconciliation",
      desc: "Compares LMS completion exports against the command-center matrix.",
      cadence: "Daily",
      owner: "Data Team",
      format: "csv",
      audience: "Data Team",
      preview: {
        columns: ["source", "learner_id", "requirement", "lms_status", "matrix_status", "action"],
        rows: [
          ["LMS", "l-002", "IP-RN-100", "in_progress", "exception", "hold credential activation"],
          ["HR", "l-005", "WIL-230", "missing_account", "assigned", "create LMS account"],
          ["LMS", "l-003", "PROV-210", "duplicate", "assigned", "merge duplicate records"],
        ],
      },
    },
    {
      id: "r-005",
      title: "Open Blockers",
      desc: "Critical and high issues that require escalation before go-live.",
      cadence: "Daily",
      owner: "PMO",
      format: "graphical + queue",
      audience: "PMO",
      preview: {
        headline: "5 blockers open, 2 critical",
        summary: "Critical blockers are concentrated in Emergency Department identity matching and Pharmacy trainer scheduling.",
        metrics: [
          { label: "Critical", value: "2", tone: "red" },
          { label: "High", value: "2", tone: "terracotta" },
          { label: "Medium", value: "1", tone: "ochre" },
        ],
        bars: [
          { label: "Identity", value: 2, max: 5, tone: "red" },
          { label: "Capacity", value: 1, max: 5, tone: "terracotta" },
          { label: "Trainer", value: 1, max: 5, tone: "red" },
          { label: "Account", value: 1, max: 5, tone: "ochre" },
        ],
      },
    },
  ];

  const activeDepartments = departments.filter(d => d.campaign_id === activeCampaignId);
  const activeFacilities = facilities.filter(f => f.campaign_id === activeCampaignId);
  const activeExceptions = exceptions.filter(e => activeDepartments.some(d => d.id === e.department_id));
  const activeLearners = learners.filter(l => activeDepartments.some(d => d.id === l.department_id));
  // ONE source of truth: enrich the exception records IN PLACE with their
  // queue-presentation fields, and make the queue the SAME array. Mutating a
  // queue item (Start/Resolve/Escalate) now mutates the exception every count,
  // scorecard, and KPI derives from — no divergent second copy.
  exceptions.forEach(e => {
    e.queue_item_id = `campaign_exception:${e.id}`;
    e.source_type = "campaign_exception";
    e.facility_id = departments.find(d => d.id === e.department_id)?.facility_id;
    e.exception_type = String(e.type || "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
    e.related_entity_type = e.learner_id ? "learner" : "department";
    e.related_entity_id = e.learner_id || e.department_id;
    e.escalation_level = e.severity === "critical" ? 3 : e.severity === "high" ? 2 : 1;
    if (e.resolution_reason === undefined) e.resolution_reason = null;
    if (e.resolved_at === undefined) e.resolved_at = null;
  });
  const exceptionQueue = exceptions;

  const metrics = {
    goLiveDate,
    daysToGoLive: daysToGoLive(goLiveDate),
    totalLearners: 1735,
    overallReadiness: overallReadinessPct,
    criticalRoleReadiness: 64,
    departmentsAtRisk: activeDepartments.filter(d => ["high", "critical"].includes(d.risk)).length,
    facilitiesAtRisk: activeFacilities.filter(f => ["high", "critical"].includes(f.risk)).length,
    openExceptions: activeExceptions.filter(e => e.status !== "closed").length,
    identityMismatches: activeLearners.filter(l => l.lms !== "matched" || l.epic_id !== "matched").length,
    unscheduledLearners: 137,
  };

  const imports = [
    {
      id: "imp-demo-001",
      campaign_id: activeCampaignId,
      provider: "manual_csv",
      import_type: "roster",
      filename: "main-hospital-roster.csv",
      status: "previewed",
      row_count: 3,
      accepted_count: 2,
      error_count: 1,
      created_at: shiftTimestamp("2026-05-26T10:30:00Z"),
      preview: {
        headers: ["employee_id", "email", "job_role", "api_token"],
        rows: [
          { employee_id: "E-1001", email: "jane@example.com", job_role: "Inpatient RN", api_token: "[redacted]" },
          { employee_id: "E-1002", email: "lee@example.com", job_role: "Pharmacist", api_token: "[redacted]" },
        ],
        errors: [{ row_number: 4, field_name: "employee_id", message: "Roster row is missing a source identifier" }],
        summary: {
          row_count: 3,
          accepted_count: 2,
          error_count: 1,
          sensitive_columns_masked: ["api_token"],
          mapped_entity_counts: { learners: 2 },
        },
      },
    },
  ];

  const writebackJobs = [
    {
      id: "wb-demo-001",
      campaign_id: activeCampaignId,
      target_system: "lms",
      operation: "assignment_update",
      source_record_type: "campaign_assignment",
      source_record_id: "assign-demo-001",
      payload: { employee_id: "E-1001", requirement: "EpicCare RN 100", assignment_status: "completed" },
      eligibility: { eligible: true, blocked_reasons: [] },
      status: "staged",
      approval_status: "pending_review",
      reviewer_note: null,
      reviewed_at: null,
      created_at: shiftTimestamp("2026-05-26T11:00:00Z"),
    },
    {
      id: "wb-demo-002",
      campaign_id: activeCampaignId,
      target_system: "athena",
      operation: "ticket_comment",
      source_record_type: "campaign_exception",
      source_record_id: "e-002",
      payload: { ticket_id: "ATH-100", comment: "Identity mismatch is blocked until HRIS confirms employee ID." },
      eligibility: { eligible: false, blocked_reasons: ["Learner identity is unresolved"] },
      status: "staged",
      approval_status: "pending_review",
      reviewer_note: null,
      reviewed_at: null,
      created_at: shiftTimestamp("2026-05-26T11:20:00Z"),
    },
  ];

  const escalationRules = [
    {
      id: "rule-high-blockers",
      campaign_id: activeCampaignId,
      name: "High blocker count",
      trigger_type: "high_blocker_count",
      parameters: { minimum_count: 2, severity: ["critical", "high"] },
      severity: "high",
      is_active: true,
      created_at: shiftTimestamp("2026-05-26T11:45:00Z"),
    },
    {
      id: "rule-ed-threshold",
      campaign_id: activeCampaignId,
      name: "Department below threshold",
      trigger_type: "department_below_threshold",
      parameters: { completion_threshold: 75 },
      severity: "critical",
      is_active: true,
      created_at: shiftTimestamp("2026-05-26T11:50:00Z"),
    },
    {
      id: "rule-stale-import",
      campaign_id: "camp-riverbend",
      name: "Stale import",
      trigger_type: "stale_import",
      parameters: { days: 5 },
      severity: "medium",
      is_active: true,
      created_at: shiftTimestamp("2026-05-26T12:00:00Z"),
    },
  ];

  const notifications = [
    {
      id: "notif-high-blockers",
      campaign_id: activeCampaignId,
      rule_id: "rule-high-blockers",
      title: "High blocker count",
      message: "4 critical or high blockers are open for this campaign.",
      notification_type: "escalation",
      severity: "high",
      status: "unread",
      source_type: "campaign_exception",
      source_id: "campaign",
      created_at: shiftTimestamp("2026-05-26T12:05:00Z"),
    },
    {
      id: "notif-ed-threshold",
      campaign_id: activeCampaignId,
      rule_id: "rule-ed-threshold",
      title: "Department below threshold",
      message: "Emergency Department is below the configured readiness threshold.",
      notification_type: "escalation",
      severity: "critical",
      status: "unread",
      source_type: "campaign_department",
      source_id: "dep-ed",
      created_at: shiftTimestamp("2026-05-26T12:07:00Z"),
    },
  ];

  const milestones = [
    { id: "ms-freeze", campaign_id: activeCampaignId, milestone_type: "freeze", title: "Roster freeze", due_at: shiftTimestamp("2026-06-12T17:00:00Z"), status: "upcoming", owner_name: "Mira Okafor", notes: "Final roster and manager assignment lock." },
    { id: "ms-training", campaign_id: activeCampaignId, milestone_type: "training_deadline", title: "Training deadline", due_at: shiftTimestamp("2026-07-01T17:00:00Z"), status: "upcoming", owner_name: "Training Ops", notes: "All critical-role assignments complete." },
    { id: "ms-golive", campaign_id: activeCampaignId, milestone_type: "go_live", title: "Go-live", due_at: shiftTimestamp("2026-07-15T08:00:00Z"), status: "upcoming", owner_name: "PMO", notes: "Activation and command center coverage begins." },
    { id: "ms-riverbend-import", campaign_id: "camp-riverbend", milestone_type: "import_cadence", title: "Roster intake cadence", due_at: shiftTimestamp("2026-06-07T12:00:00Z"), status: "upcoming", owner_name: "Data Team", notes: "Weekly manual CSV refresh." },
  ];

  const integrationHealth = [
    { campaign_id: activeCampaignId, source: "manual_csv", import_type: "roster", status: "completed", last_import_at: shiftTimestamp("2026-05-26T10:30:00Z"), filename: "main-hospital-roster.csv", row_count: 3, accepted_count: 2, failed_row_count: 1, is_stale: false },
    { campaign_id: activeCampaignId, source: "manual_csv", import_type: "completion", status: "warning", last_import_at: shiftTimestamp("2026-05-27T08:00:00Z"), filename: "completion-export.csv", row_count: 420, accepted_count: 402, failed_row_count: 18, is_stale: true },
    { campaign_id: "camp-riverbend", source: "manual_csv", import_type: "roster", status: "pending", last_import_at: null, filename: null, row_count: 0, accepted_count: 0, failed_row_count: 0, is_stale: true },
  ];

  const customFields = [
    {
      id: "cf-cost-center",
      organization_id: "org-demo",
      campaign_id: null,
      key: "cost_center",
      label: "Cost Center",
      data_type: "text",
      allowed_entity_types: ["learner", "facility", "coordinator"],
      source_aliases: ["Cost Center", "cost_center"],
      enum_values: [],
      is_sensitive: false,
    },
  ];

  const organizationSettings = {
    id: "org-demo",
    name: "Northstar Health System",
    default_theme: "terracotta",
    demo_mode: true,
    deployment_mode: "Portable POI",
    data_residency: "Local demo data",
    governance_model: "RBAC approval before source-system write-back",
    ai_mode: "Governed local-first assistant",
    connectors: [
      { id: "conn-successfactors", name: "SAP SuccessFactors LMS", status: "planned", scope: "Assignments, completions, curricula, programs" },
      { id: "conn-hris", name: "HRIS roster feed", status: "mock", scope: "Learners, managers, departments, job codes" },
      { id: "conn-orchestration", name: "Source-system integration", status: "future", scope: "Source-system orchestration and write-back review" },
      { id: "conn-local-llm", name: "Local LLM endpoint", status: "configurable", scope: "Summaries, confidence explanations, draft escalations" },
    ],
  };

  const demoWalkthrough = [
    { id: "tour-position", order: 1, title: "Position the product", route: "scenarios", persona: "Executive buyer", point: "This is a campaign readiness platform, not an Epic-only utility.", proof: "Scenario packs show Epic go-live, acquisition onboarding, compliance cycles, and enablement campaigns." },
    { id: "tour-setup", order: 2, title: "Open the launch gate", route: "setup", persona: "Program sponsor", point: "No campaign dashboard should be trusted until setup sections are signed off.", proof: "Each gate section carries owner, evidence, status, and launch-blocking state." },
    { id: "tour-catalog", order: 3, title: "Expose messy training structure", route: "catalog-map", persona: "Training operations", point: "Courses, roles, programs, and curricula need separate inspection before the system recommends rollout.", proof: "Drawers show attached roles, required courses, assigned learners, and mapping confidence." },
    { id: "tour-people", order: 4, title: "Find any person without the source LMS", route: "people", persona: "Coordinator", point: "Coordinators need a paginated, filterable people directory with campaign-scoped profile context.", proof: "Learner profiles separate assigned, completed, and outstanding campaign-relevant training." },
    { id: "tour-ops", order: 5, title: "Work the risk", route: "exceptions", persona: "Command center lead", point: "The app turns roster, identity, capacity, and completion problems into a governed work queue.", proof: "Exceptions, notifications, write-backs, and health feeds are scoped to the selected campaign." },
    { id: "tour-settings", order: 6, title: "Show deployment readiness", route: "org-settings", persona: "IT/security reviewer", point: "Demo settings explain local deployment, connector options, themes, RBAC, and governed AI boundaries.", proof: "Settings make the beta path visible without requiring a VPS or live source-system integration." },
  ];

  const scenarioPacks = [
    { id: "pack-epic", template_id: "tpl-epic-go-live", name: "Epic Go-Live Command Center", industry: "Healthcare", status: "active", best_for: "Hospital EHR activation and credential readiness", buyer_signal: "Reduce training tickets and command center escalation load", demo_campaign_id: "camp-st-anne" },
    { id: "pack-acquisition", template_id: "tpl-acquisition", name: "Acquisition Workforce Transition", industry: "Healthcare / Enterprise", status: "planning", best_for: "Old-org to parent-org role mapping and account readiness", buyer_signal: "Make messy acquired-role overlap reviewable before launch", demo_campaign_id: "camp-riverbend" },
    { id: "pack-compliance", template_id: "tpl-compliance", name: "Regulatory Compliance Cycle", industry: "Regulated teams", status: "concept", best_for: "HIPAA, safety, privacy, and recurring mandatory learning", buyer_signal: "Campaign-level assignment proof, escalation, and audit packets", demo_campaign_id: "camp-st-anne" },
    { id: "pack-enablement", template_id: "tpl-sales-enablement", name: "Role-Based Enablement Rollout", industry: "Commercial teams", status: "concept", best_for: "Product launch training by territory, role, and manager", buyer_signal: "One readiness model across learners, managers, content, and rollout approvals", demo_campaign_id: "camp-ambulatory-wave2" },
  ];

  const catalogEntities = {
    roles: [
      { id: "role-inpatient-rn", campaign_id: activeCampaignId, name: "Inpatient RN", source_role: "Staff Nurse / Charge Nurse", learner_count: 528, confidence: 0.92, status: "needs_review", notes: "Experienced users may qualify for abbreviated track after manager attestation.", courses: ["tr-rn-ip"], programs: ["prog-inpatient-core"], curricula: ["cur-clinical-foundation"] },
      { id: "role-ed-registrar", campaign_id: "camp-riverbend", name: "ED Registrar", source_role: "ED Clerk / Patient Access Rep", learner_count: 144, confidence: 0.81, status: "needs_review", notes: "One source role overlaps parent registrar and emergency access tracks.", courses: ["tr-riverbend-ed"], programs: ["prog-access-cutover"], curricula: ["cur-access-foundation"] },
      { id: "role-pharmacist", campaign_id: activeCampaignId, name: "Pharmacist", source_role: "Clinical Pharmacist", learner_count: 72, confidence: 0.88, status: "approved", notes: "Requires lab signoff before account activation.", courses: ["tr-pharm"], programs: ["prog-pharmacy-readiness"], curricula: ["cur-ancillary-foundation"] },
      { id: "role-ambulatory-ma", campaign_id: "camp-ambulatory-wave2", name: "Ambulatory MA", source_role: "Medical Assistant", learner_count: 0, confidence: 0.64, status: "blocked", notes: "Site list is not approved; matrix remains draft.", courses: ["tr-wave2-ma"], programs: ["prog-ambulatory-core"], curricula: ["cur-ambulatory-foundation"] },
    ],
    programs: [
      { id: "prog-inpatient-core", campaign_id: activeCampaignId, name: "Inpatient Core Program", type: "program", assigned: 528, owner: "Clinical Apps", courses: ["tr-rn-ip", "tr-provider"], roles: ["role-inpatient-rn"] },
      { id: "prog-access-cutover", campaign_id: "camp-riverbend", name: "Access Cutover Program", type: "program", assigned: 144, owner: "Access Training", courses: ["tr-riverbend-ed"], roles: ["role-ed-registrar"] },
      { id: "prog-pharmacy-readiness", campaign_id: activeCampaignId, name: "Pharmacy Readiness Program", type: "program", assigned: 72, owner: "Pharmacy Informatics", courses: ["tr-pharm"], roles: ["role-pharmacist"] },
      { id: "prog-ambulatory-core", campaign_id: "camp-ambulatory-wave2", name: "Ambulatory Core Program", type: "program", assigned: 0, owner: "Ambulatory Ops", courses: ["tr-wave2-ma"], roles: ["role-ambulatory-ma"] },
    ],
    curricula: [
      { id: "cur-clinical-foundation", campaign_id: activeCampaignId, name: "Clinical Foundation Curriculum", type: "curriculum", assigned: 774, owner: "Clinical Education", courses: ["tr-rn-ip", "tr-provider"], roles: ["role-inpatient-rn"] },
      { id: "cur-access-foundation", campaign_id: "camp-riverbend", name: "Access Foundation Curriculum", type: "curriculum", assigned: 144, owner: "Access Training", courses: ["tr-riverbend-ed"], roles: ["role-ed-registrar"] },
      { id: "cur-ancillary-foundation", campaign_id: activeCampaignId, name: "Ancillary Foundation Curriculum", type: "curriculum", assigned: 166, owner: "Ancillary Training", courses: ["tr-pharm", "tr-rad"], roles: ["role-pharmacist"] },
      { id: "cur-ambulatory-foundation", campaign_id: "camp-ambulatory-wave2", name: "Ambulatory Foundation Curriculum", type: "curriculum", assigned: 0, owner: "Ambulatory Training", courses: ["tr-wave2-ma"], roles: ["role-ambulatory-ma"] },
    ],
  };

  return {
    campaigns,
    activeCampaignId,
    campaignTemplates,
    campaignAccess,
    campaignSetupSections,
    goLiveDate,
    users,
    sessionUsers,
    facilities,
    departments,
    applications,
    trainingRequirements,
    learners,
    sessions,
    exceptions,
    exceptionQueue,
    reports,
    imports,
    writebackJobs,
    escalationRules,
    notifications,
    milestones,
    integrationHealth,
    customFields,
    organizationSettings,
    demoWalkthrough,
    scenarioPacks,
    catalogEntities,
    metrics,
  };
})();

export { LMS_DATA };
