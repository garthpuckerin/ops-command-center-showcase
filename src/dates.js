/* Ops Command Center — relative-date engine.
 *
 * The whole demo dataset was originally frozen around a single "today"
 * (2026-05-28 — the day the Epic go-live countdown read "48 days to go-live",
 * the exception due dates clustered just-due/overdue against, and the last
 * roster/completion imports landed "yesterday" relative to). To keep the
 * prototype looking fresh whenever it is opened, we re-anchor everything on the
 * REAL "today" at module-eval time and shift the ENTIRE dataset by ONE constant
 * offset (today − oldAnchor).
 *
 * Shifting by a single offset preserves every relationship exactly:
 *   - the go-live stays the same number of days out as it was from the anchor,
 *   - an exception "1 day overdue" stays 1 day overdue,
 *   - the training-session calendar keeps its spacing around today/go-live,
 *   - the "last sync" import feed still reads as just-refreshed,
 *   - milestones (roster freeze → training deadline → go-live) keep their gaps.
 *
 * Deterministic: TODAY is computed once, from the system clock. No Math.random,
 * no external deps.
 */

const MS_PER_DAY = 86_400_000;

/** Midnight (local) of the supplied date — strips the time component. */
export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** The real "today", frozen at module evaluation. */
export const TODAY = startOfDay(new Date());

/** A Date exactly `n` whole days from TODAY (n may be negative). */
export function daysFromToday(n) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + n);
  return d;
}

/** 'YYYY-MM-DD' for a Date (local). */
export function iso(date) {
  const d = startOfDay(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Shorthand: ISO string for an offset from today. */
export function isoFromToday(n) {
  return iso(daysFromToday(n));
}

/* ---- The migration anchor ---------------------------------------------- *
 * The original fixtures were frozen on this date. It is the "today" the
 * hardcoded `daysToGoLive: 48` and the relative due/last-sync windows were
 * authored against (go-live 2026-07-15 minus 48 days = 2026-05-28). To
 * re-express any legacy date as a today-relative offset:
 *   offsetFromAnchor('2026-07-15') === 48  →  daysFromToday(48)
 */
export const ANCHOR_ISO = '2026-05-28';
const ANCHOR = startOfDay(new Date(ANCHOR_ISO + 'T00:00:00'));

/** Whole-day offset of a legacy date (any parseable form) vs the old anchor. */
export function offsetFromAnchor(value) {
  const d = startOfDay(parseLegacy(value));
  return Math.round((d - ANCHOR) / MS_PER_DAY);
}

/* Parse the three fixture date shapes into a local Date at the right day:
 *   - 'YYYY-MM-DD'                 (date only)
 *   - 'YYYY-MM-DD HH:MM'           (session starts, local wall-clock)
 *   - 'YYYY-MM-DDTHH:MM:SSZ' etc.  (ISO timestamp)
 * We only ever need the calendar day for offset math, so anchoring to local
 * midnight of the date portion is sufficient and timezone-stable. */
function parseLegacy(value) {
  const s = String(value);
  const datePart = s.slice(0, 10);
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Re-anchor a legacy 'YYYY-MM-DD' onto today: returns the new ISO string that
 * preserves the date's whole-day distance from the old anchor. This is the core
 * migration primitive — every date-only fixture passes through here.
 */
export function shiftIso(isoDate) {
  return iso(daysFromToday(offsetFromAnchor(isoDate)));
}

/**
 * Re-anchor a 'YYYY-MM-DD HH:MM' session-start string, preserving the
 * wall-clock time-of-day and just sliding the calendar day by the offset.
 */
export function shiftDateTime(value) {
  const s = String(value);
  const time = s.slice(11); // "HH:MM"
  return `${shiftIso(s.slice(0, 10))} ${time}`;
}

/**
 * Re-anchor an ISO timestamp ('YYYY-MM-DDTHH:MM:SSZ' or similar), preserving
 * the time + timezone suffix and sliding only the calendar day by the offset.
 */
export function shiftTimestamp(value) {
  const s = String(value);
  const rest = s.slice(10); // "THH:MM:SSZ" (or "" if date-only)
  return `${shiftIso(s.slice(0, 10))}${rest}`;
}

/* ---- Live derived values ----------------------------------------------- */

/** Whole days from today to a (already-shifted) date string; clamped at 0. */
export function daysToGoLive(value) {
  const d = startOfDay(parseLegacy(value));
  return Math.max(0, Math.round((d - TODAY) / MS_PER_DAY));
}

/* Convenience: today in ISO. */
export const TODAY_ISO = iso(TODAY);
