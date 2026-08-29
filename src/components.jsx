// Epic LMS — design primitives
// Editorial / scholarly system: hairline borders, small-caps eyebrows,
// monospace metadata, no soft shadows, no rounded corners > 4px.

import React, { useMemo, useState, useEffect, useRef } from 'react';

// ─────────────────────────── helpers ───────────────────────────
function cls() { return [...arguments].filter(Boolean).join(" "); }

function statusTone(status) {
  switch (status) {
    case "low":         return "olive";
    case "medium":      return "ochre";
    case "high":        return "terracotta";
    case "critical":    return "red";
    case "open":        return "red";
    case "exception":   return "red";
    case "matched":     return "olive";
    case "missing":     return "red";
    case "duplicate":   return "ochre";
    case "completed":   return "olive";
    case "approved":    return "olive";
    case "in_progress": return "terracotta";
    case "needs_review":return "ochre";
    case "blocked":     return "red";
    case "not_started": return "muted";
    case "failed":      return "red";
    case "published":   return "olive";
    case "draft":       return "ochre";
    case "archived":    return "muted";
    default:            return "muted";
  }
}

function statusLabel(s) {
  return ({
    low: "Low", medium: "Medium", high: "High", critical: "Critical",
    open: "Open", exception: "Exception", matched: "Matched", missing: "Missing", duplicate: "Duplicate",
    completed: "Completed", in_progress: "In progress", not_started: "Not started",
    approved: "Approved", needs_review: "Needs review", blocked: "Blocked",
    failed: "Failed", published: "Published", draft: "Draft", archived: "Archived",
  })[s] || s;
}

function fmt(n) {
  if (n == null) return "—";
  if (typeof n === "number") return n.toLocaleString();
  return n;
}

function fmtDate(iso) {
  if (!iso) return "—";
  const parts = String(iso).split("-");
  const d = parts.length === 3
    ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    : new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function relDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.round((d - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff > 0)  return `in ${diff} days`;
  return `${-diff} days ago`;
}

// ─────────────────────────── eyebrow / labels ───────────────────────────
function Eyebrow({ children, n }) {
  return (
    <div className="eyebrow">
      {n != null && <span className="eyebrow-num">{String(n).padStart(2, "0")}</span>}
      <span>{children}</span>
    </div>
  );
}

function Rule({ thick }) { return <hr className={cls("rule", thick && "rule-thick")} />; }

// ─────────────────────────── pill ───────────────────────────
function Pill({ tone = "muted", children, dot, mono }) {
  return (
    <span className={cls("pill", `pill-${tone}`, mono && "mono")}>
      {dot && <span className="pill-dot" />}
      {children}
    </span>
  );
}

// ─────────────────────────── progress bar ───────────────────────────
function Bar({ value, tone = "terracotta", showLabel, height = 4 }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="bar-wrap">
      <div className="bar" style={{ height }}>
        <div className={cls("bar-fill", `fill-${tone}`)} style={{ width: `${v}%` }} />
      </div>
      {showLabel && <span className="bar-label mono">{v}%</span>}
    </div>
  );
}

// ─────────────────────────── avatar ───────────────────────────
function Avatar({ user, size = 28, tone }) {
  if (!user) return null;
  const t = tone || ({ lead: "terracotta", trainer: "olive", learner: "ink", admin: "terracotta", instructor: "olive", ta: "ochre", student: "ink" }[user.role] || "ink");
  return (
    <span
      className={cls("avatar", `avatar-${t}`)}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
      title={`${user.first_name} ${user.last_name}`}
    >{user.avatar}</span>
  );
}

