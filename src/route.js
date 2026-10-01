// Hash routes: `#<view>` or `#<view>/<record id>`. Every screen and every
// People record is URL-addressable, so a link shared from a phone opens the
// same screen (and the same record) anywhere. Pure — unit-tested directly.

const VIEW_PATTERN = /^[a-z][a-z0-9-]*$/;

export function parseHash(hash) {
  const raw = String(hash || "").replace(/^#/, "");
  const slash = raw.indexOf("/");
  const view = slash === -1 ? raw : raw.slice(0, slash);
  if (!VIEW_PATTERN.test(view)) return { view: null, record: null };
  let record = slash === -1 ? "" : raw.slice(slash + 1);
  try { record = decodeURIComponent(record); } catch (err) { record = ""; }
  return { view, record: record || null };
}

export function formatHash({ view, record }) {
  return `#${view}${record ? `/${encodeURIComponent(record)}` : ""}`;
}

export function sameRoute(a, b) {
  return a.view === b.view && (a.record || null) === (b.record || null);
}
