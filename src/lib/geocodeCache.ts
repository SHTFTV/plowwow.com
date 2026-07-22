// Client-side cache for geocoding + driving-distance lookups so repeated
// quote attempts (or reloads of a city page) don't re-hit the free
// geocoder. Backed by localStorage with a 7-day TTL and small size cap.

const NS = "plowwow.geocache.v1";
const MAX_ENTRIES = 200;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type GeocodeHit = {
  lat: number;
  lon: number;
  label: string;
};

type Entry<T> = { value: T; expiresAt: number };
type Store = Record<string, Entry<unknown>>;

function safeGetStore(): Store {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(NS);
    if (!raw) return {};
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

function safeSetStore(store: Store) {
  if (typeof localStorage === "undefined") return;
  try {
    // Trim to MAX_ENTRIES by expiry order (soonest first stays newest last).
    const keys = Object.keys(store);
    if (keys.length > MAX_ENTRIES) {
      const sorted = keys.sort(
        (a, b) => store[a].expiresAt - store[b].expiresAt,
      );
      for (const k of sorted.slice(0, keys.length - MAX_ENTRIES))
        delete store[k];
    }
    localStorage.setItem(NS, JSON.stringify(store));
  } catch {
    /* quota / private-mode — ignore */
  }
}

function get<T>(key: string): T | null {
  const store = safeGetStore();
  const entry = store[key] as Entry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    delete store[key];
    safeSetStore(store);
    return null;
  }
  return entry.value;
}

function set<T>(key: string, value: T) {
  const store = safeGetStore();
  store[key] = { value, expiresAt: Date.now() + TTL_MS };
  safeSetStore(store);
}

function normalizeQuery(q: string) {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function cachedGeocode(
  query: string,
  fetcher: (q: string) => Promise<GeocodeHit | null>,
): Promise<GeocodeHit | null> {
  const key = `geo:${normalizeQuery(query)}`;
  const hit = get<GeocodeHit | null>(key);
  if (hit !== null) return hit;
  const fresh = await fetcher(query);
  set(key, fresh);
  return fresh;
}

export function cachedDistance(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  compute: () => { km: number; drivingKm: number },
): { km: number; drivingKm: number } {
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const key = `dist:${round(from.lat)},${round(from.lon)}->${round(to.lat)},${round(to.lon)}`;
  const cached = get<{ km: number; drivingKm: number }>(key);
  if (cached) return cached;
  const fresh = compute();
  set(key, fresh);
  return fresh;
}
