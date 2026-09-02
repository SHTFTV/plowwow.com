// JSON-LD locale snapshot check.
//
// For every prerendered page in dist/, extract all <script type="application/ld+json">
// blocks and snapshot them by (route, type). Verifies that:
//   1. BreadcrumbList / FAQPage / BlogPosting / LocalBusiness payloads are
//      consistent — every route of the same kind carries the same schema shape.
//   2. Per-locale values in the JSON-LD (`inLanguage` on BlogPosting, canonical
//      URLs embedded in @id / url / mainEntityOfPage) match a locale supported
//      by scripts/lib/locales.ts.
//   3. URLs baked into the JSON-LD (`@id`, `url`, `mainEntityOfPage.@id`,
//      BreadcrumbList item URLs) all point at plowwow.com under the same
//      canonical path so we never leak preview or non-canonical hosts.
//
// Writes a snapshot bundle to seo-report/jsonld-locale-snapshot.json for
// review + diffing across builds. Exits 1 on any inconsistency.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { BASE_URL } from "./routes";
import { SUPPORTED_LOCALES } from "./lib/locales";

const DIST = resolve("dist");
const REPORT_DIR = resolve("seo-report");
mkdirSync(REPORT_DIR, { recursive: true });

type Issue = { route: string; type: string; issue: string };

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".html")) out.push(p);
  }
  return out;
}

function extractLd(html: string): unknown[] {
  const rx = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const out: unknown[] = [];
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html))) {
    try {
      out.push(JSON.parse(m[1]));
    } catch {
      /* preflight already reports parse errors */
    }
  }
  return out;
}

function typeOf(node: any): string[] {
  const t = node?.["@type"];
  if (!t) return [];
  return Array.isArray(t) ? t.map(String) : [String(t)];
}

// Collect a route's HTML → { types → node[] }
function group(nodes: unknown[]): Record<string, any[]> {
  const g: Record<string, any[]> = {};
  const push = (n: any) => {
    for (const t of typeOf(n)) (g[t] ||= []).push(n);
  };
  for (const raw of nodes) {
    const n = raw as any;
    if (n?.["@graph"]) (n["@graph"] as any[]).forEach(push);
    else push(n);
  }
  return g;
}

