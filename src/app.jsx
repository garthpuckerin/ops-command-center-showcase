// LMS Ops Command Center — app shell, role switcher, static view routing
import React, { useState, useEffect } from 'react'
import { LMS_DATA } from './data.js'
import * as LMS_API from './api-client.js'
import {
  CommandCenterScreen, DemoWalkthroughScreen, ScenarioPacksScreen, CampaignSetupScreen, CurriculumMapScreen,
  ReadinessScreen, DepartmentsScreen, FacilitiesScreen, TrainingMatrixScreen, ImportsScreen, PeopleDirectoryScreen,
  LearnersScreen, SessionsScreen, ExceptionsScreen, ReportsScreen, RoleHomeScreen, CampaignCreateScreen,
  WriteBacksScreen, ScoringScreen, NotificationsScreen, TimelineScreen, IntegrationHealthScreen,
  AiAssistantsScreen, LearnerHomeScreen, TrainerHomeScreen, SettingsScreen, OrgSettingsScreen,
} from './screens.jsx'
import { Icon, Eyebrow, Pill, Rule, Button, Avatar, Card } from './components.jsx'
import { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakToggle } from './tweaks-panel.jsx'
import Landing from './Landing.jsx'

const TWEAK_DEFAULTS = { palette: ["#b5572d", "#0f0d0a", "#f6f3ec"], density: "cozy", themeMode: "light", showNew: true };

// Marketing-landing gate. Once the visitor clicks "Launch demo" we remember it
// so reloads land back in the app, not the pitch; "Sign out" clears it.
const ENTERED_KEY = "ops:entered:v1";

function readEntered() {
  try { return localStorage.getItem(ENTERED_KEY) === "true"; }
  catch (err) { return false; }
}

