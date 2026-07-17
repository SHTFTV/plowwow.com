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

// -----------------------------------------------------------------
// Consolidated machine + human report. Every failing city / blog URL,
// what's missing, and the gate that will fail the build.
// -----------------------------------------------------------------
type Section = { title: string; rows: string[] };
const sections: Section[] = [
  { title: "Sitemap URLs missing from dist/", rows: missing },
  { title: "Duplicate <title> (homepage)", rows: dupTitle },
  { title: "Duplicate meta description (homepage)", rows: dupDesc },
  { title: "Missing <link rel=canonical>", rows: missingCanonical },
  { title: "Non-self-referencing canonical", rows: badCanonical },
  {
    title: `Missing hreflang (required: ${REQUIRED_HREFLANG.join(", ")})`,
    rows: hreflangGaps.map((g) => `${g.url}  →  missing: ${g.missing.join(", ")}`),
  },
];

const totalIssues = sections.reduce((n, s) => n + s.rows.length, 0);

const jsonReport = {
  generatedAt: new Date().toISOString(),
  totalRoutes: smokeReport.length,
  locales: REQUIRED_HREFLANG,
  totalIssues,
  sections: sections.map((s) => ({ title: s.title, count: s.rows.length, rows: s.rows })),
};
writeFileSync(resolve("seo-report/validation-report.json"), JSON.stringify(jsonReport, null, 2));

const md: string[] = [
  `# Build Validation Report`,
  ``,
  `_Generated ${jsonReport.generatedAt}_`,
  ``,
  `- Total routes: **${smokeReport.length}**`,
  `- Required locales: \`${REQUIRED_HREFLANG.join(", ")}\``,
  `- Total issues: **${totalIssues}**`,
  ``,
];
if (totalIssues === 0) {
  md.push(`✅ All city + blog URLs ship unique metadata, self-referencing canonicals, and every required hreflang.`);
} else {
  for (const s of sections) {
    if (!s.rows.length) continue;
    md.push(`## ${s.title} (${s.rows.length})`, ``);
    for (const r of s.rows.slice(0, 50)) md.push(`- \`${r}\``);
    if (s.rows.length > 50) md.push(`- …and ${s.rows.length - 50} more (see \`validation-report.json\`)`);
    md.push(``);
  }
}
writeFileSync(resolve("seo-report/validation-report.md"), md.join("\n"));

const failed = totalIssues > 0;
if (failed) {
  console.error(`\n✗ build-validate found ${totalIssues} issue(s) across ${sections.filter((s) => s.rows.length).length} categor(ies):`);
  for (const s of sections) {
    if (!s.rows.length) continue;
    console.error(`\n  ${s.title} (${s.rows.length}):`);
    for (const r of s.rows.slice(0, 10)) console.error("    " + r);
    if (s.rows.length > 10) console.error(`    …and ${s.rows.length - 10} more`);
  }
  console.error(`\nSee seo-report/validation-report.{json,md} for the full list.`);
  process.exit(1);
}

console.log(
  `✓ build-validate: ${smokeReport.length} URLs · unique titles/descs · canonical + hreflang [${REQUIRED_HREFLANG.join(", ")}] present.`,
);
console.log(`✓ report written: seo-report/validation-report.{json,md}`);
