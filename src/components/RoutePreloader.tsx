import { useEffect } from "react";
import { preloadTopRoutes } from "@/lib/routePreloader";

// Mounts once on the homepage and schedules idle-time prefetch of the
// most-visited lazy routes. Renders nothing.
export const RoutePreloader = () => {
  useEffect(() => {
    // Wait a beat so the homepage's LCP / hydration work finishes first.
    const t = window.setTimeout(preloadTopRoutes, 1200);
    return () => window.clearTimeout(t);
  }, []);
  return null;
};

export default RoutePreloader;