const ROLE_NAV = {
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

const ROLE_LABELS = {
  learner: "Learner",
  trainer: "Trainer",
  lead: "Readiness Lead",
};

// Views reachable outside a role's nav (shared entry points): "settings" is on
// the user menu for everyone; "new-campaign" is a lead-only authoring action.
// Everything else must appear in ROLE_NAV[role] to be reachable.
const SHARED_VIEWS = { all: ["home", "settings"], lead: ["new-campaign"] };

// RBAC read-scope guard. A view is reachable for a role only if it is in that
// role's nav or an allowed shared view. This closes the deep-link/hash vector:
// the nav already hides out-of-scope items, but `#writebacks` (or any persisted
// view) would otherwise render the admin screen for a learner/trainer. Keep
// this the single source of truth for "can this role see this view".
function viewAllowedForRole(view, role) {
  if (!ROLE_NAV[role]) return false;
  if (SHARED_VIEWS.all.includes(view)) return true;
  if ((SHARED_VIEWS[role] || []).includes(view)) return true;
  return ROLE_NAV[role].some(n => n.id === view);
}

const UI_STATE_KEY = "lms_ops_command_center_ui_state";

// ── Surface-scoped authority ────────────────────────────────────────────────
// The phone is the monitoring/triage companion: readiness, the exception
// queue, sessions, and alerts travel. Surfaces that stage or approve
// mutations against systems of record — or reconfigure the campaign — need
// the full-context workstation view, so on the phone they render a
// deliberate desk-only state instead of the authoring UI. Authority is
// scoped by surface the same way viewAllowedForRole scopes it by role.
const DESK_ONLY_VIEWS = {
  imports: { label: "Import wizard", why: "Reviewing a masked CSV preview and its row errors needs the full-width validation table before anything is applied." },
  writebacks: { label: "Write-back approvals", why: "Approving a staged payload into a system of record requires reading the full payload — not a thumb-sized summary of it." },
  scoring: { label: "Scoring configuration", why: "Changing scoring weights moves the go/no-go number everywhere; tune it where every driver is visible at once." },
  ai: { label: "AI assist staging", why: "Reviewing AI suggestions against their cited records is a side-by-side job." },
  "org-settings": { label: "Org settings", why: "Deployment, connector, and custom-field configuration are administrative changes." },
  "new-campaign": { label: "Campaign creation", why: "Instantiating a template — scoring, requirements, reports, launch gate — deserves a reviewed setup, not a phone form." },
};

function useIsMobile() {
  const query = "(max-width: 720px)";
  const [mobile, setMobile] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

// The desk-only state is a designed screen, not a dead end: it names the
// surface, says why it stays at the desk, shows the live count waiting
// there, and routes the visitor to the work a phone IS for.
function DeskOnlyScreen({ view, campaignId, onNav }) {
  const info = DESK_ONLY_VIEWS[view];
  const pendingApprovals = (LMS_DATA.writebackJobs || []).filter(j => (!j.campaign_id || j.campaign_id === campaignId) && !["approved", "rejected"].includes(j.approval_status)).length;
  const waiting = view === "writebacks" && pendingApprovals > 0
    ? `${pendingApprovals} staged ${pendingApprovals === 1 ? "payload is" : "payloads are"} waiting for desk review.`
    : null;
  return (
    <div className="screen">
      <PageHeader
        eyebrow="Workstation surface"
        title={`${info.label} stays at the desk.`}
        sub="The phone is the monitoring and triage companion. High-authority actions are scoped by surface the same way visibility is scoped by role."
      />
      <Card>
        <p className="muted small" style={{ lineHeight: 1.7 }}>{info.why}</p>
        {waiting && <p className="strong small">{waiting}</p>}
        <div className="focal-actions">
          <Button kind="solid" iconRight="arrow" onClick={() => onNav("exceptions")}>Open triage queue</Button>
          <Button kind="ghost" onClick={() => onNav("home")}>Campaign home</Button>
        </div>
      </Card>
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [entered, setEntered] = useState(readEntered);
  const [role, setRole] = useState(initialRole());
  const [view, setView] = useState(initialView());
  const [campaignId, setCampaignId] = useState(initialCampaignId());
  const [apiStatus, setApiStatus] = useState(LMS_DATA.apiStatus || { mode: "mock" });
  const [dataVersion, setDataVersion] = useState(0);
  const [rolePanelOpen, setRolePanelOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [tour, setTour] = useState({ active: false, step: 0 });
  const isMobile = useIsMobile();
  const didMountRole = React.useRef(false);
  const closeNav = React.useCallback(() => setNavOpen(false), []);
  const me = LMS_DATA.sessionUsers[role];
  const availableCampaigns = campaignsForUser(me);

  useEffect(() => {
    let cancelled = false;
    LMS_API.hydrate()
      .then(() => {
        if (cancelled) return;
        setCampaignId(current => current || LMS_DATA.activeCampaignId);
        setApiStatus(LMS_DATA.apiStatus || { mode: "mock" });
        setDataVersion(v => v + 1);
      })
      .catch(() => {
        if (cancelled) return;
        LMS_DATA.apiStatus = { mode: "mock" };
        setApiStatus(LMS_DATA.apiStatus);
        setDataVersion(v => v + 1);
      });
    return () => { cancelled = true; };
  }, []);

  // Esc closes the mobile nav drawer while it is open.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setNavOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  // Selecting a different role/view from elsewhere should also close the drawer.
  useEffect(() => { setNavOpen(false); }, [role, view]);

  useEffect(() => {
    if (!availableCampaigns.some(c => c.id === campaignId)) {
      setCampaignId(availableCampaigns[0]?.id || LMS_DATA.activeCampaignId);
    }
  }, [role, campaignId]);

  // RBAC read-scope normalization: if the current view is out of scope for the
  // role (deep link, persisted state, or a role change), rewrite it to home so
  // the state, nav highlight, and persisted UI all stay consistent.
  useEffect(() => {
    if (!viewAllowedForRole(view, role)) setView("home");
  }, [view, role]);

  useEffect(() => {
    persistUiState({ role, view, campaignId });
  }, [role, view, campaignId]);

  useEffect(() => {
    if (didMountRole.current) {
      setView("home");
    } else {
      didMountRole.current = true;
    }
  }, [role]);

  useEffect(() => {
    const paletteName =
      Array.isArray(t.palette) && t.palette[0] === "#566234" ? "olive" :
      Array.isArray(t.palette) && t.palette[0] === "#3a4d6e" ? "inkblue" : "terracotta";
    document.body.dataset.palette = paletteName;
    document.body.dataset.density = t.density;
    document.body.dataset.mode = t.themeMode || "light";
  }, [t.palette, t.density, t.themeMode]);

  useEffect(() => {
    if (!tour.active) return;
    const steps = tourStepsForRole(role);
    const step = steps[tour.step];
    if (step?.view && step.view !== view) setView(step.view);
  }, [tour.active, tour.step, role]);

  // Launch demo — enter the app and remember it for subsequent visits.
  const enterDemo = React.useCallback(() => {
    try { localStorage.setItem(ENTERED_KEY, "true"); } catch (err) { /* persistence optional */ }
    setEntered(true);
  }, []);

  // Sign out — clear the gate, close the drawer, and return to the landing.
  const signOut = React.useCallback(() => {
    try { localStorage.removeItem(ENTERED_KEY); } catch (err) { /* persistence optional */ }
    setNavOpen(false);
    setEntered(false);
  }, []);

  // Marketing-landing gate — shown before the app on first visit. All hooks
  // above run unconditionally (incl. the body[data-mode]/[data-palette] effect)
  // so the landing themes correctly; "Launch demo" enters the shell.
  if (!entered) {
    return (
      <Landing
        onEnter={enterDemo}
        themeMode={t.themeMode || "light"}
        onToggleTheme={() => setTweak("themeMode", (t.themeMode || "light") === "dark" ? "light" : "dark")}
      />
    );
  }

  const screen = routeScreen(view, role, me, setView, t, setTweak, campaignId, setCampaignId, () => setDataVersion(v => v + 1), isMobile);
  const blockerSummary = campaignBlockerSummary(campaignId);
  const startTour = () => setTour({ active: true, step: 0 });

  return (
    <div className="shell">
      <Sidebar role={role} setRole={setRole} view={view} setView={setView} me={me} open={navOpen} onClose={closeNav} onSignOut={signOut} />
      {navOpen && <div className="nav-backdrop" onClick={closeNav} aria-hidden="true" />}
      <main className="main">
        <Topbar me={me} role={role} setView={setView} showNew={t.showNew} campaignId={campaignId} setCampaignId={setCampaignId} campaigns={availableCampaigns} blockerSummary={blockerSummary} apiStatus={apiStatus} t={t} setTweak={setTweak} onStartTour={startTour} onToggleNav={() => setNavOpen(o => !o)} />
        <div className="content">
          <ScreenErrorBoundary resetKey={`${role}:${view}:${campaignId}`}>
            {screen}
          </ScreenErrorBoundary>
        </div>
      </main>
      <RoleFloater role={role} setRole={setRole} open={rolePanelOpen} setOpen={setRolePanelOpen} onStartTour={startTour} />
      <MobileTabBar role={role} view={view} setView={setView} onOpenMenu={() => setNavOpen(true)} />
      {tour.active && <GuidedTour role={role} tour={tour} setTour={setTour} view={view} />}
      {import.meta.env.DEV && <TweaksUI t={t} setTweak={setTweak} />}
    </div>
  );
}

class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="screen">
        <PageHeader eyebrow="Screen error" title="This view could not render." sub="The rest of the demo is still available. Switch views or reset the saved demo state." />
        <Card>
          <p className="muted small">{String(this.state.error.message || this.state.error)}</p>
          <div className="focal-actions">
            <Button kind="ghost" onClick={() => localStorage.removeItem(UI_STATE_KEY)}>Clear saved demo state</Button>
          </div>
        </Card>
      </div>
    );
  }
}

// Mirrors the structure of the shared screens' PageHeader (_shared.jsx): the
// .page-header grid expects ONE content child — without the inner wrapper the
// eyebrow/title/sub scatter into grid columns.
function PageHeader({ eyebrow, title, sub }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="display-lg">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
    </header>
  );
}

