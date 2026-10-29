// The workstation shell (≥1024px, or the full desktop view forced on a small
// device): inline sidebar, one-row topbar, floating demo role control. Moved
// out of app.jsx. The off-canvas drawer and hamburger are gone — below the
// workstation tier the companion shell renders instead, so this shell never
// has to fold itself onto a phone.
import React from "react";
import { LMS_DATA } from "../data.js";
import { Avatar, Button, Eyebrow, Icon, Pill, Rule, cls } from "../components.jsx";
import { campaignTemplate } from "../screens.jsx";
import { DESK_ONLY_VIEWS, ROLE_LABELS, ROLE_NAV } from "./nav.js";

export function WorkstationShell({ shell, screen, children }) {
  const { role, setRole, view, setView, me, onSignOut, campaignId, rolePanelOpen, setRolePanelOpen, onStartTour } = shell;
  return (
    <div className="shell">
      <Sidebar role={role} view={view} setView={setView} me={me} onSignOut={onSignOut} campaignId={campaignId} />
      <main className="main">
        <Topbar {...shell} />
        <div className="content">{screen}</div>
      </main>
      <RoleFloater role={role} setRole={setRole} open={rolePanelOpen} setOpen={setRolePanelOpen} onStartTour={onStartTour} />
      {children}
    </div>
  );
}

function Sidebar({ role, view, setView, me, onSignOut, campaignId }) {
  const nav = ROLE_NAV[role];
  // The brand line names the CURRENT campaign's template, not a fixed
  // "Epic go-live" — the sidebar follows the campaign like every other surface.
  const scenarioLabel = `${campaignTemplate(campaignId)?.name || "Campaign"} scenario`;
  const groupedNav = nav.reduce((groups, item) => {
    const group = item.group || "Navigation";
    if (!groups.some(g => g.name === group)) groups.push({ name: group, items: [] });
    groups.find(g => g.name === group).items.push(item);
    return groups;
  }, []);
  const displayUser = me || { first_name: "Demo", last_name: "User", title: ROLE_LABELS[role] || "Command Center", role, avatar: "DU" };
  return (
    <aside className="side">
      <div className="side-brand">
        <span className="brand-mark"><Icon name="logo" size={18} /></span>
        <div className="brand-text">
          <div className="brand-name">Ops <em>Command Center</em></div>
          <div className="brand-sub mono" title={scenarioLabel}>{scenarioLabel}</div>
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

function Topbar({ me, role, setView, showNew, campaignId, setCampaignId, campaigns, blockerSummary, t, setTweak, onStartTour, onQuickSearch, surface }) {
  const unreadNotifications = (LMS_DATA.notifications || []).filter(n => n.campaign_id === campaignId && n.status === "unread").length;
  const scenario = (campaignTemplate(campaignId)?.name || "campaign").toLowerCase();
  const desc = {
    learner: "Viewing assigned training and account readiness.",
    trainer: "Viewing sessions, capacity, and training exceptions.",
    lead: `Viewing ${scenario} readiness and escalation risk.`,
  };
  const dark = (t.themeMode || "light") === "dark";
  return (
    <header className="topbar">
      <div className="topbar-inner">
      <div className="topbar-left">
        {/* The full desktop view on a small device keeps its way back first in
            the bar, so it is on screen however the page is scaled. */}
        {surface.forcedActive && (
          <button className="btn btn-solid btn-sm back-to-phone" data-back-to-phone onClick={surface.clearForceDesktop}>
            <Icon name="arrow" size={14} /><span>Back to the phone layout</span>
          </button>
        )}
        <Pill tone="muted" mono>You are · {ROLE_LABELS[role]}</Pill>
        <span className="muted small" title={desc[role]}>{desc[role]}</span>
      </div>
      <div className="topbar-right">
        <Pill tone="muted" mono>Mock data</Pill>
        {showNew && (
          <button className="whats-new" data-tour="risk-banner" title={blockerSummary.label} onClick={() => setView("exceptions")}>
            <span className="wn-mark mono">{blockerSummary.total ? "RISK" : "CLEAR"}</span>
            <span className="wn-text">{blockerSummary.label}</span>
            <Icon name="chev" size={12} />
          </button>
        )}
        {/* Campaign controls sit together: the switcher next to the new-campaign
            button, well clear of the RISK banner. */}
        <label className="campaign-switcher" data-tour="campaign-switcher">
          <span className="mono">Campaign</span>
          <select value={campaignId} title={campaigns.find(c => c.id === campaignId)?.name} onChange={(e) => setCampaignId(e.target.value)}>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        {role === "lead" && <Button kind="ghost" size="sm" icon="plus" onClick={() => setView("new-campaign")}>Campaign</Button>}
        {/* Utility cluster: theme and tour live with search and notifications. */}
        <button className="iconbtn" title={dark ? "Switch to light mode" : "Switch to dark mode"} data-tour="theme-toggle" onClick={() => setTweak("themeMode", dark ? "light" : "dark")}>
          <Icon name={dark ? "sun" : "moon"} size={16} />
        </button>
        <Button kind="ghost" size="sm" icon="play" onClick={onStartTour}>Tour</Button>
        <button className="iconbtn" title="Notifications" onClick={() => setView("notifications")}>
          <Icon name="bell" size={16} />
          {unreadNotifications > 0 && <span className="iconbtn-dot" />}
        </button>
        <button className="iconbtn" title="Quick search — People Directory" aria-label="Quick search" onClick={onQuickSearch}><Icon name="search" size={16} /></button>
        <Avatar user={me} size={32} />
      </div>
      </div>
    </header>
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
