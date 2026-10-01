// Which surface renders — the phone/tablet COMPANION or the WORKSTATION — and
// whether desk authority applies. This module is the ONE source of truth for
// the breakpoint: the JS reads these numbers, stamps the result on <html> as
// data attributes, and the CSS keys off the attributes (never its own px
// breakpoints — src/surface.test.mjs fails if a stylesheet declares one).
// Pure: no DOM, no storage, so every rule here is unit-tested directly.

/** Phone: layout width ≤ 767. */
export const PHONE_MAX = 767;
/** Workstation: layout width ≥ 1024. Everything below is the companion. */
export const WORKSTATION_MIN = 1024;
/** A landscape screen at most this tall is "short": tabs become a side rail. */
export const SHORT_LANDSCAPE_MAX_HEIGHT = 500;

/** `?layout=desktop` asks for the full desktop view on a small device. */
export const LAYOUT_PARAM = "layout";
export const LAYOUT_FORCE_VALUE = "desktop";
/** sessionStorage key the forced choice persists under for the session. */
export const SURFACE_STORAGE_KEY = "ops:surface";

/* The full desktop view on a small device is the REAL desktop, laid out at a
   desktop width and scaled to the screen (the way "Request desktop site"
   works) — never the desktop components at 390px. */
export const FORCED_DESKTOP_LAYOUT_WIDTH = 1280;
export const DEVICE_VIEWPORT_CONTENT = "width=device-width, initial-scale=1, viewport-fit=cover";
export const FORCED_DESKTOP_VIEWPORT_CONTENT = `width=${FORCED_DESKTOP_LAYOUT_WIDTH}, viewport-fit=cover`;

export function isWorkstationWidth(width) {
  return typeof width === "number" && width >= WORKSTATION_MIN;
}

/**
 * The device's own width in CSS px for its CURRENT orientation — independent
 * of the viewport meta, which is exactly what changes when the desktop is
 * forced (after that, innerWidth reads 1280 on a phone).
 */
export function deviceWidth({ screenWidth, screenHeight, landscape }) {
  if (!(screenWidth > 0) || !(screenHeight > 0)) return Number.POSITIVE_INFINITY;
  return landscape ? Math.max(screenWidth, screenHeight) : Math.min(screenWidth, screenHeight);
}

/**
 * Resolve the surface for one moment.
 * - The forced desktop only takes effect on a device narrower than a
 *   workstation (a stored choice is ignored on a real desktop).
 * - Desk authority is scoped by DEVICE tier: only a workstation layout that is
 *   not a forced desktop on a small device gets it. A phone never does, in
 *   either orientation; the 721–1023 gap band never does.
 */
export function resolveSurface({ layoutWidth, layoutHeight, deviceWidthPx, forced }) {
  const forcedActive = Boolean(forced) && !isWorkstationWidth(deviceWidthPx);
  const workstation = forcedActive || isWorkstationWidth(layoutWidth);
  const surface = workstation ? "workstation" : "companion";
  const tier = workstation ? "workstation" : layoutWidth <= PHONE_MAX ? "phone" : "tablet";
  const shortLandscape = !workstation && layoutWidth > layoutHeight && layoutHeight <= SHORT_LANDSCAPE_MAX_HEIGHT;
  return { surface, tier, shortLandscape, forcedActive, deskAuthority: workstation && !forcedActive };
}

/** The viewport meta content for the current choice. */
export function viewportContentFor({ forcedActive }) {
  return forcedActive ? FORCED_DESKTOP_VIEWPORT_CONTENT : DEVICE_VIEWPORT_CONTENT;
}

/** The data attributes stamped on <html> — the only thing the CSS reads. */
export function surfaceAttributes(s) {
  return {
    surface: s.surface,
    tier: s.tier,
    shape: s.shortLandscape ? "short-landscape" : "regular",
    authority: s.deskAuthority ? "desk" : "gated",
  };
}