function initialView() {
  const raw = String(window.location.hash || "").replace("#", "");
  const stored = readUiState().view;
  return raw || stored || "home";
}

function initialRole() {
  const stored = readUiState().role;
  return ROLE_NAV[stored] ? stored : "lead";
}

function initialCampaignId() {
  return readUiState().campaignId || LMS_DATA.activeCampaignId;
}

function readUiState() {
  try {
    return JSON.parse(localStorage.getItem(UI_STATE_KEY) || "{}") || {};
  } catch (err) {
    return {};
  }
}

function persistUiState(next) {
  try {
    localStorage.setItem(UI_STATE_KEY, JSON.stringify(next));
  } catch (err) {
    // Ignore storage errors; navigation still works without persistence.
  }
}

function campaignsForUser(user) {
  if (!user) return [];
  const access = LMS_DATA.campaignAccess.filter(a => a.user_id === user.id);
  return LMS_DATA.campaigns.filter(c => access.some(a => a.campaign_id === c.id));
}

function campaignBlockerSummary(campaignId) {
  const D = LMS_DATA;
  const departmentIds = D.departments.filter(d => d.campaign_id === campaignId).map(d => d.id);
  const blockers = D.exceptions.filter(e => departmentIds.includes(e.department_id) && !["resolved", "closed"].includes(e.status));
  const critical = blockers.filter(e => e.severity === "critical").length;
  return {
    total: blockers.length,
    critical,
    label: blockers.length === 0
      ? "No open blockers for this campaign."
      : `${blockers.length} open ${blockers.length === 1 ? "blocker" : "blockers"}${critical ? `, ${critical} critical` : ""} for this campaign.`,
  };
}

