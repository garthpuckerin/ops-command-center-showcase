// Pure, deterministic readiness scoring — no React, no module-level data.
// Extracted so BOTH the app (via _shared.jsx) and the data-coherence test
// import the exact same function. This is the single source of truth for a
// campaign's scored readiness: the Scoring screen previews it live, the
// dashboard's "critical roles" KPI derives from it, save() persists it, and
// the coherence test re-derives it to prove the seeded values never drift.

const isOpenException = (e) => !["resolved", "closed"].includes(e.status);

// Scope departments + open exceptions to one campaign from the full dataset.
export function scopeForScoring(D, campaignId) {
  const departments = D.departments.filter((d) => d.campaign_id === campaignId);
  const exceptions = D.exceptions.filter((e) => departments.some((d) => d.id === e.department_id));
  return { departments, exceptions };
}

// Returns the score AND its drivers, so the number is always explainable.
export function computeReadiness(D, campaignId, profile = {}) {
  const scoped = scopeForScoring(D, campaignId);
  const required = scoped.departments.reduce((s, d) => s + d.required, 0);
  const complete = scoped.departments.reduce((s, d) => s + d.complete, 0);
  const completionPct = required ? (complete / required) * 100 : 0;
  const openExc = scoped.exceptions.filter(isOpenException);
  const identityMismatches = openExc.filter((e) => /identity|duplicate/i.test(e.type)).length;
  const w = profile.blocker_severity_weights || {};
  const blockerPenalty = openExc.reduce((s, e) => s + (Number(w[e.severity]) || 0), 0);
  const mismatchPenalty = identityMismatches * (Number(profile.identity_mismatch_penalty) || 0);
  // The base is already completionPct, so being below the target threshold is a
  // SMALL additional signal (critical roles must clear a higher bar), not a
  // second full penalty for incompleteness — keep it light to avoid double-
  // counting. Open blockers and identity mismatches are the real drags.
  const thresholdGap = Math.max(0, (Number(profile.completion_threshold) || 0) - completionPct);
  const belowTargetDrag = thresholdGap * 0.15;
  const blockerDrag = Math.min(16, blockerPenalty / 7);
  const mismatchDrag = Math.min(8, mismatchPenalty);
  const score = Math.max(0, Math.min(100, Math.round(completionPct - belowTargetDrag - blockerDrag - mismatchDrag)));
  return {
    score,
    completionPct: Math.round(completionPct),
    openBlockers: openExc.length,
    belowTargetDrag: Math.round(belowTargetDrag),
    blockerDrag: Math.round(blockerDrag),
    mismatchDrag: Math.round(mismatchDrag),
    identityMismatches,
  };
}
