// PlowWow runtime cache service worker.
//
// Scope: cache prefetch targets used by the route preloader so repeat
// navigations render instantly. We do NOT precache the app shell — HTML
// navigations always go network-first so a deploy is picked up
// immediately (no stale white-screen after ship).
//
// Strategies:
//   - navigations (HTML)          : network-first, fall back to cache
//   - hashed built assets         : cache-first (immutable content-hash)
//   - OG / share-card images      : network-first, fall back to cache
//   - route data (sitemaps, RSS,
//     link-audit.json, blog-index): network-first
//   - anything else               : passthrough (no caching)
//
// On activate: purge every non-owned `pw-*` cache AND any cached
// entries pointing at icon or manifest URLs, so an icon rev never
// serves the previous mascot after a deploy. The worker also
// broadcasts an "sw-updated" message so open tabs can prompt users
// to reload.
//
// Kill switch: navigating to any URL with `?sw=off` unregisters this
// worker and evicts every cache it owns.

const VERSION = "v7";
const CACHE_HTML = `pw-html-${VERSION}`;
const CACHE_ASSETS = `pw-assets-${VERSION}`;
const CACHE_IMAGES = `pw-images-${VERSION}`;
const CACHE_DATA = `pw-data-${VERSION}`;
const OWNED = [CACHE_HTML, CACHE_ASSETS, CACHE_IMAGES, CACHE_DATA];

const DATA_PATHS = [
  "/sitemap.xml",
  "/sitemap-neighborhoods.xml",
  "/rss.xml",
  "/link-audit.json",
  "/blog-index.json",
  "/diagnostics.json",
  "/robots.txt",
];

// URL patterns whose cached responses must be evicted on every
// activate, regardless of cache name — icons and manifest change
// between deploys and must never be served stale.
const ICON_URL_RE = /\/(?:favicon|apple-touch-icon|icon-|site\.webmanifest|manifest\.(?:webmanifest|json))/i;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_DATA).then((cache) =>
      Promise.allSettled(DATA_PATHS.map((p) => cache.add(p).catch(() => null))),
    ),
  );
});

async function purgeIconAndManifestEntries() {
  const names = await caches.keys();
  await Promise.allSettled(
    names.map(async (name) => {
      const cache = await caches.open(name);
      const reqs = await cache.keys();
      await Promise.allSettled(
        reqs.map((r) => (ICON_URL_RE.test(new URL(r.url).pathname) ? cache.delete(r) : null)),
      );
    }),
  );
}

async function notifyClientsUpdated() {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const c of clients) c.postMessage({ type: "sw-updated", version: VERSION });
}

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    // Drop every existing pw-* cache on every worker version bump. Blog hero
    // images are content-edited in place, so keeping old image caches is worse
    // than a cold reload.
    await Promise.allSettled(
      names
        .filter((n) => n.startsWith("pw-"))
        .map((n) => caches.delete(n)),
    );
    // Also purge icon/manifest entries from owned caches so a
    // returning tab never serves last release's icon bytes.
    await purgeIconAndManifestEntries();
    await self.clients.claim();
    await notifyClientsUpdated();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "VERSION") {
    event.ports?.[0]?.postMessage({ version: VERSION });
    return;
  }
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isHashedAsset(url) {
  return /^\/assets\/.+-[A-Za-z0-9_-]{6,}\.(?:js|mjs|css|woff2?|ttf|otf|png|jpg|jpeg|webp|avif|svg)$/i.test(url.pathname);
}

function isImage(url) {
  return /\.(?:png|jpe?g|webp|avif|gif|svg)$/i.test(url.pathname)
    || url.pathname.startsWith("/blog-images/")
    || url.pathname.startsWith("/og/");
}

function isDataAsset(url) {
  if (DATA_PATHS.includes(url.pathname)) return true;
  return /^\/(?:sitemap|blog-index)[^/]*\.(?:xml|json)$/i.test(url.pathname);
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok && (fresh.type === "basic" || fresh.type === "default")) {
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh && fresh.ok) cache.put(request, fresh.clone()).catch(() => {});
  return fresh;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request).then((res) => {
    if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
    return res;
  }).catch(() => null);
  return cached || (await network) || fetch(request);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!isSameOrigin(url)) return;

  if (url.searchParams.get("sw") === "off") {
    event.respondWith((async () => {
      try {
        const names = await caches.keys();
        await Promise.allSettled(names.filter((n) => n.startsWith("pw-")).map((n) => caches.delete(n)));
        await self.registration.unregister();
      } catch { /* noop */ }
      return fetch(req);
    })());
    return;
  }

  // Icons + manifest: always network, never cached — keeps home-screen
  // icons in sync on every deploy.
  if (ICON_URL_RE.test(url.pathname)) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(networkFirst(req, CACHE_HTML));
    return;
  }
  if (isHashedAsset(url)) {
    event.respondWith(cacheFirst(req, CACHE_ASSETS));
    return;
  }
  if (isImage(url)) {
    event.respondWith(networkFirst(req, CACHE_IMAGES));
    return;
  }
  if (isDataAsset(url)) {
    event.respondWith(networkFirst(req, CACHE_DATA));
    return;
  }
});
