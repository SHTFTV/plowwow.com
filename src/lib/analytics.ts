// Thin analytics shim. Pushes events to window.dataLayer (GTM) when present,
// falls back to gtag if present, and logs to console in dev. Never throws so
// callers can invoke it inline without try/catch.

type EventParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params: EventParams = {}): void {
  try {
    if (typeof window === "undefined") return;
    const payload = { event: name, ...params };
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push(payload);
    }
    if (typeof window.gtag === "function") {
      window.gtag("event", name, params);
    }
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[analytics]", name, params);
    }
  } catch {
    // Analytics must never break the app.
  }
}

// Convenience wrappers for the fuzzy-search instrumentation so call sites
// stay short and event names stay consistent across the codebase.
export const trackBlogSearchQuery = (query: string, resultCount: number) =>
  trackEvent("blog_search_query", {
    query: query.slice(0, 120),
    query_length: query.length,
    result_count: resultCount,
  });

export const trackBlogSearchResultClick = (params: {
  slug: string;
  query: string;
  position: number;
  total: number;
}) =>
  trackEvent("blog_search_result_click", {
    slug: params.slug,
    query: params.query.slice(0, 120),
    position: params.position,
    total: params.total,
  });