// ─────────────────────────── icon (inline svg, hairline) ───────────────────────────
function Icon({ name, size = 16 }) {
  const s = size;
  const p = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "home":     return <svg {...p}><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>;
    case "catalog":  return <svg {...p}><path d="M4 5h16v14H4z"/><path d="M4 9h16M9 5v14"/></svg>;
    case "learn":    return <svg {...p}><path d="M4 6h11a3 3 0 0 1 3 3v11"/><path d="M4 6v12h11"/><path d="M4 6a3 3 0 0 1 3-3h11"/></svg>;
    case "teach":    return <svg {...p}><circle cx="12" cy="8" r="3"/><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"/></svg>;
    case "admin":    return <svg {...p}><path d="M12 3 4 7v6c0 4 3.5 7 8 8 4.5-1 8-4 8-8V7Z"/></svg>;
    case "search":   return <svg {...p}><circle cx="11" cy="11" r="6"/><path d="m20 20-4.3-4.3"/></svg>;
    case "chev":     return <svg {...p}><path d="m9 6 6 6-6 6"/></svg>;
    case "chev-down":return <svg {...p}><path d="m6 9 6 6 6-6"/></svg>;
    case "check":    return <svg {...p}><path d="m5 12 4 4 10-10"/></svg>;
    case "dot":      return <svg {...p}><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>;
    case "clock":    return <svg {...p}><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>;
    case "play":     return <svg {...p}><path d="M8 5v14l11-7Z" fill="currentColor"/></svg>;
    case "lesson":   return <svg {...p}><path d="M5 5h14v14H5z"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>;
    case "quiz":     return <svg {...p}><path d="M5 4h14v14l-4 3v-3H5z"/><path d="M9 9h6M9 12h4"/></svg>;
    case "asgmt":    return <svg {...p}><path d="M6 4h9l3 3v13H6z"/><path d="m9 12 2 2 4-4"/></svg>;
    case "lab":      return <svg {...p}><path d="M10 4v6L5 19a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V4"/><path d="M9 4h6"/></svg>;
    case "user":     return <svg {...p}><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/></svg>;
    case "users":    return <svg {...p}><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.4"/><path d="M3 19c.8-3 3-5 6-5s5.2 2 6 5"/><path d="M14 16c.6-1.6 2-2.5 3.5-2.5S20 14.4 20.5 16"/></svg>;
    case "shield":   return <svg {...p}><path d="M12 3 4 7v6c0 4 3.5 7 8 8 4.5-1 8-4 8-8V7Z"/><path d="m9 12 2 2 4-4"/></svg>;
    case "arrow":    return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case "arrow-up": return <svg {...p}><path d="M12 19V5M6 11l6-6 6 6"/></svg>;
    case "arrow-dn": return <svg {...p}><path d="M12 5v14M6 13l6 6 6-6"/></svg>;
    case "arrow-flat":return <svg {...p}><path d="M5 12h14"/></svg>;
    case "flag":     return <svg {...p}><path d="M5 3v18M5 4h11l-2 4 2 4H5"/></svg>;
    case "plus":     return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case "ext":      return <svg {...p}><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/></svg>;
    case "bell":     return <svg {...p}><path d="M6 18h12l-2-3v-4a4 4 0 0 0-8 0v4Z"/><path d="M10 21h4"/></svg>;
    case "pulse":    return <svg {...p}><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>;
    case "spark":    return <svg {...p}><path d="m12 3 1.4 5.2L18 10l-4.6 1.8L12 17l-1.4-5.2L6 10l4.6-1.8Z"/><path d="M19 15v4M17 17h4"/></svg>;
    case "filter":   return <svg {...p}><path d="M4 5h16l-6 8v5l-4 2v-7Z"/></svg>;
    case "sort":     return <svg {...p}><path d="M8 4v16M5 17l3 3 3-3"/><path d="M16 20V4M13 7l3-3 3 3"/></svg>;
    case "menu":     return <svg {...p}><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
    case "logo":     return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4z"/><path d="M16.5 17.5 13 21l3.5-7L20 13Z"/></svg>
    );
    default: return null;
  }
}

// ─────────────────────────── kind icons by string ───────────────────────────
function KindIcon({ kind }) {
  const k = ({ quiz: "quiz", test: "quiz", assignment: "asgmt", project: "lab", lesson: "lesson", assessment: "asgmt" })[kind] || "lesson";
  return <Icon name={k} size={16} />;
}

// ─────────────────────────── cards ───────────────────────────
function Card({ children, className, padded = true }) {
  return <div className={cls("card", padded && "card-padded", className)}>{children}</div>;
}

function StatNumber({ value, sub, hint }) {
  return (
    <div className="statnum">
      <div className="statnum-val">{value}</div>
      {sub && <div className="statnum-sub mono">{sub}</div>}
      {hint && <div className="statnum-hint">{hint}</div>}
    </div>
  );
}

// ─────────────────────────── searchfield ───────────────────────────
function SearchField({ value, onChange, placeholder, hint }) {
  return (
    <label className="search">
      <Icon name="search" size={16} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {hint && <span className="search-hint mono">{hint}</span>}
    </label>
  );
}

// ─────────────────────────── button ───────────────────────────
function Button({ children, onClick, kind = "ghost", size = "md", icon, iconRight, disabled, title }) {
  return (
    <button className={cls("btn", `btn-${kind}`, `btn-${size}`)} onClick={onClick} disabled={disabled} title={title}>
      {icon && <Icon name={icon} size={14} />}
      <span>{children}</span>
      {iconRight && <Icon name={iconRight} size={14} />}
    </button>
  );
}

// ─────────────────────────── tabs ───────────────────────────
function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(t => (
        <button key={t.id} role="tab" aria-selected={active === t.id}
          className={cls("tab", active === t.id && "tab-on")}
          onClick={() => onChange(t.id)}>
          <span>{t.label}</span>
          {t.count != null && <span className="tab-count mono">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────── cover (no images; editorial composition) ───────────────────────────
function RequirementCover({ requirement, size = "md" }) {
  // sizes: sm 56h, md 96h, lg 200h
  if (!requirement) {
    const h = size === "sm" ? 60 : size === "lg" ? 200 : 96;
    return (
      <div className={cls("cover", "cover-ink", `cover-${size}`)} style={{ height: h }}>
        <div className="cover-grid" />
        <div className="cover-mark mono">REQ</div>
        <div className="cover-code mono">No matrix</div>
      </div>
    );
  }
  const h = size === "sm" ? 60 : size === "lg" ? 200 : 96;
  const tone = requirement.color || "ink";
  return (
    <div className={cls("cover", `cover-${tone}`, `cover-${size}`)} style={{ height: h }}>
      <div className="cover-grid" />
      <div className="cover-mark mono">{requirement.cover_label}</div>
      <div className="cover-code mono">{requirement.code}</div>
    </div>
  );
}

export { cls, statusTone, statusLabel, fmt, fmtDate, relDate, Eyebrow, Rule, Pill, Bar, Avatar, Icon, KindIcon, Card, StatNumber, SearchField, Button, Tabs, RequirementCover };
