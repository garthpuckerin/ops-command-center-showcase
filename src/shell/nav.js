// Navigation and authority policy shared by both shells. Moved out of app.jsx
// unchanged except for COMPANION_TABS (the phone tab sets) and viewLabel.

export const ROLE_NAV = {
  learner: [
    { id: "home", label: "Required Training", icon: "learn" },
    { id: "learners", label: "My Record", icon: "user" },
  ],
  trainer: [
    { id: "home", label: "Trainer Dashboard", icon: "teach" },
    { id: "sessions", label: "Sessions", icon: "catalog" },
    { id: "exceptions", label: "Exceptions", icon: "flag" },
  ],
  lead: [
    { id: "home", label: "Command Center", icon: "home", group: "Overview" },
    { id: "walkthrough", label: "Demo Walkthrough", icon: "play", group: "Overview" },
    { id: "scenarios", label: "Scenario Packs", icon: "catalog", group: "Overview" },
    { id: "setup", label: "Setup Gate", icon: "shield", group: "Setup" },
    { id: "catalog-map", label: "Courses & Roles", icon: "learn", group: "Setup" },
    { id: "matrix", label: "Training Matrix", icon: "sort", group: "Setup" },
    { id: "imports", label: "Imports", icon: "arrow-up", group: "Setup" },
    { id: "people", label: "People Directory", icon: "users", group: "Operations" },
    { id: "learners", label: "Learner Lookup", icon: "user", group: "Operations" },
    { id: "sessions", label: "Sessions", icon: "teach", group: "Operations" },
    { id: "exceptions", label: "Exceptions", icon: "flag", group: "Operations" },
    { id: "readiness", label: "Readiness", icon: "pulse", group: "Intelligence" },
    { id: "departments", label: "Departments", icon: "users", group: "Intelligence" },
    { id: "facilities", label: "Facilities", icon: "admin", group: "Intelligence" },
    { id: "reports", label: "Reports", icon: "ext", group: "Intelligence" },
    { id: "timeline", label: "Timeline", icon: "clock", group: "Intelligence" },
    { id: "notifications", label: "Notifications", icon: "bell", group: "System" },
    { id: "writebacks", label: "Write-backs", icon: "shield", group: "System" },
    { id: "scoring", label: "Scoring", icon: "sort", group: "System" },
    { id: "integrations", label: "Health", icon: "pulse", group: "System" },
    { id: "ai", label: "AI Assist", icon: "spark", group: "System" },
    { id: "org-settings", label: "Org Settings", icon: "admin", group: "System" },
  ],
};

export const ROLE_LABELS = {
  learner: "Learner",
  trainer: "Trainer",
  lead: "Readiness Lead",
};

// Views reachable outside a role's nav (shared entry points): "settings" is on
// the user menu for everyone; "new-campaign" is a lead-only authoring action.
// Everything else must appear in ROLE_NAV[role] to be reachable.
const SHARED_VIEWS = { all: ["home", "settings"], lead: ["new-campaign", "people-invite"] };

// RBAC read-scope guard. A view is reachable for a role only if it is in that
// role's nav or an allowed shared view. This closes the deep-link/hash vector:
// the nav already hides out-of-scope items, but `#writebacks` (or any persisted
// view) would otherwise render the admin screen for a learner/trainer. Keep
// this the single source of truth for "can this role see this view".
export function viewAllowedForRole(view, role) {
  if (!ROLE_NAV[role]) return false;
  if (SHARED_VIEWS.all.includes(view)) return true;
  if ((SHARED_VIEWS[role] || []).includes(view)) return true;
  return ROLE_NAV[role].some(n => n.id === view);
}

// ── Surface-scoped authority ────────────────────────────────────────────────
// The phone and tablet are the monitoring/triage companion: readiness, the
// exception queue, sessions, and alerts travel. Surfaces that stage or approve
// mutations against systems of record — or reconfigure the campaign — need the
// full-context workstation, so below the workstation tier (src/surface.js)
// they render a deliberate desk-only state instead of the authoring UI.
// Authority is scoped by device tier the same way viewAllowedForRole scopes it
// by role — never by orientation.
export const DESK_ONLY_VIEWS = {
  imports: { label: "Import wizard", why: "Reviewing a masked CSV preview and its row errors needs the full-width validation table before anything is applied." },
  writebacks: { label: "Write-back approvals", why: "Approving a staged payload into a system of record requires reading the full payload — not a thumb-sized summary of it." },
  scoring: { label: "Scoring configuration", why: "Changing scoring weights moves the go/no-go number everywhere; tune it where every driver is visible at once." },
  ai: { label: "AI assist staging", why: "Reviewing AI suggestions against their cited records is a side-by-side job." },
  "org-settings": { label: "Org settings", why: "Deployment, connector, and custom-field configuration are administrative changes." },
  "new-campaign": { label: "Campaign creation", why: "Instantiating a template — scoring, requirements, reports, launch gate — deserves a reviewed setup, not a phone form." },
  "people-invite": { label: "Invite people", why: "Granting roles and campaign access is an administrative act — review the full grant at the workstation before queueing it." },
};

// Phone companion tabs: each role's triage/monitoring surfaces. Approvals are
// never a tab; the rest of the nav lives in the More sheet.
export const COMPANION_TABS = {
  lead: [
    { id: "home", label: "Home", icon: "home" },
    { id: "exceptions", label: "Queue", icon: "flag" },
    { id: "notifications", label: "Alerts", icon: "bell" },
    { id: "readiness", label: "Readiness", icon: "pulse" },
  ],
  trainer: [
    { id: "home", label: "Home", icon: "teach" },
    { id: "sessions", label: "Sessions", icon: "catalog" },
    { id: "exceptions", label: "Queue", icon: "flag" },
  ],
  learner: [
    { id: "home", label: "Training", icon: "learn" },
    { id: "learners", label: "Record", icon: "user" },
  ],
};

// Authoring actions that live outside the nav (the topbar "+ Campaign", the
// People "Invite people" button). The More sheet lists them, tagged, so they
// stay reachable on the companion — where they open the desk-only state.
export const WORKSTATION_ACTIONS = {
  lead: [
    { id: "new-campaign", label: "New campaign", icon: "plus" },
    { id: "people-invite", label: "Invite people", icon: "users" },
  ],
};

const EXTRA_LABELS = { settings: "Settings", "new-campaign": "New campaign", "people-invite": "Invite people" };

/** The human name of a view for the current role (the companion app bar). */
export function viewLabel(role, view) {
  return (ROLE_NAV[role] || []).find(n => n.id === view)?.label || EXTRA_LABELS[view] || "Command Center";
}