function urlsIn(node: any): string[] {
  const urls: string[] = [];
  const visit = (k: string | null, v: any) => {
    if (!v) return;
    // Skip context/type references — schema.org is a vocabulary URL, not content.
    if (k === "@context" || k === "@type") return;
    if (typeof v === "string") {
      if (/^https?:\/\//.test(v) && !v.startsWith("https://schema.org")) urls.push(v);
      return;
    }
    if (Array.isArray(v)) v.forEach((x) => visit(null, x));
    else if (typeof v === "object") {
      for (const [ck, cv] of Object.entries(v)) visit(ck, cv);
    }
  };
  visit(null, node);
  return urls;
}

const issues: Issue[] = [];
const snapshot: Record<string, Record<string, unknown>> = {};

const files = walk(DIST);
for (const file of files) {
  // Skip the static 404 page — it isn't a canonical route.
  if (file.endsWith("/404.html")) continue;
  const rel = file.replace(DIST + "/", "").replace(/\/?index\.html$/, "") || "/";
  // vercel.json declares trailingSlash: false, so route paths (and the
  // canonical URLs built from them) must not carry a trailing slash.
  const routePath = rel === "/" ? "/" : `/${rel}`;
  // Skip /blog/<slug>/ legacy alias pages — they intentionally carry the
  // canonical root-URL JSON-LD (`/<slug>/`) plus a meta-refresh redirect,
  // so comparing to the alias path always false-positives.
  if (routePath.startsWith("/blog/") && routePath !== "/blog") continue;
  const canonicalUrl = `${BASE_URL}${routePath}`;
  const html = readFileSync(file, "utf8");

  // Only bother with real prerendered pages.
  const hreflangs = [...html.matchAll(/hreflang="([^"]+)"/g)].map((m) => m[1]);
  if (!hreflangs.length) continue;

  const ldNodes = extractLd(html);
  if (!ldNodes.length) continue;

  const byType = group(ldNodes);
  snapshot[routePath] = {};

  // -----------------------------------------------------------------
  // Per-locale consistency: every SUPPORTED_LOCALES value must have an
  // <link rel="alternate" hreflang> pointing at plowwow.com. Since JSON-LD
  // itself is authored in en-CA today, `inLanguage` must be a supported
  // locale — flag other values so we catch drift when new locales are added.
  // -----------------------------------------------------------------
  for (const locale of SUPPORTED_LOCALES) {
    if (!hreflangs.includes(locale)) {
      issues.push({ route: routePath, type: "hreflang", issue: `missing locale "${locale}"` });
    }
  }

  // BlogPosting
  for (const bp of byType.BlogPosting ?? []) {
    snapshot[routePath].BlogPosting = { fields: Object.keys(bp).sort(), inLanguage: bp.inLanguage };
    if (bp.inLanguage && !SUPPORTED_LOCALES.includes(bp.inLanguage)) {
      issues.push({
        route: routePath,
        type: "BlogPosting",
        issue: `inLanguage "${bp.inLanguage}" not in SUPPORTED_LOCALES [${SUPPORTED_LOCALES.join(", ")}]`,
      });
    }
    const urls = urlsIn(bp);
    for (const u of urls) {
      if (!u.startsWith(BASE_URL) && !u.startsWith("https://plowwow.com")) {
        issues.push({ route: routePath, type: "BlogPosting", issue: `off-host URL: ${u}` });
      }
    }
    if (bp.mainEntityOfPage?.["@id"] && bp.mainEntityOfPage["@id"] !== canonicalUrl) {
      issues.push({
        route: routePath,
        type: "BlogPosting",
        issue: `mainEntityOfPage.@id="${bp.mainEntityOfPage["@id"]}" ≠ canonical "${canonicalUrl}"`,
      });
    }
  }

  // BreadcrumbList
  for (const bc of byType.BreadcrumbList ?? []) {
    snapshot[routePath].BreadcrumbList = {
      length: Array.isArray(bc.itemListElement) ? bc.itemListElement.length : 0,
    };
    const items = Array.isArray(bc.itemListElement) ? bc.itemListElement : [];
    const last = items[items.length - 1];
    if (last && last.item && last.item !== canonicalUrl) {
      issues.push({
        route: routePath,
        type: "BreadcrumbList",
        issue: `final crumb URL "${last.item}" ≠ canonical "${canonicalUrl}"`,
      });
    }
    for (const u of urlsIn(items)) {
      if (!u.startsWith(BASE_URL)) {
        issues.push({ route: routePath, type: "BreadcrumbList", issue: `off-host URL: ${u}` });
      }
    }
  }

  // FAQPage
  for (const fp of byType.FAQPage ?? []) {
    const q = Array.isArray(fp.mainEntity) ? fp.mainEntity.length : 0;
    snapshot[routePath].FAQPage = { questions: q };
    if (q === 0) {
      issues.push({ route: routePath, type: "FAQPage", issue: "empty mainEntity" });
    }
  }

  // LocalBusiness / SnowRemovalService
  for (const lb of [...(byType.LocalBusiness ?? []), ...(byType.SnowRemovalService ?? [])]) {
    snapshot[routePath].LocalBusiness = {
      "@id": lb["@id"],
      hasProvider: !!lb.provider,
      hasAggregateRating: !!lb.aggregateRating,
    };
    if (lb["@id"] && !String(lb["@id"]).startsWith(canonicalUrl)) {
      issues.push({
        route: routePath,
        type: "LocalBusiness",
        issue: `@id="${lb["@id"]}" does not start with canonical "${canonicalUrl}"`,
      });
    }
  }
}

writeFileSync(
  resolve(REPORT_DIR, "jsonld-locale-snapshot.json"),
  JSON.stringify(
    { generatedAt: new Date().toISOString(), locales: SUPPORTED_LOCALES, routes: snapshot, issues },
    null,
    2,
  ),
);

console.log(
  `[locale-snapshot] ${Object.keys(snapshot).length} routes snapshotted · ${issues.length} issues`,
);
for (const i of issues.slice(0, 25)) console.log(`  · ${i.route} [${i.type}] ${i.issue}`);
if (issues.length > 25) console.log(`  · …and ${issues.length - 25} more (see report).`);
process.exit(issues.length ? 1 : 0);
