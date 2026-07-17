// Post-build validators:
//  1. Every sitemap.xml <loc> has a matching dist/<path>/index.html
//  2. Each prerendered route emits a unique <title> and <meta description>
//     (not the homepage defaults).
//
// Fails the build (exit 1) on any violation.

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { SUPPORTED_LOCALES } from "./lib/locales";

const DIST = resolve("dist");
const SITEMAP = resolve(DIST, "sitemap.xml");
const HOME_HTML = readFileSync(resolve(DIST, "index.html"), "utf8");

const homeTitle = HOME_HTML.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
const homeDesc = HOME_HTML.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1] ?? "";

// Walk sitemap index → collect all <loc> from child <urlset> sitemaps.
// The index itself has no page URLs, only child sitemap URLs (which are .xml
// files served from /public and copied verbatim into dist/).
function locsFrom(file: string): string[] {
  if (!existsSync(file)) return [];
  const xml = readFileSync(file, "utf8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

const topLocs = locsFrom(SITEMAP);
const isChildSitemap = (u: string) => u.endsWith(".xml");
const childSitemapUrls = topLocs.filter(isChildSitemap);
const pageUrls = topLocs.filter((u) => !isChildSitemap(u));

for (const child of childSitemapUrls) {
  const path = new URL(child).pathname.replace(/^\//, "");
  const childPath = resolve(DIST, path);
  if (!existsSync(childPath)) {
    console.error(`✗ sitemap index references missing child file: ${child}`);
    process.exit(1);
  }
  pageUrls.push(...locsFrom(childPath));
}
const locs = pageUrls;

const missing: string[] = [];
const dupTitle: string[] = [];
const dupDesc: string[] = [];
const missingCanonical: string[] = [];
const badCanonical: string[] = [];
const hreflangGaps: { url: string; missing: string[] }[] = [];
const smokeReport: { url: string; title: string; hreflang: string[] }[] = [];

const REQUIRED_HREFLANG = [...SUPPORTED_LOCALES, "x-default"];

for (const loc of locs) {
  const u = new URL(loc);
  const path = u.pathname.replace(/\/+$/, "") || "/";
  const file =
    path === "/"
      ? resolve(DIST, "index.html")
      : resolve(DIST, path.replace(/^\//, ""), "index.html");

  if (!existsSync(file)) {
    missing.push(`${loc}  →  ${file.replace(DIST, "dist")}`);
    continue;
  }

  const html = readFileSync(file, "utf8");
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  const desc = html.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1] ?? "";
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/)?.[1] ?? "";
  const hreflangs = [...html.matchAll(/<link\s+rel="alternate"\s+hreflang="([^"]+)"[^>]*>/g)].map(
    (m) => m[1],
  );
  smokeReport.push({ url: loc, title, hreflang: hreflangs });

  if (path !== "/" && title === homeTitle) dupTitle.push(`${loc}  →  ${title}`);
  if (path !== "/" && desc === homeDesc) dupDesc.push(`${loc}  →  ${desc.slice(0, 80)}…`);

  // Canonical must exist and self-reference the sitemap URL.
  if (!canonical) missingCanonical.push(loc);
  else if (canonical.replace(/\/+$/, "") !== loc.replace(/\/+$/, ""))
    badCanonical.push(`${loc}  →  canonical=${canonical}`);

  // Every configured locale + x-default must appear as hreflang.
  const gaps = REQUIRED_HREFLANG.filter((l) => !hreflangs.includes(l));
  if (gaps.length) hreflangGaps.push({ url: loc, missing: gaps });
}

mkdirSync(resolve("seo-report"), { recursive: true });
writeFileSync(
  resolve("seo-report/build-smoke.json"),
  JSON.stringify(
    { generatedAt: new Date().toISOString(), locales: REQUIRED_HREFLANG, routes: smokeReport, hreflangGaps },
    null,
    2,
  ),
);

let failed = false;
if (missing.length) {
  console.error(`\n✗ ${missing.length} sitemap URL(s) missing from dist/:`);
  for (const m of missing) console.error("  " + m);
  failed = true;
}
if (dupTitle.length) {
  console.error(`\n✗ ${dupTitle.length} route(s) share the homepage <title>:`);
  for (const m of dupTitle.slice(0, 20)) console.error("  " + m);
  failed = true;
}
if (dupDesc.length) {
  console.error(`\n✗ ${dupDesc.length} route(s) share the homepage meta description:`);
  for (const m of dupDesc.slice(0, 20)) console.error("  " + m);
  failed = true;
}
if (missingCanonical.length) {
  console.error(`\n✗ ${missingCanonical.length} route(s) missing <link rel="canonical">:`);
  for (const m of missingCanonical.slice(0, 20)) console.error("  " + m);
  failed = true;
}
if (badCanonical.length) {
  console.error(`\n✗ ${badCanonical.length} route(s) have non-self-referencing canonical:`);
  for (const m of badCanonical.slice(0, 20)) console.error("  " + m);
  failed = true;
}
if (hreflangGaps.length) {
  console.error(
    `\n✗ ${hreflangGaps.length} route(s) missing hreflang for supported locales (need: ${REQUIRED_HREFLANG.join(", ")}):`,
  );
  for (const g of hreflangGaps.slice(0, 20))
    console.error(`  ${g.url}  →  missing: ${g.missing.join(", ")}`);
  failed = true;
}

if (failed) {
  console.error(`\nBuild validation failed. See seo-report/build-smoke.json.`);
  process.exit(1);
}

console.log(
  `✓ build-validate: ${smokeReport.length} URLs · unique titles/descs · canonical + hreflang [${REQUIRED_HREFLANG.join(", ")}] present.`,
);
