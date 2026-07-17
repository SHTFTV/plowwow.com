// Filesystem-backed HTTP cache for validation scripts.
//
// Purpose: make reruns of `seo:legacy-redirects`, `seo:og-image`, and other
// fetch-heavy validators dramatically faster while keeping every hit auditable
// in the report. Each entry records status, headers we care about, body (for
// GETs), fetched-at, and a cache hit counter, so the JSON output tells you
// exactly which URLs were served from cache during the run.
//
// Enable with SEO_HTTP_CACHE=1 (or --cache flag on individual validators).
// TTL defaults to 15 minutes (SEO_HTTP_CACHE_TTL_MS override). Clear by
// deleting seo-report/http-cache/ or running `SEO_HTTP_CACHE_CLEAR=1`.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const CACHE_DIR = resolve("seo-report/http-cache");
const DEFAULT_TTL_MS = Number(process.env.SEO_HTTP_CACHE_TTL_MS ?? 15 * 60 * 1000);
const ENABLED = process.env.SEO_HTTP_CACHE === "1" || process.env.SEO_HTTP_CACHE === "true";

if (process.env.SEO_HTTP_CACHE_CLEAR === "1" && existsSync(CACHE_DIR)) {
  rmSync(CACHE_DIR, { recursive: true, force: true });
}

export type CachedEntry = {
  url: string;
  method: string;
  status: number;
  location: string | null;
  contentType: string | null;
  body?: string;
  fetchedAt: string;
  hits: number;
};

export type CacheStats = {
  enabled: boolean;
  ttlMs: number;
  hits: number;
  misses: number;
  /** Total wall-clock ms spent inside cachedFetch (network + cache read). */
  totalMs: number;
  /** Cumulative ms saved by cache hits, estimated from avg miss latency. */
  savedMs: number;
  /** Sum of ms actually spent on network (misses). */
  networkMs: number;
  entries: { url: string; method: string; status: number; fetchedAt: string; hits: number }[];
};

const stats: CacheStats = { enabled: ENABLED, ttlMs: DEFAULT_TTL_MS, hits: 0, misses: 0, totalMs: 0, savedMs: 0, networkMs: 0, entries: [] };

function keyFor(method: string, url: string): string {
  return createHash("sha1").update(`${method.toUpperCase()} ${url}`).digest("hex");
}

function pathFor(method: string, url: string): string {
  return resolve(CACHE_DIR, `${keyFor(method, url)}.json`);
}

function readEntry(method: string, url: string): CachedEntry | null {
  if (!ENABLED) return null;
  const p = pathFor(method, url);
  if (!existsSync(p)) return null;
  try {
    const e = JSON.parse(readFileSync(p, "utf8")) as CachedEntry;
    if (Date.now() - Date.parse(e.fetchedAt) > DEFAULT_TTL_MS) return null;
    return e;
  } catch { return null; }
}

function writeEntry(entry: CachedEntry): void {
  if (!ENABLED) return;
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(pathFor(entry.method, entry.url), JSON.stringify(entry, null, 2));
}

/** Cached fetch that preserves manual redirect semantics. Returns status + Location header + optional body. */
export async function cachedFetch(
  url: string,
  init: RequestInit & { captureBody?: boolean } = {},
): Promise<{ status: number; location: string | null; contentType: string | null; body?: string; fromCache: boolean }> {
  const method = (init.method ?? "GET").toUpperCase();
  const captureBody = init.captureBody ?? method === "GET";
  const cached = readEntry(method, url);
  if (cached) {
    cached.hits++;
    writeEntry(cached);
    stats.hits++;
    return { status: cached.status, location: cached.location, contentType: cached.contentType, body: cached.body, fromCache: true };
  }
  const res = await fetch(url, init);
  const body = captureBody ? await res.text() : undefined;
  const entry: CachedEntry = {
    url,
    method,
    status: res.status,
    location: res.headers.get("location"),
    contentType: res.headers.get("content-type"),
    body,
    fetchedAt: new Date().toISOString(),
    hits: 0,
  };
  writeEntry(entry);
  stats.misses++;
  return { status: entry.status, location: entry.location, contentType: entry.contentType, body: entry.body, fromCache: false };
}

/** Snapshot the cache stats for inclusion in a validator's JSON report. */
export function snapshotStats(): CacheStats {
  // Materialise entries lazily so tests that never touched the cache stay small.
  if (!ENABLED) return { ...stats, entries: [] };
  const entries: CacheStats["entries"] = [];
  if (existsSync(CACHE_DIR)) {
    for (const f of require("node:fs").readdirSync(CACHE_DIR) as string[]) {
      if (!f.endsWith(".json")) continue;
      try {
        const e = JSON.parse(readFileSync(resolve(CACHE_DIR, f), "utf8")) as CachedEntry;
        entries.push({ url: e.url, method: e.method, status: e.status, fetchedAt: e.fetchedAt, hits: e.hits });
      } catch {}
    }
  }
  return { ...stats, entries };
}

export const CACHE_ENABLED = ENABLED;
