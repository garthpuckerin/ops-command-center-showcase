// The route lives in the URL hash: in-app navigation writes it (pushState, so
// the back button works), and a hashchange — a pasted link, back/forward —
// re-renders. Before this, navigation never touched the URL and a hash change
// did nothing until a full reload.
import { useCallback, useEffect, useRef, useState } from "react";
import { formatHash, parseHash, sameRoute } from "../route.js";

export function useHashRoute(initial) {
  const [route, setRoute] = useState(initial);
  // The first sync (and any normalisation) replaces the entry instead of
  // pushing one, so back never lands on a route that immediately redirects.
  const replaceNext = useRef(true);

  // The flag is set OUTSIDE the state updater (updaters stay pure); a no-op
  // navigation leaves it set only until the next route change consumes it,
  // and every path that changes the route sets it first.
  const navigate = useCallback((next, { replace = false } = {}) => {
    const target = { view: next.view, record: next.record || null };
    replaceNext.current = replace;
    setRoute(prev => (sameRoute(prev, target) ? prev : target));
  }, []);

  useEffect(() => {
    const want = formatHash(route);
    if (window.location.hash !== want) {
      const url = window.location.pathname + window.location.search + want;
      if (replaceNext.current) window.history.replaceState(window.history.state, "", url);
      else window.history.pushState(null, "", url);
    }
    replaceNext.current = false;
  }, [route]);

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHash(window.location.hash);
      if (!parsed.view) return;
      // The URL already holds this entry: canonicalising it (#People → #people)
      // must REPLACE it, never push a dead entry onto back.
      replaceNext.current = true;
      setRoute(prev => (sameRoute(prev, parsed) ? prev : parsed));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return [route, navigate];
}
