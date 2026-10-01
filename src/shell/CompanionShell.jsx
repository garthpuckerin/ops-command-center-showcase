// The companion shell — phones and tablets below the workstation tier
// (src/surface.js). Its OWN component tree: the desktop sidebar and topbar are
// not mounted here, not hidden with CSS. A compact app bar, a fixed tab bar
// (a side rail on a short landscape screen), and a More sheet that holds the
// full nav (desk surfaces tagged, never hidden), the campaign, the demo role,
// the tour, the theme, and "Open the desktop layout". No floating demo control:
// nothing fixed sits over the page's own controls.
import React, { useEffect, useRef } from "react";
import { Icon, Pill, cls } from "../components.jsx";
import { campaignTemplate } from "../screens.jsx";
import { COMPANION_TABS, DESK_ONLY_VIEWS, ROLE_LABELS, ROLE_NAV, WORKSTATION_ACTIONS, viewLabel } from "./nav.js";

export function CompanionShell({ shell, screen, sheetOpen, setSheetOpen, children }) {
  const { role, view, setView, campaignId, campaigns } = shell;
  const campaign = campaigns.find(c => c.id === campaignId);
  return (
    <div className="companion">
      <header className="companion-appbar">
        <span className="brand-mark" aria-hidden="true"><Icon name="logo" size={16} /></span>
        <div className="companion-appbar-title">
          <span className="companion-appbar-campaign mono">{campaign?.name || "Ops Command Center"}</span>
          <strong>{viewLabel(role, view)}</strong>
        </div>
        <Pill tone="muted" mono>Mock data</Pill>
      </header>
      <main className="main companion-main">
        <div className="content">{screen}</div>
      </main>
      <CompanionTabs role={role} view={view} setView={setView} onOpenMore={() => setSheetOpen(true)} moreOpen={sheetOpen} />
      {sheetOpen && <MoreSheet shell={shell} onClose={() => setSheetOpen(false)} />}
      {children}
    </div>
  );
}

function CompanionTabs({ role, view, setView, onOpenMore, moreOpen }) {
  const tabs = COMPANION_TABS[role] || COMPANION_TABS.lead;
  return (
    <nav className="companion-tabs" aria-label="Primary">
      {tabs.map(tb => (
        <button
          key={tb.id}
          className={cls("companion-tab", view === tb.id && "companion-tab-on")}
          onClick={() => setView(tb.id)}
          aria-current={view === tb.id ? "page" : undefined}
        >
          <Icon name={tb.icon} size={18} />
          <span>{tb.label}</span>
        </button>
      ))}
      <button className={cls("companion-tab", moreOpen && "companion-tab-on")} onClick={onOpenMore} aria-haspopup="dialog" aria-expanded={moreOpen}>
        <Icon name="menu" size={18} />
        <span>More</span>
      </button>
    </nav>
  );
}

const DEMO_ROLES = [
  { id: "lead", icon: "shield" },
  { id: "trainer", icon: "users" },
  { id: "learner", icon: "user" },
];

function MoreSheet({ shell, onClose }) {
  const { role, setRole, view, setView, campaignId, setCampaignId, campaigns, t, setTweak, onStartTour, onSignOut, surface } = shell;
  const sheetRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // A modal dialog: focus moves in ONCE on open (re-renders — a campaign
  // change, a theme toggle — must not yank it back), Tab cycles inside the
  // sheet, Escape closes, and focus returns to what opened it.
  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { onCloseRef.current(); return; }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const focusable = [...sheetRef.current.querySelectorAll("button, select, a[href], input, [tabindex]:not([tabindex='-1'])")].filter(el => !el.disabled);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus();
    };
  }, []);

  const go = (id) => { setView(id); onClose(); };
  const dark = (t.themeMode || "light") === "dark";
  const actions = WORKSTATION_ACTIONS[role] || [];
  const groups = (ROLE_NAV[role] || []).reduce((acc, item) => {
    const name = item.group || "Navigation";
    const group = acc.find(g => g.name === name);
    if (group) group.items.push(item); else acc.push({ name, items: [item] });
    return acc;
  }, []);

  return (
    <div className="companion-sheet" role="dialog" aria-modal="true" aria-label="More" ref={sheetRef}>
      <div className="sheet-head">
        <div>
          <div className="eyebrow">{ROLE_LABELS[role]}</div>
          <div className="sheet-title">{campaignTemplate(campaignId)?.name || "Campaign"} scenario</div>
        </div>
        <button ref={closeRef} className="sheet-close" onClick={onClose} aria-label="Close">×</button>
      </div>

      <label className="sheet-field" data-tour="campaign-switcher">
        <span className="eyebrow">Campaign</span>
        <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>

      {groups.map(group => (
        <section className="sheet-group" key={group.name}>
          {role === "lead" && <div className="eyebrow sheet-group-label">{group.name}</div>}
          {group.items.map(n => (
            <button key={n.id} className={cls("sheet-link", view === n.id && "sheet-link-on")} data-tour={`nav-${n.id}`} onClick={() => go(n.id)}>
              <Icon name={n.icon} size={16} />
              <span>{n.label}</span>
              {DESK_ONLY_VIEWS[n.id] && <span className="desk-tag mono" aria-label="Workstation surface">desk</span>}
            </button>
          ))}
        </section>
      ))}

      {actions.length > 0 && (
        <section className="sheet-group">
          <div className="eyebrow sheet-group-label">Workstation actions</div>
          {actions.map(a => (
            <button key={a.id} className={cls("sheet-link", view === a.id && "sheet-link-on")} onClick={() => go(a.id)}>
              <Icon name={a.icon} size={16} />
              <span>{a.label}</span>
              <span className="desk-tag mono" aria-label="Workstation surface">desk</span>
            </button>
          ))}
        </section>
      )}

      <section className="sheet-group" data-tour="role-floater">
        <div className="eyebrow sheet-group-label">Demo role</div>
        {DEMO_ROLES.map(r => (
          <button key={r.id} className={cls("sheet-link", role === r.id && "sheet-link-on")} onClick={() => { setRole(r.id); onClose(); }} aria-pressed={role === r.id}>
            <Icon name={r.icon} size={16} />
            <span>{ROLE_LABELS[r.id]}</span>
            {role === r.id && <Pill tone="olive" mono>Active</Pill>}
          </button>
        ))}
      </section>

      <section className="sheet-group">
        <div className="eyebrow sheet-group-label">This device</div>
        <button className="sheet-link" onClick={() => { onClose(); onStartTour(); }}>
          <Icon name="play" size={16} /><span>Start the guided tour</span>
        </button>
        <button className="sheet-link" onClick={() => setTweak("themeMode", dark ? "light" : "dark")}>
          <Icon name={dark ? "sun" : "moon"} size={16} /><span>{dark ? "Switch to light mode" : "Switch to dark mode"}</span>
        </button>
        <button className="sheet-link" onClick={() => { onClose(); surface.forceDesktop(); }}>
          <Icon name="ext" size={16} /><span>Open the desktop layout</span>
        </button>
        <button className="sheet-link" onClick={() => go("settings")}>
          <Icon name="admin" size={16} /><span>Settings</span>
        </button>
        <button className="sheet-link" onClick={() => { onClose(); onSignOut(); }}>
          <Icon name="arrow" size={16} /><span>Sign out</span>
        </button>
      </section>
    </div>
  );
}
