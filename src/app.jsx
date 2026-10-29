// LMS Ops Command Center — app state, hash routing, and the choice of shell:
// the companion below the workstation tier, the workstation at/above it.
// src/surface.js is the one source of truth for that line; the shells live in
// src/shell/.
import React, { useState, useEffect } from 'react'
import { LMS_DATA } from './data.js'
import * as LMS_API from './api-client.js'
import {
  DemoWalkthroughScreen, ScenarioPacksScreen, CampaignSetupScreen, CurriculumMapScreen,
  ReadinessScreen, DepartmentsScreen, FacilitiesScreen, TrainingMatrixScreen, ImportsScreen, PeopleDirectoryScreen,
  LearnersScreen, SessionsScreen, ExceptionsScreen, ReportsScreen, RoleHomeScreen, CampaignCreateScreen,
  WriteBacksScreen, ScoringScreen, NotificationsScreen, TimelineScreen, IntegrationHealthScreen,
  AiAssistantsScreen, LearnerHomeScreen, TrainerHomeScreen, SettingsScreen, OrgSettingsScreen,
  InvitePeopleScreen,
} from './screens.jsx'
import { Eyebrow, Button, Card } from './components.jsx'
import { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakToggle } from './tweaks-panel.jsx'
import Landing from './Landing.jsx'
import { parseHash } from './route.js'
import { useSurface } from './hooks/useSurface.js'
import { useHashRoute } from './hooks/useHashRoute.js'
import { DESK_ONLY_VIEWS, ROLE_NAV, viewAllowedForRole } from './shell/nav.js'
import { DeskOnlyScreen } from './shell/DeskOnlyScreen.jsx'
import { GuidedTour, tourStepsForRole } from './shell/GuidedTour.jsx'
import { CompanionShell } from './shell/CompanionShell.jsx'
import { WorkstationShell } from './shell/WorkstationShell.jsx'
import { SurfaceProvider } from './shell/SurfaceContext.js'

const TWEAK_DEFAULTS = { palette: ["#b5572d", "#0f0d0a", "#f6f3ec"], density: "cozy", themeMode: "light", showNew: true };

// Marketing-landing gate. Once the visitor clicks "Launch demo" we remember it
// so reloads land back in the app, not the pitch; "Sign out" clears it.
const ENTERED_KEY = "ops:entered:v1";

function readEntered() {
  try { return localStorage.getItem(ENTERED_KEY) === "true"; }
  catch (err) { return false; }
}

