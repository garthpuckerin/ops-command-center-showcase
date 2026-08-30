// Pure team-ownership model — no React, no module-level data.
// Teams are the campaign's ACTIVATION MODEL: per-campaign units that own
// launch criteria (setup sections) and work blockers (exceptions). The real
// go-live ran six teams each owning different criteria; another campaign can
// run one — the team list is per-campaign data, not a fixed org chart.
//
// Ownership is DERIVED: a record's free-text owner (a person or group) maps to
// the campaign team whose membership carries that alias. No team_id copies on
// rows — a second copy would drift, and runtime-created records (an import
// raising an exception owned by "Access Team") resolve with zero extra wiring.

const isOpenException = (e) => !["resolved", "closed"].includes(e.status);

export function teamsForCampaign(D, campaignId) {
  return (D.teams || []).filter((t) => t.campaign_id === campaignId);
}

export function teamForOwner(D, campaignId, owner) {
  if (!owner) return null;
  return (
    teamsForCampaign(D, campaignId).find(
      (t) => (t.members || []).includes(owner) || t.lead === owner || t.name === owner
    ) || null
  );
}

// Per-team rollup of owned criteria and open blockers, plus what nobody owns —
// silence about unowned work would read as "everything is owned", so the
// unassigned counts are part of the answer.
export function teamRollup(D, campaignId) {
  const teams = teamsForCampaign(D, campaignId);
  const sections = (D.campaignSetupSections || []).filter((s) => s.campaign_id === campaignId);
  const deptIds = new Set((D.departments || []).filter((d) => d.campaign_id === campaignId).map((d) => d.id));
  const openExceptions = (D.exceptions || []).filter((e) => deptIds.has(e.department_id) && isOpenException(e));
  const owningTeamId = (owner) => teamForOwner(D, campaignId, owner)?.id || null;
  return {
    rows: teams.map((team) => ({
      team,
      criteria: sections.filter((s) => owningTeamId(s.owner) === team.id).length,
      openBlockers: openExceptions.filter((e) => owningTeamId(e.owner) === team.id).length,
    })),
    unassignedCriteria: sections.filter((s) => !owningTeamId(s.owner)).length,
    unassignedBlockers: openExceptions.filter((e) => !owningTeamId(e.owner)).length,
  };
}