function routeScreen(view, role, me, setView, t, setTweak, campaignId, setCampaignId, onDataChanged, isMobile) {
  // RBAC read-scope: a view outside this role's scope falls back to home. The
  // normalizing effect in App also rewrites the state, but this guards the very
  // first synchronous paint (e.g. a `#org-settings` deep link as a learner).
  if (!viewAllowedForRole(view, role)) view = "home";
  // Surface-scoped authority: workstation surfaces render the desk-only state
  // on the phone companion — deep links and drawer navigation included.
  if (isMobile && DESK_ONLY_VIEWS[view]) return <DeskOnlyScreen view={view} campaignId={campaignId} onNav={setView} />;
  if (view === "walkthrough") return <DemoWalkthroughScreen campaignId={campaignId} onNav={setView} />;
  if (view === "scenarios") return <ScenarioPacksScreen campaignId={campaignId} onNav={setView} setCampaignId={setCampaignId} />;
  if (view === "setup") return <CampaignSetupScreen campaignId={campaignId} />;
  if (view === "catalog-map") return <CurriculumMapScreen campaignId={campaignId} />;
  if (view === "readiness") return <ReadinessScreen campaignId={campaignId} />;
  if (view === "departments") return <DepartmentsScreen campaignId={campaignId} />;
  if (view === "facilities") return <FacilitiesScreen campaignId={campaignId} />;
  if (view === "matrix") return <TrainingMatrixScreen campaignId={campaignId} />;
  if (view === "imports") return <ImportsScreen campaignId={campaignId} onDataChanged={onDataChanged} />;
  if (view === "people") return <PeopleDirectoryScreen campaignId={campaignId} />;
  if (view === "learners") return <LearnersScreen me={me} role={role} campaignId={campaignId} />;
  if (view === "sessions") return <SessionsScreen me={me} role={role} campaignId={campaignId} />;
  if (view === "exceptions") return <ExceptionsScreen campaignId={campaignId} onDataChanged={onDataChanged} />;
  if (view === "notifications") return <NotificationsScreen campaignId={campaignId} onDataChanged={onDataChanged} />;
  if (view === "writebacks") return <WriteBacksScreen campaignId={campaignId} onDataChanged={onDataChanged} />;
  if (view === "scoring") return <ScoringScreen campaignId={campaignId} onDataChanged={onDataChanged} />;
  if (view === "reports") return <ReportsScreen campaignId={campaignId} onDataChanged={onDataChanged} />;
  if (view === "timeline") return <TimelineScreen campaignId={campaignId} />;
  if (view === "integrations") return <IntegrationHealthScreen campaignId={campaignId} />;
  if (view === "ai") return <AiAssistantsScreen campaignId={campaignId} />;
  if (view === "org-settings") return <OrgSettingsScreen campaignId={campaignId} t={t} setTweak={setTweak} />;
  if (view === "new-campaign") return <CampaignCreateScreen setView={setView} setCampaignId={setCampaignId} onDataChanged={onDataChanged} />;
  if (view === "settings") return <SettingsScreen me={me} t={t} setTweak={setTweak} />;
  if (role === "learner") return <LearnerHomeScreen me={me} onNav={setView} campaignId={campaignId} />;
  if (role === "trainer") return <TrainerHomeScreen me={me} onNav={setView} campaignId={campaignId} />;
  return <RoleHomeScreen onNav={setView} campaignId={campaignId} />;
}

function cls(...args) {
  return args.filter(Boolean).join(" ");
}

