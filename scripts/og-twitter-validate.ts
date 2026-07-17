// Open Graph + Twitter Card validator.
//
// For every URL in the sitemap index (city + blog + static), asserts that the
// raw prerendered HTML ships:
//   - <link rel="canonical" href="…"> that self-references the URL
//   - <meta property="og:title|og:description|og:url|og:image|og:type|og:locale">
//   - <meta property="og:locale:alternate"> for every non-primary supported
//     locale (from scripts/lib/locales.ts)
//   - og:image + twitter:image absolute https URL
//   - <meta name="twitter:card" content="summary_large_image">
//   - <meta name="twitter:title|twitter:description|twitter:image">
//
// Writes seo-report/og-twitter.{json,md} and exits non-zero on any issue so
// the build step (and CI upload) fails loudly with the report attached.

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { PRIMARY_OG_LOCALE, ALTERNATE_OG_LOCALES } from "./lib/locales";

const DIST = resolve("dist");
const SITEMAP = resolve(DIST, "sitemap.xml");

type Issue = { url: string; missing: string[]; mismatched: string[] };

function locsFrom(file: string): string[] {
  if (!existsSync(file)) return [];
  const xml = readFileSync(file, "utf8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
function metaContent(html: string, attr: "property" | "name", key: string): string | null {
  const re = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`, "i");
  return html.match(re)?.[1] ?? null;
}
function allMetaContent(html: string, attr: "property" | "name", key: string): string[] {
  const re = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`, "gi");
  return [...html.matchAll(re)].map((m) => m[1]);
}
function canonicalOf(html: string): string | null {
  return html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i)?.[1] ?? null;
}

const top = locsFrom(SITEMAP);
const pageUrls: string[] = [];
for (const u of top) {
  if (u.endsWith(".xml")) {
    const path = new URL(u).pathname.replace(/^\//, "");
    pageUrls.push(...locsFrom(resolve(DIST, path)));
  } else {
    pageUrls.push(u);
  }
}

const issues: Issue[] = [];

for (const url of pageUrls) {
  const path = new URL(url).pathname.replace(/\/+$/, "") || "/";
  const file =
    path === "/" ? resolve(DIST, "index.html") : resolve(DIST, path.replace(/^\//, ""), "index.html");
  if (!existsSync(file)) continue; // build-validate covers this separately
  const html = readFileSync(file, "utf8");

  const missing: string[] = [];
  const mismatched: string[] = [];

  const canonical = canonicalOf(html);
  if (!canonical) missing.push("link[rel=canonical]");
  else if (canonical.replace(/\/+$/, "") !== url.replace(/\/+$/, ""))
    mismatched.push(`canonical=${canonical}`);

  const requiredOg = ["og:title", "og:description", "og:url", "og:image", "og:type", "og:locale"];
  for (const k of requiredOg) if (!metaContent(html, "property", k)) missing.push(k);

  const ogUrl = metaContent(html, "property", "og:url");
  if (ogUrl && ogUrl.replace(/\/+$/, "") !== url.replace(/\/+$/, ""))
    mismatched.push(`og:url=${ogUrl}`);

  const ogImage = metaContent(html, "property", "og:image");
  if (ogImage && !/^https:\/\//.test(ogImage)) mismatched.push(`og:image not absolute https: ${ogImage}`);

  const ogLocale = metaContent(html, "property", "og:locale");
  if (ogLocale && ogLocale !== PRIMARY_OG_LOCALE)
    mismatched.push(`og:locale=${ogLocale} (expected ${PRIMARY_OG_LOCALE})`);

  const alts = allMetaContent(html, "property", "og:locale:alternate");
  for (const alt of ALTERNATE_OG_LOCALES) {
    if (!alts.includes(alt)) missing.push(`og:locale:alternate=${alt}`);
  }

  const twCard = metaContent(html, "name", "twitter:card");
  if (twCard !== "summary_large_image")
    (twCard ? mismatched : missing).push(`twitter:card${twCard ? `=${twCard}` : ""}`);
  for (const k of ["twitter:title", "twitter:description", "twitter:image"] as const) {
    if (!metaContent(html, "name", k)) missing.push(k);
  }
  const twImage = metaContent(html, "name", "twitter:image");
  if (twImage && !/^https:\/\//.test(twImage)) mismatched.push(`twitter:image not absolute https: ${twImage}`);

  if (missing.length || mismatched.length) issues.push({ url, missing, mismatched });
}

mkdirSync(resolve("seo-report"), { recursive: true });
writeFileSync(
  resolve("seo-report/og-twitter.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      totalUrls: pageUrls.length,
      requiredAlternates: ALTERNATE_OG_LOCALES,
      primaryOgLocale: PRIMARY_OG_LOCALE,
      issues,
    },
    null,
    2,
  ),
);

const md: string[] = [
  `# Open Graph + Twitter Card Report`,
  ``,
  `_Generated ${new Date().toISOString()}_`,
  ``,
  `- URLs checked: **${pageUrls.length}**`,
  `- Primary og:locale: \`${PRIMARY_OG_LOCALE}\``,
  `- Required og:locale:alternate: \`${ALTERNATE_OG_LOCALES.join(", ") || "(none)"}\``,
  `- Issues: **${issues.length}**`,
  ``,
];
if (!issues.length) {
  md.push(`✅ All city + blog URLs ship canonical, og:*, og:locale (+ alternates), and twitter:* meta.`);
} else {
  md.push(`## Failing URLs`, ``);
  for (const it of issues.slice(0, 100)) {
    md.push(`- \`${it.url}\``);
    for (const m of it.missing) md.push(`  - missing: \`${m}\``);
    for (const m of it.mismatched) md.push(`  - mismatch: \`${m}\``);
  }
  if (issues.length > 100) md.push(`- …and ${issues.length - 100} more (see og-twitter.json)`);
}
writeFileSync(resolve("seo-report/og-twitter.md"), md.join("\n"));

if (issues.length) {
  console.error(`\n✗ og-twitter-validate: ${issues.length} URL(s) with missing/mismatched OG or Twitter tags`);
  for (const it of issues.slice(0, 10)) {
    console.error(`  · ${it.url}`);
    for (const m of it.missing) console.error(`      missing: ${m}`);
    for (const m of it.mismatched) console.error(`      mismatch: ${m}`);
  }
  if (issues.length > 10) console.error(`  · …and ${issues.length - 10} more (see seo-report/og-twitter.{json,md})`);
  process.exit(1);
}
console.log(`✓ og-twitter-validate: ${pageUrls.length} URLs · canonical/og/twitter present (primary og:locale=${PRIMARY_OG_LOCALE}, alt=[${ALTERNATE_OG_LOCALES.join(", ")}])`);
