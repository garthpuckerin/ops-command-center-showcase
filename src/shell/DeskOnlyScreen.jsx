// The desk-only state is a designed screen, not a dead end: it names the
// surface, says why it stays at the desk, shows the live count waiting there,
// and routes the visitor to the work a phone or tablet IS for.
import React from "react";
import { LMS_DATA } from "../data.js";
import { Button, Card, Eyebrow } from "../components.jsx";
import { DESK_ONLY_VIEWS } from "./nav.js";

export function DeskOnlyScreen({ view, campaignId, onNav, forcedDesktop = false }) {
  const info = DESK_ONLY_VIEWS[view];
  const pendingApprovals = (LMS_DATA.writebackJobs || []).filter(j => (!j.campaign_id || j.campaign_id === campaignId) && !["approved", "rejected"].includes(j.approval_status)).length;
  const waiting = view === "writebacks" && pendingApprovals > 0
    ? `${pendingApprovals} staged ${pendingApprovals === 1 ? "payload is" : "payloads are"} waiting for desk review.`
    : null;
  const sub = forcedDesktop
    ? "This is the desktop layout on a small screen — for reading, not for approving. High-authority actions are scoped by device the same way visibility is scoped by role."
    : "Phones and tablets are the monitoring and triage companion. High-authority actions are scoped by device the same way visibility is scoped by role.";
  return (
    <div className="screen" data-deskonly={view}>
      <header className="page-header">
        <div>
          <Eyebrow>Workstation surface</Eyebrow>
          <h1 className="display-lg">{`${info.label} stays at the desk.`}</h1>
          <p className="page-sub">{sub}</p>
        </div>
      </header>
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
