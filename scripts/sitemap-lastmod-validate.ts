// Sitemap lastmod + coverage validator.
//
// Enforces that:
//   1. sitemap.xml is a sitemap index that references child sitemaps served
//      from dist/ (validated by build-validate.ts).
//   2. Every city + blog URL known to collectRoutes() is present as a <loc>
//      in one of the child sitemaps.
//   3. Every <url> has a <lastmod> that parses as a valid ISO-8601 date and
//      is not in the future.
//   4. Each <url> exposes a consistent hreflang mapping (one xhtml:link per
//      SUPPORTED_LOCALES entry + x-default) whose href matches the canonical
//      URL — i.e. sitemap-level hreflang mirrors what prerender bakes into
//      the HTML head.
//
// Writes seo-report/sitemap.{json,md} and exits non-zero on any violation.

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { SUPPORTED_LOCALES, X_DEFAULT_LOCALE } from "./lib/locales";
import { collectRoutes, BASE_URL } from "./routes";

const DIST = resolve("dist");
const SITEMAP = resolve(DIST, "sitemap.xml");
const REQUIRED_HREFLANG = [...SUPPORTED_LOCALES, "x-default"] as const;

type UrlEntry = {
  loc: string;
  lastmod: string | null;
  hreflang: { locale: string; href: string }[];
  sourceFile: string;
};

