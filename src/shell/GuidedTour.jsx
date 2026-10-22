// The guided tour. Moved out of app.jsx unchanged, except that the filter now
// keys off desk authority (device tier) instead of a 720px media query: a tour
// never narrates a surface the current device gates.
import React, { useEffect } from "react";
import { Button, Pill } from "../components.jsx";
import { DESK_ONLY_VIEWS, ROLE_LABELS } from "./nav.js";

// On the companion the tour also skips the control the companion has no
// header for (the theme toggle lives in the More sheet).
const COMPANION_DROPPED_TOUR_TARGETS = new Set(["theme-toggle"]);

export function tourStepsForRole(role, { gated = false, companion = false } = {}) {
  return allTourStepsForRole(role).filter(s =>
    !(gated && DESK_ONLY_VIEWS[s.view]) && !(companion && COMPANION_DROPPED_TOUR_TARGETS.has(s.target)));
}

function allTourStepsForRole(role) {
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

export function GuidedTour({ role, tour, setTour, view, gated = false, companion = false }) {
  const steps = tourStepsForRole(role, { gated, companion });
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