function Sidebar({ role, setRole, view, setView, me, open = false, onSignOut }) {
  const nav = ROLE_NAV[role];
  const groupedNav = nav.reduce((groups, item) => {
    const group = item.group || "Navigation";
    if (!groups.some(g => g.name === group)) groups.push({ name: group, items: [] });
    groups.find(g => g.name === group).items.push(item);
    return groups;
  }, []);
  const displayUser = me || { first_name: "Demo", last_name: "User", title: ROLE_LABELS[role] || "Command Center", role, avatar: "DU" };
  return (
    <aside className={cls("side", open && "is-open")}>
      <div className="side-brand">
        <span className="brand-mark"><Icon name="logo" size={18} /></span>
        <div className="brand-text">
          <div className="brand-name">LMS Ops <em>Command Center</em></div>
          <div className="brand-sub mono">Epic go-live scenario</div>
        </div>
      </div>

      <nav className="side-nav">
        {groupedNav.map(group => (
          <div className="side-nav-group" key={group.name}>
            {role === "lead" && <div className="side-nav-label mono">{group.name}</div>}
            {group.items.map(n => (
              <button key={n.id}
                className={cls("side-link", view === n.id && "side-link-on")}
                data-tour={`nav-${n.id}`}
                onClick={() => setView(n.id)}>
                <Icon name={n.icon} size={16} />
                <span>{n.label}</span>
                {DESK_ONLY_VIEWS[n.id] && <span className="desk-mark mono" aria-label="Workstation surface">desk</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="side-section">
        <Eyebrow>Demo mode</Eyebrow>
        <p className="side-hint">Role switching and guided tours live in the floating demo control.</p>
      </div>

      <div className="side-foot">
        <div className="side-me">
          <Avatar user={displayUser} size={36} />
          <div>
            <div className="strong small">{displayUser.first_name} {displayUser.last_name}</div>
            <div className="muted xs mono">{displayUser.title}</div>
          </div>
        </div>
        <Rule />
        <div className="side-foot-links">
          <button className="linkbtn" onClick={() => setView("settings")}>Settings</button>
          <span className="dot-sep">·</span>
          <button className="linkbtn" onClick={onSignOut} title="Sign out — return to landing">Sign out</button>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ me, role, setView, showNew, campaignId, setCampaignId, campaigns, blockerSummary, apiStatus, t, setTweak, onStartTour, onToggleNav }) {
  const unreadNotifications = (LMS_DATA.notifications || []).filter(n => n.campaign_id === campaignId && n.status === "unread").length;
  const desc = {
    learner: "Viewing assigned training and account readiness.",
    trainer: "Viewing sessions, capacity, and training exceptions.",
    lead: "Viewing enterprise go-live readiness and escalation risk.",
  };
  return (
    <header className="topbar">
      <div className="topbar-inner">
      <div className="topbar-left">
        <button className="iconbtn nav-toggle" onClick={onToggleNav} aria-label="Open navigation" title="Menu">
          <Icon name="menu" size={16} />
        </button>
        <Pill tone="muted" mono>You are · {ROLE_LABELS[role]}</Pill>
        <span className="muted small" title={desc[role]}>{desc[role]}</span>
      </div>
      <div className="topbar-right">
        <span className="mobile-hide"><Pill tone="muted" mono>Mock data</Pill></span>
        <label className="campaign-switcher" data-tour="campaign-switcher">
          <span className="mono">Campaign</span>
          <select value={campaignId} title={campaigns.find(c => c.id === campaignId)?.name} onChange={(e) => setCampaignId(e.target.value)}>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        {showNew && (
          <button className="whats-new" data-tour="risk-banner" title={blockerSummary.label} onClick={() => setView("exceptions")}>
            <span className="wn-mark mono">{blockerSummary.total ? "RISK" : "CLEAR"}</span>
            <span className="wn-text">{blockerSummary.label}</span>
            <Icon name="chev" size={12} />
          </button>
        )}
        <button className="iconbtn mobile-hide" title={(t.themeMode || "light") === "dark" ? "Switch to light mode" : "Switch to dark mode"} data-tour="theme-toggle" onClick={() => setTweak("themeMode", (t.themeMode || "light") === "dark" ? "light" : "dark")}>
          <Icon name={(t.themeMode || "light") === "dark" ? "sun" : "moon"} size={16} />
        </button>
        <span className="mobile-hide"><Button kind="ghost" size="sm" icon="play" onClick={onStartTour}>Tour</Button></span>
        {role === "lead" && <span className="mobile-hide"><Button kind="ghost" size="sm" icon="plus" onClick={() => setView("new-campaign")}>Campaign</Button></span>}
        <button className="iconbtn" title="Notifications" onClick={() => setView("notifications")}>
          <Icon name="bell" size={16} />
          {unreadNotifications > 0 && <span className="iconbtn-dot" />}
        </button>
        <button className="iconbtn mobile-hide" title="Quick search"><Icon name="search" size={16} /></button>
        <Avatar user={me} size={32} />
      </div>
      </div>
    </header>
  );
}

// Phone companion nav — a bottom tab bar owns the floor (the house mobile
// standard). Tabs map to the role's triage/approvals/monitoring surfaces; the
// rest of the nav lives behind "More" (the off-canvas drawer). Hidden >720px.
function MobileTabBar({ role, view, setView, onOpenMenu }) {
  const TABS = {
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
  const tabs = TABS[role] || TABS.lead;
  return (
    <nav className="mobile-tabbar" aria-label="Primary">
      {tabs.map(tb => (
        <button
          key={tb.id}
          className={cls("mobile-tab", view === tb.id && "mobile-tab-on")}
          onClick={() => setView(tb.id)}
          aria-current={view === tb.id ? "page" : undefined}
        >
          <Icon name={tb.icon} size={18} />
          <span>{tb.label}</span>
        </button>
      ))}
      <button className="mobile-tab" onClick={onOpenMenu} aria-label="More navigation">
        <Icon name="menu" size={18} />
        <span>More</span>
      </button>
    </nav>
  );
}

function RoleFloater({ role, setRole, open, setOpen, onStartTour }) {
  const roles = [
    { id: "lead", label: "Readiness Lead", icon: "shield" },
    { id: "trainer", label: "Trainer", icon: "users" },
    { id: "learner", label: "Learner", icon: "user" },
  ];
  const active = roles.find(r => r.id === role) || roles[0];
  return (
    <div className={cls("role-floater", open && "role-floater-open")} data-tour="role-floater">
      <button className="role-floater-trigger" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle demo role switcher">
        <Icon name={active.icon} size={16} />
        <span>{active.label}</span>
        <Icon name="chev-down" size={13} />
      </button>
      {open && (
        <div className="role-floater-panel">
          <div className="role-floater-head">
            <Eyebrow>Demo role</Eyebrow>
            <button className="linkbtn" onClick={onStartTour}>Start tour</button>
          </div>
          {roles.map(r => (
            <button key={r.id}
              className={cls("role-floater-option", role === r.id && "role-floater-option-on")}
              data-tour={`role-${r.id}`}
              onClick={() => { setRole(r.id); setOpen(false); }}>
              <Icon name={r.icon} size={14} />
              <span>{r.label}</span>
              {role === r.id && <Pill tone="olive" mono>Active</Pill>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function tourStepsForRole(role) {
  const common = [
    { view: "home", target: "campaign-switcher", title: "Selected campaign", body: "Move between active, planning, and draft campaigns — every screen stays scoped to the same operating context." },
    { view: "home", target: "theme-toggle", title: "Presentation mode", body: "Switch between light and dark (with three accent palettes) when the room, projector, or audience needs different contrast." },
    { view: "home", target: "role-floater", title: "Change perspective", body: "Switch persona to see enforced RBAC read-scope in action: a learner or trainer sees only their own records, and admin surfaces leave the nav entirely — the role changes what you can reach, not just what you can do." },
  ];
  if (role === "learner") {
    return [
      { view: "home", target: "nav-home", title: "Learner readiness", body: "Learner mode starts with assigned campaign training and account readiness, not the entire LMS history." },
      { view: "learners", target: "nav-learners", title: "Your record", body: "Read-scope in action: a learner sees only their own reconciliation record, with assigned and completed campaign courses kept separate." },
      ...common,
    ];
  }
  if (role === "trainer") {
    return [
      { view: "home", target: "nav-home", title: "Trainer dashboard", body: "Opens with the sessions assigned to this trainer and the delivery risks that need attention today." },
      { view: "sessions", target: "nav-sessions", title: "Session calendar", body: "Class capacity, room, timing, and trainer coverage — imported from the scheduling system and monitored here for over-capacity and conflicts, not authored in the app." },
      { view: "exceptions", target: "nav-exceptions", title: "Delivery blockers", body: "Capacity issues, trainer conflicts, and learner exceptions collect into one queue — Start and Resolve move real state, with owners and resolution notes." },
      ...common,
    ];
  }
  return [
    { view: "home", target: "home-focal", title: "Where readiness stands", body: "The command center leads with the deterministic critical-role readiness figure and the highest-risk areas to work before launch — the go/no-go answer at a glance." },
    { view: "setup", target: "nav-setup", title: "Launch gate", body: "Owners, evidence, signoff, and blockers are reviewed before a campaign becomes trusted launch truth — the gate actually gates go-live." },
    { view: "imports", target: "nav-imports", title: "Messy import, reconciled", body: "Paste a rough CSV: the wizard masks sensitive columns and flags bad rows, and on apply it creates the valid learners while raising a reconciliation exception for the mismatches." },
    { view: "exceptions", target: "nav-exceptions", title: "Work the queue to zero", body: "Identity, capacity, completion, and scheduling problems become one governed work queue — Start and Resolve move real state, and the open-blocker count moves with it." },
    { view: "scoring", target: "nav-scoring", title: "Readiness, explained", body: "Readiness is a deterministic score, not a black box — adjust a weight and it recomputes live from the same formula the dashboard uses, with every driver shown." },
    { view: "ai", target: "nav-ai", title: "Governed AI", body: "Assistants suggest only: they cite the exact records they used, carry a confidence, and can never mutate anything — a human stages every result." },
    { view: "writebacks", target: "nav-writebacks", title: "Approve before write-back", body: "Nothing reaches the system of record without a reviewer approving the staged payload — approve or reject with a note." },
    { view: "org-settings", target: "nav-org-settings", title: "Deployment posture", body: "Theme, connector, local-AI, and custom-field settings that matter before a beta or client demo — a governed, client-safe deployment path." },
    ...common,
  ];
}

function GuidedTour({ role, tour, setTour, view }) {
  const steps = tourStepsForRole(role);
  const step = steps[Math.min(tour.step, steps.length - 1)] || steps[0];

  useEffect(() => {
    document.querySelectorAll(".tour-focus").forEach(el => el.classList.remove("tour-focus"));
    let target = null;
    const timer = window.setTimeout(() => {
      target = step?.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
      if (target) target.classList.add("tour-focus");
    }, 60);
    return () => {
      window.clearTimeout(timer);
      if (target) target.classList.remove("tour-focus");
    };
  }, [step?.target, view]);

  if (!step) return null;
  const next = () => setTour(current => current.step >= steps.length - 1 ? { active: false, step: 0 } : { active: true, step: current.step + 1 });
  const back = () => setTour(current => ({ active: true, step: Math.max(0, current.step - 1) }));
  return (
    <div className="tour-card" role="dialog" aria-label={`${ROLE_LABELS[role]} guided tour`}>
      <div className="tour-head">
        <Pill tone="ink" mono>{ROLE_LABELS[role]}</Pill>
        <span className="mono small">{tour.step + 1}/{steps.length}</span>
      </div>
      <h2>{step.title}</h2>
      <p>{step.body}</p>
      <div className="tour-actions">
        <Button kind="ghost" size="sm" onClick={back} disabled={tour.step === 0}>Back</Button>
        <Button kind="solid" size="sm" iconRight="chev" onClick={next}>{tour.step >= steps.length - 1 ? "Finish" : "Next"}</Button>
        <button className="linkbtn" onClick={() => setTour({ active: false, step: 0 })}>Skip</button>
      </div>
    </div>
  );
}

function TweaksUI({ t, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Accent palette" />
      <TweakColor
        label="Theme"
        value={t.palette}
        options={[
          ["#b5572d", "#0f0d0a", "#f6f3ec"],
          ["#566234", "#0f0d0a", "#f6f3ec"],
          ["#3a4d6e", "#0f0d0a", "#f6f3ec"],
        ]}
        onChange={(v) => setTweak("palette", v)}
      />
      <TweakSection label="Theme mode" />
      <TweakRadio label="Mode" value={t.themeMode || "light"} options={["light", "dark"]} onChange={(v) => setTweak("themeMode", v)} />
      <TweakSection label="Density" />
      <TweakRadio label="Information density" value={t.density} options={["cozy", "compact"]} onChange={(v) => setTweak("density", v)} />
      <TweakSection label="Surfaces" />
      <TweakToggle label="Show risk banner" value={t.showNew} onChange={(v) => setTweak("showNew", v)} />
    </TweaksPanel>
  );
}

export default App;
