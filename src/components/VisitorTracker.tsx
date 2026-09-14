import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  ensureTrackingSession,
  trackPageLeave,
  trackPageView,
} from "../lib/visitorTracking";

/**
 * Boots anonymous visitor session and records page views on route changes.
 * Also flushes dwell time (page_leave) when the route changes or the tab hides.
 * Skips /admin routes.
 */
export default function VisitorTracker() {
  const location = useLocation();
  const pathRef = useRef("");
  const activeMsRef = useRef(0);
  const lastTickRef = useRef(0);
  const visibleRef = useRef(
    typeof document === "undefined" ? true : document.visibilityState !== "hidden",
  );

  const accumulate = () => {
    if (visibleRef.current && lastTickRef.current) {
      activeMsRef.current += Date.now() - lastTickRef.current;
      lastTickRef.current = Date.now();
    }
  };

  const flushLeave = () => {
    const path = pathRef.current;
    if (!path) return;
    accumulate();
    const durationMs = activeMsRef.current;
    if (durationMs > 0) {
      trackPageLeave(path, durationMs);
    }
    activeMsRef.current = 0;
    lastTickRef.current = visibleRef.current ? Date.now() : 0;
  };

  useEffect(() => {
    if (location.pathname.startsWith("/admin")) return;
    void ensureTrackingSession().catch(() => {});
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith("/admin")) {
      if (pathRef.current) flushLeave();
      pathRef.current = "";
      return;
    }

    if (pathRef.current) {
      flushLeave();
    }

    const nextPath = location.pathname + location.search;
    pathRef.current = nextPath;
    activeMsRef.current = 0;
    visibleRef.current = document.visibilityState !== "hidden";
    lastTickRef.current = visibleRef.current ? Date.now() : 0;

    void trackPageView(nextPath);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        flushLeave();
        visibleRef.current = false;
        lastTickRef.current = 0;
      } else {
        visibleRef.current = true;
        lastTickRef.current = Date.now();
      }
    };

    const onPageHide = () => {
      flushLeave();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      flushLeave();
      pathRef.current = "";
    };
    // flushLeave reads refs only; intentional dependency on location
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  return null;
}
