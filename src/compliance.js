// Pure, deterministic stuck-assignee detection — no React, no module-level data.
// The compliance operation's signature rule: an assignee who has spent more
// than the configured time in a course WITHOUT completing it is "stuck" and
// needs intervention (distinct from "not started", which is a nudge, not a
// rescue). The threshold is campaign configuration seeded from the template —
// the same value the compliance home renders and the fixture invariants test.

const DEFAULT_STUCK_AFTER_MINUTES = 120;

// Campaign override wins, then the template's default, then the global floor.
export function stuckThresholdMinutes(campaign, template) {
  return (
    campaign?.detection?.stuck_after_minutes ??
    template?.detection?.stuck_after_minutes ??
    DEFAULT_STUCK_AFTER_MINUTES
  );
}

// Stuck = real time invested at/over the threshold AND not complete. A learner
// who never started (zero time) is NOT stuck — different problem, different fix.
export function isStuckLearner(learner, thresholdMinutes) {
  if (!learner) return false;
  const minutes = Number(learner.time_in_course_minutes) || 0;
  const completion = Number(learner.completion) || 0;
  return minutes > 0 && minutes >= thresholdMinutes && completion < 100;
}

export function stuckLearners(learners, thresholdMinutes) {
  return (learners || []).filter((l) => isStuckLearner(l, thresholdMinutes));
}
