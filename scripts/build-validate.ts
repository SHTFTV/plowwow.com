// Post-build validators:
//  1. Every sitemap.xml <loc> has a matching dist/<path>/index.html
//  2. Each prerendered route emits a unique <title> and <meta description>
//     (not the homepage defaults).
//
// Fails the build (exit 1) on any violation.

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DIST = resolve("dist");
const SITEMAP = resolve(DIST, "sitemap.xml");
const HOME_HTML = readFileSync(resolve(DIST, "index.html"), "utf8");

const homeTitle = HOME_HTML.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
const homeDesc = HOME_HTML.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1] ?? "";

const sitemap = readFileSync(SITEMAP, "utf8");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const missing: string[] = [];
const dupTitle: string[] = [];
const dupDesc: string[] = [];
const smokeReport: { url: string; title: string }[] = [];

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
  smokeReport.push({ url: loc, title });

  if (path !== "/" && title === homeTitle) dupTitle.push(`${loc}  →  ${title}`);
  if (path !== "/" && desc === homeDesc) dupDesc.push(`${loc}  →  ${desc.slice(0, 80)}…`);
}

writeFileSync(
  resolve("seo-report/build-smoke.json"),
  JSON.stringify(smokeReport, null, 2),
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

if (failed) {
  console.error(`\nBuild validation failed. See seo-report/build-smoke.json.`);
  process.exit(1);
}

console.log(
  `✓ build-validate: ${smokeReport.length} sitemap URLs, all present, all unique titles/descriptions.`,
);
