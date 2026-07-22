// Guarded service-worker registration.
//
// The worker (`/sw.js`) accelerates repeat navigations by caching
// prefetch targets. It must NEVER register in dev, Lovable preview, or
// inside an iframe — those contexts must not persist a worker that could
// serve stale HTML to a live-editing session.

const PREVIEW_HOST_PATTERNS = [
  /^id-preview--/i,
  /^preview--/i,
  /(^|\.)lovableproject\.com$/i,
  /(^|\.)lovableproject-dev\.com$/i,
  /(^|\.)beta\.lovable\.dev$/i,
];

function isPreviewHost(host: string): boolean {
  return PREVIEW_HOST_PATTERNS.some((re) => re.test(host));
}

async function unregisterOwn(): Promise<void> {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs
        .filter((r) => (r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "").endsWith("/sw.js"))
        .map((r) => r.unregister()),
    );
  } catch { /* noop */ }
}

export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const refuse =
    !import.meta.env.PROD ||
    window.top !== window.self ||
    isPreviewHost(window.location.hostname) ||
    new URLSearchParams(window.location.search).has("sw") === true && new URLSearchParams(window.location.search).get("sw") === "off";

  if (refuse) {
    // Best-effort cleanup if a previous build registered one.
    void unregisterOwn();
    return;
  }

  const start = () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => { /* noop */ });
  };

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}