function readXml(file: string): string {
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

// Parse one child <urlset> file into UrlEntry rows.
function parseUrlset(file: string): UrlEntry[] {
  const xml = readXml(file);
  const entries: UrlEntry[] = [];
  const urlBlocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)];
  for (const block of urlBlocks) {
    const body = block[1];
    const loc = body.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim();
    if (!loc) continue;
    const lastmod = body.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim() ?? null;
    const hreflang = [...body.matchAll(/<xhtml:link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"/g)]
      .map((m) => ({ locale: m[1], href: m[2] }));
    entries.push({ loc, lastmod, hreflang, sourceFile: file });
  }
  return entries;
}

// Walk the sitemap index → collect every UrlEntry from child sitemaps.
const indexXml = readXml(SITEMAP);
const childLocs = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const allEntries: UrlEntry[] = [];
const missingChildFiles: string[] = [];
for (const childUrl of childLocs) {
  if (!childUrl.endsWith(".xml")) continue;
  const rel = new URL(childUrl).pathname.replace(/^\//, "");
  const file = resolve(DIST, rel);
  if (!existsSync(file)) {
    missingChildFiles.push(childUrl);
    continue;
  }
  // Image sitemap has different structure and isn't part of page coverage.
  if (rel.includes("images")) continue;
  allEntries.push(...parseUrlset(file));
}

// Expected city + blog URLs from the same source-of-truth the app uses.
const routes = collectRoutes();
const expectedCityUrls = routes.filter((r) => r.kind === "city").map((r) => `${BASE_URL}${r.path}/`.replace(/\/{2,}$/, "/"));
const expectedBlogUrls = routes
  .filter((r) => r.kind === "legacy-blog")
  .map((r) => `${BASE_URL}${r.path}/`.replace(/\/{2,}$/, "/"));

const norm = (u: string) => u.replace(/\/+$/, "");
const present = new Set(allEntries.map((e) => norm(e.loc)));

const missingCityUrls = expectedCityUrls.filter((u) => !present.has(norm(u)));
const missingBlogUrls = expectedBlogUrls.filter((u) => !present.has(norm(u)));

// Per-URL validations.
const today = new Date();
today.setUTCHours(23, 59, 59, 999);

const badLastmod: string[] = [];
const missingLastmod: string[] = [];
const badHreflang: string[] = [];

for (const e of allEntries) {
  if (!e.lastmod) {
    missingLastmod.push(e.loc);
  } else {
    const d = new Date(e.lastmod);
    if (Number.isNaN(d.getTime())) {
      badLastmod.push(`${e.loc}  →  invalid: "${e.lastmod}"`);
    } else if (d.getTime() > today.getTime()) {
      badLastmod.push(`${e.loc}  →  future date: "${e.lastmod}"`);
    }
  }

  const locales = new Set(e.hreflang.map((h) => h.locale));
  const gaps = REQUIRED_HREFLANG.filter((l) => !locales.has(l));
  if (gaps.length) {
    badHreflang.push(`${e.loc}  →  missing hreflang: ${gaps.join(", ")}`);
    continue;
  }
  // Every hreflang href must resolve to the same canonical URL as <loc>
  // (single-locale site — all locales share the URL). If a future locale
  // routes to a distinct path, update localizedUrl() and this expected map.
  for (const h of e.hreflang) {
    if (norm(h.href) !== norm(e.loc)) {
      badHreflang.push(`${e.loc}  →  hreflang[${h.locale}] href=${h.href} ≠ loc`);
    }
  }
  // x-default must point at the primary locale URL.
  const xd = e.hreflang.find((h) => h.locale === "x-default");
  if (xd && norm(xd.href) !== norm(e.loc)) {
    badHreflang.push(`${e.loc}  →  x-default ≠ canonical`);
  }
  // Locale coverage in sitemap must match what prerender emits in HTML head.
  for (const loc of SUPPORTED_LOCALES) {
    if (!locales.has(loc)) badHreflang.push(`${e.loc}  →  sitemap missing hreflang=${loc}`);
  }
  void X_DEFAULT_LOCALE; // referenced for the locales module contract
}

const sections = [
  { title: "Missing child sitemap files", rows: missingChildFiles },
  { title: "City URLs missing from sitemap", rows: missingCityUrls },
  { title: "Blog URLs missing from sitemap", rows: missingBlogUrls },
  { title: "URLs missing <lastmod>", rows: missingLastmod },
  { title: "Invalid or future <lastmod>", rows: badLastmod },
  { title: "Inconsistent hreflang mapping", rows: badHreflang },
];
const totalIssues = sections.reduce((n, s) => n + s.rows.length, 0);

mkdirSync(resolve("seo-report"), { recursive: true });
writeFileSync(
  resolve("seo-report/sitemap.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      totalUrls: allEntries.length,
      expectedCities: expectedCityUrls.length,
      expectedBlogPosts: expectedBlogUrls.length,
      requiredHreflang: REQUIRED_HREFLANG,
      totalIssues,
      sections: sections.map((s) => ({ title: s.title, count: s.rows.length, rows: s.rows })),
    },
    null,
    2,
  ),
);

const md: string[] = [
  `# Sitemap Validation Report`,
  ``,
  `_Generated ${new Date().toISOString()}_`,
  ``,
  `- URLs in sitemap: **${allEntries.length}**`,
  `- Expected cities: **${expectedCityUrls.length}** · Expected blog posts: **${expectedBlogUrls.length}**`,
  `- Required hreflang: \`${REQUIRED_HREFLANG.join(", ")}\``,
  `- Total issues: **${totalIssues}**`,
  ``,
];
if (!totalIssues) {
  md.push(`✅ Every city + blog URL is in the sitemap with valid <lastmod> and consistent hreflang.`);
} else {
  for (const s of sections) {
    if (!s.rows.length) continue;
    md.push(`## ${s.title} (${s.rows.length})`, ``);
    for (const r of s.rows.slice(0, 50)) md.push(`- \`${r}\``);
    if (s.rows.length > 50) md.push(`- …and ${s.rows.length - 50} more (see sitemap.json)`);
    md.push(``);
  }
}
writeFileSync(resolve("seo-report/sitemap.md"), md.join("\n"));

if (totalIssues) {
  console.error(`\n✗ sitemap-validate: ${totalIssues} issue(s)`);
  for (const s of sections) {
    if (!s.rows.length) continue;
    console.error(`  ${s.title} (${s.rows.length}):`);
    for (const r of s.rows.slice(0, 10)) console.error("    " + r);
    if (s.rows.length > 10) console.error(`    …and ${s.rows.length - 10} more`);
  }
  console.error(`  See seo-report/sitemap.{json,md} for the full list.`);
  process.exit(1);
}
console.log(`✓ sitemap-validate: ${allEntries.length} URLs · lastmod + hreflang consistent · cities/blog fully covered`);
