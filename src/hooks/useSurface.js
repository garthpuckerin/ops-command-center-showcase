// Wires the pure resolver in src/surface.js to the browser: the layout size
// (resize fires on rotation and on a viewport-meta change), the device's own
// width, the `?layout=desktop` request, and the session's stored choice. It
// stamps the result on <html> as data attributes — the ONLY input the CSS uses
// to tell phone, tablet and workstation apart — and swaps the viewport meta for
// the full desktop view.
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  LAYOUT_FORCE_VALUE, LAYOUT_PARAM, SURFACE_STORAGE_KEY, deviceWidth, resolveSurface, surfaceAttributes, viewportContentFor,
} from "../surface.js";

function readDims() {
  const landscape = window.matchMedia ? window.matchMedia("(orientation: landscape)").matches : false;
  const screen = window.screen || {};
  return {
    layoutWidth: window.innerWidth,
    layoutHeight: window.innerHeight,
    deviceWidthPx: deviceWidth({ screenWidth: screen.width, screenHeight: screen.height, landscape }),
  };
}

function sameDims(a, b) {
  return a.layoutWidth === b.layoutWidth && a.layoutHeight === b.layoutHeight && a.deviceWidthPx === b.deviceWidthPx;
}

function readStoredForce() {
  try { return window.sessionStorage.getItem(SURFACE_STORAGE_KEY) === LAYOUT_FORCE_VALUE; } catch (err) { return false; }
}

function writeStoredForce(on) {
  try {
    if (on) window.sessionStorage.setItem(SURFACE_STORAGE_KEY, LAYOUT_FORCE_VALUE);
    else window.sessionStorage.removeItem(SURFACE_STORAGE_KEY);
  } catch (err) {
    // Storage blocked: the choice still applies for this page via state.
  }
}

function queryForce() {
  try { return new URLSearchParams(window.location.search).get(LAYOUT_PARAM) === LAYOUT_FORCE_VALUE; } catch (err) { return false; }
}

// Drop `?layout=desktop` from the address so a reload after "Back to the
// phone layout" does not force the desktop again.
function stripForceParam() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(LAYOUT_PARAM)) return;
    url.searchParams.delete(LAYOUT_PARAM);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  } catch (err) {
    // A malformed URL leaves the param; the stored choice is still cleared.
  }
}

function applyViewportMeta(content) {
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta && meta.getAttribute("content") !== content) meta.setAttribute("content", content);
}

export function useSurface() {
  const [dims, setDims] = useState(readDims);
  const [forced, setForced] = useState(() => queryForce() || readStoredForce());

  // A `?layout=desktop` link persists the choice for the session.
  useEffect(() => { if (queryForce()) writeStoredForce(true); }, []);

  useEffect(() => {
    const onChange = () => setDims(prev => { const next = readDims(); return sameDims(prev, next) ? prev : next; });
    const orientation = window.matchMedia ? window.matchMedia("(orientation: landscape)") : null;
    window.addEventListener("resize", onChange);
    orientation?.addEventListener("change", onChange);
    return () => {
      window.removeEventListener("resize", onChange);
      orientation?.removeEventListener("change", onChange);
    };
  }, []);

  const surface = resolveSurface({ ...dims, forced });

  // Before paint: the CSS must never see a frame with the wrong tier.
  useLayoutEffect(() => {
    const attrs = surfaceAttributes(surface);
    const root = document.documentElement;
    for (const [key, value] of Object.entries(attrs)) {
      if (root.dataset[key] !== value) root.dataset[key] = value;
    }
    applyViewportMeta(viewportContentFor(surface));
  }, [surface.surface, surface.tier, surface.shortLandscape, surface.deskAuthority, surface.forcedActive]);

  const forceDesktop = useCallback(() => { writeStoredForce(true); setForced(true); }, []);
  const clearForceDesktop = useCallback(() => { writeStoredForce(false); stripForceParam(); setForced(false); }, []);

  return { ...surface, forceDesktop, clearForceDesktop };
}
