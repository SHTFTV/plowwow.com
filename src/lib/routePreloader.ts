// Route-based preloading for the most-visited lazy routes.
//
// After the homepage becomes interactive we opportunistically prefetch the
// next-most-likely routes during browser idle time. Because these use the
// exact same dynamic `import()` specifiers as the `React.lazy` calls in
// App.tsx, the browser hits the module cache when the user actually
// navigates — no extra network round-trip, no bundle-size cost on first
// paint.
//
// If a user has data-saver enabled or is on a slow connection we skip
// preloading entirely to respect their preference.



type PreloadEntry = {
  name: string;
  // Dynamic import specifier — MUST match the one used in App.tsx's
  // React.lazy so the browser hits the module cache on real navigation.
  load: () => Promise<Record<string, unknown>>;
  // Static assets rendered on first paint of that route. Prefetching them
  // through the HTTP cache means the route's first render can hit disk
  // cache instead of network. No parsing cost, no main-thread cost.
  assets?: string[];
};

// Ordered by observed traffic (analytics + prerendered route weight): city
// pages are the top crawler + user destination, /blog and /quote convert,
// and BlogNeighborhoods is heavily internally linked from the homepage.
const PRELOAD_QUEUE: PreloadEntry[] = [
  { name: "CityPage", load: () => import("@/pages/CityPage.tsx"), assets: ["/og-default.jpg"] },
  { name: "LegacyPage", load: () => import("@/pages/LegacyPage.tsx"), assets: ["/og-default.jpg"] },
  { name: "BlogIndex", load: () => import("@/pages/BlogIndex.tsx"), assets: ["/rss.xml"] },
  { name: "Quote", load: () => import("@/pages/Quote.tsx") },
  { name: "BlogNeighborhoods", load: () => import("@/pages/BlogNeighborhoods.tsx"), assets: ["/sitemap-neighborhoods.xml"] },
  { name: "Locations", load: () => import("@/pages/Locations.tsx"), assets: ["/link-audit.json"] },
];

function connectionOk(): boolean {
  if (typeof navigator === "undefined") return false;
  // @ts-expect-error non-standard but widely supported connection API
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!c) return true;
  if (c.saveData) return false;
  if (typeof c.effectiveType === "string" && /2g/.test(c.effectiveType)) return false;
  return true;
}

function idle(cb: () => void, timeout = 2500) {
  if (typeof window === "undefined") return;
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric(cb, { timeout });
  else window.setTimeout(cb, timeout);
}

let started = false;

export function preloadTopRoutes() {
  if (started) return;
  started = true;
  if (typeof window === "undefined") return;
  if (!connectionOk()) return;

  // Stagger loads: browsers can only decode a couple of scripts in parallel
  // without contending with any late main-thread work on the homepage.
  const kick = (i: number) => {
    if (i >= PRELOAD_QUEUE.length) return;
    idle(() => {
      PRELOAD_QUEUE[i].load().catch(() => { /* silent — real nav will surface real errors */ });
      kick(i + 1);
    }, 1500);
  };
  kick(0);
}
