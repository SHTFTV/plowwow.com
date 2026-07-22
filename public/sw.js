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
//   - OG / share-card images      : stale-while-revalidate
//   - route data (sitemaps, RSS,
//     link-audit.json, blog-index): stale-while-revalidate
//   - anything else               : passthrough (no caching)
//
// Kill switch: navigating to any URL with `?sw=off` unregisters this
// worker and evicts every cache it owns.

const VERSION = "v1";
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
  "/robots.txt",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  // Warm the data cache with the small JSON/XML files the preloader
  // fetches so the very first navigation after install is instant too.
  event.waitUntil(
    caches.open(CACHE_DATA).then((cache) =>
      Promise.allSettled(DATA_PATHS.map((p) => cache.add(p).catch(() => null))),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.allSettled(
      names
        .filter((n) => n.startsWith("pw-") && !OWNED.includes(n))
        .map((n) => caches.delete(n)),
    );
    await self.clients.claim();
  })());
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isHashedAsset(url) {
  // Vite emits `/assets/<name>-<hash>.<ext>` — those are content-hashed
  // and safe to cache-first forever within this SW version.
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

  // Kill switch: any request with ?sw=off tears down.
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

  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(networkFirst(req, CACHE_HTML));
    return;
  }
  if (isHashedAsset(url)) {
    event.respondWith(cacheFirst(req, CACHE_ASSETS));
    return;
  }
  if (isImage(url)) {
    event.respondWith(staleWhileRevalidate(req, CACHE_IMAGES));
    return;
  }
  if (isDataAsset(url)) {
    event.respondWith(staleWhileRevalidate(req, CACHE_DATA));
    return;
  }
});