const UI_STATE_KEY = "lms_ops_command_center_ui_state";

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [entered, setEntered] = useState(readEntered);
  const [role, setRole] = useState(initialRole());
  const [route, navigate] = useHashRoute(initialRoute());
  const [campaignId, setCampaignId] = useState(initialCampaignId());
  const [apiStatus, setApiStatus] = useState(LMS_DATA.apiStatus || { mode: "mock" });
  const [dataVersion, setDataVersion] = useState(0);
  const [rolePanelOpen, setRolePanelOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tour, setTour] = useState({ active: false, step: 0 });
  // Bumps on every Quick search press so People Directory re-focuses its field.
  const [searchNonce, setSearchNonce] = useState(0);
  const surface = useSurface();
  const companion = surface.surface === "companion";
  const view = route.view;
  const setView = React.useCallback((next) => navigate({ view: next, record: null }), [navigate]);
  const openRecord = React.useCallback((next, record) => navigate({ view: next, record }), [navigate]);
  const didMountRole = React.useRef(false);
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

  // A new screen (or role) closes the More sheet.
  useEffect(() => { setSheetOpen(false); }, [role, view]);

  useEffect(() => {
    if (!availableCampaigns.some(c => c.id === campaignId)) {
      setCampaignId(availableCampaigns[0]?.id || LMS_DATA.activeCampaignId);
    }
  }, [role, campaignId]);

  // RBAC read-scope normalization: if the current view is out of scope for the
  // role (deep link, persisted state, or a role change), rewrite it to home so
  // the state, nav highlight, URL and persisted UI all stay consistent. It
  // REPLACES the history entry, so back never lands on a redirecting route.
  useEffect(() => {
    if (!viewAllowedForRole(view, role)) navigate({ view: "home", record: null }, { replace: true });
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

  // A tour never narrates a surface this device gates.
  const tourOptions = { gated: !surface.deskAuthority, companion };
  useEffect(() => {
    if (!tour.active) return;
    const steps = tourStepsForRole(role, tourOptions);
    const step = steps[tour.step];
    if (step?.view && step.view !== view) setView(step.view);
  }, [tour.active, tour.step, role, surface.deskAuthority, companion]);

  // Launch demo — enter the app and remember it for subsequent visits.
  const enterDemo = React.useCallback(() => {
    try { localStorage.setItem(ENTERED_KEY, "true"); } catch (err) { /* persistence optional */ }
    setEntered(true);
  }, []);

  // Sign out — clear the gate, close the sheet, and return to the landing.
  const signOut = React.useCallback(() => {
    try { localStorage.removeItem(ENTERED_KEY); } catch (err) { /* persistence optional */ }
    setSheetOpen(false);
    setEntered(false);
  }, []);

  // Marketing-landing gate — shown before the app on first visit. All hooks
  // above run unconditionally (incl. the body[data-mode]/[data-palette] effect
  // and the surface attributes) so the landing themes and sizes correctly.
  if (!entered) {
    return (
      <Landing
        onEnter={enterDemo}
        themeMode={t.themeMode || "light"}
        onToggleTheme={() => setTweak("themeMode", (t.themeMode || "light") === "dark" ? "light" : "dark")}
      />
    );
  }

  const screen = (
    <ScreenErrorBoundary resetKey={`${role}:${view}:${route.record || ""}:${campaignId}`}>
      {routeScreen({
        view, record: route.record, role, me, setView, openRecord, t, setTweak, campaignId, setCampaignId,
        onDataChanged: () => setDataVersion(v => v + 1), surface, searchNonce,
      })}
    </ScreenErrorBoundary>
  );
  const shell = {
    role, setRole, view, setView, me, campaignId, setCampaignId, campaigns: availableCampaigns,
    showNew: t.showNew, blockerSummary: campaignBlockerSummary(campaignId), apiStatus, t, setTweak, surface,
    rolePanelOpen, setRolePanelOpen, onSignOut: signOut,
    onStartTour: () => setTour({ active: true, step: 0 }),
    onQuickSearch: () => { setView("people"); setSearchNonce(n => n + 1); },
  };
  const overlays = (
    <>
      {tour.active && <GuidedTour role={role} tour={tour} setTour={setTour} view={view} {...tourOptions} />}
      {import.meta.env.DEV && <TweaksUI t={t} setTweak={setTweak} />}
    </>
  );

  return (
    <SurfaceProvider value={{ companion, tier: surface.tier, deskAuthority: surface.deskAuthority }}>
      {companion
        ? <CompanionShell shell={shell} screen={screen} sheetOpen={sheetOpen} setSheetOpen={setSheetOpen}>{overlays}</CompanionShell>
        : <WorkstationShell shell={shell} screen={screen}>{overlays}</WorkstationShell>}
    </SurfaceProvider>
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

// The URL wins (a shared link, a deep link, a reload); the last persisted view
// is the fallback for a bare visit.
function initialRoute() {
  const fromHash = parseHash(window.location.hash);
  if (fromHash.view) return fromHash;
  return { view: readUiState().view || "home", record: null };
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

function routeScreen({ view, record, role, me, setView, openRecord, t, setTweak, campaignId, setCampaignId, onDataChanged, surface, searchNonce = 0 }) {
  // RBAC read-scope: a view outside this role's scope falls back to home. The
  // normalizing effect in App also rewrites the state, but this guards the very
  // first synchronous paint (e.g. a `#org-settings` deep link as a learner).
  if (!viewAllowedForRole(view, role)) view = "home";
  // Surface-scoped authority: below the workstation tier (and in the full
  // desktop view on a small device) workstation surfaces render the desk-only
  // state — deep links, restored routes and nav included, in any orientation.
  if (!surface.deskAuthority && DESK_ONLY_VIEWS[view]) return <DeskOnlyScreen view={view} campaignId={campaignId} onNav={setView} forcedDesktop={surface.forcedActive} />;
  if (view === "walkthrough") return <DemoWalkthroughScreen campaignId={campaignId} onNav={setView} />;
  if (view === "scenarios") return <ScenarioPacksScreen campaignId={campaignId} onNav={setView} setCampaignId={setCampaignId} />;
  if (view === "setup") return <CampaignSetupScreen campaignId={campaignId} />;
  if (view === "catalog-map") return <CurriculumMapScreen campaignId={campaignId} />;
  if (view === "readiness") return <ReadinessScreen campaignId={campaignId} />;
  if (view === "departments") return <DepartmentsScreen campaignId={campaignId} />;
  if (view === "facilities") return <FacilitiesScreen campaignId={campaignId} />;
  if (view === "matrix") return <TrainingMatrixScreen campaignId={campaignId} />;
  if (view === "imports") return <ImportsScreen campaignId={campaignId} onDataChanged={onDataChanged} />;
  if (view === "people") return <PeopleDirectoryScreen campaignId={campaignId} onNav={setView} focusSearchNonce={searchNonce} recordId={record} onOpenRecord={(id) => openRecord("people", id)} />;
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
  if (view === "people-invite") return <InvitePeopleScreen setView={setView} campaignId={campaignId} onDataChanged={onDataChanged} />;
  if (view === "settings") return <SettingsScreen me={me} t={t} setTweak={setTweak} />;
  if (role === "learner") return <LearnerHomeScreen me={me} onNav={setView} campaignId={campaignId} />;
  if (role === "trainer") return <TrainerHomeScreen me={me} onNav={setView} campaignId={campaignId} />;
  return <RoleHomeScreen onNav={setView} campaignId={campaignId} />;
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
